import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRequest, parseAnswers, chunk, eventKey, JEV_OPTIONS, TO_VALUE, MAX_BATCH } from '../../supabase/functions/_shared/jevSubgenre.js'

const EV = [
  { source: 'ra', id: '1', title: 'Charlotte de Witte', artist: 'Charlotte de Witte', venue: 'Avant Gardner', genre: '' },
  { source: 'dice', id: '2', title: 'Late Night', artist: '', venue: 'Elsewhere', genre: 'techno' },
]

test('buildRequest: one Choice and one companion Noul per event, shared state', () => {
  const { body, order } = buildRequest(EV)
  assert.deepEqual(order, ['ra:1', 'dice:2'])
  assert.equal(body.model, 'jev-latest')
  assert.deepEqual(Object.keys(body.state.events), ['e1', 'e2'])
  assert.equal(body.state.events.e1.title, 'Charlotte de Witte')
  assert.deepEqual(Object.keys(body.questions), ['e1_genre', 'e1_edm', 'e2_genre', 'e2_edm'])
  assert.equal(body.questions.e1_genre.type, 'choice')
  assert.equal(body.questions.e1_edm.type, 'noul')
  assert.deepEqual(body.questions.e2_genre.criteria, JEV_OPTIONS)
  assert.match(body.questions.e2_genre.instructions, /`events\.e2`/)
})

test('buildRequest clips long strings', () => {
  const { body } = buildRequest([{ source: 'ra', id: '1', title: 'x'.repeat(500), artist: '', venue: '', genre: '' }])
  assert.equal(body.state.events.e1.title.length, 200)
})

test('every Jev option maps to a Discover subgenre value', () => {
  assert.deepEqual(Object.keys(TO_VALUE).sort(), Object.keys(JEV_OPTIONS).sort())
})

const ans = (choice, p, noul) => ({
  g: { type: 'choice', choice, probabilities: { [choice]: p } },
  n: { type: 'noul', noul },
})
test('parseAnswers: confident EDM subgenre, unsure subgenre, non-EDM', () => {
  const a = ans('techno', 0.99, 0.99)
  const b = ans('house', 0.49, 0.99)
  const c = ans('mainstage', 0.69, 0.01)
  const out = parseAnswers(
    { e1_genre: a.g, e1_edm: a.n, e2_genre: b.g, e2_edm: b.n, e3_genre: c.g, e3_edm: c.n },
    ['ra:1', 'dice:2', 'tm:3'],
  )
  assert.deepEqual(out['ra:1'], { subgenre: 'techno', edm: 0.99 })
  assert.equal(out['dice:2'].subgenre, 'electronic') // choice probability below 0.5
  assert.equal(out['tm:3'].subgenre, null) // not EDM
})

test('parseAnswers: undecided Noul band stays generic electronic; missing answers are skipped', () => {
  const m = ans('techno', 0.9, 0.5)
  const out = parseAnswers({ e1_genre: m.g, e1_edm: m.n, e2_genre: ans('house', 1, 1).g }, ['ra:1', 'ra:2', 'ra:3'])
  assert.equal(out['ra:1'].subgenre, 'electronic')
  assert.equal('ra:2' in out, false) // no Noul answer
  assert.equal('ra:3' in out, false) // no answers at all
  assert.deepEqual(parseAnswers(undefined, ['a:1']), {})
})

test('chunk and eventKey', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.equal(eventKey('ra', '9'), 'ra:9')
  assert.ok(MAX_BATCH > 0)
})
