-- Lets send-event-reminders, send-milestone-notification and
-- venue-notification-matcher dual-write into notifications (the table the
-- in-app inbox and the bell badge read from) without ever inserting a
-- duplicate row on a retry.
--
-- dedupe_key is a per-type, per-entity string the edge function builds
-- itself (e.g. 'event_reminder_48h:<eventId>', 'milestone:<nudgeId>',
-- 'venue_match:<venueId>') and is only ever set by these server-side
-- dual-writes. Rows inserted by anything else (send-event-notifications'
-- existing dual-write, the web team's backend for follows/comments/likes/
-- gifts) leave it NULL, which is safe: Postgres unique indexes treat NULL
-- as distinct from every other NULL, so any number of NULL rows per user
-- is allowed and this index never constrains them.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key_idx
  ON notifications (user_id, dedupe_key);
