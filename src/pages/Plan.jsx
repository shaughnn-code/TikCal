import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchVisibleEvents, getGoogleBusy } from '../lib/db.js'
import { loadFriends } from '../lib/social.js'
import { getEventAccent } from '../lib/constants.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'

// How far ahead to scout, and which weekdays count as "a night out."
const WEEKS_AHEAD = 6
const NIGHT_DAYS = [4, 5, 6] // Thu, Fri, Sat (0=Sun)

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Google free/busy intervals → a Set of local YYYY-MM-DD dates that have any
// busy block, so we can mark "you" busy on those nights.
function busyToDates(busy) {
  const set = new Set()
  for (const b of busy || []) {
    const start = new Date(b.start)
    const end = new Date(b.end)
    if (isNaN(start) || isNaN(end)) continue
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      set.add(iso(new Date(d)))
      if (set.size > 400) return set // safety cap
    }
  }
  return set
}

// Upcoming Thu/Fri/Sat dates within the window, as YYYY-MM-DD strings.
function upcomingNights() {
  const out = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + WEEKS_AHEAD * 7)
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (NIGHT_DAYS.includes(d.getDay())) out.push(iso(new Date(d)))
  }
  return out
}

export default function Plan() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [friends, setFriends] = useState([])
  const [googleBusyDates, setGoogleBusyDates] = useState(() => new Set())
  const [googleConnected, setGoogleConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let active = true
    const now = new Date()
    const end = new Date(now.getTime() + WEEKS_AHEAD * 7 * 86400000)
    Promise.all([
      fetchVisibleEvents(),
      loadFriends(user.id),
      getGoogleBusy(now.toISOString(), end.toISOString()),
    ])
      .then(([evs, f, gb]) => {
        if (!active) return
        setEvents(evs)
        setFriends(f.friends.map((r) => r.other).filter(Boolean))
        setGoogleConnected(!!gb.connected)
        setGoogleBusyDates(busyToDates(gb.busy))
      })
      .catch((e) => active && setErr(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [user.id])

  // The crew we're coordinating: you + your accepted friends.
  const crew = useMemo(
    () => [{ id: user.id, name: profile?.name ? `${profile.name.split(' ')[0]} (you)` : 'You', totem: profile?.totem }, ...friends],
    [user.id, profile, friends],
  )

  const nights = useMemo(() => {
    const byDate = {}
    for (const e of events) (byDate[e.event_date] = byDate[e.event_date] || []).push(e)
    return upcomingNights().map((date) => {
      const dayEvents = byDate[date] || []
      const busyIds = new Set(dayEvents.map((e) => e.owner_id))
      // Fold in the current user's real Google calendar busy nights.
      if (googleBusyDates.has(date)) busyIds.add(user.id)
      const free = crew.filter((p) => !busyIds.has(p.id))
      const busy = crew.filter((p) => busyIds.has(p.id))
      return { date, free, busy, plans: dayEvents }
    })
  }, [events, crew, googleBusyDates, user.id])

  if (loading) return <Spinner />

  const fmtDay = (date) => {
    const d = new Date(date + 'T12:00:00')
    const diff = Math.ceil((d - new Date()) / 86400000)
    return {
      wd: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      md: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cd: diff <= 0 ? 'TONIGHT' : `T-${diff}D`,
    }
  }

  const Person = ({ p, dim }) => (
    <span
      className={`font-mono text-[10px] rounded px-2 py-1 flex items-center gap-1.5 border ${
        dim ? 'text-slate-500 border-white/[0.06]' : 'text-slate-200 border-violet/25 bg-white/[0.03]'
      }`}
    >
      {p.totem ? <Totem icon={p.totem} size={13} /> : <Icon name="user" size={11} />}
      {p.name}
    </span>
  )

  return (
    <>
      <GridBg lite />
      <Wrap>
        <Kicker className="mb-1">// FREE-TIME RADAR</Kicker>
        <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8] mb-2">Plan a Night</h1>
        <p className="text-slate-400 text-sm mb-3 leading-relaxed">
          Upcoming nights and who in your crew is open. Spot a free one, lock the send.
        </p>
        <div className="mb-6">
          {googleConnected ? (
            <span className="font-mono text-[10px] text-mint flex items-center gap-1.5">
              <Icon name="check-circle" size={12} /> Synced with your Google Calendar
            </span>
          ) : (
            <button onClick={() => navigate('/profile')} className="font-mono text-[10px] text-violet underline">
              Connect Google Calendar for real availability →
            </button>
          )}
        </div>

        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

        {crew.length <= 1 && (
          <HudBox className="p-4 mb-6">
            <p className="font-mono text-[11px] text-slate-400">
              Add friends to see who's free.{' '}
              <button onClick={() => navigate('/friends')} className="text-violet underline">
                Find your crew →
              </button>
            </p>
          </HudBox>
        )}

        <div className="space-y-3">
          {nights.map(({ date, free, busy, plans }) => {
            const { wd, md, cd } = fmtDay(date)
            const allFree = busy.length === 0 && crew.length > 1
            return (
              <HudBox key={date} tone={allFree ? 'mint' : 'ice'} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center shrink-0 w-12">
                      <div className="font-mono text-[10px] text-violet tracking-wide">{wd}</div>
                      <div className="font-display font-extrabold text-base text-[#e8f4f8] leading-tight">{md}</div>
                    </div>
                    <div>
                      <div className={`font-mono text-[11px] ${allFree ? 'text-mint' : 'text-slate-300'}`}>
                        {crew.length <= 1 ? 'Just you' : allFree ? 'Everyone free' : `${free.length}/${crew.length} free`}
                      </div>
                      <div className="font-mono text-[9px] text-slate-600">{cd}</div>
                    </div>
                  </div>
                  <Btn variant={allFree ? 'mint' : 'ghost'} onClick={() => navigate(`/calendar/add?date=${date}`)} cls="!px-3 !py-2 shrink-0">
                    Plan
                  </Btn>
                </div>

                {plans.length > 0 && (
                  <div className="mb-3">
                    <SecLabel className="mb-1.5">Already on</SecLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {plans.map((e) => {
                        const a = getEventAccent(e)
                        return (
                          <button
                            key={e.id}
                            onClick={() => navigate(`/events/${e.id}`)}
                            className="font-mono text-[10px] rounded px-2 py-1 flex items-center gap-1.5 border"
                            style={{ color: a.color, borderColor: a.color + '55', backgroundColor: a.bg }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                            {e.title}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {crew.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {free.map((p) => (
                      <Person key={p.id} p={p} />
                    ))}
                    {busy.map((p) => (
                      <Person key={p.id} p={p} dim />
                    ))}
                  </div>
                )}
              </HudBox>
            )
          })}
        </div>
      </Wrap>
    </>
  )
}
