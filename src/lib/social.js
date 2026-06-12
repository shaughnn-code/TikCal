import { supabase } from '../supabaseClient.js'

async function profilesByIds(ids) {
  const unique = [...new Set(ids)].filter(Boolean)
  if (!unique.length) return {}
  const { data } = await supabase
    .from('profiles')
    .select('id, name, totem, favorite_venue')
    .in('id', unique)
  return Object.fromEntries((data || []).map((p) => [p.id, p]))
}

// Categorize friendships relative to the current user.
export async function loadFriends(myId) {
  const { data, error } = await supabase.from('friendships').select('*')
  if (error) throw error
  const rows = data || []
  const otherId = (r) => (r.requester_id === myId ? r.addressee_id : r.requester_id)
  const profs = await profilesByIds(rows.map(otherId))

  const friends = []
  const incoming = []
  const outgoing = []
  for (const r of rows) {
    const withProfile = { ...r, other: profs[otherId(r)] || null }
    if (r.status === 'accepted') friends.push(withProfile)
    else if (r.addressee_id === myId) incoming.push(withProfile)
    else outgoing.push(withProfile)
  }
  return { friends, incoming, outgoing }
}

export async function searchPeople(query, myId) {
  const q = query.trim()
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, totem, favorite_venue')
    .ilike('name', `%${q}%`)
    .neq('id', myId)
    .limit(10)
  if (error) throw error
  return data || []
}

export async function sendFriendRequest(addresseeId, myId) {
  return supabase.from('friendships').insert({ requester_id: myId, addressee_id: addresseeId })
}

export async function acceptFriend(id) {
  return supabase.from('friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id)
}

export async function removeFriend(id) {
  return supabase.from('friendships').delete().eq('id', id)
}

// ─── CREWS ──────────────────────────────────────────────────────────────────

export async function loadCrewInvites(myId) {
  const { data, error } = await supabase
    .from('crew_invites')
    .select('id, crew_id, inviter_id, status, crews(name, description)')
    .eq('invitee_id', myId)
    .eq('status', 'pending')
  if (error) throw error
  const rows = data || []
  const profs = await profilesByIds(rows.map((r) => r.inviter_id))
  return rows.map((r) => ({ ...r, inviter: profs[r.inviter_id] || null }))
}

export async function createCrew(name, myId) {
  return supabase.from('crews').insert({ name: name.trim(), owner_id: myId }).select().single()
}

export async function inviteToCrew(crewId, inviteeId, myId) {
  return supabase.from('crew_invites').insert({ crew_id: crewId, inviter_id: myId, invitee_id: inviteeId })
}

export async function acceptCrewInvite(inviteId) {
  return supabase.rpc('accept_crew_invite', { p_invite: inviteId })
}

export async function declineCrewInvite(inviteId) {
  return supabase.from('crew_invites').update({ status: 'declined' }).eq('id', inviteId)
}

export async function loadCrewMembers(crewId) {
  const { data } = await supabase.from('crew_members').select('user_id, role').eq('crew_id', crewId)
  const profs = await profilesByIds((data || []).map((m) => m.user_id))
  return (data || []).map((m) => ({ ...m, profile: profs[m.user_id] || null }))
}
