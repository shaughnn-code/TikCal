import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placePopover, visibleBounds } from './popoverPlacement.js'

const bounds = { left: 0, top: 0, right: 700, bottom: 600 }
const card = { width: 256, height: 240 }
const at = (left, top, w = 120, h = 20) => ({ left, top, right: left + w, bottom: top + h })

test('opens below, left-aligned, when there is room', () => {
  assert.deepEqual(placePopover(at(100, 100), card, bounds), { left: 100, top: 128 })
})

test('flips to right-aligned near the right edge (Saturday column)', () => {
  const p = placePopover(at(560, 100), card, bounds)
  assert.equal(p.left, 680 - 256) // anchor.right - width = 424
  assert.ok(p.left + card.width <= bounds.right - 8)
})

test('opens above near the bottom edge', () => {
  const p = placePopover(at(100, 500), card, bounds)
  assert.equal(p.top, 500 - 8 - 240)
})

test('clamps inside when neither side fits', () => {
  const tiny = { left: 0, top: 0, right: 300, bottom: 200 }
  const p = placePopover(at(250, 90, 40, 20), card, tiny)
  assert.ok(p.left >= 8 && p.left + 256 <= 292 + 0.5 || p.left === 8)
  assert.ok(p.top >= 8)
})

test('visibleBounds intersects the calendar with the viewport', () => {
  assert.deepEqual(
    visibleBounds({ left: -10, top: 50, right: 900, bottom: 1400 }, { width: 800, height: 700 }),
    { left: 0, top: 50, right: 800, bottom: 700 },
  )
})
