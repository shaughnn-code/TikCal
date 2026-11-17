// Runs the Sync (Overlap) migrations against a stub schema in PGlite and
// checks the guest-token fix as the non-owner roles anon and authenticated,
// so grants and RLS actually apply.
//
// Usage (PGlite is not a project dependency):
//   mkdir -p /tmp/pg && cd /tmp/pg && npm i @electric-sql/pglite
//   cp <repo>/docs/sql/overlap-sync.pglite-test.mjs /tmp/pg/ && node /tmp/pg/overlap-sync.pglite-test.mjs <repo>
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.argv[2] || '.'
const mig = (f) => readFileSync(join(REPO, 'supabase/migrations', f), 'utf8')
const NEW = mig('20261110130000_overlap_guest_tokens.sql')

const db = new PGlite()
const A = '00000000-0000-0000-0000-00000000000a' // session creator
const B = '00000000-0000-0000-0000-00000000000b' // another logged-in user
const C = '00000000-0000-0000-0000-00000000000c' // logged in, not in the session
let fails = 0
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) fails++ }

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create schema private;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth, private, public to authenticated, anon;
grant execute on function auth.uid() to public;
insert into auth.users values ('${A}'), ('${B}'), ('${C}');
create table public.events (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  title text not null, event_date date not null default current_date);
create publication supabase_realtime;
-- Stub of Supabase's realtime.send(): record what would be broadcast.
create schema realtime;
create table realtime.sent (payload jsonb, event text, topic text, private boolean, at timestamptz default clock_timestamp());
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
  language sql as $$ insert into realtime.sent (payload, event, topic, private) values (payload, event, topic, private) $$;
-- Simulate Supabase default privileges handing everything to anon/authenticated.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema private grant all on tables to anon, authenticated;
`)

await db.exec(mig('20260707000001_overlap_feature.sql'))
await db.exec(mig('20260709031500_fix_cleanup_execute_grant.sql'))
await db.exec(NEW)
ok('migrations applied', true)

// Run SQL as a role. uid null = anon.
const as = async (uid, sql, params = []) => {
  const role = uid ? 'authenticated' : 'anon'
  await db.exec(`reset role; select set_config('test.uid', '${uid || ''}', false); set role ${role};`)
  try { return { rows: (await db.query(sql, params)).rows } } catch (e) { return { error: e.message } } finally { await db.exec('reset role') }
}
const rpc = async (uid, sql, params) => {
  const r = await as(uid, `select ${sql} as r`, params)
  return r.error ? { error: r.error } : r.rows[0].r
}

const S = '00000000-0000-0000-0000-000000000051'
await db.exec(`insert into public.overlap_sessions (id, creator_id, range_start, range_end) values ('${S}', '${A}', current_date, current_date + 6)`)
await db.exec(`insert into public.events (owner_id, title) values ('${A}', 'secret show')`)

// Joins.
const jA = await rpc(A, `public.join_session($1, 'Alice')`, [S])
ok('A joins as herself, is_me, no token', jA?.is_me === true && !jA.guest_token && jA.user_id === A)
const jB = await rpc(B, `public.join_session($1, 'Bob')`, [S])
const g1 = await rpc(null, `public.join_session($1, 'Guest One')`, [S])
ok('guest 1 gets a token', /^[0-9a-f-]{36}$/.test(g1?.guest_token || '') && g1.is_me === true && !g1.user_id)
const g2 = await rpc(null, `public.join_session($1, 'Guest Two')`, [S])
ok('guest 2 gets a different token', g2?.guest_token && g2.guest_token !== g1.guest_token)
ok('session full at 4', (await rpc(null, `public.join_session($1, 'X')`, [S]))?.error === 'full')
const jA2 = await rpc(A, `public.join_session($1, 'Alice again')`, [S])
ok('A rejoin is idempotent and has no token', jA2?.id === jA.id && !jA2.guest_token)

// Old 3-arg join_session (anon could pass any p_user_id) is gone.
ok('old join_session(uuid,text,uuid) dropped', !!(await rpc(null, `public.join_session($1, 'Evil', $2::uuid)`, [S, A])).error)

// get_session leaks nothing.
const sees = [
  ['anon', await rpc(null, `public.get_session($1)`, [S])],
  ['guest 1', await rpc(null, `public.get_session($1, $2)`, [S, g1.guest_token])],
  ['B', await rpc(B, `public.get_session($1)`, [S])],
  ['outsider C', await rpc(C, `public.get_session($1)`, [S])],
]
for (const [who, r] of sees) {
  const txt = JSON.stringify(r)
  const others = who === 'B' ? [A, C] : [A, B, C]
  ok(`${who}: get_session has no other user_id`, others.every((u) => !txt.includes(u)))
  ok(`${who}: get_session has no guest token`, !txt.includes(g1.guest_token) && !txt.includes(g2.guest_token))
  ok(`${who}: get_session has no creator_id`, !txt.includes('creator_id') && r.is_creator === false)
  ok(`${who}: 4 participants rendered`, r.participants?.length === 4 && r.participants.every((p) => p.display_name && p.color && p.availability))
}
const meG1 = sees[1][1].participants.filter((p) => p.is_me)
ok('guest 1 is_me is exactly their row', meG1.length === 1 && meG1[0].id === g1.id && !meG1[0].user_id)
ok('anon without token has no is_me', sees[0][1].participants.every((p) => !p.is_me))
const meB = sees[2][1].participants.filter((p) => p.is_me)
ok('B is_me is their row, with only their own user_id', meB.length === 1 && meB[0].id === jB.id && meB[0].user_id === B)
const rA = await rpc(A, `public.get_session($1)`, [S])
ok('creator sees is_creator', rA.is_creator === true && !JSON.stringify(rA).includes('creator_id'))

// update_availability.
const av = (k) => JSON.stringify({ [k]: 'free' })
const upd = (uid, pid, k, tok) => rpc(uid, `public.update_availability(p_session_id => $1, p_participant_id => $2::uuid, p_availability => $3::jsonb, p_guest_token => $4::uuid)`, [S, pid, av(k), tok])
const availOf = async (pid) => (await db.query(`select availability from public.overlap_participants where id = $1`, [pid])).rows[0].availability

ok('guest 1 edits own row', (await upd(null, g1.id, 'g1', g1.guest_token))?.id === g1.id && (await availOf(g1.id)).g1 === 'free')
ok('guest 1 edits own row without passing participant id', (await upd(null, null, 'g1b', g1.guest_token))?.id === g1.id)
ok("guest 1 token cannot edit guest 2's row", (await upd(null, g2.id, 'x', g1.guest_token))?.error === 'forbidden' && !(await availOf(g2.id)).x)
ok("guest token cannot edit logged-in A's row", (await upd(null, jA.id, 'x', g1.guest_token))?.error === 'forbidden' && !(await availOf(jA.id)).x)
ok('participant id alone (old hole) is refused', (await upd(null, jA.id, 'x', null))?.error === 'forbidden')
ok('random token refused', (await upd(null, g2.id, 'x', '12345678-1234-4234-8234-123456789abc'))?.error === 'forbidden')
ok("logged-in B cannot edit A's row", (await upd(B, jA.id, 'x', null))?.error === 'forbidden' && !(await availOf(jA.id)).x)
ok("logged-in B cannot edit a guest's row, even holding its token", (await upd(B, g1.id, 'x', g1.guest_token))?.error === 'forbidden')
ok('logged-in B edits own row', (await upd(B, jB.id, 'b', null))?.id === jB.id && (await availOf(jB.id)).b === 'free')
ok('outsider C has no row to edit', (await upd(C, null, 'x', null))?.error === 'forbidden')
const sigs = (await db.query(`select p.oid::regprocedure::text f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('get_session','join_session','update_availability') order by 1`)).rows.map((r) => r.f)
ok('only the new signatures exist', JSON.stringify(sigs) === JSON.stringify([
  'get_session(uuid,uuid)', 'join_session(uuid,text)', 'update_availability(uuid,uuid,jsonb,jsonb,uuid)']))
// A guest's token is scoped to its session.
const S2 = '00000000-0000-0000-0000-000000000052'
await db.exec(`insert into public.overlap_sessions (id, creator_id, range_start, range_end) values ('${S2}', '${A}', current_date, current_date + 6)`)
const h = await rpc(null, `public.join_session($1, 'H')`, [S2])
ok("session 2 guest token can't edit in session 1", (await upd(null, g1.id, 'x', h.guest_token))?.error === 'forbidden')

// Direct table access: nobody can list participants or sessions table-wide.
const none = (r) => !!r.error || r.rows.length === 0
ok('anon: select session_id from overlap_participants returns nothing', none(await as(null, `select session_id from public.overlap_participants`)))
ok('anon: select * from overlap_participants returns nothing', none(await as(null, `select * from public.overlap_participants`)))
ok('authenticated member: select session_id from overlap_participants returns nothing', none(await as(B, `select session_id from public.overlap_participants`)))
ok('authenticated creator: select from overlap_participants returns nothing', none(await as(A, `select id from public.overlap_participants`)))
ok('anon: select from overlap_sessions returns nothing', none(await as(null, `select id from public.overlap_sessions`)))
ok('non-creator: select from overlap_sessions returns nothing', none(await as(B, `select id from public.overlap_sessions`)))
ok('creator still lists own sessions', (await as(A, `select id from public.overlap_sessions`)).rows?.length === 2)
ok('participants dropped from supabase_realtime publication',
  (await db.query(`select count(*)::int n from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'overlap_participants'`)).rows[0].n === 0)

// Live updates: a data-free broadcast on overlap:<session_id>.
await db.exec('delete from realtime.sent')
await upd(null, g1.id, 'bcast', g1.guest_token)
const sent = (await db.query(`select * from realtime.sent`)).rows
ok('edit broadcasts "changed" on overlap:<session> (public channel)', sent.length === 1 && sent[0].event === 'changed' && sent[0].topic === `overlap:${S}` && sent[0].private === false)
ok('broadcast carries no row data', !JSON.stringify(sent[0]?.payload).includes('bcast') && !JSON.stringify(sent[0]?.payload).includes(g1.id))
await db.exec('drop function realtime.send(jsonb, text, text, boolean)')
ok('a broken realtime.send never blocks the write', (await upd(null, g1.id, 'nort', g1.guest_token))?.id === g1.id)
await db.exec(`create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
  language sql as $$ insert into realtime.sent (payload, event, topic, private) values (payload, event, topic, private) $$`)
const before = JSON.stringify(await availOf(g1.id))
const w = await as(null, `update public.overlap_participants set availability = '{"pwn":"free"}'`)
ok('anon cannot write participants directly (RLS: no update policy)', !!w.error || JSON.stringify(await availOf(g1.id)) === before)
ok('anon cannot read guest tokens', !!(await as(null, `select * from private.overlap_guest_tokens`)).error)
ok('authenticated cannot read guest tokens', !!(await as(B, `select * from private.overlap_guest_tokens`)).error)
ok('tokens stored hashed, not raw', (await db.query(`select count(*)::int n from private.overlap_guest_tokens where token_hash = convert_to($1, 'UTF8')`, [g1.guest_token])).rows[0].n === 0)
ok('anon cannot call private helpers', !!(await as(null, `select private.overlap_my_participant_id($1::uuid, $2::uuid)`, [S, g1.guest_token])).error)

// Grants: nothing inherits through PUBLIC.
const acl = (await db.query(`select p.oid::regprocedure::text f, coalesce(p.proacl::text, '') a from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname = 'public' and p.proname in ('get_session','join_session','update_availability')) or (n.nspname = 'private' and p.proname like 'overlap_%')`)).rows
ok('no Sync RPC executable by PUBLIC', acl.every((r) => r.a !== '' && !/(^|[{,])=X/.test(r.a)))
ok('private helpers not granted to anon/authenticated', acl.filter((r) => r.f.startsWith('private.')).every((r) => !/anon|authenticated/.test(r.a)))

// Cascade: deleting a participant deletes its token.
await db.exec(`delete from public.overlap_participants where id = '${g2.id}'`)
ok('token removed with its participant', (await db.query(`select count(*)::int n from private.overlap_guest_tokens where participant_id = $1`, [g2.id])).rows[0].n === 0)

// Re-running the migration is safe.
const re = await db.exec(NEW).then(() => null, (e) => e.message)
ok('migration re-runs cleanly', re === null)
ok('guest 1 still edits after re-run', (await upd(null, g1.id, 'again', g1.guest_token))?.id === g1.id)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
