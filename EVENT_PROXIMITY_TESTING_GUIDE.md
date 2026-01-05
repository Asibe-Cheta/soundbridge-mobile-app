# Event Proximity & Notification System - Testing Guide

**Date:** December 30, 2025
**Status:** Ready for Testing
**Estimated Testing Time:** 2-3 hours

---

## Overview

This guide covers end-to-end testing of the complete event proximity and notification system, including:
- City-based event filtering and sorting
- Event category preference matching
- Push notifications for nearby events
- Modal prompts for users without preferences
- Daily notification quotas (3/day)

---

## Prerequisites

### 1. Database Migration

Run the SQL migration first:

```bash
# In Supabase SQL Editor, run:
/Users/justicechetachukwuasibe/Desktop/soundbridge-mobile-app/EVENT_PROXIMITY_NOTIFICATION_MIGRATION.sql
```

**Verify migration success:**
```sql
-- Check columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('events', 'profiles')
  AND column_name IN ('city', 'state', 'region')
ORDER BY table_name, column_name;

-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('notification_preferences', 'notification_history')
ORDER BY table_name;

-- Check functions created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%event%'
OR routine_name LIKE '%notification%'
ORDER BY routine_name;
```

### 2. Backend Webhook Deployment

Deploy the notification webhook using:
```
/Users/justicechetachukwuasibe/Desktop/soundbridge-mobile-app/BACKEND_EVENT_NOTIFICATION_WEBHOOK.md
```

**Verify webhook deployment:**
```bash
# Test Edge Function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-event-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "test-id",
      "city": "London",
      "category": "Gospel Concert",
      "title": "Test Event"
    }
  }'
```

### 3. Test Devices

You'll need:
- 2-3 physical iOS/Android devices (for push notifications)
- OR 2-3 emulators with different user accounts
- Devices in different locations (or mock locations)

---

## Test Scenarios

### Scenario 1: Event Creation with City Extraction

**Objective:** Verify events are created with city field populated

**Steps:**
1. Open mobile app as Creator User
2. Navigate to Create Event screen
3. Fill in event details:
   - Title: "Test Gospel Concert"
   - Description: "Testing proximity features"
   - Location: "Luton, UK"
   - Category: "Gospel Concert"
   - Date: Tomorrow
4. Tap geocode button
5. **Verify:** Alert shows coordinates (51.8787, -0.4200)
6. **Verify:** Alert shows city: "Luton"
7. Submit event

**Expected Results:**
```sql
-- Check database
SELECT id, title, location, city, latitude, longitude
FROM events
WHERE title = 'Test Gospel Concert';

-- Should show:
-- city: 'Luton'
-- latitude: 51.8787
-- longitude: -0.4200
```

**Pass Criteria:**
✅ Event saved with city field populated
✅ Coordinates saved correctly
✅ Country extracted from reverse geocoding

---

### Scenario 2: Proximity-Based Event Sorting

**Objective:** Verify events are sorted by distance from user

**Setup:**
```sql
-- Insert test events in different cities
INSERT INTO events (title, city, category, latitude, longitude, event_date, location, creator_id, is_public)
VALUES
  ('London Event', 'London', 'Gospel Concert', 51.5074, -0.1278, NOW() + INTERVAL '1 day', 'London, UK', 'creator-id', true),
  ('Luton Event', 'Luton', 'Gospel Concert', 51.8787, -0.4200, NOW() + INTERVAL '1 day', 'Luton, UK', 'creator-id', true),
  ('Manchester Event', 'Manchester', 'Gospel Concert', 53.4808, -2.2426, NOW() + INTERVAL '1 day', 'Manchester, UK', 'creator-id', true);

-- Set user location to London
UPDATE profiles
SET city = 'London', latitude = 51.5074, longitude = -0.1278
WHERE id = 'test-user-id';
```

**Steps:**
1. Open mobile app as Test User in London
2. Navigate to Events tab
3. View events list

**Expected Results:**
Events should appear in this order:
1. London Event (0 km away)
2. Luton Event (15 km away)
3. Manchester Event (260 km away)

**Pass Criteria:**
✅ Events sorted by distance (closest first)
✅ Distance shown on each event card
✅ London events at top

---

### Scenario 3: Event Category Filtering (With Preferences)

**Objective:** Verify only preferred categories show when user has preferences set

**Setup:**
```sql
-- Set user's preferred categories
INSERT INTO notification_preferences (user_id, preferred_event_categories)
VALUES ('test-user-id', ARRAY['Gospel Concert', 'Music Concert'])
ON CONFLICT (user_id) DO UPDATE
SET preferred_event_categories = ARRAY['Gospel Concert', 'Music Concert'];

-- Insert events with different categories
INSERT INTO events (title, city, category, event_date, location, creator_id, is_public)
VALUES
  ('Gospel Test', 'London', 'Gospel Concert', NOW() + INTERVAL '1 day', 'London, UK', 'creator-id', true),
  ('Comedy Test', 'London', 'Comedy Night', NOW() + INTERVAL '1 day', 'London, UK', 'creator-id', true),
  ('Workshop Test', 'London', 'Workshop', NOW() + INTERVAL '1 day', 'London, UK', 'creator-id', true);
```

**Steps:**
1. Open mobile app as Test User
2. Navigate to Events tab
3. View events list

**Expected Results:**
- ✅ Gospel Test event visible
- ❌ Comedy Test event NOT visible
- ❌ Workshop Test event NOT visible

**Pass Criteria:**
✅ Only events matching preferred categories shown
✅ Other categories hidden
✅ No error messages

---

### Scenario 4: Event Category Filtering (Without Preferences)

**Objective:** Verify ALL events show when user has no preferences + modal appears

**Setup:**
```sql
-- Remove user preferences
DELETE FROM notification_preferences WHERE user_id = 'test-user-id';
```

**Steps:**
1. Open mobile app as Test User
2. Navigate to Events tab
3. **Wait 1.5 seconds** (modal delay)

**Expected Results:**
- ✅ ALL events visible (Gospel, Comedy, Workshop)
- ✅ Modal appears with message: "We highly recommend you select your preferred event categories..."
- ✅ Modal has two buttons: "Select Preferences" and "Maybe Later"

**Pass Criteria:**
✅ All events shown when no preferences
✅ Modal appears after 1.5 seconds
✅ Tapping "Select Preferences" navigates to NotificationPreferences screen
✅ Tapping "Maybe Later" dismisses modal and doesn't show again

---

### Scenario 5: Push Notifications (Same City + Category Match)

**Objective:** Verify users in same city with matching categories get notified

**Setup:**
```sql
-- User A in London with Gospel Concert preference
INSERT INTO profiles (id, username, city, latitude, longitude, expo_push_token)
VALUES ('user-a-id', 'userA', 'London', 51.5074, -0.1278, 'ExponentPushToken[userA-token]')
ON CONFLICT (id) DO UPDATE SET city = 'London', expo_push_token = 'ExponentPushToken[userA-token]';

INSERT INTO notification_preferences (user_id, preferred_event_categories, enabled, event_notifications_enabled)
VALUES ('user-a-id', ARRAY['Gospel Concert'], true, true)
ON CONFLICT (user_id) DO UPDATE SET preferred_event_categories = ARRAY['Gospel Concert'];

-- User B in Manchester with Gospel Concert preference
INSERT INTO profiles (id, username, city, expo_push_token)
VALUES ('user-b-id', 'userB', 'Manchester', 'ExponentPushToken[userB-token]')
ON CONFLICT (id) DO UPDATE SET city = 'Manchester', expo_push_token = 'ExponentPushToken[userB-token]';

INSERT INTO notification_preferences (user_id, preferred_event_categories)
VALUES ('user-b-id', ARRAY['Gospel Concert'])
ON CONFLICT (user_id) DO UPDATE SET preferred_event_categories = ARRAY['Gospel Concert'];
```

**Steps:**
1. Creator creates Gospel Concert event in London
2. Wait 5 seconds for webhook to process
3. Check notification history

**Expected Results:**
```sql
SELECT
  p.username,
  p.city,
  nh.type,
  nh.title,
  nh.sent_at
FROM notification_history nh
JOIN profiles p ON p.id = nh.user_id
ORDER BY nh.sent_at DESC;
```

- ✅ User A (London) receives notification
- ❌ User B (Manchester) does NOT receive notification

**Pass Criteria:**
✅ User A gets notification on device
✅ User B does NOT get notification
✅ Notification shows event title and city
✅ Tapping notification opens EventDetails screen

---

### Scenario 6: Push Notifications (Within 20km Radius)

**Objective:** Verify users within 20km radius get notified

**Setup:**
```sql
-- User C in Watford (19km from London)
INSERT INTO profiles (id, username, city, latitude, longitude, expo_push_token)
VALUES ('user-c-id', 'userC', 'Watford', 51.6565, -0.3963, 'ExponentPushToken[userC-token]')
ON CONFLICT (id) DO UPDATE SET latitude = 51.6565, longitude = -0.3963, expo_push_token = 'ExponentPushToken[userC-token]';

INSERT INTO notification_preferences (user_id, preferred_event_categories)
VALUES ('user-c-id', ARRAY['Gospel Concert'])
ON CONFLICT (user_id) DO UPDATE SET preferred_event_categories = ARRAY['Gospel Concert'];

-- User D in Birmingham (180km from London)
INSERT INTO profiles (id, username, city, latitude, longitude, expo_push_token)
VALUES ('user-d-id', 'userD', 'Birmingham', 52.4862, -1.8904, 'ExponentPushToken[userD-token]')
ON CONFLICT (id) DO UPDATE SET latitude = 52.4862, longitude = -1.8904, expo_push_token = 'ExponentPushToken[userD-token]';

INSERT INTO notification_preferences (user_id, preferred_event_categories)
VALUES ('user-d-id', ARRAY['Gospel Concert'])
ON CONFLICT (user_id) DO UPDATE SET preferred_event_categories = ARRAY['Gospel Concert'];
```

**Steps:**
1. Creator creates Gospel Concert event in London (51.5074, -0.1278)
2. Wait for notifications

**Expected Results:**
- ✅ User C (Watford, 19km) receives notification
- ❌ User D (Birmingham, 180km) does NOT receive notification

**Pass Criteria:**
✅ Users within 20km radius notified
✅ Users beyond 20km NOT notified
✅ Distance calculation accurate

---

### Scenario 7: Notification Time Window Filtering

**Objective:** Verify notifications respect user's time window

**Setup:**
```sql
-- User E with time window 9 AM - 9 PM
INSERT INTO notification_preferences (user_id, preferred_event_categories, start_hour, end_hour)
VALUES ('user-e-id', ARRAY['Gospel Concert'], 9, 21)
ON CONFLICT (user_id) DO UPDATE SET start_hour = 9, end_hour = 21;
```

**Steps:**
1. **At 3 AM:** Creator creates Gospel Concert event in London
2. Check notification history

**Expected Results:**
- ❌ User E does NOT receive notification (outside time window)

**Steps:**
1. **At 10 AM:** Creator creates another Gospel Concert event
2. Check notification history

**Expected Results:**
- ✅ User E receives notification (within time window)

**Pass Criteria:**
✅ Notifications blocked outside time window
✅ Notifications sent within time window
✅ Time zone handling correct

---

### Scenario 8: Daily Notification Quota (3 per day)

**Objective:** Verify users don't receive more than 3 event notifications per day

**Steps:**
1. Creator creates Gospel Concert event in London → User F notified (1/3)
2. Creator creates Music Concert event in London → User F notified (2/3)
3. Creator creates Jazz Room event in London → User F notified (3/3)
4. Creator creates Workshop event in London → User F NOT notified (quota exceeded)

**Expected Results:**
```sql
SELECT COUNT(*)
FROM notification_history
WHERE user_id = 'user-f-id'
  AND type = 'event'
  AND sent_at >= NOW() - INTERVAL '24 hours';
-- Should return: 3
```

**Pass Criteria:**
✅ User receives max 3 event notifications per day
✅ 4th notification blocked
✅ Tips and collaboration notifications still work (not counted)

---

### Scenario 9: Events Without Coordinates

**Objective:** Verify events without coordinates still appear at bottom

**Setup:**
```sql
-- Insert event without coordinates
INSERT INTO events (title, city, category, event_date, location, creator_id, is_public, latitude, longitude)
VALUES ('No GPS Event', NULL, 'Gospel Concert', NOW() + INTERVAL '1 day', 'Somewhere, UK', 'creator-id', true, NULL, NULL);
```

**Steps:**
1. Open Events tab
2. Scroll to bottom of list

**Expected Results:**
- ✅ Event appears at bottom of list
- ✅ No distance shown (since no coordinates)
- ✅ Location text shows "Somewhere, UK"

**Pass Criteria:**
✅ Events without coordinates displayed
✅ Shown below events with coordinates
✅ No errors or crashes

---

### Scenario 10: Modal Dismissal Persistence

**Objective:** Verify modal doesn't re-appear after dismissal

**Steps:**
1. Open Events tab as user without preferences
2. Wait for modal to appear
3. Tap "Maybe Later"
4. Close app
5. Reopen app
6. Navigate to Events tab

**Expected Results:**
- ❌ Modal does NOT appear again

**Pass Criteria:**
✅ Dismissal persists across app restarts
✅ AsyncStorage stores dismissal state
✅ Modal doesn't spam user

---

## Database Verification Queries

### Check Event Cities

```sql
SELECT
  title,
  location,
  city,
  latitude,
  longitude,
  created_at
FROM events
WHERE city IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Check User Preferences

```sql
SELECT
  p.username,
  p.city AS user_city,
  np.preferred_event_categories,
  np.enabled,
  np.event_notifications_enabled
FROM profiles p
LEFT JOIN notification_preferences np ON np.user_id = p.id
WHERE p.expo_push_token IS NOT NULL;
```

### Check Notification History

```sql
SELECT
  p.username,
  p.city,
  e.title AS event_title,
  e.city AS event_city,
  nh.sent_at,
  nh.delivered
FROM notification_history nh
JOIN profiles p ON p.id = nh.user_id
LEFT JOIN events e ON e.id = nh.event_id
ORDER BY nh.sent_at DESC
LIMIT 20;
```

### Check Distance Calculations

```sql
SELECT
  e.title,
  e.city,
  calculate_distance(51.5074, -0.1278, e.latitude, e.longitude) AS distance_from_london_km
FROM events e
WHERE e.latitude IS NOT NULL
ORDER BY distance_from_london_km;
```

### Check Daily Quota

```sql
SELECT
  p.username,
  COUNT(*) AS notifications_today
FROM notification_history nh
JOIN profiles p ON p.id = nh.user_id
WHERE nh.type = 'event'
  AND nh.sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY p.username
ORDER BY notifications_today DESC;
```

---

## Mobile App Testing Checklist

### Events Tab UI

- [ ] Distance shown on event cards (e.g., "5km away")
- [ ] Events sorted by proximity (closest first)
- [ ] Events without coordinates shown at bottom
- [ ] Category badges displayed correctly
- [ ] Search filter works alongside proximity sorting
- [ ] Pull-to-refresh reloads personalized events
- [ ] Modal appears after 1.5s for users without preferences

### Event Creation

- [ ] Geocoding works for valid addresses
- [ ] City extracted and shown in confirmation
- [ ] Category dropdown includes all 13 categories
- [ ] Event saves with city field populated
- [ ] Warning shown if coordinates unavailable
- [ ] Image upload works
- [ ] Date picker functions correctly

### Notifications

- [ ] Push notifications appear on device
- [ ] Notification shows event title, city, and date
- [ ] Tapping notification opens EventDetails screen
- [ ] Deep linking works correctly
- [ ] Badge count updates
- [ ] Notification inbox shows history
- [ ] "Mark all as read" works

### Notification Preferences

- [ ] Can select multiple event categories
- [ ] Time window picker works
- [ ] Master toggle disables all notifications
- [ ] Location city shown (from GPS or profile)
- [ ] Changes sync to backend
- [ ] UI shows selected categories with checkmarks

---

## Performance Testing

### Load Testing

```sql
-- Insert 1000 test events
DO $$
BEGIN
  FOR i IN 1..1000 LOOP
    INSERT INTO events (title, city, category, latitude, longitude, event_date, location, creator_id, is_public)
    VALUES (
      'Test Event ' || i,
      CASE (i % 5)
        WHEN 0 THEN 'London'
        WHEN 1 THEN 'Manchester'
        WHEN 2 THEN 'Birmingham'
        WHEN 3 THEN 'Leeds'
        ELSE 'Liverpool'
      END,
      CASE (i % 3)
        WHEN 0 THEN 'Gospel Concert'
        WHEN 1 THEN 'Music Concert'
        ELSE 'Workshop'
      END,
      NOW() + (i || ' days')::INTERVAL,
      NOW() + (i || ' days')::INTERVAL,
      'Test Location',
      'creator-id',
      true,
      51.5074 + (RANDOM() - 0.5) * 0.1,
      -0.1278 + (RANDOM() - 0.5) * 0.1
    );
  END LOOP;
END $$;
```

**Test:**
1. Open Events tab
2. Measure load time
3. Scroll through list
4. Check memory usage

**Expected:**
- Load time: < 2 seconds
- Scroll: Smooth (60 FPS)
- Memory: < 100MB increase

---

## Troubleshooting

### No Events Showing

**Check:**
```sql
-- Verify user has preferences
SELECT * FROM notification_preferences WHERE user_id = 'user-id';

-- Check if events match categories
SELECT category FROM events WHERE is_public = true;
```

**Fix:**
- Remove user preferences to show all events
- Add more event categories to preferences

### No Notifications Received

**Check:**
1. User has `expo_push_token` in profiles table
2. User has `event_notifications_enabled = true`
3. Current time within user's notification window
4. Event category matches user preferences
5. Daily quota not exceeded (< 3 notifications today)
6. Edge Function deployed and trigger created

**Debug:**
```sql
-- Check webhook logs
SELECT * FROM notification_history
WHERE event_id = 'problematic-event-id';

-- Check if user was eligible
SELECT * FROM find_nearby_users_for_event('event-id', 20);
```

### Distance Calculation Wrong

**Check:**
```sql
-- Verify coordinates
SELECT latitude, longitude FROM events WHERE id = 'event-id';
SELECT latitude, longitude FROM profiles WHERE id = 'user-id';

-- Test distance function
SELECT calculate_distance(51.5074, -0.1278, 51.8787, -0.4200);
-- Should return approximately 34.6 km (London to Luton)
```

### Modal Keeps Appearing

**Check:**
```bash
# Clear AsyncStorage (in dev tools or manually)
await AsyncStorage.removeItem('event_preference_modal_dismissed');
```

---

## Success Criteria Summary

### Critical (Must Pass)

✅ Events sorted by proximity
✅ Category filtering works (with and without preferences)
✅ Notifications sent to correct users only
✅ Daily quota enforced (3/day)
✅ Modal appears for users without preferences
✅ Time window filtering works

### Important (Should Pass)

✅ Distance displayed correctly
✅ Events without coordinates shown at bottom
✅ 20km radius filtering works
✅ Modal dismissal persists
✅ Deep linking from notifications works

### Nice to Have

✅ Load time < 2 seconds for 1000 events
✅ Smooth scrolling
✅ No memory leaks

---

## Reporting Issues

When reporting bugs, include:

1. **Scenario number** (e.g., "Scenario 5 failed")
2. **Expected behavior** vs. **Actual behavior**
3. **Steps to reproduce**
4. **Database state** (run verification queries)
5. **Error logs** (console output, Supabase logs)
6. **Screenshots** (if UI issue)

---

## Next Steps After Testing

1. ✅ Fix any bugs found
2. ✅ Optimize performance if needed
3. ✅ Update documentation
4. ✅ Deploy to production
5. ✅ Monitor real-world usage
6. ✅ Gather user feedback
7. ✅ Iterate based on metrics

---

**Testing Status:** Ready to Begin
**Estimated Completion Time:** 2-3 hours
**Priority:** 🔴 **HIGH** - Core feature

Good luck with testing! 🚀
