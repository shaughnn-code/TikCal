import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { fetchEvent } from '../lib/db.js'
import { GridBg, Wrap, Btn, Kicker, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'

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
      <>
        <GridBg lite />
        <Wrap>
          <div className="text-center py-20 text-slate-500">
            <p className="font-mono text-xs mb-4">THIS SHOW ISN'T AVAILABLE.</p>
            <Btn variant="ghost" onClick={() => navigate('/calendar')}>Back to calendar</Btn>
          </div>
        </Wrap>
      </>
    )
  }

  const isOwner = event.owner_id === user.id
  const fmt = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const diff = Math.ceil((new Date(event.event_date + 'T12:00:00') - new Date()) / 86400000)
  const cd = diff < 0 ? 'PAST' : diff === 0 ? 'TONIGHT' : `IN ${diff} DAY${diff === 1 ? '' : 'S'}`

  const del = async () => {
    if (!confirm('Remove this show?')) return
    setDeleting(true)
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (error) { setDeleting(false); return setErr(error.message) }
    navigate('/calendar')
  }

  const Field = ({ label, children }) => (
    <div>
      <SecLabel className="mb-1">{label}</SecLabel>
      <div className="font-display font-bold text-sm text-[#e8f4f8] flex items-center gap-1.5">{children}</div>
    </div>
  )

  return (
    <>
      <GridBg lite />
      <Wrap>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-ice transition-colors">
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8] truncate">{event.title}</h1>
        </div>

        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

        {event.flyer_url ? (
          <img src={event.flyer_url} alt={event.title} className="w-full max-h-80 object-cover rounded border border-ice/20 mb-6" />
        ) : null}

        <Kicker className="mb-3">▸ {cd}</Kicker>

        <HudBox className="p-5 grid grid-cols-2 gap-4">
          {event.artist && <Field label="Artist">{event.artist}</Field>}
          <Field label="Date">{fmt}</Field>
          <Field label="Venue">{event.venue || '—'}</Field>
          <Field label="Added by">
            {event.owner?.totem && <Totem icon={event.owner.totem} size={16} />}
            {isOwner ? 'You' : event.owner?.name || 'A friend'}
          </Field>
          {event.notes && (
            <div className="col-span-2">
              <SecLabel className="mb-1">Notes</SecLabel>
              <div className="text-slate-400 text-sm italic">{event.notes}</div>
            </div>
          )}
          {(event.share_friends || event.crews?.length > 0) && (
            <div className="col-span-2">
              <SecLabel className="mb-2">Shared with</SecLabel>
              <div className="flex flex-wrap gap-2">
                {event.share_friends && (
                  <span className="font-mono text-[9px] text-mint border border-mint/40 rounded px-2.5 py-1">FRIENDS</span>
                )}
                {event.crews?.map((c) => (
                  <span key={c.crew_id} className="font-mono text-[9px] text-ice border border-ice/40 rounded px-2.5 py-1">
                    {(c.crews?.name || 'CREW').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </HudBox>

        {isOwner && (
          <div className="mt-6">
            <Btn variant="danger" onClick={del} disabled={deleting}>
              {deleting ? 'Removing…' : 'Remove show'}
            </Btn>
          </div>
        )}
      </Wrap>
    </>
  )
}
