import { useState } from 'react'
import { DOW, MONTH_NAMES, monthMatrix, sameDay } from '../../lib/calendar/zoom.js'
import { getEventAccent } from '../../lib/constants.js'
import EventPopover from './EventPopover.jsx'

// 7-column month grid. Single click selects, double click dives into that
// day's week. Chips keep their crew/artist accent (getEventAccent) rather than
// going uniform cyan, so a glance still tells you *whose* show it is.
export default function MonthView({
  year, month, today, selectedDate, eventsByDate, onSelect, onDive, suppressClickRef,
}) {
  const cells = monthMatrix(year, month)

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-heading font-extrabold text-[26px] text-[#eef6f7] leading-none">
          {MONTH_NAMES[month]} {year}
        </h2>
        <span className="hidden sm:inline text-[12.5px] text-faint">Double-click a day for its week</span>
      </div>

      <div className="rounded-[14px] border border-line overflow-hidden">
        <div className="grid grid-cols-7">
          {DOW.map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-bold tracking-[0.08em] text-muted bg-panel border-b border-line py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            const evs = eventsByDate[c.dateStr] || []
            const isToday = sameDay(c.date, today)
            const isSel = selectedDate === c.dateStr
            const select = () => {
              if (suppressClickRef?.current) return
              onSelect(c.dateStr)
            }
            const dive = () => {
              if (suppressClickRef?.current) return
              onDive(c.date)
            }
            return (
              // A plain div, not a <button>: the desktop chips below are
              // their own independently-clickable/hoverable buttons, and a
              // <button> can't legally contain nested interactive children.
              // role="button" + onKeyDown keeps it keyboard-operable.
              <div
                key={c.dateStr}
                role="button"
                tabIndex={c.out ? -1 : 0}
                aria-disabled={c.out}
                onClick={select}
                onDoubleClick={dive}
                onKeyDown={(e) => {
                  if (c.out) return
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select() }
                }}
                className={`relative text-left w-full min-h-[74px] sm:min-h-[104px] p-1.5 sm:p-2 border-line border-t border-l
                  transition-[background-color,transform] duration-150
                  outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset
                  ${i % 7 === 0 ? 'border-l-0' : ''}
                  ${c.out ? 'pointer-events-none' : 'cursor-pointer hover:bg-panel active:scale-[0.98]'}
                  ${isToday ? 'bg-violet/10' : ''}`}
                style={isSel ? { outline: '2px solid #8b5cff', outlineOffset: '-2px' } : undefined}
              >
                <div
                  className={`text-[12.5px] font-bold tabular-nums ${
                    c.out ? 'text-muted/40' : isToday ? 'text-violet' : 'text-muted'
                  }`}
                >
                  {c.date.getDate()}
                </div>

                {!c.out && evs.length > 0 && (
                  <>
                    {/* A 44px-wide column can't hold a text chip -- below `sm`
                        each event is an accent dot instead of "P…". Dots stay
                        visual-only (too small to reliably target); full detail
                        for a given day is a swipe away in Day view. */}
                    <div className="flex sm:hidden flex-wrap gap-1 mt-1.5">
                      {evs.slice(0, 4).map((ev) => (
                        <span
                          key={ev.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getEventAccent(ev).color }}
                        />
                      ))}
                    </div>

                    <div className="hidden sm:flex flex-col gap-1 mt-1">
                      {evs.slice(0, 3).map((ev) => (
                        <MonthChip key={ev.id} ev={ev} />
                      ))}
                      {evs.length > 3 && (
                        <span className="text-[10px] text-faint pl-1">+{evs.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Desktop-only event chip: hover previews the popover, click opens (and
// pins) it instead of falling through to the day cell's select/dive.
function MonthChip({ ev }) {
  const [open, setOpen] = useState(false)
  const s = getEventAccent(ev)
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        title={`${ev.artist ? ev.artist + ' — ' : ''}${ev.title}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        onDoubleClick={(e) => e.stopPropagation()}
        className="w-full text-left rounded-[5px] bg-panel-2 px-1.5 py-1 text-[10.5px] text-[#eef6f7] truncate
                   transition-transform duration-150 active:scale-[0.97]
                   outline-none focus-visible:ring-2 focus-visible:ring-violet"
        style={{ borderLeft: `2px solid ${s.color}` }}
      >
        {ev.title}
      </button>
      {open && <EventPopover event={ev} onClose={() => setOpen(false)} />}
    </div>
  )
}
