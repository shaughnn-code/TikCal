import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageTitle, canonicalUrl, buildSeo, HOME_TITLE, SITE_URL } from './seo.js'

test('pageTitle: empty falls back to the home title', () => {
  assert.equal(pageTitle(), HOME_TITLE)
  assert.equal(pageTitle(''), HOME_TITLE)
})

test('pageTitle: interior pages get the brand suffix', () => {
  assert.equal(pageTitle('About'), 'About — TikCal')
  assert.equal(pageTitle('Privacy Policy'), 'Privacy Policy — TikCal')
})

test('pageTitle: home skips the suffix', () => {
  assert.equal(pageTitle(HOME_TITLE, { home: true }), HOME_TITLE)
})

test('canonicalUrl: root', () => {
  assert.equal(canonicalUrl('/'), `${SITE_URL}/`)
  assert.equal(canonicalUrl(), `${SITE_URL}/`)
})

test('canonicalUrl: adds a missing leading slash', () => {
  assert.equal(canonicalUrl('about'), `${SITE_URL}/about`)
})

test('canonicalUrl: drops a trailing slash and collapses doubles', () => {
  assert.equal(canonicalUrl('/about/'), `${SITE_URL}/about`)
  assert.equal(canonicalUrl('//help'), `${SITE_URL}/help`)
})

test('buildSeo: assembles title, description, canonical', () => {
  assert.deepEqual(buildSeo({ title: 'Help', description: 'How to use TikCal.', path: '/help' }), {
    title: 'Help — TikCal',
    description: 'How to use TikCal.',
    canonical: `${SITE_URL}/help`,
  })
})

test('buildSeo: home page has no suffix and root canonical', () => {
  const s = buildSeo({ title: HOME_TITLE, description: 'x', path: '/', home: true })
  assert.equal(s.title, HOME_TITLE)
  assert.equal(s.canonical, `${SITE_URL}/`)
})
