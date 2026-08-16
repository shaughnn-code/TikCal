-- start_time was assumed to already exist (WeekView/EventDetail/AddEvent were
-- all built against it) but never actually landed as a migration -- caught by
-- live-testing the Add Show form, which failed with "Could not find the
-- 'start_time' column of 'events' in the schema cache". Plain text column
-- (parseTime in src/lib/calendar/zoom.js accepts "HH:MM" or "H:MM AM/PM"
-- strings directly) on an existing RLS-governed table -- no new grants needed.
alter table public.events add column if not exists start_time text;
