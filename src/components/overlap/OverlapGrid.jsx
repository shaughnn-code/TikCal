import { useMemo } from 'react'
import { Icon } from '../icons.jsx'
import { inCriteriaDates } from '../../lib/overlap/compute.js'
import { daypartMeta, FREE_COLOR, SHARED_COLOR } from '../../lib/overlap/theme.js'

const wkNum = (dateStr) => Math.floor(new Date(dateStr + 'T12:00:00') / 604800000)

// Participant availability dots along a cell's bottom edge (design notes §5):
// filled = free, hollow = busy/unknown, in each participant's assigned color.
// Filled = "counts here". Which participants count depends on the cell state:
// free people for open windows, attendees for a shared event.
const Dots = ({ participants, cell, ids }) => {
  const onSet = new Set(ids ?? cell.freeIds)
  return (
    <div className="flex gap-[3px] mt-1 justify-center">
      {participants.map((p) => {
        const on = onSet.has(p.id)
        return (
          <span
            key={p.id}
            className="w-1.5 h-1.5 rounded-full"
            style={
              on
                ? { backgroundColor: p.color, boxShadow: `0 0 4px ${p.color}` }
                : { border: `1px solid ${p.color}66` }
            }
          />
        )
      })}
    </div>
  )
}

// One tappable slot. Encodes group state by fill/weight per the design notes.
const Cell = ({ cell, participants, onClick }) => {
  const base =
    'relative h-[52px] rounded-md flex flex-col items-center justify-center transition-all select-none'
  if (!cell) return <div className={`${base} opacity-30`} />

  const { state, freeCount, total } = cell

  if (state === 'all_free') {
    return (
      <button
        onClick={onClick}
        className={`${base} font-mono text-[10px] font-bold`}
        style={{
          backgroundColor: FREE_COLOR,
          color: '#1a0d00',
          boxShadow: `0 0 14px ${FREE_COLOR}66`,
        }}
      >
        <span>ALL</span>
        <Dots participants={participants} cell={cell} />
      </button>
    )
  }

  if (state === 'partial') {
    const alpha = 0.22 + 0.28 * (freeCount / Math.max(total, 1)) // dimmer = fewer free
    return (
      <button
        onClick={onClick}
        className={`${base} border`}
        style={{ backgroundColor: `rgba(255,107,43,${alpha})`, borderColor: `${FREE_COLOR}66` }}
      >
        <span className="font-mono text-[11px] font-bold" style={{ color: FREE_COLOR }}>
          {freeCount}/{total}
        </span>
        <Dots participants={participants} cell={cell} />
      </button>
    )
  }

  if (state === 'shared_event') {
    return (
      <button
        onClick={onClick}
        className={`${base} border-2`}
        style={{
          borderColor: SHARED_COLOR,
          backgroundColor: 'rgba(110,231,183,0.10)',
          boxShadow: `0 0 16px ${SHARED_COLOR}55, inset 0 0 10px ${SHARED_COLOR}22`,
        }}
        title={`${cell.sharedIds.length} of you already share an event here`}
      >
        <span className="flex items-center gap-1">
          <Icon name="star-four" size={13} style={{ color: SHARED_COLOR }} />
          <span className="font-mono text-[11px] font-bold" style={{ color: SHARED_COLOR }}>
            {cell.sharedIds.length}
          </span>
        </span>
        {/* Attendees, not free-slots — they're busy *because* they're going. */}
        <Dots participants={participants} cell={cell} ids={cell.sharedIds} />
      </button>
    )
  }

  if (state === 'blocked') {
    return (
      <button
        onClick={onClick}
        className={`${base} border border-white/[0.06]`}
        style={{ backgroundColor: '#040608', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)' }}
      >
        <span className="w-3 h-[2px] rounded bg-white/15" />
      </button>
    )
  }

  // unknown
  return (
    <button
      onClick={onClick}
      className={`${base} border border-dashed border-white/15 hover:border-white/30`}
    />
  )
}

export default function OverlapGrid({ session, overlap, participants, onCellClick }) {
  const dates = useMemo(() => inCriteriaDates(session), [session])
  const dayparts = session?.dayparts || []

  if (!dates.length || !dayparts.length) {
    return (
      <div className="font-mono text-xs text-slate-500 text-center py-10">
        No dates match this session's criteria.
      </div>
    )
  }

  // rail column + one column per date
  const gridTemplateColumns = `40px repeat(${dates.length}, minmax(46px, 1fr))`

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="inline-grid gap-1 min-w-full" style={{ gridTemplateColumns }}>
        {/* header row */}
        <div className="sticky left-0 z-10 bg-ink/95" />
        {dates.map((d, i) => {
          const dt = new Date(d.dateStr + 'T12:00:00')
          const newWeek = i > 0 && wkNum(d.dateStr) !== wkNum(dates[i - 1].dateStr)
          return (
            <div
              key={d.dateStr}
              className={`text-center pb-1 ${newWeek ? 'border-l border-white/10 -ml-1 pl-1' : ''}`}
            >
              <div className="font-mono text-[9px] text-slate-500 uppercase leading-tight">
                {dt.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="font-mono text-[12px] text-slate-300 font-bold leading-tight">
                {dt.getDate()}
              </div>
            </div>
          )
        })}

        {/* one row per daypart */}
        {dayparts.map((dp) => (
          <RowFragment
            key={dp}
            dp={dp}
            dates={dates}
            overlap={overlap}
            participants={participants}
            onCellClick={onCellClick}
          />
        ))}
      </div>
    </div>
  )
}

// A daypart row: sticky label + its cells. Split out so the sticky rail cell and
// the data cells share one grid flow.
function RowFragment({ dp, dates, overlap, participants, onCellClick }) {
  const meta = daypartMeta(dp)
  return (
    <>
      <div className="sticky left-0 z-10 bg-ink/95 flex items-center justify-center">
        <span className="font-mono text-[10px] font-bold text-slate-400">{meta?.label || dp}</span>
      </div>
      {dates.map((d) => {
        const key = `${d.dateStr}:${dp}`
        const cell = overlap.get(key)
        return (
          <Cell
            key={key}
            cell={cell}
            participants={participants}
            onClick={() => onCellClick?.({ key, dateStr: d.dateStr, daypart: dp, cell })}
          />
        )
      })}
    </>
  )
}
