// Timer engine. Lives above the views so the whole app (sidebar badge, timer
// screen) sees one timer. Active state persists in localStorage, so a page
// reload — or closing the tab mid-session — never loses a focus session:
// sessions that completed while the app was closed are logged on next launch.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useHQ } from '../../store.jsx'

const CFG_KEY = 'hq.timer.cfg'
const ACTIVE_KEY = 'hq.timer.active'
const MIN_LOGGABLE_SECONDS = 5

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

const Ctx = createContext(null)

export function TimerProvider({ children }) {
  const { logSession, loaded } = useHQ()
  const [cfg, setCfg] = useState(() => load(CFG_KEY, { focusMin: 25, breakMin: 5 }))
  const [active, setActive] = useState(() => load(ACTIVE_KEY, null))
  const [now, setNow] = useState(Date.now())

  const activeRef = useRef(active)
  activeRef.current = active
  const logRef = useRef(logSession)
  logRef.current = logSession

  useEffect(() => {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
  }, [cfg])
  useEffect(() => {
    if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    else localStorage.removeItem(ACTIVE_KEY)
  }, [active])

  function logFocus(a, endedAtMs) {
    const seconds = Math.round((endedAtMs - a.startedAt - a.pausedTotal) / 1000)
    if (seconds < MIN_LOGGABLE_SECONDS) return
    logRef
      .current({
        taskId: a.taskId,
        startedAt: new Date(a.startedAt).toISOString(),
        endedAt: new Date(endedAtMs).toISOString(),
        seconds,
      })
      .catch(() => {})
  }

  function complete(a) {
    if (activeRef.current !== a) return
    if (a.phase === 'focus') {
      logFocus(a, a.endsAt)
      setActive({
        ...a,
        phase: 'break',
        startedAt: a.endsAt,
        endsAt: a.endsAt + a.breakMin * 60000,
        pausedAt: null,
        pausedTotal: 0,
      })
    } else {
      setActive(null)
    }
  }

  // Catch sessions that finished while the app was closed.
  useEffect(() => {
    if (!loaded) return
    const a = activeRef.current
    if (a && !a.pausedAt && Date.now() >= a.endsAt) complete(a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  useEffect(() => {
    if (!active || active.pausedAt) return
    const id = setInterval(() => {
      const a = activeRef.current
      if (!a || a.pausedAt) return
      const t = Date.now()
      setNow(t)
      if (t >= a.endsAt) complete(a)
    }, 300)
    return () => clearInterval(id)
  }, [active?.startedAt, active?.pausedAt, active?.endsAt])

  const value = useMemo(() => {
    const remainingMs = !active
      ? 0
      : Math.max(0, active.endsAt - (active.pausedAt ? active.pausedAt : now))
    const totalMs = !active ? 0 : (active.phase === 'focus' ? active.focusMin : active.breakMin) * 60000
    return {
      cfg,
      setCfg: (patch) => setCfg((c) => ({ ...c, ...patch })),
      phase: active ? active.phase : 'idle',
      taskId: active ? active.taskId : null,
      paused: !!active?.pausedAt,
      remainingMs,
      totalMs,

      start(taskId = null) {
        const t = Date.now()
        setActive({
          phase: 'focus',
          taskId,
          startedAt: t,
          endsAt: t + cfg.focusMin * 60000,
          pausedAt: null,
          pausedTotal: 0,
          focusMin: cfg.focusMin,
          breakMin: cfg.breakMin,
        })
        setNow(t)
      },
      pause() {
        setActive((a) => (a && !a.pausedAt ? { ...a, pausedAt: Date.now() } : a))
      },
      resume() {
        setActive((a) => {
          if (!a || !a.pausedAt) return a
          const pausedFor = Date.now() - a.pausedAt
          return { ...a, endsAt: a.endsAt + pausedFor, pausedTotal: a.pausedTotal + pausedFor, pausedAt: null }
        })
        setNow(Date.now())
      },
      // End the focus block now and log what was actually focused.
      finish() {
        const a = activeRef.current
        if (!a || a.phase !== 'focus') return
        const t = a.pausedAt || Date.now()
        logFocus(a, t)
        setActive(null)
      },
      // Discard without logging.
      cancel() {
        setActive(null)
      },
      skipBreak() {
        const a = activeRef.current
        if (a?.phase === 'break') setActive(null)
      },
    }
  }, [active, now, cfg])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTimer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>')
  return ctx
}
