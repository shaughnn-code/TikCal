// Mints an Apple MusicKit **developer token** (ES256 JWT) so the web app can
// initialize MusicKit and, after the user authorizes, read their library
// artists. JWT-protected (only signed-in TikCal users can fetch it).
//
// Requires an Apple Developer Program membership ($99/yr) and a MusicKit key:
//   APPLE_MUSIC_TEAM_ID     — your 10-char Apple Team ID
//   APPLE_MUSIC_KEY_ID      — the MusicKit key's Key ID
//   APPLE_MUSIC_PRIVATE_KEY — contents of the AuthKey_XXX.p8 (PEM, PKCS8)
// Deploy:  supabase functions deploy apple-music-token
//
// NOTE: This is the server half. The frontend MusicKit JS flow + library read
// are documented in supabase/functions/README.md and gated on this being
// configured. Untested end-to-end pending an Apple Developer account.
import { create, getNumericDate } from 'npm:djwt@3'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const teamId = Deno.env.get('APPLE_MUSIC_TEAM_ID')
  const keyId = Deno.env.get('APPLE_MUSIC_KEY_ID')
  const privateKey = Deno.env.get('APPLE_MUSIC_PRIVATE_KEY')
  if (!teamId || !keyId || !privateKey) return json({ configured: false, error: 'Apple Music not configured.' }, 200)

  // Gate on a signed-in TikCal user.
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToPkcs8(privateKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
    const token = await create(
      { alg: 'ES256', kid: keyId },
      { iss: teamId, iat: getNumericDate(0), exp: getNumericDate(60 * 60 * 24 * 180) },
      key,
    )
    return json({ configured: true, token })
  } catch (e) {
    return json({ configured: true, error: `Could not sign token: ${e}` }, 500)
  }
})
