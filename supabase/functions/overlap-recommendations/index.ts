// Overlap event recommendations for a single tapped window (spec §6).
//
// Two sources, ranked against the group's Spotify taste:
//   1. DICE feed (unofficial — see caveat below) — open discovery for the night.
//   2. The group's own saved TikCal events on that date — shows a participant
//      already Smart-Added, floated up by taste.
//
// Guest-capable: the session UUID in the URL is the capability, exactly like
// get_session / session_event_busy. We therefore DON'T gate on auth.getUser()
// (a guest carries only the anon key). Cross-participant taste + saved events
// are read with the SERVICE ROLE, so RLS never hides another member's data from
// the shared board — mirroring session_event_busy's "same picture for everyone"
// contract. Only in-window event details escape, and only for THIS session's
// participants.
//
// ⚠️ DICE has no official public API. TikCal's README documents that DICE/RA are
// normally handled ToS-safely via Smart Add. This function calls an UNOFFICIAL
// DICE endpoint on the owner's explicit instruction. It's isolated behind env
// config and fails soft (dice: []), so it can be pulled or repointed without
// touching the client: set DICE_API_BASE (+ optional DICE_API_KEY) to enable.
//
// Secret (optional): DICE_API_KEY, DICE_API_BASE (default https://api.dice.fm)
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

// ── DICE (unofficial) ────────────────────────────────────────────────────────
// Fetch a page of upcoming events for the city, then keep those on `date`. DICE
// event objects vary; we map defensively and skip anything unrecognisable.
async function fetchDice(date: string, city: string) {
  const base = Deno.env.get('DICE_API_BASE')
  if (!base) return { configured: false, events: [] as DiceEvent[] }
  const key = Deno.env.get('DICE_API_KEY')

  const url = `${base.replace(/\/$/, '')}/v2/events?` +
    new URLSearchParams({ 'filter[cities][]': city, 'page[size]': '100' }).toString()
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; TikCalBot/1.0)',
        ...(key ? { 'x-api-key': key } : {}),
      },
    })
    if (!res.ok) return { configured: true, events: [] as DiceEvent[] }
    const data = await res.json()
    const raw: unknown[] = data?.data || data?.events || data?._embedded?.events || []
    const events = raw.map(mapDice).filter((e): e is DiceEvent => !!e && e.date === date)
    return { configured: true, events }
  } catch {
    return { configured: true, events: [] as DiceEvent[] }
  }
}

interface DiceEvent {
  id: string
  title: string
  attractions: string[]
  date: string
  time: string
  venue: string
  url: string
  image: string
}

// deno-lint-ignore no-explicit-any
function mapDice(e: any): DiceEvent | null {
  if (!e || typeof e !== 'object') return null
  const iso: string = e.date || e.dates?.event_start_date || e.event_start_date || ''
  const date = iso.slice(0, 10)
  if (!date) return null
  const timeMatch = /T(\d{2}:\d{2})/.exec(iso)
  const venueObj = Array.isArray(e.venues) ? e.venues[0] : e.venue
  const lineup: string[] =
    e.summary_lineup?.top_artists?.map((a: { name: string }) => a.name) ||
    e.lineup?.map((a: { name?: string } | string) => (typeof a === 'string' ? a : a.name)) ||
    (e.artist ? String(e.artist).split(',') : [])
  return {
    id: String(e.id ?? e.perm_name ?? crypto.randomUUID()),
    title: e.name || e.title || 'Untitled',
    attractions: lineup.filter(Boolean),
    date,
    time: timeMatch?.[1] || '',
    venue: venueObj?.name || venueObj || '',
    url: e.social_links?.event_url || e.url || e.share_url || '',
    image: e.event_images?.landscape || e.images?.landscape || e.image || '',
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

  const city = session.city || 'New York'

  // ── Source 1: DICE discovery, taste-ranked ─────────────────────────────────
  const dice = await fetchDice(date, city)
  const diceCards = dice.events
    .map((e) => {
      const m = tasteMatch(e.attractions.map(norm), taste)
      return { ...e, source: 'dice', matched: m?.artist || null, matchedWho: m?.who || [], weight: m?.weight || 0 }
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
    configured: dice.configured,
    tasteCount: taste.size,
    dice: diceCards,
    saved: savedCards,
  })
})
