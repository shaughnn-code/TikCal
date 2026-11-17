# Discover: subgenre tagging with Jev

Discover's subgenre chips come from two sources, in this order:

1. **Keyword rules** (`src/lib/discoverFilters.js`, `heuristicSubgenre`). First match wins.
2. **Jev** (TypeSafe's System One model) for events the keywords could only call "electronic". Tags come from the `tag-subgenres` edge function.

## Moving parts

| Piece | Where |
| --- | --- |
| Pure helpers (request builder, answer parser) | `supabase/functions/_shared/jevSubgenre.js` (tested in `src/lib/jevSubgenre.test.js`) |
| Edge function | `supabase/functions/tag-subgenres/index.ts` (JWT required) |
| Client call | `fetchSubgenreTags` in `src/lib/db.js`, used by `src/pages/Discover.jsx` |
| Cache table | `public.event_subgenres`, primary key `(source, event_id, text_hash)` |
| Quota | `public.jev_usage` + RPC `jev_take_quota` (service role only) |
| Secret | `TYPESAFE_API_KEY` (Supabase secret; never in client code) |

Per event, one Jev request asks a Choice (subgenre) plus a companion Noul ("is this EDM at all?"). Noul below 0.3 means not EDM; at or above 0.7 with Choice top probability at or above 0.5 gives the subgenre; anything else is "electronic".

## Security model

- The function is JWT-protected; the key stays server-side.
- The cache is written only by the service role. Signed-in users can read it (RLS select policy) and cannot write.
- Event text comes from the client, so it is **not trusted**. Each row is keyed on a hash of the text that was tagged, and a cached tag is served only to callers whose text hashes the same. Different text for the same event id goes in a separate row and never replaces another caller's.
- Per-user daily quota: 300 events sent to Jev (`DAILY_QUOTA`). Cached tags are free. Up to 100 events per call, 24 per Jev request.
- Event text is never logged.
- Known limit: a signed-in user can still spend their own quota on made-up events, and rows accrue per distinct text. Stronger fix, if needed later: fetch the event text server-side from RA / DICE / Ticketmaster by `(source, id)` instead of trusting the client.

## Deploy order

1. Run the migrations (`20261117120000_event_subgenres.sql`, then `20261117130000_event_subgenres_hardening.sql`) in the SQL Editor.
2. `supabase secrets set TYPESAFE_API_KEY=...`
3. `supabase functions deploy tag-subgenres`

Deploy the function only after the migrations: it needs `text_hash` and `jev_take_quota`.
