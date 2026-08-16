import { VIEWS, periodLabel } from '../../lib/calendar/zoom.js'

// Fixed 200px rail on desktop. Below `lg` the parent renders this as a
// horizontal strip instead (the handoff is desktop-only; the app is not).
export default function CalRail({ view, focus, onView, onStep, onToday }) {
  return (
    <div className="lg:w-[200px] lg:shrink-0 lg:border-r lg:border-line
                    px-4 py-4 lg:px-[18px] lg:py-[26px] border-b border-line lg:border-b-0
                    flex flex-col gap-3 lg:gap-[26px]
                    items-stretch">
      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 items-stretch sm:items-center lg:items-stretch">
      <div className="rounded-xl border border-line bg-panel p-[5px] flex lg:flex-col gap-1.5 sm:flex-1 lg:flex-none">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`flex-1 rounded-lg px-3.5 py-[11px] text-[13px] font-bold tracking-[0.04em] uppercase
              transition-[color,background-color,transform] duration-150 active:scale-[0.96]
              outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-panel
              ${view === v ? 'bg-panel-2 text-violet shadow-[0_0_0_1px_#232b33]' : 'text-muted hover:text-[#eef6f7]'}`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 lg:gap-0 shrink-0">
        <RailBtn onClick={() => onStep(-1)} label="Previous period">‹</RailBtn>
        <span className="font-heading font-extrabold text-[15px] text-[#eef6f7] whitespace-nowrap px-2">
          {periodLabel(view, focus)}
        </span>
        <RailBtn onClick={() => onStep(1)} label="Next period">›</RailBtn>
      </div>

      <button
        onClick={onToday}
        className="shrink-0 rounded-lg px-3 py-[9px] text-[14px] font-bold text-violet bg-violet/[0.12] border border-violet/40
                   hover:bg-violet/20 transition-[background-color,transform] duration-150 active:scale-[0.96]
                   outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-panel
                   whitespace-nowrap"
      >
        Today
      </button>
      </div>

      {/* Below `lg` the full three-paragraph hint block above is hidden --
          the only surface teaching the swipe/zoom gesture model then went
          missing entirely on the platform most usage happens on. This is
          the mobile-visible equivalent: one line, icon-led, same info
          density a coachmark would carry without the extra UI. */}
      <p className="lg:hidden flex items-center gap-1.5 text-[11px] text-faint">
        <span aria-hidden="true">↕︎↔︎</span>
        <span>Swipe to move, pinch to zoom, double-tap a day to dive in.</span>
      </p>

      <div className="hidden lg:flex lg:flex-col lg:gap-3 text-[11.5px] text-faint leading-relaxed">
        <p>
          <span className="text-muted font-semibold">Move around:</span> swipe/drag (↕ Month, ↔ Week/Day)
          or arrow keys.
        </p>
        <p>
          <span className="text-muted font-semibold">Zoom:</span> ctrl/⌘-scroll or pinch, month → week → day.
        </p>
        <p>
          <span className="text-muted font-semibold">Dive in:</span> double-click a day for its week.
          Double-click a header to zoom out.
        </p>
      </div>
    </div>
  )
}

const RailBtn = ({ children, onClick, label }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="w-7 h-7 shrink-0 rounded-lg border border-line text-muted leading-none
               hover:text-violet hover:border-violet transition-[color,border-color,transform] duration-150 active:scale-[0.9]
               outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
  >
    {children}
  </button>
)
