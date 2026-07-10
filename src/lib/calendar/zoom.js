// Pure date math for the Year/Month/Week zoom calendar. No React, no I/O, so
// the tricky parts (month matrices, week boundaries, period stepping) are
// testable under `node --test`.

export const VIEWS = ['year', 'month', 'week']

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Week view gutter: 6PM → 1AM, matching the design's 8 rows.
export const WEEK_START_HOUR = 18
export const WEEK_ROWS = 8

export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function startOfWeek(d) {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  r.setHours(0, 0, 0, 0)
  return r
}

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

// The month as whole weeks, padded with the adjacent months' days. `out` marks
// the padding so the UI can dim it and refuse to dive into it.
//
// Rows are computed, not fixed at 6: a month like Jul 2026 (3 lead days + 31)
// fills exactly 5 weeks, and a fixed 42-cell grid would render a sixth row
// containing nothing but next month's greyed-out days.
export function monthMatrix(year, month) {
  const lead = new Date(year, month, 1).getDay()
  const cellCount = Math.ceil((lead + daysInMonth(year, month)) / 7) * 7
  const start = new Date(year, month, 1 - lead)
  return Array.from({ length: cellCount }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { date, dateStr: ymd(date), out: date.getMonth() !== month }
  })
}

export function weekDays(focus) {
  const s = startOfWeek(focus)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)
    return { date, dateStr: ymd(date) }
  })
}

// "Jul 5–11" / "Jun 28 – Jul 4" when the week straddles a month boundary.
export function weekRangeLabel(focus) {
  const days = weekDays(focus)
  const a = days[0].date
  const b = days[6].date
  const mA = a.toLocaleDateString('en-US', { month: 'short' })
  const mB = b.toLocaleDateString('en-US', { month: 'short' })
  return mA === mB ? `${mA} ${a.getDate()}–${b.getDate()}` : `${mA} ${a.getDate()} – ${mB} ${b.getDate()}`
}

export function periodLabel(view, focus) {
  if (view === 'year') return String(focus.getFullYear())
  if (view === 'month') return `${focus.toLocaleDateString('en-US', { month: 'short' })} ${focus.getFullYear()}`
  return weekRangeLabel(focus)
}

// Prev/next steps the *current granularity's* period, never the others.
export function stepFocus(view, focus, dir) {
  const d = new Date(focus)
  if (view === 'year') d.setFullYear(d.getFullYear() + dir)
  else if (view === 'month') d.setMonth(d.getMonth() + dir, 1)
  else d.setDate(d.getDate() + 7 * dir)
  return d
}

// Zoom one step along year → month → week. Returns the same view at the ends.
export function zoomView(view, dir) {
  const i = VIEWS.indexOf(view)
  return VIEWS[Math.min(VIEWS.length - 1, Math.max(0, i + dir))]
}

// "10:00 PM" | "22:00" | "22:00:00" -> minutes since midnight. null if absent
// or unparseable, which the week view renders as a "time TBA" chip rather than
// inventing a position.
export function parseTime(t) {
  if (!t) return null
  const s = String(t).trim()
  let m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]?$/)
  if (m) {
    let h = Number(m[1]) % 12
    if (m[3].toLowerCase() === 'p') h += 12
    return h * 60 + Number(m[2])
  }
  m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (m) {
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return null
    return h * 60 + min
  }
  return null
}

// Where a chip sits in the 6PM–1AM gutter, as a fraction 0..1 of the column.
// Events before 6PM clamp to the top; after 1AM (i.e. 0:00–1:59) wrap past
// midnight and read as late-night, which is how a nightlife calendar thinks.
export function slotOffset(minutes) {
  if (minutes == null) return null
  const startMin = WEEK_START_HOUR * 60
  const span = WEEK_ROWS * 60
  let rel = minutes - startMin
  if (rel < 0) rel += 24 * 60 // 00:30 -> 6.5h past 6PM
  if (rel < 0 || rel > span) return null
  return rel / span
}
