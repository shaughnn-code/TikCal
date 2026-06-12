import { supabase } from '../supabaseClient.js'

// events.owner_id references auth.users, so PostgREST can't embed profiles
// directly. We fetch events (RLS scopes them to owner + friends + crews) and
// hydrate owner display info in a second query.
export async function fetchVisibleEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
  if (error) throw error

  const ownerIds = [...new Set(events.map((e) => e.owner_id))]
  let owners = {}
  if (ownerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, totem')
      .in('id', ownerIds)
    owners = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  }
  return events.map((e) => ({ ...e, owner: owners[e.owner_id] || null }))
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
    .select('crew_id, crews(name)')
    .eq('event_id', id)
  return { ...event, owner: owner || null, crews: ec || [] }
}

// Crews the current user belongs to.
export async function fetchMyCrews() {
  const { data, error } = await supabase
    .from('crew_members')
    .select('role, crews(id, name, description, owner_id)')
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data || []).map((r) => ({ ...r.crews, role: r.role }))
}
