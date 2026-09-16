// Spotify's redirect lands here. Public (verify_jwt = false). We verify state,
// swap the code for tokens, pull the user's top + followed artists, store
// everything, and bounce back to the app.
//
// Secrets:  SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, APP_URL (optional)
// Note: APP_SCHEME mirrors google-oauth-callback, src/lib/platform.js, the iOS
// Info.plist, and the Android manifest -- change it in all if it ever changes.
// Deploy:   supabase functions deploy spotify-oauth-callback --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP = () => Deno.env.get('APP_URL') || 'https://tikcal.nyc'
const APP_SCHEME = 'tikcal'
// A native build opened this flow in the system browser, so an https redirect
// would leave the user stranded there with the app still waiting behind it;
// the custom scheme hands control back instead. `platform` comes off the
// verified state row, never the query string, so the target is always ours.
const back = (platform: string, s: string) => {
  const target = platform === 'ios' || platform === 'android' ? `${APP_SCHEME}://discover?spotify=${s}` : `${APP()}/discover?spotify=${s}`
  return Response.redirect(target, 302)
}
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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Resolve + consume the state (single use) before anything else: it carries
  // the platform, and without it we can't route even a failure back correctly.
  let uid = ''
  let platform = 'web'
  if (state) {
    const { data: stateRow } = await admin.from('oauth_states').select('user_id, platform').eq('state', state).maybeSingle()
    if (stateRow) {
      uid = stateRow.user_id
      platform = stateRow.platform || 'web'
      await admin.from('oauth_states').delete().eq('state', state)
    }
  }

  if (url.searchParams.get('error')) return back(platform, 'denied')
  if (!code || !uid) return back(platform, 'error')

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')
  if (!clientId || !clientSecret) return back(platform, 'error')

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
    return back(platform, 'error')
  }
  if (!tok.access_token) return back(platform, 'error')

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

  return back(platform, 'connected')
})
