import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toISO, fromISO, addDays, presets, activePreset, monthGrid, shiftMonth,
  selectDay, previewRange, inRange, eventCounts, formatRange,
} from './dateRange.js'

test('toISO / fromISO / addDays round-trip across month and year ends', () => {
  assert.equal(toISO(fromISO('2026-11-05')), '2026-11-05')
  assert.equal(addDays('2026-11-30', 1), '2026-12-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

// 2026-11-16 is a Monday; 11-20 Fri; 11-21 Sat; 11-22 Sun.
const P = (today) => Object.fromEntries(presets(today).map((p) => [p.id, [p.from, p.until]]))

test('presets: today, tomorrow, next 7 / 30 days', () => {
  const p = P('2026-11-16')
  assert.deepEqual(p.today, ['2026-11-16', '2026-11-16'])
  assert.deepEqual(p.tomorrow, ['2026-11-17', '2026-11-17'])
  assert.deepEqual(p.week, ['2026-11-16', '2026-11-22'])
  assert.deepEqual(p.month, ['2026-11-16', '2026-12-15'])
})

test('presets: weekend is Fri–Sun, shrinking to what is left of it', () => {
  assert.deepEqual(P('2026-11-16').weekend, ['2026-11-20', '2026-11-22']) // Mon
  assert.deepEqual(P('2026-11-19').weekend, ['2026-11-20', '2026-11-22']) // Thu
  assert.deepEqual(P('2026-11-20').weekend, ['2026-11-20', '2026-11-22']) // Fri
  assert.deepEqual(P('2026-11-21').weekend, ['2026-11-21', '2026-11-22']) // Sat
  assert.deepEqual(P('2026-11-22').weekend, ['2026-11-22', '2026-11-22']) // Sun
})

test('activePreset finds the matching quick range, or null', () => {
  assert.equal(activePreset('2026-11-16', '2026-11-20', '2026-11-22'), 'weekend')
  assert.equal(activePreset('2026-11-16', '2026-11-16', '2026-11-16'), 'today')
  assert.equal(activePreset('2026-11-16', '2026-11-17', '2026-11-19'), null)
  assert.equal(activePreset('2026-11-16', '', ''), null)
})

test('monthGrid: 42 Sunday-first cells, with out-of-month padding', () => {
  const g = monthGrid(2026, 10) // November 2026 starts on a Sunday
  assert.equal(g.length, 42)
  assert.equal(g[0].iso, '2026-11-01')
  assert.equal(g[0].inMonth, true)
  assert.equal(g.filter((c) => c.inMonth).length, 30)
  assert.equal(g[41].iso, '2026-12-12')
  const dec = monthGrid(2026, 11) // December starts on a Tuesday → 2 days of November first
  assert.equal(dec[0].iso, '2026-11-29')
  assert.equal(dec[0].inMonth, false)
})

test('shiftMonth wraps the year', () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 })
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 })
})

test('selectDay: first click anchors, second completes in either order', () => {
  const a = selectDay(null, '2026-11-20')
  assert.deepEqual(a, { from: '2026-11-20', until: '2026-11-20', anchor: '2026-11-20' })
  assert.deepEqual(selectDay(a.anchor, '2026-11-23'), { from: '2026-11-20', until: '2026-11-23', anchor: null })
  assert.deepEqual(selectDay(a.anchor, '2026-11-18'), { from: '2026-11-18', until: '2026-11-20', anchor: null })
  assert.deepEqual(selectDay(a.anchor, '2026-11-20'), { from: '2026-11-20', until: '2026-11-20', anchor: null })
})

test('previewRange and inRange', () => {
  assert.equal(previewRange(null, '2026-11-20'), null)
  assert.deepEqual(previewRange('2026-11-20', '2026-11-18'), { from: '2026-11-18', until: '2026-11-20' })
  assert.equal(inRange('2026-11-20', '2026-11-20', '2026-11-22'), true)
  assert.equal(inRange('2026-11-23', '2026-11-20', '2026-11-22'), false)
  assert.equal(inRange('2026-11-20', '', ''), false)
})

test('eventCounts tallies events per date', () => {
  assert.deepEqual(eventCounts([{ date: 'a' }, { date: 'a' }, { date: 'b' }, {}]), { a: 2, b: 1 })
})

test('formatRange', () => {
  const t = '2026-11-16'
  assert.equal(formatRange('', '', t), 'Any date')
  assert.equal(formatRange('2026-11-20', '2026-11-20', t), 'Nov 20')
  assert.equal(formatRange('2026-11-20', '2026-11-22', t), 'Nov 20 – Nov 22')
  assert.equal(formatRange('2026-12-30', '2027-01-02', t), 'Dec 30, 2026 – Jan 2, 2027')
  assert.equal(formatRange('2026-11-20', '', t), 'Nov 20')
})
