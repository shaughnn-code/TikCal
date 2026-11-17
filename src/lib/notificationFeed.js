// Pure assembly of the notifications feed (no Supabase import, so it is
// unit-testable under plain node).

// Newest first. `unread` drives the badge; `kind` drives the row.
export function buildFeed({ incoming = [], friends = [], invites = [], nudges = [] }, myId, seenAt = '') {
  const items = [
    ...incoming.map((r) => ({
      key: `req-${r.id}`, kind: 'friend_request', at: r.created_at || '', unread: true, person: r.other, row: r,
    })),
    ...friends
      .filter((r) => r.requester_id === myId)
      .map((r) => {
        const at = r.updated_at || r.created_at || ''
        return { key: `acc-${r.id}`, kind: 'friend_accepted', at, unread: !!at && at > seenAt, person: r.other, row: r }
      }),
    ...invites.map((r) => ({
      key: `inv-${r.id}`, kind: 'crew_invite', at: r.created_at || '', unread: true, person: r.inviter, row: r,
    })),
    ...nudges.map((n) => ({
      key: `nudge-${n.id}`, kind: 'nudge', at: n.created_at, unread: !n.read_at, person: n.sender, row: n,
    })),
  ]
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}
