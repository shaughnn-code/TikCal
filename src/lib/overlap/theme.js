// Single source of truth for Overlap's name + visual tokens.
// See docs/tikcal-overlap-design.md. Rename the feature by editing FEATURE_NAME.

export const FEATURE_NAME = 'Overlap'

// Semantic state colors. Orange is the only warm accent in TikCal's cool
// ice/mint UI, so "free" pops as the opportunity/GO state (design notes §2).
export const FREE_COLOR = '#ff6b2b' // all_free / partial base
export const SHARED_COLOR = '#6EE7B7' // shared_event ring + glow (mint)

// Assigned to participants on join, in order. Mirrors join_session()'s palette
// and EVENT_STYLES so the whole app stays harmonized.
export const PARTICIPANT_COLORS = ['#4cc9f0', '#6EE7B7', '#6aa8ff', '#c08bff']

// Clock windows are [startHour, endHour). Night runs to 24:00.
export const DAYPARTS = [
  { key: 'morning', label: 'AM', sub: '6a–12p', window: [6, 12] },
  { key: 'midday', label: 'MID', sub: '12–5p', window: [12, 17] },
  { key: 'night', label: 'PM', sub: '5p–12a', window: [17, 24] },
]

export const daypartMeta = (key) => DAYPARTS.find((d) => d.key === key) || null

// 0=Sun..6=Sat, to match Date.getDay() and the DB days_of_week column.
export const DOW = [
  { i: 0, label: 'S' },
  { i: 1, label: 'M' },
  { i: 2, label: 'T' },
  { i: 3, label: 'W' },
  { i: 4, label: 'T' },
  { i: 5, label: 'F' },
  { i: 6, label: 'S' },
]

export const DOW_PRESETS = {
  Weekends: [0, 5, 6], // Fri–Sun for a nightlife app
  Weekdays: [1, 2, 3, 4],
  'All week': [0, 1, 2, 3, 4, 5, 6],
}
