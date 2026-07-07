# TikCal Overlap — Visual & Interaction Design Notes

Companion to [`tikcal-overlap-spec.md`](./tikcal-overlap-spec.md). This resolves the
spec's §5/§8 into decisions grounded in TikCal's *actual* design system
(`src/index.css`, `tailwind.config.js`, `src/components/ui.jsx`) rather than the
spec's generic "orange on black" prose.

Design tokens in play (existing): `ink #0a0e12`, `ink2 #040608`, `ice #4cc9f0`
(primary/cyan), `mint #6EE7B7` (success/highlight), `orange #ff6b2b` (defined but
currently unused). Fonts: Barlow 800 italic (logo), Syne (headings), Space Grotesk
(body), IBM Plex Mono (labels). Aesthetic: HUD boxes with corner brackets, Tron
grid background, high-contrast near-black.

---

## 1. Core metaphor: the board is a light table

Availability is **additive light**. Each participant is a colored light source; a
cell brightens with the number of free participants. Brightness *is* the data —
overlap is legible pre-attentively, before reading any label.

## 2. Cell state → render (resolves spec §5)

| State | Meaning | Render | Token |
|---|---|---|---|
| `all_free` | everyone free | **solid orange fill**, highest weight, soft glow | `orange #ff6b2b` |
| `partial` | ≥2 but not all free | orange at opacity scaled to fraction (2/4→~0.35, 3/4→~0.6) + `3/4` badge | `orange` α |
| `shared_event` | 2+ hold the same TikCal event | **mint ring + glow + artist monogram** — loudest, the payoff | `mint #6EE7B7` |
| `blocked` | conflict / no free majority | recessed `ink2` fill, hairline `white/8` border, inset shadow — a "wall", does NOT light on hover | `ink2 #040608` |
| `unknown` | unanswered | transparent, dashed `white/15` border | — |

**Why orange = free:** it is the only *warm* accent in an otherwise cool cyan/mint
UI, so open windows pop off the board and read as "GO." This makes orange
*semantic* (free/opportunity) rather than a global re-theme — reconciling spec §8
with the live app. Wire the free-state color as a single constant so it's
swappable.

## 3. Layout: battleship coordinates + bento tiles

- **Coordinates:** columns = in-criteria dates, rows = selected dayparts. Sticky
  date header (top) and sticky daypart rail (left) so position is never lost while
  scrolling — the battleship grid read.
- **Bento tiles:** each cell is a chunky rounded tile separated by black gutters, so
  every slot reads as a distinct object rather than a spreadsheet cell. Gutters =
  the generous black space the brand already uses.
- **Consistent unit shape:** events on the board render as a fixed-size monogram
  piece via existing `getInitials()` + `getEventStyle()` (`src/lib/constants.js`),
  so a board event looks like the same game piece as on the calendar.

## 4. Readability without clutter (two-tier information)

- **Grid cells stay near-text-free:** state color + tiny `n/4` badge + (shared only)
  a monogram. No artist/venue text crammed into cells.
- **Labels live where there's room:** the tap-to-open detail sheet and the
  **"Best windows" list view** carry full artist / venue / date-time. The list is
  the primary one-handed mobile surface — build it first-class, not as an
  afterthought (spec §5).

## 5. Who's free, at a glance (per-participant read)

Along each tile's bottom edge, a row of up to 4 tiny dots in participants' assigned
colors: filled = free, hollow = busy/unknown. The "hits per player" battleship read
— see *which* friends are free without opening the cell. Participant palette pulls
from the existing `EVENT_STYLES` neon set (`ice`, `mint`, `#6aa8ff` periwinkle,
`#c08bff` violet) so it's already harmonized; assign one per participant on join.

## 6. Clickability affordances (function-driven)

- Free / partial / shared tiles are real buttons with the app's existing hover lift
  (`hover:border-ice/40`, cf. `EventCard.jsx`) plus a soft glow — "tappable and
  rewarding."
- Blocked tiles are recessed and do **not** light on hover — they signal "no point
  tapping."
- 44px minimum touch targets; the board horizontal-scroll-snaps by week on mobile.

## 7. Motion = liveness, not decoration

On Supabase realtime updates, affected tiles do a quick fill/glow pulse — you watch
the board light up as friends respond. Emotional hook + it communicates that data
changed. Keep it to opacity/transform (cheap, 60fps).

## 8. Legend & chrome

- Pinned legend strip under the board (mono labels, matching `SecLabel`) — the key
  to the board.
- Reuse `HudBox` for the session header and detail sheet; `Btn` (mint/ice/ghost) for
  actions; `GridBg lite` behind the board so the Tron floor reads but doesn't fight
  the tiles.

## 9. Implementation constants (single source of truth)

```js
// src/lib/overlapTheme.js (proposed)
export const FREE_COLOR = '#ff6b2b'          // all_free / partial base (swappable)
export const SHARED_COLOR = '#6EE7B7'        // shared_event ring/glow (mint)
export const PARTICIPANT_COLORS = ['#4cc9f0', '#6EE7B7', '#6aa8ff', '#c08bff']
export const DAYPARTS = [
  { key: 'morning', label: 'AM',  window: [6, 12] },
  { key: 'midday',  label: 'MID', window: [12, 17] },
  { key: 'night',   label: 'PM',  window: [17, 24] },
]
```
