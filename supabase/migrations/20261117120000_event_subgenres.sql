-- ─────────────────────────────────────────────────────────────────────────────
-- TikCal: cached EDM subgenre tags for Discover events
--   Filled by the `tag-subgenres` edge function (service role) using TypeSafe's
--   Jev model. One row per (source, event_id), so an event is only tagged once.
--   subgenre = a Discover subgenre value, 'electronic' (EDM, subgenre unclear),
--   or 'none' (not an EDM event).
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.event_subgenres (
  source     text not null check (source in ('ticketmaster', 'ra', 'dice')),
  event_id   text not null,
  subgenre   text not null,
  edm        real,
  model      text,
  tagged_at  timestamptz not null default now(),
  primary key (source, event_id)
);

alter table public.event_subgenres enable row level security;

-- Signed-in users can read tags. No INSERT/UPDATE/DELETE policy: only the edge
-- function (service role, which bypasses RLS) writes.
drop policy if exists "event_subgenres read" on public.event_subgenres;
create policy "event_subgenres read" on public.event_subgenres
  for select to authenticated using (true);

-- Tags carry no user data, but keep the table out of anon's reach entirely.
revoke all on public.event_subgenres from anon;
revoke all on public.event_subgenres from authenticated;
grant select on public.event_subgenres to authenticated;
