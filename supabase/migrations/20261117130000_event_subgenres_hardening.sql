-- ─────────────────────────────────────────────────────────────────────────────
-- TikCal: harden tag-subgenres (security review follow-up)
--   1. text_hash: hash of the event text that was tagged. A cached tag is only
--      served when a caller's text hashes the same, so client-supplied text for
--      a real event id cannot poison what other users see.
--   2. jev_usage + jev_take_quota(): per-user daily cap on events sent to Jev.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.event_subgenres add column if not exists text_hash text;

create table if not exists public.jev_usage (
  user_id uuid not null,
  day     date not null default current_date,
  n       integer not null default 0,
  primary key (user_id, day)
);

alter table public.jev_usage enable row level security;
-- No policies: only the service role (edge function) touches this table.
revoke all on public.jev_usage from anon, authenticated;

-- Atomically reserves up to p_want events from the user's daily budget and
-- returns how many were granted (0..p_want).
create or replace function public.jev_take_quota(p_user uuid, p_want integer, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
  granted integer;
begin
  insert into public.jev_usage (user_id, day, n) values (p_user, current_date, 0)
    on conflict (user_id, day) do nothing;
  select n into used from public.jev_usage
    where user_id = p_user and day = current_date for update;
  granted := greatest(0, least(p_want, p_limit - used));
  update public.jev_usage set n = n + granted
    where user_id = p_user and day = current_date;
  return granted;
end;
$$;

revoke execute on function public.jev_take_quota(uuid, integer, integer) from public;
revoke execute on function public.jev_take_quota(uuid, integer, integer) from anon, authenticated;
grant execute on function public.jev_take_quota(uuid, integer, integer) to service_role;
