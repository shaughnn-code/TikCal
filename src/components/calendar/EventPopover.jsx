import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { setRsvp, clearRsvp } from '../../lib/db.js'
import { HudBox, SecLabel } from '../ui.jsx'
import { Icon, Totem } from '../icons.jsx'
import { RSVP_OPTIONS, getEventAccent, getInitials, withAlpha } from '../../lib/constants.js'

// Compact detail card for hovering (desktop, Month/Week) or clicking
// (Month) an event -- crew + "who's in" + an inline RSVP + source link,
// then a link through to the full page for everything else (delete,
// add-to-calendar). Purely presentational except for its own RSVP, which
// it applies optimistically against a local copy of `event.rsvps` --
// letting the fastest glance-and-decide surface actually complete the
// decide step, not just preview it. A parent refetch will reconcile the
// authoritative state next time the popover reopens.
export default function EventPopover({ event, onClose, className = '' }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [rsvps, setRsvps] = useState(event.rsvps || [])
  const [rsvping, setRsvping] = useState(false)
  const s = getEventAccent(event)
  const crews = event.crews || []
  const going = rsvps.filter((r) => r.status === 'in')
  const myStatus = rsvps.find((r) => r.user_id === user?.id)?.status || null

  const answer = async (e, value) => {
    e.stopPropagation()
    if (rsvping) return
    setRsvping(true)
    const clearing = myStatus === value
    const { error } = clearing ? await clearRsvp(event.id, user.id) : await setRsvp(event.id, user.id, value)
    if (!error) {
      setRsvps((prev) => {
        const rest = prev.filter((r) => r.user_id !== user.id)
        return clearing ? rest : [...rest, { user_id: user.id, status: value, profile }]
      })
    }
    setRsvping(false)
  }

  return (
    <HudBox
      hero
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-30 w-64 p-3.5 top-full mt-2 left-0 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold shrink-0 border"
          style={{ color: s.color, backgroundColor: s.bg, borderColor: s.color + '66' }}
        >
          {getInitials(event.artist)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-sm text-[#e8f4f8] truncate">{event.title}</div>
          <div className="font-mono text-[10px] text-slate-400 truncate uppercase">{event.venue}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0" title="Close">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {crews.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {crews.map((c) => (
            <span
              key={c.crew_id}
              className="font-mono text-[9px] rounded px-2 py-0.5 border flex items-center gap-1"
              style={{ color: c.color || '#4cc9f0', borderColor: withAlpha(c.color || '#4cc9f0', 0.4) }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color || '#4cc9f0' }} />
              {(c.name || 'CREW').toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {going.length > 0 && (
        <div className="mt-3">
          <SecLabel className="mb-1.5">{going.length} in</SecLabel>
          <div className="flex flex-wrap gap-1.5">
            {going.map((r) => (
              <span
                key={r.user_id}
                className="font-mono text-[9px] text-slate-200 rounded px-2 py-1 flex items-center gap-1 border border-mint/35 bg-mint/[0.08]"
              >
                {r.profile?.totem && <Totem icon={r.profile.totem} size={12} />}
                {r.profile?.name || 'Someone'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <SecLabel className="mb-1.5">You in?</SecLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {RSVP_OPTIONS.map((o) => {
            const active = myStatus === o.value
            return (
              <button
                key={o.value}
                type="button"
                disabled={rsvping}
                onClick={(e) => answer(e, o.value)}
                title={o.label}
                className={`flex items-center justify-center gap-1 rounded border py-1.5 transition-colors ${rsvping ? 'opacity-60' : ''}`}
                style={
                  active
                    ? { borderColor: o.color, backgroundColor: withAlpha(o.color, 0.14), color: o.color }
                    : { borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }
                }
              >
                <Icon name={o.icon} size={13} />
                <span className="font-mono text-[9px] uppercase tracking-wide">{o.short}</span>
              </button>
            )
          })}
        </div>
      </div>

      {event.source_url && (
        <a
          href={event.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex items-center gap-1 font-mono text-[10px] text-violet hover:text-iris underline underline-offset-2 truncate transition-colors"
        >
          <Icon name="link" size={11} className="shrink-0" /> {event.source_url}
        </a>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`) }}
        className="mt-3 font-mono text-[10px] text-slate-400 hover:text-white transition-colors"
      >
        View full details →
      </button>
    </HudBox>
  )
}
