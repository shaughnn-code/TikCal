import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CACHE_TTL_MS,
  MISS_WAIT_MS,
  RETRY_AFTER_MS,
  UPSTREAM_TIMEOUT_MS,
  claimCutoff,
  mapDiceEvents,
  mapRaEvents,
  nycToday,
  planCache,
  upcomingOnly,
} from './discoveryCache.js'

const NOW = Date.parse('2026-11-10T18:00:00Z')
const ago = (ms) => new Date(NOW - ms).toISOString()
const MIN = 60 * 1000

test('cold-cache wait fits the 60s client clock; scrape fits the 150s edge wall clock', () => {
  assert.ok(MISS_WAIT_MS < 60 * 1000)
  assert.ok(UPSTREAM_TIMEOUT_MS < 150 * 1000)
})

test('worst case (every scrape fails) stays under 200 credits/month', () => {
  const month = 30 * 24 * 60 * MIN
  assert.ok(month / RETRY_AFTER_MS < 200)
  assert.ok(month / CACHE_TTL_MS < 200)
})

test('never-fetched, never-attempted row is a miss that should refresh', () => {
  assert.deepEqual(planCache({ events: [], fetched_at: null, attempted_at: null }, NOW), { status: 'miss', refresh: true })
  assert.deepEqual(planCache(null, NOW), { status: 'miss', refresh: true })
})

test('fresh row is a hit and does not refresh', () => {
  const row = { fetched_at: ago(10 * MIN), attempted_at: ago(10 * MIN) }
  assert.deepEqual(planCache(row, NOW), { status: 'hit', refresh: false })
})

test('stale row is served and refreshes once the last attempt is old', () => {
  const row = { fetched_at: ago(CACHE_TTL_MS + MIN), attempted_at: ago(CACHE_TTL_MS + MIN) }
  assert.deepEqual(planCache(row, NOW), { status: 'stale', refresh: true })
})

test('recent failed attempt backs off (stale and miss)', () => {
  const stale = { fetched_at: ago(CACHE_TTL_MS * 2), attempted_at: ago(5 * MIN) }
  assert.deepEqual(planCache(stale, NOW), { status: 'stale', refresh: false })
  const miss = { fetched_at: null, attempted_at: ago(5 * MIN) }
  assert.deepEqual(planCache(miss, NOW), { status: 'miss', refresh: false })
})

test('an expired lease can be retried', () => {
  const row = { fetched_at: null, attempted_at: ago(RETRY_AFTER_MS + MIN) }
  assert.deepEqual(planCache(row, NOW), { status: 'miss', refresh: true })
})

test('garbage timestamps are treated as missing', () => {
  assert.deepEqual(planCache({ fetched_at: 'nope', attempted_at: 'nope' }, NOW), { status: 'miss', refresh: true })
})

test('claimCutoff is now minus the retry window', () => {
  assert.equal(claimCutoff(NOW), new Date(NOW - RETRY_AFTER_MS).toISOString())
})

test('mapRaEvents maps the confirmed RA shape', () => {
  const payload = {
    status: 'success',
    data: {
      events: [
        {
          id: 123,
          title: 'Night',
          date: '2026-11-12T00:00:00.000',
          start_time: '2026-11-12T22:00:00.000',
          content_url: '/events/123',
          flyer_url: 'https://img/x.jpg',
          artists: [{ name: 'A' }, { name: 'B' }, {}],
          venue: { name: 'Nowadays' },
          area: 'New York',
        },
        { id: 9, title: 'No date' },
      ],
    },
  }
  assert.deepEqual(mapRaEvents(payload), [
    {
      id: '123',
      title: 'Night',
      artist: 'A, B',
      attractions: ['A', 'B'],
      date: '2026-11-12',
      time: '22:00',
      venue: 'Nowadays',
      city: 'New York',
      url: 'https://ra.co/events/123',
      image: 'https://img/x.jpg',
    },
  ])
})

test('mapDiceEvents maps the confirmed DICE shape', () => {
  const payload = {
    data: {
      events: [
        { id: 'd1', name: 'Show', event_start_date: '2026-11-13T20:30:00-05:00', venue_name: 'Elsewhere', image_square: 'i', tags: ['techno'], url: null },
      ],
    },
  }
  assert.deepEqual(mapDiceEvents(payload), [
    { id: 'd1', title: 'Show', artist: '', attractions: [], date: '2026-11-13', time: '20:30', venue: 'Elsewhere', city: 'New York', url: '', image: 'i', genre: 'techno' },
  ])
})

test('mappers return [] for error or unexpected payloads', () => {
  for (const p of [null, {}, { data: {} }, { data: { events: 'x' } }, { status: 'error', message: 'out of credits' }]) {
    assert.deepEqual(mapRaEvents(p), [])
    assert.deepEqual(mapDiceEvents(p), [])
  }
})

test('upcomingOnly drops past shows', () => {
  const ev = [{ date: '2026-11-09' }, { date: '2026-11-10' }, { date: '2026-11-11' }, {}]
  assert.deepEqual(upcomingOnly(ev, '2026-11-10'), [{ date: '2026-11-10' }, { date: '2026-11-11' }])
  assert.deepEqual(upcomingOnly(null, '2026-11-10'), [])
})

test('nycToday uses New York time, not UTC', () => {
  // 02:00 UTC on Nov 11 is still Nov 10 in New York.
  assert.equal(nycToday(Date.parse('2026-11-11T02:00:00Z')), '2026-11-10')
})
