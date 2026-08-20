// Searches DICE (via the parse.bot DICE Events API wrapper — unofficial,
// not affiliated with DICE.fm) for upcoming NYC events. JWT-protected
// (keeps the API key server-side; only signed-in users can call). Mirrors
// ticketmaster-events'/ra-events' output shape so Discover/Overlap can
// merge all three sources without caring where an event came from.
//
// Secret:  DICE_API_KEY_TIKCAL  (free tier: 200 credits/mo, 5 req/min — from
//          https://parse.bot/marketplace/79861a1e-adee-42da-b7f3-f505574a2eff/dice-fm-api)
// Deploy:  supabase functions deploy dice-events
//
// Response shape (confirmed live, 2026-08-20): { status, data: { events: [{
// id, name, perm_name, status, event_start_date, event_end_date, timezone,
// venue_name, venue_address, price_amount, price_currency, image_square,
// tags, properties, presented_by, url }] } }. `url`/`perm_name` are null in
// practice — DICE ticket links aren't available via this endpoint, so the
// mapped event's `url` is usually empty (the UI already hides the "Tickets"
// link when that happens).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const DICE_BASE = 'https://api.parse.bot/scraper/9d08efd6-b294-4b5f-91a1-7c51ded9f7f9'
// DICE's own city id for New York (per parse.bot's documented example).
const NYC_CITY = 'new_york-5bbf4db0f06331478e9b2c59'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const key = Deno.env.get('DICE_API_KEY_TIKCAL')
  if (!key) return json({ configured: false, events: [] })

  // Require a signed-in caller so the key isn't a public proxy.
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  let body: { city?: string; category?: string; genre?: string; limit?: number } = {}
  try { body = await req.json() } catch { /* defaults */ }

  const p = new URLSearchParams({
    city: body.city || NYC_CITY,
    date_from: new Date().toISOString().slice(0, 10),
    limit: String(Math.min(body.limit || 50, 50)),
  })
  if (body.category) p.set('category', body.category)
  if (body.genre) p.set('genre', body.genre)

  try {
    const res = await fetch(`${DICE_BASE}/browse_events?${p.toString()}`, {
      headers: { 'X-API-Key': key },
    })
    if (!res.ok) return json({ configured: true, events: [], error: `dice ${res.status}` })
    const data = await res.json()
    // deno-lint-ignore no-explicit-any
    const raw: any[] = data?.data?.events || []
    // deno-lint-ignore no-explicit-any
    const events = raw.map((e: any) => ({
      id: e.id != null ? String(e.id) : e.url || '',
      title: e.name || '',
      artist: '',
      attractions: [],
      date: (e.event_start_date || '').slice(0, 10),
      time: (e.event_start_date || '').slice(11, 16),
      venue: e.venue_name || '',
      city: 'New York',
      url: e.url || '',
      image: e.image_square || '',
    })).filter((e: { date: string }) => e.date)
    return json({ configured: true, events })
  } catch (err) {
    return json({ configured: true, events: [], error: String(err) })
  }
})
