// Pure helpers for block + report (no Supabase import, so they unit-test
// under plain node). The database enforces blocks on new ties; these hide
// content from people you blocked that the database still lets you see
// (shows they share into a crew you're both in, their RSVPs, search results).

// What someone can be reported for. `value` matches the user_reports.reason
// check constraint.
export const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'sexual', label: 'Sexual or explicit content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'other', label: 'Something else' },
]

export const REPORT_DETAILS_MAX = 1000

export const isReportReason = (v) => REPORT_REASONS.some((r) => r.value === v)

// Drops events owned by blocked people (your own always stay) and strips
// blocked people's RSVPs from the rest.
export function withoutBlockedEvents(events, blocked, myId) {
  if (!blocked?.size) return events
  return events
    .filter((e) => e.owner_id === myId || !blocked.has(e.owner_id))
    .map((e) => (Array.isArray(e.rsvps) ? { ...e, rsvps: e.rsvps.filter((r) => !blocked.has(r.user_id)) } : e))
}

// Drops people you blocked from any list; `idOf` picks the person's id.
export function withoutBlockedPeople(list, blocked, idOf = (p) => p?.id) {
  if (!blocked?.size) return list
  return list.filter((item) => !blocked.has(idOf(item)))
}
