import { useEffect, useMemo, useRef, useState } from 'react'
import { getEventAccent } from '../lib/constants.js'

export const CalGrid = ({ events, onDayClick, selectedDate }) => {
  const now = new Date()
  const [view, setView] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [hoveredDate, setHoveredDate] = useState(null)
  const containerRef = useRef(null)
  const scrollAccum = useRef(0)
  const scrollLocked = useRef(false)
  const scrollDecayTimer = useRef(null)

  const yr = view.getFullYear()
  const mo = view.getMonth()

  // Scroll to switch months with resistance: accumulate delta until threshold
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      if (scrollLocked.current) return

      scrollAccum.current += e.deltaY

      // Decay: if user pauses scrolling, bleed off accumulator so they
      // have to commit intentionally to the switch
      clearTimeout(scrollDecayTimer.current)
      scrollDecayTimer.current = setTimeout(() => {
        scrollAccum.current = 0
      }, 300)

      const THRESHOLD = 320
      if (scrollAccum.current > THRESHOLD) {
        scrollLocked.current = true
        scrollAccum.current = 0
        setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))
        setTimeout(() => { scrollLocked.current = false }, 700)
      } else if (scrollAccum.current < -THRESHOLD) {
        scrollLocked.current = true
        scrollAccum.current = 0
        setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))
        setTimeout(() => { scrollLocked.current = false }, 700)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const byDate = useMemo(() => {
    const m = {}
    events.forEach((e) => {
      ;(m[e.event_date] = m[e.event_date] || []).push(e)
    })
    return m
  }, [events])

  const firstDay = new Date(yr, mo, 1).getDay()
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]

  const ds = (d) => `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const isToday = (d) => now.getFullYear() === yr && now.getMonth() === mo && now.getDate() === d

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl p-4 sm:p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.008) 60%, transparent 100%)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.1), 0 1px 0 rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(255,107,43,0.05)',
      }}
    >
      {/* Overhead spotlight wash */}
      <div
        className="absolute inset-x-0 top-0 h-32 rounded-t-2xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,255,255,0.07), transparent)' }}
      />

      {/* month nav */}
      <div className="relative flex items-center justify-between mb-5">
        <button
          onClick={() => setView(new Date(yr, mo - 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-2xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          ‹
        </button>
        <span className="font-heading font-bold text-xl sm:text-2xl uppercase tracking-wide text-white/95">
          {view.toLocaleString('default', { month: 'long' })} {yr}
        </span>
        <button
          onClick={() => setView(new Date(yr, mo + 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-2xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          ›
        </button>
      </div>

      {/* weekday labels */}
      <div className="relative grid grid-cols-7 mb-2">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
          <div key={d} className="text-center font-mono text-[10px] font-medium text-white/30 tracking-widest py-1">
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="relative grid grid-cols-7 gap-2 sm:gap-3">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const date = ds(d)
          const evs = byDate[date] || []
          const hasEv = evs.length > 0
          const today = isToday(d)
          const isSelected = selectedDate === date
          const dow = new Date(yr, mo, d).getDay()
          const weekend = dow === 0 || dow === 6
          const isHovered = hoveredDate === date

          return (
            <button
              key={d}
              onClick={() => hasEv && onDayClick(date)}
              onMouseEnter={() => hasEv && setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`relative flex flex-col items-stretch p-2 rounded-xl text-left transition-all duration-200 ease-out
                ${isHovered ? 'min-h-[180px] sm:min-h-[220px] z-10' : 'min-h-[108px] sm:min-h-[130px]'}
                ${isSelected ? 'outline outline-1 outline-orange/50' : ''}
                ${hasEv ? 'cursor-pointer' : 'cursor-default'}`}
              style={{
                background: isHovered
                  ? 'linear-gradient(170deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
                  : weekend
                    ? 'linear-gradient(170deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)'
                    : 'linear-gradient(170deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%)',
                boxShadow: today
                  ? '0 0 0 1px rgba(255,107,43,0.55), 0 0 22px rgba(255,107,43,0.22), 0 0 50px rgba(255,107,43,0.08), inset 0 1px 0 rgba(255,255,255,0.12)'
                  : isHovered
                    ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.4)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* top rim highlight */}
              <div
                className="absolute inset-x-0 top-0 h-px rounded-t-xl pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.18) 60%, transparent 100%)' }}
              />

              <span className={`font-mono text-[11px] sm:text-xs leading-none mb-2 ${today ? 'text-orange font-bold' : 'text-white/30'}`}>
                {d}
              </span>

              <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                {(isHovered ? evs : evs.slice(0, 2)).map((ev) => {
                  // Crew color when the event has one, else an artist-derived hue.
                  const s = getEventAccent(ev)
                  return (
                    <div
                      key={ev.id}
                      title={`${ev.artist || ''} — ${ev.title}`}
                      className="w-full rounded-r-sm px-1.5 py-1 text-[10px] sm:text-[11px] leading-tight"
                      style={{
                        borderLeft: `2px solid ${s.color}`,
                        background: `linear-gradient(90deg, ${s.color}1a, rgba(255,255,255,0.03))`,
                      }}
                    >
                      {isHovered ? (
                        <>
                          <div className="text-white/85 font-medium">{ev.title}</div>
                          {ev.artist && (
                            <div className="text-white/40 text-[9px] mt-0.5 truncate">{ev.artist}</div>
                          )}
                          {ev.venue && (
                            <div className="text-white/30 text-[9px] truncate">{ev.venue}</div>
                          )}
                          {ev.notes && (
                            <div className="text-white/45 text-[9px] mt-0.5 line-clamp-2">{ev.notes}</div>
                          )}
                        </>
                      ) : (
                        <div className="text-white/75 truncate">{ev.title}</div>
                      )}
                    </div>
                  )
                })}
                {!isHovered && evs.length > 2 && (
                  <span className="font-mono text-[9px] sm:text-[10px] text-white/25 pl-1 mt-auto">
                    +{evs.length - 2} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
