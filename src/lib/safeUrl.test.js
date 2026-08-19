import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeUrl, toSafeUrl } from './safeUrl.js'

test('isSafeUrl accepts http and https', () => {
  assert.equal(isSafeUrl('https://example.com'), true)
  assert.equal(isSafeUrl('http://example.com'), true)
})

test('isSafeUrl rejects javascript: and data: URIs', () => {
  assert.equal(isSafeUrl('javascript:alert(1)'), false)
  assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false)
})

test('isSafeUrl rejects empty/missing values', () => {
  assert.equal(isSafeUrl(''), false)
  assert.equal(isSafeUrl(null), false)
  assert.equal(isSafeUrl(undefined), false)
})

test('toSafeUrl trims and returns safe URLs, null otherwise', () => {
  assert.equal(toSafeUrl('  https://example.com  '), 'https://example.com')
  assert.equal(toSafeUrl('javascript:alert(1)'), null)
  assert.equal(toSafeUrl(''), null)
})
