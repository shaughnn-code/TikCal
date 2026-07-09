// Searches Ticketmaster's Discovery API for upcoming NYC music events. JWT-
// protected (keeps the API key server-side; only signed-in users can call).
//
// Secret:  TICKETMASTER_API_KEY  (free key from developer.ticketmaster.com)
// Deploy:  supabase functions deploy ticketmaster-events
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// New York DMA (covers NYC + the boroughs).
const NYC_DMA = '345'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const key = Deno.env.get('TICKETMASTER_API_KEY')
  if (!key) return json({ configured: false, events: [] })

  // Require a signed-in caller so the key isn't a public proxy.
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  let body: { keyword?: string; size?: number } = {}
  try { body = await req.json() } catch { /* defaults */ }

  const startDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const p = new URLSearchParams({
    apikey: key,
    dmaId: NYC_DMA,
    classificationName: 'music',
    sort: 'date,asc',
    size: String(Math.min(body.size || 100, 199)),
    startDateTime,
  })
  if (body.keyword) p.set('keyword', body.keyword)

  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${p.toString()}`)
    if (!res.ok) return json({ configured: true, events: [], error: `ticketmaster ${res.status}` })
    const data = await res.json()
    // deno-lint-ignore no-explicit-any
    const events = (data?._embedded?.events || []).map((e: any) => {
      const venue = e._embedded?.venues?.[0]
      const attractions = (e._embedded?.attractions || []).map((a: { name: string }) => a.name)
      return {
        id: e.id,
        title: e.name,
        artist: attractions.join(', '),
        attractions,
        date: e.dates?.start?.localDate || '',
        time: e.dates?.start?.localTime || '',
        venue: venue?.name || '',
        city: venue?.city?.name || '',
        url: e.url || '',
        image: (e.images || []).sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url || '',
      }
    }).filter((e: { date: string }) => e.date)
    return json({ configured: true, events })
  } catch (err) {
    return json({ configured: true, events: [], error: String(err) })
  }
})
