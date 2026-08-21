-- Crew leaderboard: ranks crew members by shows attended (past events they
-- shared into this crew). Only counts events already visible to the crew via
-- event_crews — no new privacy exposure beyond what members can already see
-- individually; this just aggregates it into a rank.
create or replace function public.crew_show_stats(p_crew uuid)
returns table (
  user_id uuid,
  name text,
  totem text,
  shows_count bigint,
  venues_count bigint
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select
    e.owner_id as user_id,
    p.name,
    p.totem,
    count(distinct e.id) as shows_count,
    count(distinct e.venue) filter (where e.venue is not null and e.venue <> '') as venues_count
  from event_crews ec
  join events e on e.id = ec.event_id
  join profiles p on p.id = e.owner_id
  where ec.crew_id = p_crew
    and e.event_date < current_date
    and private.is_crew_member(p_crew, auth.uid())
  group by e.owner_id, p.name, p.totem
  order by shows_count desc, venues_count desc;
$$;

revoke execute on function public.crew_show_stats(uuid) from public;
grant execute on function public.crew_show_stats(uuid) to authenticated;
