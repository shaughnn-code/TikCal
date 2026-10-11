# TikCal mobile mockups — 2026-09-29

Two sets of the same six-screen core flow, rendered from HTML at iPhone 15 Pro size (393×852pt, @3x, 1560×3000 PNG).

Flow: welcome → sign in → calendar home → event detail → discover → profile. Sample data is October 2026 in NYC, with today as Wed Sep 30. The five October shows all fall on Saturdays (Oct 3, 10, 17, 24 and 31). Set B's Discover screen also has a Floating Points card for Nov 7.

## Re-render

```
node design/mockups-2026-09-29/render.mjs set-a-afterglow.html set-b-wristband.html set-c-timetable.html
```

Run from the repo root. The script fails if a font or icon did not load. Icon data is bundled in `icons.js`, so renders don't depend on the Iconify API.

## Set A — Afterglow (current system, polished)

Follows `DESIGN.md`: ink background, one aurora bloom as the light source, violet chrome, event hues on card spines, mint only for "I'm in", Syne headings, Plex Mono for data. The `logo-3d` chrome wordmark and `.grid-glow` bloom are copied from `src/index.css`.

Differences from the shipped app:

- **Bottom tab bar instead of the top nav.** It keeps all six tabs (Cal / Find / Plan / Crew / Sync / You). `Nav.jsx` gives each tab its own rainbow gradient, which breaks the Chrome-Only Rule, so the mockup uses violet for every active state. The code should probably follow.
- **Minimum text is 11px**, not DESIGN.md's 9–10px micro-labels, which aren't readable on a phone at arm's length.
- **The event hero is a CSS stage scene** (beams, crowd silhouette, grain). There are no photos.

## Set B — Wristband (new direction)

The gig-poster and wristband look of a riso-printed flyer. It keeps TikCal's product logic (crews, in/maybe/out, mono for data) and replaces the visual layer.

- **Theme:** editorial. Cream paper (`#efe9dd`) with ink `#17150f`, matte paper grain.
- **Palette:** desaturated base with one bold hit. Signal red `#ff4a1c` is the brand and primary action, always with ink text for contrast. Crew colors become riso inks: blue, pink, teal and yellow. RSVP uses its own hues: green `#0f9d58` for in, amber for maybe.
- **Type:** Instrument Serif (display, with italic for emphasis), Inter Tight (UI) and JetBrains Mono (data labels).
- **Imagery:** halftone riso posters built in CSS/SVG (dot patterns, crowd silhouettes, light beams). The disco-ball mascot appears on the welcome poster.
- **Signature components:**
  - ticket-stub cards with a perforated divider
  - wristband marquee strips
  - poster grid on Discover
  - venue "passport" stamps on the profile
- **Navigation:** 4 tabs in a floating ink pill: Shows, Find, Crew and You. Plan and Sync fold into Crew, since both are crew actions. Add moves to a red button in the header.
- **Voice:** "Get my wristband", "Back on the list", "3 of you".

## Set C — Timetable (usability-first, anti-generic)

Built to avoid the common generated-UI tells: no glow, gradients, grain, glass, emoji, decorative glyphs, illustrated crowds, or uppercase mono "eyebrow" labels. It should read as a real, shipped iOS product.

- **Theme:** white screens and ink type, with grouped `#f3f3f1` surfaces and hairline dividers instead of shadowed cards.
- **Color:** one brand color, cobalt `#1d3bff`. It is used only for primary actions, the active tab and links. RSVP states always pair text with color: Going is green with a check, Maybe is amber with a "?", and an unanswered show has an outlined "Reply" button. Crews are transit-line bullets: a colored circle with the crew's letter.
- **Type:**
  - Archivo carries all the text. Its condensed width axis (`font-stretch: 62–72%`) is used only for date numerals and the set-type artist billing.
  - IBM Plex Mono is used only for real data: times, prices and the poster's date line.
- **Imagery:** flat color blocks with the artist name set in condensed type, like a venue listing or Resident Advisor. There are no illustrations.
- **Usability:**
  - iOS large titles, a real segmented control (List / Week / Month), and a labelled 4-tab bar (Calendar, Discover, Crews, You).
  - Touch targets are at least 44pt and text is at least 12px.
  - Each screen has one primary action, placed in the thumb zone. On the event screen the RSVP control is sticky at the bottom.
- **Content density:** the event screen shows doors and set times, address, nearest train, price range, age policy and crew answers. Each Discover pick says why it was picked ("Jess and Rae have him on repeat").
