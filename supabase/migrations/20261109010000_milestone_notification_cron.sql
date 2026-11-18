-- Schedules send-milestone-notification (supabase/functions/send-milestone-notification)
-- to run automatically, with no human in the loop — this is the actual "fire
-- automatically" part. The function itself is idempotent (guarded by
-- platform_milestone_broadcasts, see 20261109000000_platform_milestone_broadcasts.sql),
-- so running it every few hours is safe: on every run except the one where a
-- new 1,000-user threshold has just been crossed, it's a no-op.
--
-- The anon key below is the same public key already bundled into the mobile
-- app (EXPO_PUBLIC_SUPABASE_ANON_KEY) — it only has to pass Supabase's
-- gateway auth check to reach the function; the function itself uses the
-- service role key (from its own environment) for every actual database
-- operation, independent of this header.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'send-milestone-notification',
  '0 */6 * * *', -- every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://aunxdbqukbxyyiusaeqi.supabase.co/functions/v1/send-milestone-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTY5OTAsImV4cCI6MjA5MDE1Njk5MH0.8g7dbtWArz_P8pLuo3hykvT2OicG9-hhJSXYf1GPEi4'
    ),
    body := '{}'::jsonb
  );
  $$
);
