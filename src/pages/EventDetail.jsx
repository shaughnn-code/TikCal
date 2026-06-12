import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { fetchEvent } from '../lib/db.js'
import { Wrap, Btn, Spinner } from '../components/ui.jsx'

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    fetchEvent(id)
      .then((e) => active && setEvent(e))
      .catch((e) => active && setErr(e.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <Spinner />

  if (!event) {
    return (
      <Wrap>
        <div className="text-center py-20 text-gray-600">
          <p className="text-sm mb-4">This show isn't available.</p>
          <Btn variant="ghost" onClick={() => navigate('/calendar')}>
            Back to calendar
          </Btn>
        </div>
      </Wrap>
    )
  }

  const isOwner = event.owner_id === user.id
  const fmt = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const del = async () => {
    if (!confirm('Remove this show?')) return
    setDeleting(true)
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (error) {
      setDeleting(false)
      return setErr(error.message)
    }
    navigate('/calendar')
  }

  return (
    <Wrap>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-white transition-colors text-lg">
          ←
        </button>
        <h1 className="heading-type text-xl text-white truncate">{event.title}</h1>
      </div>

      {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

      {event.flyer_url && (
        <img src={event.flyer_url} alt={event.title} className="w-full max-h-80 object-cover rounded-2xl mb-6 border border-white/10" />
      )}

      <div className="border border-white/[0.08] rounded-2xl p-6 space-y-4">
        {event.artist && (
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Artist</div>
            <div className="text-white">{event.artist}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Date</div>
            <div className="text-white text-sm">{fmt}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Venue</div>
            <div className="text-white text-sm">{event.venue || '—'}</div>
          </div>
        </div>
        {event.notes && (
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Notes</div>
            <div className="text-gray-400 text-sm italic">{event.notes}</div>
          </div>
        )}
        <div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Added by</div>
          <div className="text-white text-sm flex items-center gap-2">
            {event.owner?.totem && <span>{event.owner.totem}</span>}
            {isOwner ? 'You' : event.owner?.name || 'A friend'}
          </div>
        </div>
        {(event.share_friends || event.crews?.length > 0) && (
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Shared with</div>
            <div className="flex flex-wrap gap-2">
              {event.share_friends && (
                <span className="text-xs text-accent border border-accent/25 rounded-full px-2.5 py-1">Friends</span>
              )}
              {event.crews?.map((c) => (
                <span key={c.crew_id} className="text-xs text-accent border border-accent/25 rounded-full px-2.5 py-1">
                  👯 {c.crews?.name || 'Crew'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="flex gap-3 mt-6">
          <Btn variant="danger" onClick={del} disabled={deleting}>
            {deleting ? 'Removing…' : 'Remove show'}
          </Btn>
        </div>
      )}
    </Wrap>
  )
}
