import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startOfWeek, zoomView } from '../../lib/calendar/zoom.js'
import CalRail from './CalRail.jsx'
import YearView from './YearView.jsx'
import MonthView from './MonthView.jsx'
import WeekView from './WeekView.jsx'

const TRANSITION_MS = 320
const WHEEL_THRESHOLD = 40 // accumulated px before a pinch counts as one step
const WHEEL_COOLDOWN_MS = 400

// Year → Month → Week zoom calendar (design handoff: design_handoff_calendar_zoom).
// `focus` is a single anchor Date; each granularity reads the part it needs.
export default function CalendarZoom({ events = [], selectedDate, onSelectDate, onPickEvent, initialView = 'month' }) {
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(initialView)
  const [focus, setFocus] = useState(() => new Date())
  const [outgoing, setOutgoing] = useState(null) // { view } snapshot, animated out

  const mainRef = useRef(null)
  const wheelAccum = useRef(0)
  const wheelLocked = useRef(false)
  const exitTimer = useRef(null)
  // Mirrors `view` so the wheel listener (bound once) reads it without
  // resubscribing, and so we never branch inside a setState updater --
  // StrictMode double-invokes those.
  const viewRef = useRef(view)
  viewRef.current = view

  const eventsByDate = useMemo(() => {
    const m = {}
    for (const e of events) (m[e.event_date] ||= []).push(e)
    return m
  }, [events])

  // Granularity changes animate; prev/next and Today re-render in place.
  const transitionTo = useCallback((next) => {
    const cur = viewRef.current
    if (next === cur) return
    setOutgoing({ view: cur })
    setView(next)
    clearTimeout(exitTimer.current)
    exitTimer.current = setTimeout(() => setOutgoing(null), TRANSITION_MS)
  }, [])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  // Ctrl/⌘+wheel (trackpad pinch) zooms granularity. Non-passive so we can
  // preventDefault and stop the browser's own page zoom.
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return // plain scroll still scrolls the page
      e.preventDefault()
      if (wheelLocked.current) return
      wheelAccum.current += e.deltaY
      if (Math.abs(wheelAccum.current) < WHEEL_THRESHOLD) return
      const dir = wheelAccum.current > 0 ? -1 : 1 // pinch in -> toward year
      wheelAccum.current = 0
      wheelLocked.current = true
      setTimeout(() => { wheelLocked.current = false }, WHEEL_COOLDOWN_MS)
      transitionTo(zoomView(viewRef.current, dir))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [transitionTo])

  const step = (dir) => setFocus((f) => {
    const d = new Date(f)
    if (view === 'year') d.setFullYear(d.getFullYear() + dir)
    else if (view === 'month') d.setMonth(d.getMonth() + dir, 1)
    else d.setDate(d.getDate() + 7 * dir)
    return d
  })

  const pickMonth = (m) => {
    setFocus((f) => new Date(f.getFullYear(), m, 1))
    transitionTo('month')
  }

  const diveToWeek = (date) => {
    setFocus(startOfWeek(date))
    transitionTo('week')
  }

  const zoomOut = () => transitionTo(zoomView(view, -1))

  // Double-clicking empty backdrop (not a tile/cell) zooms out one level.
  const onBackdropDouble = (e) => {
    if (e.target === e.currentTarget) zoomOut()
  }

  const render = (v) => {
    if (v === 'year') {
      return (
        <YearView
          year={focus.getFullYear()}
          today={today}
          eventsByDate={eventsByDate}
          onPickMonth={pickMonth}
        />
      )
    }
    if (v === 'month') {
      return (
        <MonthView
          year={focus.getFullYear()}
          month={focus.getMonth()}
          today={today}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelect={onSelectDate}
          onDive={diveToWeek}
        />
      )
    }
    return (
      <WeekView
        focus={focus}
        today={today}
        eventsByDate={eventsByDate}
        onZoomOut={zoomOut}
        onPick={onPickEvent}
      />
    )
  }

  return (
    <div className="flex flex-col lg:flex-row rounded-2xl border border-line bg-[#0a0d10] overflow-hidden">
      <CalRail view={view} focus={focus} onView={transitionTo} onStep={step} onToday={() => setFocus(new Date())} />

      <div
        ref={mainRef}
        onDoubleClick={onBackdropDouble}
        className="relative flex-1 min-w-0 px-4 py-5 lg:px-[34px] lg:py-[30px] overflow-x-auto"
      >
        {/* Outgoing view is pulled out of flow so the incoming one renders underneath. */}
        {outgoing && (
          <div
            key={`out-${outgoing.view}`}
            aria-hidden
            className="absolute inset-0 px-4 py-5 lg:px-[34px] lg:py-[30px] pointer-events-none
                       animate-zoom-out motion-reduce:hidden"
          >
            {render(outgoing.view)}
          </div>
        )}
        <div key={view} className="animate-zoom-in motion-reduce:animate-none">
          {render(view)}
        </div>
      </div>
    </div>
  )
}
