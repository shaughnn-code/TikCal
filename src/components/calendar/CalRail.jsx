import { VIEWS, periodLabel } from '../../lib/calendar/zoom.js'

// Fixed 200px rail on desktop. Below `lg` the parent renders this as a
// horizontal strip instead (the handoff is desktop-only; the app is not).
export default function CalRail({ view, focus, onView, onStep, onToday }) {
  return (
    <div className="lg:w-[200px] lg:shrink-0 lg:border-r lg:border-line
                    px-4 py-4 lg:px-[18px] lg:py-[26px] border-b border-line lg:border-b-0
                    flex flex-col sm:flex-row lg:flex-col gap-3 lg:gap-[26px]
                    items-stretch sm:items-center lg:items-stretch">
      <div className="rounded-xl border border-line bg-panel p-[5px] flex lg:flex-col gap-1.5 sm:flex-1 lg:flex-none">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`flex-1 rounded-lg px-3.5 py-[11px] text-[13px] font-bold tracking-[0.04em] uppercase transition-colors
              ${view === v ? 'bg-panel-2 text-cyan shadow-[0_0_0_1px_#232b33]' : 'text-muted hover:text-[#eef6f7]'}`}
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
        className="shrink-0 rounded-lg px-3 py-[9px] text-[14px] font-bold text-cyan bg-cyan/[0.12] border border-cyan/40
                   hover:bg-cyan/20 transition-colors whitespace-nowrap"
      >
        Today
      </button>

      <div className="hidden lg:block text-[11.5px] text-faint leading-relaxed">
        <p className="mb-2">
          <span className="text-muted font-semibold">Zoom:</span> ctrl/⌘-scroll or pinch to move between
          year → month → week.
        </p>
        <p>
          <span className="text-muted font-semibold">Dive in:</span> double-click a day to jump to its week.
          Double-click a header to zoom back out.
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
               hover:text-cyan hover:border-cyan transition-colors"
  >
    {children}
  </button>
)
