import test from 'node:test'
import assert from 'node:assert/strict'
import {
  monthMatrix, startOfWeek, weekDays, weekRangeLabel, periodLabel,
  stepFocus, zoomView, parseTime, slotOffset, ymd,
} from './zoom.js'

const D = (y, m, d) => new Date(y, m, d)

test('monthMatrix returns whole weeks, sized to the month', () => {
  for (let m = 0; m < 12; m++) {
    const cells = monthMatrix(2026, m)
    assert.equal(cells.length % 7, 0, `month ${m} is not whole weeks`)
  }
  // Jul 2026: 3 lead days + 31 = 34 -> 5 weeks, not 6.
  assert.equal(monthMatrix(2026, 6).length, 35)
})

test('monthMatrix never emits a trailing row that is entirely out-of-month', () => {
  for (let y = 2024; y <= 2030; y++) {
    for (let m = 0; m < 12; m++) {
      const cells = monthMatrix(y, m)
      const lastRow = cells.slice(-7)
      assert.ok(lastRow.some((c) => !c.out), `${y}-${m + 1} has an empty trailing row`)
      const firstRow = cells.slice(0, 7)
      assert.ok(firstRow.some((c) => !c.out), `${y}-${m + 1} has an empty leading row`)
    }
  }
})

test('monthMatrix covers a 6-week month', () => {
  // Aug 2026 starts Saturday: 6 lead + 31 = 37 -> 6 weeks.
  assert.equal(monthMatrix(2026, 7).length, 42)
})

test('monthMatrix marks adjacent-month padding as out', () => {
  // Jul 2026 starts on a Wednesday, so Sun Jun 28 .. Tue Jun 30 lead it.
  const cells = monthMatrix(2026, 6)
  assert.equal(cells[0].dateStr, '2026-06-28')
  assert.equal(cells[0].out, true)
  assert.equal(cells[3].dateStr, '2026-07-01')
  assert.equal(cells[3].out, false)
  assert.equal(cells.filter((c) => !c.out).length, 31)
})

test('monthMatrix handles a month starting on Sunday with no lead padding', () => {
  // Feb 2026 starts on a Sunday.
  const cells = monthMatrix(2026, 1)
  assert.equal(cells[0].dateStr, '2026-02-01')
  assert.equal(cells[0].out, false)
})

test('startOfWeek snaps back to Sunday and zeroes the clock', () => {
  const s = startOfWeek(D(2026, 6, 9)) // Thu Jul 9
  assert.equal(ymd(s), '2026-07-05')
  assert.equal(s.getHours(), 0)
  // Already Sunday -> unchanged
  assert.equal(ymd(startOfWeek(D(2026, 6, 5))), '2026-07-05')
})

test('weekDays returns 7 consecutive days from Sunday', () => {
  const d = weekDays(D(2026, 6, 9))
  assert.equal(d.length, 7)
  assert.equal(d[0].dateStr, '2026-07-05')
  assert.equal(d[6].dateStr, '2026-07-11')
})

test('weekRangeLabel spans a month boundary correctly', () => {
  assert.equal(weekRangeLabel(D(2026, 6, 9)), 'Jul 5–11')
  assert.equal(weekRangeLabel(D(2026, 6, 1)), 'Jun 28 – Jul 4')
})

test('periodLabel differs per granularity', () => {
  const f = D(2026, 6, 9)
  assert.equal(periodLabel('year', f), '2026')
  assert.equal(periodLabel('month', f), 'Jul 2026')
  assert.equal(periodLabel('week', f), 'Jul 5–11')
})

test('stepFocus steps only the active granularity', () => {
  const f = D(2026, 6, 9)
  assert.equal(stepFocus('year', f, 1).getFullYear(), 2027)
  assert.equal(stepFocus('month', f, 1).getMonth(), 7)
  assert.equal(ymd(stepFocus('week', f, 1)), '2026-07-16')
  assert.equal(ymd(stepFocus('week', f, -1)), '2026-07-02')
})

test('stepFocus month-stepping does not overflow from a long month', () => {
  // Naive setMonth on Jan 31 yields Mar 3. Pinning to day 1 avoids that.
  const jan31 = D(2026, 0, 31)
  assert.equal(stepFocus('month', jan31, 1).getMonth(), 1) // February, not March
})

test('zoomView clamps at both ends', () => {
  assert.equal(zoomView('year', -1), 'year')
  assert.equal(zoomView('year', 1), 'month')
  assert.equal(zoomView('week', 1), 'week')
  assert.equal(zoomView('month', -1), 'year')
})

test('parseTime handles 12h, 24h, and garbage', () => {
  assert.equal(parseTime('10:00 PM'), 22 * 60)
  assert.equal(parseTime('9:30 pm'), 21 * 60 + 30)
  assert.equal(parseTime('12:00 AM'), 0)
  assert.equal(parseTime('12:30 PM'), 12 * 60 + 30)
  assert.equal(parseTime('22:00'), 22 * 60)
  assert.equal(parseTime('22:00:00'), 22 * 60)
  assert.equal(parseTime(null), null)
  assert.equal(parseTime(''), null)
  assert.equal(parseTime('doors at 9'), null)
  assert.equal(parseTime('99:99'), null)
})

test('slotOffset places evening events and wraps past midnight', () => {
  assert.equal(slotOffset(18 * 60), 0)          // 6PM -> top
  assert.equal(slotOffset(22 * 60), 0.5)        // 10PM -> halfway down 8 rows
  assert.equal(slotOffset(0 * 60 + 30), 6.5 / 8) // 12:30AM -> late night, wraps
  assert.equal(slotOffset(null), null)
})

test('slotOffset returns null for events outside the gutter', () => {
  assert.equal(slotOffset(9 * 60), null) // 9AM: not in a 6PM-2AM nightlife window
})
