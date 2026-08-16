import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSwipe } from './swipe.js'

test('resolveSwipe reads horizontal drags on axis x', () => {
  assert.equal(resolveSwipe({ dx: -80, dy: 0, axis: 'x' }), 'next')
  assert.equal(resolveSwipe({ dx: 80, dy: 0, axis: 'x' }), 'prev')
})

test('resolveSwipe reads vertical drags on axis y', () => {
  assert.equal(resolveSwipe({ dx: 0, dy: -80, axis: 'y' }), 'next')
  assert.equal(resolveSwipe({ dx: 0, dy: 80, axis: 'y' }), 'prev')
})

test('resolveSwipe is a no-op below the distance threshold', () => {
  assert.equal(resolveSwipe({ dx: -20, dy: 0, axis: 'x' }), null)
  assert.equal(resolveSwipe({ dx: 0, dy: 20, axis: 'y' }), null)
})

test('resolveSwipe rejects a diagonal drag that is not axis-dominant', () => {
  // Big enough travel, but the cross axis is nearly as large — not a clean swipe.
  assert.equal(resolveSwipe({ dx: -80, dy: 70, axis: 'x' }), null)
  assert.equal(resolveSwipe({ dx: 70, dy: -80, axis: 'y' }), null)
})

test('resolveSwipe ignores travel on the wrong axis for this view', () => {
  // A mostly-vertical drag on a horizontal-axis view (Week/Day) is a no-op.
  assert.equal(resolveSwipe({ dx: 5, dy: -90, axis: 'x' }), null)
  // A mostly-horizontal drag on a vertical-axis view (Month) is a no-op.
  assert.equal(resolveSwipe({ dx: -90, dy: 5, axis: 'y' }), null)
})

test('resolveSwipe custom thresholds are respected', () => {
  assert.equal(resolveSwipe({ dx: -30, dy: 0, axis: 'x', distanceThreshold: 20 }), 'next')
  assert.equal(resolveSwipe({ dx: -80, dy: 60, axis: 'x', axisRatio: 1 }), 'next')
})
