import test from 'node:test'
import assert from 'node:assert/strict'
import { sortEvents, dayItems, timedStack, hhmm } from './calendarLib.js'

const ev = (id, date, start = null, title = id) => ({ id, title, date, start, end: null, taskId: null })

test('sortEvents: untimed first, then by start time, ties by title', () => {
  const out = sortEvents([
    ev('a', '2026-07-22', '14:00'),
    ev('b', '2026-07-22', null),
    ev('c', '2026-07-22', '09:30'),
    ev('d', '2026-07-22', '09:30', 'aaa'),
  ])
  assert.deepEqual(
    out.map((e) => e.id),
    ['b', 'd', 'c', 'a']
  )
})

test('dayItems filters events by date, tasks by due, sessions by local start day', () => {
  const startedAt = new Date(2026, 6, 22, 9, 30).toISOString()
  const endedAt = new Date(2026, 6, 22, 9, 55).toISOString()
  const data = {
    events: [ev('e1', '2026-07-22'), ev('e2', '2026-07-23')],
    tasks: [
      { id: 't1', title: 'due today', status: 'todo', due: '2026-07-22' },
      { id: 't2', title: 'no due', status: 'todo', due: null },
    ],
    sessions: [
      { id: 's1', taskId: null, startedAt, endedAt, seconds: 1500 },
      {
        id: 's2',
        taskId: null,
        startedAt: new Date(2026, 6, 21, 9, 0).toISOString(),
        endedAt: new Date(2026, 6, 21, 9, 25).toISOString(),
        seconds: 1500,
      },
    ],
  }
  const out = dayItems(data, '2026-07-22')
  assert.deepEqual(out.events.map((e) => e.id), ['e1'])
  assert.deepEqual(out.tasks.map((t) => t.id), ['t1'])
  assert.deepEqual(out.sessions.map((s) => s.id), ['s1'])
})

test('timedStack merges events and sessions in time order, untimed events on top', () => {
  const s1 = {
    id: 's1',
    startedAt: new Date(2026, 6, 22, 10, 15).toISOString(),
    endedAt: new Date(2026, 6, 22, 10, 40).toISOString(),
    seconds: 1500,
  }
  const out = timedStack([ev('e1', '2026-07-22', '13:00'), ev('e2', '2026-07-22', null)], [s1])
  assert.deepEqual(
    out.map((x) => x.item.id),
    ['e2', 's1', 'e1']
  )
  assert.deepEqual(
    out.map((x) => x.kind),
    ['event', 'session', 'event']
  )
})

test('hhmm renders local hours/minutes zero-padded', () => {
  assert.equal(hhmm(new Date(2026, 6, 22, 7, 5).toISOString()), '07:05')
})
