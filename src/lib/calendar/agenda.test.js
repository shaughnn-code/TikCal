import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseYmd, todayYmd, addDays, groupNights, splitNights, nightMarks, agendaRows,
  landingDate, activeDate, scrollTargetY, weekOf, stripLabel, stepAnchor, nightLabel,
} from './agenda.js'

test('parseYmd is local midnight, not UTC', () => {
  const d = parseYmd('2026-11-10')
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 10)
  assert.equal(d.getDate(), 10)
  assert.equal(d.getHours(), 0)
})

test('todayYmd uses the local date even late in the evening', () => {
  // 11:30pm local on Nov 10: UTC would already be Nov 11 west of Greenwich.
  assert.equal(todayYmd(new Date(2026, 10, 10, 23, 30)), '2026-11-10')
})

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('groupNights groups by date, sorted, keeping in-night order', () => {
  const evs = [
    { id: 'b', event_date: '2026-11-14' },
    { id: 'a', event_date: '2026-11-12' },
    { id: 'c', event_date: '2026-11-14' },
    { id: 'x' }, // no date: dropped
  ]
  const n = groupNights(evs)
  assert.deepEqual(n.map((x) => x.dateStr), ['2026-11-12', '2026-11-14'])
  assert.deepEqual(n[1].events.map((e) => e.id), ['b', 'c'])
  assert.deepEqual(groupNights(), [])
})

test('splitNights keeps tonight in upcoming', () => {
  const nights = groupNights([
    { event_date: '2026-11-09' }, { event_date: '2026-11-10' }, { event_date: '2026-11-11' },
  ])
  const { upcoming, past } = splitNights(nights, '2026-11-10')
  assert.deepEqual(past.map((n) => n.dateStr), ['2026-11-09'])
  assert.deepEqual(upcoming.map((n) => n.dateStr), ['2026-11-10', '2026-11-11'])
})

test('nightMarks dedupes and caps colors, counts, flags my "in"', () => {
  const accent = (e) => ({ color: e.c })
  const evs = [
    { event_date: '2026-11-14', c: '#a', rsvps: [{ user_id: 'u', status: 'maybe' }] },
    { event_date: '2026-11-14', c: '#a' },
    { event_date: '2026-11-14', c: '#b' },
    { event_date: '2026-11-14', c: '#c' },
    { event_date: '2026-11-14', c: '#d', rsvps: [{ user_id: 'u', status: 'in' }] },
    { event_date: '2026-11-15', c: '#a', rsvps: [{ user_id: 'other', status: 'in' }] },
  ]
  const m = nightMarks(evs, 'u', accent)
  assert.deepEqual(m['2026-11-14'], { colors: ['#a', '#b', '#c'], count: 5, mine: true })
  assert.deepEqual(m['2026-11-15'], { colors: ['#a'], count: 1, mine: false })
  assert.equal(nightMarks(evs, null, accent)['2026-11-14'].mine, false)
})

test('agendaRows adds an empty today row only when needed, in order', () => {
  const nights = groupNights([{ event_date: '2026-11-08' }, { event_date: '2026-11-12' }])
  assert.deepEqual(agendaRows(nights, '2026-11-10').map((r) => [r.dateStr, r.events.length]), [
    ['2026-11-08', 1], ['2026-11-10', 0], ['2026-11-12', 1],
  ])
  assert.equal(agendaRows(nights, '2026-11-12'), nights)
  assert.deepEqual(agendaRows([], '2026-11-10').map((r) => r.dateStr), ['2026-11-10'])
})

test('landingDate: exact, next after, else last before', () => {
  const rows = ['2026-11-08', '2026-11-10', '2026-11-14']
  assert.equal(landingDate(rows, '2026-11-10'), '2026-11-10')
  assert.equal(landingDate(rows, '2026-11-11'), '2026-11-14')
  assert.equal(landingDate(rows, '2026-11-01'), '2026-11-08')
  assert.equal(landingDate(rows, '2026-12-01'), '2026-11-14')
  assert.equal(landingDate([], '2026-12-01'), null)
})

test('activeDate picks the last header at or above the sticky line', () => {
  const h = [
    { dateStr: 'a', top: -400 },
    { dateStr: 'b', top: 120 },
    { dateStr: 'c', top: 600 },
  ]
  assert.equal(activeDate(h, 200), 'b')
  assert.equal(activeDate(h, 100), 'a')
  assert.equal(activeDate(h, 119), 'b') // within slack after a programmatic scroll
  assert.equal(activeDate([{ dateStr: 'a', top: 500 }], 200), 'a') // nothing reached yet
  assert.equal(activeDate([], 200), null)
})

test('scrollTargetY lands the row under the sticky stack, never negative', () => {
  assert.equal(scrollTargetY(500, 1000, 180), 1320)
  assert.equal(scrollTargetY(10, 0, 180), 0)
})

test('weekOf is Sunday-start and crosses months', () => {
  assert.deepEqual(weekOf('2026-11-10'), [
    '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
  ])
  assert.equal(weekOf('2026-12-01')[0], '2026-11-29')
  assert.equal(weekOf('2026-11-08')[0], '2026-11-08')
})

test('stripLabel handles month and year straddles', () => {
  assert.equal(stripLabel(weekOf('2026-11-10')), 'Nov 2026')
  assert.equal(stripLabel(weekOf('2026-12-01')), 'Nov – Dec 2026')
  assert.equal(stripLabel(weekOf('2026-12-31')), 'Dec 2026 – Jan 2027')
})

test('stepAnchor steps weeks by 7 days and months to the 1st', () => {
  assert.equal(stepAnchor('2026-11-10', 'week', 1), '2026-11-17')
  assert.equal(stepAnchor('2026-11-10', 'week', -1), '2026-11-03')
  assert.equal(stepAnchor('2027-01-31', 'month', 1), '2027-02-01')
  assert.equal(stepAnchor('2027-01-15', 'month', -1), '2026-12-01')
})

test('nightLabel says Tonight / Tomorrow, else a short date', () => {
  assert.equal(nightLabel('2026-11-10', '2026-11-10'), 'Tonight')
  assert.equal(nightLabel('2026-11-11', '2026-11-10'), 'Tomorrow')
  assert.equal(nightLabel('2026-11-14', '2026-11-10'), 'Sat, Nov 14')
})
