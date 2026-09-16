# TikCal Roadmap

Tracks security/infra work. Scope: real gaps only, verified against live repo + GitHub Actions + DNS + live Supabase project, not the original directive's stale claims (CI/CD phase dropped, all "Deploy to GitHub Pages" runs are green; mobile app is Capacitor, not React Native/Expo).

Live tracking has moved to GitHub Issues (`shaughnn-code/TikCal` #23-36, published via `/mattpocock-skills:to-tickets`). This file is now a summary; issues are the source of truth for acceptance criteria and discussion.

Status values: `[TODO]`, `[IN_PROGRESS]`, `[BLOCKED: REQUIRES NICHOLAS]`, `[DONE]`

---

## [P0] Critical Outages & Blockers

### P0-1: Inbound email import broken (NXDOMAIN) — [#23](https://github.com/shaughnn-code/TikCal/issues/23)
- **Status:** `[IN_PROGRESS]` — DNS done, SendGrid dashboard step remains
- Namecheap MX records live and verified (`dig @8.8.8.8`): Mail Settings switched to Custom MX, `@` → `mx1.privateemail.com` / `mx2.privateemail.com` (existing mailbox preserved), `in` → `mx.sendgrid.net` (new).
- Remaining: SendGrid Settings → Inbound Parse → Add Host & URL (domain `in.tikcal.nyc`, destination `https://pirlflebmiylgusmqhhk.supabase.co/functions/v1/inbound`, raw MIME unchecked) — blocked on Nicholas logging into SendGrid in the shared browser tab.

---

## [P1] Authentication & Security Hardening

### Password strength rules — [#24](https://github.com/shaughnn-code/TikCal/issues/24) `[DONE]`
`validatePassword` (`src/lib/validation.js`, min 8 chars + letter + number, 4 tests) wired into Signup + ResetPassword.

### Mandatory MFA enrollment — [#25](https://github.com/shaughnn-code/TikCal/issues/25) `[DONE]`
Not optional: every user, new or existing, is routed into TOTP enrollment before reaching the app, no skip path. `src/lib/mfa.js` (pure gate logic, 8 tests) + `auth.jsx` (mfa.enroll/verify/unenroll/listFactors, `mfaStatus` state) + `/mfa-enroll` page + all 4 route gates (`ProtectedRoute`, `SetupGate`, `HomeGate`, `WelcomeGate`) in `App.jsx`.

### MFA login challenge, enforced — [#26](https://github.com/shaughnn-code/TikCal/issues/26) `[DONE]`
`/mfa-challenge` page, same gate infrastructure as #25. No bypass path.

### MFA reset (lost device) — [#27](https://github.com/shaughnn-code/TikCal/issues/27) `[DONE]`
Email-verified reset link (`sendMfaRecoveryLink`, reuses Supabase's recovery-link mechanism redirected to `/mfa-recover` instead of `/reset`), lets a locked-out user unenroll the stale factor and re-enroll. Gated on a genuine `PASSWORD_RECOVERY` session (`recoveryEvent`), not just any signed-in session — fixed after an automated review caught a full MFA-bypass hole in the first version. No backup codes in this pass (documented tradeoff).

### RLS policy spot-check — [#28](https://github.com/shaughnn-code/TikCal/issues/28) `[DONE]`
Verified clean via Supabase advisors + reading every flagged `SECURITY DEFINER` function body. One real gap: leaked-password protection disabled in Supabase Auth — `[BLOCKED: REQUIRES NICHOLAS]`, Dashboard → Authentication → Policies/Providers → enable "Leaked password protection" (not SQL-controllable).

---

## [P3] Mobile App Health & App Store Readiness

### Account deletion — [#29](https://github.com/shaughnn-code/TikCal/issues/29) `[DONE]`
`supabase/functions/delete-account/index.ts` deployed (v1, ACTIVE): verifies caller via JWT, removes their Storage `flyers/<user_id>/...` objects (not covered by DB cascade), then `auth.admin.deleteUser`. Every FK to `auth.users` in the live schema is already `ON DELETE CASCADE`, so the DB purge is automatic. Profile.jsx has a two-step confirm UI wired to it.

### Sign in with Apple — [#30](https://github.com/shaughnn-code/TikCal/issues/30)/[#31](https://github.com/shaughnn-code/TikCal/issues/31) `[DONE — not applicable]`
Spike concluded Guideline 4.8 doesn't apply: TikCal's account auth is email/password + magic link only; Google/Spotify/Apple Music are data-source links, not account login. Both issues closed.

### iOS privacy manifest — [#32](https://github.com/shaughnn-code/TikCal/issues/32) `[DONE]`
`ios/App/App/PrivacyInfo.xcprivacy` written (UserDefaults + SystemBootTime required-reason APIs, matching the actual Capacitor plugin footprint; email-address data-collection entry matching `Privacy.jsx`), validated with `plutil -lint`. Its accuracy depends on the native scaffold below actually existing, though.

### App Store Connect resubmission checklist — [#33](https://github.com/shaughnn-code/TikCal/issues/33)
- **Status:** `[BLOCKED: REQUIRES NICHOLAS]`
- **Real finding, bigger than expected:** `ios/` (and `android/`) are partial stubs, not real Capacitor platforms. `ios/App/App.xcodeproj` has no `project.pbxproj` — there's no actual Xcode project to open. No `AppDelegate.swift`/`Info.plist`/`Assets.xcassets`. `ios/CapApp-SPM` has no `Package.swift`/`Sources`. `android/` has no root or app `build.gradle`. `package.json` has zero `@capacitor/*` dependencies. The whole `ios/` folder is also untracked in git. This wasn't a stale scaffold needing `npx cap sync` — the platforms were never actually initialized with `npx cap add`.
- Fix (`npm install @capacitor/core @capacitor/ios @capacitor/cli`, `npx cap add ios`, re-apply the existing `capacitor.config.json` + `PrivacyInfo.xcprivacy`) is straightforward but both `npm install` and moving the old `ios/` folder aside were refused by the auto-mode classifier as `[Irreversible Local Destruction]`. Needs Nicholas to run it or explicitly allow it — zero risk either way since `ios/` isn't in git yet.

---

## New work this session (beyond the original audit)

### First-time interactive product tour — [#34](https://github.com/shaughnn-code/TikCal/issues/34) `[DONE]`
Spotlight tour (`src/components/Tour.jsx` + `src/lib/tour.js`, 6 tests) launches once right after the existing Welcome screen, walks new users through Calendar, Add Show, Discover, Sync, and Profile's auto-import card. "Replay tour" added to Profile. Needs a live click-through once there's a way to log in and check visually (see #23/mobile blockers above) — not done, since it needs credentials I can't enter.

### Surface email-forwarding setup during onboarding — [#35](https://github.com/shaughnn-code/TikCal/issues/35) `[DONE]`
Folded into #34's tour rather than duplicated: last step spotlights the existing forwarding card instead of leaving it undiscoverable on Profile.

### Login + integration functional audit — [#36](https://github.com/shaughnn-code/TikCal/issues/36) `[IN_PROGRESS]`
**Real bug found and fixed:** Google and Spotify calendar/music connect never told their OAuth callback which platform (web/ios/android) started the flow, so a native build finishing consent in the system browser would always land on the https URL instead of the `tikcal://` deep link and strand the user outside the app. Also found `src/lib/platform.js` (referenced by a code comment as already existing) didn't exist. Fixed: `src/lib/platform.js` (new, tested), `db.js`, `google-oauth-start`, `spotify-oauth-start`, `spotify-oauth-callback`. Only `google-oauth-start` deployed so far (v11) — `spotify-oauth-start`/`spotify-oauth-callback` deploys were refused by the classifier as `[Production Deploy]`, need Nicholas to run or authorize.
Apple Music, Ticketmaster, RA, DICE code-reviewed clean (all gracefully degrade if unconfigured); no live traffic in the last 24h to verify any of them end-to-end, so real click-through QA is still owed once the mobile scaffold (#33) is fixed.
No AXS search integration exists (forwarding-only) — flagged as likely-intentional, not a gap, unless AXS event search is actually wanted.

---

## Dropped from original directive (verified unnecessary)

- **CI/CD Phase 2 fix**: `deploy.yml` permissions already correct; all recent runs green. No action.
- **React Native/Expo assessment**: not applicable, it's Capacitor.
- **Sign in with Apple implementation**: not applicable (see #30/#31 above).

## Open items for Nicholas

1. Log into SendGrid in the shared browser tab so I can finish Inbound Parse setup (#23).
2. Enable "Leaked password protection" in Supabase Auth dashboard (#28).
3. Either run `npm install @capacitor/core @capacitor/ios @capacitor/cli && npx cap add ios` yourself, or explicitly allow the classifier's `[Irreversible Local Destruction]` block and I'll finish it (#33) — this blocks any real App Store resubmission work.
4. Run `supabase functions deploy spotify-oauth-start` and `supabase functions deploy spotify-oauth-callback --no-verify-jwt`, or explicitly allow the deploy tool (#36).
5. Once ios/ builds: live click-through QA of Google/Spotify/Apple Music connect and Ticketmaster/RA/DICE search with a real account (#36).
