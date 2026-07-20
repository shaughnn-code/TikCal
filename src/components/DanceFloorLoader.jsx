import { useEffect, useMemo, useState } from 'react'

// The dance-floor loader: a 7-wide grid of square tiles where multicolored
// lights chase diagonally across the floor (70s disco), then *settle* into a
// real calendar of the current month before handing off to the app.
//
// Timeline (skipped entirely under prefers-reduced-motion, which lands straight
// on the settled calendar):
//   disco   — rainbow wave sweeps the floor
//   settle  — tiles calm to the panel color, weekday labels + day numbers rise,
//             a few "crew nights" keep a lit edge
//   done    — the scene fades and onDone() fires

const COLS = 7
const ROWS = 6
const N = COLS * ROWS
// 70s multicolor floor, drawn from the TikCal palette (+ synth magenta/violet).
const DISCO = ['#4cc9f0', '#6EE7B7', '#ffd36e', '#ff6b2b', '#ff2e7e', '#a78bfa']

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export function DanceFloorLoader({ onDone, discoMs = 2200, label = 'Cueing the floor' }) {
  const reduce = useMemo(prefersReducedMotion, [])
  const [phase, setPhase] = useState(reduce ? 'settle' : 'disco')

  // Real current-month layout so the floor resolves into an honest calendar.
  const { cells, eventIdx } = useMemo(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const arr = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
    while (arr.length < N) arr.push(null)
    // Mark a few weekend "crew nights" as lit events.
    const ev = new Set()
    arr.forEach((d, i) => {
      if (!d) return
      const dow = new Date(now.getFullYear(), now.getMonth(), d).getDay()
      if ((dow === 5 || dow === 6) && Math.random() < 0.5 && ev.size < 5) ev.add(i)
    })
    return { cells: arr.slice(0, N), eventIdx: ev }
  }, [])

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => onDone?.(), 650)
      return () => clearTimeout(t)
    }
    const t1 = setTimeout(() => setPhase('settle'), discoMs)
    const t2 = setTimeout(() => setPhase('done'), discoMs + 1200)
    const t3 = setTimeout(() => onDone?.(), discoMs + 1650)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [reduce, discoMs, onDone])

  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long' }).toUpperCase()

  return (
    <div className={`floor-scene ${phase}`} role="status" aria-live="polite" aria-label="Loading your calendar">
      <div className="floor-glow" aria-hidden="true" />

      <div className="floor-head">
        <span className="logo-3d-sm floor-logo">TikCal</span>
        <span className="floor-month">{monthLabel}</span>
      </div>

      <div className="floor-weekdays" aria-hidden="true">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="floor-grid" aria-hidden="true">
        {cells.map((d, i) => {
          const r = Math.floor(i / COLS)
          const c = i % COLS
          const hue = DISCO[(r + c) % DISCO.length]
          const isEvent = eventIdx.has(i)
          return (
            <div
              key={i}
              className={`floor-tile${isEvent ? ' is-event' : ''}${d ? '' : ' is-blank'}`}
              style={{
                '--tile': hue,
                '--wave': `${(r + c) * -0.11}s`,
              }}
            >
              {d ? <span className="floor-num">{d}</span> : null}
            </div>
          )
        })}
      </div>

      <span className="floor-label">{label}<span className="floor-dots" /></span>
    </div>
  )
}

export default DanceFloorLoader
