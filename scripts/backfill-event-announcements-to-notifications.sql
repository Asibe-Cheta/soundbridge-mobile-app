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
      AND n.dedupe_key = (
        CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END
        || ':' || nh.event_id::text
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
      AND n.dedupe_key = (
        CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END
        || ':' || nh.event_id::text
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
-- ============================================================
-- INSERT INTO notifications (user_id, type, title, body, data, read, created_at, dedupe_key)
-- SELECT
--   nh.user_id,
--   CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END,
--   nh.title,
--   nh.body,
--   nh.data,
--   (nh.sent_at::date < current_date),
--   nh.sent_at,
--   (CASE WHEN nh.type = 'event' THEN 'event_announcement' ELSE nh.type END) || ':' || nh.event_id::text
-- FROM notification_history nh
-- JOIN events e ON e.id = nh.event_id
-- WHERE nh.type IN ('event_announcement', 'event', 'event_reminder_48h', 'event_reminder_day_of')
--   AND nh.sent_at >= now() - interval '14 days'
--   AND e.event_date >= now()
--   AND e.cancelled_at IS NULL
-- ON CONFLICT (user_id, dedupe_key) DO NOTHING;
