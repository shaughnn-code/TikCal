import test from 'node:test'
import assert from 'node:assert/strict'
import {
  venueKey,
  buildVenueOptions,
  subgenreOf,
  buildSubgenreOptions,
  filterEvents,
  heuristicSubgenre,
  needsJevTag,
} from './discoverFilters.js'

test('venueKey ignores case, punctuation, accents and a leading "the"', () => {
  assert.equal(venueKey('The Brooklyn Mirage '), 'brooklyn mirage')
  assert.equal(venueKey('BROOKLYN  MIRAGE'), 'brooklyn mirage')
  assert.equal(venueKey("Baby's All Right"), 'baby s all right')
  assert.equal(venueKey('Café Erzulie'), 'cafe erzulie')
  assert.equal(venueKey('Rock & Roll Hotel'), 'rock and roll hotel')
  assert.equal(venueKey(''), '')
  assert.equal(venueKey(null), '')
})

test('buildVenueOptions merges spellings and shows the most common one', () => {
  const evs = [
    { venue: 'Brooklyn Mirage' },
    { venue: 'The Brooklyn Mirage' },
    { venue: 'Brooklyn Mirage' },
    { venue: 'Elsewhere' },
    { venue: '' },
    {},
  ]
  const o = buildVenueOptions(evs)
  assert.deepEqual(o.map((x) => [x.label, x.count]), [['Brooklyn Mirage', 3], ['Elsewhere', 1]])
})

test('subgenreOf reads genre, title and artist; specific rules beat general ones', () => {
  assert.equal(subgenreOf({ title: 'Tech House Friday' }), 'tech-house')
  assert.equal(subgenreOf({ title: 'Deep House Brunch' }), 'house')
  assert.equal(subgenreOf({ title: 'Melodic House & Techno Night' }), 'melodic')
  assert.equal(subgenreOf({ title: 'Drum & Bass Sundays' }), 'dnb')
  assert.equal(subgenreOf({ title: 'Drum and Bass Sundays' }), 'dnb')
  assert.equal(subgenreOf({ title: 'Bass Mondays' }), 'bass')
  assert.equal(subgenreOf({ genre: 'Dubstep' }), 'bass')
  assert.equal(subgenreOf({ title: 'Hardstyle Raw Night' }), 'hard')
  assert.equal(subgenreOf({ title: 'Trance Nation' }), 'trance')
  assert.equal(subgenreOf({ title: 'Techno Tuesday' }), 'techno')
})

test('subgenreOf falls back to "electronic", or null for non-electronic events', () => {
  assert.equal(subgenreOf({ genre: 'Dance/Electronic', title: 'Some DJ' }), 'electronic')
  assert.equal(subgenreOf({ source: 'ra', title: 'Mystery Night' }), 'electronic')
  assert.equal(subgenreOf({ source: 'ticketmaster', genre: 'Rock', title: 'Band' }), null)
  assert.equal(subgenreOf({}), null)
})

test('buildSubgenreOptions only lists subgenres that exist, with counts', () => {
  const o = buildSubgenreOptions([
    { title: 'Techno A' },
    { title: 'Techno B' },
    { title: 'Trance A' },
    { genre: 'Rock', source: 'ticketmaster' },
  ])
  assert.deepEqual(o.map((x) => [x.value, x.count]), [['techno', 2], ['trance', 1]])
})

const EVS = [
  { source: 'ra', venue: 'Brooklyn Mirage', date: '2026-11-20', title: 'Techno A' },
  { source: 'dice', venue: 'The Brooklyn Mirage', date: '2026-11-21', title: 'Trance A' },
  { source: 'ticketmaster', venue: 'Terminal 5', date: '2026-11-22', title: 'Band', genre: 'Rock' },
]

test('filterEvents matches venues across spellings', () => {
  assert.equal(filterEvents(EVS, { venue: 'Brooklyn Mirage' }).length, 2)
})
test('filterEvents source, subgenre and inclusive date range', () => {
  assert.deepEqual(filterEvents(EVS, { source: 'dice' }).map((e) => e.title), ['Trance A'])
  assert.deepEqual(filterEvents(EVS, { subgenre: 'techno' }).map((e) => e.title), ['Techno A'])
  assert.equal(filterEvents(EVS, { dateFrom: '2026-11-21', dateUntil: '2026-11-21' }).length, 1)
  assert.equal(filterEvents(EVS, { dateFrom: '2026-11-21' }).length, 2)
  assert.equal(filterEvents(EVS, { dateUntil: '2026-11-20' }).length, 1)
  assert.equal(filterEvents(EVS, {}).length, 3)
})

test('a Jev tag decides only when keywords can say no more than "electronic"', () => {
  const ra = { source: 'ra', title: 'Mystery Night' }
  assert.equal(heuristicSubgenre(ra), 'electronic')
  assert.equal(subgenreOf({ ...ra, jevSubgenre: 'techno' }), 'techno')
  assert.equal(subgenreOf({ ...ra, jevSubgenre: null }), null) // Jev: not EDM
  assert.equal(subgenreOf({ ...ra, jevSubgenre: 'electronic' }), 'electronic')
  // keywords already specific: Jev does not override
  assert.equal(subgenreOf({ source: 'ra', title: 'Trance Nation', jevSubgenre: 'house' }), 'trance')
})

test('needsJevTag: electronic with no subgenre yet, not already tagged', () => {
  assert.equal(needsJevTag({ source: 'ra', title: 'Mystery Night' }), true)
  assert.equal(needsJevTag({ source: 'ra', title: 'Mystery Night', jevSubgenre: null }), false)
  assert.equal(needsJevTag({ source: 'ra', title: 'Techno Tuesday' }), false)
  assert.equal(needsJevTag({ source: 'ticketmaster', genre: 'Rock', title: 'Band' }), false)
})
