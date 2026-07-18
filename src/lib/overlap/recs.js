import { supabase } from '../../supabaseClient.js'

// Event recommendations for a tapped Overlap window (spec §6). Backed by the
// overlap-recommendations edge function, which validates the session UUID as the
// capability (guest-safe) and ranks two sources against the group's taste:
//   dice  — unofficial DICE discovery feed for the night
//   saved — shows a participant already Smart-Added on that date
//
// Returns { configured, tasteCount, dice: [], saved: [] }. `configured` is false
// when the DICE feed isn't wired up (no DICE_API_BASE secret) — the saved-events
// section still works regardless.

const cache = new Map() // `${sessionId}:${date}` -> Promise<result>
const EMPTY = { configured: false, tasteCount: 0, dice: [], saved: [] }

export function fetchWindowRecs(sessionId, dateStr) {
  if (!sessionId || !dateStr) return Promise.resolve(EMPTY)
  const key = `${sessionId}:${dateStr}`
  if (cache.has(key)) return cache.get(key)

  const p = supabase.functions
    .invoke('overlap-recommendations', { body: { session_id: sessionId, date: dateStr } })
    .then(({ data, error }) => {
      if (error || !data || data.error) return EMPTY
      return {
        configured: !!data.configured,
        tasteCount: data.tasteCount || 0,
        dice: data.dice || [],
        saved: data.saved || [],
      }
    })
    .catch(() => EMPTY)

  cache.set(key, p)
  return p
}
