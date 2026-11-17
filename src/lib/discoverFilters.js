// Pure filter logic for the Discover page (no I/O, see discoverFilters.test.js).

// ---- Venues ---------------------------------------------------------------
// The three sources spell the same room differently ("Brooklyn Mirage",
// "The Brooklyn Mirage", "BROOKLYN MIRAGE "), so venues are compared by a
// normalized key and shown under their most common spelling.

export const venueKey = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '')

// [{ key, label, count }] sorted by label. Only venues present in `events`.
export function buildVenueOptions(events) {
  const groups = new Map()
  for (const e of events) {
    const raw = (e.venue || '').trim()
    const key = venueKey(raw)
    if (!key) continue
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { key, count: 0, spellings: new Map() }))
    g.count += 1
    g.spellings.set(raw, (g.spellings.get(raw) || 0) + 1)
  }
  return [...groups.values()]
    .map((g) => ({
      key: g.key,
      count: g.count,
      label: [...g.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0],
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// ---- Subgenre -------------------------------------------------------------
// Keyword tagging from what the sources give us (genre/tags, title, artists).
// It only knows what the text says, so events whose subgenre is implied by an
// artist's name stay in the generic 'electronic' bucket. First rule wins, so
// more specific rules come first ("tech house" before "house").

export const SUBGENRES = [
  { value: 'house', label: 'House' },
  { value: 'tech-house', label: 'Tech house' },
  { value: 'techno', label: 'Techno' },
  { value: 'trance', label: 'Trance' },
  { value: 'melodic', label: 'Melodic & progressive' },
  { value: 'dnb', label: 'Drum & bass' },
  { value: 'bass', label: 'Dubstep & bass' },
  { value: 'hard', label: 'Hard dance' },
  { value: 'electronic', label: 'Electronic (other)' },
]

const RULES = [
  ['tech-house', /tech[\s-]?house/],
  ['melodic', /melodic|progressive|organic house/],
  ['dnb', /drum\s*(?:&|and|n|')\s*bass|\bd\s?n\s?b\b|\bd&b\b|jungle|liquid funk/],
  ['bass', /dubstep|riddim|brostep|\bbass\b/],
  ['hard', /hardstyle|hardcore|gabber|hard dance|frenchcore|rawstyle/],
  ['trance', /trance|goa/],
  ['techno', /techno|industrial/],
  ['house', /\bhouse\b|garage|afro\s?house|amapiano/],
]
const ELECTRONIC_GENRE = /dance|electronic|\bedm\b|\bdj\b|club/

// Keyword-only guess (no Jev). null = doesn't look electronic at all.
export function heuristicSubgenre(e) {
  const text = [e.genre, e.title, e.artist].filter(Boolean).join(' ').toLowerCase()
  for (const [value, re] of RULES) if (re.test(text)) return value
  if (ELECTRONIC_GENRE.test(text) || e.source === 'ra') return 'electronic'
  return null
}

// Final subgenre. When the keywords can only say "electronic", a Jev tag
// (e.jevSubgenre, set by Discover from the tag-subgenres function) decides:
// a specific subgenre, 'electronic', or null for "not an EDM event".
export function subgenreOf(e) {
  const h = heuristicSubgenre(e)
  if (h === 'electronic' && 'jevSubgenre' in e) return e.jevSubgenre
  return h
}

// Events worth sending to Jev: electronic, but no subgenre from keywords.
export const needsJevTag = (e) => heuristicSubgenre(e) === 'electronic' && !('jevSubgenre' in e)

// Subgenres actually present in `events`, in SUBGENRES order, with counts.
export function buildSubgenreOptions(events) {
  const counts = new Map()
  for (const e of events) {
    const s = subgenreOf(e)
    if (s) counts.set(s, (counts.get(s) || 0) + 1)
  }
  return SUBGENRES.filter((s) => counts.has(s.value)).map((s) => ({ ...s, count: counts.get(s.value) }))
}

// ---- Filtering ------------------------------------------------------------

export function filterEvents(events, f) {
  const venue = f.venue ? venueKey(f.venue) : ''
  return events.filter((e) => {
    if (f.source && f.source !== 'all' && e.source !== f.source) return false
    if (venue && venueKey(e.venue) !== venue) return false
    if (f.subgenre && subgenreOf(e) !== f.subgenre) return false
    if (f.dateFrom && e.date < f.dateFrom) return false
    if (f.dateUntil && e.date > f.dateUntil) return false
    return true
  })
}
