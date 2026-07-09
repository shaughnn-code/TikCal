// Returns the signed-in user's Google Calendar busy blocks for a date range, so
// the Plan tab can show real availability. JWT-protected (verify_jwt = true).
// Refreshes the access token transparently when it's expired.
//
// Secrets:  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Deploy:   supabase functions deploy google-freebusy
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
async function freshToken(admin: any, conn: any): Promise<string | null> {
  const stillValid = conn.expires_at && new Date(conn.expires_at).getTime() - Date.now() > 60_000
  if (stillValid && conn.access_token) return conn.access_token
  if (!conn.refresh_token) return conn.access_token || null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const t = await res.json()
  if (!t.access_token) return null
  await admin
    .from('calendar_connections')
    .update({
      access_token: t.access_token,
      expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', conn.user_id)
  return t.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  let body: { timeMin?: string; timeMax?: string } = {}
  try { body = await req.json() } catch { /* defaults below */ }
  const timeMin = body.timeMin || new Date().toISOString()
  const timeMax = body.timeMax || new Date(Date.now() + 45 * 86400000).toISOString()

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: conn } = await admin.from('calendar_connections').select('*').eq('user_id', user.id).maybeSingle()
  if (!conn) return json({ connected: false, busy: [] })

  const token = await freshToken(admin, conn)
  if (!token) return json({ connected: false, busy: [], error: 'reauth' })

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
    })
    const data = await res.json()
    const busy = data?.calendars?.primary?.busy || []
    return json({ connected: true, email: conn.google_email || null, busy })
  } catch {
    return json({ connected: true, busy: [], error: 'freebusy-failed' }, 200)
  }
})
