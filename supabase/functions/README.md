# TikCal Edge Functions & Integration Setup

Edge functions run on Supabase (Deno). The frontend deploys to GitHub Pages, but
these functions and their secrets must be deployed to the Supabase project
separately — they are **not** part of the GitHub Pages build.

Project ref: `pirlflebmiylgusmqhhk`

## Prereqs (once)

```bash
npm i -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref pirlflebmiylgusmqhhk
```

## Database migrations

Apply the SQL in `supabase/migrations/` (SQL Editor → paste + Run, or CLI):

```bash
supabase db push
```

- `0001_rsvp_and_crew_colors.sql` — RSVPs + crew colors
- `0002_calendar_integrations.sql` — `.ics` feed token, Google OAuth token
  storage, `profiles.google_calendar_email`

## Functions

| Function | verify_jwt | Purpose |
|---|---|---|
| `ingest` | true | Smart Add (existing) |
| `inbound` | false | Email auto-import (existing) |
| `ics` | **false** | Per-user `.ics` subscribe feed |
| `google-oauth-start` | true | Begin Google Calendar OAuth |
| `google-oauth-callback` | **false** | Google redirect target; stores tokens |
| `google-freebusy` | true | Read the user's Google busy times for Plan |

Deploy (the `--no-verify-jwt` flag matters for the public ones):

```bash
supabase functions deploy ics --no-verify-jwt
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback --no-verify-jwt
supabase functions deploy google-freebusy
```

## Secrets

`ics` needs nothing beyond the built-in `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` (auto-injected).

Google functions need a Google Cloud OAuth client:

```bash
supabase secrets set GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
supabase secrets set GOOGLE_CLIENT_SECRET=xxxx
supabase secrets set APP_URL=https://tikcal.nyc     # where callback returns the user
```

### Google Cloud setup (one-time)

1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → Enable APIs** → enable **Google Calendar API**.
3. **OAuth consent screen** → External. Add scope
   `.../auth/calendar.readonly`. While unverified, add yourself as a **Test
   user** (verification is only required for a public launch of the sensitive
   scope).
4. **Credentials → Create OAuth client ID → Web application.**
   - **Authorized redirect URI:**
     `https://pirlflebmiylgusmqhhk.supabase.co/functions/v1/google-oauth-callback`
5. Copy the client ID/secret into the `supabase secrets set` commands above.

## Music + discovery (Spotify / Apple Music / Ticketmaster / RA / DICE)

Apply `0003_music_taste_and_discovery.sql`, then deploy:

```bash
supabase functions deploy spotify-oauth-start
supabase functions deploy spotify-oauth-callback --no-verify-jwt
supabase functions deploy spotify-sync
supabase functions deploy ticketmaster-events
supabase functions deploy apple-music-token
```

Secrets:

```bash
# Spotify — https://developer.spotify.com/dashboard (create an app)
#   Redirect URI: https://pirlflebmiylgusmqhhk.supabase.co/functions/v1/spotify-oauth-callback
supabase secrets set SPOTIFY_CLIENT_ID=xxxx
supabase secrets set SPOTIFY_CLIENT_SECRET=xxxx

# Ticketmaster — https://developer.ticketmaster.com (free Discovery API key)
supabase secrets set TICKETMASTER_API_KEY=xxxx

# Apple Music — requires Apple Developer Program ($99/yr) + a MusicKit key (.p8)
supabase secrets set APPLE_MUSIC_TEAM_ID=xxxx
supabase secrets set APPLE_MUSIC_KEY_ID=xxxx
supabase secrets set APPLE_MUSIC_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
```

**DICE & Resident Advisor** have no official public API. They are handled ToS-safely
by the existing **Smart Add** — paste an event link or screenshot on the Add page.
(An unofficial RA GraphQL endpoint exists but is against their terms; not used.)

## Overlap recommendations (spec §6)

`overlap-recommendations` powers the event picks in the Overlap window detail sheet.
Guest-safe: it authorizes on the session UUID (the capability) and reads
cross-participant taste + saved events with the service role, so no `verify_jwt`
change is needed. Ranks two sources against the group's Spotify taste — their
**followed + top artists**, synced into `music_artists` by `spotify-sync`:

- **For you** — Ticketmaster's music catalog for that night, floated up by the
  group's Spotify taste. Spotify has no public events/concerts API, so
  Ticketmaster is the queryable catalog (Spotify's own recommended merge pattern).
  Off (`forYou: []`) until `TICKETMASTER_API_KEY` is set — the same free key the
  `ticketmaster-events` function uses. We call the Discovery API directly here so
  the request works for guests (that function gates on a signed-in user).
- **Your crew saved** — events any participant already Smart-Added on that date.
  Works with no extra config.

```bash
supabase functions deploy overlap-recommendations
# Lights up "For you" — free key from developer.ticketmaster.com (shared with the
# Discover tab, so setting it once enables both):
supabase secrets set TICKETMASTER_API_KEY=xxxx
```

> DICE / Resident Advisor were evaluated as the catalog and rejected: DICE exposes
> data only through a partner API that hard-gates on an issued key (401 without
> one), and RA's only endpoint is the unofficial GraphQL one their terms forbid.
> Ticketmaster is the one catalog with a legitimate, free, self-serve API.

**Apple Music note:** `apple-music-token` mints the MusicKit developer token
(server half, standard ES256 — not yet verified end-to-end). The browser half
(load MusicKit JS, `music.authorize()`, read `/v1/me/library/artists`, then write
rows to `music_artists` with provider `apple`) is the remaining step, gated on the
Apple Developer account.

## Feature status

| Integration | Ships via | Needs |
|---|---|---|
| Per-event Add-to-Calendar (Google/Outlook/.ics) | GitHub Pages (live) | nothing |
| `.ics` subscribe feed | Pages UI + `ics` fn | `0002` migration + deploy `ics` |
| Google Calendar (free/busy in Plan) | Pages UI + 3 Google fns | `0002` + deploy fns + Google secrets |
| Discover / "For You" (Spotify + Ticketmaster) | Pages UI + fns | `0003` + deploy fns + Spotify/TM keys |
| DICE / Resident Advisor | Smart Add (live) | nothing (paste link/screenshot) |
| Overlap event picks (Ticketmaster + saved × Spotify) | Overlap sheet + `overlap-recommendations` fn | deploy fn; "For you" needs `TICKETMASTER_API_KEY` |
| Apple Music | `apple-music-token` fn + TODO frontend | Apple Developer account |
