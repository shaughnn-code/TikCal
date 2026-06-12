import { useMemo, useState } from 'react'
import { getEventStyle, getInitials } from '../lib/constants.js'

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
  const isToday = (d) =>
    now.getFullYear() === yr && now.getMonth() === mo && now.getDate() === d

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setView(new Date(yr, mo - 1, 1))}
          className="text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
        >
          ‹
        </button>
        <span className="text-white text-sm font-medium">
          {view.toLocaleString('default', { month: 'long' })} {yr}
        </span>
        <button
          onClick={() => setView(new Date(yr, mo + 1, 1))}
          className="text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[9px] text-gray-700 uppercase tracking-widest py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
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
              className={`relative flex flex-col items-center pt-1.5 pb-1 px-0.5 gap-0.5 rounded-xl transition-all min-h-[52px]
                ${isToday(d) ? 'ring-1 ring-accent/40' : ''}
                ${isSelected ? 'bg-accent/10' : hasEv ? 'hover:bg-white/[0.04]' : ''}
                ${hasEv ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`text-[11px] leading-none ${
                  isToday(d) ? 'text-accent font-semibold' : 'text-gray-500'
                }`}
              >
                {d}
              </span>
              {evs.slice(0, 2).map((ev) => {
                const s = getEventStyle(ev.artist)
                return (
                  <div
                    key={ev.id}
                    title={`${ev.artist || ''} — ${ev.title}`}
                    style={{
                      fontFamily: s.font,
                      color: s.color,
                      backgroundColor: s.bg,
                      borderColor: s.color,
                      fontSize: '8px',
                      lineHeight: 1,
                      letterSpacing: '0.03em',
                    }}
                    className="w-full border rounded text-center px-0.5 py-[3px] overflow-hidden font-bold"
                  >
                    {getInitials(ev.artist)}
                  </div>
                )
              })}
              {evs.length > 2 && (
                <span className="text-[7px] text-gray-600 leading-none">+{evs.length - 2}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
