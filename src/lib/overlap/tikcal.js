import { supabase } from '../../supabaseClient.js'
import { bucketKey } from './compute.js'

// TikCal events carry a date only (no time). This is a nightlife app, so an
// event marks its date's NIGHT bucket busy. Documented assumption (design §2).
export const EVENT_DAYPART = 'night'

// Server-computed event buckets for every opted-in participant (via the
// session_event_busy definer RPC), so the picture is identical for all viewers
// incl. guests. Returns [{ participant_id, event_id, event_date }].
export async function fetchSessionEventBusy(sessionId) {
  const { data, error } = await supabase.rpc('session_event_busy', { p_session_id: sessionId })
  if (error) throw error
  return data || []
}

// Fold TikCal events into each participant's in-memory availability + events map
// used by computeOverlap. Rules (spec §4): busy wins, but a deliberate manual
// answer is never clobbered — we only fill busy where the slot is still unset.
// The events map drives shared_event detection (2+ participants, same event_id).
export function applyTikcalSource(participants, eventRows, session) {
  if (!session?.dayparts?.includes(EVENT_DAYPART)) {
    // Night isn't an in-criteria daypart; nothing to bucket.
    return (participants || []).map((p) => ({ ...p, events: p.events || {} }))
  }
  const byParticipant = {}
  for (const r of eventRows || []) {
    (byParticipant[r.participant_id] ||= []).push(r)
  }
  return (participants || []).map((p) => {
    const rows = byParticipant[p.id]
    if (!rows?.length) return { ...p, events: p.events || {} }
    const availability = { ...(p.availability || {}) }
    const events = { ...(p.events || {}) }
    for (const r of rows) {
      const key = bucketKey(r.event_date, EVENT_DAYPART)
      events[key] = r.event_id
      if (availability[key] == null) availability[key] = 'busy'
    }
    return { ...p, availability, events }
  })
}
