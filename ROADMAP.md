# TikCal Roadmap

Tracks security/infra/launch work. Scope: real gaps only, verified against the live repo, GitHub Actions, DNS, and the live Supabase project.

Live tracking is GitHub Issues (`shaughnn-code/TikCal`); this file is a summary. Issues hold acceptance criteria and discussion.

Status values: `[TODO]`, `[IN_PROGRESS]`, `[BLOCKED: REQUIRES NICHOLAS]`, `[DONE]`, `[REVERTED]`

**Last verified against the working tree: 2026-09-29** (commit `64e3dd4`). Anything below that contradicts the tree is a bug in this file — fix it here rather than working around it.

---

## [P0] Critical Outages & Blockers

### P0-1: Inbound email import broken — [#23](https://github.com/shaughnn-code/TikCal/issues/23)
- **Status:** `[BLOCKED: REQUIRES NICHOLAS]` — DNS done, SendGrid account does not exist yet
- Namecheap MX records live and verified (`dig @8.8.8.8`): Mail Settings on Custom MX, `@` → `mx1.privateemail.com` / `mx2.privateemail.com` (existing mailbox preserved), `in` → `mx.sendgrid.net` (new).
- Remaining: SendGrid → Settings → Inbound Parse → Add Host & URL (domain `in.tikcal.nyc`, destination `https://pirlflebmiylgusmqhhk.supabase.co/functions/v1/inbound`, raw MIME unchecked).
- Real blocker: login to SendGrid failed with `ERR_USERNAME_NOT_FOUND`. The Twilio account exists but has no linked SendGrid product. Needs either linking the Email API / SendGrid product from the Twilio console, or a fresh SendGrid signup under `nicholasshaughnessy@gmail.com`.
- Impact: the whole auto-import / email-forwarding path is dead until this lands, including the tour step that advertises it (#34/#35).

---

## [P1] Authentication & Security Hardening

### Password strength rules — [#24](https://github.com/shaughnn-code/TikCal/issues/24) `[DONE]`
`validatePassword` (`src/lib/validation.js`, min 8 chars + letter + number, 4 tests) wired into Signup + ResetPassword. Unaffected by the MFA revert below.

### MFA (enrollment, login challenge, reset) — [#25](https://github.com/shaughnn-code/TikCal/issues/25) / [#26](https://github.com/shaughnn-code/TikCal/issues/26) / [#27](https://github.com/shaughnn-code/TikCal/issues/27) `[REVERTED]`
All three shipped in September, then were **removed in commit `64e3dd4` (2026-09-29)**. Mandatory TOTP with no skip path is too restrictive for the current beta-testing stage — it gated every tester (and every App Store reviewer) behind enrollment before they could see the app.

Removed: `src/lib/mfa.js` + tests, `src/pages/MfaEnroll.jsx`, `MfaChallenge.jsx`, `MfaRecover.jsx`, the mfa gates in all four route guards in `App.jsx` and in `ProtectedRoute.jsx`, and `mfaStatus` / the `mfa.*` helpers in `src/lib/auth.jsx`.

**MFA is expected to return once real users are onboard.** When it does, these three issues should be reopened rather than treated as shipped, and the original design notes are worth reusing:
- The recovery flow must gate on a genuine `PASSWORD_RECOVERY` session (`recoveryEvent`), not merely any signed-in session — the first implementation had a full MFA-bypass hole here, caught by review.
- Backup codes were never built (documented tradeoff at the time). Worth doing in the next pass so lost-device recovery doesn't depend solely on email.

### RLS policy spot-check — [#28](https://github.com/shaughnn-code/TikCal/issues/28) `[BLOCKED: REQUIRES NICHOLAS]`
Policies verified clean via Supabase advisors plus reading every flagged `SECURITY DEFINER` function body. One real gap remains open: leaked-password protection is disabled in Supabase Auth. Dashboard → Authentication → Providers → enable "Leaked password protection". Not SQL-controllable, so it cannot be done from this repo.

---

## [P2] Mobile App Health & App Store Readiness

### Native platforms `[DONE]`
Both platforms are **real, initialized Capacitor projects** — earlier revisions of this file claimed they were empty stubs, which is false as of the September Capacitor commits on `main`.

Verified present: `ios/App/App.xcodeproj/project.pbxproj`, `ios/App/App/AppDelegate.swift`, `ios/App/App/Info.plist`, `android/build.gradle`, `android/app/`, and eight `@capacitor/*` dependencies in `package.json` (`core`, `cli`, `ios`, `android`, `app`, `browser`, `splash-screen`, `status-bar`, all v8).

`@capacitor/assets` was deliberately dropped (commit `6cc598d`) — a dev-only icon/splash generator that pulled a critical `tar` CVE through its dependency subtree. Generate icons another way rather than reinstalling it.

### Account deletion — [#29](https://github.com/shaughnn-code/TikCal/issues/29) `[DONE]`
`supabase/functions/delete-account/index.ts` deployed (ACTIVE): verifies caller via JWT, removes their Storage `flyers/<user_id>/...` objects (not covered by DB cascade), then `auth.admin.deleteUser`. Every FK to `auth.users` in the live schema is `ON DELETE CASCADE`, so the DB purge is automatic. `Profile.jsx` has a two-step confirm UI wired to it.

### Sign in with Apple — [#30](https://github.com/shaughnn-code/TikCal/issues/30) / [#31](https://github.com/shaughnn-code/TikCal/issues/31) `[DONE — not applicable]`
Guideline 4.8 doesn't apply: TikCal's account auth is email/password + magic link. Google / Spotify / Apple Music are data-source links, not account login. Both issues closed.

### iOS privacy manifest — [#32](https://github.com/shaughnn-code/TikCal/issues/32) `[DONE]`
`ios/App/App/PrivacyInfo.xcprivacy` present and `plutil -lint` clean: UserDefaults + SystemBootTime required-reason APIs matching the actual Capacitor plugin footprint, plus an email-address data-collection entry matching `Privacy.jsx`.

### App Store Connect resubmission — [#33](https://github.com/shaughnn-code/TikCal/issues/33)
- **Status:** `[BLOCKED: REQUIRES NICHOLAS]` — the blocker is the resubmission itself, not the scaffold
- Shipping identifiers: app record `6795296688` "TiKCal - Concert Calendar", bundle id `nyc.tikcal.app` (permanent), Apple team `Y4VU82Y56J` (paid Individual, renews 2027-07-27), account `dev@tikcal.nyc`, iOS Distribution cert `VDPSVRF8C9`, SKU `tikcal-ios-001`.
- TestFlight build 1 is live and VALID. Internal group "Internal Testers" attached; external group "Public Beta" with public link `https://testflight.apple.com/join/9sC5zfvr`, submitted for Beta App Review. Demo account `tikcal.nyc@gmail.com` recorded in `betaAppReviewDetail` (password lives there, not in this repo), `demoAccountRequired` true.
- **Three Guideline 2.1 rejection rounds have been addressed; the resubmit itself has not been filed.** That is the open item.
- Rebuild/redeploy to a device: `~/tikcal-ios-deploy/adhoc-install.sh`, or the local `ios-adhoc-install` skill (`.claude/skills/ios-adhoc-install/SKILL.md`, gitignored) which documents the gotchas — keychain auto-locks (`security unlock-keychain -p tikbuild`), use Release not Debug for standalone device installs, App Store Connect API helper `ascapi.rb`.
- Known small win, not yet done: `Info.plist` has no `ITSAppUsesNonExemptEncryption` key, so every upload stalls in "Missing Compliance" until export compliance is answered by hand. Adding `<key>ITSAppUsesNonExemptEncryption</key><false/>` removes that step permanently.

### Android `[TODO]`
`android/` is scaffolded but **has never been built or run** — JDK and Android Studio are not installed on this machine. Nothing has been started on the Play Console side either: no upload keystore, no signing config, no store listing, no internal test track. Android remains the only path to a phone that needs no paid Apple account.

---

## [P3] Onboarding & Integrations

### First-time interactive product tour — [#34](https://github.com/shaughnn-code/TikCal/issues/34) `[DONE — unverified live]`
Spotlight tour (`src/components/Tour.jsx` + `src/lib/tour.js`, 6 tests) launches once right after the Welcome screen and walks new users through Calendar, Add Show, Discover, Sync, and Profile's auto-import card. "Replay tour" added to Profile. **Never click-tested visually with a real logged-in account** — that QA is still owed.

### Surface email-forwarding setup during onboarding — [#35](https://github.com/shaughnn-code/TikCal/issues/35) `[DONE]`
Folded into #34's tour rather than duplicated: the last step spotlights the existing forwarding card instead of leaving it undiscoverable on Profile. Note this step advertises a feature that is still broken until #23 lands.

### Login + integration functional audit — [#36](https://github.com/shaughnn-code/TikCal/issues/36) `[IN_PROGRESS]`
**Real bug found and fixed in source:** Google and Spotify connect never told their OAuth callback which platform (web/ios/android) started the flow, so a native build finishing consent in the system browser landed on the https URL instead of the `tikcal://` deep link and stranded the user outside the app. `src/lib/platform.js` (referenced by a code comment but nonexistent) was created and tested; `db.js`, `google-oauth-start`, `spotify-oauth-start`, `spotify-oauth-callback` updated.

**Deploy is the remaining gap.** Only `google-oauth-start` is deployed (v11). These two were refused by the auto-mode classifier as `[Production Deploy]` and still need to run:
```
supabase functions deploy spotify-oauth-start
supabase functions deploy spotify-oauth-callback --no-verify-jwt
```
Until then, native Spotify connect is broken on device even though the source is fixed.

Apple Music, Ticketmaster, RA and DICE were code-reviewed clean (all degrade gracefully when unconfigured), but **none has been verified end-to-end against live traffic**. Real click-through QA on device is owed for: Google / Spotify / Apple Music connect, and Ticketmaster / RA / DICE search.

### Feature gaps (not bugs, not scheduled)
- **Apple Music frontend** — the `apple-music-token` edge function exists; the frontend is a literal TODO (`supabase/functions/README.md:153`).
- **DICE** — `dice-events` is deployed and live on `/discover`, but the richer partner API is key-gated (401 without `DICE_API_KEY`); current behavior is the degraded path.
- **Overlap "Propose this" pin** — spec §6 (banner + migration), deliberately deferred when the recommendations work shipped. See `docs/tikcal-overlap-spec.md`.
- **Overlap recommendations live check** — `overlap-recommendations` is deployed and `TICKETMASTER_API_KEY` is set (HTTP 200 verified), but no one has opened a real session on a Friday night and confirmed shows render ranked by the crew's Spotify taste.
- **AXS** — forwarding-only, no search integration. Assumed intentional; confirm before treating it as a gap.

---

## Engineering debt

- **Dependabot #33 — `uuid@7.0.3`, moderate, accepted for now.** Missing buffer bounds check in v3/v5/v6 when a `buf` argument is supplied; patched in 11.1.1. Reached only as `@capacitor/cli@8.5.2 → xcode@3.0.1 → uuid@7.0.3`, so it is devDependency-scoped, absent from the shipped bundle, and only runs during `cap sync` / `cap add` with no attacker-controlled `buf`. An `overrides` entry forcing uuid 11 crosses four majors of that package's API and risks breaking `cap sync` — not worth it mid-resubmit. Wait for Capacitor to bump `xcode`, and recheck when the App Store work is done.
- **Main bundle is 606 kB in a single chunk**, over Vite's 500 kB warning. Fix is route-level `lazy()` code-splitting in `App.jsx` — an afternoon of work, not a quick patch.
- **Unmerged branches:** `feature/mobile-app-launch` (7 commits ahead) and `feature/spotify-preview` (1 commit ahead). Decide merge or abandon.
- **Stale remote branches:** `origin/claude/ai-skills-home-lab-w29xtn` (1 unmerged commit), `origin/claude/open-tikal-gcuttr` (2), `origin/claude/personal-dream-app-gfwk8k` (6), `origin/claude/tikcal-nyc-editing-53f30r` (0, fully merged), plus `origin/feature/overlap` and `origin/feature/seo-per-route` whose local counterparts are already deleted. Review the unmerged ones before pruning.
- **Two local branches pending force-delete:** `feature/calendar-redesign` (`dba2f67`) and `feature/seo-foundation` (`f036bb8`). Both tips are confirmed ancestors of `main`, but their own remotes were never updated, so plain `git branch -d` refuses; `git branch -D` is safe and was blocked by the classifier.

---

## Dropped (verified unnecessary)

- **CI/CD permissions fix**: `deploy.yml` permissions already correct; all recent "Deploy to GitHub Pages" runs green.
- **React Native / Expo assessment**: not applicable, the mobile app is Capacitor.
- **Sign in with Apple implementation**: not applicable (see #30/#31).

---

## Open items for Nicholas

1. Get into a real SendGrid account, then finish Inbound Parse for `in.tikcal.nyc` (#23). Biggest single unblock — auto-import is the feature onboarding advertises.
2. Enable "Leaked password protection" in the Supabase Auth dashboard (#28).
3. Run the two `spotify-oauth-*` function deploys above, or authorize the deploy tool (#36).
4. File the App Store resubmission (#33).
5. Device QA with a real account: Google / Spotify / Apple Music connect, Ticketmaster / RA / DICE search, the product tour, and Overlap recommendations.
6. Install JDK + Android Studio if Android is still wanted.

## Repo hazard

Another actor — a parallel Claude session or design agent — has repeatedly committed, switched branches, merged and pushed this repo mid-session, including changing the checked-out branch three times within one session. Never trust cached branch / HEAD / working-tree state across turns: re-run `git branch --show-current` and `git status` before every git action, and flag any foreign uncommitted work before switching.
