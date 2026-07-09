import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { fetchMyCrews } from '../lib/db.js'
import {
  loadFriends, searchPeople, sendFriendRequest, acceptFriend, removeFriend,
  loadCrewInvites, createCrew, inviteToCrew, acceptCrewInvite, declineCrewInvite, loadCrewMembers,
  updateCrewColor,
} from '../lib/social.js'
import { CREW_COLORS, DEFAULT_CREW_COLOR } from '../lib/constants.js'
import { GridBg, Wrap, Inp, Btn, SecLabel, HudBox, Spinner } from '../components/ui.jsx'
import { Icon, Totem } from '../components/icons.jsx'

// Row of crew-color swatches. `value` is the selected hex; `onPick(hex)` fires
// on click. Used both when starting a crew and recoloring one.
const ColorPicker = ({ value, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {CREW_COLORS.map((c) => (
      <button
        key={c.hex}
        type="button"
        title={c.name}
        onClick={() => onPick(c.hex)}
        className={`w-7 h-7 rounded-full transition-transform ${value === c.hex ? 'scale-110' : 'hover:scale-105'}`}
        style={{
          backgroundColor: c.hex,
          boxShadow: value === c.hex ? `0 0 0 2px #0a0e12, 0 0 0 4px ${c.hex}` : `0 0 8px ${c.hex}66`,
        }}
      />
    ))}
  </div>
)

const Avatar = ({ profile }) => (
  <div className="w-9 h-9 rounded border border-ice/30 bg-white/5 flex items-center justify-center shrink-0">
    {profile?.totem ? <Totem icon={profile.totem} size={20} /> : <Icon name="user" size={16} className="text-ice" />}
  </div>
)

const Row = ({ profile, right, tone = 'ice' }) => (
  <HudBox tone={tone} className="flex items-center justify-between gap-3 p-3">
    <div className="flex items-center gap-3 min-w-0">
      <Avatar profile={profile} />
      <div className="min-w-0">
        <div className="font-display font-bold text-sm text-[#e8f4f8] truncate">{profile?.name || 'Someone'}</div>
        {profile?.favorite_venue && (
          <div className="font-mono text-[10px] text-slate-500 truncate flex items-center gap-1">
            <Icon name="map-pin" size={10} className="text-ice" /> {profile.favorite_venue}
          </div>
        )}
      </div>
    </div>
    <div className="shrink-0">{right}</div>
  </HudBox>
)

export default function Friends() {
  const { user } = useAuth()
  const [tab, setTab] = useState('friends')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [crews, setCrews] = useState([])
  const [crewInvites, setCrewInvites] = useState([])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [newCrew, setNewCrew] = useState('')
  const [newCrewColor, setNewCrewColor] = useState(DEFAULT_CREW_COLOR)
  const [expanded, setExpanded] = useState(null)
  const [members, setMembers] = useState([])

  const reload = useCallback(async () => {
    try {
      const [f, c, ci] = await Promise.all([loadFriends(user.id), fetchMyCrews(), loadCrewInvites(user.id)])
      setFriends(f.friends); setIncoming(f.incoming); setOutgoing(f.outgoing)
      setCrews(c); setCrewInvites(ci)
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }, [user.id])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try { setResults(await searchPeople(query, user.id)) }
      catch (e) { setErr(e.message) } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, user.id])

  const friendIds = new Set(friends.map((f) => f.other?.id))
  const pendingIds = new Set([...outgoing, ...incoming].map((r) => r.other?.id))

  const guard = (fn) => async (...a) => { const { error } = await fn(...a); if (error) return setErr(error.message); reload() }
  const doSend = guard((id) => sendFriendRequest(id, user.id))
  const doAccept = guard((id) => acceptFriend(id))
  const doRemove = guard((id) => removeFriend(id))
  const doDeclineCrew = guard((id) => declineCrewInvite(id))

  const doCreateCrew = async (e) => {
    e.preventDefault()
    if (!newCrew.trim()) return
    const { error } = await createCrew(newCrew, user.id, newCrewColor)
    if (error) return setErr(error.message)
    setNewCrew(''); setNewCrewColor(DEFAULT_CREW_COLOR); reload()
  }
  const doRecolor = async (crewId, hex) => {
    // Optimistic: reflect the new color locally, then persist.
    setCrews((cs) => cs.map((c) => (c.id === crewId ? { ...c, color: hex } : c)))
    const { error } = await updateCrewColor(crewId, hex)
    if (error) { setErr(error.message); reload() }
  }
  const toggleCrew = async (crewId) => {
    if (expanded === crewId) return setExpanded(null)
    setExpanded(crewId); setMembers(await loadCrewMembers(crewId))
  }
  const doInviteToCrew = async (crewId, inviteeId) => {
    const { error } = await inviteToCrew(crewId, inviteeId, user.id)
    if (error) return setErr(error.message)
    setMembers(await loadCrewMembers(crewId))
  }
  const doAcceptCrew = async (id) => {
    const { error } = await acceptCrewInvite(id)
    if (error) return setErr(error.message)
    reload()
  }

  if (loading) return <Spinner />

  const tabChip = (id, label, count) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-1.5 rounded font-mono text-[10px] uppercase tracking-wide transition-all ${
        tab === id ? 'bg-white/10 text-ice' : 'text-slate-600 hover:text-slate-300'
      }`}
    >
      {label}{count > 0 && <span className="ml-1.5 text-mint">{count}</span>}
    </button>
  )

  return (
    <>
      <GridBg lite />
      <Wrap>
        <h1 className="font-display font-extrabold text-xl uppercase text-[#e8f4f8] mb-5">Your Crew</h1>
        {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

        <div className="flex gap-1 mb-6 bg-white/[0.04] rounded p-1 w-fit">
          {tabChip('friends', 'Friends', incoming.length)}
          {tabChip('crews', 'Crews', crewInvites.length)}
        </div>

        {tab === 'friends' ? (
          <div className="space-y-8">
            <section>
              <SecLabel className="mb-3">▸ Add people</SecLabel>
              <Inp value={query} onChange={setQuery} placeholder="Search by name…" />
              <div className="space-y-2 mt-3">
                {searching && <p className="font-mono text-[10px] text-slate-600">Searching…</p>}
                {results.map((p) => (
                  <Row key={p.id} profile={p} right={
                    friendIds.has(p.id) ? <span className="font-mono text-[10px] text-slate-600">FRIENDS</span>
                    : pendingIds.has(p.id) ? <span className="font-mono text-[10px] text-slate-600">PENDING</span>
                    : <Btn variant="ice" onClick={() => doSend(p.id)} cls="!px-3 !py-2">Add</Btn>
                  } />
                ))}
                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="font-mono text-[10px] text-slate-600">No one found.</p>
                )}
              </div>
            </section>

            {incoming.length > 0 && (
              <section>
                <SecLabel className="mb-3">▸ Friend requests</SecLabel>
                <div className="space-y-2">
                  {incoming.map((r) => (
                    <Row key={r.id} profile={r.other} tone="mint" right={
                      <div className="flex gap-2">
                        <Btn variant="mint" onClick={() => doAccept(r.id)} cls="!px-3 !py-2">Accept</Btn>
                        <Btn variant="ghost" onClick={() => doRemove(r.id)} cls="!px-3 !py-2">Ignore</Btn>
                      </div>
                    } />
                  ))}
                </div>
              </section>
            )}

            <section>
              <SecLabel className="mb-3">▸ Friends · {friends.length}</SecLabel>
              {friends.length === 0 ? (
                <p className="font-mono text-[10px] text-slate-600">No friends yet. Search above to add some.</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((r) => (
                    <Row key={r.id} profile={r.other} right={
                      <Btn variant="ghost" onClick={() => doRemove(r.id)} cls="!px-3 !py-2">Remove</Btn>
                    } />
                  ))}
                </div>
              )}
            </section>

            {outgoing.length > 0 && (
              <section>
                <SecLabel className="mb-3">▸ Sent requests</SecLabel>
                <div className="space-y-2">
                  {outgoing.map((r) => (
                    <Row key={r.id} profile={r.other} right={
                      <Btn variant="ghost" onClick={() => doRemove(r.id)} cls="!px-3 !py-2">Cancel</Btn>
                    } />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {crewInvites.length > 0 && (
              <section>
                <SecLabel className="mb-3">▸ Crew invites</SecLabel>
                <div className="space-y-2">
                  {crewInvites.map((inv) => (
                    <HudBox key={inv.id} tone="mint" className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <Icon name="users-three" size={18} className="text-mint" />
                        <div>
                          <div className="font-display font-bold text-sm text-[#e8f4f8] truncate">{inv.crews?.name}</div>
                          <div className="font-mono text-[10px] text-slate-500 truncate">from {inv.inviter?.name || 'a friend'}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Btn variant="mint" onClick={() => doAcceptCrew(inv.id)} cls="!px-3 !py-2">Join</Btn>
                        <Btn variant="ghost" onClick={() => doDeclineCrew(inv.id)} cls="!px-3 !py-2">Decline</Btn>
                      </div>
                    </HudBox>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SecLabel className="mb-3">▸ Start a crew</SecLabel>
              <form onSubmit={doCreateCrew} className="space-y-3">
                <div className="flex gap-2">
                  <Inp value={newCrew} onChange={setNewCrew} placeholder="Crew name" cls="flex-1" />
                  <Btn type="submit" variant="mint" disabled={!newCrew.trim()} cls="shrink-0">Create</Btn>
                </div>
                <div>
                  <SecLabel className="mb-2">Crew color</SecLabel>
                  <ColorPicker value={newCrewColor} onPick={setNewCrewColor} />
                </div>
              </form>
            </section>

            <section>
              <SecLabel className="mb-3">▸ Your crews · {crews.length}</SecLabel>
              {crews.length === 0 ? (
                <p className="font-mono text-[10px] text-slate-600">No crews yet. Create one or accept an invite.</p>
              ) : (
                <div className="space-y-2">
                  {crews.map((c) => {
                    const isOpen = expanded === c.id
                    const memberIds = new Set(members.map((m) => m.user_id))
                    return (
                      <HudBox key={c.id} className="overflow-hidden p-0">
                        <button onClick={() => toggleCrew(c.id)} className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                          <span className="text-sm text-[#e8f4f8] flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.color || '#4cc9f0', boxShadow: `0 0 7px ${c.color || '#4cc9f0'}` }}
                            />
                            {c.name}
                            {c.role === 'owner' && <span className="font-mono text-[9px] text-slate-600">OWNER</span>}
                          </span>
                          <span className="font-mono text-[10px] text-slate-600">{isOpen ? '−' : 'MANAGE'}</span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
                            {c.role === 'owner' && (
                              <div>
                                <SecLabel className="mb-2">Crew color</SecLabel>
                                <ColorPicker value={c.color || '#4cc9f0'} onPick={(hex) => doRecolor(c.id, hex)} />
                              </div>
                            )}
                            <div>
                              <SecLabel className="mb-2">Members · {members.length}</SecLabel>
                              <div className="flex flex-wrap gap-2">
                                {members.map((m) => (
                                  <span key={m.user_id} className="font-mono text-[10px] text-slate-300 bg-white/5 rounded px-2.5 py-1 flex items-center gap-1.5">
                                    {m.profile?.totem && <Totem icon={m.profile.totem} size={14} />} {m.profile?.name || 'Member'}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <SecLabel className="mb-2">Invite a friend</SecLabel>
                              {friends.length === 0 ? (
                                <p className="font-mono text-[10px] text-slate-600">Add friends first, then invite them here.</p>
                              ) : (
                                <div className="space-y-2">
                                  {friends.filter((f) => !memberIds.has(f.other?.id)).map((f) => (
                                    <Row key={f.id} profile={f.other} right={
                                      <Btn variant="ice" onClick={() => doInviteToCrew(c.id, f.other.id)} cls="!px-3 !py-2">Invite</Btn>
                                    } />
                                  ))}
                                  {friends.filter((f) => !memberIds.has(f.other?.id)).length === 0 && (
                                    <p className="font-mono text-[10px] text-slate-600">All your friends are already in this crew.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </HudBox>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </Wrap>
    </>
  )
}
