-- ─────────────────────────────────────────────────────────────────────────────
-- TikCal: RSVPs ("who's in / out") + crew color-coding
--
-- Apply once against your Supabase project:
--   • Supabase Dashboard → SQL Editor → paste + Run, OR
--   • supabase db push  (if you use the CLI with this migrations dir)
--
-- Safe to re-run: everything is guarded with IF NOT EXISTS / OR REPLACE.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Per-event RSVP: each user marks in / maybe / out ──────────────────────
create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id)    on delete cascade,
  status     text not null default 'in' check (status in ('in', 'maybe', 'out')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_rsvps enable row level security;

-- Read any RSVP whose event you're allowed to see. The events table's own RLS
-- applies inside this EXISTS, so this naturally scopes to owner + friends + crews.
drop policy if exists "read rsvps for visible events" on public.event_rsvps;
create policy "read rsvps for visible events" on public.event_rsvps
  for select using (
    exists (select 1 from public.events e where e.id = event_id)
  );

-- You may only create/change/remove your own RSVP, and only on a visible event.
drop policy if exists "insert own rsvp" on public.event_rsvps;
create policy "insert own rsvp" on public.event_rsvps
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id)
  );

drop policy if exists "update own rsvp" on public.event_rsvps;
create policy "update own rsvp" on public.event_rsvps
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own rsvp" on public.event_rsvps;
create policy "delete own rsvp" on public.event_rsvps
  for delete using (user_id = auth.uid());

-- ── 2. Crew color-coding ─────────────────────────────────────────────────────
-- One accent color per crew so events show which group you're out with.
-- Defaults to ice; the crew owner can change it in the app.
alter table public.crews
  add column if not exists color text not null default '#4cc9f0';
