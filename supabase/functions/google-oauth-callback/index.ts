// Google's redirect lands here after the user approves. Public (verify_jwt =
// false) — Google sends the browser here with ?code & ?state (no user JWT). We
// verify state, swap the code for tokens, store them, and bounce back to the app.
//
// Secrets:  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL (optional, default tikcal.nyc)
// Deploy:   supabase functions deploy google-oauth-callback --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'

const APP = () => Deno.env.get('APP_URL') || 'https://tikcal.nyc'
const back = (status: string) => Response.redirect(`${APP()}/profile?google=${status}`, 302)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error')) return back('denied')
  if (!code || !state) return back('error')

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  if (!clientId || !clientSecret) return back('error')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Verify + consume the state (single use).
  const { data: stateRow } = await admin.from('oauth_states').select('user_id').eq('state', state).maybeSingle()
  if (!stateRow) return back('error')
  await admin.from('oauth_states').delete().eq('state', state)
  const uid = stateRow.user_id

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
