# TikCal — Product Description

## One-liner
TikCal is a social calendar for concert-going in NYC: it pulls every show you're tracking, from any ticket source, into one calendar, and shows when your crew is actually free to go together.

## Problem
Tickets live scattered across a dozen apps, inboxes, and screenshots. Friends' plans live somewhere else entirely (group chats, memory). Deciding on a night out means digging through all of it before anyone can actually decide.

## Core value prop
"Every source, one calendar." TikCal is the single place tickets and crew availability come together, so making plans is about deciding, not digging.

## Who it's for
Groups of friends in NYC (a "crew") who go to concerts/shows together and want shared visibility into who's going where, without manually syncing calendars or chasing RSVPs in group chats.

## Core features (from shipped app)
- **Unified calendar** — every show you and your crew are tracking, in one place (Month/Week views).
- **Smart Add** — drop a ticket link, text, or screenshot and TikCal extracts the event details automatically (`AddEvent.jsx`).
- **Friends + Crews** — follow friends, join invite-only crews for instant group density (`Friends.jsx`).
- **Discover** — surface upcoming NYC concerts to add to your calendar (`Discover.jsx`).
- **Overlap** — see when your crew is collectively free; group availability layered against events, with a real-time session mode (`Overlap.jsx`, `OverlapSession.jsx`, spec in `docs/tikcal-overlap-design.md` / `tikcal-overlap-spec.md`).
- **Plan** — turn overlap/availability into an actual planned outing (`Plan.jsx`).
- **RSVPs & crew color-coding** — each crew member/event carries a color accent so density is visible at a glance ("data is information" design rule — crew colors, RSVP amber/coral, free/GO orange are never restyled for branding).
- **Profile / event detail pages** — standard social-calendar scaffolding.

## Platform / stack
- Web app: React 18 + Vite 5 + Tailwind 3, Supabase backend (Postgres + RLS, SECURITY DEFINER RPCs for writes).
- Mobile: Capacitor wrapper in progress for iOS + Android (native app shells present at `~/projects/tikcal/ios`, `~/projects/tikcal/android`).
- Deployed at the production domain (see `CNAME`); design tokens under active "Aurora" rebrand (violet/magenta chrome, near-black base — replaced the old cyan "Wide Ice" theme).

## Current design direction (for redesign context)
- Brand chrome = violet (`aurora #c04bff`, `violet #8b5cff`, `iris #5b6bff`); legacy cyan/ice is deprecated, don't reintroduce as UI accent.
- Data hues are semantic and protected: mint = shared/"I'm in", orange = free/GO state (Overlap only), 10 crew colors, RSVP amber/coral — these encode meaning and must survive any redesign.
- Fonts: Barlow 800 italic (logo), Syne (headings), Space Grotesk (body), IBM Plex Mono (labels/data).
- Surface language: soft rounded HUD panels, dark event cards with a colored left "spine" indicating the event's crew/hue; aurora light-leak bloom backdrop (not a hard Tron grid).
- Full token detail: `~/projects/tikcal/CLAUDE.md` → "Design tokens" section; Overlap-specific state→render contract: `docs/tikcal-overlap-design.md`.

## Known in-flight work (context, not scope)
- Overlap event recommendations (Ticketmaster × Spotify) — built and deployed on a feature branch.
- Mobile app (Capacitor) — 4-phase plan, in progress.
- Prior redesign audit (week of 2026-07-28): 20 plugins audited, 5 UX bugs found, 4-phase redesign drafted, drag-and-drop/DnD enhancements shipped.

## Where to hand this off
This file: `~/projects/tikcal/docs/tikcal-product-description.md`. Pair with `CLAUDE.md` (design tokens, conventions) and `docs/tikcal-overlap-design.md` for anyone picking up a redesign.
