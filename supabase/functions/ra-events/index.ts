// Upcoming NYC electronic/dance events from Resident Advisor, via the
// parse.bot RA API wrapper (unofficial, not affiliated with RA.co).
// JWT-protected (keeps the API key server-side; only signed-in users can call).
// Mirrors ticketmaster-events' output shape so Discover/Overlap can merge
// sources without caring where an event came from.
//
// Served from public.discovery_cache: parse.bot is scraped at most every 6h
// (see _shared/discoveryCache.js), with a 120s server-side timeout.
//
// Secret:  RA_API_KEY_TIKCAL  (free tier: 200 credits/mo, 5 req/min — from
//          https://parse.bot/marketplace/b94a9801-8a5c-490a-9b42-7c41751ebf76/ra-co-api)
// Deploy:  supabase functions deploy ra-events
//
// Response shape (confirmed live, 2026-08-18): { status, data: { total_results,
// page, page_size, events: [{ id, title, date, start_time, content_url,
// flyer_url, artists: [{id, name, content_url}], venue: {id, name,
// content_url}, area, country, pick_blurb }] } }
import { serveDiscovery } from '../_shared/discoverySource.ts'
import { mapRaEvents } from '../_shared/discoveryCache.js'

const RA_BASE = 'https://api.parse.bot/scraper/b89b7fc2-7fcb-49f4-8b0d-8ba592c967cc'
// RA's own area id for New York (per parse.bot's documented examples).
const NYC_AREA_ID = '8'

serveDiscovery({
  source: 'ra',
  keyEnv: 'RA_API_KEY_TIKCAL',
  url: () =>
    `${RA_BASE}/list_area_events?${new URLSearchParams({ area_id: NYC_AREA_ID, page: '1', page_size: '50' })}`,
  map: mapRaEvents,
})
