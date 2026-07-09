import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Wrap, Logo, Btn, HudBox, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { FEATURE_NAME } from '../lib/overlap/theme.js'
import { computeOverlap } from '../lib/overlap/compute.js'
import {
  getSession,
  joinSession,
  updateAvailability,
  subscribeParticipants,
  getGuestParticipantId,
} from '../lib/overlap/api.js'
import { fetchSessionEventBusy, applyTikcalSource } from '../lib/overlap/tikcal.js'
import OverlapGrid from '../components/overlap/OverlapGrid.jsx'
import Legend from '../components/overlap/Legend.jsx'
import BestWindows from '../components/overlap/BestWindows.jsx'
import CellDetail from '../components/overlap/CellDetail.jsx'
import ManualGrid from '../components/overlap/ManualGrid.jsx'
import GuestJoinSheet from '../components/overlap/GuestJoinSheet.jsx'

const SAVE_DEBOUNCE_MS = 600
const VIEWS = [
  { key: 'board', label: 'Board', icon: 'grid-four' },
  { key: 'best', label: 'Best', icon: 'star-four' },
  { key: 'you', label: 'You', icon: 'user' },
]

// Public + guest-capable. Renders its own header (no Nav) because a logged-out
// guest reaching this via the share link has no session.
export default function OverlapSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [eventRows, setEventRows] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | expired | notfound | error
  const [err, setErr] = useState('')
  const [joinErr, setJoinErr] = useState('')

  const [view, setView] = useState('board')
  const [bucket, setBucket] = useState(null)
  const [copied, setCopied] = useState(false)
  const [dismissedFull, setDismissedFull] = useState(false)

  // My own row is edited locally so taps render instantly; the server drives
  // everyone else's. Persisted on a debounce.
  const [myId, setMyId] = useState(null)
  const [myAvail, setMyAvail] = useState({})
  const joinedRef = useRef(false)
  const saveTimer = useRef(null)

  const load = useCallback(async () => {
    const data = await getSession(sessionId)
    if (!data) return setStatus('notfound')
    if (data.error === 'expired') return setStatus('expired')
    setSession(data.session)
    setParticipants(data.participants || [])
    return data
  }, [sessionId])

  // Initial fetch + event busy rows.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await load()
        if (!alive || !data?.session) return
        const rows = await fetchSessionEventBusy(sessionId).catch(() => [])
        if (!alive) return
        setEventRows(rows)
        setStatus('ready')
      } catch (e) {
        if (alive) { setErr(e.message); setStatus('error') }
      }
    })()
    return () => { alive = false }
  }, [sessionId, load])

  // Identify "me": logged-in matches on user_id, a guest bears the participant
  // id returned by join_session (kept in localStorage).
  useEffect(() => {
    if (status !== 'ready' || authLoading) return
    let mine = null
    if (user) mine = participants.find((p) => p.user_id === user.id)
    else {
      const gid = getGuestParticipantId(sessionId)
      if (gid) mine = participants.find((p) => p.id === gid)
    }
    if (mine) {
      setMyId(mine.id)
      // Only seed from the server before the first local edit, so an in-flight
      // realtime echo of our own row can't stomp what we just typed.
      setMyAvail((cur) => (Object.keys(cur).length ? cur : mine.availability || {}))
      return
    }
    // Logged-in users join silently; guests are asked for a name.
    if (user && !joinedRef.current) {
      joinedRef.current = true
      joinSession(sessionId, profile?.name || 'Me')
        .then((r) => { if (r?.error) setJoinErr(r.error); return load() })
        .catch((e) => setErr(e.message))
    }
  }, [status, authLoading, user, profile, participants, sessionId, load])

  // Live grid: refetch on any participant change.
  useEffect(() => {
    if (status !== 'ready') return
    return subscribeParticipants(sessionId, () => { load().catch(() => {}) })
  }, [status, sessionId, load])

  const onJoinAsGuest = async (name) => {
    setJoinErr('')
    try {
      const r = await joinSession(sessionId, name)
      if (r?.error) return setJoinErr(r.error === 'full' ? 'This overlap is full.' : r.error)
      await load()
    } catch (e) {
      setJoinErr(e.message)
    }
  }

  // Overlay my local edits onto the server rows, then fold in TikCal events.
  const resolved = useMemo(() => {
    const merged = participants.map((p) => (p.id === myId ? { ...p, availability: myAvail } : p))
    return applyTikcalSource(merged, eventRows, session)
  }, [participants, myId, myAvail, eventRows, session])

  const overlap = useMemo(
    () => (session ? computeOverlap(resolved, session) : new Map()),
    [resolved, session],
  )

  const onAvailChange = (next) => {
    setMyAvail(next)
    if (!myId) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateAvailability(sessionId, myId, next).catch((e) => setErr(e.message))
    }, SAVE_DEBOUNCE_MS)
  }

  // Flush a pending save on unmount so a quick tap-and-leave still persists.
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked */ }
  }

  if (status === 'loading' || authLoading) return <Spinner />

  if (status === 'notfound' || status === 'expired' || status === 'error') {
    const copy = {
      notfound: ['Overlap not found', 'This link may be wrong, or the overlap was deleted.'],
      expired: ['Overlap expired', 'Overlaps clear out after 30 days. Ask for a fresh link.'],
      error: ['Something broke', err || 'Try reloading.'],
    }[status]
    return (
      <>
        <GridBg lite />
        <Wrap>
          <HudBox className="p-8 text-center mt-10">
            <Icon name="warning-circle" size={28} className="text-slate-600 mx-auto mb-3" />
            <div className="font-display font-bold text-[#e8f4f8]">{copy[0]}</div>
            <div className="font-mono text-[11px] text-slate-500 mt-1">{copy[1]}</div>
          </HudBox>
        </Wrap>
      </>
    )
  }

  const needsJoin = !myId && !(user && joinedRef.current)
  const full = participants.length >= (session?.max_participants ?? 4)

  return (
    <>
      <GridBg lite />

      <header className="relative z-20 border-b border-white/[0.07] px-4 py-4 sticky top-0 bg-ink/80 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(user ? '/overlap' : '/')}>
            <Logo size="sm" />
          </button>
          <button
            onClick={share}
            className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wide text-slate-500 hover:text-white transition-colors"
          >
            <Icon name={copied ? 'check' : 'link-simple'} size={14} />
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </header>

      <Wrap>
        <div className="mb-5">
          <div className="font-mono text-[11px] text-ice uppercase tracking-[0.16em]">{FEATURE_NAME}</div>
          <h1 className="font-heading font-bold text-2xl text-[#e8f4f8]">{session.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {participants.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
                />
                <span className="font-mono text-[10px] uppercase text-slate-400">{p.display_name}</span>
              </span>
            ))}
            {!full && (
              <span className="font-mono text-[10px] uppercase text-slate-600">
                · {session.max_participants - participants.length} open
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded font-mono text-[11px] uppercase tracking-wide transition-all ${
                view === v.key ? 'bg-ice/15 text-ice' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Icon name={v.icon} size={13} />
              {v.label}
            </button>
          ))}
        </div>

        {err && <div className="font-mono text-xs text-red-400 mb-3">{err}</div>}

        {view === 'board' && (
          <>
            <OverlapGrid
              session={session}
              overlap={overlap}
              participants={resolved}
              onCellClick={setBucket}
            />
            <Legend />
          </>
        )}

        {view === 'best' && (
          <BestWindows
            session={session}
            overlap={overlap}
            participants={resolved}
            onSelect={(r) =>
              setBucket({ key: r.key, dateStr: r.dateStr, daypart: r.daypart, cell: overlap.get(r.key) })
            }
          />
        )}

        {view === 'you' &&
          (myId ? (
            <ManualGrid session={session} availability={myAvail} onChange={onAvailChange} />
          ) : (
            <div className="font-mono text-xs text-slate-500 text-center py-8">
              Join this overlap to mark when you're free.
            </div>
          ))}
      </Wrap>

      {bucket && (
        <CellDetail
          bucket={bucket}
          session={session}
          participants={resolved}
          onClose={() => setBucket(null)}
        />
      )}

      {needsJoin &&
        (full ? (
          !dismissedFull && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <HudBox hero className="w-full max-w-sm p-6 text-center">
                <div className="font-display font-bold text-[#e8f4f8]">This overlap is full</div>
                <div className="font-mono text-[11px] text-slate-500 mt-1 mb-4">
                  It's capped at {session.max_participants}. You can still watch the board, just not add
                  your own nights.
                </div>
                <Btn variant="ice" onClick={() => setDismissedFull(true)} cls="w-full">
                  View board
                </Btn>
              </HudBox>
            </div>
          )
        ) : (
          <GuestJoinSheet sessionName={session.name} onJoin={onJoinAsGuest} error={joinErr} />
        ))}
    </>
  )
}
