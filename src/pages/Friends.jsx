import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { fetchMyCrews } from '../lib/db.js'
import {
  loadFriends,
  searchPeople,
  sendFriendRequest,
  acceptFriend,
  removeFriend,
  loadCrewInvites,
  createCrew,
  inviteToCrew,
  acceptCrewInvite,
  declineCrewInvite,
  loadCrewMembers,
} from '../lib/social.js'
import { Wrap, Inp, Btn, Spinner } from '../components/ui.jsx'

const Avatar = ({ profile }) => {
  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  return (
    <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
      <span className="text-accent text-[10px] font-semibold">{initials}</span>
    </div>
  )
}

const Row = ({ profile, right }) => (
  <div className="flex items-center justify-between gap-3 border border-white/[0.08] rounded-2xl p-3">
    <div className="flex items-center gap-3 min-w-0">
      <Avatar profile={profile} />
      <div className="min-w-0">
        <div className="text-white text-sm truncate flex items-center gap-1.5">
          {profile?.name || 'Someone'} {profile?.totem && <span>{profile.totem}</span>}
        </div>
        {profile?.favorite_venue && <div className="text-gray-600 text-[11px] truncate">📍 {profile.favorite_venue}</div>}
      </div>
    </div>
    <div className="shrink-0">{right}</div>
  </div>
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
  const [expanded, setExpanded] = useState(null)
  const [members, setMembers] = useState([])

  const reload = useCallback(async () => {
    try {
      const [f, c, ci] = await Promise.all([loadFriends(user.id), fetchMyCrews(), loadCrewInvites(user.id)])
      setFriends(f.friends)
      setIncoming(f.incoming)
      setOutgoing(f.outgoing)
      setCrews(c)
      setCrewInvites(ci)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    reload()
  }, [reload])

  // Debounced people search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        setResults(await searchPeople(query, user.id))
      } catch (e) {
        setErr(e.message)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, user.id])

  const friendIds = new Set(friends.map((f) => f.other?.id))
  const pendingIds = new Set([...outgoing, ...incoming].map((r) => r.other?.id))

  const doSend = async (id) => {
    const { error } = await sendFriendRequest(id, user.id)
    if (error) return setErr(error.message)
    reload()
  }
  const doAccept = async (id) => {
    const { error } = await acceptFriend(id)
    if (error) return setErr(error.message)
    reload()
  }
  const doRemove = async (id) => {
    const { error } = await removeFriend(id)
    if (error) return setErr(error.message)
    reload()
  }

  const doCreateCrew = async (e) => {
    e.preventDefault()
    if (!newCrew.trim()) return
    const { error } = await createCrew(newCrew, user.id)
    if (error) return setErr(error.message)
    setNewCrew('')
    reload()
  }

  const toggleCrew = async (crewId) => {
    if (expanded === crewId) {
      setExpanded(null)
      return
    }
    setExpanded(crewId)
    setMembers(await loadCrewMembers(crewId))
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
  const doDeclineCrew = async (id) => {
    const { error } = await declineCrewInvite(id)
    if (error) return setErr(error.message)
    reload()
  }

  if (loading) return <Spinner />

  return (
    <Wrap>
      <h1 className="heading-type text-xl text-white mb-6">Your crew</h1>
      {err && <p className="text-red-400 text-xs mb-4">{err}</p>}

      <div className="flex gap-1 mb-6 bg-white/[0.04] rounded-xl p-1 w-fit">
        {['friends', 'crews'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs transition-all capitalize ${
              tab === t ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-300'
            }`}
          >
            {t}
            {t === 'friends' && incoming.length > 0 && (
              <span className="ml-1.5 text-accent">{incoming.length}</span>
            )}
            {t === 'crews' && crewInvites.length > 0 && (
              <span className="ml-1.5 text-accent">{crewInvites.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'friends' ? (
        <div className="space-y-8">
          {/* Add people */}
          <section>
            <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Add people</h2>
            <Inp value={query} onChange={setQuery} placeholder="Search by name…" />
            <div className="space-y-2 mt-3">
              {searching && <p className="text-gray-700 text-xs">Searching…</p>}
              {results.map((p) => (
                <Row
                  key={p.id}
                  profile={p}
                  right={
                    friendIds.has(p.id) ? (
                      <span className="text-gray-600 text-xs">Friends</span>
                    ) : pendingIds.has(p.id) ? (
                      <span className="text-gray-600 text-xs">Pending</span>
                    ) : (
                      <Btn onClick={() => doSend(p.id)} cls="text-xs px-3 py-2">
                        Add
                      </Btn>
                    )
                  }
                />
              ))}
              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="text-gray-700 text-xs">No one found.</p>
              )}
            </div>
          </section>

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <section>
              <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Friend requests</h2>
              <div className="space-y-2">
                {incoming.map((r) => (
                  <Row
                    key={r.id}
                    profile={r.other}
                    right={
                      <div className="flex gap-2">
                        <Btn onClick={() => doAccept(r.id)} cls="text-xs px-3 py-2">
                          Accept
                        </Btn>
                        <Btn variant="ghost" onClick={() => doRemove(r.id)} cls="text-xs px-3 py-2">
                          Ignore
                        </Btn>
                      </div>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Friends list */}
          <section>
            <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
              Friends · {friends.length}
            </h2>
            {friends.length === 0 ? (
              <p className="text-gray-700 text-sm">No friends yet. Search above to add some.</p>
            ) : (
              <div className="space-y-2">
                {friends.map((r) => (
                  <Row
                    key={r.id}
                    profile={r.other}
                    right={
                      <Btn variant="ghost" onClick={() => doRemove(r.id)} cls="text-xs px-3 py-2">
                        Remove
                      </Btn>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Outgoing */}
          {outgoing.length > 0 && (
            <section>
              <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Sent requests</h2>
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <Row
                    key={r.id}
                    profile={r.other}
                    right={
                      <Btn variant="ghost" onClick={() => doRemove(r.id)} cls="text-xs px-3 py-2">
                        Cancel
                      </Btn>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Crew invites */}
          {crewInvites.length > 0 && (
            <section>
              <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Crew invites</h2>
              <div className="space-y-2">
                {crewInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 border border-white/[0.08] rounded-2xl p-3">
                    <div className="min-w-0">
                      <div className="text-white text-sm truncate">👯 {inv.crews?.name}</div>
                      <div className="text-gray-600 text-[11px] truncate">
                        from {inv.inviter?.name || 'a friend'}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Btn onClick={() => doAcceptCrew(inv.id)} cls="text-xs px-3 py-2">
                        Join
                      </Btn>
                      <Btn variant="ghost" onClick={() => doDeclineCrew(inv.id)} cls="text-xs px-3 py-2">
                        Decline
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Create crew */}
          <section>
            <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Start a crew</h2>
            <form onSubmit={doCreateCrew} className="flex gap-2">
              <Inp value={newCrew} onChange={setNewCrew} placeholder="Crew name" cls="flex-1" />
              <Btn type="submit" disabled={!newCrew.trim()} cls="shrink-0">
                Create
              </Btn>
            </form>
          </section>

          {/* My crews */}
          <section>
            <h2 className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
              Your crews · {crews.length}
            </h2>
            {crews.length === 0 ? (
              <p className="text-gray-700 text-sm">No crews yet. Create one or accept an invite.</p>
            ) : (
              <div className="space-y-2">
                {crews.map((c) => {
                  const isOpen = expanded === c.id
                  const memberIds = new Set(members.map((m) => m.user_id))
                  return (
                    <div key={c.id} className="border border-white/[0.08] rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggleCrew(c.id)}
                        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-white text-sm">
                          👯 {c.name}
                          {c.role === 'owner' && <span className="text-gray-600 text-[10px] ml-2">owner</span>}
                        </span>
                        <span className="text-gray-600 text-xs">{isOpen ? '−' : 'Manage'}</span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
                          <div>
                            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
                              Members · {members.length}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {members.map((m) => (
                                <span key={m.user_id} className="text-xs text-gray-300 bg-white/5 rounded-full px-2.5 py-1">
                                  {m.profile?.totem} {m.profile?.name || 'Member'}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
                              Invite a friend
                            </div>
                            {friends.length === 0 ? (
                              <p className="text-gray-700 text-xs">Add friends first, then invite them here.</p>
                            ) : (
                              <div className="space-y-2">
                                {friends
                                  .filter((f) => !memberIds.has(f.other?.id))
                                  .map((f) => (
                                    <Row
                                      key={f.id}
                                      profile={f.other}
                                      right={
                                        <Btn onClick={() => doInviteToCrew(c.id, f.other.id)} cls="text-xs px-3 py-2">
                                          Invite
                                        </Btn>
                                      }
                                    />
                                  ))}
                                {friends.filter((f) => !memberIds.has(f.other?.id)).length === 0 && (
                                  <p className="text-gray-700 text-xs">All your friends are already in this crew.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </Wrap>
  )
}
