# Notifications Table Migration Required

**Priority: HIGH**
**Date: 2026-02-09**
**From: Mobile Team**

## Problem

The mobile app's in-app Notifications screen reads from the Supabase `notifications` table, but the table schema has column name mismatches with what the mobile code expects, a restrictive CHECK constraint that blocks most notification types, and missing RLS policies for INSERT and DELETE.

As a result, the Notifications screen is empty even though push notifications are being received.

## What Mobile Has Done

- `NotificationService.ts` now persists received push notifications to the Supabase `notifications` table (in addition to AsyncStorage)
- `NotificationsScreen.tsx` already reads from the `notifications` table with real-time subscriptions
- `NotificationBellButton.tsx` already shows unread count badge from the `notifications` table
- `markNotificationAsRead()` and `markAllAsRead()` now update both AsyncStorage and Supabase

## Required SQL Migration

Please run the following SQL in the Supabase dashboard (SQL Editor):

```sql
-- =============================================
-- NOTIFICATIONS TABLE MIGRATION
-- =============================================

-- 1. Rename columns to match mobile app expectations
-- Mobile code uses 'body' (not 'message') and 'read' (not 'is_read')
ALTER TABLE notifications RENAME COLUMN message TO body;
ALTER TABLE notifications RENAME COLUMN is_read TO read;

-- 2. Add missing 'data' column for notification metadata (deep links, entity IDs, etc.)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- 3. Drop the restrictive CHECK constraint that only allows 5 types
-- and replace with an expanded constraint covering all notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow', 'new_follower', 'like', 'comment', 'event',
    'collaboration', 'collaboration_request', 'collaboration_accepted',
    'collaboration_declined', 'collaboration_confirmed',
    'tip', 'message', 'system', 'content_purchase',
    'connection_request', 'connection_accepted', 'subscription',
    'payout', 'moderation', 'live_session', 'track',
    'track_approved', 'track_featured', 'withdrawal',
    'event_reminder', 'creator_post'
  ));

-- 4. Add INSERT policy (currently only SELECT + UPDATE exist)
-- Mobile app needs to insert notifications when push notifications are received
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Add DELETE policy
-- Mobile app needs to allow users to delete/dismiss notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Add indexes for performance
-- These speed up the unread count query and the notification list query
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
```

## Verification After Migration

1. The `notifications` table should have columns: `id`, `user_id`, `type`, `title`, `body`, `data`, `read`, `created_at`
2. RLS policies should include: SELECT, UPDATE, INSERT, DELETE (all scoped to `auth.uid() = user_id`)
3. The CHECK constraint should allow all notification types listed above

## Expected Result

Once the migration is applied:
- Push notifications received on mobile will be stored in the `notifications` table
- The in-app Notifications screen (bell icon) will show all notifications
- The bell badge will show the correct unread count
- Users can mark notifications as read, mark all as read, and delete notifications
- Real-time updates will work (new notifications appear instantly)

## Backend Enhancement (Optional but Recommended)

In addition to the mobile-side persistence, ideally the **backend** should also write to the `notifications` table whenever it sends a push notification. This ensures notifications appear even if:
- The mobile app was force-closed when the notification arrived
- The notification was dismissed from the OS notification tray without opening the app
- The user has multiple devices

The backend insert should use the same schema:
```sql
INSERT INTO notifications (user_id, type, title, body, data, read)
VALUES ($1, $2, $3, $4, $5, false);
```
