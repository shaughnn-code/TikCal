// Searches Resident Advisor (via the parse.bot RA API wrapper — unofficial,
// not affiliated with RA.co) for upcoming NYC electronic/dance events.
// JWT-protected (keeps the API key server-side; only signed-in users can call).
// Mirrors ticketmaster-events' output shape so Discover/Overlap can merge
// both sources without caring where an event came from.
//
// Secret:  RA_API_KEY  (free tier: 200 credits/mo, 5 req/min — from
//          https://parse.bot/marketplace/b94a9801-8a5c-490a-9b42-7c41751ebf76/ra-co-api)
// Deploy:  supabase functions deploy ra-events
//
// NOTE: parse.bot's public docs describe list_area_events functionally
// (sorted by date ascending then popularity, max page_size 50) but don't
// publish a full example response for it, only for list_clubs. Field
// mapping below is best-effort from the documented event/venue field names
// used elsewhere on that page (title, artists, date, venue, flyer_url) —
// verify against a live response once RA_API_KEY is set, and adjust the
// `pickEvents`/mapping below if parse.bot's actual shape differs.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const RA_BASE = 'https://api.parse.bot/scraper/b89b7fc2-7fcb-49f4-8b0d-8ba592c967cc'
// RA's own area id for New York (per parse.bot's documented examples).
const NYC_AREA_ID = '8'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const key = Deno.env.get('RA_API_KEY')
  if (!key) return json({ configured: false, events: [] })

  // Require a signed-in caller so the key isn't a public proxy.
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  let body: { areaId?: string; page?: number; pageSize?: number } = {}
  try { body = await req.json() } catch { /* defaults */ }

  const p = new URLSearchParams({
    area_id: body.areaId || NYC_AREA_ID,
    page: String(body.page || 1),
    page_size: String(Math.min(body.pageSize || 50, 50)),
  })

  try {
    const res = await fetch(`${RA_BASE}/list_area_events?${p.toString()}`, {
      headers: { 'X-API-Key': key },
    })
    if (!res.ok) return json({ configured: true, events: [], error: `ra ${res.status}` })
    const data = await res.json()
    // deno-lint-ignore no-explicit-any
    const raw: any[] = data?.events || data?.results || (Array.isArray(data) ? data : [])
    // deno-lint-ignore no-explicit-any
    const events = raw.map((e: any) => {
      const venue = e.venue || e.club || {}
      const artists: string[] = (e.artists || e.lineup || [])
        // deno-lint-ignore no-explicit-any
        .map((a: any) => (typeof a === 'string' ? a : a?.name))
        .filter(Boolean)
      return {
        id: e.id != null ? String(e.id) : e.content_url || '',
        title: e.title || e.name || '',
        artist: artists.join(', '),
        attractions: artists,
        date: (e.date || e.start_date || '').slice(0, 10),
        time: e.start_time || '',
        venue: venue.name || '',
        city: venue.area?.name || 'New York',
        url: e.content_url ? `https://ra.co${e.content_url}` : e.url || '',
        image: e.flyer_url || e.image || '',
      }
    }).filter((e: { date: string }) => e.date)
    return json({ configured: true, events })
  } catch (err) {
    return json({ configured: true, events: [], error: String(err) })
  }
})
