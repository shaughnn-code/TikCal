import { useMemo } from 'react'
import { bestWindows } from '../../lib/overlap/compute.js'
import { daypartMeta, FREE_COLOR, SHARED_COLOR } from '../../lib/overlap/theme.js'

const STATE = {
  shared_event: { label: 'Shared event', color: SHARED_COLOR },
  all_free: { label: 'Everyone free', color: FREE_COLOR },
  partial: { label: 'Some free', color: FREE_COLOR },
}

// The one-handed mobile home surface (design notes §4): full-text, big targets,
// ranked shared_event → all_free → partial.
export default function BestWindows({ session, overlap, participants, onSelect }) {
  const rows = useMemo(() => bestWindows(overlap, session), [overlap, session])

  if (!rows.length) {
    return (
      <div className="font-mono text-xs text-slate-500 text-center py-8">
        No open windows yet — as people mark themselves free, the best nights surface here.
      </div>
    )
  }

  const freeSet = participants.reduce((m, p) => ({ ...m, [p.id]: p }), {})

  return (
    <div className="space-y-2">
      {rows.slice(0, 12).map((r) => {
        const meta = STATE[r.state]
        const dt = new Date(r.dateStr + 'T12:00:00')
        // A shared event is a plan, not an opening: the people attending it are
        // "busy" precisely because they're going. Count attendees, not free slots.
        const shared = r.state === 'shared_event'
        const dotIds = shared ? r.sharedIds : r.freeIds
        const tally = shared ? `${r.sharedIds.length} going` : `${r.freeCount}/${r.total} free`
        return (
          <button
            key={r.key}
            onClick={() => onSelect?.(r)}
            className="hud w-full text-left rounded border p-3 flex items-center gap-3 transition-all hover:brightness-110"
            style={{ '--hud-color': meta.color, borderColor: `${meta.color}44`, backgroundColor: `${meta.color}0f` }}
          >
            <div className="text-center shrink-0 w-12">
              <div className="font-mono text-[9px] text-slate-400 uppercase">
                {dt.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="font-display font-bold text-lg leading-none" style={{ color: meta.color }}>
                {dt.getDate()}
              </div>
              <div className="font-mono text-[9px] text-slate-500 uppercase">
                {dt.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs font-bold uppercase tracking-wide" style={{ color: meta.color }}>
                {meta.label}
              </div>
              <div className="font-mono text-[10px] text-slate-500 uppercase mt-0.5">
                {daypartMeta(r.daypart)?.sub || r.daypart} · {tally}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {dotIds.map((id) => (
                <span
                  key={id}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: freeSet[id]?.color, boxShadow: `0 0 5px ${freeSet[id]?.color}` }}
                />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
