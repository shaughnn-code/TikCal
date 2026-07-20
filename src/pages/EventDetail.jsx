import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../supabaseClient.js'
import { fetchEvent, setRsvp, clearRsvp } from '../lib/db.js'
import { RSVP_OPTIONS, rsvpByValue, withAlpha } from '../lib/constants.js'
import { googleCalendarUrl, outlookCalendarUrl, downloadICS } from '../lib/calendar.js'
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
  const [rsvping, setRsvping] = useState(false)

  const load = useCallback(
    (spin = true) => {
      if (spin) setLoading(true)
      return fetchEvent(id)
        .then(setEvent)
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false))
    },
    [id],
  )

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

  const rsvps = event.rsvps || []
  const myStatus = rsvps.find((r) => r.user_id === user.id)?.status || null
  const groups = {
    in: rsvps.filter((r) => r.status === 'in'),
    maybe: rsvps.filter((r) => r.status === 'maybe'),
    out: rsvps.filter((r) => r.status === 'out'),
  }

  const answer = async (value) => {
    setRsvping(true)
    setErr('')
    // Tapping your current answer again clears it.
    const { error } = myStatus === value ? await clearRsvp(event.id, user.id) : await setRsvp(event.id, user.id, value)
    if (error) setErr(error.message)
    await load(false)
    setRsvping(false)
  }

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

  const AttendeeRow = ({ label, opt, people }) =>
    people.length === 0 ? null : (
      <div>
        <SecLabel className="mb-2" style={{ color: opt.color }}>
          {label} · {people.length}
        </SecLabel>
        <div className="flex flex-wrap gap-2">
          {people.map((r) => (
            <span
              key={r.user_id}
              className="font-mono text-[10px] text-slate-200 rounded px-2.5 py-1 flex items-center gap-1.5 border"
              style={{ borderColor: withAlpha(opt.color, 0.35), backgroundColor: withAlpha(opt.color, 0.08) }}
            >
              {r.profile?.totem && <Totem icon={r.profile.totem} size={14} />}
              {r.user_id === user.id ? 'You' : r.profile?.name || 'Someone'}
            </span>
          ))}
        </div>
      </div>
    )

  return (
    <>
      <GridBg lite />
      <Wrap>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-violet transition-colors">
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8] truncate">{event.title}</h1>
        </div>

        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

        {event.flyer_url ? (
          <img src={event.flyer_url} alt={event.title} className="w-full max-h-80 object-cover rounded border border-violet/20 mb-6" />
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
                  <span
                    key={c.crew_id}
                    className="font-mono text-[9px] rounded px-2.5 py-1 border flex items-center gap-1.5"
                    style={{ color: c.color || '#4cc9f0', borderColor: withAlpha(c.color || '#4cc9f0', 0.4) }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color || '#4cc9f0' }} />
                    {(c.name || 'CREW').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </HudBox>

        {/* ── You in? ─────────────────────────────────────────── */}
        <HudBox tone="mint" className="p-5 mt-5">
          <SecLabel className="mb-3">▸ You in?</SecLabel>
          <div className="grid grid-cols-3 gap-2">
            {RSVP_OPTIONS.map((o) => {
              const active = myStatus === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  disabled={rsvping}
                  onClick={() => answer(o.value)}
                  className={`flex flex-col items-center justify-center gap-1 rounded border py-3 transition-all ${
                    rsvping ? 'opacity-60' : ''
                  }`}
                  style={
                    active
                      ? { borderColor: o.color, backgroundColor: withAlpha(o.color, 0.14), color: o.color }
                      : { borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }
                  }
                >
                  <Icon name={o.icon} size={20} />
                  <span className="font-mono text-[10px] uppercase tracking-wide">{o.label}</span>
                </button>
              )
            })}
          </div>

          {(groups.in.length > 0 || groups.maybe.length > 0 || groups.out.length > 0) && (
            <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-4">
              <AttendeeRow label="IN" opt={rsvpByValue('in')} people={groups.in} />
              <AttendeeRow label="MAYBE" opt={rsvpByValue('maybe')} people={groups.maybe} />
              <AttendeeRow label="OUT" opt={rsvpByValue('out')} people={groups.out} />
            </div>
          )}
        </HudBox>

        {/* ── Add to your own calendar ────────────────────────── */}
        <HudBox className="p-5 mt-5">
          <SecLabel className="mb-3">▸ Add to your calendar</SecLabel>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 hover:border-white/25 text-slate-300 hover:text-white px-3 py-3 rounded font-mono font-bold text-xs tracking-[0.06em] uppercase transition-all inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="google-logo" size={15} /> Google
            </a>
            <a
              href={outlookCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 hover:border-white/25 text-slate-300 hover:text-white px-3 py-3 rounded font-mono font-bold text-xs tracking-[0.06em] uppercase transition-all inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="microsoft-outlook-logo" size={15} /> Outlook
            </a>
            <Btn variant="ghost" onClick={() => downloadICS(event)} cls="!w-full !px-3">
              <Icon name="apple-logo" size={15} /> .ics
            </Btn>
          </div>
          <p className="font-mono text-[10px] text-slate-600 mt-2">
            Want every show to sync automatically? Subscribe your whole TikCal feed from{' '}
            <button onClick={() => navigate('/profile')} className="text-violet underline">
              your profile
            </button>
            .
          </p>
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
