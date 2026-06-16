// ─── TOTEMS ──────────────────────────────────────────────────────────────
// Each: { icon: Iconify Noto (full-color), name, vibe (hover blurb) }.
// Stored on profiles.totem as the icon id (e.g. "noto:pill").
export const TOTEMS = [
  { icon: 'noto:headphone', name: 'Earplugs', vibe: 'Still hears tomorrow. The responsible legend.' },
  { icon: 'noto:pill', name: 'The Press', vibe: 'You know the one. Sender of two-day weekends.' },
  { icon: 'noto:candy', name: 'Gum', vibe: 'Jaw’s been working overtime since 1am.' },
  { icon: 'noto:sunglasses', name: 'Shades', vibe: 'It’s 7am and the sun is the enemy.' },
  { icon: 'noto:sparkler', name: 'Glow Stick', vibe: 'Main character. Visible from space.' },
  { icon: 'noto:cup-with-straw', name: 'Hydration', vibe: 'Logs water like it’s a whole personality.' },
  { icon: 'noto:key', name: 'Lost Keys', vibe: 'Future-you’s problem. Probably fine.' },
  { icon: 'noto:battery', name: 'Dead Battery', vibe: 'Off-grid by 2am. Only memories, no photos.' },
  { icon: 'noto:folding-hand-fan', name: 'Hand Fan', vibe: 'Dramatic, devastating, staying cool.' },
  { icon: 'noto:money-with-wings', name: 'Crumpled Cash', vibe: 'Arrived with $200, leaving with lint.' },
  { icon: 'noto:snowflake', name: 'Bumps', vibe: 'Talking your ear off in the smoking area.' },
  { icon: 'noto:herb', name: "Devil's Lettuce", vibe: 'Horizontal energy. Vibes only.' },
  { icon: 'noto:mushroom', name: 'Shrooms', vibe: 'The walls are breathing and that’s fine.' },
  { icon: 'noto:cigarette', name: 'Last Cig', vibe: 'Always bumming, never carrying.' },
  { icon: 'noto:woozy-face', name: 'Woozy', vibe: 'One too many. Sending it regardless.' },
  { icon: 'noto:sweat-droplets', name: 'Sweaty', vibe: 'Front row, soaked through, no regrets.' },
  { icon: 'noto:tongue', name: 'Tongue', vibe: 'No thoughts. Just lights and bass.' },
  { icon: 'noto:peach', name: 'Peach', vibe: 'Here for the after-after-party.' },
  { icon: 'noto:eggplant', name: 'Eggplant', vibe: 'Confidence unmatched. Knows the assignment.' },
  { icon: 'noto:smiling-face-with-horns', name: 'Menace', vibe: 'Up to no good and proud of it.' },
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

export const getInitials = (artist) => {
  if (!artist || !artist.trim()) return '?'
  const words = artist.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
