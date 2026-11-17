import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withoutBlockedEvents, withoutBlockedPeople, isReportReason, REPORT_REASONS } from './blocking.js'

const ME = 'me', BAD = 'bad', OK = 'ok'

test('hides shows owned by blocked people, keeps mine and others', () => {
  const events = [
    { id: 1, owner_id: BAD, rsvps: [] },
    { id: 2, owner_id: OK, rsvps: [] },
    { id: 3, owner_id: ME, rsvps: [] },
  ]
  const out = withoutBlockedEvents(events, new Set([BAD]), ME)
  assert.deepEqual(out.map((e) => e.id), [2, 3])
})

test('never hides my own show even if my id is in the set', () => {
  const out = withoutBlockedEvents([{ id: 1, owner_id: ME, rsvps: [] }], new Set([ME]), ME)
  assert.equal(out.length, 1)
})

test('strips blocked people\'s RSVPs', () => {
  const out = withoutBlockedEvents([{ id: 1, owner_id: OK, rsvps: [{ user_id: BAD }, { user_id: OK }] }], new Set([BAD]), ME)
  assert.deepEqual(out[0].rsvps, [{ user_id: OK }])
})

test('empty block set returns the same list', () => {
  const list = [{ id: 1, owner_id: BAD }]
  assert.equal(withoutBlockedEvents(list, new Set(), ME), list)
  assert.equal(withoutBlockedPeople(list, undefined), list)
})

test('filters people by a custom id picker', () => {
  const rows = [{ other: { id: BAD } }, { other: { id: OK } }]
  assert.deepEqual(withoutBlockedPeople(rows, new Set([BAD]), (r) => r.other?.id), [{ other: { id: OK } }])
})

test('report reasons match the database check constraint', () => {
  assert.deepEqual(
    REPORT_REASONS.map((r) => r.value).sort(),
    ['harassment', 'hate', 'impersonation', 'other', 'sexual', 'spam', 'violence'],
  )
  assert.ok(isReportReason('spam'))
  assert.ok(!isReportReason('nope'))
})
