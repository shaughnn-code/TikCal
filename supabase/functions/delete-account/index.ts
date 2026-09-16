// Permanently deletes the calling user's TikCal account: their auth record
// and every row they own (profiles, events, crews, RSVPs, calendar/music
// connections, ...). JWT-protected (verify_jwt = true).
//
// Every foreign key in the public schema that references auth.users(id) is
// ON DELETE CASCADE (verified against the live project), so deleting the auth
// user purges all of it at the database level. The one thing that doesn't
// cascade is Storage: uploaded flyers live under `flyers/<user_id>/...` and
// have to be removed explicitly first.
//
// Deploy: supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'Not signed in.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Storage isn't covered by the DB's cascading FKs -- remove the user's
  // uploaded flyers before dropping their auth record.
  const { data: flyerFiles } = await admin.storage.from('flyers').list(user.id)
  if (flyerFiles?.length) {
    await admin.storage.from('flyers').remove(flyerFiles.map((f) => `${user.id}/${f.name}`))
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true })
})
