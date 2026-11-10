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
    .select('id, crew_id, inviter_id, status, created_at, crews(name, description)')
    .eq('invitee_id', myId)
    .eq('status', 'pending')
  if (error) throw error
  const rows = data || []
  const profs = await profilesByIds(rows.map((r) => r.inviter_id))
  return rows.map((r) => ({ ...r, inviter: profs[r.inviter_id] || null }))
}

export async function createCrew(name, myId, color) {
  const row = { name: name.trim(), owner_id: myId }
  if (color) row.color = color
  return supabase.from('crews').insert(row).select().single()
}

// Recolor a crew (owner only — enforced by RLS on the crews table).
export async function updateCrewColor(crewId, color) {
  return supabase.from('crews').update({ color }).eq('id', crewId)
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

// Ranks crew members by shows they've shared into this crew that have
// already happened. Members with zero shows attended aren't returned by the
// RPC, so the caller should fill those in at rank-last if it wants a
// complete roster.
export async function fetchCrewShowStats(crewId) {
  const { data, error } = await supabase.rpc('crew_show_stats', { p_crew: crewId })
  if (error) throw error
  return data || []
}

// ─── BLOCK + REPORT ─────────────────────────────────────────────────────────
// Blocks are enforced in the database (block_user cuts friendships, invites and
// nudges; new requests/invites between the pair are refused). These calls are
// the client side of that; see supabase/migrations/20261109120000_block_and_report.sql.

// Ids of people I blocked (RLS only returns my own blocks).
export async function loadBlockedIds() {
  const { data, error } = await supabase.from('user_blocks').select('blocked_id')
  if (error) return new Set()
  return new Set((data || []).map((r) => r.blocked_id))
}

// People I blocked, with names, for the Profile "Blocked people" list.
export async function loadBlockedPeople() {
  const { data, error } = await supabase.from('user_blocks').select('blocked_id, created_at').order('created_at', { ascending: false })
  if (error) throw error
  const profs = await profilesByIds((data || []).map((r) => r.blocked_id))
  return (data || []).map((r) => ({ id: r.blocked_id, created_at: r.created_at, profile: profs[r.blocked_id] || null }))
}

export async function blockUser(userId) {
  return supabase.rpc('block_user', { p_user: userId })
}

export async function unblockUser(userId) {
  return supabase.from('user_blocks').delete().eq('blocked_id', userId)
}

// Files a report, then asks report-alert to email the team. The alert is best
// effort: the report is saved either way and reviewed from the dashboard.
export async function reportContent({ userId = null, eventId = null, reason, details = '' }) {
  const { data: reportId, error } = await supabase.rpc('report_content', {
    p_user: userId,
    p_event: eventId,
    p_reason: reason,
    p_details: details,
  })
  if (error) return { error }
  try {
    await supabase.functions.invoke('report-alert', { body: { report_id: reportId } })
  } catch { /* report is stored; the alert can be resent from the dashboard */ }
  return { data: reportId, error: null }
}
