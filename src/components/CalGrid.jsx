import { useMemo, useState } from 'react'
import { getEventAccent } from '../lib/constants.js'

// Large, light, high-contrast month grid (sits as a bright panel on the dark app).
export const CalGrid = ({ events, onDayClick, selectedDate }) => {
  const now = new Date()
  const [view, setView] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const yr = view.getFullYear()
  const mo = view.getMonth()

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
    <div className="rounded-2xl bg-[#eef3f7] text-slate-800 p-4 sm:p-5 border border-ice/25 shadow-[0_0_36px_rgba(76,201,240,0.14)]">
      {/* month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setView(new Date(yr, mo - 1, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
        >
          ‹
        </button>
        <span className="font-display font-extrabold text-xl sm:text-2xl uppercase tracking-wide text-slate-900">
          {view.toLocaleString('default', { month: 'long' })} {yr}
        </span>
        <button
          onClick={() => setView(new Date(yr, mo + 1, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
        >
          ›
        </button>
      </div>

      {/* weekday header */}
      <div className="grid grid-cols-7 mb-2">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
          <div key={d} className="text-center font-mono text-[11px] sm:text-xs font-semibold text-slate-500 tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const date = ds(d)
          const evs = byDate[date] || []
          const hasEv = evs.length > 0
          const isSelected = selectedDate === date

          return (
            <button
              key={d}
              onClick={() => hasEv && onDayClick(date)}
              className={`relative flex flex-col items-stretch gap-1 p-1.5 rounded-lg min-h-[72px] sm:min-h-[88px] border text-left transition-all
                ${isSelected ? 'ring-2 ring-ice border-ice bg-ice/10' : isToday(d) ? 'border-ice bg-ice/10' : 'border-slate-200 bg-white hover:bg-slate-50'}
                ${hasEv ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`font-display font-bold text-sm sm:text-base leading-none ${
                  isToday(d) ? 'text-ice' : 'text-slate-700'
                }`}
              >
                {d}
              </span>
              <div className="flex flex-col gap-1 mt-0.5">
                {evs.slice(0, 2).map((ev) => {
                  const s = getEventAccent(ev)
                  return (
                    <div
                      key={ev.id}
                      title={`${ev.artist || ''} — ${ev.title}`}
                      style={{ backgroundColor: `${s.color}26`, borderLeft: `3px solid ${s.color}` }}
                      className="w-full rounded-r px-1.5 py-1 overflow-hidden font-semibold text-[10px] sm:text-[12px] leading-tight text-slate-700 truncate"
                    >
                      {ev.title}
                    </div>
                  )
                })}
                {evs.length > 2 && (
                  <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 pl-1">+{evs.length - 2} more</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
