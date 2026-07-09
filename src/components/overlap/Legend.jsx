import { FREE_COLOR, SHARED_COLOR } from '../../lib/overlap/theme.js'

const items = [
  { label: 'Everyone free', swatch: { backgroundColor: FREE_COLOR } },
  { label: 'Some free', swatch: { backgroundColor: 'rgba(255,107,43,0.4)', border: `1px solid ${FREE_COLOR}66` } },
  { label: 'Shared event', swatch: { border: `2px solid ${SHARED_COLOR}`, backgroundColor: 'rgba(110,231,183,0.1)' } },
  { label: 'Busy', swatch: { backgroundColor: '#040608', border: '1px solid rgba(255,255,255,0.08)' } },
  { label: 'Unknown', swatch: { border: '1px dashed rgba(255,255,255,0.2)' } },
]

// Pinned key under the board (design notes §8).
export default function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-2">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase tracking-wide">
          <span className="w-3 h-3 rounded" style={it.swatch} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
