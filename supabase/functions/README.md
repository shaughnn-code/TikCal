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

## Feature status

| Integration | Ships via | Needs |
|---|---|---|
| Per-event Add-to-Calendar (Google/Outlook/.ics) | GitHub Pages (live) | nothing |
| `.ics` subscribe feed | Pages UI + `ics` fn | `0002` migration + deploy `ics` |
| Google Calendar (free/busy in Plan) | Pages UI + 3 Google fns | `0002` + deploy fns + Google secrets |
