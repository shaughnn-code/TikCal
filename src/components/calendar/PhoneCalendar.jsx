import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  agendaRows, activeDate, groupNights, landingDate, nightLabel, nightMarks, parseYmd,
  scrollTargetY, splitNights, stepAnchor, todayYmd,
} from '../../lib/calendar/agenda.js'
import { getEventAccent } from '../../lib/constants.js'
import { EventCard } from '../EventCard.jsx'
import { Icon } from '../icons.jsx'
import DateStrip from './DateStrip.jsx'

const LOCK_FALLBACK_MS = 900 // release the scroll-spy if `scrollend` never fires

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const longDate = (d) => parseYmd(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Phone/tablet calendar (< lg): one scrolling agenda of show nights under a
// sticky week strip that expands to the month. The page (window) scrolls, so
// the nav, strip and each night's header are all plain `position: sticky`.
//
// `selectedDate` is owned by the parent (Dashboard) and is the only selection
// state: tapping the strip sets it and scrolls the list; scrolling the list
// sets it and moves the strip highlight.
export default function PhoneCalendar({ events = [], userId, selectedDate, onSelectDate, ownerLabel, empty }) {
  const today = useMemo(() => todayYmd(), [])
  const nights = useMemo(() => groupNights(events), [events])
  const rows = useMemo(() => agendaRows(nights, today), [nights, today])
  const pastCount = useMemo(() => splitNights(nights, today).past.length, [nights, today])
  const marks = useMemo(() => nightMarks(events, userId, getEventAccent), [events, userId])

  const sel = selectedDate || today
  const [pastOpen, setPastOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [anchor, setAnchor] = useState(sel) // which week/month the strip is browsing
  const [miss, setMiss] = useState(null) // { tapped, landed } when a tap hit an empty night
  const [pending, setPending] = useState(null) // { date } row to scroll to after render
  const [stack, setStack] = useState({ nav: 0, strip: 0 })

  const shown = useMemo(() => (pastOpen ? rows : rows.filter((r) => r.dateStr >= today)), [rows, pastOpen, today])

  const stripRef = useRef(null)
  const rowEls = useRef({})
  const lock = useRef(false)
  const selRef = useRef(sel)
  selRef.current = sel

  // The strip browses along with the selection; paging moves only the anchor.
  useEffect(() => { setAnchor(sel) }, [sel])

  // Sticky offsets: nav height varies with the notch inset and the sm
  // breakpoint, the strip grows when expanded. Both feed CSS vars.
  useLayoutEffect(() => {
    const nav = document.querySelector('nav')
    const strip = stripRef.current
    const measure = () => setStack({ nav: nav?.offsetHeight || 0, strip: strip?.offsetHeight || 0 })
    measure()
    const ro = new ResizeObserver(measure)
    if (nav) ro.observe(nav)
    if (strip) ro.observe(strip)
    return () => ro.disconnect()
  }, [])

  // Read live, not from state: a tap that also collapses the strip must
  // scroll against the collapsed height, before ResizeObserver reports it.
  const stickyLine = () =>
    (document.querySelector('nav')?.offsetHeight || 0) + (stripRef.current?.offsetHeight || 0)

  const select = useCallback((d) => {
    selRef.current = d
    onSelectDate(d)
  }, [onSelectDate])

  // Scroll-spy: the night whose header has reached the strip is selected.
  // Paused while a tap's programmatic scroll is in flight, so the strip
  // doesn't flicker through every night in between.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (lock.current) return
        const headers = shown
          .map((r) => ({ dateStr: r.dateStr, top: rowEls.current[r.dateStr]?.getBoundingClientRect().top }))
          .filter((h) => h.top != null)
        const a = activeDate(headers, stickyLine())
        if (a && a !== selRef.current) {
          select(a)
          setMiss(null)
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [shown, select])

  useLayoutEffect(() => {
    if (!pending) return
    const el = rowEls.current[pending.date]
    if (!el) return
    lock.current = true
    let timer = 0
    const release = () => {
      lock.current = false
      clearTimeout(timer)
      window.removeEventListener('scrollend', release)
      window.removeEventListener('touchstart', release)
      window.removeEventListener('wheel', release)
    }
    window.addEventListener('scrollend', release)
    window.addEventListener('touchstart', release, { passive: true })
    window.addEventListener('wheel', release, { passive: true })
    timer = setTimeout(release, LOCK_FALLBACK_MS)
    window.scrollTo({
      top: scrollTargetY(el.getBoundingClientRect().top, window.scrollY, stickyLine()),
      behavior: reducedMotion() ? 'auto' : 'smooth',
    })
    return release
  }, [pending])

  const goTo = (d) => {
    const landed = landingDate(rows.map((r) => r.dateStr), d)
    if (!landed) return
    if (landed < today) setPastOpen(true)
    setMiss(landed === d ? null : { tapped: d, landed })
    setExpanded(false) // give the list its room back
    select(landed)
    setAnchor(landed)
    setPending({ date: landed }) // fresh object: a repeat tap re-scrolls
  }

  const hasEvents = events.length > 0

  return (
    <div style={{ '--nav-h': `${stack.nav}px`, '--strip-h': `${stack.strip}px` }}>
      <div
        ref={stripRef}
        className="sticky z-[6] -mx-4 sm:mx-0 sm:rounded-b-2xl overflow-hidden"
        style={{ top: 'var(--nav-h)' }}
      >
        <DateStrip
          today={today}
          selectedDate={sel}
          anchor={anchor}
          expanded={expanded}
          marks={marks}
          onPickDate={goTo}
          onStep={(dir) => setAnchor((a) => stepAnchor(a, expanded ? 'month' : 'week', dir))}
          onToggle={() => setExpanded((x) => !x)}
          onToday={() => goTo(today)}
        />
      </div>

      {!hasEvents ? (
        empty
      ) : (
        <div className="pt-3">
          {pastCount > 0 && (
            <button
              type="button"
              onClick={() => setPastOpen((o) => !o)}
              aria-expanded={pastOpen}
              className="w-full min-h-[44px] mb-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06]
                         font-mono text-[11px] uppercase tracking-wide text-slate-400 hover:text-white
                         outline-none focus-visible:ring-2 focus-visible:ring-violet active:scale-[0.99] transition-transform"
            >
              <Icon name={pastOpen ? 'caret-down' : 'caret-up'} size={12} />
              {pastOpen ? 'Hide past nights' : `Past · ${pastCount} night${pastCount > 1 ? 's' : ''}`}
            </button>
          )}

          {shown.map((row, i) => {
            const isToday = row.dateStr === today
            const label = nightLabel(row.dateStr, today)
            const last = i === shown.length - 1
            return (
              <section
                key={row.dateStr}
                ref={(el) => { rowEls.current[row.dateStr] = el }}
                aria-label={longDate(row.dateStr)}
                // The last night gets enough height that it can still scroll
                // up under the strip; otherwise tapping it would stop short.
                style={last ? { minHeight: 'calc(100dvh - var(--nav-h) - var(--strip-h))' } : undefined}
                className="pb-3"
              >
                <h3
                  className="sticky z-[5] -mx-4 px-4 sm:mx-0 sm:px-1 py-2 bg-ink/95 flex items-baseline justify-between gap-3"
                  style={{ top: 'calc(var(--nav-h) + var(--strip-h))' }}
                >
                  <span className={`font-heading font-extrabold text-[15px] ${isToday ? 'text-violet' : row.dateStr < today ? 'text-slate-500' : 'text-[#e8f4f8]'}`}>
                    {label}
                  </span>
                  <span className="font-mono text-[11px] text-faint uppercase tracking-wide">
                    {label !== longDate(row.dateStr) && `${longDate(row.dateStr)} · `}
                    {row.events.length} show{row.events.length === 1 ? '' : 's'}
                  </span>
                </h3>

                {miss?.landed === row.dateStr && (
                  <p className="font-mono text-[11px] text-slate-500 mb-2 flex items-center gap-1.5" role="status">
                    <Icon name="moon-stars" size={12} />
                    Nothing on {longDate(miss.tapped)}. {miss.landed > miss.tapped ? 'Next show night:' : 'Latest show night:'}
                  </p>
                )}

                {row.events.length > 0 ? (
                  <div className="space-y-2">
                    {row.events.map((ev) => (
                      <EventCard key={ev.id} event={ev} ownerLabel={ownerLabel(ev)} />
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[11px] text-slate-600 py-3 px-1">No shows tonight.</p>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
