import { supabase } from '../supabaseClient.js'
import { loadFriends, loadCrewInvites } from './social.js'
import { buildFeed } from './notificationFeed.js'

// The notifications feed is assembled, not stored: friend requests, accepted
// requests, and crew invites are read straight off the tables that already
// hold them. Only nudges have a table of their own (event_nudges).

const SEEN_KEY = 'tikcal.notifications.seenAt'

// Last time this device opened the notifications page. Device-local on
// purpose: it only decides which already-answered items still count as new.
export const getSeenAt = () => {
  try {
    return localStorage.getItem(SEEN_KEY) || ''
  } catch {
    return ''
  }
}
export const markSeenNow = () => {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString())
  } catch {
    /* private mode: the badge just won't clear for answered items */
  }
}

async function loadNudges(myId) {
  const { data, error } = await supabase
    .from('event_nudges')
    .select('id, event_id, sender_id, created_at, read_at')
    .eq('recipient_id', myId)
    .order('created_at', { ascending: false })
    .limit(50)
  // A missing table (migration not applied yet) must not take the page down.
  if (error || !data?.length) return []
  const [{ data: events }, { data: profiles }] = await Promise.all([
    supabase.from('events').select('id, title, artist, event_date, venue').in('id', [...new Set(data.map((n) => n.event_id))]),
    supabase.from('profiles').select('id, name, totem').in('id', [...new Set(data.map((n) => n.sender_id))]),
  ])
  const evById = Object.fromEntries((events || []).map((e) => [e.id, e]))
  const pById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  return data
    // The show may have been unshared or deleted since; drop what can't be opened.
    .filter((n) => evById[n.event_id])
    .map((n) => ({ ...n, event: evById[n.event_id], sender: pById[n.sender_id] || null }))
}

export async function loadNotifications(myId) {
  // First run on this device: start the clock now, so a backlog of long-since
  // accepted friend requests doesn't arrive as a wall of "new".
  if (!getSeenAt()) markSeenNow()
  const [{ friends, incoming }, invites, nudges] = await Promise.all([
    loadFriends(myId),
    loadCrewInvites(myId).catch(() => []),
    loadNudges(myId),
  ])
  return buildFeed({ incoming, friends, invites, nudges }, myId, getSeenAt())
}

export async function markNudgesRead(ids) {
  if (!ids.length) return
  await supabase.from('event_nudges').update({ read_at: new Date().toISOString() }).in('id', ids)
}

// ─── Sending ────────────────────────────────────────────────────────────────

// Returns { data: <number of new nudges>, error }.
export function nudgeEvent(eventId, { users = [], crews = [] }) {
  return supabase.rpc('nudge_event', { p_event: eventId, p_users: users, p_crews: crews })
}

// Who the owner has already nudged about this show (recipient ids).
export async function loadSentNudges(eventId, myId) {
  const { data } = await supabase.from('event_nudges').select('recipient_id').eq('event_id', eventId).eq('sender_id', myId)
  return (data || []).map((r) => r.recipient_id)
}
