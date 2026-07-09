// Pure availability math for Overlap. No imports, no I/O — so it runs under
// `node --test` (see compute.test.js). This is the one piece of logic the spec
// (§10) calls out for real test coverage.

// Bucket key format shared with the DB: "YYYY-MM-DD:daypart", e.g. "2026-07-18:night".
export const bucketKey = (dateStr, daypart) => `${dateStr}:${daypart}`

// Local YYYY-MM-DD for a Date (avoids UTC off-by-one from toISOString).
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// The dates inside a session's range whose weekday is selected.
// `session` needs { range_start, range_end, days_of_week }.
export function inCriteriaDates(session) {
  const out = []
  if (!session?.range_start || !session?.range_end) return out
  const dow = new Set(session.days_of_week || [])
  const start = new Date(session.range_start + 'T12:00:00')
  const end = new Date(session.range_end + 'T12:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (dow.has(d.getDay())) out.push({ dateStr: ymd(d), dow: d.getDay() })
  }
  return out
}

// Every in-criteria (date × selected daypart) bucket, in render order.
export function buckets(session) {
  const dayparts = session?.dayparts || []
  const out = []
  for (const { dateStr, dow } of inCriteriaDates(session)) {
    for (const dp of dayparts) out.push({ key: bucketKey(dateStr, dp), dateStr, daypart: dp, dow })
  }
  return out
}

// Core intersection. Returns Map<bucketKey, cell> where cell is:
//   { state, freeIds, busyIds, unknownIds, freeCount, total, sharedEventId, sharedIds }
//
// state resolution (highest priority first):
//   shared_event — 2+ participants hold the SAME TikCal event in this bucket
//   all_free     — every participant is free
//   partial      — 2+ free but not all
//   blocked      — someone is busy and fewer than 2 are free
//   unknown      — otherwise (nobody busy, <2 free; answers still missing)
//
// A participant supplies:
//   availability: { bucketKey: "free" | "busy" }   (unset = unknown)
//   events?:      { bucketKey: eventId }            (optional, for shared_event)
export function computeOverlap(participants, session) {
  const map = new Map()
  const list = participants || []
  const total = list.length

  for (const { key } of buckets(session)) {
    const freeIds = []
    const busyIds = []
    const unknownIds = []
    const eventHolders = new Map() // eventId -> [participantId]

    for (const p of list) {
      const status = p.availability?.[key]
      if (status === 'free') freeIds.push(p.id)
      else if (status === 'busy') busyIds.push(p.id)
      else unknownIds.push(p.id)

      const ev = p.events?.[key]
      if (ev) eventHolders.set(ev, [...(eventHolders.get(ev) || []), p.id])
    }

    // The most-attended event wins when a bucket holds several, so the cell
    // surfaces the one the group is actually converging on.
    let sharedEventId = null
    let sharedIds = []
    for (const [ev, ids] of eventHolders) {
      if (ids.length >= 2 && ids.length > sharedIds.length) {
        sharedEventId = ev
        sharedIds = ids
      }
    }

    const freeCount = freeIds.length
    let state
    if (sharedEventId) state = 'shared_event'
    else if (total > 0 && freeCount === total) state = 'all_free'
    else if (freeCount >= 2) state = 'partial'
    else if (busyIds.length > 0) state = 'blocked'
    else state = 'unknown'

    map.set(key, { state, freeIds, busyIds, unknownIds, freeCount, total, sharedEventId, sharedIds })
  }
  return map
}

// Rank windows for the "Best windows" list (design notes §4):
// shared_event first, then all_free (sooner-weighted), then strongest partials.
export function bestWindows(overlap, session) {
  const rank = { shared_event: 0, all_free: 1, partial: 2 }
  const rows = []
  for (const b of buckets(session)) {
    const cell = overlap.get(b.key)
    if (!cell || !(cell.state in rank)) continue
    rows.push({ ...b, ...cell })
  }
  rows.sort((a, b) => {
    if (rank[a.state] !== rank[b.state]) return rank[a.state] - rank[b.state]
    if (a.freeCount !== b.freeCount) return b.freeCount - a.freeCount // more free first
    return a.dateStr < b.dateStr ? -1 : a.dateStr > b.dateStr ? 1 : 0 // sooner first
  })
  return rows
}
