# Event Notification System - Deployment Checklist

**Date:** January 8, 2026
**Status:** Mobile app ready ✅ | Backend deployment needed ❌

---

## Executive Summary

The event notification system is **fully implemented in the mobile app** and ready to receive notifications. When complete, the system will:

1. ✅ Automatically notify users when events are created in their city
2. ✅ Filter by user's preferred event categories (Gospel Concert, etc.)
3. ✅ Navigate to EventDetailsScreen when notification is tapped
4. ✅ Respect user's notification time windows (e.g., 8 AM - 10 PM)
5. ✅ Enforce daily limits (3 event notifications per day)
6. ✅ Calculate proximity (20km radius) for nearby events

**What's Missing:** Backend webhook deployment (detailed below)

---

## Mobile App Status: ✅ COMPLETE

### 1. NotificationService Implementation
**File:** [src/services/NotificationService.ts](src/services/NotificationService.ts)

**Status:** ✅ Fully implemented and tested

**Features:**
- ✅ Event notification type defined (line 26)
- ✅ Event notification Android channel created (lines 198-204)
- ✅ Deep link generation for events: `soundbridge://event/:id` (lines 709-711)
- ✅ Push token registration with backend
- ✅ Notification preferences (eventNotificationsEnabled, preferredEventGenres)
- ✅ Location tracking (GPS + onboarding fallback)
- ✅ Time window validation
- ✅ Notification history storage

**Key Code:**
```typescript
// Event notification channel (Android)
{
  id: 'events',
  name: 'Event Notifications',
  description: 'Notifications about nearby events',
  importance: Notifications.AndroidImportance.HIGH,
  sound: 'default',
}

// Deep link generation
case 'event':
case 'event_reminder':
  return `${baseUrl}event/${entityId}`;
```

### 2. Deep Linking Integration
**File:** [App.tsx](App.tsx)

**Status:** ✅ Fully implemented and tested

**Features:**
- ✅ Deep link listener active (lines 422-442)
- ✅ Event navigation handler (lines 380-384)
- ✅ Pending deep link check on app ready (lines 453-460)
- ✅ Cold start URL handling

**Key Code:**
```typescript
// Deep link navigation handler
case 'event':
  if (segments[1]) {
    navigationRef.current.navigate('EventDetails', { eventId: segments[1] });
  }
  break;

// Check for pending notification taps
notificationService.getPendingDeepLink().then(data => {
  if (data && data.deepLink && navigationRef.current) {
    const { path, queryParams } = Linking.parse(data.deepLink);
    if (path) {
      handleDeepLinkNavigation(path, queryParams);
    }
  }
});
```

### 3. Event Details Screen
**File:** [src/screens/EventDetailsScreen.tsx](src/screens/EventDetailsScreen.tsx)

**Status:** ✅ Ready to receive eventId from notifications

**Navigation:**
- Route: `EventDetails`
- Param: `eventId` (string)
- Loads event data and displays full details

---

## Backend Status: ❌ NEEDS DEPLOYMENT

### Required Database Functions

#### 1. `find_nearby_users_for_event`
**Purpose:** Find users within 20km radius who like the event category

**Status:** ⚠️ NEEDS VERIFICATION/CREATION

**Expected Signature:**
```sql
CREATE OR REPLACE FUNCTION find_nearby_users_for_event(
  p_event_id UUID,
  p_max_distance_km DECIMAL DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  username TEXT,
  display_name TEXT,
  city TEXT,
  distance_km DECIMAL,
  preferred_categories TEXT[],
  start_hour INTEGER,
  end_hour INTEGER
)
```

**Required Logic:**
1. Get event location (latitude, longitude, category)
2. Find users with expo_push_token (not null)
3. Calculate distance using Haversine formula
4. Filter by distance < p_max_distance_km
5. Filter by category match (user's preferred_categories contains event category)
6. Return with user notification preferences

**Implementation:** See [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md) lines 136-140

---

#### 2. `check_notification_quota`
**Purpose:** Verify user hasn't exceeded 3 event notifications today

**Status:** ⚠️ NEEDS VERIFICATION/CREATION

**Expected Signature:**
```sql
CREATE OR REPLACE FUNCTION check_notification_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 3
)
RETURNS BOOLEAN
```

**Required Logic:**
1. Count notifications in `notification_history` table
2. Filter by user_id, type='event', sent_at within last 24 hours
3. Return TRUE if count < p_daily_limit, FALSE otherwise

**Implementation:** See [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md) lines 171-175

---

#### 3. `record_notification_sent`
**Purpose:** Record notification in history table

**Status:** ⚠️ NEEDS VERIFICATION/CREATION

**Expected Signature:**
```sql
CREATE OR REPLACE FUNCTION record_notification_sent(
  p_user_id UUID,
  p_event_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB
)
RETURNS VOID
```

**Required Logic:**
1. Insert into `notification_history` table
2. Set sent_at = NOW()
3. Set delivered = FALSE (initially)
4. Store notification metadata

**Implementation:** See [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md) lines 231-238

---

### Required Edge Function

#### `send-event-notifications`
**Purpose:** Send push notifications when events are created

**Status:** ❌ NOT DEPLOYED

**Complete Implementation:** See [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md)

**Files to Create:**
```
supabase/
  functions/
    send-event-notifications/
      index.ts          ← Main webhook logic (lines 50-269)
      _lib/
        expo.ts         ← Expo push helper (lines 274-368)
        time-window.ts  ← Time validation (lines 372-431)
```

**Key Features:**
- ✅ Finds nearby users (calls `find_nearby_users_for_event`)
- ✅ Checks time windows
- ✅ Enforces daily quota (calls `check_notification_quota`)
- ✅ Sends via Expo Push API in batches of 100
- ✅ Records history (calls `record_notification_sent`)
- ✅ Includes deep link: `soundbridge://event/:id`

**Deployment Commands:**
```bash
# Create function
supabase functions new send-event-notifications

# Copy code from BACKEND_EVENT_NOTIFICATION_WEBHOOK.md

# Deploy
supabase functions deploy send-event-notifications
```

---

### Required Database Trigger

#### `on_event_created` Trigger
**Purpose:** Automatically call webhook when event is inserted

**Status:** ❌ NOT CREATED

**Implementation:**
```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications';
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY';
BEGIN
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to events table
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_notifications();
```

**Prerequisites:**
```sql
-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Documentation:** See [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md) lines 463-491

---

## Database Schema Requirements

### Events Table
**Status:** ⚠️ VERIFY THESE COLUMNS EXIST

**Required Columns:**
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;  -- e.g., "Gospel Concert"
```

### Profiles Table
**Status:** ⚠️ VERIFY THESE COLUMNS EXIST

**Required Columns:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_event_categories TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_start_hour INTEGER DEFAULT 8;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_end_hour INTEGER DEFAULT 22;
```

### Notification History Table
**Status:** ⚠️ CREATE IF NOT EXISTS

```sql
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'event', 'event_reminder', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notification_history_user_date
  ON notification_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_event
  ON notification_history(event_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type_date
  ON notification_history(type, sent_at DESC);
```

---

## Deployment Steps (For Backend Team)

### Step 1: Verify Database Schema
```sql
-- Check events table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('latitude', 'longitude', 'city', 'category');

-- Check profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('latitude', 'longitude', 'city', 'expo_push_token',
                      'event_notifications_enabled', 'preferred_event_categories',
                      'notification_start_hour', 'notification_end_hour');

-- Check notification_history table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'notification_history';
```

**If missing:** Add required columns/tables using schema SQL above.

---

### Step 2: Create Database Functions
1. Copy SQL from [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md)
2. Create `find_nearby_users_for_event` function
3. Create `check_notification_quota` function
4. Create `record_notification_sent` function
5. Test each function:
```sql
-- Test find_nearby_users_for_event
SELECT * FROM find_nearby_users_for_event('test-event-id', 20);

-- Test check_notification_quota
SELECT check_notification_quota('test-user-id', 3);
```

---

### Step 3: Deploy Edge Function
```bash
# Initialize Supabase CLI (if not done)
supabase init

# Create function directory
supabase functions new send-event-notifications

# Copy code from BACKEND_EVENT_NOTIFICATION_WEBHOOK.md:
# - index.ts (lines 50-269)
# - _lib/expo.ts (lines 274-368)
# - _lib/time-window.ts (lines 372-431)

# Deploy to Supabase
supabase functions deploy send-event-notifications

# Note the function URL (needed for trigger)
```

---

### Step 4: Create Database Trigger
```sql
-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger function (update URL and key)
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT := 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-event-notifications';
  service_role_key TEXT := '[YOUR_SERVICE_ROLE_KEY]';
BEGIN
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_notifications();
```

---

### Step 5: Test End-to-End

#### Test Setup
1. Create two test users:
   - User A: Location = London, Preferred categories = ["Gospel Concert"]
   - User B: Location = Manchester, Preferred categories = ["Gospel Concert"]

2. Ensure both have:
   - `expo_push_token` set (get from NotificationService after login)
   - `event_notifications_enabled = true`
   - `notification_start_hour = 8, notification_end_hour = 22`

#### Test Execution
```sql
-- Create test event in London
INSERT INTO events (
  id, title, description, event_date, location,
  city, latitude, longitude, category, creator_id
) VALUES (
  gen_random_uuid(),
  'Amazing Gospel Concert',
  'Join us for an evening of worship',
  NOW() + INTERVAL '7 days',
  'Royal Albert Hall, London',
  'London',
  51.5009,  -- Royal Albert Hall coordinates
  -0.1773,
  'Gospel Concert',
  'creator-user-id'
);
```

#### Expected Results
✅ **User A (London):**
- Receives push notification within 5 seconds
- Notification title: "New Gospel Concert in London!"
- Notification body: "Amazing Gospel Concert on [date]"
- Tapping notification opens EventDetailsScreen

✅ **User B (Manchester):**
- Does NOT receive notification (different city, >20km away)

#### Verification Queries
```sql
-- Check notification was sent
SELECT * FROM notification_history
WHERE event_id = 'test-event-id'
ORDER BY sent_at DESC;

-- Check user A's notification count today
SELECT COUNT(*) FROM notification_history
WHERE user_id = 'user-a-id'
  AND type = 'event'
  AND sent_at >= NOW() - INTERVAL '24 hours';
```

---

## Testing Daily Quota Limit

### Test Steps
1. Create 3 test events in London (User A's city)
2. Verify User A receives 3 notifications
3. Create 4th event in London
4. Verify User A does NOT receive 4th notification (quota exceeded)
5. Wait 24 hours or manually update `sent_at` in database
6. Create 5th event in London
7. Verify User A receives notification (quota reset)

### SQL to Manually Reset Quota (for testing)
```sql
-- Clear notification history for user
DELETE FROM notification_history
WHERE user_id = 'user-a-id'
  AND type = 'event';
```

---

## Monitoring & Debugging

### View Edge Function Logs
```bash
# Real-time logs
supabase functions logs send-event-notifications --tail

# Look for:
# ✅ "Found X nearby users in [city]"
# ✅ "X users eligible for notifications"
# ✅ "Sent to [username] ([city], [distance]km)"
# ❌ "No nearby users found"
# ❌ "User [username] outside time window"
# ❌ "User [username] reached daily limit"
```

### Check Notification History
```sql
-- Recent notifications (last 24 hours)
SELECT
  nh.sent_at,
  p.username,
  p.city AS user_city,
  e.title AS event_title,
  e.city AS event_city,
  nh.delivered,
  nh.opened
FROM notification_history nh
JOIN profiles p ON p.id = nh.user_id
JOIN events e ON e.id = nh.event_id
WHERE nh.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY nh.sent_at DESC;

-- Notification statistics by user
SELECT
  p.username,
  COUNT(*) AS total_notifications,
  SUM(CASE WHEN nh.delivered THEN 1 ELSE 0 END) AS delivered_count,
  SUM(CASE WHEN nh.opened THEN 1 ELSE 0 END) AS opened_count
FROM notification_history nh
JOIN profiles p ON p.id = nh.user_id
WHERE nh.type = 'event'
GROUP BY p.id, p.username
ORDER BY total_notifications DESC;
```

---

## Troubleshooting Guide

### Problem: No notifications received

**Checklist:**
1. ✅ User has `expo_push_token` in profiles table?
   ```sql
   SELECT expo_push_token FROM profiles WHERE id = 'user-id';
   ```

2. ✅ User has `event_notifications_enabled = true`?
   ```sql
   SELECT event_notifications_enabled FROM profiles WHERE id = 'user-id';
   ```

3. ✅ User's preferred categories include event category?
   ```sql
   SELECT preferred_event_categories FROM profiles WHERE id = 'user-id';
   -- Should contain event's category
   ```

4. ✅ Current time within notification window?
   ```sql
   SELECT notification_start_hour, notification_end_hour FROM profiles WHERE id = 'user-id';
   -- Current hour should be between start and end
   ```

5. ✅ User hasn't exceeded daily quota?
   ```sql
   SELECT COUNT(*) FROM notification_history
   WHERE user_id = 'user-id'
     AND type = 'event'
     AND sent_at >= NOW() - INTERVAL '24 hours';
   -- Should be < 3
   ```

6. ✅ Event has city/coordinates?
   ```sql
   SELECT city, latitude, longitude, category FROM events WHERE id = 'event-id';
   -- All should be non-null
   ```

---

### Problem: Edge Function not triggering

**Checklist:**
1. ✅ Trigger exists?
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_event_created';
   ```

2. ✅ pg_net extension enabled?
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. ✅ Function URL correct in trigger?
   ```sql
   -- Review trigger definition
   SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'on_event_created';
   ```

4. ✅ Service role key valid?
   - Check Supabase dashboard → Settings → API
   - Ensure service_role key matches in trigger

5. ✅ Check Edge Function deployment status:
   ```bash
   supabase functions list
   ```

---

### Problem: Notifications delayed

**Possible Causes:**
- pg_net queue backlog
- Expo API rate limiting (unlikely with batching)
- Large number of recipients (>1000)

**Check Queue:**
```sql
SELECT * FROM net.http_request_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Solution:**
- Consider using pg_cron for scheduled batching if >1000 users

---

## Security Checklist

### ✅ Service Role Key Protection
- ❌ NEVER expose service role key in mobile app
- ✅ Only use in Edge Function (server-side)
- ✅ Store as environment variable in Supabase

### ✅ RLS Policies
```sql
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notification_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert
CREATE POLICY "Service role can insert notifications"
  ON notification_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

### ✅ Input Validation
- Edge Function validates event has city/coordinates
- Edge Function validates event has category
- Time window validation prevents spam
- Daily quota prevents abuse

---

## Performance Metrics

### Expected Performance
- **Database query** (find nearby users): ~100ms
- **Expo API call** (send 100 notifications): ~200ms
- **Total time**: ~300ms for 100 users

### Optimization
- ✅ Batching: Sends 100 notifications at once
- ✅ Async processing: Doesn't block event creation
- ✅ Indexed queries: All queries use indexes
- ✅ Chunking: Can handle 1000+ users

---

## Success Criteria

The event notification system is fully deployed when:

1. ✅ All database functions created and tested
2. ✅ Edge Function deployed and verified
3. ✅ Database trigger created and active
4. ✅ End-to-end test passes:
   - User creates event in London
   - Nearby users in London receive notification within 5 seconds
   - Tapping notification opens EventDetailsScreen
   - Distant users do NOT receive notification
5. ✅ Daily quota enforced (max 3 notifications/day)
6. ✅ Time window respected
7. ✅ Category filtering works
8. ✅ Monitoring logs show successful sends

---

## Mobile App - Nothing to Do

The mobile app is **100% ready**. No changes needed. The system will work automatically once backend is deployed.

**Mobile app handles:**
- ✅ Receiving push notifications
- ✅ Displaying notifications with proper channel/sound
- ✅ Deep linking to EventDetailsScreen when tapped
- ✅ Storing notification history locally
- ✅ Badge count management
- ✅ Push token registration

---

## Next Steps

### For Backend/DevOps Team:

1. **Day 1 (2 hours):**
   - Verify/add database schema columns
   - Create three database functions
   - Test functions with SQL queries

2. **Day 2 (2 hours):**
   - Deploy Edge Function
   - Create database trigger
   - Run initial tests

3. **Day 3 (1 hour):**
   - End-to-end testing with real devices
   - Monitor logs
   - Adjust quota/distance limits if needed

**Total Estimated Time:** 5 hours

---

## Documentation References

- **Complete webhook implementation:** [BACKEND_EVENT_NOTIFICATION_WEBHOOK.md](BACKEND_EVENT_NOTIFICATION_WEBHOOK.md)
- **Proximity system details:** [EVENT_PROXIMITY_AND_NOTIFICATION_SYSTEM.md](EVENT_PROXIMITY_AND_NOTIFICATION_SYSTEM.md)
- **NotificationService code:** [src/services/NotificationService.ts](src/services/NotificationService.ts)
- **Deep linking setup:** [App.tsx](App.tsx) lines 372-460

---

**Status:** Ready for backend deployment
**Last Updated:** January 8, 2026
**Mobile App Version:** Ready ✅
**Backend Version:** Pending deployment ❌
