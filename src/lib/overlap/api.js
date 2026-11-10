import { supabase } from '../../supabaseClient.js'
import { readGuestToken, writeGuestToken, hasLegacyGuest } from './guestToken.js'

// Data access for Overlap. Cross-participant reads/writes go through the
// SECURITY DEFINER RPCs (see supabase/migrations/20261110130000_overlap_guest_tokens.sql);
// the creator's own sessions list uses a direct RLS-scoped select.

// ── Guest secret ─────────────────────────────────────────────────────────────
// join_session() returns a guest_token once, to the guest who joined. It is the
// guest's only way to edit their row, so it lives in this browser's storage.
// Participant ids are public and authorize nothing. See guestToken.js.
const store = () => {
  try { return globalThis.localStorage } catch { return undefined }
}
export const getGuestToken = (sessionId) => readGuestToken(store(), sessionId)
export const isLegacyGuest = (sessionId) => hasLegacyGuest(store(), sessionId)

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

// Returns { session, is_creator, participants } | { error: 'expired' } | null.
// Each participant: { id, display_name, color, sources, availability,
// google_synced_at, joined_at, is_me }. Other people's user_ids never appear.
export async function getSession(sessionId) {
  const { data, error } = await supabase.rpc('get_session', {
    p_session_id: sessionId,
    p_guest_token: getGuestToken(sessionId),
  })
  if (error) throw error
  return data
}

// Join (idempotent for logged-in users). Returns the caller's participant, or
// { error: 'full' | 'expired' | 'not_found' }. A new guest also gets
// guest_token, which is saved here and never sent back by the server again.
export async function joinSession(sessionId, displayName) {
  const { data, error } = await supabase.rpc('join_session', {
    p_session_id: sessionId,
    p_display_name: displayName,
  })
  if (error) throw error
  if (data?.guest_token) {
    writeGuestToken(store(), sessionId, data.guest_token)
    delete data.guest_token
  }
  return data
}

// Save the caller's own availability. The server picks the row from the login
// or the guest token; participantId only has to match it.
export async function updateAvailability(sessionId, participantId, availability, sources) {
  const { data, error } = await supabase.rpc('update_availability', {
    p_session_id: sessionId,
    p_participant_id: participantId ?? null,
    p_availability: availability,
    p_sources: sources ?? null,
    p_guest_token: getGuestToken(sessionId),
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error === 'forbidden' ? 'You can only edit your own nights.' : data.error)
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
