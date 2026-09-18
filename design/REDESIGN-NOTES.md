# TikCal — App Icon + Mobile Redesign (session 2026-07-19)

Brief (from Nick): mobile app for eventual App Store release. Design DNA:
- **Disco-ball grid × calendar**: 70s multi-colored square-tile dance floor merged with a calendar.
- **Loading animation**: lights hop square→square across the dance floor, then *settle* into your calendar screen.
- **App icon**: liked disco-ball-grid, mirror-globe, TC lettermark — but **most of all Synth Horizon**. Needs *refinement* + a *simplified* version. Fold in mirror-globe + **Tikal pyramids** (the name: Tikal + Calendar → TikCal). Subtle pyramid homages woven through the site.
- Icon inspo ref: recent.design/app-icons (bold, single clear motif, flat-ish depth, confident gradients).

## The unifying idea I landed on
The retro "slatted sun" of a synthwave horizon *is* a stepped pyramid *is* stacked calendar rows *is* a facet of a mirror ball. One form, four readings:
- Sun on the horizon = Synth Horizon (the favorite).
- Its lower slats step down = **Tikal pyramid**.
- Facet lines across it = **mirror globe**.
- The receding grid floor below = the **disco dance-floor / calendar grid**.
So the icon doesn't collage the concepts — it collapses them into a single mark.

## Palette

Two separate palettes now — the app chrome and the icon intentionally diverge.

**App chrome — "Aurora"** (shipped in commit `e4301d5`; see CLAUDE.md for the
authoritative token list). Near-black base + a magenta→violet aurora light-leak.
Color is information: violet is brand/chrome, every other hue stays reserved for data.
- ink `#0b0b11` (bg), ink2 `#060609` (recessed/blocked)
- **brand/chrome = violet:** aurora `#c04bff`, violet `#8b5cff`, iris `#5b6bff` — wordmark glow, hero, primary CTA (`Btn variant="aurora"`), nav-active, calendar today-marker/selection, links, focus.
- **data hues (do NOT rebrand):** mint `#6EE7B7` (shared / "I'm in"), orange `#ff6b2b` (semantic free/GO in Overlap only), the 10 crew colors via `getEventAccent`, RSVP amber/coral.
- cyan `#2FE6E6` / ice `#4cc9f0` are **legacy** — no longer chrome; `ice` survives only as a crew-color option. Don't reintroduce them as UI accents.
- backdrop is the aurora bloom, not a Tron grid: `GridBg` renders it via the reused (repainted) `.grid-glow` / `.grid-floor` / `.grid-horizon` classes.

**App icon — Synth Horizon sun** (icon-only, unchanged by the rebrand). The mark
keeps its warm synthwave gradient on purpose; it does *not* follow the violet chrome.
- deep field `#0a0e16` → `#06080e`
- sun slats top→bottom: mint `#7cf3c4` → yellow `#ffe08a` → orange `#ff9e3d` / `#ff6b2b` → magenta `#ff2e7e` (bottom heat)
- grid floor / facet lines: cyan `#4cc9f0`

## Type
Barlow 800 italic (wordmark), Syne (headings), Space Grotesk (body), IBM Plex Mono (labels/data). Unchanged — already distinctive.

## Deliverables this session
1. App icon: master (1024) + simplified (small) SVG → PNGs at App Store sizes. [icon]
2. DanceFloorLoader: square-tile light chase resolving into the calendar grid. [loader]
3. PWA + mobile/App-Store foundation: manifest, apple-touch icons, safe-area, Capacitor scaffold, APP-STORE.md. [mobile]
4. Tikal pyramid homages woven subtly into the app. [homage]

## Log
- (start) Read existing system. Chose the "one form, four readings" concept over collaging.
- (2026-07-20) Aurora rebrand shipped: app chrome moved from cyan "Wide Ice" to the magenta/violet aurora (`e4301d5`); CLAUDE.md design tokens updated to match (`9183883`). The icon stays warm Synth Horizon — chrome and icon deliberately diverge. Palette section above rewritten to reflect this.
