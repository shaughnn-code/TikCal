// Begins Spotify OAuth. JWT-protected: the signed-in user calls it, we mint a
// CSRF `state`, and return the Spotify authorize URL to redirect to.
//
// Secrets:  SPOTIFY_CLIENT_ID
// Deploy:   supabase functions deploy spotify-oauth-start
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SCOPES = 'user-top-read user-follow-read'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  if (!clientId) return json({ error: 'Spotify is not configured.' }, 500)

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: st, error } = await admin
    .from('oauth_states')
    .insert({ user_id: user.id, provider: 'spotify' })
    .select('state')
    .single()
  if (error) return json({ error: 'Could not start the connection.' }, 500)

  const p = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-oauth-callback`,
    scope: SCOPES,
    state: st.state,
  })
  return json({ url: `https://accounts.spotify.com/authorize?${p.toString()}` })
})
