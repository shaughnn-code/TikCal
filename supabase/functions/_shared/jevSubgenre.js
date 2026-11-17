// Pure helpers for tagging events with an EDM subgenre via TypeSafe's Jev
// (https://docs.typesafe.ai). Plain ES module with no I/O so the same file runs
// in the Deno edge function and under `node --test` (src/lib/jevSubgenre.test.js).
//
// Per event we ask two questions in ONE request (questions that share state are
// cheap to batch): a Choice for the subgenre, and a companion Noul asking
// whether it is an electronic dance music event at all (a Choice always picks
// something, so the Noul is what lets code say "not EDM").

export const MODEL = 'jev-latest'
export const MAX_BATCH = 24 // events per Jev request (2 questions each)
export const EDM_YES = 0.7 // Noul at/above → treat as EDM
export const EDM_NO = 0.3 // Noul below → not EDM; in between → undecided
export const CHOICE_MIN = 0.5 // top-option probability needed to trust the subgenre

// Option names are sent to the model, so they describe the content.
export const JEV_OPTIONS = {
  house: 'House music: four-on-the-floor, soulful, deep or classic house, not tech house',
  tech_house: 'Tech house: driving, percussive, minimal house-techno hybrid',
  techno: 'Techno: hypnotic, industrial or peak-time techno',
  trance: 'Trance: uplifting, psy or progressive trance with long melodic builds',
  melodic_progressive: 'Melodic or progressive house and techno: emotional, atmospheric, long-form',
  drum_and_bass: 'Drum and bass or jungle: fast breakbeats around 170 bpm',
  dubstep_bass: 'Dubstep, riddim or other heavy bass music',
  mainstage: 'Mainstage, big room or pop EDM festival sound',
  hard_dance: 'Hardstyle, hardcore, gabber or other hard dance',
}

// Jev option → the subgenre value Discover filters on (see discoverFilters.js).
export const TO_VALUE = {
  house: 'house',
  tech_house: 'tech-house',
  techno: 'techno',
  trance: 'trance',
  melodic_progressive: 'melodic',
  drum_and_bass: 'dnb',
  dubstep_bass: 'bass',
  mainstage: 'electronic',
  hard_dance: 'hard',
}

export const eventKey = (source, id) => `${source}:${id}`

const clip = (v, n = 200) => String(v ?? '').trim().slice(0, n)

export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// events: [{ source, id, title, artist, venue, genre }] (already validated)
// → { body, order } where order[i] is the event key for question ids e{i+1}_*.
export function buildRequest(events) {
  const state = { events: {} }
  const questions = {}
  const order = []
  events.forEach((e, i) => {
    const qid = `e${i + 1}`
    order.push(eventKey(e.source, e.id))
    state.events[qid] = {
      title: clip(e.title),
      artists: clip(e.artist),
      venue: clip(e.venue),
      listed_genre: clip(e.genre, 80),
    }
    questions[`${qid}_genre`] = {
      type: 'choice',
      instructions: `Which electronic dance music subgenre is the event \`events.${qid}\`?`,
      criteria: JEV_OPTIONS,
    }
    questions[`${qid}_edm`] = {
      type: 'noul',
      instructions: `Is \`events.${qid}\` an electronic dance music event (a DJ or electronic act)?`,
    }
  })
  return { body: { model: MODEL, state, questions }, order }
}

// Turns Jev's answers into { [eventKey]: { subgenre, edm } }.
//   subgenre = a Discover value | 'electronic' (EDM, subgenre unclear) | null (not EDM)
// Events whose answers are missing are left out so they are retried, not cached.
export function parseAnswers(answers, order) {
  const out = {}
  order.forEach((key, i) => {
    const g = answers?.[`e${i + 1}_genre`]
    const n = answers?.[`e${i + 1}_edm`]
    const edm = n && typeof n.noul === 'number' ? n.noul : null
    if (edm === null || !g || typeof g.choice !== 'string') return
    let subgenre
    if (edm < EDM_NO) subgenre = null
    else if (edm >= EDM_YES && (g.probabilities?.[g.choice] ?? 0) >= CHOICE_MIN && TO_VALUE[g.choice]) subgenre = TO_VALUE[g.choice]
    else subgenre = 'electronic'
    out[key] = { subgenre, edm }
  })
  return out
}
