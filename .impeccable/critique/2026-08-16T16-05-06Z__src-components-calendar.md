---
target: src/components/calendar
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-16T16-05-06Z
slug: src-components-calendar
---
Method: dual-agent (A: general-purpose · B: general-purpose)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Rail shows current period + active tab clearly; no loading/fetch state visible in this slice |
| 2 | Match System / Real World | 2 | Nightlife voice is right, but gesture vocabulary (pinch=zoom, double-click=dive) is desktop-app convention, weakly mapped to "check my calendar" |
| 3 | User Control and Freedom | 2 | EventPopover has no Escape-to-close; double-click is overloaded (select vs dive) with no guard |
| 4 | Consistency and Standards | 2 | Month chip = click-toggle popover; Week chip = hover-preview + click-navigates. On touch, hover never fires — the asymmetry collapses into "no preview at all" on Week for the primary (mobile) platform |
| 5 | Error Prevention | 2 | Double-click dive/zoom has no debounce against accidental rapid clicks |
| 6 | Recognition Rather Than Recall | 2 | Rail's genuinely good gesture-hint copy is `hidden` below `lg` — invisible on the mobile-first primary surface |
| 7 | Flexibility and Efficiency | 4 | Six input paths (rail buttons, swipe, arrow keys, pinch/ctrl-scroll, double-click) all drive the same two primitives — excellent for power users |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, chunked (≤3 chips + "+N more"); minor Today-button vs active-tab violet-usage overlap |
| 9 | Error Recovery | 1 | No error/degraded state visible anywhere in the calendar surface files |
| 10 | Help and Documentation | 1 | The one contextual-help surface (rail hints) is desktop-only on a mobile-first product |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment**: Not a reskinned generic calendar. The colored-spine event card, crew-color dots, mint "who's in" chips, totem avatars, mono-everywhere metadata voice, and copy ("NO SHOWS THIS NIGHT," "T-1D," "TBA") are load-bearing to TikCal's "who's going" mission, not decoration. The Month-vertical/Week-horizontal swipe-axis split is a genuine, documented interaction decision — real specificity, rare for a calendar component. It slips toward generic in the scaffolding: rail buttons, arrow keys, double-click-to-zoom, pinch are standard calendar-app furniture, and EventPopover's avatar→title→badges→link shape is a conventional preview-card pattern any scheduling tool could ship unchanged.

**Deterministic scan**: 21 findings (20 `design-system-font-size`, 1 `design-system-color`), advisory/quality, non-degraded run (exit 2, no DEGRADED banner). Cross-checked against DESIGN.md's own Label Micro-Scale (9/10/11/12.5/13px, added this session): roughly 15 of the 20 font-size findings are **false positives** — the detector's DESIGN.md parser only reads simple token declarations and missed the prose-documented ramp (e.g. EventCard.jsx:49's 13px is literally DESIGN.md's own example). Genuine remaining findings: **15px** (CalRail.jsx:16), **26px** repeated three times as an undocumented view-header/day-number size (DayView.jsx:16, MonthView.jsx:17, WeekView.jsx:30), **12px** (EventCard.jsx:90, one step off the documented 12.5px), and **`#334155`** (EventCard.jsx:45, the "past event" spine color — genuinely undocumented, no equivalent muted/disabled token exists in DESIGN.md's palette).

**Visual overlays**: not available — no browser-overlay injection was run (see Browser Evidence below for why).

## Overall Impression

The system is coherent and specific where it counts (event surfaces, color-as-information, voice) and undisciplined where it's invisible: help text, error states, and touch-parity all lag behind the desktop/power-user experience. The single biggest opportunity is closing the gap between "excellent for Alex" (flexibility score 4/4) and "actively worse for Jordan on the platform PRODUCT.md says matters most" (help/recognition scores 1-2/4) — the same swipe/zoom system that makes this feel expert-grade also has zero teaching surface on mobile.

## What's Working

- **Reduced-motion discipline**: `motion-reduce:hidden` / `motion-reduce:animate-none` threaded through every animated layer of `CalendarZoom` (outgoing, step, zoom-in) — accessibility baked into a genuinely elaborate transition system, not bolted on.
- **No pattern proliferation**: `DayView` deliberately reuses `EventCard` verbatim instead of inventing a fourth event visual, with the rationale left in-code.
- **One visual language across four event surfaces**: colored spine, mono metadata, "T-1D" countdowns, mint "who's in" chips read identically across EventCard, MonthChip, WeekView Chip, and EventPopover — no drift.

## Priority Issues

**[P1] Gesture help is invisible on the platform it matters most for.**
Why it matters: CalRail's entire hint block (`hidden lg:flex`) explaining swipe/pinch/double-click is desktop-only, but PRODUCT.md states most usage is mobile and the swipe/arrow-key system is explicitly built for touch. Mobile users get zero on-screen teaching for the calendar's core navigation model.
Fix: surface a condensed one-line or icon-based hint on mobile (swipe-chevron affordance or one-time coachmark), not the full text block.
Suggested command: `/impeccable onboard`

**[P1] Month/Week click asymmetry collapses into "no preview" on touch, not just a desktop inconsistency.**
Why it matters: Month chip = click toggles popover (works on touch). Week chip = hover-preview + click-navigates — hover never fires on touch, so on mobile every Week tap silently skips the preview and jumps straight to full detail. This is a functional capability gap on the primary platform, not just a Nielsen #4 violation.
Fix: give Week chips a touch-triggered preview (long-press or tap-to-open, matching Month) instead of hover-only.
Suggested command: `/impeccable adapt`

**[P2] EventPopover can't complete the app's core action.**
Why it matters: the popover shows crew + who's-in + a link but no RSVP control. For a product whose stated primary job is "know who's going, decide to show up," the fastest glance-and-decide surface forces a full page navigation to actually act.
Fix: add inline in/maybe/out controls to the popover for the signed-in user's own RSVP.
Suggested command: `/impeccable distill`

**[P3] Six redundant navigation inputs, zero onboarding, axis flips between views with no persistent cue.**
Why it matters: rail buttons + swipe + arrow keys + pinch/ctrl-scroll + double-click all drive step/zoom; Month's swipe axis is orthogonal to Week/Day's. Good for Alex, costly working memory for Jordan, who has to notice the axis changed.
Fix: reduce/consolidate the discoverable surface for new users, or add a one-time visual cue (axis arrows) that adapts per view.
Suggested command: `/impeccable onboard`

**[P3] Small documentation/token gaps the detector caught for real.**
Why it matters: `26px` (view-header/day-number size, used identically in three files) and `#334155` (past-event spine color) are genuinely reused values with no DESIGN.md entry — exactly the kind of drift the doc exists to catch, distinct from the ~15 false-positive font-size hits already covered by the Label Micro-Scale.
Fix: add a `headline`/`day-number` type step (26px) and a `muted-past` or equivalent neutral token (`#334155`) to DESIGN.md; also review CalRail.jsx:16's 15px and EventCard.jsx:90's 12px as possible one-off drift from the 13px/12.5px steps.
Suggested command: `/impeccable typeset`

## Persona Red Flags

**Jordan (First-Timer)**: Lands on Month view on a phone, taps a colored dot on a busy day expecting detail — dots are intentionally non-interactive per an in-code comment ("too small to reliably target"), so the tap does nothing, no feedback, no redirect to Day view. The only explanation of double-click-to-dive lives in text `hidden` below `lg` — a mobile first-timer can only discover it by accident.

**Sam (Accessibility)**: `EventPopover`'s close affordance is mouse-driven (`onMouseLeave`/click-X); nothing binds Escape to dismiss, so a keyboard user who opens a Month popover via Enter has no keyboard-native way to close it besides re-toggling the same control. `EventCard`'s crew-identity dots carry crew identity by color alone (`title="Crew"` only, no visible text) — color-only signaling on a core meaning-bearing element in a crew-identity product.

**Riley (Stress Tester)**: rapid double-click on a Month day cell fires `select` then `dive` in the same gesture with no guard — a fast double-clicker gets a date-select and a view-zoom simultaneously. `runStep` in `CalendarZoom.jsx` has no re-entrancy guard against a new swipe/arrow-key/rail-click firing while `stepAnim` is already mid-flight (within the 260ms `STEP_MS` window) — worth stress-testing whether rapid successive swipes desync the visible transition from `focus` state.

## Minor Observations

- MonthView's `+N more` overflow text is plain, non-interactive — a natural click target that currently does nothing.
- WeekView's chip subtitle truncates to "TBA" (not "time TBA") specifically to keep the meaningful word from disappearing — a good micro-detail.
- CalRail's "Today" button (`bg-violet/[0.12]` fill) and the active view-tab (`text-violet` text only) both use violet to mean two different things — "jump to now" (action) vs. "currently selected" (state) — worth a visual distinction pass.
- Detector false positives (documented but still flagged): ~15 font-size hits already covered by DESIGN.md's Label Micro-Scale — tool limitation (parser only reads token-style declarations), not drift; no action needed.

## Questions to Consider

1. If Week's click-through-to-detail is justified because its chips are "already a prominent single-event surface," doesn't that logic argue Month's tiny mobile dots — even less informative than Week's chips — should behave the same way, rather than the opposite?
2. The popover can show who's in but not let you join them — was that a deliberate scope cut, or did it start as a lightweight preview that never got promoted into the action surface the product's own mission implies it should be?
3. Is the Month-vertical/Week-horizontal swipe-axis switch a memorable signature worth its working-memory cost, or exactly the kind of unlearnable inconsistency the rest of the system (uniform focus rings, uniform card language) is otherwise disciplined about avoiding?

## Coverage Note

Both assessments hit the same wall independently: the live calendar (Month/Week/Day, the popover, Add Show) sits behind an auth wall with no guest/demo route, so neither could authenticate without your explicit go-ahead to submit a signup form — correctly refused to do that unprompted. Assessment A's calendar-specific findings come from a full source read (not live pixel inspection); Assessment B's browser evidence covers only the landing and signup screens (clean, no console errors, no visual bugs) plus the CLI detector scan (which does cover the calendar source directly). If you want the live-browser pass completed, tell me to create a throwaway test account and I'll re-run that half.
