import { supabase } from '../supabaseClient.js'

// events.owner_id references auth.users, so PostgREST can't embed profiles
// directly. We fetch events (RLS scopes them to owner + friends + crews) and
// hydrate owner display info, shared-crew colors, and RSVP tallies in follow-up
// queries.
export async function fetchVisibleEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
  if (error) throw error
  if (!events.length) return []

  const ids = events.map((e) => e.id)
  const ownerIds = [...new Set(events.map((e) => e.owner_id))]

  const [{ data: profiles }, { data: ec }, { data: rsvps }] = await Promise.all([
    supabase.from('profiles').select('id, name, totem').in('id', ownerIds),
    supabase.from('event_crews').select('event_id, crew_id, crews(name, color)').in('event_id', ids),
    supabase.from('event_rsvps').select('event_id, user_id, status').in('event_id', ids),
  ])

  const owners = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  const crewsByEvent = groupBy(ec || [], 'event_id', (r) => ({
    crew_id: r.crew_id,
    name: r.crews?.name || null,
    color: r.crews?.color || null,
  }))
  const rsvpsByEvent = groupBy(rsvps || [], 'event_id', (r) => ({ user_id: r.user_id, status: r.status }))

  return events.map((e) => ({
    ...e,
    owner: owners[e.owner_id] || null,
    crews: crewsByEvent[e.id] || [],
    rsvps: rsvpsByEvent[e.id] || [],
  }))
}

// Small grouping helper: rows → { [key]: mapped[] }.
function groupBy(rows, key, map) {
  const out = {}
  for (const r of rows) (out[r[key]] = out[r[key]] || []).push(map(r))
  return out
}

export async function fetchEvent(id) {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!event) return null
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, name, totem')
    .eq('id', event.owner_id)
    .maybeSingle()
  // Crews this event is shared into (only those the viewer can see).
  const { data: ec } = await supabase
    .from('event_crews')
    .select('crew_id, crews(name, color)')
    .eq('event_id', id)
  // RSVPs, hydrated with each attendee's display info.
  const { data: rsvpRows } = await supabase
    .from('event_rsvps')
    .select('user_id, status, updated_at')
    .eq('event_id', id)
  let rsvps = []
  if (rsvpRows?.length) {
    const { data: rp } = await supabase
      .from('profiles')
      .select('id, name, totem')
      .in('id', rsvpRows.map((r) => r.user_id))
    const byId = Object.fromEntries((rp || []).map((p) => [p.id, p]))
    rsvps = rsvpRows.map((r) => ({ ...r, profile: byId[r.user_id] || null }))
  }
  const crews = (ec || []).map((c) => ({ crew_id: c.crew_id, name: c.crews?.name || null, color: c.crews?.color || null }))
  return { ...event, owner: owner || null, crews, rsvps }
}

// Set (or change) the current user's RSVP on an event.
export async function setRsvp(eventId, userId, status) {
  return supabase
    .from('event_rsvps')
    .upsert({ event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })
}

// Clear the current user's RSVP entirely.
export async function clearRsvp(eventId, userId) {
  return supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId)
}

// The current user's email-import token (creates one on first read).
export async function getInboxToken(userId) {
  let { data } = await supabase.from('user_inbox').select('token').eq('user_id', userId).maybeSingle()
  if (!data) {
    const ins = await supabase.from('user_inbox').insert({ user_id: userId }).select('token').single()
    data = ins.data
  }
  return data?.token || null
}

// Crews the current user belongs to.
export async function fetchMyCrews() {
  const { data, error } = await supabase
    .from('crew_members')
    .select('role, crews(id, name, description, owner_id, color)')
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data || []).map((r) => ({ ...r.crews, role: r.role }))
}
