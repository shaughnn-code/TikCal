import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ymd,
  parseYmd,
  addDays,
  startOfWeek,
  monthGrid,
  weekDays,
  fmtDur,
  fmtClock,
  isOverdue,
  sameYmd,
} from './dates.js'

test('ymd round-trips through parseYmd', () => {
  assert.equal(ymd(parseYmd('2026-07-22')), '2026-07-22')
  assert.equal(ymd(parseYmd('2026-01-05')), '2026-01-05')
})

test('parseYmd is local midnight', () => {
  const d = parseYmd('2026-07-22')
  assert.equal(d.getHours(), 0)
  assert.equal(d.getDate(), 22)
})

test('addDays crosses month boundaries', () => {
  assert.equal(ymd(addDays(parseYmd('2026-07-31'), 1)), '2026-08-01')
  assert.equal(ymd(addDays(parseYmd('2026-03-01'), -1)), '2026-02-28')
})

test('startOfWeek is Monday', () => {
  // 2026-07-22 is a Wednesday; its week starts Monday 2026-07-20.
  assert.equal(ymd(startOfWeek(parseYmd('2026-07-22'))), '2026-07-20')
  // A Monday maps to itself; a Sunday maps back six days.
  assert.equal(ymd(startOfWeek(parseYmd('2026-07-20'))), '2026-07-20')
  assert.equal(ymd(startOfWeek(parseYmd('2026-07-26'))), '2026-07-20')
})

test('monthGrid returns 42 days covering the month', () => {
  const grid = monthGrid(2026, 6) // July 2026; the 1st is a Wednesday.
  assert.equal(grid.length, 42)
  assert.equal(ymd(grid[0]), '2026-06-29')
  assert.ok(grid.some((d) => ymd(d) === '2026-07-01'))
  assert.ok(grid.some((d) => ymd(d) === '2026-07-31'))
})

test('weekDays returns Mon..Sun for the containing week', () => {
  const days = weekDays(parseYmd('2026-07-22'))
  assert.equal(days.length, 7)
  assert.equal(ymd(days[0]), '2026-07-20')
  assert.equal(ymd(days[6]), '2026-07-26')
})

test('fmtDur scales units', () => {
  assert.equal(fmtDur(45), '45s')
  assert.equal(fmtDur(25 * 60), '25m')
  assert.equal(fmtDur(65 * 60), '1h 05m')
})

test('fmtClock counts down', () => {
  assert.equal(fmtClock(25 * 60 * 1000), '25:00')
  assert.equal(fmtClock(61 * 1000), '01:01')
  assert.equal(fmtClock(-5), '00:00')
})

test('isOverdue compares ymd strings', () => {
  assert.equal(isOverdue('2026-07-21', '2026-07-22'), true)
  assert.equal(isOverdue('2026-07-22', '2026-07-22'), false)
  assert.equal(isOverdue(null, '2026-07-22'), false)
})

test('sameYmd', () => {
  assert.ok(sameYmd(new Date(2026, 6, 22, 9), new Date(2026, 6, 22, 23)))
  assert.ok(!sameYmd(new Date(2026, 6, 22), new Date(2026, 6, 23)))
})
