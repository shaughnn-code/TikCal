// Tags Discover events with an EDM subgenre using TypeSafe's Jev model, and
// caches each tag in public.event_subgenres so an event is only ever tagged once.
// JWT-protected (keeps the API key server-side; only signed-in users can call).
//
// Secret:  TYPESAFE_API_KEY   (from https://console.typesafe.ai/keys)
// Table:   public.event_subgenres (migration 20261117120000_event_subgenres.sql)
// Deploy:  supabase functions deploy tag-subgenres
//
// Request:  { events: [{ source, id, title, artist, venue, genre }] }   (max 100)
// Response: { configured, tags: { "<source>:<id>": { subgenre: string | null } }, error? }
//   subgenre = a Discover subgenre value, 'electronic' (EDM, subgenre unclear),
//   or null (not an EDM event). Events Jev could not answer are left out.
//
// Cost guard: at most MAX_EVENTS per call, MAX_BATCH events per Jev request, and
// only events missing from the cache are sent. Event text is never logged.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { MAX_BATCH, MODEL, buildRequest, chunk, eventKey, parseAnswers } from '../_shared/jevSubgenre.js'

const MAX_EVENTS = 100
const SOURCES = new Set(['ticketmaster', 'ra', 'dice'])
const JEV_URL = 'https://api.typesafe.ai/v1/systemone'
const NONE = 'none' // stored for "not EDM"

type Ev = { source: string; id: string; title: string; artist: string; venue: string; genre: string }

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const jevKey = Deno.env.get('TYPESAFE_API_KEY')
  if (!jevKey) return json({ configured: false, tags: {} })

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  let input: { events?: unknown } = {}
  try { input = await req.json() } catch { return json({ error: 'Bad request.' }, 400) }
  if (!Array.isArray(input.events)) return json({ error: 'events must be an array.' }, 400)

  // Validate and de-duplicate.
  const seen = new Set<string>()
  const events: Ev[] = []
  for (const raw of input.events.slice(0, MAX_EVENTS)) {
    // deno-lint-ignore no-explicit-any
    const e = raw as any
    if (!e || !SOURCES.has(e.source) || typeof e.id !== 'string' || !e.id || e.id.length > 200) continue
    const key = eventKey(e.source, e.id)
    if (seen.has(key)) continue
    seen.add(key)
    events.push({
      source: e.source,
      id: e.id,
      title: String(e.title ?? ''),
      artist: String(e.artist ?? ''),
      venue: String(e.venue ?? ''),
      genre: String(e.genre ?? ''),
    })
  }
  if (!events.length) return json({ configured: true, tags: {} })

  // The cache table is written only by this function (service role); RLS gives
  // signed-in users read access and no write policy.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const tags: Record<string, { subgenre: string | null }> = {}
  const { data: cached, error: readErr } = await db
    .from('event_subgenres')
    .select('source, event_id, subgenre')
    .in('event_id', events.map((e) => e.id))
  if (readErr) return json({ configured: true, tags, error: 'cache read failed' })
  for (const r of cached || []) {
    const key = eventKey(r.source, r.event_id)
    if (seen.has(key)) tags[key] = { subgenre: r.subgenre === NONE ? null : r.subgenre }
  }

  const missing = events.filter((e) => !(eventKey(e.source, e.id) in tags))
  let failed = 0

  // deno-lint-ignore no-explicit-any
  const rows: any[] = []
  await Promise.all(chunk(missing, MAX_BATCH).map(async (batch) => {
    try {
      const { body, order } = buildRequest(batch)
      const res = await fetch(JEV_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jevKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { failed += batch.length; return }
      const out = parseAnswers((await res.json())?.answers, order)
      for (const e of batch) {
        const key = eventKey(e.source, e.id)
        const t = out[key]
        if (!t) { failed += 1; continue }
        tags[key] = { subgenre: t.subgenre }
        rows.push({ source: e.source, event_id: e.id, subgenre: t.subgenre ?? NONE, edm: t.edm, model: MODEL })
      }
    } catch {
      failed += batch.length
    }
  }))

  if (rows.length) await db.from('event_subgenres').upsert(rows, { onConflict: 'source,event_id' })

  return json({ configured: true, tags, ...(failed ? { error: `${failed} event(s) not tagged` } : {}) })
})
