// Run: node --test
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeOverlap, buckets, inCriteriaDates, bucketKey, bestWindows } from './compute.js'

// A Fri–Sun, nights-only session over one week.
const session = {
  range_start: '2026-07-06', // Monday
  range_end: '2026-07-12', // Sunday
  days_of_week: [0, 5, 6], // Sun, Fri, Sat
  dayparts: ['night'],
}

test('inCriteriaDates keeps only selected weekdays', () => {
  const dates = inCriteriaDates(session).map((d) => d.dateStr)
  assert.deepEqual(dates, ['2026-07-10', '2026-07-11', '2026-07-12']) // Fri, Sat, Sun
})

test('buckets expands date × daypart', () => {
  const keys = buckets(session).map((b) => b.key)
  assert.deepEqual(keys, [
    '2026-07-10:night',
    '2026-07-11:night',
    '2026-07-12:night',
  ])
})

const K = (d) => bucketKey(d, 'night')

test('all_free when everyone is free', () => {
  const parts = [
    { id: 'a', availability: { [K('2026-07-10')]: 'free' } },
    { id: 'b', availability: { [K('2026-07-10')]: 'free' } },
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-10'))
  assert.equal(cell.state, 'all_free')
  assert.equal(cell.freeCount, 2)
  assert.equal(cell.total, 2)
})

test('partial when 2+ free but not all', () => {
  const parts = [
    { id: 'a', availability: { [K('2026-07-10')]: 'free' } },
    { id: 'b', availability: { [K('2026-07-10')]: 'free' } },
    { id: 'c', availability: { [K('2026-07-10')]: 'busy' } },
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-10'))
  assert.equal(cell.state, 'partial')
  assert.equal(cell.freeCount, 2)
})

test('blocked when someone busy and fewer than 2 free', () => {
  const parts = [
    { id: 'a', availability: { [K('2026-07-10')]: 'free' } },
    { id: 'b', availability: { [K('2026-07-10')]: 'busy' } },
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-10'))
  assert.equal(cell.state, 'blocked')
})

test('unknown when nobody busy and fewer than 2 free', () => {
  const parts = [
    { id: 'a', availability: { [K('2026-07-10')]: 'free' } },
    { id: 'b', availability: {} }, // unanswered
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-10'))
  assert.equal(cell.state, 'unknown')
  assert.equal(cell.unknownIds.length, 1)
})

test('shared_event wins even when a holder is marked busy', () => {
  const parts = [
    { id: 'a', availability: { [K('2026-07-11')]: 'busy' }, events: { [K('2026-07-11')]: 'evt-9' } },
    { id: 'b', availability: { [K('2026-07-11')]: 'busy' }, events: { [K('2026-07-11')]: 'evt-9' } },
    { id: 'c', availability: { [K('2026-07-11')]: 'free' } },
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-11'))
  assert.equal(cell.state, 'shared_event')
  assert.equal(cell.sharedEventId, 'evt-9')
  // sharedIds names the attendees, so the UI can say "2 going" rather than
  // reporting them as busy.
  assert.deepEqual(cell.sharedIds.sort(), ['a', 'b'])
})

test('when a bucket holds two shared events, the most-attended one wins', () => {
  const ev = (id) => ({ [K('2026-07-11')]: id })
  const parts = [
    { id: 'a', availability: {}, events: ev('evt-small') },
    { id: 'b', availability: {}, events: ev('evt-small') },
    { id: 'c', availability: {}, events: ev('evt-big') },
    { id: 'd', availability: {}, events: ev('evt-big') },
    { id: 'e', availability: {}, events: ev('evt-big') },
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-11'))
  assert.equal(cell.sharedEventId, 'evt-big')
  assert.deepEqual(cell.sharedIds.sort(), ['c', 'd', 'e'])
})

test('sharedIds is empty for a non-shared cell', () => {
  const parts = [{ id: 'a', availability: { [K('2026-07-11')]: 'free' } }]
  const cell = computeOverlap(parts, session).get(K('2026-07-11'))
  assert.deepEqual(cell.sharedIds, [])
})

test('a single event held by one person is NOT shared', () => {
  const parts = [
    { id: 'a', availability: {}, events: { [K('2026-07-11')]: 'evt-9' } },
    { id: 'b', availability: { [K('2026-07-11')]: 'free' } },
  ]
  const cell = computeOverlap(parts, session).get(K('2026-07-11'))
  assert.notEqual(cell.state, 'shared_event')
})

test('bestWindows ranks shared_event, then all_free, then partial', () => {
  const parts = [
    // 07-10 all_free, 07-11 shared_event, 07-12 partial
    { id: 'a', availability: { [K('2026-07-10')]: 'free', [K('2026-07-12')]: 'free' }, events: { [K('2026-07-11')]: 'e' } },
    { id: 'b', availability: { [K('2026-07-10')]: 'free', [K('2026-07-12')]: 'busy' }, events: { [K('2026-07-11')]: 'e' } },
  ]
  const overlap = computeOverlap(parts, session)
  const ranked = bestWindows(overlap, session).map((r) => `${r.dateStr}:${r.state}`)
  assert.deepEqual(ranked, [
    '2026-07-11:shared_event',
    '2026-07-10:all_free',
  ])
})
