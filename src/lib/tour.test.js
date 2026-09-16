import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tourNext, tourBack, tourSkip, isLastStep } from './tour.js'

const steps = ['calendar', 'add-event', 'discover', 'overlap', 'forwarding']

test('tourNext advances to the next index', () => {
  assert.equal(tourNext(0, steps), 1)
  assert.equal(tourNext(2, steps), 3)
})

test('tourNext at the last step stays put (caller should treat as finish)', () => {
  assert.equal(tourNext(steps.length - 1, steps), steps.length - 1)
})

test('tourBack retreats to the previous index', () => {
  assert.equal(tourBack(2, steps), 1)
})

test('tourBack at the first step stays put', () => {
  assert.equal(tourBack(0, steps), 0)
})

test('tourSkip jumps straight to the last index', () => {
  assert.equal(tourSkip(steps), steps.length - 1)
})

test('isLastStep is true only at the final index', () => {
  assert.equal(isLastStep(steps.length - 1, steps), true)
  assert.equal(isLastStep(0, steps), false)
})
