import test from 'node:test'
import assert from 'node:assert/strict'
import {
  joinUrl, publicUrl, publicOrigin, isNative, platform, routeFromDeepLink, WEB_ORIGIN,
} from './platform.js'

test('joinUrl puts exactly one slash between origin and path', () => {
  assert.equal(joinUrl('https://tikcal.nyc', 'signup'), 'https://tikcal.nyc/signup')
  assert.equal(joinUrl('https://tikcal.nyc', '/signup'), 'https://tikcal.nyc/signup')
  assert.equal(joinUrl('https://tikcal.nyc/', 'signup'), 'https://tikcal.nyc/signup')
  assert.equal(joinUrl('https://tikcal.nyc/', '/signup'), 'https://tikcal.nyc/signup')
  assert.equal(joinUrl('https://tikcal.nyc//', '//signup'), 'https://tikcal.nyc/signup')
})

test('joinUrl returns a bare origin when there is no path', () => {
  assert.equal(joinUrl('https://tikcal.nyc'), 'https://tikcal.nyc')
  assert.equal(joinUrl('https://tikcal.nyc/'), 'https://tikcal.nyc')
  assert.equal(joinUrl('https://tikcal.nyc', ''), 'https://tikcal.nyc')
  assert.equal(joinUrl('https://tikcal.nyc', '/'), 'https://tikcal.nyc')
})

test('joinUrl keeps nested paths intact', () => {
  assert.equal(joinUrl('https://tikcal.nyc', '/overlap/abc123'), 'https://tikcal.nyc/overlap/abc123')
})

// Under node there is no WebView, so Capacitor reports web. This pins the
// contract the native branch relies on: publicOrigin follows window.location
// only when we're really on the web.
test('platform detection reports web outside a native shell', () => {
  assert.equal(isNative(), false)
  assert.equal(platform(), 'web')
})

test('publicUrl builds absolute links from the current origin on web', () => {
  globalThis.window = { location: { origin: 'http://localhost:5173' } }
  try {
    assert.equal(publicOrigin(), 'http://localhost:5173')
    assert.equal(publicUrl('/signup'), 'http://localhost:5173/signup')
  } finally {
    delete globalThis.window
  }
})

test('WEB_ORIGIN is an absolute https origin with no trailing slash', () => {
  assert.match(WEB_ORIGIN, /^https:\/\/[^/]+$/)
})

// The OAuth callbacks redirect here; the query string is the whole payload, so
// losing it would silently turn "connected" into a no-op.
test('routeFromDeepLink keeps the query string the OAuth pages read', () => {
  assert.equal(routeFromDeepLink('tikcal://profile?google=connected'), '/profile?google=connected')
  assert.equal(routeFromDeepLink('tikcal://profile?google=denied'), '/profile?google=denied')
  assert.equal(routeFromDeepLink('tikcal://discover?spotify=connected'), '/discover?spotify=connected')
})

test('routeFromDeepLink splits host and path for nested routes', () => {
  assert.equal(routeFromDeepLink('tikcal://overlap/abc123'), '/overlap/abc123')
  assert.equal(routeFromDeepLink('tikcal://profile'), '/profile')
  assert.equal(routeFromDeepLink('tikcal://profile/'), '/profile')
  assert.equal(routeFromDeepLink('tikcal://'), '/')
})

// Universal links are the eventual replacement for the custom scheme, so the
// https form has to resolve to the same route.
test('routeFromDeepLink accepts https links on our own origin', () => {
  assert.equal(routeFromDeepLink(`${WEB_ORIGIN}/profile?google=connected`), '/profile?google=connected')
  assert.equal(routeFromDeepLink(`${WEB_ORIGIN}/overlap/abc123`), '/overlap/abc123')
  assert.equal(routeFromDeepLink(WEB_ORIGIN), '/')
})

test('routeFromDeepLink rejects anything that is not ours', () => {
  assert.equal(routeFromDeepLink('https://evil.example/profile?google=connected'), null)
  assert.equal(routeFromDeepLink('http://tikcal.nyc/profile'), null)
  assert.equal(routeFromDeepLink('nottikcal://profile'), null)
  assert.equal(routeFromDeepLink('not a url'), null)
  assert.equal(routeFromDeepLink(''), null)
  assert.equal(routeFromDeepLink(undefined), null)
})
