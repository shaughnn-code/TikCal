import { HudBox } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { daypartMeta } from '../../lib/overlap/theme.js'

// Bottom sheet opened by tapping a cell/window: per-participant status in their
// assigned color. Event recommendations (spec §6) will slot in below for
// all_free / partial / shared windows — stubbed here as a follow-up.
export default function CellDetail({ bucket, session, participants, onClose }) {
  if (!bucket) return null
  const cell = bucket.cell || {}
  const dt = new Date(bucket.dateStr + 'T12:00:00')
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

  const showRecs = ['all_free', 'partial', 'shared_event'].includes(cell.state)

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
            <div className="font-mono text-[11px] text-slate-600 mt-2">
              Recommendations land here once event ranking ships (spec §6).
            </div>
          </div>
        )}
      </HudBox>
    </div>
  )
}
