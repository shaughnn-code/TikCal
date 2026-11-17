import test from 'node:test'
import assert from 'node:assert/strict'
import { safeExternalUrl } from './externalLink.js'

test('keeps plain https links', () => {
  assert.equal(safeExternalUrl('https://ra.co/events/123'), 'https://ra.co/events/123')
  assert.equal(safeExternalUrl('  https://dice.fm/event/abc  '), 'https://dice.fm/event/abc')
})

test('rejects javascript:, data:, http: and other schemes', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), '')
  assert.equal(safeExternalUrl('JaVaScRiPt:alert(1)'), '')
  assert.equal(safeExternalUrl('data:text/html,<script>alert(1)</script>'), '')
  assert.equal(safeExternalUrl('http://dice.fm/event/abc'), '')
  assert.equal(safeExternalUrl('//evil.com/x'), '')
})

test('rejects embedded credentials (ra.co@evil.com trick)', () => {
  assert.equal(safeExternalUrl('https://ra.co@evil.com/x'), '')
  assert.equal(safeExternalUrl('https://user:pw@dice.fm/x'), '')
})

test('rejects empty and non-string input', () => {
  assert.equal(safeExternalUrl(''), '')
  assert.equal(safeExternalUrl(null), '')
  assert.equal(safeExternalUrl(undefined), '')
  assert.equal(safeExternalUrl(42), '')
  assert.equal(safeExternalUrl('not a url'), '')
})
