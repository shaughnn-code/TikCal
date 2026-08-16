---
name: TikCal
description: Shared show calendar for crews — near-black stage-light chrome over meaningful data hues.
colors:
  ink: "#0b0b11"
  ink2: "#060609"
  panel: "#15151c"
  panel-2: "#1c1c25"
  line: "#28282f"
  muted: "#8f8fa3"
  faint: "#5a5a6b"
  aurora: "#c04bff"
  violet: "#8b5cff"
  iris: "#5b6bff"
  mint: "#6EE7B7"
  orange: "#ff6b2b"
  cyan: "#2FE6E6"
  ice: "#4cc9f0"
  text-primary: "#e8f4f8"
  text-body: "#ececf4"
  text-secondary: "#94a3b8"
  mint-ink: "#04221a"
  muted-past: "#334155"
typography:
  display:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.02em"
    lineHeight: 1
  heading:
    fontFamily: "Syne, system-ui, sans-serif"
  section-headline:
    fontFamily: "Syne, system-ui, sans-serif"
    fontWeight: 800
    fontSize: "26px"
    lineHeight: 1
  body:
    fontFamily: "\"Schibsted Grotesk\", system-ui, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "\"IBM Plex Mono\", ui-monospace, monospace"
    letterSpacing: "0.14em"
    fontSize: "11px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "16px"
  xl: "24px"
components:
  button-aurora:
    backgroundColor: "linear-gradient({colors.aurora}, {colors.violet})"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#cbd5e1"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  card-event:
    backgroundColor: "{colors.panel}"
    textColor: "#e8f4f8"
    rounded: "{rounded.xl}"
    padding: "14px"
---

# Design System: TikCal

## Overview

**Creative North Star: "The Afterglow"**

TikCal's whole surface is a near-black room lit by one thing: a stage-light
bloom bleeding in from the top of the screen. Everything else — panels,
text, borders — recedes into the dark and lets that one wash of color read
as the room's only real light source. The interface isn't decorated with
gradients; it's *lit* by one.

That light is chrome, not paint. Aurora/violet/iris exist to signal "this
is TikCal speaking" — wordmark, hero, primary CTA, the calendar's
today-marker, links, focus rings — and nowhere else. Data carries its own,
separate hues (crew colors, mint, RSVP, the one reserved orange), and the
chrome deliberately never touches them: the glow illuminates the room, it
doesn't relabel what's standing in it. Voice matches the visual: nightlife/
rave vernacular (totem names like "The Press," "Glow Stick"), never
corporate polish.

**Key Characteristics:**
- One chrome light source (magenta→violet→iris), used sparingly, never as
  a flat fill on large surfaces
- Reserved, separate data hues that the chrome never repaints
- Flat, glow-lit depth — no drop-shadow hierarchy
- Mono labels for anything data/metadata; humanist sans for content

## Colors

Two families that never mix: **chrome** (the one brand light, used for
UI-is-speaking moments) and **data** (meaning-bearing, permanently
reserved). The palette reads warm-to-cool as a single sweep, not three
unrelated accents.

### Primary
- **Magenta Core** (`#c04bff`, `aurora`): the brightest point of the
  bloom — wordmark glow, hero backgrounds, the top of gradient CTAs.
- **Mid Violet** (`#8b5cff`, `violet`): the workhorse chrome — primary
  button fill, nav-active state, focus rings, links, the calendar's
  today-marker and selection.
- **Blue Tail** (`#5b6bff`, `iris`): the cool trailing edge of the bloom —
  gradient tails, secondary link hover.

### Neutral
- **Ink** (`#0b0b11`): base background, the dark room the light bleeds
  into.
- **Ink Recessed** (`#060609`): blocked/disabled surfaces, deeper than
  base ink.
- **Panel** (`#15151c` at ~70% opacity): card/HUD surfaces, `HudBox`'s
  default tone.
- **Panel Deep** (`#1c1c25`): secondary panel surfaces, hover states.
- **Line** (`#28282f`): hairline borders, kept nearly invisible against
  ink.
- **Muted Past** (`#334155`): the desaturated spine/accent color a past
  event falls back to on `EventCard` once its real crew/artist hue is
  dropped — signals "this already happened" through color alone, distinct
  from Line (borders) and Faint (tertiary text) despite similar darkness.
- **Text Primary** (`#e8f4f8`): the system's actual "white" — card
  titles, headings, anything meant to read as the brightest text on a
  panel. Not pure `#fff`; carries a faint cool tint.
- **Text Body** (`#ececf4`): the `<body>`-level base text color. Sits a
  half-step cooler/dimmer than Text Primary — reserve Text Primary for
  titles/emphasis inside cards, let page-level running text use this one.
- **Text Secondary** (`#94a3b8`): the slate-toned secondary line under a
  title (venue, meta row) — distinct from **Muted** (`#8f8fa3`, warmer,
  used for labels/captions) and **Faint** (`#5a5a6b`, tertiary/disabled).
  Three-step text hierarchy: Text Primary → Text Secondary/Muted → Faint.

### Legacy (retired, still referenced)
- **Ice** (`#4cc9f0`): the old "Wide Ice" chrome accent. No longer a UI
  accent color (see Retired-Cyan Rule), but survives as the fallback swatch
  when an event/crew has no assigned color yet — `EventCard`,
  `EventDetail`, `AddEvent`'s crew picker all default to it. Keep this
  fallback role; don't extend it back into chrome use.

### Paired Tokens
- **Mint Ink** (`#04221a`): not a standalone color — the required dark
  text color whenever mint is used as a *fill* (the `Btn variant="mint"`
  button, the "enter" CTA on the welcome scene). Mint is light enough that
  white text fails contrast on it; this pairing is load-bearing, not a
  separate design decision each time.

### Named Rules
**The Chrome-Only Rule.** Aurora/violet/iris are reserved for
"TikCal-is-speaking" moments (brand, navigation, focus, primary action).
They never appear as an event's, crew's, or RSVP's identity color — that
would make the chrome mean two things at once.

**The Reserved-Hue Rule.** Crew colors (10 fixed options, `getEventAccent`
in `src/lib/constants.js`), mint (`#6EE7B7`, shared/"I'm in"), RSVP amber/
coral, and the single `#ff6b2b` orange (free/GO state in Overlap only) are
semantic data, not decoration. A new UI surface reaches for chrome; a new
*meaning* gets its own reserved hue, never an existing one repurposed.

**The Retired-Cyan Rule.** `#2FE6E6` (`cyan`) and `#4cc9f0` (`ice`) were
the old "Wide Ice" chrome and are fully retired from that role. `ice`
survives only as one selectable crew color — don't reintroduce either as a
UI accent.

## Typography

**Display Font:** Barlow 800 italic (with system-ui fallback)
**Heading Font:** Syne (with system-ui fallback)
**Body Font:** Schibsted Grotesk (with system-ui fallback)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace fallback)

**Character:** An italic weight-800 display face for the one wordmark
moment, paired with a geometric-but-warm body sans and a mono face that
does all the "data talking" — timestamps, labels, countdowns, section
eyebrows. The mono face is doing more work here than in most systems: it's
the voice of metadata throughout the app, not just code.

### Hierarchy
- **Display** (800, italic, ~56px desktop / ~30px compact): the TikCal
  wordmark only — `.logo-3d` / `.logo-3d-sm` chrome-gradient text-fill
  treatment, never used for page content.
- **Headline** (Syne, bold): section headings, page titles.
- **Body** (Schibsted Grotesk, regular): event titles, notes, primary
  reading content.
- **Label** (IBM Plex Mono, 11px, 0.14em tracking, uppercase): section
  labels (`SecLabel`), timestamps, venue names, countdowns, button text.

### Label Micro-Scale

The label role isn't one fixed size — this is a dense HUD-style UI, and
mono labels step down further depending on how crowded the surface is.
Documented steps, smallest to largest:

- **9px** — the tightest caption: popover "who's in" chips, secondary
  meta lines packed next to other content (`EventDetail`).
- **10px** — the most common size: button micro-labels, popover body
  text, form helper/suggestion text (`AddEvent`, `EventPopover`,
  `MonthView`/`WeekView` chip meta).
- **11px** — the `SecLabel` default: section headers, primary captions.
- **12.5px** — chip/badge text one step up from caption, still mono but
  reads as a small label rather than a footnote (`MonthView`/`WeekView`
  event chips).
- **13px** — the largest label step, used where a mono string needs to
  carry near-body weight (e.g. `EventCard`'s date/venue row).

Pick the step by local density, not by component type — the same "venue
name" string is 10px in a tight popover and 13px in a spacious card row.

**Section Headline** (Syne, extrabold, 26px, leading-none): the recurring
view-title heading — `Week of Aug 16–22`, `August 2026` — used identically
in `MonthView`, `WeekView`, `DayView`. Distinct from the Label micro-scale
above (Syne, not mono); one fixed size, not a density-driven step.

### Named Rules
**The Mono-Speaks-Data Rule.** If a string is a date, count, venue, or
status, it's IBM Plex Mono, uppercase, tracked wide. If it's prose a human
wrote (event title, notes), it's Schibsted Grotesk. This distinction is
load-bearing, not stylistic — it's how a screen visually separates "what
the system knows" from "what a person said."

## Layout

Mobile-first single column (`max-w-2xl`) for most pages; the calendar view
opts into a wider `max-w-6xl` (`Wrap wide`) to fit a 200px side rail next
to a 7-column month/week grid. Spacing runs on Tailwind's default scale
with no bespoke rhythm system — `gap-3`/`gap-4` for tight component
clusters, `p-3.5`–`p-4` card padding, `py-8` page-level breathing room.
Responsive behavior collapses detail rather than reflowing structure:
Month view's event chips shrink to color dots below `sm`; the calendar
rail's descriptive hint text is `hidden` below `lg` rather than wrapped
awkwardly.

## Elevation & Depth

Flat by design, not by omission — depth comes from **light**, not
shadow. `HudBox` (the system's one card primitive) uses an inset top
highlight (`inset 0 1px 0 rgba(255,255,255,0.04–0.06)`) plus a soft
ambient glow (`0 10px 30px -16px rgba(0,0,0,0.8)`, or a violet-tinted
version in `hero` mode) — never a directional drop-shadow implying a
light source above the screen. Background depth comes from the
`.grid-glow`/`.grid-floor`/`.grid-horizon` aurora bloom, a blurred radial
gradient standing in for stage light, not a measured grid or floor plane.

### Named Rules
**The Glow-Not-Shadow Rule.** Elevation reads through an ambient color
wash and a hairline top highlight, never a hard offset shadow. A surface
that needs to feel "raised" gets `hero` (brighter border, violet wash), not
a heavier `box-shadow`.

## Shapes

Generously rounded throughout — `rounded-2xl` (16px) is the default card/
panel radius, `rounded-xl`/`rounded-lg` for secondary surfaces, plain
`rounded` (4px, Tailwind default) for buttons and inputs, which stay
comparatively sharp against the softer cards. Borders are hairline and
low-opacity (`border-white/[0.07]` to `border-white/10`), acting as
definition rather than a strong outline. One legacy exception: `.hud`
corner-bracket marks (`brackets` prop on `HudBox`) — small HUD-style
corner ticks kept for surfaces that want the older sci-fi-terminal read;
not the default.

## Components

### Buttons (`Btn` in `src/components/ui.jsx`)
- **Shape:** `rounded` (4px), `px-5 py-3`, mono/bold/uppercase label,
  `0.06em` tracking.
- **Aurora variant:** gradient fill `aurora → violet`, white text, glow
  shadow (`0 8px 24px -8px rgba(192,75,255,0.6)`) — the one CTA-strength
  button; reserved for the primary action on a screen.
- **Mint / Ice variants:** solid fill (`mint` or `violet`), used for
  secondary-but-still-affirmative actions (mint reads as the "confirm/
  shared" data hue leaking intentionally into a CTA — the one place chrome
  and data touch, because the action itself *is* the shared/RSVP action).
- **Ghost:** transparent, hairline border, for tertiary/cancel actions.
- **Hover/Focus/Active:** `hover:brightness-110` on filled variants;
  interactive surfaces app-wide share one focus treatment —
  `focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2`
  — and a `active:scale-[0.96–0.99]` press-down, never a color-only state
  change.

### Cards (`HudBox`, `EventCard`)
- **Corner Style:** `rounded-2xl` (16px).
- **Background:** `panel` at 70% opacity, `backdrop-blur-sm`.
- **Elevation:** see Elevation & Depth — inset highlight + ambient glow,
  brighter/violet-washed in `hero` mode.
- **Border:** hairline `border-white/[0.07]`, brightens on hover
  (`hover:border-white/15`).
- **Signature detail — the colored spine:** `EventCard` and calendar chips
  carry a 3px colored left edge (`s.color` from `getEventAccent`) with a
  matching glow — this is the data-hue touchpoint on an otherwise chrome-
  neutral card, the card's one place of "whose color is this."
- **Internal Padding:** `p-3.5`, `pl-4` (extra left padding clears the
  spine).

### Popovers (`EventPopover`)
- **Style:** `HudBox hero`, `w-64`, positioned `absolute top-full mt-2`.
  Same visual language as cards, scaled down — this system doesn't invent
  a separate "popover" material, it reuses the panel primitive.
- **Content rhythm:** avatar-initial chip → title/venue → crew badges →
  "who's in" chips (mint-tinted, since RSVP-in is mint's domain) → source
  link → "View full details" mono link, each block separated by `mt-3`
  only, no internal dividers.

### Inputs (`Inp`, `Txta`, `Sel`)
- **Style:** `bg-white/[0.045]`, hairline border, `rounded` (4px, matches
  buttons not cards).
- **Focus:** border shifts to `violet/60` — no glow, no ring; inputs get
  the quieter of the two focus treatments (buttons/cards get the ring).
- **Label:** always a `SecLabel` mono uppercase caption above the field,
  never a placeholder-only field.

### Navigation / Rail (`CalRail`)
- View-tab buttons, Today button, and prev/next rail buttons share the
  same interactive contract as `Btn`: `transition-[...] duration-150`,
  `active:scale-[0.9–0.96]`, focus-visible violet ring. Descriptive hint
  copy is mono, `hidden` below `lg` rather than truncated.

## Do's and Don'ts

### Do:
- **Do** treat aurora/violet/iris as a single warm-to-cool sweep (a
  gradient family), not three interchangeable flat accents.
- **Do** give every interactive element the same three states: hover
  (brightness/border), focus-visible (violet ring), active (scale-down).
- **Do** put dates, counts, venues, and status in IBM Plex Mono, uppercase,
  tracked wide.
- **Do** build elevation from an inset highlight + ambient glow, never a
  hard offset shadow.

### Don't:
- **Don't** use `#2FE6E6` (cyan) or `#4cc9f0` (ice) as a UI accent — that
  chrome role is retired; `ice` survives only as a crew-color option.
- **Don't** use the reserved orange (`#ff6b2b`) anywhere but Overlap's
  free/GO state — it is not a generic warning or highlight color.
- **Don't** recolor a crew badge, RSVP status, or the mint "shared" hue
  with chrome violet — those hues are the data, not the theme.
- **Don't** add a literal measured grid/floor line pattern to backgrounds
  — depth here comes from blurred ambient bloom (`.grid-glow`), not graph-
  paper geometry; this was an explicit correction from an earlier pass.
