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

## Palette (from tailwind.config + index.css, extended for the sun)
- ink `#0a0e12`, ink2 `#040608` (bg)
- ice/cyan `#4cc9f0`, cyan2 `#2FE6E6` (grid, horizon)
- mint `#6EE7B7` (top of sun)
- orange `#ff6b2b` (mid sun — brand's only warm accent)
- magenta `#ff2e7e` (bottom of sun — synthwave heat; NEW, icon-only)
- warm yellow `#ffd36e` (sun highlight)

## Type
Barlow 800 italic (wordmark), Syne (headings), Space Grotesk (body), IBM Plex Mono (labels/data). Unchanged — already distinctive.

## Deliverables this session
1. App icon: master (1024) + simplified (small) SVG → PNGs at App Store sizes. [icon]
2. DanceFloorLoader: square-tile light chase resolving into the calendar grid. [loader]
3. PWA + mobile/App-Store foundation: manifest, apple-touch icons, safe-area, Capacitor scaffold, APP-STORE.md. [mobile]
4. Tikal pyramid homages woven subtly into the app. [homage]

## Log
- (start) Read existing system. Chose the "one form, four readings" concept over collaging.
