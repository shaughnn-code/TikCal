# Handoff — 2026-09-14

Full detail: `ROADMAP.md` + GitHub issues #23-36 (`shaughnn-code/TikCal`).

## In progress right now
- **#23 (inbound email):** DNS done + verified live. SendGrid Inbound Parse still not set up — Nicholas hit `ERR_USERNAME_NOT_FOUND` logging into SendGrid (Twilio account exists but has no linked SendGrid product yet). Left mid-flow: tabs open on SendGrid login error, forgot-username, and Twilio's "Login Overview" docs page explaining the Twilio/SendGrid account relationship. Next step: get Nicholas into a real SendGrid account (link via Twilio console's Email API / SendGrid product, or sign up fresh under nicholasshaughnessy@gmail.com), then Settings → Inbound Parse → Add Host & URL: domain `in.tikcal.nyc`, destination `https://pirlflebmiylgusmqhhk.supabase.co/functions/v1/inbound`, raw MIME unchecked.

## Blocked, needs Nicholas to run or explicitly allow
1. **#33 — iOS/Android platforms are stub folders, not real projects.** No `project.pbxproj`, no `AppDelegate.swift`/`Info.plist`, no `@capacitor/*` deps in package.json, `android/` has no `build.gradle`. Fix: `npm install @capacitor/core @capacitor/ios @capacitor/cli && npx cap add ios` (and `android` equivalent), then re-apply the existing `capacitor.config.json` + `PrivacyInfo.xcprivacy`. Both `npm install` and moving the old `ios/` folder aside were refused by the auto-mode classifier as `[Irreversible Local Destruction]`. This blocks any real App Store resubmission work.
2. **#36 — two edge function deploys refused as `[Production Deploy]`:** `supabase functions deploy spotify-oauth-start` and `supabase functions deploy spotify-oauth-callback --no-verify-jwt`. Source fix already committed (native OAuth deep-link bug — see #36 for detail); only the deploy is blocked.
3. **#28** — enable "Leaked password protection" in Supabase Auth dashboard (Authentication → Policies/Providers). Not SQL-controllable.
4. **Once ios/ builds:** live click-through QA of Google/Spotify/Apple Music connect, Ticketmaster/RA/DICE search, and the new product tour (#34) with a real logged-in account — none of this could be verified without credentials.

## Done this session (beyond original audit scope)
- #29 (account deletion) deployed and closed.
- #34/#35: built a first-time spotlight product tour (`src/components/Tour.jsx`, `src/lib/tour.js`) that walks new users through Calendar/Add Show/Discover/Sync, ending on Profile's email-forwarding card. "Replay tour" button added to Profile.
- #36: found + fixed a real bug — native Google/Spotify connect never passed platform info to the OAuth callback, so finishing consent on iOS/Android would strand the user in the system browser instead of returning to the app via `tikcal://` deep link. `src/lib/platform.js` created (was referenced by a comment but never existed).
- Full test suite: 71/71 passing. Build clean.
