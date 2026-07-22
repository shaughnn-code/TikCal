// Pure date helpers. All "ymd" strings are local-time YYYY-MM-DD.

export function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayYmd() {
  return ymd(new Date())
}

export function addDays(d, n) {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

export function sameYmd(a, b) {
  return ymd(a) === ymd(b)
}

// Monday-start week.
export function startOfWeek(d) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const shift = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - shift)
  return out
}

// 42 local-midnight Dates (6 weeks) covering the given month, Monday-start.
export function monthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function weekDays(d) {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function fmtTime(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Seconds -> "45s" | "25m" | "1h 05m"
export function fmtDur(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
}

// ms -> "MM:SS" countdown display
export function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// True if a ymd due date is before today (local).
export function isOverdue(due, today = todayYmd()) {
  return !!due && due < today
}
