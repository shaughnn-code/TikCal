import { MONTH_NAMES, monthMatrix, sameDay, ymd } from '../../lib/calendar/zoom.js'

// 4-column grid of month tiles, each holding a micro day-grid. Click a tile to
// zoom into that month.
export default function YearView({ year, today, eventsByDate, onPickMonth }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-heading font-extrabold text-[26px] text-[#eef6f7] leading-none">{year}</h2>
        <span className="hidden sm:inline text-[12.5px] text-faint">Click a month to zoom in</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTH_NAMES.map((name, m) => (
          <button
            key={name}
            onClick={() => onPickMonth(m)}
            className="group text-left rounded-[14px] border border-line bg-panel px-4 pt-3.5 pb-4
                       transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan
                       hover:shadow-[0_10px_26px_-12px_#2FE6E6]"
          >
            <div className="font-heading font-extrabold text-[14px] text-[#eef6f7] mb-2">{name}</div>
            <MicroGrid year={year} month={m} today={today} eventsByDate={eventsByDate} />
          </button>
        ))}
      </div>
    </div>
  )
}

function MicroGrid({ year, month, today, eventsByDate }) {
  const cells = monthMatrix(year, month)
  return (
    <div className="grid grid-cols-7 gap-y-[3px]">
      {cells.map((c, i) => {
        if (c.out) return <span key={i} />
        const isToday = sameDay(c.date, today)
        const has = (eventsByDate[c.dateStr]?.length ?? 0) > 0
        return (
          <span
            key={i}
            className={`text-[8px] leading-[13px] text-center rounded-[3px] tabular-nums ${
              isToday ? 'bg-cyan text-[#04191b] font-bold' : 'text-faint'
            }`}
            // An event is a cyan underline: legible at 8px where a dot would vanish.
            style={has && !isToday ? { boxShadow: 'inset 0 -2px 0 #2FE6E6' } : undefined}
          >
            {c.date.getDate()}
          </span>
        )
      })}
    </div>
  )
}
