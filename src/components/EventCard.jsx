import { useNavigate } from 'react-router-dom'
import { getEventStyle, getInitials } from '../lib/constants.js'
import { Icon } from './icons.jsx'

// One event row, HUD-styled. `event` uses DB fields (event_date, owner_id…).
export const EventCard = ({ event, ownerLabel }) => {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const isPast = event.event_date < today
  const s = getEventStyle(event.artist)

  const fmt = new Date(event.event_date + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()
    .replace(' ', ' ')

  const countdown = (() => {
    const diff = Math.ceil((new Date(event.event_date + 'T12:00:00') - new Date()) / 86400000)
    if (diff < 0) return null
    if (diff === 0) return 'TONIGHT'
    if (diff === 1) return 'T-1D'
    return `T-${diff}D`
  })()

  return (
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className={`hud relative w-full text-left rounded border p-3.5 transition-all ${
        isPast ? 'border-white/[0.06] opacity-50' : 'border-ice/20 hover:border-ice/40 bg-white/[0.02]'
      }`}
      style={{ '--hud-color': isPast ? '#334155' : s.color }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="w-11 h-11 rounded flex items-center justify-center font-mono text-[13px] font-bold shrink-0 border"
          style={{ color: s.color, backgroundColor: s.bg, borderColor: s.color + '66' }}
        >
          {getInitials(event.artist)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-[#e8f4f8] truncate">{event.title}</div>
          <div className="font-mono text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
            <span>{fmt}</span>
            {event.venue && (
              <>
                <span className="text-slate-700">·</span>
                <span className="uppercase">{event.venue}</span>
              </>
            )}
            {ownerLabel && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-ice/80 normal-case flex items-center gap-0.5">
                  <Icon name="users-three" size={12} /> {ownerLabel}
                </span>
              </>
            )}
          </div>
        </div>
        {countdown && !isPast && (
          <span className="font-mono text-[12px] font-semibold shrink-0" style={{ color: s.color }}>
            {countdown}
          </span>
        )}
      </div>
    </button>
  )
}
