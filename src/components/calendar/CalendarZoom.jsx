import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startOfWeek, stepFocus, zoomView } from '../../lib/calendar/zoom.js'
import CalRail from './CalRail.jsx'
import MonthView from './MonthView.jsx'
import WeekView from './WeekView.jsx'
import DayView from './DayView.jsx'
import useSwipe from './useSwipe.js'
import useCalendarKeys from './useCalendarKeys.js'

const TRANSITION_MS = 320
const STEP_MS = 260 // step-enter (.22s) + a little slack before clearing
const STEP_OFFSET = 28 // px the incoming/outgoing content slides, per axis
const WHEEL_THRESHOLD = 40 // accumulated px before a pinch counts as one step
const WHEEL_COOLDOWN_MS = 400

// Month view swipes/arrow-keys vertically (deliberate, unusual axis); Week
// and Day swipe/arrow-key horizontally.
const AXIS = { month: 'y', week: 'x', day: 'x' }

// Translate vector for the OUTGOING content on a step; the incoming
// content uses the mirror (negated) vector, so both sides read as one
// continuous motion in the gesture's direction.
function stepVector(axis, dir) {
  const sign = dir === 'next' ? 1 : -1
  return axis === 'y' ? { tx: 0, ty: -sign * STEP_OFFSET } : { tx: -sign * STEP_OFFSET, ty: 0 }
}

// Month → Week → Day zoom calendar (design handoff: design_handoff_calendar_zoom).
// `focus` is a single anchor Date; each granularity reads the part it needs.
export default function CalendarZoom({ events = [], selectedDate, onSelectDate, onPickEvent, initialView = 'month' }) {
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(initialView)
  const [focus, setFocus] = useState(() => new Date())
  const [outgoing, setOutgoing] = useState(null) // { view } snapshot, animated out
  const [stepAnim, setStepAnim] = useState(null) // { view, oldFocus, axis, dir } snapshot for a focus-step
  const [stepToken, setStepToken] = useState(0) // bump to force the step-enter keyframe to replay

  const mainRef = useRef(null)
  const wheelAccum = useRef(0)
  const wheelLocked = useRef(false)
  const exitTimer = useRef(null)
  const stepExitTimer = useRef(null)
  // Mirrors `view`/`focus` so the wheel listener and gesture callbacks (both
  // bound once) read current values without resubscribing, and so we never
  // branch inside a setState updater -- StrictMode double-invokes those.
  const viewRef = useRef(view)
  viewRef.current = view
  const focusRef = useRef(focus)
  focusRef.current = focus

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

  useEffect(() => () => { clearTimeout(exitTimer.current); clearTimeout(stepExitTimer.current) }, [])

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
      const dir = wheelAccum.current > 0 ? -1 : 1 // pinch in -> toward month
      wheelAccum.current = 0
      wheelLocked.current = true
      setTimeout(() => { wheelLocked.current = false }, WHEEL_COOLDOWN_MS)
      transitionTo(zoomView(viewRef.current, dir))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [transitionTo])

  // Drives prev/next (rail buttons, swipe, arrow keys) and the step-slide
  // motion together: snapshot the outgoing content's focus before moving,
  // bump `stepToken` to force the incoming content to remount and replay
  // its enter keyframe, then apply the actual focus change. Reads viewRef
  // (not `view`) so this identity stays stable and the gesture listeners
  // never need to resubscribe on every render, same pattern as the
  // wheel-zoom listener above.
  const runStep = useCallback((dir) => {
    setStepAnim({ view: viewRef.current, oldFocus: focusRef.current, axis: AXIS[viewRef.current], dir })
    setStepToken((t) => t + 1)
    clearTimeout(stepExitTimer.current)
    stepExitTimer.current = setTimeout(() => setStepAnim(null), STEP_MS)
    setFocus((f) => stepFocus(viewRef.current, f, dir === 'next' ? 1 : -1))
  }, [])

  const step = (dir) => runStep(dir > 0 ? 'next' : 'prev')
  const onGestureStep = useCallback((dir) => runStep(dir), [runStep])
  const suppressClickRef = useSwipe(mainRef, { axis: AXIS[view], onSwipe: onGestureStep })
  useCalendarKeys(mainRef, { axis: AXIS[view], onStep: onGestureStep })

  const diveToWeek = (date) => {
    setFocus(startOfWeek(date))
    transitionTo('week')
  }

  const zoomOut = () => transitionTo(zoomView(view, -1))

  // Double-clicking empty backdrop (not a tile/cell) zooms out one level.
  const onBackdropDouble = (e) => {
    if (e.target === e.currentTarget) zoomOut()
  }

  // `f` lets the step-exit overlay render the period being left, even
  // though `focus` state has already moved on to the new one.
  const render = (v, f = focus) => {
    if (v === 'month') {
      return (
        <MonthView
          year={f.getFullYear()}
          month={f.getMonth()}
          today={today}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelect={onSelectDate}
          onDive={diveToWeek}
          suppressClickRef={suppressClickRef}
        />
      )
    }
    if (v === 'week') {
      return (
        <WeekView
          focus={f}
          today={today}
          eventsByDate={eventsByDate}
          onZoomOut={zoomOut}
          onPick={onPickEvent}
          suppressClickRef={suppressClickRef}
        />
      )
    }
    return <DayView focus={f} today={today} eventsByDate={eventsByDate} />
  }

  // Computed once per render rather than inline in JSX: the exit vector for
  // the period being left, and its mirror (negated) as the enter vector for
  // the period arriving, so both halves of the step read as one motion.
  const stepOut = stepAnim ? stepVector(stepAnim.axis, stepAnim.dir) : null
  const stepIn = stepOut ? { tx: -stepOut.tx, ty: -stepOut.ty } : null

  return (
    <div className="flex flex-col lg:flex-row rounded-2xl border border-line bg-[#0a0d10] overflow-hidden">
      <CalRail view={view} focus={focus} onView={transitionTo} onStep={step} onToday={() => setFocus(new Date())} />

      <div
        ref={mainRef}
        onDoubleClick={onBackdropDouble}
        tabIndex={0}
        role="group"
        aria-label={`Calendar, ${view} view — swipe or use arrow keys to move`}
        style={{ touchAction: AXIS[view] === 'y' ? 'none' : 'pan-y' }}
        className="relative flex-1 min-w-0 px-4 py-5 lg:px-[34px] lg:py-[30px] overflow-x-auto
                   outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2
                   focus-visible:ring-offset-[#0a0d10] cursor-grab active:cursor-grabbing"
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
        {/* Same idea for a same-view step (swipe/arrow-key/prev-next): the
            period being left slides out in the gesture's direction while
            the new one (below) slides in from the mirror offset. */}
        {stepAnim && (
          <div
            aria-hidden
            className="absolute inset-0 px-4 py-5 lg:px-[34px] lg:py-[30px] pointer-events-none
                       animate-step-exit motion-reduce:hidden"
            style={{ '--tx': `${stepOut.tx}px`, '--ty': `${stepOut.ty}px` }}
          >
            {render(stepAnim.view, stepAnim.oldFocus)}
          </div>
        )}
        <div key={view} className="animate-zoom-in motion-reduce:animate-none">
          <div
            key={stepToken}
            className={stepAnim ? 'animate-step-enter motion-reduce:animate-none' : undefined}
            style={stepAnim ? { '--tx': `${stepIn.tx}px`, '--ty': `${stepIn.ty}px` } : undefined}
          >
            {render(view)}
          </div>
        </div>
      </div>
    </div>
  )
}
