import test from 'node:test'
import assert from 'node:assert/strict'
import { pickTimeSuggestion } from './timeSuggest.js'

const candidates = [
  { title: 'Skee Mask', artist: 'Skee Mask', date: '2026-08-11', time: '23:00' },
  { title: 'Or:la B2B Antal', artist: 'Or:la, Antal', date: '2026-08-11', time: '01:30' },
  { title: 'Peggy Gou', artist: 'Peggy Gou', date: '2026-08-19', time: '22:00' },
]

test('pickTimeSuggestion matches by artist on the same date', () => {
  const r = pickTimeSuggestion(candidates, { title: 'x', artist: 'Skee Mask', date: '2026-08-11' })
  assert.equal(r.time, '23:00')
})

test('pickTimeSuggestion falls back to title when artist misses', () => {
  const r = pickTimeSuggestion(candidates, { title: 'Or:la B2B Antal', artist: '', date: '2026-08-11' })
  assert.equal(r.time, '01:30')
})

test('pickTimeSuggestion returns null when no candidate matches the date', () => {
  assert.equal(pickTimeSuggestion(candidates, { title: 'Skee Mask', artist: 'Skee Mask', date: '2026-09-01' }), null)
})

test('pickTimeSuggestion ignores candidates missing a time', () => {
  const noTime = [{ title: 'TBA Show', artist: 'TBA', date: '2026-08-11', time: '' }]
  assert.equal(pickTimeSuggestion(noTime, { title: 'TBA Show', artist: 'TBA', date: '2026-08-11' }), null)
})

test('pickTimeSuggestion with no title/artist given returns the first same-day match', () => {
  const r = pickTimeSuggestion(candidates, { title: '', artist: '', date: '2026-08-11' })
  assert.equal(r.time, '23:00')
})
