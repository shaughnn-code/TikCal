// ─── TOTEMS ──────────────────────────────────────────────────────────────
// Each: { icon, ph, name, vibe }. `icon` is the id stored on profiles.totem
// (e.g. "noto:pill") and stays stable so existing profiles keep their totem;
// `ph` is the Phosphor icon actually drawn (duotone). No emoji are rendered.
export const TOTEMS = [
  { icon: 'noto:headphone', ph: 'headphones', name: 'Earplugs', vibe: 'Still hears tomorrow. The responsible legend.' },
  { icon: 'noto:pill', ph: 'pill', name: 'The Press', vibe: 'You know the one. Sender of two-day weekends.' },
  { icon: 'noto:candy', ph: 'tooth', name: 'Gum', vibe: 'Jaw’s been working overtime since 1am.' },
  { icon: 'noto:sunglasses', ph: 'sunglasses', name: 'Shades', vibe: 'It’s 7am and the sun is the enemy.' },
  { icon: 'noto:sparkler', ph: 'shooting-star', name: 'Glow Stick', vibe: 'Main character. Visible from space.' },
  { icon: 'noto:cup-with-straw', ph: 'drop', name: 'Hydration', vibe: 'Logs water like it’s a whole personality.' },
  { icon: 'noto:key', ph: 'key', name: 'Lost Keys', vibe: 'Future-you’s problem. Probably fine.' },
  { icon: 'noto:battery', ph: 'battery-empty', name: 'Dead Battery', vibe: 'Off-grid by 2am. Only memories, no photos.' },
  { icon: 'noto:folding-hand-fan', ph: 'fan', name: 'Hand Fan', vibe: 'Dramatic, devastating, staying cool.' },
  { icon: 'noto:money-with-wings', ph: 'money-wavy', name: 'Crumpled Cash', vibe: 'Arrived with $200, leaving with lint.' },
  { icon: 'noto:snowflake', ph: 'snowflake', name: 'Bumps', vibe: 'Talking your ear off in the smoking area.' },
  { icon: 'noto:herb', ph: 'leaf', name: "Devil's Lettuce", vibe: 'Horizontal energy. Vibes only.' },
  { icon: 'noto:mushroom', ph: 'spiral', name: 'Shrooms', vibe: 'The walls are breathing and that’s fine.' },
  { icon: 'noto:cigarette', ph: 'cigarette', name: 'Last Cig', vibe: 'Always bumming, never carrying.' },
  { icon: 'noto:woozy-face', ph: 'smiley-melting', name: 'Woozy', vibe: 'One too many. Sending it regardless.' },
  { icon: 'noto:sweat-droplets', ph: 'fire', name: 'Sweaty', vibe: 'Front row, soaked through, no regrets.' },
  { icon: 'noto:tongue', ph: 'waveform', name: 'Tongue', vibe: 'No thoughts. Just lights and bass.' },
  { icon: 'noto:peach', ph: 'heart', name: 'Peach', vibe: 'Here for the after-after-party.' },
  { icon: 'noto:eggplant', ph: 'crown', name: 'Eggplant', vibe: 'Confidence unmatched. Knows the assignment.' },
  { icon: 'noto:smiling-face-with-horns', ph: 'skull', name: 'Menace', vibe: 'Up to no good and proud of it.' },
]

// Lookup helper: returns the totem object for a stored icon id (or null).
export const totemByIcon = (icon) => TOTEMS.find((t) => t.icon === icon) || null

export const NYC_VENUES = [
  'The Brooklyn Mirage / Avant Gardner',
  'Knockdown Center',
  'Elsewhere',
  'The Brooklyn Monarch',
  'BASEMENT',
  'SILO',
  'Bossa Nova Civic Club',
  'Paragon',
  'House of Yes',
  'Good Room',
  'Public Records',
  'Nowadays',
  'TBA Brooklyn',
  'Nebula',
  'Marquee New York',
  'Mission NYC',
  'Le Bain',
  'Somewhere Nowhere',
  'The Roof at Superior Ingredients',
  'The Delancey Rooftop',
  'Brooklyn Paramount',
  'Terminal 5',
  'Brooklyn Steel',
  'Webster Hall',
  'Under the K Bridge',
  'BK Navy Yard',
  "Old Mate's",
  'Industry City',
  'Fulton Fish Market',
  'MSG',
  'Barclays Center',
  'Forest Hills Stadium',
  'Pier 17',
  'Superior Ingredients',
  'Signal',
  'Refuge',
  '99 Scott',
  'Other',
]

// ─── EVENT VISUAL STYLES ────────────────────────────────────────────────────
// Neon palette, hashed off the artist. Calendar chips render the initials in
// mono with one of these accents.
export const EVENT_STYLES = [
  { color: '#4cc9f0', bg: 'rgba(76,201,240,0.14)' }, // ice
  { color: '#6EE7B7', bg: 'rgba(110,231,183,0.14)' }, // mint
  { color: '#6aa8ff', bg: 'rgba(106,168,255,0.14)' }, // periwinkle
  { color: '#c08bff', bg: 'rgba(192,139,255,0.14)' }, // violet
  { color: '#ffb454', bg: 'rgba(255,180,84,0.14)' }, // amber
]

export const getEventStyle = (artist) => {
  const hash = [...(artist || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0)
  return EVENT_STYLES[hash % EVENT_STYLES.length]
}

// ─── CREW COLORS ────────────────────────────────────────────────────────────
// Neon accents a crew owner can pick. Events shared into a crew borrow its
// color on cards + the calendar, so you can read at a glance who you're out
// with. Stored on crews.color as the hex string.
export const CREW_COLORS = [
  { name: 'Ice', hex: '#4cc9f0' },
  { name: 'Mint', hex: '#6EE7B7' },
  { name: 'Periwinkle', hex: '#6aa8ff' },
  { name: 'Violet', hex: '#c08bff' },
  { name: 'Amber', hex: '#ffb454' },
  { name: 'Hot Pink', hex: '#ff6ec7' },
  { name: 'Lime', hex: '#a3e635' },
  { name: 'Coral', hex: '#ff7a6b' },
  { name: 'Teal', hex: '#2dd4bf' },
  { name: 'Gold', hex: '#ffd94c' },
]

export const DEFAULT_CREW_COLOR = CREW_COLORS[0].hex

// Translucent fill matching a solid crew hex (for chip backgrounds).
export const withAlpha = (hex, alpha = 0.14) => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `${hex}${a}`
}

// Accent for an event: a shared crew's color wins over the artist-hash color,
// so crew events read as "that group." Returns { color, bg }.
export const getEventAccent = (event) => {
  const crewHex = event?.crews?.map((c) => c.color).find(Boolean)
  if (crewHex) return { color: crewHex, bg: withAlpha(crewHex) }
  return getEventStyle(event?.artist)
}

// ─── RSVP ───────────────────────────────────────────────────────────────────
// The three ways to answer "you in?" — value stored on event_rsvps.status.
export const RSVP_OPTIONS = [
  { value: 'in', label: "I'm in", short: 'IN', color: '#6EE7B7', icon: 'check-circle' },
  { value: 'maybe', label: 'Maybe', short: 'MAYBE', color: '#ffb454', icon: 'question' },
  { value: 'out', label: "I'm out", short: 'OUT', color: '#ff7a6b', icon: 'x-circle' },
]

export const rsvpByValue = (v) => RSVP_OPTIONS.find((o) => o.value === v) || null

export const getInitials = (artist) => {
  if (!artist || !artist.trim()) return '?'
  const words = artist.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
