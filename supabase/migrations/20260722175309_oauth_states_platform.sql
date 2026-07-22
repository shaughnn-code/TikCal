-- Native OAuth needs to know where to come back to.
--
-- The web flow finishes with a 302 to https://tikcal.nyc/…, but a native build
-- opened the consent page in the system browser, so that redirect would strand
-- the user on the website instead of returning them to the app. The callback
-- has to redirect to tikcal://… instead.
--
-- The callback can't take that decision from the query string — a client-
-- supplied return URL is an open redirect. So the start function records which
-- platform asked, and the callback reads it back off the state row it already
-- verifies. The check constraint keeps it to values the callback knows how to
-- map; anything else and the redirect target would be attacker-chosen.

alter table public.oauth_states
  add column if not exists platform text not null default 'web'
    check (platform in ('web', 'ios', 'android'));
