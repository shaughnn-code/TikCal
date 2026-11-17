import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFeed } from './notificationFeed.js'

const ME = 'me'

test('buildFeed merges every source newest-first and flags what is new', () => {
  const feed = buildFeed(
    {
      incoming: [{ id: 1, created_at: '2026-10-01T00:00:00Z', other: { name: 'Ana' } }],
      friends: [
        { id: 2, requester_id: ME, updated_at: '2026-10-05T00:00:00Z', other: { name: 'Bo' } },
        { id: 3, requester_id: 'someone-else', updated_at: '2026-10-06T00:00:00Z' },
      ],
      invites: [{ id: 4, created_at: '2026-10-03T00:00:00Z', inviter: { name: 'Cy' } }],
      nudges: [{ id: 5, created_at: '2026-10-07T00:00:00Z', read_at: null, sender: { name: 'Di' } }],
    },
    ME,
    '2026-10-06T00:00:00Z',
  )

  // Requests I accepted myself (id 3) are not news to me.
  assert.deepEqual(feed.map((i) => i.key), ['nudge-5', 'acc-2', 'inv-4', 'req-1'])
  // An acceptance older than the last visit is no longer new.
  assert.equal(feed.find((i) => i.key === 'acc-2').unread, false)
  assert.equal(feed.filter((i) => i.unread).length, 3)
})

test('buildFeed: an acceptance newer than the last visit is unread, a read nudge is not', () => {
  const feed = buildFeed(
    {
      friends: [{ id: 2, requester_id: ME, updated_at: '2026-10-05T00:00:00Z' }],
      nudges: [{ id: 5, created_at: '2026-10-04T00:00:00Z', read_at: '2026-10-04T01:00:00Z' }],
    },
    ME,
    '',
  )
  assert.equal(feed[0].key, 'acc-2')
  assert.equal(feed[0].unread, true)
  assert.equal(feed[1].unread, false)
})
