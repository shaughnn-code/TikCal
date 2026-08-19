-- Restrict events.source_url to http(s) links. The client already renders
-- this as an <a href>, so a javascript:/data: URI stored here would execute
-- in the browser of anyone who views the event and clicks the link. This
-- constraint closes the write path the client-side validation can't cover
-- (direct REST/API writes with the anon key).
alter table public.events
  add constraint events_source_url_scheme_check
  check (source_url is null or source_url ~* '^https?://');
