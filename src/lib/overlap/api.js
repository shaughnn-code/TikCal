import { supabase } from '../../supabaseClient.js'

// Data access for Overlap. Cross-participant reads/writes go through the
// SECURITY DEFINER RPCs (see supabase/migrations/20260707000001_overlap_feature.sql);
// the creator's own sessions list uses a direct RLS-scoped select.

// ── Guest capability token (participant id) ──────────────────────────────────
const guestKey = (sessionId) => `overlap:guest:${sessionId}`
export const getGuestParticipantId = (sessionId) => {
  try { return localStorage.getItem(guestKey(sessionId)) } catch { return null }
}
export const setGuestParticipantId = (sessionId, participantId) => {
  try { localStorage.setItem(guestKey(sessionId), participantId) } catch { /* private mode */ }
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export async function listMySessions() {
  const { data, error } = await supabase
    .from('overlap_sessions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Create a session and auto-join the creator as the first participant.
export async function createSession(fields, creatorDisplayName) {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('Not signed in')

  const { data: session, error } = await supabase
    .from('overlap_sessions')
    .insert({
      creator_id: uid,
      name: fields.name?.trim() || 'Untitled Overlap',
      timezone: fields.timezone || 'America/New_York',
      range_start: fields.rangeStart,
      range_end: fields.rangeEnd,
      days_of_week: fields.daysOfWeek,
      dayparts: fields.dayparts,
      city: fields.city || null,
    })
    .select()
    .single()
  if (error) throw error

  await joinSession(session.id, creatorDisplayName || 'Me')
  return session
}

export async function updateSessionCriteria(sessionId, patch) {
  const { data, error } = await supabase
    .from('overlap_sessions')
    .update(patch)
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSession(sessionId) {
  const { error } = await supabase.from('overlap_sessions').delete().eq('id', sessionId)
  if (error) throw error
}

// ── RPC-backed reads/writes ──────────────────────────────────────────────────

// Returns { session, participants } | { error: 'expired' } | null (not found).
export async function getSession(sessionId) {
  const { data, error } = await supabase.rpc('get_session', { p_session_id: sessionId })
  if (error) throw error
  return data
}

// Join (idempotent for logged-in users). Returns the participant row, or
// { error: 'full' | 'expired' | 'not_found' }.
export async function joinSession(sessionId, displayName) {
  const { data, error } = await supabase.rpc('join_session', {
    p_session_id: sessionId,
    p_display_name: displayName,
  })
  if (error) throw error
  if (data && !data.error) {
    // Persist the participant id so guests can re-edit on return visits.
    setGuestParticipantId(sessionId, data.id)
  }
  return data
}

export async function updateAvailability(sessionId, participantId, availability, sources) {
  const { data, error } = await supabase.rpc('update_availability', {
    p_session_id: sessionId,
    p_participant_id: participantId,
    p_availability: availability,
    p_sources: sources ?? null,
  })
  if (error) throw error
  return data
}

// ── Realtime ─────────────────────────────────────────────────────────────────
// Live grid updates as participants fill in. Returns an unsubscribe fn.
export function subscribeParticipants(sessionId, onChange) {
  const channel = supabase
    .channel(`overlap:${sessionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'overlap_participants', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
