import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { acceptFriend, acceptCrewInvite, declineCrewInvite } from '../lib/social.js'
import { loadNotifications, markNudgesRead, markSeenNow } from '../lib/notifications.js'
import { GridBg, Wrap, Btn, Kicker, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'

const shortDate = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const ago = (iso) => {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return `${Math.round(mins / 1440)}d`
}

const first = (p) => p?.name?.split(' ')[0] || 'Someone'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)

  const load = useCallback(
    () =>
      loadNotifications(user.id)
        .then(setItems)
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false)),
    [user.id],
  )

  useEffect(() => {
    load().then(() => {
      // Opening the page is what "seen" means. The rows keep their unread
      // styling for this visit; the badge clears on the next count.
      markSeenNow()
      window.dispatchEvent(new Event('tikcal:notifications-seen'))
    })
  }, [load])

  const act = async (key, fn) => {
    setBusy(key)
    setErr('')
    const { error } = await fn()
    if (error) setErr(error.message)
    await load()
    setBusy(null)
    window.dispatchEvent(new Event('tikcal:notifications-seen'))
  }

  const openNudge = async (it) => {
    if (it.unread) await markNudgesRead([it.row.id])
    navigate(`/events/${it.row.event_id}`)
  }

  if (loading) return <Spinner />

  const Row = ({ it }) => {
    const p = it.person
    const pending = busy === it.key
    let icon = 'bell'
    let text = null
    let actions = null
    let onOpen = null

    if (it.kind === 'friend_request') {
      icon = 'user-plus'
      text = <><b className="text-[#e8f4f8]">{p?.name || 'Someone'}</b> wants to be friends.</>
      actions = (
        <Btn variant="mint" cls="!px-3 !py-2" disabled={pending} onClick={() => act(it.key, () => acceptFriend(it.row.id))}>
          Accept
        </Btn>
      )
    } else if (it.kind === 'friend_accepted') {
      icon = 'handshake'
      text = <><b className="text-[#e8f4f8]">{p?.name || 'Someone'}</b> accepted your friend request.</>
      onOpen = () => navigate('/friends')
    } else if (it.kind === 'crew_invite') {
      icon = 'users-three'
      text = (
        <>
          <b className="text-[#e8f4f8]">{first(p)}</b> added you to the crew{' '}
          <b className="text-[#e8f4f8]">{it.row.crews?.name || 'a crew'}</b>.
        </>
      )
      actions = (
        <>
          <Btn variant="mint" cls="!px-3 !py-2" disabled={pending} onClick={() => act(it.key, () => acceptCrewInvite(it.row.id))}>
            Join
          </Btn>
          <Btn variant="ghost" cls="!px-3 !py-2" disabled={pending} onClick={() => act(it.key, () => declineCrewInvite(it.row.id))}>
            Decline
          </Btn>
        </>
      )
    } else if (it.kind === 'nudge') {
      const e = it.row.event
      icon = 'hand-waving'
      text = (
        <>
          <b className="text-[#e8f4f8]">{first(p)}</b> nudged you about a show:{' '}
          <b className="text-[#e8f4f8]">{e.artist || e.title}</b> {shortDate(e.event_date)}
        </>
      )
      onOpen = () => openNudge(it)
    }

    return (
      <HudBox
        tone={it.unread ? 'mint' : 'ice'}
        className={`p-3 ${onOpen ? 'cursor-pointer' : ''}`}
        onClick={onOpen || undefined}
      >
        <div className="flex items-start gap-3">
          <div className="relative w-9 h-9 rounded border border-violet/30 bg-white/5 flex items-center justify-center shrink-0">
            {p?.totem ? <Totem icon={p.totem} size={20} /> : <Icon name={icon} size={16} className="text-violet" />}
            {it.unread && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-mint" aria-label="New" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-300 leading-snug break-words">{text}</p>
            {actions && <div className="flex flex-wrap gap-2 mt-2.5">{actions}</div>}
          </div>
          <div className="shrink-0 flex items-center gap-1 font-mono text-[11px] text-slate-500">
            {ago(it.at)}
            {onOpen && <Icon name="caret-right" size={12} />}
          </div>
        </div>
      </HudBox>
    )
  }

  return (
    <>
      <GridBg lite />
      <Wrap>
        <Kicker className="mb-1">// INBOX</Kicker>
        <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8] mb-5">Notifications</h1>
        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

        {items.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <Icon name="bell-slash" size={32} className="mx-auto mb-3 text-slate-700" />
            <p className="font-mono text-xs uppercase">Nothing yet.</p>
            <p className="text-slate-500 text-sm mt-2">Friend requests, crew invites, and nudges about shows land here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <Row key={it.key} it={it} />
            ))}
          </div>
        )}
      </Wrap>
    </>
  )
}
