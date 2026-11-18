-- Schedules send-event-reminders (supabase/functions/send-event-reminders)
-- to run automatically, same pg_cron pattern as send-milestone-notification
-- (20261109010000_milestone_notification_cron.sql). Every 6 hours, matching
-- that same cadence — wide enough windows in the function itself (44-52h for
-- the 48h reminder, same UTC calendar day for day-of) that a 6-hourly run
-- can't miss either one. Dedupe makes repeated runs safe regardless.
--
-- pg_cron and pg_net are already enabled from the milestone-notification
-- migration; CREATE EXTENSION IF NOT EXISTS is a no-op if so, included here
-- only so this migration is self-contained if ever run on its own.
--
-- The anon key below is the same public key already bundled into the mobile
-- app — it only has to pass Supabase's gateway auth check to reach the
-- function; the function itself uses the service role key from its own
-- environment for every actual database operation.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'send-event-reminders',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aunxdbqukbxyyiusaeqi.supabase.co/functions/v1/send-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4'
    ),
    body := '{}'::jsonb
  );
  $$
);
