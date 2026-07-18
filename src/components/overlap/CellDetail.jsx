import { useEffect, useState } from 'react'
import { HudBox } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { daypartMeta } from '../../lib/overlap/theme.js'
import { fetchWindowRecs } from '../../lib/overlap/recs.js'
import { downloadICS } from '../../lib/calendar.js'

// Bottom sheet opened by tapping a cell/window: per-participant status in their
// assigned color, then event recommendations (spec §6) for open windows — two
// sources ranked against the group's Spotify taste: a "For you" Ticketmaster
// catalog + the crew's own saved shows on that night.
export default function CellDetail({ bucket, session, participants, onClose }) {
  const cell = bucket?.cell || {}
  const showRecs = ['all_free', 'partial', 'shared_event'].includes(cell.state)
  const sessionId = session?.id
  const dateStr = bucket?.dateStr

  const [recs, setRecs] = useState(null) // null = loading, else { configured, forYou, saved }

  useEffect(() => {
    if (!bucket || !showRecs || !sessionId || !dateStr) return
    let alive = true
    setRecs(null)
    fetchWindowRecs(sessionId, dateStr).then((r) => { if (alive) setRecs(r) })
    return () => { alive = false }
  }, [bucket, showRecs, sessionId, dateStr])

  if (!bucket) return null

  const dt = new Date(dateStr + 'T12:00:00')
  const freeSet = new Set(cell.freeIds || [])
  const busySet = new Set(cell.busyIds || [])
  // Attendees of a shared event read as "going", not "busy" — they're busy here
  // because they're already out together.
  const goingSet = new Set(cell.sharedIds || [])

  const statusOf = (p) =>
    goingSet.has(p.id) ? 'going' : freeSet.has(p.id) ? 'free' : busySet.has(p.id) ? 'busy' : 'unknown'
  const statusStyle = {
    going: { color: '#6EE7B7', label: 'GOING' },
    free: { color: '#ff6b2b', label: 'FREE' },
    busy: { color: '#64748b', label: 'BUSY' },
    unknown: { color: '#475569', label: '—' },
  }

  const fmtTime = (t) => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    const ap = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return `${hr}${m ? ':' + String(m).padStart(2, '0') : ''} ${ap}`
  }

  // Map a rec card onto the shape downloadICS expects (date-only, all-day).
  const addToCalendar = (e) =>
    downloadICS({
      id: e.id,
      title: e.title,
      artist: e.artist || (e.attractions || []).join(', '),
      event_date: e.date,
      venue: e.venue,
      notes: e.url ? `Tickets: ${e.url}` : '',
    })

  const RecCard = ({ e }) => (
    <HudBox tone={e.matched ? 'mint' : 'ice'} className="p-3 flex items-center gap-3">
      {e.image ? (
        <img src={e.image} alt="" className="w-12 h-12 rounded object-cover shrink-0 border border-white/10" />
      ) : (
        <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center shrink-0">
          <Icon name="music-notes" size={18} className="text-slate-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {e.matched && (
          <div className="font-mono text-[9px] text-mint uppercase tracking-wide mb-0.5 flex items-center gap-1 truncate">
            <Icon name="heart" size={10} className="shrink-0" />
            {e.matchedWho?.length ? `Matches ${e.matchedWho[0]}` : e.matched}
          </div>
        )}
        {e.source === 'saved' && e.savedBy?.length > 0 && (
          <div className="font-mono text-[9px] text-ice uppercase tracking-wide mb-0.5 flex items-center gap-1 truncate">
            <Icon name="bookmark-simple" size={10} className="shrink-0" />
            Saved by {e.savedBy.join(', ')}
          </div>
        )}
        <div className="font-display font-bold text-sm text-[#e8f4f8] truncate">{e.title}</div>
        <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
          {fmtTime(e.time) && <>{fmtTime(e.time)}<span className="text-slate-700"> · </span></>}
          {e.venue || 'Venue TBA'}
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => addToCalendar(e)}
          className="font-mono text-[9px] text-slate-400 hover:text-mint flex items-center gap-1 justify-center"
          title="Add to calendar (.ics)"
        >
          <Icon name="calendar-plus" size={12} /> Save
        </button>
        {e.url && (
          <a
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] text-slate-500 hover:text-ice text-center underline"
          >
            Tickets
          </a>
        )}
      </div>
    </HudBox>
  )

  const RecSection = ({ icon, label, tint, items, empty }) => (
    <div className="mt-4">
      <div className={`font-mono text-[10px] uppercase tracking-wide flex items-center gap-1.5 ${tint}`}>
        <Icon name={icon} size={12} /> {label}
      </div>
      {items.length > 0 ? (
        <div className="space-y-2 mt-2">
          {items.map((e) => <RecCard key={`${e.source}-${e.id}`} e={e} />)}
        </div>
      ) : (
        <div className="font-mono text-[11px] text-slate-600 mt-2">{empty}</div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <HudBox
        hero
        className="w-full sm:max-w-lg max-h-[80vh] overflow-y-auto p-5 rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-heading font-bold text-base text-[#e8f4f8]">
              {dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div className="font-mono text-[10px] text-slate-500 uppercase">
              {daypartMeta(bucket.daypart)?.sub || bucket.daypart}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white" title="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          {participants.map((p) => {
            const st = statusStyle[statusOf(p)]
            return (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/[0.03]">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="font-display font-bold text-sm text-[#e8f4f8] truncate">{p.display_name}</span>
                </span>
                <span className="font-mono text-[11px] font-bold shrink-0" style={{ color: st.color }}>
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>

        {showRecs && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Icon name="sparkle" size={12} className="text-ice" />
              Event picks for this window
            </div>

            {recs === null ? (
              <div className="font-mono text-[11px] text-slate-600 mt-3 flex items-center gap-1.5">
                <Icon name="circle-notch" size={12} className="animate-spin" /> Finding shows…
              </div>
            ) : (
              <>
                <RecSection
                  icon="heart"
                  label="For you · from Spotify"
                  tint="text-mint"
                  items={recs.forYou}
                  empty={
                    recs.configured
                      ? 'No shows for this night.'
                      : 'Show discovery isn’t switched on yet.'
                  }
                />
                <RecSection
                  icon="bookmark-simple"
                  label="Your crew saved"
                  tint="text-ice"
                  items={recs.saved}
                  empty="No one in this overlap has saved a show for this night."
                />
              </>
            )}
          </div>
        )}
      </HudBox>
    </div>
  )
}
