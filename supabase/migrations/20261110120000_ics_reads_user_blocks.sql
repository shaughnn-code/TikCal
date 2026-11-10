-- The ics edge function (service role, no user JWT) must read both directions
-- of a user's blocks so the subscribe feed hides shows from blocked people.
-- New tables get no default grants (Supabase Data API rule since 2026-10-30),
-- and service_role bypasses RLS but not GRANTs, so grant it explicitly.
grant select on public.user_blocks to service_role;
