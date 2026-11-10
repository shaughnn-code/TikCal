// Pure logic for the phone agenda calendar: one scrolling list of show nights
// under a sticky week/month strip. No React, no DOM, no I/O.
//
// Dates are local 'YYYY-MM-DD' strings throughout (same as events.event_date).
// Never `new Date('YYYY-MM-DD')`: that parses as UTC midnight, which is the
// previous evening anywhere west of Greenwich. Use parseYmd.

import { ymd } from './zoom.js'

export const parseYmd = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Local "today" as YYYY-MM-DD. `toISOString().slice(0, 10)` is UTC, which
// rolls over to tomorrow at 7–8pm in New York, right at showtime.
export const todayYmd = (now = new Date()) => ymd(now)

export const addDays = (s, n) => {
  const d = parseYmd(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}

// Events → [{ dateStr, events }] ascending by date. Events in a night keep
// their input order (fetchVisibleEvents already sorts by event_date).
export function groupNights(events = []) {
  const by = new Map()
  for (const e of events) {
    if (!e?.event_date) continue
    if (!by.has(e.event_date)) by.set(e.event_date, [])
    by.get(e.event_date).push(e)
  }
  return [...by.keys()].sort().map((dateStr) => ({ dateStr, events: by.get(dateStr) }))
}

// Upcoming includes today: tonight's show is not "past" while it's tonight.
export function splitNights(nights, today) {
  const upcoming = []
  const past = []
  for (const n of nights) (n.dateStr >= today ? upcoming : past).push(n)
  return { upcoming, past }
}

// Per-night summary for the strip dots. `accentOf` is getEventAccent (passed
// in so this file stays free of the constants module's color tables).
// colors: unique event accents in order, capped at `max`; mine: the user said
// "I'm in" to at least one show that night (rendered as the mint ring).
export function nightMarks(events = [], userId, accentOf, max = 3) {
  const marks = {}
  for (const e of events) {
    if (!e?.event_date) continue
    const m = (marks[e.event_date] ||= { colors: [], count: 0, mine: false })
    m.count += 1
    const c = accentOf(e)?.color
    if (c && !m.colors.includes(c) && m.colors.length < max) m.colors.push(c)
    if (userId && (e.rsvps || []).some((r) => r.user_id === userId && r.status === 'in')) m.mine = true
  }
  return marks
}

// The nights the list actually renders: every show night, plus today as an
// anchor row even when nothing is on, so "Today" always has somewhere to go.
export function agendaRows(nights, today) {
  if (nights.some((n) => n.dateStr === today)) return nights
  const rows = [...nights, { dateStr: today, events: [] }]
  return rows.sort((a, b) => (a.dateStr < b.dateStr ? -1 : a.dateStr > b.dateStr ? 1 : 0))
}

// Where a tap on `dateStr` should land in a list of row dates (sorted asc):
// the row itself, else the next row after it, else the last row before it.
// null for an empty list.
export function landingDate(rowDates, dateStr) {
  if (!rowDates.length) return null
  for (const d of rowDates) if (d >= dateStr) return d
  return rowDates[rowDates.length - 1]
}

// Scroll-spy. `headers` = [{ dateStr, top }] in list order, `top` measured
// from the viewport top; `line` = bottom edge of the sticky stack (nav +
// strip). The active night is the last header that has reached the line.
// Before the first header reaches it, the first night is active.
// `slack` absorbs sub-pixel rounding right after a programmatic scroll.
export function activeDate(headers, line, slack = 2) {
  if (!headers.length) return null
  let active = headers[0].dateStr
  for (const h of headers) {
    if (h.top <= line + slack) active = h.dateStr
    else break
  }
  return active
}

// Absolute document Y to scroll to so a row's header lands just under the
// sticky stack. `rowTop` is the row's viewport top, `scrollY` the current
// window scroll. Never negative.
export const scrollTargetY = (rowTop, scrollY, stickyOffset) =>
  Math.max(0, Math.round(rowTop + scrollY - stickyOffset))

// The strip's week: Sunday-start, matching the month grid and zoom.js.
export function weekOf(dateStr) {
  const d = parseYmd(dateStr)
  d.setDate(d.getDate() - d.getDay())
  const start = ymd(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// Header label for the strip: "Nov 2026", or "Nov – Dec 2026" when the week
// straddles a month, "Dec 2026 – Jan 2027" when it straddles a year.
export function stripLabel(dates) {
  const a = parseYmd(dates[0])
  const b = parseYmd(dates[dates.length - 1])
  const mon = (d) => d.toLocaleDateString('en-US', { month: 'short' })
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${mon(a)} ${a.getFullYear()}`
  if (a.getFullYear() === b.getFullYear()) return `${mon(a)} – ${mon(b)} ${a.getFullYear()}`
  return `${mon(a)} ${a.getFullYear()} – ${mon(b)} ${b.getFullYear()}`
}

// Step the strip's browsing anchor by one week or one month. Month steps
// land on the 1st so Jan 31 + 1 month doesn't skip February.
export function stepAnchor(dateStr, mode, dir) {
  if (mode === 'week') return addDays(dateStr, 7 * dir)
  const d = parseYmd(dateStr)
  return ymd(new Date(d.getFullYear(), d.getMonth() + dir, 1))
}

// "Tonight" / "Tomorrow" / "Fri, Nov 14" for a night's sticky header.
export function nightLabel(dateStr, today) {
  if (dateStr === today) return 'Tonight'
  if (dateStr === addDays(today, 1)) return 'Tomorrow'
  return parseYmd(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
