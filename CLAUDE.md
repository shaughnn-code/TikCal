# TikCal

React 18 + Vite 5 + Tailwind 3 + Supabase. ESM (`"type": "module"`).

## Commands

- `npm run dev` — Vite dev server on **http://localhost:5173**
- `npm run build` — production build (must pass before any commit)
- `npm test` — `node --test` over `src/**/*.test.js`

## Screenshot Workflow

- Puppeteer is a devDependency. Chrome cache lives at `~/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:5173`
- Screenshots save to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten). The directory is gitignored.
- Optional label suffix: `node screenshot.mjs http://localhost:5173 label` → `screenshot-N-label.png`
- Flags: `--mobile` (390×844), `--width=N`, `--height=N`, `--viewport` (clip to fold instead of full page).
- `screenshot.mjs` lives in the project root. Use it as-is.
- The script prints any console errors it saw during load — read that output, don't ignore it.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

Most routes sit behind auth, so an unauthenticated screenshot of `/overlap` will show the login redirect. Guest-capable routes (`/overlap/:sessionId`) render without a session.

## Design tokens ("Aurora")

Defined in `tailwind.config.js` / `src/index.css`. Rebranded from the old cyan
"Wide Ice" theme in commit `e4301d5` — near-black base + a magenta/violet aurora
signature. **Color is information**: the brand hue is violet chrome; data hues
(crew/RSVP/free) carry meaning and must not be repainted.

- `ink #0b0b11` (bg), `ink2 #060609` (recessed/blocked)
- **Brand/chrome = violet:** `aurora #c04bff`, `violet #8b5cff`, `iris #5b6bff`. Used for wordmark glow, hero, primary CTA (`Btn variant="aurora"`), nav-active, calendar today-marker/selection, links, focus.
- **Data hues (preserve — do NOT rebrand):** `mint #6EE7B7` (shared / "I'm in"), `#ff6b2b` orange (semantic **free/GO** state in Overlap only), the 10 crew colors via `getEventAccent`, RSVP amber/coral.
- `cyan #2FE6E6` / `ice #4cc9f0` are **legacy** — no longer chrome; `ice` survives only as a crew-color option. Don't reintroduce them as UI accents.
- **Backdrop:** aurora light-leak bloom, not a Tron grid. `GridBg` still renders it via the reused `.grid-glow`/`.grid-floor`/`.grid-horizon` classes (repainted).
- **Surfaces:** `HudBox` is a soft rounded panel by default (pass `brackets` for the legacy HUD corner marks). Event cards (`EventCard`, WeekView chips) = dark cards with a colored left **spine** carrying the event's hue.
- Fonts: Barlow 800 italic (logo), Syne (headings), Space Grotesk (body), IBM Plex Mono (labels/data)

See `docs/tikcal-overlap-design.md` for the Overlap feature's cell-state → render contract.

## Database

Linked project: `pirlflebmiylgusmqhhk` (TikCal). Apply migrations with `supabase db push`.

- **Never run `supabase db reset`.** It drops and recreates the database. The remote holds tables built through the dashboard that no local migration reproduces, so a reset destroys unrecoverable data.
- `supabase/migrations/2026061*_dashboard_baseline.sql` and `20260616*` are intentionally **empty**. They stand in for schema changes made through the dashboard before this repo tracked migrations. The CLI refuses to push when remote history contains versions with no local file; these files satisfy that check. They are already recorded as applied and never re-run. Don't delete them, don't put SQL in them.
- Postgres grants `EXECUTE` on new functions to `PUBLIC`. Revoking from `anon`/`authenticated` alone does nothing — they inherit through `PUBLIC`. Always `revoke execute ... from public` first, then grant back explicitly.
- Supabase default privileges may grant DML to `anon` on new public tables. Withholding a `GRANT` is not a control. RLS is: a table with no INSERT/UPDATE/DELETE policy rejects direct writes.
- Verify security changes against the live DB with the anon key (`curl $VITE_SUPABASE_URL/rest/v1/rpc/<fn>`), not by reading the SQL. That's how the `cleanup_expired_overlaps` hole was caught.

## Conventions

- Icons via `@iconify/react`, Phosphor set (`ph:`), through `src/components/icons.jsx`.
- Pure logic goes in `src/lib/**` and gets a colocated `*.test.js` — no I/O in testable functions.
- Supabase writes that need validation go through `SECURITY DEFINER` RPCs, not direct table access. RLS is on for every public table.
- Never put the `service_role` key in client code — only the publishable/anon key.
