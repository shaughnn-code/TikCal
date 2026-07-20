import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getEventAccent, getInitials, rsvpByValue } from '../lib/constants.js'
import { Icon } from './icons.jsx'

// One event row, HUD-styled. `event` uses DB fields (event_date, owner_id…) and
// may carry hydrated `crews` (with color) + `rsvps` from fetchVisibleEvents.
export const EventCard = ({ event, ownerLabel }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const isPast = event.event_date < today
  const s = getEventAccent(event)

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

  const crews = event.crews || []
  const inCount = (event.rsvps || []).filter((r) => r.status === 'in').length
  const mine = rsvpByValue((event.rsvps || []).find((r) => r.user_id === user?.id)?.status)

  return (
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className={`group relative w-full text-left rounded-2xl border p-3.5 pl-4 overflow-hidden backdrop-blur-sm transition-all duration-200 ${
        isPast
          ? 'border-white/[0.06] bg-panel/40 opacity-50'
          : 'border-white/[0.07] bg-panel/70 hover:border-white/15 hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_-16px_rgba(0,0,0,0.8)]'
      }`}
    >
      {/* colored spine — carries the event's crew/artist hue (data) */}
      <span
        className="absolute inset-y-0 left-0 w-[3px] rounded-full"
        style={{ backgroundColor: isPast ? '#334155' : s.color, boxShadow: isPast ? 'none' : `0 0 10px ${s.color}66` }}
      />
      <div className="flex items-center gap-3.5">
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center font-mono text-[13px] font-bold shrink-0 border"
          style={{ color: s.color, backgroundColor: s.bg, borderColor: s.color + '66' }}
        >
          {getInitials(event.artist)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base text-[#e8f4f8] truncate flex items-center gap-2">
            <span className="truncate">{event.title}</span>
            {crews.length > 0 && (
              <span className="flex items-center gap-1 shrink-0">
                {crews.slice(0, 3).map((c) => (
                  <span
                    key={c.crew_id}
                    title={c.name || 'Crew'}
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color || '#4cc9f0', boxShadow: `0 0 6px ${c.color || '#4cc9f0'}` }}
                  />
                ))}
              </span>
            )}
          </div>
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
                <span className="text-violet/80 normal-case flex items-center gap-0.5">
                  <Icon name="users-three" size={12} /> {ownerLabel}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {countdown && !isPast && (
            <span className="font-mono text-[12px] font-semibold" style={{ color: s.color }}>
              {countdown}
            </span>
          )}
          {inCount > 0 && (
            <span className="font-mono text-[10px] text-mint flex items-center gap-0.5">
              <Icon name="check-circle" size={11} /> {inCount} in
            </span>
          )}
          {mine && (
            <span className="font-mono text-[9px]" style={{ color: mine.color }}>
              {mine.short}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
