# Web Team: Event Discovery System Implementation Guide

## Overview

This document details the **5-layer Event Discovery System** described in our business plan. The mobile app is already calling the backend functions, but the intelligent filtering logic needs to be implemented on the backend.

**Priority:** HIGH - This is a core differentiator (MOAT #1) that saves creators £150-250 per event in advertising costs.

---

## Current Mobile App Implementation

### What the Mobile App Already Does

1. **Stores user coordinates** when they grant location permission
2. **Stores user event category preferences** via NotificationPreferencesScreen
3. **Calls `get_personalized_events` RPC function** expecting filtered, prioritized events
4. **Falls back to basic query** if RPC function fails or returns empty

### Mobile App Code Reference

**File:** `src/lib/supabase.ts` (lines 957-1028)

```typescript
async getPersonalizedEvents(userId: string, limit = 20) {
  // First try the PostgreSQL function (THIS IS WHAT YOU NEED TO IMPLEMENT)
  const { data, error } = await supabase
    .rpc('get_personalized_events', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: 0
    });

  if (!error && data && data.length > 0) {
    return { data, error: null };
  }

  // Fallback to basic query if RPC fails
  // ... basic query without intelligent filtering
}
```

**File:** `src/screens/NotificationPreferencesScreen.tsx`

The user can select their preferred event categories from:
```javascript
const EVENT_GENRES = [
  'Music Concert',
  'Birthday Party',
  'Carnival',
  'Get Together',
  'Music Karaoke',
  'Comedy Night',
  'Gospel Concert',
  'Instrumental',
  'Jazz Room',
  'Workshop',
  'Conference',
  'Festival',
  'Other',
];
```

These are saved via the API endpoint: `PUT /api/user/notification-preferences`

The mobile app sends:
```json
{
  "preferredEventGenres": ["Gospel Concert", "Music Concert", "Jazz Room"],
  "notificationStartHour": 8,
  "notificationEndHour": 22,
  "eventNotificationsEnabled": true,
  // ... other preferences
}
```

---

## The 5 Layers to Implement

### Layer 1: Location-Based Category Matching

**What it does:** When a creator publishes an event, notify nearby users who have selected that event category in their preferences.

**Database columns needed in `notification_preferences` table:**
```sql
-- Check if these columns exist, add if missing
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS preferred_event_genres TEXT[] DEFAULT '{}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS event_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notification_start_hour INTEGER DEFAULT 8;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notification_end_hour INTEGER DEFAULT 22;
```

**Database columns needed in `profiles` table:**
```sql
-- User location for proximity filtering
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;
```

**Implementation Logic:**
```sql
-- When an event is created, find users to notify
CREATE OR REPLACE FUNCTION notify_users_for_new_event(
  p_event_id UUID,
  p_event_category TEXT,
  p_event_latitude DECIMAL,
  p_event_longitude DECIMAL,
  p_notification_radius_km INTEGER DEFAULT 25
)
RETURNS TABLE(user_id UUID, distance_km DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    (
      6371 * acos(
        cos(radians(p_event_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_event_longitude)) +
        sin(radians(p_event_latitude)) * sin(radians(p.latitude))
      )
    ) as distance_km
  FROM profiles p
  JOIN notification_preferences np ON np.user_id = p.id
  WHERE
    -- User has coordinates set
    p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    -- User wants event notifications
    AND np.event_notifications_enabled = true
    -- User's preferred categories include this event's category
    AND (
      np.preferred_event_genres IS NULL
      OR array_length(np.preferred_event_genres, 1) = 0
      OR p_event_category = ANY(np.preferred_event_genres)
    )
    -- User is within radius
    AND (
      6371 * acos(
        cos(radians(p_event_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_event_longitude)) +
        sin(radians(p_event_latitude)) * sin(radians(p.latitude))
      )
    ) <= p_notification_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;
```

---

### Layer 2: Geographic Verification and Filtering

**What it does:** Filter events to show only those within the user's configured radius (5km to 50km).

**The `get_personalized_events` function should:**

```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  venue TEXT,
  city TEXT,
  category TEXT,
  price_gbp DECIMAL,
  price_ngn DECIMAL,
  max_attendees INTEGER,
  current_attendees INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  distance_km DECIMAL,
  relevance_score INTEGER
) AS $$
DECLARE
  v_user_latitude DECIMAL;
  v_user_longitude DECIMAL;
  v_preferred_genres TEXT[];
  v_max_radius_km INTEGER := 50; -- Default max radius
BEGIN
  -- Get user's location
  SELECT latitude, longitude INTO v_user_latitude, v_user_longitude
  FROM profiles WHERE profiles.id = p_user_id;

  -- Get user's preferred event genres
  SELECT preferred_event_genres INTO v_preferred_genres
  FROM notification_preferences WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.venue,
    e.city,
    e.category,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.current_attendees,
    e.image_url,
    e.created_at,
    -- Calculate distance if user has coordinates
    CASE
      WHEN v_user_latitude IS NOT NULL AND v_user_longitude IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL THEN
        ROUND((
          6371 * acos(
            cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
            cos(radians(e.longitude) - radians(v_user_longitude)) +
            sin(radians(v_user_latitude)) * sin(radians(e.latitude))
          )
        )::numeric, 1)
      ELSE NULL
    END as distance_km,
    -- Calculate relevance score (higher = more relevant)
    (
      -- Base score
      10 +
      -- Category match bonus (+50 points)
      CASE
        WHEN v_preferred_genres IS NOT NULL
             AND array_length(v_preferred_genres, 1) > 0
             AND e.category = ANY(v_preferred_genres) THEN 50
        ELSE 0
      END +
      -- Proximity bonus (closer = higher score, max +30 points)
      CASE
        WHEN v_user_latitude IS NOT NULL AND e.latitude IS NOT NULL THEN
          GREATEST(0, 30 - ROUND((
            6371 * acos(
              cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
              cos(radians(e.longitude) - radians(v_user_longitude)) +
              sin(radians(v_user_latitude)) * sin(radians(e.latitude))
            )
          )::numeric))
        ELSE 0
      END +
      -- Recency bonus (events sooner = higher score, max +20 points)
      GREATEST(0, 20 - EXTRACT(DAY FROM (e.event_date - NOW())))::INTEGER
    ) as relevance_score
  FROM events e
  WHERE
    -- Only future events
    e.event_date >= NOW()
    -- Filter by distance if user has location
    AND (
      v_user_latitude IS NULL
      OR v_user_longitude IS NULL
      OR e.latitude IS NULL
      OR e.longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(v_user_latitude)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(v_user_longitude)) +
          sin(radians(v_user_latitude)) * sin(radians(e.latitude))
        )
      ) <= v_max_radius_km
    )
  ORDER BY
    relevance_score DESC,
    e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

---

### Layer 3: Genre Behavioral Matching

**What it does:** Analyze user's actual listening history to determine their real genre preferences, not just self-declared ones.

**Database table needed:**
```sql
-- Track user listening behavior for genre analysis
CREATE TABLE IF NOT EXISTS user_genre_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  play_count INTEGER DEFAULT 0,
  total_listen_time_seconds INTEGER DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, genre)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_genre_behavior_user_id ON user_genre_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genre_behavior_genre ON user_genre_behavior(genre);
```

**Update the function to consider behavioral data:**
```sql
-- Add to relevance_score calculation in get_personalized_events:
+
-- Behavioral match bonus (+40 points if user frequently listens to this genre)
CASE
  WHEN EXISTS (
    SELECT 1 FROM user_genre_behavior ugb
    WHERE ugb.user_id = p_user_id
    AND ugb.genre = e.category
    AND ugb.play_count >= 10  -- Threshold for "frequent" listener
  ) THEN 40
  ELSE 0
END
```

**API endpoint needed to track plays:**
```
POST /api/analytics/track-play
{
  "trackId": "uuid",
  "genre": "Jazz",
  "listenDurationSeconds": 180
}
```

---

### Layer 4: Attendance History Filtering

**What it does:** Prioritize users who have actually purchased tickets in the past, not just clicked "interested."

**Database table needed:**
```sql
-- Track ticket purchases
CREATE TABLE IF NOT EXISTS event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  total_paid_gbp DECIMAL(10, 2),
  total_paid_ngn DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pending', -- pending, completed, refunded
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_event_tickets_user_id ON event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON event_tickets(event_id);
```

**Update relevance score to consider purchase history:**
```sql
-- Add to relevance_score in get_personalized_events:
+
-- Ticket purchaser bonus (+25 points if user has bought tickets before)
CASE
  WHEN EXISTS (
    SELECT 1 FROM event_tickets et
    WHERE et.user_id = p_user_id
    AND et.payment_status = 'completed'
  ) THEN 25
  ELSE 0
END
+
-- Category purchaser bonus (+35 points if user bought tickets for this category)
CASE
  WHEN EXISTS (
    SELECT 1 FROM event_tickets et
    JOIN events prev_e ON prev_e.id = et.event_id
    WHERE et.user_id = p_user_id
    AND et.payment_status = 'completed'
    AND prev_e.category = e.category
  ) THEN 35
  ELSE 0
END
```

---

### Layer 5: Temporal Reminder Optimization

**What it does:** Send automated reminders at optimal times based on user behavior patterns.

**Database table needed:**
```sql
-- Scheduled notifications queue
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'two_weeks', 'one_week', '24_hours', 'event_day'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id, notification_type)
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending
ON scheduled_notifications(scheduled_for)
WHERE status = 'pending';
```

**Function to schedule notifications when event is created:**
```sql
CREATE OR REPLACE FUNCTION schedule_event_notifications(
  p_event_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_user RECORD;
  v_scheduled_count INTEGER := 0;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = p_event_id;

  IF v_event IS NULL THEN
    RETURN 0;
  END IF;

  -- Find users to notify using Layer 1 logic
  FOR v_user IN
    SELECT user_id, distance_km
    FROM notify_users_for_new_event(
      p_event_id,
      v_event.category,
      v_event.latitude,
      v_event.longitude,
      50 -- 50km radius
    )
  LOOP
    -- Schedule 2-week reminder (if event is more than 2 weeks away)
    IF v_event.event_date > NOW() + INTERVAL '14 days' THEN
      INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
      VALUES (v_user.user_id, p_event_id, 'two_weeks', v_event.event_date - INTERVAL '14 days')
      ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
      v_scheduled_count := v_scheduled_count + 1;
    END IF;

    -- Schedule 1-week reminder (if event is more than 1 week away)
    IF v_event.event_date > NOW() + INTERVAL '7 days' THEN
      INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
      VALUES (v_user.user_id, p_event_id, 'one_week', v_event.event_date - INTERVAL '7 days')
      ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
      v_scheduled_count := v_scheduled_count + 1;
    END IF;

    -- Schedule 24-hour reminder
    IF v_event.event_date > NOW() + INTERVAL '1 day' THEN
      INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
      VALUES (v_user.user_id, p_event_id, '24_hours', v_event.event_date - INTERVAL '1 day')
      ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
      v_scheduled_count := v_scheduled_count + 1;
    END IF;

    -- Schedule event day reminder (morning of event)
    INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
    VALUES (v_user.user_id, p_event_id, 'event_day', DATE_TRUNC('day', v_event.event_date) + INTERVAL '9 hours')
    ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;
    v_scheduled_count := v_scheduled_count + 1;
  END LOOP;

  RETURN v_scheduled_count;
END;
$$ LANGUAGE plpgsql;
```

**Trigger to auto-schedule when event is created:**
```sql
CREATE OR REPLACE FUNCTION trigger_schedule_event_notifications()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM schedule_event_notifications(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_event_insert
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION trigger_schedule_event_notifications();
```

**Cron job needed (run every 5 minutes):**
```sql
-- Function to process pending notifications
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_notification RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  FOR v_notification IN
    SELECT sn.*, e.title as event_title, e.event_date, e.location, e.category,
           p.push_token, np.notification_start_hour, np.notification_end_hour
    FROM scheduled_notifications sn
    JOIN events e ON e.id = sn.event_id
    JOIN profiles p ON p.id = sn.user_id
    LEFT JOIN notification_preferences np ON np.user_id = sn.user_id
    WHERE sn.status = 'pending'
    AND sn.scheduled_for <= NOW()
    -- Respect user's notification hours
    AND EXTRACT(HOUR FROM NOW()) >= COALESCE(np.notification_start_hour, 8)
    AND EXTRACT(HOUR FROM NOW()) <= COALESCE(np.notification_end_hour, 22)
    LIMIT 100  -- Process in batches
  LOOP
    -- Mark as processing (to prevent duplicate sends)
    UPDATE scheduled_notifications
    SET status = 'processing'
    WHERE id = v_notification.id;

    -- Here you would call your push notification service
    -- This depends on your infrastructure (Firebase, Expo, etc.)

    -- Mark as sent
    UPDATE scheduled_notifications
    SET status = 'sent', sent_at = NOW()
    WHERE id = v_notification.id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints Needed

### 1. Update User Location
```
PUT /api/user/location
Authorization: Bearer <token>
{
  "latitude": 51.4541973,
  "longitude": -0.9624704
}
```

**Implementation:**
```javascript
// Update profiles table with user coordinates
await supabase
  .from('profiles')
  .update({
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    location_updated_at: new Date().toISOString()
  })
  .eq('id', userId);
```

### 2. Update Notification Preferences
```
PUT /api/user/notification-preferences
Authorization: Bearer <token>
{
  "preferredEventGenres": ["Gospel Concert", "Music Concert"],
  "eventNotificationsEnabled": true,
  "notificationStartHour": 8,
  "notificationEndHour": 22
}
```

**Implementation:**
```javascript
// Map mobile field names to database column names
const dbUpdate = {
  preferred_event_genres: req.body.preferredEventGenres || [],
  event_notifications_enabled: req.body.eventNotificationsEnabled ?? true,
  notification_start_hour: req.body.notificationStartHour ?? 8,
  notification_end_hour: req.body.notificationEndHour ?? 22,
  // ... other fields
};

await supabase
  .from('notification_preferences')
  .upsert({
    user_id: userId,
    ...dbUpdate
  });
```

### 3. Get Personalized Events
The mobile app already calls the RPC function. Just ensure it returns the expected format:

```typescript
interface PersonalizedEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  venue: string;
  city: string;
  category: string;
  price_gbp: number;
  price_ngn: number;
  max_attendees: number;
  current_attendees: number;
  image_url: string;
  created_at: string;
  distance_km: number | null;  // Distance from user (null if no coordinates)
  relevance_score: number;     // Higher = more relevant
}
```

---

## Column Name Mapping

The mobile app uses camelCase, but the database uses snake_case. Ensure the API transforms appropriately:

| Mobile App Field | Database Column |
|------------------|-----------------|
| `preferredEventGenres` | `preferred_event_genres` |
| `eventNotificationsEnabled` | `event_notifications_enabled` |
| `notificationStartHour` | `notification_start_hour` |
| `notificationEndHour` | `notification_end_hour` |
| `messageNotificationsEnabled` | `message_notifications_enabled` |
| `tipNotificationsEnabled` | `tip_notifications_enabled` |
| `collaborationNotificationsEnabled` | `collaboration_notifications_enabled` |
| `walletNotificationsEnabled` | `wallet_notifications_enabled` |

---

## Implementation Status (Updated January 17, 2026)

### Backend Implementation - COMPLETED
The web team has implemented the core backend per migration `supabase/migrations/20260117000000_event_discovery_system.sql`:

1. [x] Create `get_personalized_events` PostgreSQL function
2. [x] Add required columns to `profiles` table (latitude, longitude)
3. [x] Add required columns to `notification_preferences` table
4. [x] Create `user_genre_behavior` table
5. [x] Create `event_tickets` table (if not already existing)
6. [x] Create `scheduled_notifications` table
7. [x] Create `notify_users_for_new_event` function
8. [x] Create `schedule_event_notifications` function
9. [x] Update API endpoint: PUT /api/user/location (now accepts latitude/longitude)

### Mobile App - READY
The mobile app is already configured to:
- Send `latitude` and `longitude` in PUT /api/user/location requests
- Call `get_personalized_events` RPC function
- Display `distance_km` when returned by backend
- Store user's preferred event genres

### Testing Checklist
1. [ ] Apply migration in Supabase SQL editor
2. [ ] Set up cron job for `process_pending_notifications` (every 5 minutes)
3. [ ] Test PUT /api/user/location from mobile - confirm profiles.latitude/longitude update
4. [ ] Test RPC function returns events with distance_km and relevance_score
5. [ ] Verify mobile app displays events correctly with distance
6. [ ] Create test event and verify notifications are scheduled
7. [ ] (Optional) Add POST /api/analytics/track-play endpoint for genre behavior tracking

---

## Expected Impact (From Business Plan)

**Before (Facebook Advertising):**
- Cost: £200
- Reach: 10,000 impressions
- Qualified audience: 1,500 (15%)
- Wasted: 8,500 (85%)
- Tickets sold: 20
- Net result: £200 loss

**After (SoundBridge Event Discovery):**
- Cost: £0
- Reach: 2,000-3,000 targeted users
- Qualified audience: 1,800-2,700 (90%)
- Wasted: 200-300 (10%)
- Tickets sold: 180
- Net result: £2,130 profit

**Difference per event: £2,330**

---

## Questions?

Contact the mobile team if you need clarification on:
- How the mobile app stores/retrieves user location
- How notification preferences are synced
- Expected data formats for the RPC function

---

*Document created: January 2026*
*Last updated: January 17, 2026*
