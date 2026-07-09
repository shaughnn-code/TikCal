-- ─────────────────────────────────────────────────────────────────────────────
-- TikCal: calendar integrations
--   • calendar_feeds        → per-user secret token for the .ics subscribe feed
--   • calendar_connections  → OAuth tokens for Google Calendar (service-role only)
--   • oauth_states          → short-lived CSRF/state store for the OAuth redirect
--   • profiles.google_calendar_email → client-readable "connected as" indicator
--
-- Apply after 0001. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. .ics subscribe feed token ─────────────────────────────────────────────
-- The `ics` edge function serves text/calendar at ?token=<token>. Each user gets
-- one opaque token; treat the resulting URL as a secret (it exposes your calendar).
create table if not exists public.calendar_feeds (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;

drop policy if exists "own feed select" on public.calendar_feeds;
create policy "own feed select" on public.calendar_feeds
  for select using (user_id = auth.uid());

drop policy if exists "own feed insert" on public.calendar_feeds;
create policy "own feed insert" on public.calendar_feeds
  for insert with check (user_id = auth.uid());

-- Allows "regenerate my feed link" (rotate the token).
drop policy if exists "own feed update" on public.calendar_feeds;
create policy "own feed update" on public.calendar_feeds
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 2. Google Calendar OAuth token storage ───────────────────────────────────
-- Access + refresh tokens are secrets: NO row-level policies are created, so the
-- anon/authenticated roles cannot read this table at all. Only the edge functions
-- (service role, which bypasses RLS) ever touch it.
create table if not exists public.calendar_connections (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  provider      text not null default 'google',
  google_email  text,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.calendar_connections enable row level security;
-- No SELECT/INSERT/UPDATE policies — the anon/authenticated roles can never read
-- the tokens. The one exception: a user may DELETE their own row to disconnect
-- (DELETE returns no column data, so tokens stay secret).
drop policy if exists "own connection delete" on public.calendar_connections;
create policy "own connection delete" on public.calendar_connections
  for delete using (user_id = auth.uid());

-- ── 3. OAuth state (CSRF) — short-lived, service-role only ───────────────────
create table if not exists public.oauth_states (
  state      uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  provider   text not null default 'google',
  created_at timestamptz not null default now()
);
alter table public.oauth_states enable row level security;
-- (no policies — the start/callback edge functions manage this with service role)

-- ── 4. Client-visible "connected" indicator ─────────────────────────────────
-- The frontend reads profiles anyway; a non-secret email here lets it show
-- "Connected as you@gmail.com" without ever exposing tokens.
alter table public.profiles
  add column if not exists google_calendar_email text;
