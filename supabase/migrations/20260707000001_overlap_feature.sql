-- ============================================================================
-- Overlap feature — pooled free-time finder + event matchmaker
-- Spec: docs/tikcal-overlap-spec.md §3
--
-- Apply with:  supabase db push   (once the CLI is linked)
--   or paste into the Supabase SQL editor.
--
-- Access model: the session UUID (in the share URL) is the capability. Guests
-- have no auth. All cross-participant reads/writes go through the SECURITY
-- DEFINER RPCs below, which validate the session id, expiry and the 4-person
-- cap in-body (per the supabase skill's guidance for definer functions).
-- ============================================================================

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.overlap_sessions (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references auth.users(id) on delete cascade,
  name             text not null default 'Untitled Overlap',
  timezone         text not null default 'America/New_York',
  range_start      date not null,
  range_end        date not null,
  days_of_week     int[]  not null default '{0,6}',      -- 0=Sun..6=Sat; default weekends
  dayparts         text[] not null default '{night}',    -- subset of {morning,midday,night}
  max_participants int  not null default 4 check (max_participants between 2 and 4),
  city             text,                                 -- event-recs scope; defaults to creator city in app
  proposed_event_id uuid,                                -- optional pinned "propose this" (future)
  expires_at       timestamptz not null default (now() + interval '30 days'),
  created_at       timestamptz default now(),
  constraint overlap_range_valid    check (range_end >= range_start),
  constraint overlap_range_max_90d  check (range_end <= range_start + 90),
  constraint overlap_dow_valid      check (days_of_week <@ array[0,1,2,3,4,5,6]),
  constraint overlap_dayparts_valid check (dayparts <@ array['morning','midday','night'])
);

create table if not exists public.overlap_participants (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.overlap_sessions(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete cascade,  -- null for guests
  display_name     text not null,
  color            text not null,
  sources          jsonb not null default '{"tikcal": false, "google": false, "manual": true}'::jsonb,
  -- availability: { "YYYY-MM-DD:daypart": "free" | "busy" }. Unset key = unknown.
  -- ≤ 90 days × 3 dayparts = ≤270 keys, so one blob per participant (spec §3).
  availability     jsonb not null default '{}'::jsonb,
  google_synced_at timestamptz,
  joined_at        timestamptz default now(),
  unique (session_id, user_id)   -- guests keep user_id null; NULLs are distinct, so many guests are fine
);

create index if not exists overlap_participants_session_idx
  on public.overlap_participants (session_id);

-- ── Row-level security ───────────────────────────────────────────────────────

alter table public.overlap_sessions     enable row level security;
alter table public.overlap_participants enable row level security;

-- Sessions: locked to their creator for all direct access. Everyone else reads a
-- single session only through get_session() (which validates the capability).
create policy "overlap_sessions owner select" on public.overlap_sessions
  for select to authenticated using ((select auth.uid()) = creator_id);
create policy "overlap_sessions owner insert" on public.overlap_sessions
  for insert to authenticated with check ((select auth.uid()) = creator_id);
create policy "overlap_sessions owner update" on public.overlap_sessions
  for update to authenticated
  using ((select auth.uid()) = creator_id)
  with check ((select auth.uid()) = creator_id);
create policy "overlap_sessions owner delete" on public.overlap_sessions
  for delete to authenticated using ((select auth.uid()) = creator_id);

-- Participants — SELECT only, for BOTH roles.
--
-- v1 TRADE-OFF (read this): participant rows carry a user-chosen display name and
-- a free/busy blob — explicitly disposable data (spec §3). They are readable via
-- the anon key so Supabase Realtime can stream live grid updates to guests who
-- hold only the session URL, a capability RLS cannot inspect. Sessions stay
-- locked. No INSERT/UPDATE/DELETE policy exists, so ALL writes must go through the
-- SECURITY DEFINER RPCs below. Follow-up before wide launch: move realtime to
-- Realtime Authorization / private channels so this SELECT can be scoped by
-- session capability instead of being world-readable.
create policy "overlap_participants realtime select" on public.overlap_participants
  for select to anon, authenticated using (true);

-- ── Privilege grants (tables may not be auto-exposed to the Data API) ─────────
grant select, insert, update, delete on public.overlap_sessions to authenticated;
grant select on public.overlap_participants to anon, authenticated;
-- deliberately NO insert/update/delete grant on participants: writes go via RPC.

-- ── RPCs (SECURITY DEFINER; validate the capability in-body) ─────────────────

-- Read a session + its participants by id, if it exists and hasn't expired.
create or replace function public.get_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.overlap_sessions;
  v_participants jsonb;
begin
  select * into v_session from public.overlap_sessions where id = p_session_id;
  if not found then return null; end if;
  if v_session.expires_at < now() then return jsonb_build_object('error', 'expired'); end if;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.joined_at), '[]'::jsonb)
    into v_participants
    from public.overlap_participants p
    where p.session_id = p_session_id;

  return jsonb_build_object('session', to_jsonb(v_session), 'participants', v_participants);
end;
$$;

-- Join a session. Authenticated callers always join as themselves (idempotent);
-- guests pass a display name and get back a participant row whose id is their
-- bearer capability (stored client-side in localStorage).
create or replace function public.join_session(
  p_session_id  uuid,
  p_display_name text,
  p_user_id     uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session  public.overlap_sessions;
  v_count    int;
  v_existing public.overlap_participants;
  v_new      public.overlap_participants;
  v_palette  text[] := array['#4cc9f0','#6EE7B7','#6aa8ff','#c08bff'];
begin
  select * into v_session from public.overlap_sessions where id = p_session_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_session.expires_at < now() then return jsonb_build_object('error','expired'); end if;

  -- An authenticated caller can only join as themselves.
  if auth.uid() is not null then p_user_id := auth.uid(); end if;

  -- Serialize joins on this session so the cap can't be raced past.
  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));

  -- Returning logged-in user: hand back the existing row.
  if p_user_id is not null then
    select * into v_existing from public.overlap_participants
      where session_id = p_session_id and user_id = p_user_id;
    if found then return to_jsonb(v_existing); end if;
  end if;

  select count(*) into v_count from public.overlap_participants where session_id = p_session_id;
  if v_count >= v_session.max_participants then
    return jsonb_build_object('error','full');
  end if;

  insert into public.overlap_participants (session_id, user_id, display_name, color, sources)
    values (
      p_session_id,
      p_user_id,
      coalesce(nullif(trim(p_display_name), ''), 'Guest'),
      v_palette[(v_count % 4) + 1],
      case when p_user_id is not null
        then '{"tikcal": true,  "google": false, "manual": true}'::jsonb
        else '{"tikcal": false, "google": false, "manual": true}'::jsonb
      end
    )
    returning * into v_new;

  return to_jsonb(v_new);
end;
$$;

-- Replace a participant's availability (and optionally sources). Authenticated
-- callers may only edit their own row; guests bear the participant id.
create or replace function public.update_availability(
  p_session_id     uuid,
  p_participant_id uuid,
  p_availability   jsonb,
  p_sources        jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.overlap_sessions;
  v_p       public.overlap_participants;
begin
  select * into v_session from public.overlap_sessions where id = p_session_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_session.expires_at < now() then return jsonb_build_object('error','expired'); end if;

  select * into v_p from public.overlap_participants
    where id = p_participant_id and session_id = p_session_id;
  if not found then return jsonb_build_object('error','not_participant'); end if;

  -- Logged-in users can't edit someone else's row; guests are gated by holding
  -- the (unguessable) participant id returned from join_session.
  if auth.uid() is not null and v_p.user_id is not null and v_p.user_id <> auth.uid() then
    return jsonb_build_object('error','forbidden');
  end if;

  update public.overlap_participants
    set availability = coalesce(p_availability, availability),
        sources      = coalesce(p_sources, sources)
    where id = p_participant_id
    returning * into v_p;

  return to_jsonb(v_p);
end;
$$;

grant execute on function public.get_session(uuid)                         to anon, authenticated;
grant execute on function public.join_session(uuid, text, uuid)            to anon, authenticated;
grant execute on function public.update_availability(uuid, uuid, jsonb, jsonb) to anon, authenticated;

-- ── Realtime + expiry cleanup ────────────────────────────────────────────────

-- Stream participant changes so grids update live (spec §5).
alter publication supabase_realtime add table public.overlap_participants;

-- Nightly disposal of expired sessions (spec §3). The function is defined here;
-- schedule it once pg_cron is enabled, e.g.:
--   select cron.schedule('overlap-cleanup','0 4 * * *', $$select public.cleanup_expired_overlaps()$$);
create or replace function public.cleanup_expired_overlaps()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.overlap_sessions where expires_at < now();
$$;
revoke execute on function public.cleanup_expired_overlaps() from anon, authenticated;
