# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friend groups ("crews") who go to concerts/shows together and want to
coordinate who's actually going. Primary job: see what's happening, know
who from the crew is in, and show up at the same shows instead of missing
each other. Focus today is NYC nightlife/show-going specifically — the
product isn't geographically limited by design, but the current venue data,
framing, and near-term roadmap assume NYC. Expansion beyond NYC is likely
eventually, not a near-term commitment.

## Product Purpose

TikCal is a shared calendar for tracking concerts/shows and coordinating
attendance with friend crews via RSVP (in / maybe / out), so a group knows
who's going where and can meet up. Success is crews actually converging at
shows, not just individuals privately tracking dates.

## Positioning

Unlike a generic calendar or a ticketing app, TikCal's mechanism is
social-first: events are colored/grouped by crew, RSVP status is visible to
the group, and "who's going" is the primary signal, not just "when is
this." Two features a neighboring calendar app couldn't casually copy:
Overlap (Ticketmaster + Spotify taste-matching recommendations tuned to
what a specific crew would enjoy together) and Smart Add (a Claude-powered
ingest pipeline that turns a pasted ticket link, text, or flyer screenshot
into a structured event, so most events never need manual data entry).

## Operating Context

Users add shows either manually or via Smart Add (link/text/screenshot);
browse via a mobile-first Month/Week/Day calendar; RSVP in/maybe/out per
event; see events colored by shared crew; discover recommended shows via
Overlap. A Capacitor iOS/Android wrapper around this same web UI is in
progress on a separate branch/worktree — not part of this codebase's
design language.

## Capabilities and Constraints

- Supabase (Postgres + Auth), RLS enabled on every public table; writes
  needing validation go through `SECURITY DEFINER` RPCs, not raw table
  access; only the anon/publishable key ever ships client-side.
- Events currently store a date only in practice — the `events` table has
  a `start_time` column but nothing populates it yet (in progress); no
  source/ticket-URL field exists yet either (in progress).
- A fixed real NYC venue list and 10 named crew colors are hardcoded in
  `src/lib/constants.js`, not user-generated.
- RSVP is a fixed three-state model: in / maybe / out.

## Brand Commitments

Name: **TikCal**. Visual identity ("Aurora," documented in `CLAUDE.md`):
near-black base (`#0b0b11` / `#060609`) with violet/magenta chrome as the
brand hue (`aurora #c04bff`, `violet #8b5cff`, `iris #5b6bff`) — used for
wordmark, hero, primary CTA, nav-active, calendar today-marker, links,
focus states. Data hues are semantic and reserved, never repainted as
decoration: crew colors (10 fixed options), mint (shared/"I'm in"), RSVP
amber/coral. A legacy cyan "Wide Ice" theme is fully retired (survives only
as one selectable crew color). Fonts: Barlow 800 italic (logo), Syne
(headings), Schibsted Grotesk (body), IBM Plex Mono (labels/data). Voice is
nightlife/rave vernacular, not corporate (see the totem flavor text in
`src/lib/constants.js` — "The Press," "Glow Stick," etc.).

## Evidence on Hand

Real NYC venue list (Brooklyn Mirage, House of Yes, Nowadays, Knockdown
Center, etc.) in `src/lib/constants.js`. Existing feature design notes for
Overlap at `docs/tikcal-overlap-design.md`. No testimonials, case studies,
press, or usage metrics exist — future work must not fabricate any.

## Product Principles

1. Who's going matters as much as when/where — RSVP and crew visibility
   are first-class, not an afterthought bolted onto a calendar.
2. Low-friction event entry — Smart Add exists so manual data entry is the
   exception, not the default path.
3. Color carries meaning — brand violet is chrome only; data hues (crew,
   RSVP, free/shared) are reserved and never repainted for decoration.
4. Mobile-first — most usage is a phone, deciding "am I going tonight."
5. NYC-focused today, not NYC-locked — don't bake permanent geographic
   assumptions into the data model or copy.

## Accessibility & Inclusion

No formal standard (e.g. WCAG AA) is required. Reasonable practice —
visible focus states, adequate contrast, keyboard navigability where it's
natural — is sufficient for now.
