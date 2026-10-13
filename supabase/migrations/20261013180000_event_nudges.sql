-- Nudges: the owner of a *shared* show pings specific friends or crews
-- ("Nick nudged you about a show: Bonobo, Dec 12"). Feeds the in-app
-- notifications page.
--
-- Rows are only ever created by nudge_event() below, which is where the rules
-- live: you must own the show, the show must be shared (friends and/or at
-- least one crew), and every recipient must already be able to see it. There
-- is deliberately no INSERT policy, so the table can't be written around it.
--
-- Safe to re-run: guarded with IF NOT EXISTS / OR REPLACE / DROP POLICY.

create table if not exists public.event_nudges (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  sender_id    uuid not null references auth.users(id)    on delete cascade,
  recipient_id uuid not null references auth.users(id)    on delete cascade,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  unique (event_id, sender_id, recipient_id)
);

create index if not exists event_nudges_recipient_idx
  on public.event_nudges (recipient_id, created_at desc);

alter table public.event_nudges enable row level security;

drop policy if exists "read own nudges" on public.event_nudges;
create policy "read own nudges" on public.event_nudges
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Recipients may mark a nudge read; the column grant below keeps that the only
-- thing an UPDATE can touch.
drop policy if exists "recipient marks nudge read" on public.event_nudges;
create policy "recipient marks nudge read" on public.event_nudges
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "delete own nudges" on public.event_nudges;
create policy "delete own nudges" on public.event_nudges
  for delete using (sender_id = auth.uid() or recipient_id = auth.uid());

revoke all on public.event_nudges from anon, authenticated;
grant select, delete on public.event_nudges to authenticated;
grant update (read_at) on public.event_nudges to authenticated;

-- Nudge people and/or whole crews about one of your shared shows. Returns how
-- many new nudges were created; anyone already nudged about this show is
-- skipped rather than pinged twice.
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
    -- individually chosen people
    select unnest(coalesce(p_users, '{}')) as uid
    union
    -- everyone in a chosen crew, but only crews this show is shared into
    select cm.user_id
    from public.crew_members cm
    join public.event_crews ec on ec.crew_id = cm.crew_id and ec.event_id = p_event
    where cm.crew_id = any (coalesce(p_crews, '{}'))
  ),
  allowed as (
    select p.uid
    from picked p
    where p.uid <> me
      and (
        -- a friend, on a show shared with friends
        (ev.share_friends and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = me and f.addressee_id = p.uid)
              or (f.addressee_id = me and f.requester_id = p.uid))
        ))
        -- or a member of a crew the show is shared into
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
