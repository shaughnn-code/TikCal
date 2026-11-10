-- Cache for the parse.bot discovery sources (RA, DICE). The ra-events and
-- dice-events edge functions read this instead of scraping on every Find
-- visit, and refresh a row at most every few hours. parse.bot's free tier is
-- 200 credits/month per source, and uncached scrapes were also slow enough to
-- time out the client.
--
-- Only the edge functions touch this table, with the service role. RLS is on
-- with no policies, and anon/authenticated get no privileges, so the Data API
-- exposes nothing to clients.
--
-- Safe to re-run.

create table if not exists public.discovery_cache (
  source       text primary key check (source in ('ra', 'dice')),
  events       jsonb not null default '[]'::jsonb,
  fetched_at   timestamptz,  -- last successful scrape
  attempted_at timestamptz,  -- last scrape attempt (claim + backoff)
  last_error   text
);

alter table public.discovery_cache enable row level security;

revoke all on public.discovery_cache from public, anon, authenticated;
grant select, insert, update on public.discovery_cache to service_role;

insert into public.discovery_cache (source) values ('ra'), ('dice')
on conflict (source) do nothing;
