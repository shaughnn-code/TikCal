// Upcoming NYC events from DICE, via the parse.bot DICE Events API wrapper
// (unofficial, not affiliated with DICE.fm). JWT-protected (keeps the API key
// server-side; only signed-in users can call). Mirrors
// ticketmaster-events'/ra-events' output shape so Discover/Overlap can merge
// all three sources without caring where an event came from.
//
// Served from public.discovery_cache: parse.bot is scraped at most every 6h
// (see _shared/discoveryCache.js), with a 120s server-side timeout.
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
import { serveDiscovery } from '../_shared/discoverySource.ts'
import { mapDiceEvents, nycToday } from '../_shared/discoveryCache.js'

const DICE_BASE = 'https://api.parse.bot/scraper/9d08efd6-b294-4b5f-91a1-7c51ded9f7f9'
// DICE's own city id for New York (per parse.bot's documented example).
const NYC_CITY = 'new_york-5bbf4db0f06331478e9b2c59'

serveDiscovery({
  source: 'dice',
  keyEnv: 'DICE_API_KEY_TIKCAL',
  url: () =>
    `${DICE_BASE}/browse_events?${new URLSearchParams({ city: NYC_CITY, date_from: nycToday(), limit: '50' })}`,
  map: mapDiceEvents,
})
