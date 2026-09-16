import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPlatform } from './platform.js'

test('getPlatform returns web when no Capacitor runtime is present', () => {
  assert.equal(getPlatform(), 'web')
})

test('getPlatform reads window.Capacitor.getPlatform() when present', () => {
  globalThis.window = { Capacitor: { getPlatform: () => 'ios' } }
  assert.equal(getPlatform(), 'ios')
  delete globalThis.window
})

test('getPlatform falls back to web if Capacitor is present but has no getPlatform', () => {
  globalThis.window = { Capacitor: {} }
  assert.equal(getPlatform(), 'web')
  delete globalThis.window
})
