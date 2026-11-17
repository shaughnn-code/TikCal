-- Block + report (App Store guideline 1.2: apps with user-generated content
-- must let people block abusive users and report objectionable content, and
-- the developer must act on reports within 24 hours).
--
--   user_blocks   who you blocked. Only you see your own blocks; nobody can
--                 tell who blocked them. Rows are made only by block_user(),
--                 which also cuts every existing tie between the two people.
--   user_reports  reports about a person or a show. Insert-only through
--                 report_content(); no user can read reports back. Reviewed
--                 in the dashboard Table Editor (status open/actioned/dismissed).
--
-- Blocking is enforced in the database, not just hidden in the UI:
--   * friend requests and crew invites between a blocked pair are refused
--     (RESTRICTIVE insert policies), in both directions;
--   * nudge_event() skips blocked recipients;
--   * block_user() deletes the pair's friendship, pending crew invites and nudges.
-- Shows a blocked person shares into a crew you are both in are hidden by
-- the client (it reads your own user_blocks rows); the optional database rule
-- for that lives in 20261109120100_block_hides_events.sql.
--
-- Supabase Data API rule (since 2026-10-30): new tables get no default
-- grants, so every grant below is explicit.
--
-- Wrapped in a transaction so a failure leaves nothing half-applied.

begin;

-- ── user_blocks ──────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "read own blocks" on public.user_blocks;
create policy "read own blocks" on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));

drop policy if exists "unblock" on public.user_blocks;
create policy "unblock" on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- No INSERT policy: blocks are created only by block_user().
revoke all on public.user_blocks from anon, authenticated;
grant select, delete on public.user_blocks to authenticated;

-- ── Helper ───────────────────────────────────────────────────────────────────
-- True when either person has blocked the other. SECURITY DEFINER so policies
-- can see blocks the caller isn't allowed to read (the other person's).
create or replace function private.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks ub
    where (ub.blocker_id = a and ub.blocked_id = b)
       or (ub.blocker_id = b and ub.blocked_id = a)
  );
$$;

revoke execute on function private.is_blocked_pair(uuid, uuid) from public, anon;
grant execute on function private.is_blocked_pair(uuid, uuid) to authenticated;

-- ── user_reports ─────────────────────────────────────────────────────────────
create table if not exists public.user_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  event_id         uuid references public.events(id) on delete cascade,
  reason           text not null check (reason in
                     ('spam', 'harassment', 'hate', 'sexual', 'violence', 'impersonation', 'other')),
  details          text not null default '' check (char_length(details) <= 1000),
  status           text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  alerted_at       timestamptz,
  created_at       timestamptz not null default now(),
  check (reported_user_id is not null or event_id is not null)
);

create index if not exists user_reports_open_idx on public.user_reports (created_at desc) where status = 'open';
create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at desc);

alter table public.user_reports enable row level security;
-- No policies at all: users can neither read nor write this table directly.
revoke all on public.user_reports from anon, authenticated;
-- The report-alert function reads and stamps reports with the service role.
grant select, update on public.user_reports to service_role;

-- ── block_user / report_content ──────────────────────────────────────────────
create or replace function public.block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;
  if p_user is null or p_user = me then
    raise exception 'You can''t block yourself.';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'That person no longer exists.';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (me, p_user)
  on conflict do nothing;

  -- Cut every existing tie between the two people.
  delete from public.friendships
  where (requester_id = me and addressee_id = p_user)
     or (requester_id = p_user and addressee_id = me);

  delete from public.crew_invites
  where (inviter_id = me and invitee_id = p_user)
     or (inviter_id = p_user and invitee_id = me);

  delete from public.event_nudges
  where (sender_id = me and recipient_id = p_user)
     or (sender_id = p_user and recipient_id = me);
end;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- Files a report and returns its id (the client passes the id to the
-- report-alert function, which emails dev@tikcal.nyc). A report about a show
-- with no person named is filed against the show's owner too.
create or replace function public.report_content(
  p_user    uuid default null,
  p_event   uuid default null,
  p_reason  text default 'other',
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  target  uuid := p_user;
  new_id  uuid;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;
  if p_user is null and p_event is null then
    raise exception 'Say who or what you are reporting.';
  end if;

  if p_event is not null then
    -- Same visibility rule as the events SELECT policy, so a report can't be
    -- used to probe for shows you can't see. Missing and hidden read the same.
    select e.owner_id into target
    from public.events e
    where e.id = p_event
      and (e.owner_id = me
        or (e.share_friends and private.are_friends(e.owner_id, me))
        or private.event_visible_via_crew(e.id, me));
    if not found then
      raise exception 'That show no longer exists.';
    end if;
    -- A show report is always filed against the show's owner.
  end if;

  if target = me then
    raise exception 'You can''t report yourself.';
  end if;

  -- Light abuse guard: at most 20 reports per person per day.
  if (select count(*) from public.user_reports
      where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You''ve sent a lot of reports today. We''re reviewing them.';
  end if;

  insert into public.user_reports (reporter_id, reported_user_id, event_id, reason, details)
  values (me, target, p_event, coalesce(p_reason, 'other'), left(coalesce(p_details, ''), 1000))
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.report_content(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_content(uuid, uuid, text, text) to authenticated;

-- ── Enforce blocks on new ties ───────────────────────────────────────────────
-- RESTRICTIVE: these AND with the existing permissive insert policies.
drop policy if exists "no requests between blocked people" on public.friendships;
create policy "no requests between blocked people" on public.friendships
  as restrictive for insert to authenticated
  with check (not private.is_blocked_pair(requester_id, addressee_id));

drop policy if exists "no invites between blocked people" on public.crew_invites;
create policy "no invites between blocked people" on public.crew_invites
  as restrictive for insert to authenticated
  with check (not private.is_blocked_pair(inviter_id, invitee_id));

-- UPDATE too: otherwise an existing row could be edited to point at someone
-- who blocked you (or flip a declined invite back to pending).
drop policy if exists "no request edits between blocked people" on public.friendships;
create policy "no request edits between blocked people" on public.friendships
  as restrictive for update to authenticated
  with check (not private.is_blocked_pair(requester_id, addressee_id));

drop policy if exists "no invite edits between blocked people" on public.crew_invites;
create policy "no invite edits between blocked people" on public.crew_invites
  as restrictive for update to authenticated
  with check (not private.is_blocked_pair(inviter_id, invitee_id));

-- ── nudge_event: skip blocked recipients ─────────────────────────────────────
-- Same as 20261013180000_event_nudges.sql plus the is_blocked_pair line.
create or replace function public.nudge_event(
  p_event uuid,
  p_users uuid[] default '{}',
  p_crews uuid[] default '{}'
)
returns integer
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  me       uuid := auth.uid();
  ev       public.events%rowtype;
  has_crew boolean;
  n        integer;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select * into ev from public.events where id = p_event and owner_id = me;
  if not found then
    raise exception 'You can only nudge people about your own shows.';
  end if;

  select exists (select 1 from public.event_crews where event_id = p_event) into has_crew;
  if not ev.share_friends and not has_crew then
    raise exception 'Share this show with friends or a crew before nudging.';
  end if;

  with picked as (
    select unnest(coalesce(p_users, '{}')) as uid
    union
    select cm.user_id
    from public.crew_members cm
    join public.event_crews ec on ec.crew_id = cm.crew_id and ec.event_id = p_event
    where cm.crew_id = any (coalesce(p_crews, '{}'))
  ),
  allowed as (
    select p.uid
    from picked p
    where p.uid <> me
      and not private.is_blocked_pair(me, p.uid)
      and (
        (ev.share_friends and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = me and f.addressee_id = p.uid)
              or (f.addressee_id = me and f.requester_id = p.uid))
        ))
        or exists (
          select 1
          from public.event_crews ec
          join public.crew_members cm on cm.crew_id = ec.crew_id
          where ec.event_id = p_event and cm.user_id = p.uid
        )
      )
  ),
  ins as (
    insert into public.event_nudges (event_id, sender_id, recipient_id)
    select p_event, me, a.uid from allowed a
    on conflict (event_id, sender_id, recipient_id) do nothing
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

revoke execute on function public.nudge_event(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.nudge_event(uuid, uuid[], uuid[]) to authenticated;

commit;
