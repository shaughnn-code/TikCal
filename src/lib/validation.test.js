import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validatePassword } from './validation.js'

test('validatePassword rejects passwords shorter than 8 characters', () => {
  assert.equal(validatePassword('Abc123!'), 'Password must be at least 8 characters.')
})

test('validatePassword rejects a password with no letter', () => {
  assert.equal(validatePassword('12345678'), 'Password must include at least one letter and one number.')
})

test('validatePassword rejects a password with no number', () => {
  assert.equal(validatePassword('abcdefgh'), 'Password must include at least one letter and one number.')
})

test('validatePassword accepts a password meeting length and complexity rules', () => {
  assert.equal(validatePassword('abcd1234'), null)
})
