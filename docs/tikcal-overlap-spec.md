# TikCal Feature Spec: "Overlap" — Pooled Free-Time Finder + Event Matchmaker

> Drop this entire file into Claude Code as the working spec. Build inside the existing TikCal repo (React + Vite + Tailwind + Supabase). Read the existing codebase first — reuse the existing Supabase client, router, auth context, and design tokens. Do NOT scaffold a new project.

---

## 1. What this feature is

A new top-level tab/page in TikCal called **Overlap** (working name — see §9). It lets 2–4 people pool their availability and find shared free time, then cross-references those open windows against TikCal's event database to recommend concerts/events they could attend together.

Core loop:
1. A TikCal user creates an Overlap **session** (a pooled mini-calendar with a lifespan).
2. They set **search criteria**: date range (default next 10 weeks), which days of the week count (any combination of Mon–Sun, or presets: Weekends / Weekdays), and which dayparts count (Morning ~6a–12p, Midday ~12p–5p, Night ~5p–12a — multi-select).
3. They invite up to 3 others via a **shareable URL**. Invitees do NOT need a TikCal account — guest flow, no login.
4. Each participant supplies availability via one or more of:
   - **TikCal data** (logged-in users): purchased tickets / saved events auto-mark those slots busy.
   - **Google Calendar** (optional OAuth, freebusy-only scope): auto-shades busy slots.
   - **Manual toggle grid** (always available; the ONLY path for Apple Calendar users in v1): tap slots free/busy while eyeballing their own calendar.
5. The app computes the intersection and renders a **visual overlap view** showing (a) windows where ALL participants are free, (b) partial overlaps (3 of 4 free), and (c) windows where participants already share a TikCal event.
6. For fully-open windows, it queries TikCal's event data and **recommends events** ranked by participants' taste profiles (existing TikCal genre/artist affinity data where available).
7. One-tap actions on a chosen window: create a TikCal plan, and export an `.ics` file so Apple/any-calendar users can add it natively.

---

## 2. Routing & page structure

- New route: `/overlap` (authed users see their sessions list + "New Overlap" CTA).
- Session route: `/overlap/:sessionId` — this is ALSO the guest link. Guests hitting it get the guest join flow; logged-in TikCal users get auto-joined with their identity.
- Add "Overlap" to the main nav alongside existing TikCal tabs. Match existing nav component patterns.

Page components:
```
/overlap
  SessionsList          — user's active/expired sessions
  NewSessionModal       — name, date range, day-of-week + daypart criteria, expiry
/overlap/:sessionId
  SessionHeader         — session name, participant avatars/chips (max 4), share-link button, criteria summary (editable by creator)
  AvailabilitySources   — per-user panel: [TikCal ✓] [Google Calendar: Connect] [Manual grid]
  OverlapGrid           — the core visual (see §5)
  EventRecommendations  — ranked event cards for open windows (see §6)
  GuestJoinSheet        — name entry for no-login participants
```

---

## 3. Supabase schema

```sql
-- Overlap sessions (pooled mini-calendars)
create table overlap_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users(id),          -- nullable NOT allowed: creator must be a TikCal user
  name text not null default 'Untitled Overlap',
  timezone text not null default 'America/New_York',
  range_start date not null,
  range_end date not null,                            -- enforce <= range_start + 90 days
  days_of_week int[] not null default '{0,6}',        -- 0=Sun..6=Sat; default weekends
  dayparts text[] not null default '{night}',         -- subset of {morning, midday, night}
  max_participants int not null default 4 check (max_participants between 2 and 4),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- Participants: TikCal users OR anonymous guests
create table overlap_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references overlap_sessions(id) on delete cascade,
  user_id uuid references auth.users(id),             -- null for guests
  display_name text not null,
  color text not null,                                -- assigned from a 4-color palette on join
  sources jsonb not null default '{"tikcal": false, "google": false, "manual": true}',
  -- availability: keyed by "YYYY-MM-DD:daypart" -> "free" | "busy"
  -- unset keys = unknown/not yet answered (render as neutral)
  availability jsonb not null default '{}'::jsonb,
  google_synced_at timestamptz,
  joined_at timestamptz default now(),
  unique (session_id, user_id)
);
```

**Access model:** session URL contains the unguessable UUID = the capability. Do not build per-guest auth. RLS:
- `overlap_sessions`: select allowed to anyone who knows the id (use a security-definer RPC `get_session(session_id)` rather than opening the table); insert restricted to authenticated users; update/delete restricted to `creator_id`.
- `overlap_participants`: reads/writes go through security-definer RPCs (`join_session`, `update_availability`) that validate the session id, participant cap (4), and expiry. Guests get a signed participant token stored in `localStorage` so they can edit only their own row on return visits.
- Nightly cleanup: Supabase edge function (cron) deletes sessions past `expires_at`. Guest availability data is disposable by design.

**Availability key format:** `"2026-07-18:night": "busy"`. One jsonb blob per participant. At 90 days × 3 dayparts max this is ≤270 keys — no need to normalize into rows.

---

## 4. Availability sources (per participant, stackable)

Merge rule when multiple sources are on: **busy wins**. Manual overrides beat auto-fill (store manual edits with a `"src":"manual"` marker or a parallel `overrides` map so a Google re-sync doesn't clobber a deliberate manual "free").

### 4a. TikCal data (logged-in users only)
- Query the user's existing purchased-ticket / saved-event records (reuse whatever tables the Gmail-parsing pipeline and saved-events feature already write to — inspect the schema and wire into it, do not duplicate).
- Map each event's date+time into the session's daypart buckets → mark busy.
- ALSO surface these as "shared event" candidates: if 2+ participants have the SAME TikCal event, that slot renders as a special "already going together" state (see §5), not merely busy.

### 4b. Google Calendar (optional, any participant including guests)
- OAuth with the narrowest calendar scope available (freebusy-level access; verify the current exact scope string in Google Cloud Console — Google's granular scopes have been shifting, do not hardcode from memory without checking).
- Call `POST https://www.googleapis.com/calendar/v3/freeBusy` with `timeMin`/`timeMax` = session range, `items: [{id:"primary"}]`.
- Client-side: for each in-criteria date+daypart bucket, if any busy interval overlaps the bucket's clock window (Morning 06:00–12:00, Midday 12:00–17:00, Night 17:00–24:00, session timezone), mark busy.
- Store only the derived free/busy per bucket in `availability` — never store raw event data. Show a "resync" button; write `google_synced_at`.
- Token handling: use Supabase Auth's Google provider with incremental scopes if TikCal auth is already Google-based; otherwise a standalone OAuth flow with tokens kept client-side/session-scoped. Prefer not persisting refresh tokens server-side for v1.

### 4c. Manual grid (always on; Apple Calendar users' path)
- Explain in UI copy: "Using Apple Calendar? There's no auto-connect — tap the times you're free while checking your calendar."
- The grid shows ONLY in-criteria buckets (dates matching selected days-of-week × selected dayparts). Tap cycles: unknown → free → busy → unknown. Bulk actions: "mark all free", "mark weekends free", per-column (daypart) fill.
- Must be fast on mobile: large touch targets, optimistic updates, single debounced jsonb write.

### 4d. Apple export (output side, not input)
- Once a window/event is chosen, generate an `.ics` (VEVENT with correct TZID) client-side and offer download/share — this is how Apple users get the plan back into their calendar. No CalDAV in v1.

---

## 5. The Overlap visual (core UX)

A horizontal-scroll (mobile) / full-width (desktop) grid: **columns = in-criteria dates, rows = selected dayparts.** Each cell encodes group state:

| State | Meaning | Render |
|---|---|---|
| `all_free` | every participant free | solid orange fill (TikCal accent), highest visual weight |
| `partial` | ≥2 free but not all | orange at reduced opacity, small "3/4" fraction badge |
| `shared_event` | 2+ participants hold the same TikCal event | distinct treatment: event's thumbnail/emoji + ring/glow — this is a celebration state, visually louder than all_free |
| `blocked` | anyone busy w/o overlap majority | near-black cell, subtle border |
| `unknown` | missing answers | dashed border, muted |

- Tapping a cell opens a detail sheet: per-participant status chips (each in their assigned color), and — if `all_free` or `partial` — the event recommendations for that window (§6).
- A secondary **list view** ("Best windows") ranks windows: shared_event first, then all_free (weighted toward sooner dates), then strongest partials. Many users will live in this list on mobile; build it, don't treat it as an afterthought.
- Legend row pinned under the grid.
- Realtime: subscribe to `overlap_participants` changes via Supabase Realtime so the grid updates live as friends fill in.

---

## 6. Event recommendations

For each `all_free` (and optionally `partial`) window:
1. Query TikCal's event table for events in the session's city whose start time falls inside that date+daypart bucket.
2. Rank by taste: reuse TikCal's existing genre/artist affinity signals (saved events, past purchases from Gmail parsing) for the logged-in participants; average across participants who have profiles; guests contribute nothing to ranking. If no taste data exists, fall back to popularity/recency.
3. Render as compact event cards (existing TikCal event-card component if one exists): artist, venue, date/time, why-recommended chip ("You both saved DJ X" / "Matches Sarah's techno saves").
4. Card actions: open event in TikCal, "propose this" (pins it to the session so all participants see a proposed plan banner), and `.ics` export.

City scoping: default to the session creator's TikCal city (NYC/Miami/LA per current TikCal coverage); editable in session settings.

---

## 7. Guest (no-login) flow

- Guest opens `/overlap/:sessionId` → GuestJoinSheet: enter display name → `join_session` RPC creates participant row → participant token to `localStorage`.
- Guests get: manual grid always; Google connect optionally. No TikCal-source panel (they have no TikCal data).
- Guests see recommendations but their taste doesn't inform ranking; event card links route to public TikCal event pages with a soft signup prompt (this is the acquisition funnel — one tasteful banner, not a nag wall).
- Cap enforcement: 5th join attempt gets a friendly "this Overlap is full (4 max)" state.

---

## 8. Design system (match TikCal exactly)

- Pure black background (#000), orange accent for interactive/free states.
- Logo/wordmark: Barlow 800 Italic. Headings: Syne. Body/UI: Space Grotesk.
- Minimalist, edgy, downtown — no gradients-for-decoration, no rounded-blob SaaS aesthetic. High contrast, tight grids, generous black space.
- The overlap grid IS the design moment of this feature: it should look like a rave flyer's schedule block, not a Google Sheets clone. Motion: subtle cell fill animation when a participant's answers land in realtime.
- Mobile-first: this gets used in group chats. Grid must be thumbable; list view one-handed.

---

## 9. Naming (pick one, wire it as a constant so it's swappable)

Candidates discussed: PalCal, Overhang, HangCal, ChillCal. Recommendation order for TikCal's brand voice:
1. **Overlap** — descriptive, minimal, reads as a feature not a mascot; fits the black/orange austerity.
2. **LinkUp** — social, NYC-native slang alignment.
3. **HangCal** — playful but rhymes with TikCal; risk: cutesy.
4. Overhang/ChillCal/PalCal — weaker; Overhang reads as climbing/architecture, ChillCal and PalCal read juvenile against the brand.
Implement the display name as a single exported constant (`FEATURE_NAME`) used everywhere, so renaming is a one-line change.

---

## 10. Build order (do these as separate commits/PR-sized chunks)

1. **Schema + RPCs** — tables above, `get_session`, `join_session`, `update_availability`, expiry cron. Migration files.
2. **Routes + session CRUD** — `/overlap` list, NewSessionModal with criteria pickers (day-of-week multi-select with Weekend/Weekday presets; daypart multi-select), share-link copy.
3. **Manual grid + realtime** — full manual flow working end-to-end for 4 participants incl. guest join. This alone is a shippable v1.
4. **TikCal-source integration** — busy-fill from user's events + shared_event detection.
5. **Overlap visual polish** — grid states per §5, list view, detail sheet.
6. **Google freebusy** — OAuth, sync, resync, override-preservation logic.
7. **Recommendations** — event query + taste ranking + propose-this + `.ics` export.

Testing notes: seed script that creates a session with 4 fake participants and randomized availability so the grid states are all visible; unit-test the intersection function (pure function: `computeOverlap(participants[], criteria) -> Map<bucketKey, state>`) — this is the one piece of logic worth real test coverage.

## 11. Explicit non-goals for v1
- No Apple Calendar auto-read (CalDAV) — manual grid + .ics export only.
- No push notifications; realtime in-session only.
- No chat inside sessions (group chat already exists where the link was shared).
- No >4 participants, no recurring sessions.
