-- Fix: cleanup_expired_overlaps() was callable by anon.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default. The original
-- migration did:
--     revoke execute on function public.cleanup_expired_overlaps() from anon, authenticated;
-- which is a no-op for this purpose: anon and authenticated still inherit
-- EXECUTE via PUBLIC. Verified against the live DB - an anon-key caller got
-- 204 (success) from POST /rest/v1/rpc/cleanup_expired_overlaps.
--
-- The function is SECURITY DEFINER and deletes rows, so it must be reachable
-- only by the postgres role / pg_cron, never through the Data API.

revoke execute on function public.cleanup_expired_overlaps() from public;
revoke execute on function public.cleanup_expired_overlaps() from anon, authenticated;

-- The four session RPCs are intentionally callable by anon (guests hold only
-- the session URL), but pin that intent explicitly rather than leaning on the
-- implicit PUBLIC grant, so the privilege set is auditable.
revoke execute on function public.get_session(uuid) from public;
revoke execute on function public.join_session(uuid, text, uuid) from public;
revoke execute on function public.update_availability(uuid, uuid, jsonb, jsonb) from public;
revoke execute on function public.session_event_busy(uuid) from public;

grant execute on function public.get_session(uuid)                             to anon, authenticated;
grant execute on function public.join_session(uuid, text, uuid)                to anon, authenticated;
grant execute on function public.update_availability(uuid, uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function public.session_event_busy(uuid)                      to anon, authenticated;
