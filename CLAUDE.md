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

## Design tokens

Defined in `tailwind.config.js` / `src/index.css`:

- `ink #0a0e12` (bg), `ink2 #040608` (recessed/blocked)
- `ice #4cc9f0` (primary/cyan), `mint #6EE7B7` (success/shared)
- `#ff6b2b` orange — reserved as the semantic **free/GO** state in Overlap; the only warm accent in a cool UI.
- Fonts: Barlow 800 italic (logo), Syne (headings), Space Grotesk (body), IBM Plex Mono (labels/data)
- HUD boxes take a `--hud-color` CSS var. Tron-style `GridBg` backdrop.

See `docs/tikcal-overlap-design.md` for the Overlap feature's cell-state → render contract.

## Conventions

- Icons via `@iconify/react`, Phosphor set (`ph:`), through `src/components/icons.jsx`.
- Pure logic goes in `src/lib/**` and gets a colocated `*.test.js` — no I/O in testable functions.
- Supabase writes that need validation go through `SECURITY DEFINER` RPCs, not direct table access. RLS is on for every public table.
- Never put the `service_role` key in client code — only the publishable/anon key.
