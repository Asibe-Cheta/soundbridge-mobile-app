-- Platform growth-milestone push notifications ("We just hit over 3,000 users").
--
-- Replaces reliance on the per-device NudgeService.MILESTONE_GROWTH path
-- (src/services/NudgeService.ts), which only ever evaluates on a user's own
-- device, only runs if that device already has notification permission AND
-- happens to have no higher-priority nudge eligible that session, and even
-- then just schedules a local notification 2-5 hours later. Verified live:
-- zero milestone_* rows have ever been written to user_nudges, for any user,
-- for any milestone — the client path has never actually fired.
--
-- This table is the idempotency guard for the new server-side broadcast
-- (supabase/functions/send-milestone-notification): one row per milestone
-- actually sent, so a cron job calling the function repeatedly, or calling it
-- again after the next milestone, can never double-send the same milestone.
-- Internal bookkeeping only — no client ever reads or writes this table
-- directly, so RLS is enabled with zero policies (default-deny for anon/
-- authenticated; the Edge Function uses the service role key, which bypasses
-- RLS entirely).

CREATE TABLE IF NOT EXISTS platform_milestone_broadcasts (
  milestone   INTEGER PRIMARY KEY CHECK (milestone > 0 AND milestone % 1000 = 0),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipients  INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE platform_milestone_broadcasts ENABLE ROW LEVEL SECURITY;
