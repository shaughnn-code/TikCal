// Pure date-range logic for the Discover date picker (no I/O, no timezone
// surprises: everything is local "YYYY-MM-DD" strings, which compare correctly
// as plain strings). See dateRange.test.js.

const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (iso, n) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Quick ranges. "This weekend" is Fri–Sun, the nightlife weekend: on Fri it
// starts today, on Sat/Sun it covers what is left of it.
export function presets(todayISO) {
  const dow = fromISO(todayISO).getDay() // 0 = Sun … 6 = Sat
  let wkFrom
  let wkUntil
  if (dow === 0) { wkFrom = todayISO; wkUntil = todayISO }
  else if (dow === 6) { wkFrom = todayISO; wkUntil = addDays(todayISO, 1) }
  else { wkFrom = addDays(todayISO, 5 - dow); wkUntil = addDays(wkFrom, 2) }
  return [
    { id: 'today', label: 'Today', from: todayISO, until: todayISO },
    { id: 'tomorrow', label: 'Tomorrow', from: addDays(todayISO, 1), until: addDays(todayISO, 1) },
    { id: 'weekend', label: 'This weekend', from: wkFrom, until: wkUntil },
    { id: 'week', label: 'Next 7 days', from: todayISO, until: addDays(todayISO, 6) },
    { id: 'month', label: 'Next 30 days', from: todayISO, until: addDays(todayISO, 29) },
  ]
}

export const activePreset = (todayISO, from, until) =>
  presets(todayISO).find((p) => p.from === from && p.until === until)?.id || null

// Six Sunday-first weeks covering `month` (0-11) of `year`, as a flat 42-cell
// list of { iso, inMonth }.
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ iso: toISO(d), inMonth: d.getMonth() === month })
  }
  return cells
}

export const shiftMonth = (year, month, delta) => {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

// Click-to-select state machine. First click picks a single day and remembers
// it as the anchor; the second click completes the range (either order).
// Clicking the same day twice leaves a one-day range.
export function selectDay(anchor, iso) {
  if (!anchor) return { from: iso, until: iso, anchor: iso }
  const [from, until] = anchor <= iso ? [anchor, iso] : [iso, anchor]
  return { from, until, anchor: null }
}

// The range to highlight while hovering with an anchor set.
export function previewRange(anchor, hover) {
  if (!anchor || !hover) return null
  return anchor <= hover ? { from: anchor, until: hover } : { from: hover, until: anchor }
}

export const inRange = (iso, from, until) => !!from && !!until && iso >= from && iso <= until

// date → number of events (so the picker can show which days have shows).
export function eventCounts(events) {
  const m = {}
  for (const e of events) if (e.date) m[e.date] = (m[e.date] || 0) + 1
  return m
}

const fmt = (iso, withYear) =>
  fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) })

export function formatRange(from, until, todayISO) {
  if (!from && !until) return 'Any date'
  const a = from || until
  const b = until || from
  const withYear = !!todayISO && (a.slice(0, 4) !== todayISO.slice(0, 4) || b.slice(0, 4) !== todayISO.slice(0, 4))
  return a === b ? fmt(a, withYear) : `${fmt(a, withYear)} – ${fmt(b, withYear)}`
}
