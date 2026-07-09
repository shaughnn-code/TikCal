// Refreshes the user's Spotify token (if needed) and re-pulls their top +
// followed artists. JWT-protected. Called from the app's "Refresh" action.
//
// Secrets:  SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
// Deploy:   supabase functions deploy spotify-sync
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const norm = (s: string) => s.trim().toLowerCase()

// deno-lint-ignore no-explicit-any
async function freshToken(admin: any, conn: any): Promise<string | null> {
  const valid = conn.expires_at && new Date(conn.expires_at).getTime() - Date.now() > 60_000
  if (valid && conn.access_token) return conn.access_token
  if (!conn.refresh_token) return conn.access_token || null
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
  })
  const t = await res.json()
  if (!t.access_token) return null
  await admin
    .from('music_connections')
    .update({
      access_token: t.access_token,
      ...(t.refresh_token ? { refresh_token: t.refresh_token } : {}),
      expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', conn.user_id)
    .eq('provider', 'spotify')
  return t.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: conn } = await admin
    .from('music_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'spotify')
    .maybeSingle()
  if (!conn) return json({ connected: false, count: 0 })

  const token = await freshToken(admin, conn)
  if (!token) return json({ connected: false, count: 0, error: 'reauth' })

  const headers = { Authorization: `Bearer ${token}` }
  const rows: Record<string, unknown> = {}
  try {
    const r = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', { headers })
    const d = await r.json()
    ;(d.items || []).forEach((a: { name: string; id: string }, i: number) => {
      rows[norm(a.name)] = { user_id: user.id, provider: 'spotify', artist_name: a.name, artist_norm: norm(a.name), artist_id: a.id, rank: i }
    })
  } catch { /* ignore */ }
  try {
    const r = await fetch('https://api.spotify.com/v1/me/following?type=artist&limit=50', { headers })
    const d = await r.json()
    ;(d.artists?.items || []).forEach((a: { name: string; id: string }, i: number) => {
      if (!rows[norm(a.name)]) rows[norm(a.name)] = { user_id: user.id, provider: 'spotify', artist_name: a.name, artist_norm: norm(a.name), artist_id: a.id, rank: 100 + i }
    })
  } catch { /* ignore */ }

  const list = Object.values(rows)
  await admin.from('music_artists').delete().eq('user_id', user.id).eq('provider', 'spotify')
  if (list.length) await admin.from('music_artists').insert(list)
  return json({ connected: true, count: list.length })
})
