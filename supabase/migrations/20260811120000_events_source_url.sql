-- Optional link to where an event came from (ticket page, Instagram post,
-- etc.), shown on the event detail page and the calendar hover/click
-- popover. Plain text column on an existing RLS-governed table -- no new
-- grants needed, existing INSERT/UPDATE/SELECT policies on `events` already
-- cover it.
alter table public.events add column if not exists source_url text;
