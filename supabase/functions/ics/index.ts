// TikCal .ics subscribe feed. Serves a user's whole TikCal calendar as
// text/calendar so Apple / Google / Outlook can subscribe and auto-refresh.
//
// Public webhook (verify_jwt = false) — gated by the per-user feed token:
//   https://<ref>.supabase.co/functions/v1/ics?token=<uuid>
// Deploy with:  supabase functions deploy ics --no-verify-jwt
//
// Because there's no user JWT, we use the service role and re-implement the same
// visibility rules the app's RLS enforces (own + friends' shared + crew events).
import { createClient } from 'npm:@supabase/supabase-js@2'

const esc = (s = '') =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

const ymd = (d: string) => (d || '').replaceAll('-', '')
const nextYmd = (d: string) => {
  const dt = new Date(d + 'T12:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + 1)
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

// deno-lint-ignore no-explicit-any
function vevent(e: any): string {
  const summary = e.artist ? `${e.title} — ${e.artist}` : e.title
  const desc = [e.artist ? `Artist: ${e.artist}` : '', e.notes || '', `On TikCal: https://tikcal.nyc/events/${e.id}`]
    .filter(Boolean)
    .join('\n')
  return [
    'BEGIN:VEVENT',
    `UID:${e.id}@tikcal.nyc`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${ymd(e.event_date)}`,
    `DTEND;VALUE=DATE:${nextYmd(e.event_date)}`,
    `SUMMARY:${esc(summary)}`,
    e.venue ? `LOCATION:${esc(e.venue)}` : '',
    `DESCRIPTION:${esc(desc)}`,
    `URL:https://tikcal.nyc/events/${e.id}`,
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: feed } = await admin.from('calendar_feeds').select('user_id').eq('token', token).maybeSingle()
  if (!feed) return new Response('Unknown feed', { status: 404 })
  const uid = feed.user_id

  // Visibility, mirroring app RLS: own events + friends' friend-shared + crew events.
  const { data: friendships } = await admin
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
    .eq('status', 'accepted')
  const friendIds = (friendships || []).map((f) => (f.requester_id === uid ? f.addressee_id : f.requester_id))

  const { data: myCrews } = await admin.from('crew_members').select('crew_id').eq('user_id', uid)
  const crewIds = (myCrews || []).map((c) => c.crew_id)

  let crewEventIds: string[] = []
  if (crewIds.length) {
    const { data: ec } = await admin.from('event_crews').select('event_id').in('crew_id', crewIds)
    crewEventIds = [...new Set((ec || []).map((r) => r.event_id))]
  }

  const byId: Record<string, unknown> = {}
  const collect = (rows: unknown[] | null) => (rows || []).forEach((r) => (byId[(r as { id: string }).id] = r))

  // own
  const own = await admin.from('events').select('*').eq('owner_id', uid)
  collect(own.data)
  // friends' shared-to-friends
  if (friendIds.length) {
    const fr = await admin.from('events').select('*').eq('share_friends', true).in('owner_id', friendIds)
    collect(fr.data)
  }
  // crew events
  if (crewEventIds.length) {
    const cr = await admin.from('events').select('*').in('id', crewEventIds)
    collect(cr.data)
  }

  const events = Object.values(byId).sort((a, b) =>
    (a as { event_date: string }).event_date < (b as { event_date: string }).event_date ? -1 : 1,
  )

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TikCal//Concert Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:TikCal',
    'X-WR-CALDESC:Your shows and your crew’s shows',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...events.map(vevent),
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="tikcal.ics"',
      'Cache-Control': 'public, max-age=1800',
    },
  })
})
