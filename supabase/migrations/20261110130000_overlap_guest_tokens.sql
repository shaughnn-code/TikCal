-- Sync (Overlap) security fix: guests get a real secret, and nothing hands out
-- other people's ids.
--
-- The hole this closes (20260707000001_overlap_feature.sql):
--   * get_session() returned to_jsonb(row) for every participant: their
--     participant id, their user_id, and the session's creator_id.
--   * update_availability() let anyone who knew a participant id overwrite that
--     row. Guests were "authorized" by holding their own participant id, but
--     get_session() gave every id to anyone with the share link. So a share link
--     was enough to overwrite anyone's nights, logged-in users' rows included,
--     and to learn their user_ids.
--   * join_session() let an anonymous caller pass any p_user_id, so a guest
--     could create (or be handed back) a row bound to someone else's account,
--     which also made session_event_busy() expose that person's show dates.
--   * The participants table itself was readable through the Data API with the
--     anon key, user_id included, for every session.
--
-- New contract (all SECURITY DEFINER, callable by anon + authenticated):
--   get_session(p_session_id, p_guest_token default null)
--     -> { session: {...no creator_id...}, is_creator,
--          participants: [{ id, display_name, color, sources, availability,
--                           google_synced_at, joined_at, is_me }] }
--     The caller's own row (and only that row) also carries user_id, so app
--     builds already installed from the App Store, which match "me" on
--     user_id, keep working for logged-in users.
--   join_session(p_session_id, p_display_name)
--     -> the caller's own participant (shape above, is_me = true), plus
--        guest_token ONLY on the call that creates a guest row. That token is
--        the guest's secret; it is never returned again by anything.
--   update_availability(p_session_id, p_participant_id default null,
--                       p_availability default null, p_sources default null,
--                       p_guest_token default null)
--     The server finds the caller's row itself:
--       logged in -> the row with user_id = auth.uid(); a guest token is ignored
--       anonymous -> the guest row whose token hash matches; never a row
--                    that has a user_id
--     p_participant_id is optional; if given it must be that same row.
--
-- Participant ids stay in the API as public ids (the grid, best-windows and
-- session_event_busy() key on them). They are no longer a capability.
--
-- Guest tokens are stored only as sha256 hashes, in private.overlap_guest_tokens:
-- not in the participants table, which anon can read and Realtime streams.
--
-- Guests who joined before this migration have no token. Their row stays on the
-- board (read-only) and still counts toward the 4-person cap; the app asks them
-- to join again under a name.
--
-- Postgres grants EXECUTE on new functions to PUBLIC, so every function below
-- is revoked from public first, then granted explicitly (see CLAUDE.md).
--
-- Re-runnable. Wrapped in a transaction so a failure leaves nothing half-applied.

begin;

-- ── Guest token store (not exposed through the Data API) ────────────────────
create schema if not exists private;

create table if not exists private.overlap_guest_tokens (
  participant_id uuid primary key
    references public.overlap_participants(id) on delete cascade,
  token_hash     bytea not null unique,
  created_at     timestamptz not null default now()
);

alter table private.overlap_guest_tokens enable row level security;
-- No policies on purpose: only the definer functions below touch this table.
revoke all on table private.overlap_guest_tokens from public, anon, authenticated;

-- ── Participants: anon/authenticated may read every column except user_id ───
-- The world-readable SELECT policy stays (Realtime needs it for guests), but
-- user_id is no longer selectable. Column-level grants: revoke the table-wide
-- SELECT, then grant the safe columns back.
revoke select on table public.overlap_participants from public, anon, authenticated;
grant select (id, session_id, display_name, color, sources, availability, google_synced_at, joined_at)
  on table public.overlap_participants to anon, authenticated;

-- ── Old signatures go away (a changed signature is a new overload otherwise) ─
drop function if exists public.get_session(uuid);
drop function if exists public.join_session(uuid, text, uuid);
drop function if exists public.update_availability(uuid, uuid, jsonb, jsonb);

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- sha256 of the token's text form. Built in (PG 11+), no pgcrypto needed.
create or replace function private.overlap_token_hash(p_token uuid)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select case when p_token is null then null
              else pg_catalog.sha256(pg_catalog.convert_to(p_token::text, 'UTF8')) end
$$;
revoke execute on function private.overlap_token_hash(uuid) from public, anon, authenticated;

-- The participant fields any session member may see. p_is_me adds is_me and,
-- for the caller's own row only, user_id.
create or replace function private.overlap_participant_json(
  p public.overlap_participants,
  p_is_me boolean
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
           'id',               p.id,
           'display_name',     p.display_name,
           'color',            p.color,
           'sources',          p.sources,
           'availability',     p.availability,
           'google_synced_at', p.google_synced_at,
           'joined_at',        p.joined_at,
           'is_me',            coalesce(p_is_me, false)
         )
         || case when coalesce(p_is_me, false) and p.user_id is not null
                 then pg_catalog.jsonb_build_object('user_id', p.user_id)
                 else '{}'::jsonb end
$$;
revoke execute on function private.overlap_participant_json(public.overlap_participants, boolean)
  from public, anon, authenticated;

-- Find the caller's own row in a session: by auth.uid() when logged in,
-- otherwise by guest token (guest rows only). Null when there is none.
create or replace function private.overlap_my_participant_id(
  p_session_id  uuid,
  p_guest_token uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is not null then
    select p.id into v_id
      from public.overlap_participants p
     where p.session_id = p_session_id and p.user_id = v_uid;
    return v_id;
  end if;

  if p_guest_token is null then return null; end if;

  select p.id into v_id
    from public.overlap_participants p
    join private.overlap_guest_tokens t on t.participant_id = p.id
   where p.session_id = p_session_id
     and p.user_id is null
     and t.token_hash = private.overlap_token_hash(p_guest_token);
  return v_id;
end;
$$;
revoke execute on function private.overlap_my_participant_id(uuid, uuid) from public, anon, authenticated;

-- ── get_session ─────────────────────────────────────────────────────────────
create or replace function public.get_session(
  p_session_id  uuid,
  p_guest_token uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s     public.overlap_sessions;
  v_me    uuid;
  v_parts jsonb;
begin
  select * into v_s from public.overlap_sessions where id = p_session_id;
  if not found then return null; end if;
  if v_s.expires_at < now() then return jsonb_build_object('error', 'expired'); end if;

  v_me := private.overlap_my_participant_id(p_session_id, p_guest_token);

  select coalesce(jsonb_agg(private.overlap_participant_json(p, p.id = v_me) order by p.joined_at, p.id),
                  '[]'::jsonb)
    into v_parts
    from public.overlap_participants p
   where p.session_id = p_session_id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id',                v_s.id,
      'name',              v_s.name,
      'timezone',          v_s.timezone,
      'range_start',       v_s.range_start,
      'range_end',         v_s.range_end,
      'days_of_week',      to_jsonb(v_s.days_of_week),
      'dayparts',          to_jsonb(v_s.dayparts),
      'max_participants',  v_s.max_participants,
      'city',              v_s.city,
      'proposed_event_id', v_s.proposed_event_id,
      'expires_at',        v_s.expires_at,
      'created_at',        v_s.created_at
    ),
    'is_creator', coalesce(auth.uid() = v_s.creator_id, false),
    'participants', v_parts
  );
end;
$$;

-- ── join_session ────────────────────────────────────────────────────────────
-- Logged-in callers always join as themselves (idempotent). Anonymous callers
-- always join as a new guest; they cannot claim an account.
create or replace function public.join_session(
  p_session_id   uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_s        public.overlap_sessions;
  v_count    int;
  v_existing public.overlap_participants;
  v_new      public.overlap_participants;
  v_token    uuid;
  v_palette  text[] := array['#4cc9f0','#6EE7B7','#6aa8ff','#c08bff'];
begin
  select * into v_s from public.overlap_sessions where id = p_session_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_s.expires_at < now() then return jsonb_build_object('error','expired'); end if;

  -- Serialize joins on this session so the cap can't be raced past.
  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));

  if v_uid is not null then
    select * into v_existing from public.overlap_participants
     where session_id = p_session_id and user_id = v_uid;
    if found then return private.overlap_participant_json(v_existing, true); end if;
  end if;

  select count(*) into v_count from public.overlap_participants where session_id = p_session_id;
  if v_count >= v_s.max_participants then
    return jsonb_build_object('error','full');
  end if;

  insert into public.overlap_participants (session_id, user_id, display_name, color, sources)
    values (
      p_session_id,
      v_uid,
      left(coalesce(nullif(trim(p_display_name), ''), 'Guest'), 40),
      v_palette[(v_count % 4) + 1],
      case when v_uid is not null
        then '{"tikcal": true,  "google": false, "manual": true}'::jsonb
        else '{"tikcal": false, "google": false, "manual": true}'::jsonb
      end
    )
    returning * into v_new;

  if v_uid is not null then
    return private.overlap_participant_json(v_new, true);
  end if;

  v_token := gen_random_uuid();
  insert into private.overlap_guest_tokens (participant_id, token_hash)
    values (v_new.id, private.overlap_token_hash(v_token));

  return private.overlap_participant_json(v_new, true)
         || jsonb_build_object('guest_token', v_token);
end;
$$;

-- ── update_availability ─────────────────────────────────────────────────────
create or replace function public.update_availability(
  p_session_id     uuid,
  p_participant_id uuid  default null,
  p_availability   jsonb default null,
  p_sources        jsonb default null,
  p_guest_token    uuid  default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s  public.overlap_sessions;
  v_me uuid;
  v_p  public.overlap_participants;
begin
  select * into v_s from public.overlap_sessions where id = p_session_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_s.expires_at < now() then return jsonb_build_object('error','expired'); end if;

  v_me := private.overlap_my_participant_id(p_session_id, p_guest_token);
  if v_me is null then return jsonb_build_object('error','forbidden'); end if;
  if p_participant_id is not null and p_participant_id <> v_me then
    return jsonb_build_object('error','forbidden');
  end if;

  update public.overlap_participants
     set availability = coalesce(p_availability, availability),
         sources      = coalesce(p_sources, sources)
   where id = v_me
  returning * into v_p;

  return private.overlap_participant_json(v_p, true);
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
revoke execute on function public.get_session(uuid, uuid)                             from public;
revoke execute on function public.join_session(uuid, text)                            from public;
revoke execute on function public.update_availability(uuid, uuid, jsonb, jsonb, uuid) from public;

grant execute on function public.get_session(uuid, uuid)                             to anon, authenticated;
grant execute on function public.join_session(uuid, text)                            to anon, authenticated;
grant execute on function public.update_availability(uuid, uuid, jsonb, jsonb, uuid) to anon, authenticated;

commit;
