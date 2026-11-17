import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './icons.jsx'
import { SecLabel } from './ui.jsx'
import {
  presets, activePreset, monthGrid, shiftMonth, selectDay, previewRange, inRange, formatRange, fromISO,
} from '../lib/dateRange.js'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_FMT = { month: 'long', year: 'numeric' }
const DAY_LABEL = { weekday: 'long', month: 'long', day: 'numeric' }

// Quick ranges for one-tap filtering, plus a calendar for anything custom.
// The first calendar click picks a start day, the second picks the end (hover
// previews the span); days that have shows carry a dot. Controlled: `from` /
// `until` are 'YYYY-MM-DD' strings or '', onChange({ from, until }).
export default function DateRangePicker({ from, until, onChange, counts = {}, todayISO }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [hover, setHover] = useState(null)
  const [view, setView] = useState(() => {
    const d = fromISO(from || todayISO)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const close = () => {
    setOpen(false)
    setAnchor(null)
    setHover(null)
  }

  const quick = useMemo(() => presets(todayISO), [todayISO])
  const activeId = activePreset(todayISO, from, until)
  const hasRange = !!(from || until)
  const custom = hasRange && !activeId

  const openCalendar = () => {
    if (open) return close()
    const d = fromISO(from || todayISO)
    setView({ year: d.getFullYear(), month: d.getMonth() })
    setOpen(true)
  }

  const pickPreset = (p) => {
    onChange({ from: p.from, until: p.until })
    close()
  }

  const clickDay = (iso) => {
    const next = selectDay(anchor, iso)
    setAnchor(next.anchor)
    setHover(null)
    onChange({ from: next.from, until: next.until })
  }

  const cells = useMemo(() => monthGrid(view.year, view.month), [view])
  const shown = previewRange(anchor, hover) || { from, until }
  const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString('en-US', MONTH_FMT)

  const chip = (on) =>
    `px-3 py-2 rounded-full font-mono text-[10px] uppercase tracking-wide border transition-all whitespace-nowrap ${
      on
        ? 'bg-gradient-to-r from-aurora/25 to-violet/25 border-violet/60 text-white shadow-[0_0_18px_-6px_rgba(139,92,255,0.8)]'
        : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
    }`

  return (
    <div
      ref={wrapRef}
      className="relative"
      role="group"
      aria-label="Date range"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <SecLabel className="mb-2">Dates</SecLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            onChange({ from: '', until: '' })
            close()
          }}
          aria-pressed={!hasRange}
          className={chip(!hasRange)}
        >
          Any date
        </button>
        {quick.map((p) => (
          <button key={p.id} type="button" onClick={() => pickPreset(p)} aria-pressed={activeId === p.id} className={chip(activeId === p.id)}>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={openCalendar}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`${chip(custom || open)} inline-flex items-center gap-1.5`}
        >
          <Icon name="calendar-blank" size={13} />
          {custom ? formatRange(from, until, todayISO) : 'Pick dates'}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="absolute z-30 left-0 mt-2 w-[min(92vw,340px)] rounded-2xl border border-white/10 bg-[#0d141b] p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon name="caret-left" size={16} />
            </button>
            <div className="font-display font-bold text-sm text-[#e8f4f8]">{monthTitle}</div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon name="caret-right" size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center font-mono text-[9px] uppercase tracking-wide text-slate-600 py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7" onMouseLeave={() => setHover(null)}>
            {cells.map(({ iso, inMonth }) => {
              const past = iso < todayISO
              const isStart = !!shown.from && iso === shown.from
              const isEnd = !!shown.until && iso === shown.until
              const edge = isStart || isEnd
              const band = inRange(iso, shown.from, shown.until)
              const n = counts[iso] || 0
              const label = `${fromISO(iso).toLocaleDateString('en-US', DAY_LABEL)}${n ? `, ${n} show${n > 1 ? 's' : ''}` : ''}`
              return (
                <div
                  key={iso}
                  className={`relative h-11 flex items-center justify-center ${
                    band ? `bg-violet/15 ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}` : ''
                  }`}
                >
                  <button
                    type="button"
                    disabled={past}
                    aria-label={label}
                    aria-pressed={edge}
                    onClick={() => clickDay(iso)}
                    onMouseEnter={() => anchor && setHover(iso)}
                    className={`relative h-10 w-10 rounded-full font-mono text-[12px] transition-colors ${
                      edge
                        ? 'bg-gradient-to-br from-aurora to-violet text-white font-bold shadow-[0_6px_16px_-6px_rgba(192,75,255,0.8)]'
                        : past
                          ? 'text-slate-800 cursor-not-allowed'
                          : iso === todayISO
                            ? 'text-white ring-1 ring-violet/60 hover:bg-white/10'
                            : inMonth
                              ? 'text-slate-200 hover:bg-white/10'
                              : 'text-slate-600 hover:bg-white/10'
                    }`}
                  >
                    {Number(iso.slice(8))}
                    {n > 0 && !past && (
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${edge ? 'bg-white' : 'bg-mint'}`}
                      />
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/[0.07]">
            <div className="font-mono text-[10px] text-slate-400 leading-snug" aria-live="polite">
              {anchor ? 'Now pick an end date' : hasRange ? formatRange(from, until, todayISO) : 'Pick a start date, then an end date'}
            </div>
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded font-mono font-bold text-[10px] uppercase tracking-[0.06em] text-white bg-gradient-to-r from-aurora to-violet hover:brightness-110 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
