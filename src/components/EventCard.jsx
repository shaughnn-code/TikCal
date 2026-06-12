import { useNavigate } from 'react-router-dom'

// Renders one event row. `event` uses DB fields: event_date, owner_id, etc.
export const EventCard = ({ event, ownerLabel }) => {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const isPast = event.event_date < today

  const fmt = (ds) =>
    new Date(ds + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

  const countdown = (() => {
    const diff = Math.ceil((new Date(event.event_date + 'T12:00:00') - new Date()) / 86400000)
    if (diff < 0) return null
    if (diff === 0) return 'tonight'
    if (diff === 1) return 'tomorrow'
    return `${diff}d`
  })()

  return (
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className={`w-full text-left border rounded-2xl p-4 transition-all ${
        isPast ? 'border-white/[0.04] opacity-50' : 'border-white/[0.08] hover:border-white/[0.15]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-white text-sm truncate">{event.title}</span>
            {countdown && !isPast && (
              <span className="shrink-0 text-[10px] text-accent border border-accent/25 rounded-full px-2 py-0.5">
                {countdown}
              </span>
            )}
          </div>
          {event.artist && <p className="text-gray-500 text-xs mb-2">{event.artist}</p>}
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            <span>{fmt(event.event_date)}</span>
            {event.venue && (
              <>
                <span className="text-gray-800">·</span>
                <span>{event.venue}</span>
              </>
            )}
            {ownerLabel && (
              <>
                <span className="text-gray-800">·</span>
                <span className="text-accent/70">{ownerLabel}</span>
              </>
            )}
          </div>
          {event.notes && <p className="text-gray-600 text-[11px] mt-2 italic">{event.notes}</p>}
        </div>
      </div>
    </button>
  )
}
