-- ─────────────────────────────────────────────────────────────────────────────
-- TikCal: music taste + discovery
--   • music_connections → OAuth tokens for Spotify / Apple Music (service-role only)
--   • music_artists     → the user's followed/top artists (drives show matching)
--   • profiles.spotify_name / apple_music_on → client-readable "connected" flags
--
-- Ticketmaster needs no table — it's a stateless server-side search (API key in
-- the edge function). Apply after 0002. Safe to re-run.
-- Reuses the existing public.oauth_states table (has a `provider` column).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Music OAuth token storage (secrets → service-role only) ───────────────
create table if not exists public.music_connections (
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('spotify', 'apple')),
  display_name  text,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.music_connections enable row level security;
-- No SELECT/INSERT/UPDATE policies (tokens stay secret). Users may DELETE their
-- own row to disconnect (DELETE returns no column data).
drop policy if exists "own music conn delete" on public.music_connections;
create policy "own music conn delete" on public.music_connections
  for delete using (user_id = auth.uid());

-- ── 2. The user's artists (non-secret; client reads to match shows) ──────────
create table if not exists public.music_artists (
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null,
  artist_name text not null,
  artist_norm text not null,               -- lowercased, for matching
  artist_id   text,                        -- provider's id (optional)
  rank        int  not null default 999,   -- lower = more listened
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider, artist_norm)
);
alter table public.music_artists enable row level security;

drop policy if exists "own artists select" on public.music_artists;
create policy "own artists select" on public.music_artists
  for select using (user_id = auth.uid());

-- Edge functions (service role) do the writes, but allow the owner to clear too.
drop policy if exists "own artists delete" on public.music_artists;
create policy "own artists delete" on public.music_artists
  for delete using (user_id = auth.uid());

-- ── 3. Client-visible connection indicators ──────────────────────────────────
alter table public.profiles add column if not exists spotify_name text;
alter table public.profiles add column if not exists apple_music_on boolean not null default false;
