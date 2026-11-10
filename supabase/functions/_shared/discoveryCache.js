// Pure logic for the RA / DICE discovery cache. Plain ESM with no Deno or
// Node APIs so the edge functions (Deno) and the unit tests (node --test, via
// src/lib/discoveryCache.js) share one copy. No I/O in here.
//
// Why a cache: both sources are live parse.bot scrapes on a free tier of 200
// credits/month each. Before this, every visit to Find spent one credit per
// source and waited on a scrape that often outlasted the client's clock. Now
// Find reads the cached rows and a scrape runs at most once per TTL.

// How long a successful scrape stays fresh. 6h -> at most ~4 scrapes/day,
// ~120 credits/month per source, under the 200 free-tier cap.
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000

// Minimum gap between scrape attempts, successful or not. Doubles as the
// single-flight lease: a claimed refresh blocks others for this long. Set
// equal to the TTL so even an upstream that fails every time costs at most
// ~120 credits/month (assume parse.bot bills failed/aborted calls too).
export const RETRY_AFTER_MS = CACHE_TTL_MS

// Server-side cap on one upstream scrape. Scrapes are slow, so this is
// generous; it only has to stay under Supabase's 150s wall clock (which also
// bounds EdgeRuntime.waitUntil work) so a hung scrape is logged, not killed.
export const UPSTREAM_TIMEOUT_MS = 120 * 1000

// How long a cold-cache request waits on its scrape before answering
// "warming up" (the scrape keeps running and fills the cache). Must stay
// under the client's 60s clock in src/pages/Discover.jsx.
export const MISS_WAIT_MS = 45 * 1000

const ms = (iso) => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? t : null
}

// Decide what to do with a cache row ({ events, fetched_at, attempted_at }).
// Returns:
//   status:  'hit' (fresh) | 'stale' (old but servable) | 'miss' (nothing cached)
//   refresh: whether a scrape is due (the caller still has to win the claim)
export function planCache(row, now = Date.now()) {
  const fetched = ms(row?.fetched_at)
  const attempted = ms(row?.attempted_at)
  const hasData = fetched !== null
  const fresh = hasData && now - fetched < CACHE_TTL_MS
  const inBackoff = attempted !== null && now - attempted < RETRY_AFTER_MS
  const status = fresh ? 'hit' : hasData ? 'stale' : 'miss'
  return { status, refresh: !fresh && !inBackoff }
}

// ISO cutoff for the claim UPDATE: a row may be claimed only if its last
// attempt is older than this (or it has never been attempted).
export function claimCutoff(now = Date.now()) {
  return new Date(now - RETRY_AFTER_MS).toISOString()
}

// Resident Advisor `list_area_events` response -> TikCal event shape.
// Shape (confirmed live 2026-08-18): { data: { events: [{ id, title, date,
// start_time, content_url, flyer_url, artists: [{ name }], venue: { name },
// area }] } }
export function mapRaEvents(payload) {
  const raw = payload?.data?.events
  if (!Array.isArray(raw)) return []
  return raw
    .map((e) => {
      const venue = e?.venue || {}
      const artists = (e?.artists || []).map((a) => a?.name).filter(Boolean)
      return {
        id: e?.id != null ? String(e.id) : e?.content_url || '',
        title: e?.title || '',
        artist: artists.join(', '),
        attractions: artists,
        date: (e?.date || '').slice(0, 10),
        time: (e?.start_time || '').slice(11, 16),
        venue: venue.name || '',
        city: e?.area || 'New York',
        url: e?.content_url ? `https://ra.co${e.content_url}` : '',
        image: e?.flyer_url || '',
      }
    })
    .filter((e) => e.date)
}

// DICE `browse_events` response -> TikCal event shape.
// Shape (confirmed live 2026-08-20): { data: { events: [{ id, name,
// event_start_date, venue_name, image_square, tags, url }] } }. `url` is null
// in practice; the UI hides "Tickets" when it's empty.
export function mapDiceEvents(payload) {
  const raw = payload?.data?.events
  if (!Array.isArray(raw)) return []
  return raw
    .map((e) => ({
      id: e?.id != null ? String(e.id) : e?.url || '',
      title: e?.name || '',
      artist: '',
      attractions: [],
      date: (e?.event_start_date || '').slice(0, 10),
      time: (e?.event_start_date || '').slice(11, 16),
      venue: e?.venue_name || '',
      city: 'New York',
      url: e?.url || '',
      image: e?.image_square || '',
      genre: (e?.tags || [])[0] || '',
    }))
    .filter((e) => e.date)
}

// Drop shows that have already happened, so a cache row that's a few hours
// old never lists last night's events. `today` is YYYY-MM-DD.
export function upcomingOnly(events, today) {
  return (events || []).filter((e) => e?.date && e.date >= today)
}

// Today's date in New York as YYYY-MM-DD (the cached shows are all NYC).
export function nycToday(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}
