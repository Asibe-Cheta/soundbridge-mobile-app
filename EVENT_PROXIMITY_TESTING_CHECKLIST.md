# Event Proximity & Notification Testing Checklist

## Date: December 6, 2025

## Quick Testing Guide

### Pre-Test Verification

#### 1. Check Console Logs When Opening Discover → Events

Open the app and navigate to Discover → Events tab. Look for these logs:

**✅ GOOD (Proximity Working):**
```
🎯 Getting personalized events for user: <user-id>
✅ Found personalized events via RPC: 10
```

**❌ BAD (Proximity NOT Working):**
```
🎯 Getting personalized events for user: <user-id>
⚠️ RPC function not available, using manual query. Error: function get_personalized_events does not exist
🌍 Filtering events by country: United Kingdom
✅ Found personalized events via manual query: 10
```

If you see the BAD logs, proximity sorting is **NOT** working - events will only be filtered by country and sorted by date.

---

### Test 1: Create Events at Different Distances

#### Your Location: Luton, UK
- Coordinates: **51.8787° N, 0.4200° W**

#### Test Events to Create

| Event | Location | Distance from Luton | Coordinates | Event Date |
|-------|----------|---------------------|-------------|------------|
| **Event A** | Luton Town Centre | ~2 km | 51.8783° N, 0.4195° W | Tomorrow 6 PM |
| **Event B** | Bedford, UK | ~15 km | 52.1332° N, 0.4697° W | Tomorrow 7 PM |
| **Event C** | Milton Keynes, UK | ~30 km | 52.0406° N, 0.7594° W | Tomorrow 8 PM |
| **Event D** | London, UK | ~50 km | 51.5074° N, 0.1278° W | Day after tomorrow |
| **Event E** | Birmingham, UK | ~110 km | 52.4862° N, 1.8904° W | Day after tomorrow |
| **Event F** | Edinburgh, UK | ~530 km | 55.9533° N, 3.1883° W | 3 days from now |

#### Expected Order in Discover (if proximity working):
```
1. Event A (Luton, 2 km, tomorrow 6 PM) - Closest
2. Event B (Bedford, 15 km, tomorrow 7 PM) - Close
3. Event C (Milton Keynes, 30 km, tomorrow 8 PM) - Nearby
4. Event D (London, 50 km, day after) - Further
5. Event E (Birmingham, 110 km, day after) - Far
6. Event F (Edinburgh, 530 km, 3 days) - Very far
```

#### If Proximity NOT Working:
All UK events will appear, sorted ONLY by date (soonest first), ignoring distance.

---

### Test 2: Notification Priority Testing

#### Setup: Create Events with Different Creator Follower Counts

| Event | Location | Distance | Date | Creator Followers |
|-------|----------|----------|------|-------------------|
| **Event G** | Luton | 2 km | 1 day | 50 followers |
| **Event H** | Luton | 2 km | 2 days | 500 followers |
| **Event I** | Luton | 2 km | 3 days | 5000 followers |

**Expected Notification Order (Priority):**
```
1. Event G - Soonest (1 day) + Close (2 km)
2. Event H - Soon (2 days) + Close + Popular (500 followers)
3. Event I - Later (3 days) + Close + Very Popular (5000 followers)
```

**Note:** This assumes backend calculates priority as:
```
priority = (distance weight) + (date weight) + (follower weight)
```

If notifications arrive in different order, it indicates backend uses different priority formula.

---

### Test 3: Verify Event Schema Has Location Data

#### Check CreateEventScreen

**File:** [src/screens/CreateEventScreen.tsx](src/screens/CreateEventScreen.tsx)

When creating an event, check if the form includes:
- ✅ Location (text field) - Should exist
- ✅ Latitude (number) - Should be captured
- ✅ Longitude (number) - Should be captured
- ❓ Country (text) - May be inferred from location

**Expected Flow:**
1. User enters location (e.g., "Luton, UK")
2. App geocodes address → Gets lat/lng
3. Event is saved with coordinates

**If geocoding is missing:**
- Events will be saved without lat/lng
- Proximity sorting will fail
- Need to add geocoding service

---

### Test 4: Check Notification Inbox

**File:** [src/screens/NotificationInboxScreen.tsx](src/screens/NotificationInboxScreen.tsx)

After creating events, check:
1. Do notifications appear in inbox?
2. What is the notification format?
3. Are they ordered by priority?

**Expected Notification Format:**
```
📍 Event Nearby: [Event Title]
[Event Location] • [Distance] away
[Event Date] • [Creator Name]

Tap to view details →
```

**Check for:**
- ✅ Distance shown (e.g., "2 km away")
- ✅ Event date/time
- ✅ Creator name with follower count
- ✅ Notifications ordered by priority

---

## Console Log Monitoring Commands

### When Creating an Event:
```
📍 Creating event...
✅ Event created with ID: <event-id>
🌍 Event location: Luton, UK (51.8787, 0.4200)
```

### When Loading Events:
```
🎯 Getting personalized events for user: <user-id>
✅ Found personalized events via RPC: 6
📍 Event distances:
  - Event A: 2.1 km
  - Event B: 14.8 km
  - Event C: 29.5 km
```

### When Receiving Notifications:
```
🔔 Notification received: event
📍 Event: [Event Title]
🌍 Location: Luton, UK (2 km away)
👤 Creator: [Username] (5000 followers)
```

---

## Troubleshooting

### Issue 1: Events Not Sorted by Distance

**Symptom:** All events appear in date order, ignoring proximity

**Cause:** Backend RPC function `get_personalized_events` not implemented

**Solution:**
1. Check backend database for function:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'get_personalized_events';
   ```

2. If missing, backend team needs to implement function (see main doc)

3. Temporary workaround: Events will be sorted by country + date only

---

### Issue 2: Events Missing Coordinates

**Symptom:** Events appear but no distance shown

**Cause:** Events created without latitude/longitude

**Solution:**
1. Check CreateEventScreen for geocoding
2. Verify events table has lat/lng populated:
   ```sql
   SELECT id, title, latitude, longitude FROM events;
   ```

3. If null, need to add geocoding when creating events

---

### Issue 3: No Notifications Received

**Symptom:** Created events but no push notifications

**Cause:** Backend notification service not sending

**Solution:**
1. Check notification preferences are enabled
2. Check backend logs for notification sending
3. Verify push token is registered:
   ```sql
   SELECT user_id, token, platform FROM push_tokens
   WHERE user_id = '<your-user-id>';
   ```

4. Check NotificationService permissions on device

---

## Quick Test Script

### Step-by-Step Test

**Time Required:** 30 minutes

1. **Clear existing events** (5 min)
   - Open Discover → Events
   - Note current events (if any)

2. **Create Test Event A** (5 min)
   - Location: Luton Town Centre
   - Date: Tomorrow 6 PM
   - Note: Lat 51.8783, Lng -0.4195

3. **Create Test Event B** (5 min)
   - Location: Bedford, UK
   - Date: Tomorrow 7 PM
   - Note: Lat 52.1332, Lng -0.4697

4. **Create Test Event C** (5 min)
   - Location: Edinburgh, UK
   - Date: 3 days from now
   - Note: Lat 55.9533, Lng -3.1883

5. **Check Event Order** (5 min)
   - Navigate to Discover → Events
   - **Expected:** A → B → C (closest to farthest)
   - **If wrong:** Backend RPC function not working

6. **Check Notifications** (5 min)
   - Open Notification Inbox
   - **Expected:** 3 notifications in order A → B → C
   - **Check:** Distance shown, priority correct

---

## Result Interpretation

### ✅ PASS: Proximity Working

**Observations:**
- Events appear in distance order (closest first)
- Console shows: `✅ Found personalized events via RPC`
- Notifications arrive in priority order
- Distance shown in km/miles

**Action:** System working correctly! 🎉

---

### ❌ FAIL: Proximity NOT Working

**Observations:**
- Events appear in date order only
- Console shows: `⚠️ RPC function not available`
- No distance shown
- Notifications may be missing or wrong order

**Action:**
1. Forward this doc to web team
2. Request implementation of `get_personalized_events` function
3. Verify database schema has lat/lng columns
4. Test again after backend update

---

### 🔶 PARTIAL: Some Issues

**Observations:**
- Events load but no distance shown
- OR notifications missing
- OR wrong priority order

**Action:**
1. Check which component is failing (events vs notifications)
2. Review console logs for errors
3. Check database schema
4. Contact web team with specific error messages

---

## Expected Timeline

- **Test Duration:** 30-60 minutes
- **If backend changes needed:** 1-3 days for web team implementation
- **Retest after changes:** 15 minutes

---

## Success Criteria

### Events Tab
- ✅ Events sorted by distance (closest first)
- ✅ Console shows RPC success
- ✅ All test events appear
- ✅ Distance calculation visible in logs

### Notifications
- ✅ Receive notification for each event
- ✅ Notifications in priority order
- ✅ Distance shown in notification
- ✅ Creator info included

### Overall
- ✅ System responds to location changes
- ✅ Proximity updates when user moves
- ✅ Genre filtering works (if applicable)
- ✅ Performance is acceptable (<2s load time)

---

**Ready to test!** Follow the steps above and report findings. 🚀
