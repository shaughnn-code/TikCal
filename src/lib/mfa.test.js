import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mfaGateStatus, mfaRedirectPath } from './mfa.js'

test('mfaGateStatus requires enrollment when no verified TOTP factor exists', () => {
  assert.equal(mfaGateStatus({ verifiedFactorCount: 0, currentLevel: 'aal1', nextLevel: 'aal1' }), 'needs-enrollment')
})

test('mfaGateStatus requires a challenge when enrolled but not yet at aal2', () => {
  assert.equal(mfaGateStatus({ verifiedFactorCount: 1, currentLevel: 'aal1', nextLevel: 'aal2' }), 'needs-challenge')
})

test('mfaGateStatus is ok once enrolled and at aal2', () => {
  assert.equal(mfaGateStatus({ verifiedFactorCount: 1, currentLevel: 'aal2', nextLevel: 'aal2' }), 'ok')
})

test('mfaGateStatus prioritizes enrollment over challenge when no factor exists at all', () => {
  assert.equal(mfaGateStatus({ verifiedFactorCount: 0, currentLevel: 'aal1', nextLevel: 'aal2' }), 'needs-enrollment')
})

test('mfaRedirectPath sends unenrolled users to /mfa-enroll', () => {
  assert.equal(mfaRedirectPath('needs-enrollment', '/calendar'), '/mfa-enroll')
})

test('mfaRedirectPath does not redirect a user already on /mfa-enroll', () => {
  assert.equal(mfaRedirectPath('needs-enrollment', '/mfa-enroll'), null)
})

test('mfaRedirectPath sends un-challenged users to /mfa-challenge', () => {
  assert.equal(mfaRedirectPath('needs-challenge', '/calendar'), '/mfa-challenge')
})

test('mfaRedirectPath allows the app once mfaStatus is ok', () => {
  assert.equal(mfaRedirectPath('ok', '/calendar'), null)
})
