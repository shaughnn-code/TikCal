import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchVisibleEvents } from '../lib/db.js'
import { Wrap, Btn, Spinner } from '../components/ui.jsx'
import { EventCard } from '../components/EventCard.jsx'
import { CalGrid } from '../components/CalGrid.jsx'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selDate, setSelDate] = useState(null)
  const [tab, setTab] = useState('upcoming')

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

  const ownerLabel = (e) =>
    e.owner_id === user.id ? null : e.owner?.name?.split(' ')[0] || 'Friend'

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((e) => e.event_date >= today)
  const past = events.filter((e) => e.event_date < today)
  const selEvs = selDate ? events.filter((e) => e.event_date === selDate) : []

  if (loading) return <Spinner />

  const Empty = () => (
    <div className="text-center py-20 text-gray-700">
      <div className="text-4xl mb-3">🎵</div>
      <p className="text-sm">No shows yet. Add your first one.</p>
    </div>
  )

  return (
    <Wrap>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-type text-xl text-white">
            {profile?.name ? `${profile.name.split(' ')[0]}'s calendar` : 'My Calendar'}
          </h1>
          <p className="text-gray-600 text-xs mt-0.5">
            {events.length} show{events.length !== 1 ? 's' : ''} in view
          </p>
        </div>
        <Btn onClick={() => navigate('/calendar/add')}>+ Add Show</Btn>
      </div>

      {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

      {/* Tab toggle */}
      <div className="flex gap-1 mb-6 bg-white/[0.04] rounded-xl p-1 w-fit">
        {['upcoming', 'calendar'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs transition-all capitalize ${
              tab === t ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <div>
          <CalGrid events={events} selectedDate={selDate} onDayClick={(d) => setSelDate(selDate === d ? null : d)} />
          {selDate && selEvs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
                {new Date(selDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
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
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} event={ev} ownerLabel={ownerLabel(ev)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Past</h2>
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
    </Wrap>
  )
}
