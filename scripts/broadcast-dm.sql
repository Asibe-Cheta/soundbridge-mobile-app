-- ─────────────────────────────────────────────────────────────────────────────
-- SoundBridge One-Time DM Broadcast
-- Run this in the Supabase SQL editor (Dashboard → SQL editor → New query)
--
-- Replace JUSTICE_UUID_HERE with Justice's actual user UUID before running.
-- Safe to run once: the WHERE clause guards against sending to yourself.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  sender_uuid UUID := 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';  -- Justice (admin)
  message_text TEXT := 'Action Required — Keep Your Location & Notifications On

To get the most out of SoundBridge, you need to keep both your location and notifications turned on for this app.

Everything SoundBridge does for you depends on these being active — from getting discovered by fans nearby, to receiving event recommendations, to being matched with collaboration opportunities, to getting tipped in real time, to your AI Career Adviser knowing where to point your career.

Think of it like Uber. Uber cannot work without location and notifications. Neither can SoundBridge.

You don''t need to turn on location for every app — but for this one, it is essential.

Here''s what you miss without it:
— You won''t appear in local event discovery
— Fans nearby won''t find your music
— You won''t receive gig or collaboration alerts
— Your AI Career Adviser won''t be able to give you location-based direction
— You''ll miss real-time tip notifications

Go to your phone Settings → SoundBridge → turn on Location (set to ''Always'' or ''While Using'') and Notifications.

We''ll keep reminding you because we want SoundBridge to work fully for you.

— The SoundBridge Team';

BEGIN
  INSERT INTO messages (sender_id, recipient_id, content, message_type, created_at)
  SELECT
    sender_uuid,
    p.id,
    message_text,
    'text',
    now()
  FROM profiles p
  WHERE p.id != sender_uuid
    -- Guard: don't re-send if this exact broadcast was already sent
    AND NOT EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.sender_id  = sender_uuid
        AND m.recipient_id = p.id
        AND m.content LIKE 'Action Required — Keep Your Location%'
    );

  RAISE NOTICE 'Broadcast complete. Rows inserted: %', (
    SELECT COUNT(*) FROM messages
    WHERE sender_id = sender_uuid
      AND content LIKE 'Action Required — Keep Your Location%'
  );
END $$;
