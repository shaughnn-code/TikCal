import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchVisibleEvents } from '../lib/db.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { EventCard } from '../components/EventCard.jsx'
import CalendarZoom from '../components/calendar/CalendarZoom.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import DanceFloorLoader from '../components/DanceFloorLoader.jsx'

// Play the dance-floor intro once per session — on the first calendar load
// (log-in / refresh) — but not on every tab switch back to /calendar.
let introPlayed = false

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selDate, setSelDate] = useState(null)
  const [tab, setTab] = useState('calendar')
  const [introDone, setIntroDone] = useState(introPlayed)

  useEffect(() => {
    let active = true
    fetchVisibleEvents()
      .then((evs) => active && setEvents(evs))
      .catch((e) => active && setErr(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const ownerLabel = (e) => (e.owner_id === user.id ? null : e.owner?.name?.split(' ')[0] || 'Friend')

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((e) => e.event_date >= today)
  const past = events.filter((e) => e.event_date < today)
  const selEvs = selDate ? events.filter((e) => e.event_date === selDate) : []
  const venues = new Set(events.map((e) => e.venue).filter(Boolean)).size
  const next = upcoming[0]
  const nextCountdown = next
    ? Math.ceil((new Date(next.event_date + 'T12:00:00') - new Date()) / 86400000)
    : null

  // Crew color legend, derived from the crews tagged on visible events.
  const crewLegend = Object.values(
    events.reduce((acc, e) => {
      for (const c of e.crews || []) if (c.crew_id && !acc[c.crew_id]) acc[c.crew_id] = c
      return acc
    }, {}),
  )

  if (!introDone) {
    return <DanceFloorLoader onDone={() => { introPlayed = true; setIntroDone(true) }} />
  }
  if (loading) return <Spinner />

  const Empty = () => (
    <div className="text-center py-20 text-slate-600">
      <Icon name="calendar-blank" size={36} className="mx-auto mb-3 text-slate-700" />
      <p className="font-mono text-xs">NO SHOWS YET. ADD YOUR FIRST ONE.</p>
    </div>
  )

  return (
    <>
      <GridBg />
      <Wrap wide>
        <div className="flex items-start justify-between mb-6">
          <div>
            <Kicker className="mb-1">// SESSION ACTIVE</Kicker>
            <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8]">
              <span className="text-violet">{'{'}</span>
              {profile?.name ? `${profile.name.split(' ')[0]}'s` : 'My'}
              <span className="text-violet">{'}'}</span> Calendar
            </h1>
          </div>
          <Btn variant="aurora" onClick={() => navigate('/calendar/add')}>
            <Icon name="plus-bold" size={14} /> Add Show
          </Btn>
        </div>

        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

        {/* stat tiles */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { n: events.length, l: 'Shows', i: 'ticket', tone: 'ice' },
            { n: upcoming.length, l: 'Upcoming', i: 'calendar-dots', tone: 'mint' },
            { n: venues, l: 'Venues', i: 'map-pin', tone: 'ice' },
          ].map((s) => (
            <HudBox key={s.l} tone={s.tone} className="p-3 text-center">
              <div className={`font-display font-extrabold text-2xl ${s.tone === 'mint' ? 'text-mint' : 'text-[#e8f4f8]'}`}>
                {String(s.n).padStart(2, '0')}
              </div>
              <div className="font-mono text-[9px] text-slate-500 uppercase mt-1 flex items-center justify-center gap-1">
                <Icon name={s.i} size={10} className={s.tone === 'mint' ? 'text-mint' : 'text-violet'} /> {s.l}
              </div>
            </HudBox>
          ))}
        </div>

        {/* crew color legend */}
        {crewLegend.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-6">
            <SecLabel>Crews</SecLabel>
            {crewLegend.map((c) => (
              <span key={c.crew_id} className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: c.color || '#4cc9f0', boxShadow: `0 0 6px ${c.color || '#4cc9f0'}` }}
                />
                {c.name || 'Crew'}
              </span>
            ))}
          </div>
        )}

        {/* tab toggle */}
        <div className="flex gap-1 mb-6 bg-white/[0.04] rounded p-1 w-fit">
          {['upcoming', 'calendar'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all ${
                tab === t ? 'bg-white/10 text-violet' : 'text-slate-600 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'calendar' ? (
          <div>
            <CalendarZoom
              events={events}
              selectedDate={selDate}
              onSelectDate={(d) => setSelDate(selDate === d ? null : d)}
              onPickEvent={(ev) => navigate(`/events/${ev.id}`)}
            />
            {selDate && selEvs.length > 0 && (
              <div className="mt-6">
                <SecLabel className="mb-3">
                  ▸ {new Date(selDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </SecLabel>
                <div className="space-y-2">
                  {selEvs.map((ev) => (
                    <EventCard key={ev.id} event={ev} ownerLabel={ownerLabel(ev)} />
                  ))}
                </div>
              </div>
            )}
            {events.length === 0 && <Empty />}
          </div>
        ) : (
          <div>
            {/* Next-up hero */}
            {next && (
              <HudBox hero className="p-4 mb-6 cursor-pointer" onClick={() => navigate(`/events/${next.id}`)}>
                <div className="font-mono text-[9px] tracking-[0.12em] text-violet">
                  ▸ NEXT UP {nextCountdown === 0 ? '· TONIGHT' : `· T-${nextCountdown}D`}
                </div>
                <div className="font-display font-bold text-xl text-[#e8f4f8] mt-1.5">{next.title}</div>
                <div className="font-mono text-[10px] text-slate-500 mt-1 uppercase flex items-center gap-1.5">
                  {next.artist && <span>{next.artist}</span>}
                  {next.venue && <><span className="text-slate-700">·</span><span>{next.venue}</span></>}
                </div>
              </HudBox>
            )}

            {upcoming.length > 1 && (
              <div className="mb-8">
                <SecLabel className="mb-3">▸ Upcoming</SecLabel>
                <div className="space-y-2">
                  {upcoming.slice(1).map((ev) => (
                    <EventCard key={ev.id} event={ev} ownerLabel={ownerLabel(ev)} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <SecLabel className="mb-3">▸ Past</SecLabel>
                <div className="space-y-2">
                  {past.map((ev) => (
                    <EventCard key={ev.id} event={ev} ownerLabel={ownerLabel(ev)} />
                  ))}
                </div>
              </div>
            )}
            {events.length === 0 && <Empty />}
          </div>
        )}
        <SiteFooter />
      </Wrap>
    </>
  )
}
