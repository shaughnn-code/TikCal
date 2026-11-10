// Run: node --test
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  tokenKey, legacyKey, readGuestToken, writeGuestToken, clearGuestToken, hasLegacyGuest, findMe,
} from './guestToken.js'

const S = '11111111-1111-4111-8111-111111111111'
const T = '22222222-2222-4222-8222-222222222222'

const mem = (init = {}) => {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  }
}
const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }

test('write then read a token', () => {
  const s = mem()
  assert.equal(writeGuestToken(s, S, T), true)
  assert.equal(readGuestToken(s, S), T)
})

test('writing a token removes the legacy participant-id entry', () => {
  const s = mem({ [legacyKey(S)]: 'some-participant-id' })
  writeGuestToken(s, S, T)
  assert.equal(s._m.has(legacyKey(S)), false)
})

test('malformed or missing tokens are ignored', () => {
  assert.equal(readGuestToken(mem(), S), null)
  assert.equal(readGuestToken(mem({ [tokenKey(S)]: 'not-a-uuid' }), S), null)
  assert.equal(writeGuestToken(mem(), S, undefined), false)
  assert.equal(writeGuestToken(mem(), S, 'nope'), false)
})

test('tokens are per session', () => {
  const s = mem()
  writeGuestToken(s, S, T)
  assert.equal(readGuestToken(s, '33333333-3333-4333-8333-333333333333'), null)
})

test('legacy guest detected only without a token', () => {
  assert.equal(hasLegacyGuest(mem({ [legacyKey(S)]: 'pid' }), S), true)
  assert.equal(hasLegacyGuest(mem({ [legacyKey(S)]: 'pid', [tokenKey(S)]: T }), S), false)
  assert.equal(hasLegacyGuest(mem(), S), false)
})

test('clear removes the token', () => {
  const s = mem({ [tokenKey(S)]: T })
  clearGuestToken(s, S)
  assert.equal(readGuestToken(s, S), null)
})

test('blocked storage never throws', () => {
  assert.equal(readGuestToken(broken, S), null)
  assert.equal(writeGuestToken(broken, S, T), false)
  assert.equal(hasLegacyGuest(broken, S), false)
  assert.doesNotThrow(() => clearGuestToken(broken, S))
  assert.equal(readGuestToken(undefined, S), null)
})

test('findMe picks the row the server marked', () => {
  assert.equal(findMe([{ id: 'a' }, { id: 'b', is_me: true }])?.id, 'b')
  assert.equal(findMe([{ id: 'a', is_me: false }]), null)
  assert.equal(findMe(null), null)
})
