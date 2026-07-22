// Google's redirect lands here after the user approves. Public (verify_jwt =
// false) — Google sends the browser here with ?code & ?state (no user JWT). We
// verify state, swap the code for tokens, store them, and bounce back to the app.
//
// Secrets:  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL (optional, default tikcal.nyc)
// Note: APP_SCHEME below mirrors src/lib/platform.js, the iOS Info.plist, and
// the Android manifest — change it in all four or native deep links break.
// Deploy:   supabase functions deploy google-oauth-callback --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP = () => Deno.env.get('APP_URL') || 'https://tikcal.nyc'
const APP_SCHEME = 'tikcal'

// Where to send the browser when we're done. A native build opened this flow in
// the system browser, so an https redirect would leave the user on the website
// with the app still waiting behind it; the custom scheme hands control back
// instead. `platform` comes off the verified state row, never the query string,
// so the target is always one of ours.
const redirectBack = (platform: string, status: string) => {
  const target =
    platform === 'ios' || platform === 'android'
      ? `${APP_SCHEME}://profile?google=${status}`
      : `${APP()}/profile?google=${status}`
  return new Response(null, { status: 302, headers: { Location: target } })
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
    const { data: stateRow } = await admin
      .from('oauth_states')
      .select('user_id, platform')
      .eq('state', state)
      .maybeSingle()
    if (stateRow) {
      uid = stateRow.user_id
      platform = stateRow.platform || 'web'
      await admin.from('oauth_states').delete().eq('state', state)
    }
  }
  const back = (status: string) => redirectBack(platform, status)

  if (url.searchParams.get('error')) return back('denied')
  if (!code || !uid) return back('error')

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  if (!clientId || !clientSecret) return back('error')

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`

  // Exchange the authorization code for tokens.
  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    tokens = await res.json()
  } catch {
    return back('error')
  }
  if (!tokens.access_token) return back('error')

  // Fetch the Google account email (nice "connected as" label; non-secret).
  let email = ''
  try {
    const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const info = await ui.json()
    email = info.email || ''
  } catch { /* non-fatal */ }

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

  await admin.from('calendar_connections').upsert({
    user_id: uid,
    provider: 'google',
    google_email: email,
    access_token: tokens.access_token,
    // Google only returns a refresh_token on first consent; keep the old one if absent.
    ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })

  // Client-readable indicator (tokens stay in the locked-down table).
  await admin.from('profiles').update({ google_calendar_email: email }).eq('id', uid)

  return back('connected')
})
