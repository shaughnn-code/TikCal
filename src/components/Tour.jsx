import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { tourNext, tourBack, isLastStep } from '../lib/tour.js'
import { Btn } from './ui.jsx'

// Each step names the route its target lives on (so the tour can navigate
// there for you) and a CSS selector for the element to spotlight. The last
// step points at Profile's forwarding card -- most new users never find it
// otherwise, since nothing else in onboarding surfaces it.
const STEPS = [
  {
    route: '/calendar',
    selector: '[data-tour="nav-calendar"]',
    title: 'Your calendar',
    body: 'Every show you add, forward, or sync lands here automatically.',
  },
  {
    route: '/calendar',
    selector: '[data-tour="add-event"]',
    title: 'Add a show',
    body: "Paste a link or type one in yourself -- you're not stuck waiting on auto-import.",
  },
  {
    route: '/discover',
    selector: '[data-tour="nav-discover"]',
    title: 'Discover',
    body: 'Browse shows from Ticketmaster, Resident Advisor, and DICE near you.',
  },
  {
    route: '/overlap',
    selector: '[data-tour="nav-overlap"]',
    title: 'Sync with your crew',
    body: "See who's free and where your calendars overlap.",
  },
  {
    route: '/profile',
    selector: '[data-tour="forwarding"]',
    title: 'Auto-import tickets',
    body: 'Forward ticket confirmations to your private address here, and they turn into calendar events on their own -- set it up once, never type in a show again.',
  },
]

// Polls for the target element since a just-navigated page may still be
// mounting (data fetch, spinner) when the step first activates.
function useTargetRect(selector) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    setRect(null)
    let cancelled = false
    let tries = 0
    const tick = () => {
      if (cancelled) return
      const el = document.querySelector(selector)
      if (el) {
        setRect(el.getBoundingClientRect())
        return
      }
      tries += 1
      if (tries < 40) setTimeout(tick, 100)
    }
    tick()
    const onScroll = () => {
      const el = document.querySelector(selector)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [selector])
  return rect
}

export const Tour = () => {
  const { profile, updateProfile } = useAuth()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile && profile.setup_complete && profile.seen_intro && !profile.seen_tour) {
      setActive(true)
      setIndex(0)
    }
  }, [profile])

  const step = STEPS[index]
  const rect = useTargetRect(active ? step.selector : null)

  useEffect(() => {
    if (active && step.route !== location.pathname) navigate(step.route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index])

  const finish = () => {
    setActive(false)
    updateProfile({ seen_tour: true })
  }

  if (!active) return null

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="App tour">
      {rect && (
        <div
          className="fixed rounded-lg ring-4 ring-aurora pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(6,6,9,0.75)',
          }}
        />
      )}
      {!rect && <div className="fixed inset-0 bg-ink2/75" />}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-ink border border-white/10 rounded-xl p-4 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-wide text-aurora mb-1">
          Step {index + 1} of {STEPS.length}
        </p>
        <h3 className="font-display font-bold text-white text-sm mb-1">{step.title}</h3>
        <p className="text-slate-300 text-xs leading-relaxed mb-3">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={finish} className="text-slate-500 hover:text-slate-300 text-[11px] font-mono uppercase">
            Skip
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Btn variant="ghost" cls="!px-3 !py-2 !text-[11px]" onClick={() => setIndex((i) => tourBack(i, STEPS))}>
                Back
              </Btn>
            )}
            <Btn
              variant="aurora"
              cls="!px-3 !py-2 !text-[11px]"
              onClick={() => (isLastStep(index, STEPS) ? finish() : setIndex((i) => tourNext(i, STEPS)))}
            >
              {isLastStep(index, STEPS) ? 'Done' : 'Next'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
