-- One-off backfill: copy recent event_announcement / reminder rows out of
-- notification_history (server-side send log, not read by any screen) into
-- notifications (what the in-app inbox and bell badge actually read from),
-- so existing users see announcements that were sent before every
-- send-event-reminders dual-write to notifications existed. This is NOT a
-- migration and must not be placed in supabase/migrations/ — it is not
-- idempotent to rerun blindly across time (the 14-day/upcoming-event window
-- is relative to "now"), and it is meant to be run by hand, once, after
-- review. Covers the GRATITUDE announcement (event
-- 3425df40-fd37-4b59-8159-9114a4ad7fbf), sent 2026-11-18 12:00 UTC.
--
-- Prerequisites, both confirmed done as of 2026-11-19:
-- 1. Migration 20261119000000_notifications_dedupe_key.sql (adds dedupe_key).
-- 2. notifications_type_check widened to allow event_announcement,
--    event_reminder_48h, event_reminder_day_of, milestone, venue_match —
--    the original constraint predates all five and silently rejected them.
--
-- Dedup here has to account for two different kinds of "already have a row
-- for this": the new dedupe_key (set by every dual-write from today
-- onward) AND send-event-notifications' older dual-write, which has no
-- dedupe_key, is always typed literally 'event', and keeps the event
-- reference only inside data->>'eventId' (there is no top-level event_id
-- column on notifications). Missing that second case is what the first
-- version of this file got wrong — it would have reported 30 candidate
-- rows instead of the real ~6, and tried to re-insert 25 rows that were
-- already in the inbox from GRATITUDE and JERSEY FEST's original sends.
--
-- Run the two PREVIEW queries first and review the output. Only run the
-- INSERT once you've checked the row count and sample look right.

-- ============================================================
-- PREVIEW 1 — row count
-- ============================================================
SELECT count(*) AS would_insert
FROM notification_history nh
JOIN events e ON e.id = nh.event_id
WHERE nh.type IN ('event_announcement', 'event', 'event_reminder_48h', 'event_reminder_day_of')
  AND nh.sent_at >= now() - interval '14 days'
  AND e.event_date >= now()
  AND e.cancelled_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = nh.user_id
      AND (
        n.dedupe_key = (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) || ':' || nh.event_id::text
        OR (
          (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) = 'event_announcement'
          AND n.type IN ('event', 'event_announcement')
          AND (n.data->>'eventId') = nh.event_id::text
        )
      )
  );

-- ============================================================
-- PREVIEW 2 — sample rows (first 20), with the read flag this backfill
-- would assign shown as backfill_read
-- ============================================================
SELECT
  nh.user_id,
  nh.event_id,
  CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END AS normalised_type,
  nh.title,
  nh.sent_at,
  e.title AS event_title,
  e.event_date,
  (nh.sent_at::date < current_date) AS backfill_read
FROM notification_history nh
JOIN events e ON e.id = nh.event_id
WHERE nh.type IN ('event_announcement', 'event', 'event_reminder_48h', 'event_reminder_day_of')
  AND nh.sent_at >= now() - interval '14 days'
  AND e.event_date >= now()
  AND e.cancelled_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = nh.user_id
      AND (
        n.dedupe_key = (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) || ':' || nh.event_id::text
        OR (
          (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) = 'event_announcement'
          AND n.type IN ('event', 'event_announcement')
          AND (n.data->>'eventId') = nh.event_id::text
        )
      )
  )
ORDER BY nh.sent_at DESC
LIMIT 20;

-- ============================================================
-- BACKFILL INSERT — do not run until the previews above have been reviewed
-- and approved.
--
-- read flag: any row not sent "today" (UTC calendar day) is inserted
-- already marked read, so this backfill cannot make a user's unread badge
-- jump — only genuinely same-day announcements land unread. GRATITUDE
-- (sent 2026-11-18) will be marked read when run on or after 2026-11-19.
--
-- Records exactly the ids it creates into notifications_backfill_ids_20261119
-- (RLS enabled, no policies — not readable via the API, only direct DB
-- access) so the rollback below can delete precisely those rows and
-- nothing a live edge function writes before or after.
-- ============================================================
-- CREATE TABLE notifications_backfill_ids_20261119 AS
-- WITH ins AS (
--   INSERT INTO notifications (user_id, type, title, body, data, read, created_at, dedupe_key)
--   SELECT
--     nh.user_id,
--     CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END,
--     nh.title,
--     nh.body,
--     nh.data,
--     (nh.sent_at::date < current_date),
--     nh.sent_at,
--     (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) || ':' || nh.event_id::text
--   FROM notification_history nh
--   JOIN events e ON e.id = nh.event_id
--   WHERE nh.type IN ('event_announcement', 'event', 'event_reminder_48h', 'event_reminder_day_of')
--     AND nh.sent_at >= now() - interval '14 days'
--     AND e.event_date >= now()
--     AND e.cancelled_at IS NULL
--     AND NOT EXISTS (
--       SELECT 1 FROM notifications n
--       WHERE n.user_id = nh.user_id
--         AND (
--           n.dedupe_key = (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) || ':' || nh.event_id::text
--           OR (
--             (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) = 'event_announcement'
--             AND n.type IN ('event', 'event_announcement')
--             AND (n.data->>'eventId') = nh.event_id::text
--           )
--         )
--     )
--   ON CONFLICT (user_id, dedupe_key) DO NOTHING
--   RETURNING id
-- )
-- SELECT id FROM ins;
--
-- ALTER TABLE notifications_backfill_ids_20261119 ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION — run after the INSERT
-- ============================================================
-- SELECT n.id, n.user_id, n.type, n.title, n.created_at, n.read, n.dedupe_key
-- FROM notifications n
-- JOIN notifications_backfill_ids_20261119 t ON t.id = n.id
-- ORDER BY n.created_at DESC;

-- ============================================================
-- ROLLBACK — deletes only the rows this specific run created
-- ============================================================
-- DELETE FROM notifications
-- WHERE id IN (SELECT id FROM notifications_backfill_ids_20261119);
--
-- DROP TABLE notifications_backfill_ids_20261119;
