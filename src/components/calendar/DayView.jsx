import { ymd, sameDay } from '../../lib/calendar/zoom.js'
import { EventCard } from '../EventCard.jsx'
import { Icon } from '../icons.jsx'

// Single-day agenda -- the innermost granularity, reached via the Day tab
// or a swipe/arrow-key step from Week. Reuses EventCard exactly as
// Dashboard already does for "a day's shows" rather than inventing a
// fourth visual pattern for events (month chips, week chips, EventCard).
export default function DayView({ focus, today, eventsByDate }) {
  const evs = eventsByDate[ymd(focus)] || []
  const isToday = sameDay(focus, today)

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-heading font-extrabold text-[26px] text-[#eef6f7] leading-none">
          {focus.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>
        {isToday && <span className="text-[12.5px] text-violet font-semibold">Tonight</span>}
      </div>

      {evs.length > 0 ? (
        <div className="space-y-2">
          {evs.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      ) : (
        <div className="rounded-[14px] border border-line py-20 text-center text-slate-600">
          <Icon name="calendar-blank" size={36} className="mx-auto mb-3 text-slate-700" />
          <p className="font-mono text-xs">NO SHOWS THIS NIGHT</p>
        </div>
      )}
    </div>
  )
}
