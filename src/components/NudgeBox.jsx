import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../lib/auth.jsx'
import { loadFriends, loadCrewMembers } from '../lib/social.js'
import { nudgeEvent, loadSentNudges } from '../lib/notifications.js'
import { withAlpha } from '../lib/constants.js'
import { Btn, SecLabel, HudBox } from './ui.jsx'
import { Icon, Totem } from './icons.jsx'

// Owner-only card on a show: tell specific friends or a whole crew you're
// going. Only offered once the show is shared -- a nudge about a show the
// other person can't open would be a dead end -- and the same rule is enforced
// server-side in nudge_event().
export const NudgeBox = ({ event, onChanged }) => {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [crewSizes, setCrewSizes] = useState({}) // crew_id -> member ids (excluding me)
  const [sent, setSent] = useState(() => new Set())
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')

  const crews = event.crews || []
  const isShared = event.share_friends || crews.length > 0
  const crewKey = crews.map((c) => c.crew_id).join(',')

  useEffect(() => {
    if (!isShared) return
    let active = true
    loadSentNudges(event.id, user.id).then((ids) => active && setSent(new Set(ids)))
    if (event.share_friends) {
      loadFriends(user.id)
        .then(({ friends: f }) => active && setFriends(f.map((r) => r.other).filter(Boolean)))
        .catch(() => {})
    }
    Promise.all(
      crews.map((c) =>
        loadCrewMembers(c.crew_id).then((m) => [c.crew_id, m.map((x) => x.user_id).filter((id) => id !== user.id)]),
      ),
    ).then((pairs) => active && setCrewSizes(Object.fromEntries(pairs)))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, event.share_friends, crewKey, user.id, isShared])

  const shareWithFriends = async () => {
    setBusy('share')
    setErr('')
    const { error } = await supabase.from('events').update({ share_friends: true }).eq('id', event.id)
    if (error) setErr(error.message)
    else await onChanged?.()
    setBusy(null)
  }

  const send = async (key, target, ids) => {
    setBusy(key)
    setErr('')
    const { error } = await nudgeEvent(event.id, target)
    if (error) setErr(error.message)
    else setSent((prev) => new Set([...prev, ...ids]))
    setBusy(null)
  }

  if (!isShared) {
    return (
      <HudBox className="p-5 mt-5">
        <SecLabel className="mb-2">▸ Nudge your people</SecLabel>
        <p className="text-slate-400 text-sm leading-relaxed mb-3">
          This show is private. Share it with your friends first, then you can nudge people that you’re going.
        </p>
        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
        <Btn variant="ghost" onClick={shareWithFriends} disabled={busy === 'share'}>
          <Icon name="users" size={14} /> {busy === 'share' ? 'Sharing…' : 'Share with friends'}
        </Btn>
      </HudBox>
    )
  }

  const chip = 'font-mono text-[11px] rounded px-2.5 py-2 border flex items-center gap-1.5 transition-colors disabled:opacity-60'

  return (
    <HudBox className="p-5 mt-5">
      <SecLabel className="mb-2">▸ Nudge your people</SecLabel>
      <p className="text-slate-400 text-sm leading-relaxed mb-3">Tell them you’re going. They get it in their notifications.</p>
      {err && <p className="text-red-400 text-xs mb-3">{err}</p>}

      {crews.length > 0 && (
        <div className="mb-4">
          <SecLabel className="mb-2">Crews</SecLabel>
          <div className="flex flex-wrap gap-2">
            {crews.map((c) => {
              const members = crewSizes[c.crew_id] || []
              const done = members.length > 0 && members.every((id) => sent.has(id))
              const color = c.color || '#4cc9f0'
              return (
                <button
                  key={c.crew_id}
                  type="button"
                  disabled={done || busy === c.crew_id || members.length === 0}
                  onClick={() => send(c.crew_id, { crews: [c.crew_id] }, members)}
                  className={chip}
                  style={{ color, borderColor: withAlpha(color, 0.4), backgroundColor: done ? withAlpha(color, 0.1) : undefined }}
                >
                  <Icon name={done ? 'check' : 'hand-waving'} size={13} />
                  {(c.name || 'Crew').toUpperCase()}
                  {done ? ' · NUDGED' : members.length ? ` · ${members.length}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {event.share_friends && (
        <div>
          <SecLabel className="mb-2">Friends</SecLabel>
          {friends.length === 0 ? (
            <p className="font-mono text-[11px] text-slate-600">No friends yet. Add some from the Crew tab.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {friends.map((f) => {
                const done = sent.has(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={done || busy === f.id}
                    onClick={() => send(f.id, { users: [f.id] }, [f.id])}
                    className={`${chip} ${done ? 'border-mint/40 bg-mint/[0.08] text-mint' : 'border-white/10 text-slate-200 hover:border-white/25'}`}
                  >
                    {done ? <Icon name="check" size={13} /> : f.totem ? <Totem icon={f.totem} size={14} /> : <Icon name="hand-waving" size={13} />}
                    {f.name || 'Friend'}
                    {done && ' · NUDGED'}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </HudBox>
  )
}
