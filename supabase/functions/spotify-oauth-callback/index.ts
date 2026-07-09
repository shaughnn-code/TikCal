// Spotify's redirect lands here. Public (verify_jwt = false). We verify state,
// swap the code for tokens, pull the user's top + followed artists, store
// everything, and bounce back to the app.
//
// Secrets:  SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, APP_URL (optional)
// Deploy:   supabase functions deploy spotify-oauth-callback --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP = () => Deno.env.get('APP_URL') || 'https://tikcal.nyc'
const back = (s: string) => Response.redirect(`${APP()}/discover?spotify=${s}`, 302)
const norm = (s: string) => s.trim().toLowerCase()

// Pull top + followed artists and (re)write them for this user.
// deno-lint-ignore no-explicit-any
export async function syncArtists(admin: any, uid: string, accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const rows: Record<string, { user_id: string; provider: string; artist_name: string; artist_norm: string; artist_id: string | null; rank: number }> = {}

  // Top artists (medium term) — ranked.
  try {
    const r = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', { headers })
    const d = await r.json()
    ;(d.items || []).forEach((a: { name: string; id: string }, i: number) => {
      const k = norm(a.name)
      rows[k] = { user_id: uid, provider: 'spotify', artist_name: a.name, artist_norm: k, artist_id: a.id, rank: i }
    })
  } catch { /* ignore */ }

  // Followed artists — appended (rank after top).
  try {
    const r = await fetch('https://api.spotify.com/v1/me/following?type=artist&limit=50', { headers })
    const d = await r.json()
    ;(d.artists?.items || []).forEach((a: { name: string; id: string }, i: number) => {
      const k = norm(a.name)
      if (!rows[k]) rows[k] = { user_id: uid, provider: 'spotify', artist_name: a.name, artist_norm: k, artist_id: a.id, rank: 100 + i }
    })
  } catch { /* ignore */ }

  const list = Object.values(rows)
  await admin.from('music_artists').delete().eq('user_id', uid).eq('provider', 'spotify')
  if (list.length) await admin.from('music_artists').insert(list)
  return list.length
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error')) return back('denied')
  if (!code || !state) return back('error')

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')
  if (!clientId || !clientSecret) return back('error')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: stateRow } = await admin.from('oauth_states').select('user_id').eq('state', state).maybeSingle()
  if (!stateRow) return back('error')
  await admin.from('oauth_states').delete().eq('state', state)
  const uid = stateRow.user_id

  // Exchange code for tokens (Basic auth = client_id:client_secret).
  let tok: { access_token?: string; refresh_token?: string; expires_in?: number }
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-oauth-callback`,
      }),
    })
    tok = await res.json()
  } catch {
    return back('error')
  }
  if (!tok.access_token) return back('error')

  // Display name for the "connected as" label.
  let displayName = ''
  try {
    const me = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tok.access_token}` } })
    const info = await me.json()
    displayName = info.display_name || info.id || ''
  } catch { /* non-fatal */ }

  await admin.from('music_connections').upsert({
    user_id: uid,
    provider: 'spotify',
    display_name: displayName,
    access_token: tok.access_token,
    ...(tok.refresh_token ? { refresh_token: tok.refresh_token } : {}),
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })

  await syncArtists(admin, uid, tok.access_token)
  await admin.from('profiles').update({ spotify_name: displayName }).eq('id', uid)

  return back('connected')
})
