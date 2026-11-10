import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blockedPeerIds, withoutBlockedOwners } from '../../supabase/functions/_shared/blockedPairs.js'

const ME = 'me'

test('blockedPeerIds covers both directions and ignores unrelated rows', () => {
  const rows = [
    { blocker_id: ME, blocked_id: 'iBlocked' },
    { blocker_id: 'blockedMe', blocked_id: ME },
    { blocker_id: 'x', blocked_id: 'y' },
  ]
  assert.deepEqual([...blockedPeerIds(rows, ME)].sort(), ['blockedMe', 'iBlocked'])
  assert.equal(blockedPeerIds(null, ME).size, 0)
})

test('withoutBlockedOwners drops shows from either side of a block, keeps mine', () => {
  const events = [
    { id: 1, owner_id: 'iBlocked' },
    { id: 2, owner_id: 'blockedMe' },
    { id: 3, owner_id: 'friend' },
    { id: 4, owner_id: ME },
  ]
  const rows = [
    { blocker_id: ME, blocked_id: 'iBlocked' },
    { blocker_id: 'blockedMe', blocked_id: ME },
  ]
  assert.deepEqual(withoutBlockedOwners(events, rows, ME).map((e) => e.id), [3, 4])
})

test('withoutBlockedOwners returns the list untouched when there are no blocks', () => {
  const events = [{ id: 1, owner_id: 'a' }]
  assert.equal(withoutBlockedOwners(events, [], ME), events)
})
