# Notification Preferences Table - Column Reconciliation

**Priority:** HIGH
**Owner:** Web App Team + Mobile Team
**Date:** February 8, 2026
**Status:** ACTION REQUIRED

---

## Problem

The `notification_preferences` table exists in Supabase but is missing most columns defined in `EVENT_PROXIMITY_NOTIFICATION_MIGRATION.sql`. The mobile app's Notification Preferences screen (schedule, type toggles, genre picker) cannot persist user settings to the backend because the required columns don't exist.

**Error observed:**
```
Could not find the 'enabled' column of 'notification_preferences' in the schema cache
Could not find the 'collaboration_notifications_enabled' column of 'notification_preferences' in the schema cache
```

## Current State (what exists)

| Column | Exists | Type |
|--------|--------|------|
| `id` | YES | UUID |
| `user_id` | YES | UUID (unique) |
| `preferred_event_categories` | YES | TEXT[] |
| `preferred_event_genres` | YES | TEXT[] |
| `created_at` | YES | TIMESTAMPTZ |

## Required State (what must exist)

The full schema is defined in `EVENT_PROXIMITY_NOTIFICATION_MIGRATION.sql` (Part 3, lines 59-89).
The following columns need to be added:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `enabled` | BOOLEAN | `true` | Master notification toggle |
| `start_hour` | INTEGER | `8` | Quiet hours start (0-23) |
| `end_hour` | INTEGER | `22` | Quiet hours end (0-23) |
| `timezone` | TEXT | `'UTC'` | User timezone for schedule |
| `event_notifications_enabled` | BOOLEAN | `true` | Events toggle |
| `message_notifications_enabled` | BOOLEAN | `true` | Messages toggle |
| `tip_notifications_enabled` | BOOLEAN | `true` | Tips & payments toggle |
| `collaboration_notifications_enabled` | BOOLEAN | `true` | Collaborations toggle |
| `wallet_notifications_enabled` | BOOLEAN | `true` | Wallet/withdrawals toggle |
| `location_city` | TEXT | `NULL` | User city for proximity |
| `location_state` | TEXT | `NULL` | User state for proximity |
| `location_country` | TEXT | `NULL` | User country for proximity |
| `updated_at` | TIMESTAMPTZ | `NOW()` | Last update timestamp |

## Migration SQL (run in Supabase SQL Editor)

```sql
-- ============================================================
-- NOTIFICATION PREFERENCES - ADD MISSING COLUMNS
-- Date: February 8, 2026
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Master toggle
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Schedule
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS start_hour INTEGER DEFAULT 8;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS end_hour INTEGER DEFAULT 22;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Per-type toggles
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS event_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS message_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS tip_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS collaboration_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS wallet_notifications_enabled BOOLEAN DEFAULT true;

-- Location columns
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS location_city TEXT;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS location_state TEXT;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS location_country TEXT;

-- Timestamp
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Performance index for finding users with notifications enabled
CREATE INDEX IF NOT EXISTS idx_notification_preferences_events_enabled
ON notification_preferences(user_id, enabled, event_notifications_enabled)
WHERE enabled = true AND event_notifications_enabled = true;

-- ============================================================
-- VERIFY: Run this after migration to confirm all columns exist
-- ============================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;
```

## How Mobile Uses These Columns

The mobile app writes preferences via direct Supabase upsert (not REST API):

```typescript
// NotificationService.ts - updatePreferences()
await supabase
  .from('notification_preferences')
  .upsert(
    {
      user_id: user.id,
      enabled: true,
      start_hour: 8,
      end_hour: 22,
      timezone: 'Africa/Lagos',
      event_notifications_enabled: true,
      message_notifications_enabled: true,
      tip_notifications_enabled: true,
      collaboration_notifications_enabled: true,
      wallet_notifications_enabled: true,
      preferred_event_genres: ['Music Concert', 'Gospel Concert'],
      preferred_event_categories: ['Music Concert', 'Gospel Concert'],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
```

## How Backend Should Use These Columns

When sending push notifications (event created, tip received, message, etc.):

```sql
-- Example: Find users to notify about a new event
SELECT p.expo_push_token, p.display_name
FROM profiles p
JOIN notification_preferences np ON np.user_id = p.id
WHERE np.enabled = true                              -- Master toggle on
  AND np.event_notifications_enabled = true           -- Event type enabled
  AND EXTRACT(HOUR FROM NOW() AT TIME ZONE np.timezone)
      BETWEEN np.start_hour AND np.end_hour           -- Within active hours
  AND (
    np.preferred_event_categories IS NULL
    OR cardinality(np.preferred_event_categories) = 0
    OR 'Music Concert' = ANY(np.preferred_event_categories)  -- Genre match
  );
```

## RLS Policies (already exist from migration)

Confirm these policies exist. If not, run:

```sql
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own notification preferences"
  ON notification_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
```

## After Migration

Once the columns are added:
- Mobile preferences screen will save all settings to Supabase immediately
- Backend notification logic can filter by user preferences (type toggles, schedule, genres)
- Each user's notification experience is unique and persisted server-side
- Preferences sync across devices (not just local storage)
