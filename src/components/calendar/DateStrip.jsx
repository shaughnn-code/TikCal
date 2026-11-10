import { useRef } from 'react'
import { DOW, MONTH_NAMES, monthMatrix } from '../../lib/calendar/zoom.js'
import { parseYmd, stripLabel, weekOf } from '../../lib/calendar/agenda.js'
import { Icon } from '../icons.jsx'

const SWIPE_PX = 40 // a drag this long counts as a gesture, not a tap

// Sticky week strip that expands to the month. Purely controlled: the parent
// owns the selected date (the one source of truth, shared with the list) and
// the browsing anchor; this only reports taps, pages and expand/collapse.
//
// Gestures on the strip body: drag down = expand, up = collapse, left/right =
// next/previous week (or month). touch-action is off on the body only, so the
// page still scrolls everywhere else; every gesture also has a button.
export default function DateStrip({
  today, selectedDate, anchor, expanded, marks,
  onPickDate, onStep, onToggle, onToday,
}) {
  const start = useRef(null)
  const swallowClick = useRef(false)

  const onPointerDown = (e) => {
    start.current = { x: e.clientX, y: e.clientY }
    swallowClick.current = false
  }
  const onPointerMove = (e) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return
    start.current = null
    swallowClick.current = true
    if (Math.abs(dy) > Math.abs(dx)) {
      if ((dy > 0) !== expanded) onToggle()
    } else {
      onStep(dx < 0 ? 1 : -1)
    }
  }
  const onPointerEnd = () => { start.current = null }
  const pick = (d) => {
    if (swallowClick.current) { swallowClick.current = false; return }
    onPickDate(d)
  }

  const a = parseYmd(anchor)
  const label = expanded ? `${MONTH_NAMES[a.getMonth()]} ${a.getFullYear()}` : stripLabel(weekOf(anchor))
  const unit = expanded ? 'month' : 'week'

  return (
    <div className="bg-ink/95 border-b border-white/[0.07] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-1 px-1">
        <StripBtn label={`Previous ${unit}`} onClick={() => onStep(-1)}>
          <Icon name="caret-left-bold" size={16} />
        </StripBtn>
        <h2 className="flex-1 min-w-0 font-heading font-extrabold text-[15px] text-[#eef6f7] truncate" aria-live="polite">
          {label}
        </h2>
        <button
          type="button"
          onClick={onToday}
          className="h-11 px-3 rounded-full font-mono text-[11px] uppercase tracking-wide text-violet
                     outline-none focus-visible:ring-2 focus-visible:ring-violet active:scale-[0.96] transition-transform"
        >
          <span className="inline-flex items-center h-7 px-2.5 rounded-full border border-violet/50 bg-violet/10">Today</span>
        </button>
        <StripBtn label={`Next ${unit}`} onClick={() => onStep(1)}>
          <Icon name="caret-right-bold" size={16} />
        </StripBtn>
        <StripBtn label={expanded ? 'Show one week' : 'Show the whole month'} onClick={onToggle} expanded={expanded}>
          <Icon name={expanded ? 'caret-up-bold' : 'calendar-dots'} size={16} />
        </StripBtn>
      </div>

      <div
        role="group"
        aria-label={expanded ? 'Month' : 'Week'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ touchAction: 'none' }}
        className="px-1 pb-1 select-none"
      >
        <div className="grid grid-cols-7">
          {DOW.map((d) => (
            <div key={d} aria-hidden className="text-center text-[10px] font-bold tracking-[0.08em] text-faint pb-0.5">
              {d[0]}
            </div>
          ))}
        </div>
        <div
          key={`${unit}-${expanded ? anchor.slice(0, 7) : weekOf(anchor)[0]}`}
          className="grid grid-cols-7 animate-step-enter motion-reduce:animate-none"
          style={{ '--ty': expanded ? '-6px' : '0px' }}
        >
          {(expanded ? monthMatrix(a.getFullYear(), a.getMonth()).map((c) => ({ d: c.dateStr, out: c.out }))
            : weekOf(anchor).map((d) => ({ d, out: false }))
          ).map(({ d, out }) => (
            <DayCell
              key={d}
              dateStr={d}
              out={out}
              isToday={d === today}
              isSel={d === selectedDate}
              mark={marks[d]}
              onPick={pick}
            />
          ))}
        </div>
        {/* Pull affordance: visual only; the body itself is the drag target. */}
        <div aria-hidden className="flex justify-center pt-1">
          <span className="w-9 h-1 rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  )
}

function DayCell({ dateStr, out, isToday, isSel, mark, onPick }) {
  const day = parseYmd(dateStr)
  const count = mark?.count || 0
  const label = [
    day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    count ? `${count} show${count > 1 ? 's' : ''}` : 'no shows',
    mark?.mine ? "you're in" : null,
  ].filter(Boolean).join(', ')

  return (
    <button
      type="button"
      onClick={() => onPick(dateStr)}
      aria-label={label}
      aria-pressed={isSel}
      aria-current={isToday ? 'date' : undefined}
      className={`min-h-[48px] flex flex-col items-center justify-center gap-[3px] rounded-xl
        outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-inset
        active:scale-[0.94] transition-transform duration-150 motion-reduce:transition-none ${out ? 'opacity-35' : ''}`}
    >
      {/* Violet = chrome (selection / today). Mint ring = you said "I'm in". */}
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] tabular-nums font-bold
          ${isSel ? 'bg-violet text-white' : isToday ? 'text-violet' : count ? 'text-[#e8f4f8]' : 'text-muted'}`}
        style={mark?.mine ? { boxShadow: '0 0 0 2px #6EE7B7' } : undefined}
      >
        {day.getDate()}
      </span>
      <span className="flex items-center gap-[3px] h-1.5">
        {(mark?.colors || []).map((c) => (
          <span key={c} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </span>
    </button>
  )
}

const StripBtn = ({ children, onClick, label, expanded }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-expanded={expanded}
    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-muted
               hover:text-violet active:scale-[0.9] transition-[color,transform] duration-150 motion-reduce:transition-none
               outline-none focus-visible:ring-2 focus-visible:ring-violet"
  >
    {children}
  </button>
)
