// Pure calendar helpers — no React, no I/O (colocated tests in calendarLib.test.js).
import { ymd } from '../../lib/dates.js'

// Events sorted by start time; untimed ('' key) sort first, ties by title.
export function sortEvents(events) {
  return [...events].sort(
    (a, b) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title)
  )
}

// Everything that belongs on one calendar day.
// A task with a due date IS a calendar item — that connection is the point.
export function dayItems({ tasks, events, sessions }, dateYmd) {
  return {
    events: sortEvents(events.filter((e) => e.date === dateYmd)),
    tasks: tasks.filter((t) => t.due === dateYmd),
    sessions: sessions
      .filter((s) => ymd(new Date(s.startedAt)) === dateYmd)
      .slice()
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)),
  }
}

// Local 'HH:MM' for an ISO timestamp (used to sort sessions among timed events).
export function hhmm(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Week-view column stack: events + sessions merged into one time-ordered list.
// Untimed events float to the top ('' sorts before any 'HH:MM').
export function timedStack(events, sessions) {
  return [
    ...sortEvents(events).map((e) => ({ kind: 'event', time: e.start || '', item: e })),
    ...sessions.map((s) => ({ kind: 'session', time: hhmm(s.startedAt), item: s })),
  ].sort((a, b) => a.time.localeCompare(b.time))
}

// "Jul 20 – 26, 2026" | "Jun 29 – Jul 5, 2026" | "Dec 29, 2025 – Jan 4, 2026"
export function weekRangeLabel(days) {
  const a = days[0]
  const b = days[days.length - 1]
  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()
  const left = a.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const right = b.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' }
  )
  return `${left} – ${right}, ${b.getFullYear()}`
}
