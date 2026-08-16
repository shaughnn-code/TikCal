// Picks the most likely Ticketmaster candidate for a manually-entered show:
// same date, then a loose title/artist match. Pure -- no fetch here; the
// caller fetches by keyword and hands the results in. Used only to suggest
// a start_time when the user left the field blank -- never applied
// silently, always shown as a dismissible chip.
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function pickTimeSuggestion(candidates, { title, artist, date }) {
  const sameDay = (candidates || []).filter((c) => c.date === date && c.time)
  if (!sameDay.length) return null

  const targets = [norm(artist), norm(title)].filter(Boolean)
  if (!targets.length) return sameDay[0]

  const hay = (c) => norm(`${c.artist || ''} ${c.title || ''}`)
  const matched = sameDay.find((c) => targets.some((t) => hay(c).includes(t)))
  return matched || sameDay[0]
}
