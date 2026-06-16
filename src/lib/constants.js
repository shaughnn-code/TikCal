// ─── TOTEMS ──────────────────────────────────────────────────────────────
export const TOTEMS = [
  { emoji: '🎧', label: 'Earplug' },
  { emoji: '🍬', label: 'Gum Pack' },
  { emoji: '🕶️', label: 'Diffraction' },
  { emoji: '💨', label: 'Vape' },
  { emoji: '🎫', label: 'Wristband' },
  { emoji: '🔑', label: 'Key Fob' },
  { emoji: '👱‍♀️', label: 'Scrunchie' },
  { emoji: '💡', label: 'LED Prop' },
  { emoji: '🪭', label: 'Fan' },
  { emoji: '🔋', label: 'Charger' },
  { emoji: '🧴', label: 'Lip Balm' },
  { emoji: '🧼', label: 'Sanitizer' },
  { emoji: '🛍️', label: 'Stash Bag' },
  { emoji: '💊', label: 'Vitamins' },
  { emoji: '✨', label: 'Glow Stick' },
  { emoji: '📿', label: 'Kandi' },
  { emoji: '📸', label: 'Polaroid' },
]

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
// Each style: a distinctive font + a unique accent color, hashed off the artist.
export const EVENT_STYLES = [
  { font: "'Bebas Neue', sans-serif", color: '#6DAA67', bg: 'rgba(109,170,103,0.18)' },
  { font: "'Orbitron', sans-serif", color: '#6AA8C8', bg: 'rgba(106,168,200,0.18)' },
  { font: "'Space Mono', monospace", color: '#C8AA6A', bg: 'rgba(200,170,106,0.18)' },
  { font: "'Righteous', sans-serif", color: '#C86A8A', bg: 'rgba(200,106,138,0.18)' },
  { font: "'Russo One', sans-serif", color: '#8A6DC8', bg: 'rgba(138,109,200,0.18)' },
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
