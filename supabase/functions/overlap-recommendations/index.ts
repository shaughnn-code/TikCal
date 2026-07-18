// Overlap event recommendations for a single tapped window (spec §6).
//
// Two sources, ranked against the group's Spotify taste (their FOLLOWED + TOP
// artists, already synced into music_artists by spotify-sync):
//   1. "For you" — Ticketmaster's music catalog for that night, floated up by
//      the group's Spotify taste. (Spotify has no public events/concerts API, so
//      Ticketmaster is the queryable catalog — this is Spotify's own recommended
//      merge pattern.)
//   2. "Your crew saved" — the group's own saved TikCal events on that date,
//      shows a participant already Smart-Added, ranked by the same taste.
//
// Guest-capable: the session UUID in the URL is the capability, exactly like
// get_session / session_event_busy. We therefore DON'T gate on auth.getUser()
// (a guest carries only the anon key). Cross-participant taste + saved events
// are read with the SERVICE ROLE, so RLS never hides another member's data from
// the shared board — mirroring session_event_busy's "same picture for everyone"
// contract. Only in-window event details escape, and only for THIS session's
// participants.
//
// The "For you" section stays empty (configured:false) until TICKETMASTER_API_KEY
// is set — a free key from developer.ticketmaster.com. Same key the existing
// ticketmaster-events function uses; we call the Discovery API directly here so
// the request works for guests (that function gates on a signed-in user).
//
// Secret: TICKETMASTER_API_KEY (free, developer.ticketmaster.com)
// Deploy: supabase functions deploy overlap-recommendations
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const norm = (s: string) => (s || '').trim().toLowerCase()

// ── Taste ranking shared by both sources ─────────────────────────────────────
type Taste = Map<string, { weight: number; who: string[] }>

// Match an event's lineup against the group's taste. Returns the best hit
// (highest-weight artist) or null. `weight` = how many members like that artist.
function tasteMatch(artistNorms: string[], taste: Taste) {
  let best: { artist: string; weight: number; who: string[] } | null = null
  for (const n of artistNorms) {
    const hit = taste.get(n)
    if (hit && (!best || hit.weight > best.weight)) best = { artist: n, weight: hit.weight, who: hit.who }
  }
  return best
}

// ── Ticketmaster catalog ─────────────────────────────────────────────────────
interface CatalogEvent {
  id: string
  title: string
  attractions: string[]
  date: string
  time: string
  venue: string
  url: string
  image: string
}

const NYC_DMA = '345' // New York DMA (covers NYC + boroughs), same as ticketmaster-events.

// The day after `date` as YYYY-MM-DD, so the UTC query window covers an NYC
// evening/night whose late shows spill past midnight UTC.
const nextDay = (date: string) => {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Query Ticketmaster's Discovery API for that night's NYC music events. Off
// (configured:false) until TICKETMASTER_API_KEY is set. We filter on the event's
// local date so tz skew in the UTC window can't leak neighbouring days.
async function fetchTicketmaster(date: string) {
  const key = Deno.env.get('TICKETMASTER_API_KEY')
  if (!key) return { configured: false, events: [] as CatalogEvent[] }

  const p = new URLSearchParams({
    apikey: key,
    dmaId: NYC_DMA,
    classificationName: 'music',
    sort: 'date,asc',
    size: '100',
    startDateTime: `${date}T00:00:00Z`,
    endDateTime: `${nextDay(date)}T08:00:00Z`,
  })
  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${p.toString()}`)
    if (!res.ok) return { configured: true, events: [] as CatalogEvent[] }
    const data = await res.json()
    // deno-lint-ignore no-explicit-any
    const raw: any[] = data?._embedded?.events || []
    const events = raw
      .map((e): CatalogEvent => {
        const venue = e._embedded?.venues?.[0]
        const attractions = (e._embedded?.attractions || []).map((a: { name: string }) => a.name)
        return {
          id: String(e.id),
          title: e.name || 'Untitled',
          attractions: attractions.filter(Boolean),
          date: e.dates?.start?.localDate || '',
          time: e.dates?.start?.localTime?.slice(0, 5) || '',
          venue: venue?.name || '',
          url: e.url || '',
          image: (e.images || []).sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0]?.url || '',
        }
      })
      .filter((e) => e.date === date)
    return { configured: true, events }
  } catch {
    return { configured: true, events: [] as CatalogEvent[] }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  let body: { session_id?: string; date?: string } = {}
  try { body = await req.json() } catch { /* defaults */ }
  const sessionId = body.session_id
  const date = body.date
  if (!sessionId || !date) return json({ error: 'session_id and date are required' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Validate the session capability + expiry (same guard as the RPCs).
  const { data: session } = await admin
    .from('overlap_sessions')
    .select('id, city, expires_at')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return json({ error: 'not_found' }, 404)
  if (new Date(session.expires_at) < new Date()) return json({ error: 'expired' }, 410)

  // Participants → build the group taste map from their Spotify/Apple artists.
  const { data: participants } = await admin
    .from('overlap_participants')
    .select('user_id, display_name')
    .eq('session_id', sessionId)
  const members = (participants || []).filter((p) => p.user_id)

  const taste: Taste = new Map()
  if (members.length) {
    const { data: artists } = await admin
      .from('music_artists')
      .select('user_id, artist_norm')
      .in('user_id', members.map((m) => m.user_id))
    const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]))
    for (const a of artists || []) {
      const cur = taste.get(a.artist_norm) || { weight: 0, who: [] as string[] }
      const who = nameOf.get(a.user_id)
      if (who && !cur.who.includes(who)) { cur.who.push(who); cur.weight += 1 }
      taste.set(a.artist_norm, cur)
    }
  }

  // ── Source 1: "For you" — Ticketmaster catalog, Spotify-taste-ranked ────────
  const catalog = await fetchTicketmaster(date)
  const forYouCards = catalog.events
    .map((e) => {
      const m = tasteMatch(e.attractions.map(norm), taste)
      return { ...e, source: 'forYou', matched: m?.artist || null, matchedWho: m?.who || [], weight: m?.weight || 0 }
    })
    .sort((a, b) => b.weight - a.weight || (a.time < b.time ? -1 : 1))

  // ── Source 2: the group's own saved events on this date, taste-ranked ───────
  // deno-lint-ignore no-explicit-any
  let savedCards: any[] = []
  if (members.length) {
    const { data: saved } = await admin
      .from('events')
      .select('id, title, artist, venue, event_date, owner_id')
      .in('owner_id', members.map((m) => m.user_id))
      .eq('event_date', date)
    const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]))
    // Collapse the same show saved by multiple members into one card.
    // deno-lint-ignore no-explicit-any
    const byKey = new Map<string, { row: any; savedBy: string[] }>()
    for (const row of saved || []) {
      const k = norm(row.title) + '|' + norm(row.venue)
      const who = nameOf.get(row.owner_id)
      const entry = byKey.get(k) || { row, savedBy: [] }
      if (who && !entry.savedBy.includes(who)) entry.savedBy.push(who)
      byKey.set(k, entry)
    }
    savedCards = [...byKey.values()]
      .map(({ row, savedBy }) => {
        const attractions = row.artist ? String(row.artist).split(',') : []
        const m = tasteMatch(attractions.map(norm), taste)
        return {
          id: row.id,
          title: row.title,
          artist: row.artist || '',
          attractions,
          date: row.event_date,
          venue: row.venue || '',
          source: 'saved',
          savedBy,
          matched: m?.artist || null,
          matchedWho: m?.who || [],
          weight: m?.weight || 0,
        }
      })
      .sort((a, b) => b.weight - a.weight || b.savedBy.length - a.savedBy.length)
  }

  return json({
    configured: catalog.configured,
    tasteCount: taste.size,
    forYou: forYouCards,
    saved: savedCards,
  })
})
