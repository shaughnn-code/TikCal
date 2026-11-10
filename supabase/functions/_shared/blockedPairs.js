// Pure block-filter rule for the .ics feed. Plain JS with no imports so the
// Deno edge function and the node test runner (src/lib/blockedPairs.test.js)
// load the same file.

// rows: user_blocks rows ({ blocker_id, blocked_id }) where uid is on either
// side. Returns the ids of everyone in a blocked pair with uid, either way.
export function blockedPeerIds(rows, uid) {
  const ids = new Set()
  for (const r of rows || []) {
    if (r.blocker_id === uid && r.blocked_id !== uid) ids.add(r.blocked_id)
    else if (r.blocked_id === uid && r.blocker_id !== uid) ids.add(r.blocker_id)
  }
  return ids
}

// Drops events owned by anyone in a blocked pair with uid. uid's own events
// always stay.
export function withoutBlockedOwners(events, rows, uid) {
  const blocked = blockedPeerIds(rows, uid)
  if (!blocked.size) return events
  return events.filter((e) => e.owner_id === uid || !blocked.has(e.owner_id))
}
