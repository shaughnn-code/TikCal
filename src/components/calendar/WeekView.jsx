import {
  DOW, WEEK_ROWS, WEEK_START_HOUR, parseTime, sameDay, slotOffset, weekDays, weekRangeLabel,
} from '../../lib/calendar/zoom.js'
import { getEventAccent } from '../../lib/constants.js'

const ROW_H = 70
const COL_H = ROW_H * WEEK_ROWS

const hourLabel = (i) => {
  const h24 = (WEEK_START_HOUR + i) % 24
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}${h24 < 12 ? 'AM' : 'PM'}`
}

// 6PM–1AM gutter + 7 day columns. TikCal events carry no start time today, so
// an event without one is stacked in a "time TBA" band at the top of its column
// rather than being given a fabricated position.
export default function WeekView({ focus, today, eventsByDate, onZoomOut, onPick }) {
  const days = weekDays(focus)

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-heading font-extrabold text-[26px] text-[#eef6f7] leading-none">
          Week of {weekRangeLabel(focus)}
        </h2>
        <span className="hidden sm:inline text-[12.5px] text-faint">Double-click a header to zoom out to month</span>
      </div>

      <div className="rounded-[14px] border border-line overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}>
          <div className="border-b border-line bg-panel" onDoubleClick={onZoomOut} />
          {days.map((d) => (
            <div
              key={d.dateStr}
              onDoubleClick={onZoomOut}
              className={`text-center border-b border-l border-line bg-panel px-1.5 py-3 cursor-pointer
                text-[11px] font-bold tracking-[0.08em] ${sameDay(d.date, today) ? 'text-violet' : 'text-muted'}`}
            >
              {DOW[d.date.getDay()]} {d.date.getDate()}
            </div>
          ))}

          <div onDoubleClick={onZoomOut}>
            {Array.from({ length: WEEK_ROWS }, (_, i) => (
              <div
                key={i}
                className="border-b border-line text-right pr-2 pt-1 text-[10px] text-faint"
                style={{ height: ROW_H }}
              >
                {hourLabel(i)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const evs = eventsByDate[d.dateStr] || []
            const timed = []
            const untimed = []
            for (const ev of evs) {
              const off = slotOffset(parseTime(ev.start_time))
              if (off == null) untimed.push(ev)
              else timed.push({ ev, off })
            }
            return (
              <div
                key={d.dateStr}
                onDoubleClick={onZoomOut}
                className="relative border-l border-line"
                style={{ height: COL_H }}
              >
                {Array.from({ length: WEEK_ROWS }, (_, i) => (
                  <div key={i} className="border-b border-line" style={{ height: ROW_H }} />
                ))}

                <div className="absolute inset-x-1 top-1 flex flex-col gap-1">
                  {untimed.map((ev) => (
                    <Chip key={ev.id} ev={ev} onPick={onPick} tba />
                  ))}
                </div>

                {timed.map(({ ev, off }) => (
                  <div
                    key={ev.id}
                    className="absolute inset-x-1"
                    style={{ top: `${off * COL_H + 4}px` }}
                  >
                    <Chip ev={ev} onPick={onPick} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Chip({ ev, onPick, tba }) {
  const s = getEventAccent(ev)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onPick?.(ev) }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="relative w-full text-left rounded-lg pl-2.5 pr-2 py-[7px] overflow-hidden border border-white/10 bg-panel transition-all hover:border-white/20 hover:-translate-y-px"
    >
      {/* faint hue wash + colored spine carry the event's crew/artist color (data) */}
      <span className="absolute inset-0 pointer-events-none" style={{ backgroundColor: s.bg }} />
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}66` }}
      />
      <div className="relative text-[11.5px] font-bold text-white truncate leading-tight">{ev.title}</div>
      {/* "TBA" not "time TBA": the column is narrow enough that the longer
          string truncates away exactly the word that carries the meaning. */}
      <div className="relative text-[10.5px] text-slate-400 truncate leading-tight">
        {[tba ? 'TBA' : ev.start_time, ev.venue].filter(Boolean).join(' · ')}
      </div>
    </button>
  )
}
