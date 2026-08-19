-- calendar_feeds had SELECT/INSERT/UPDATE policies but no DELETE, so users
-- could not disconnect their ICS feed (revoke the token) from the client.
create policy "own feed delete" on public.calendar_feeds
  for delete using (user_id = auth.uid());
