# Event Proximity Prioritization & Notification System

## Date: December 6, 2025

## Current Implementation Status

### 1. Event Loading & Proximity Sorting

#### Mobile App Implementation

**File:** [src/lib/supabase.ts:959-1029](src/lib/supabase.ts#L959-L1029)

**Function:** `getPersonalizedEvents(userId, limit)`

**How it works:**
1. **Primary Method (Backend RPC):**
   ```typescript
   const { data, error } = await supabase
     .rpc('get_personalized_events', {
       p_user_id: userId,
       p_limit: limit,
       p_offset: 0
     });
   ```
   - Calls PostgreSQL function `get_personalized_events`
   - This function should handle proximity-based sorting
   - **Backend must implement this function** with distance calculation

2. **Fallback Method (Manual Query):**
   ```typescript
   // Get user's profile for location
   const { data: profile } = await supabase
     .from('profiles')
     .select('country')
     .eq('id', userId)
     .single();

   // Filter events by country
   query = query.eq('country', profile.country);
   ```
   - Only filters by country (not proximity)
   - Sorts by `event_date` (soonest first)
   - **Does NOT sort by distance/proximity**

**Current Issues:**
- ❌ Fallback method does NOT prioritize by proximity
- ❌ No latitude/longitude distance calculation in fallback
- ✅ Primary method relies on backend RPC function (needs verification)

---

### 2. Backend Database Function Required

The mobile app expects a PostgreSQL function: `get_personalized_events`

**Expected Function Signature:**
```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER,
  p_offset INTEGER
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  country TEXT,
  ticket_price DECIMAL,
  tickets_available INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  creator JSONB,
  distance_km DECIMAL  -- Distance from user's location
)
```

**Expected Logic:**
1. Get user's location (latitude, longitude) from profiles table
2. Calculate distance between user and each event using PostGIS or formula:
   ```sql
   -- Haversine formula for distance calculation
   SELECT
     id,
     title,
     ...,
     (
       6371 * acos(
         cos(radians(user_latitude)) *
         cos(radians(event_latitude)) *
         cos(radians(event_longitude) - radians(user_longitude)) +
         sin(radians(user_latitude)) *
         sin(radians(event_latitude))
       )
     ) AS distance_km
   FROM events
   WHERE event_date >= NOW()
   ORDER BY distance_km ASC, event_date ASC
   LIMIT p_limit
   OFFSET p_offset;
   ```

3. **Prioritization Order:**
   - Primary: Distance (closest events first)
   - Secondary: Event date (soonest events among nearby ones)
   - Tertiary: Creator follower count (popular events)

**Status:** ⚠️ **NEEDS VERIFICATION** - Check if backend has this function implemented

---

### 3. Notification System

#### Implementation Status

**File:** [src/services/NotificationService.ts](src/services/NotificationService.ts)

**Notification Types:** Includes `'event'` and `'event_reminder'` (lines 26-38)

**Event Notification Preferences:**
```typescript
export interface NotificationPreferences {
  eventNotificationsEnabled: boolean;
  preferredEventGenres: string[];
  locationState: string;
  locationCountry: string;
}
```

**Android Channel:**
```typescript
{
  id: 'events',
  name: 'Event Notifications',
  description: 'Notifications about nearby events',
  importance: Notifications.AndroidImportance.HIGH,
}
```

#### Notification Trigger Logic

**Expected Behavior:**
1. Backend should send push notifications when:
   - New event is created nearby (within X km/miles)
   - Event creator has Y+ followers
   - Event matches user's preferred genres
   - Event is within 7 days

2. **Prioritization Factors:**
   - ✅ Distance (closer events notify first)
   - ✅ Creator follower count (popular creators notify more users)
   - ✅ Event date (imminent events get priority)
   - ✅ User's preferred genres

**Current Issues:**
- ⚠️ **BACKEND RESPONSIBILITY** - Mobile app only receives notifications
- ⚠️ Backend must implement notification sending logic
- ⚠️ Backend must query events and calculate priorities

---

## Testing Plan

### Test Scenario 1: Proximity Prioritization

**Objective:** Verify events are sorted by distance from user's location

**Steps:**
1. **Setup:**
   - User location: Luton, UK (51.8787° N, 0.4200° W)
   - Create Event A: Far location (e.g., Edinburgh, UK - 55.9533° N, 3.1883° W) ≈ 530 km away
   - Create Event B: Close location (e.g., Bedford, UK - 52.1332° N, 0.4697° W) ≈ 15 km away
   - Create Event C: Very close (Luton town center) ≈ 2 km away

2. **Expected Order in Discover > Events Tab:**
   ```
   1. Event C (Luton, 2 km) - Closest
   2. Event B (Bedford, 15 km) - Close
   3. Event A (Edinburgh, 530 km) - Far
   ```

3. **Verify:**
   - Open app → Discover → Events tab
   - Check console logs: `🎯 Getting personalized events for user: ...`
   - Check if RPC function is called: `✅ Found personalized events via RPC`
   - OR if fallback is used: `⚠️ RPC function not available, using manual query`

**If Fallback is Used:**
- Events will be sorted by country first, then by date
- **Proximity sorting will NOT work** ❌

---

### Test Scenario 2: Notification Prioritization

**Objective:** Verify notifications are sent in priority order

**Steps:**
1. **Setup:**
   - Create Event A: Edinburgh, 3 days from now, Creator has 10 followers
   - Create Event B: Bedford, 2 days from now, Creator has 100 followers
   - Create Event C: Luton, 1 day from now, Creator has 1000 followers

2. **Expected Notification Order:**
   ```
   1. Event C - Closest + Most followers + Soonest
   2. Event B - Close + Many followers + Soon
   3. Event A - Far + Few followers + Later
   ```

3. **Verify:**
   - Check notification inbox on device
   - Notifications should arrive in priority order (C → B → A)
   - Check notification timestamp

**Backend Configuration Required:**
- Backend must calculate notification priority score:
  ```
  priority_score =
    (1000 / distance_km) * 40% +
    (follower_count / 10) * 30% +
    (1000 / hours_until_event) * 30%
  ```

---

### Test Scenario 3: Genre Filtering

**Objective:** Verify events match user's preferred genres

**Steps:**
1. **Setup:**
   - User preferred genres: "Hip-Hop", "R&B"
   - Create Event A: Genre "Hip-Hop" (Luton)
   - Create Event B: Genre "Rock" (Luton)
   - Create Event C: Genre "R&B" (Bedford)

2. **Expected Results:**
   ```
   ✅ Event A appears (matches genre + close)
   ✅ Event C appears (matches genre + close)
   ❓ Event B might appear (close but genre mismatch)
   ```

3. **Verify:**
   - Personalized events should prioritize matching genres
   - Genre mismatch events should rank lower

---

## Required Backend Implementation

### 1. Database Schema Requirements

**Events Table:**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  latitude DECIMAL(10, 8),  -- Required for proximity sorting
  longitude DECIMAL(11, 8),  -- Required for proximity sorting
  country TEXT,
  state TEXT,
  city TEXT,
  creator_id UUID REFERENCES profiles(id),
  ticket_price DECIMAL(10, 2),
  tickets_available INTEGER,
  genre TEXT[],  -- Array of genres
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Profiles Table:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  latitude DECIMAL(10, 8),  -- User's location
  longitude DECIMAL(11, 8),  -- User's location
  country TEXT,
  state TEXT,
  city TEXT,
  follower_count INTEGER DEFAULT 0,
  preferred_genres TEXT[],
  ...
);
```

### 2. PostgreSQL Function Implementation

**File:** Backend database migrations

```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  country TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  ticket_price DECIMAL,
  tickets_available INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  creator JSONB,
  distance_km DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  user_lat DECIMAL;
  user_lon DECIMAL;
  user_country TEXT;
BEGIN
  -- Get user's location
  SELECT profiles.latitude, profiles.longitude, profiles.country
  INTO user_lat, user_lon, user_country
  FROM profiles
  WHERE profiles.id = p_user_id;

  -- If user has no location, return events ordered by date
  IF user_lat IS NULL OR user_lon IS NULL THEN
    RETURN QUERY
    SELECT
      e.id,
      e.title,
      e.description,
      e.image_url,
      e.event_date,
      e.location,
      e.country,
      e.latitude,
      e.longitude,
      e.ticket_price,
      e.tickets_available,
      e.created_at,
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ) AS creator,
      NULL::DECIMAL AS distance_km
    FROM events e
    LEFT JOIN profiles p ON e.creator_id = p.id
    WHERE e.event_date >= NOW()
    ORDER BY e.event_date ASC
    LIMIT p_limit
    OFFSET p_offset;
    RETURN;
  END IF;

  -- Return events sorted by proximity
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.image_url,
    e.event_date,
    e.location,
    e.country,
    e.latitude,
    e.longitude,
    e.ticket_price,
    e.tickets_available,
    e.created_at,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'follower_count', p.follower_count
    ) AS creator,
    (
      6371 * acos(
        LEAST(1.0,
          cos(radians(user_lat)) *
          cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(user_lon)) +
          sin(radians(user_lat)) *
          sin(radians(e.latitude))
        )
      )
    ) AS distance_km
  FROM events e
  LEFT JOIN profiles p ON e.creator_id = p.id
  WHERE e.event_date >= NOW()
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
  ORDER BY distance_km ASC, e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

### 3. Event Notification Backend Logic

**File:** Backend notification service

**Pseudo-code:**
```typescript
async function sendEventNotifications(eventId: string) {
  const event = await getEventById(eventId);

  // Calculate priority score for each user
  const users = await getUsersNearEvent(event);

  for (const user of users) {
    const distance = calculateDistance(user.location, event.location);
    const followerBoost = event.creator.follower_count / 10;
    const urgencyBoost = 1000 / hoursUntilEvent(event.event_date);

    const priorityScore =
      (1000 / distance) * 0.4 +
      followerBoost * 0.3 +
      urgencyBoost * 0.3;

    // Schedule notification based on priority
    await scheduleNotification({
      userId: user.id,
      type: 'event',
      eventId: event.id,
      priority: priorityScore,
      scheduledFor: calculateNotificationTime(priorityScore)
    });
  }
}
```

---

## Mobile App Console Logs to Monitor

### 1. Event Loading Logs

```bash
# When opening Discover > Events tab:
🎯 Getting personalized events for user: <user-id>

# If RPC function exists:
✅ Found personalized events via RPC: 10

# If RPC function missing (fallback):
⚠️ RPC function not available, using manual query. Error: function get_personalized_events does not exist
🌍 Filtering events by country: United Kingdom
✅ Found personalized events via manual query: 10
```

### 2. What to Look For

**Good (Proximity Working):**
```
✅ Found personalized events via RPC: 10
```

**Bad (Proximity NOT Working):**
```
⚠️ RPC function not available, using manual query
```

---

## Summary

### ✅ What's Implemented (Mobile)
1. Event loading system with RPC call to backend
2. Fallback to manual query (country-based, date-sorted)
3. Notification service infrastructure
4. Event notification channel

### ❌ What's Missing/Needs Verification
1. **Backend RPC Function:** `get_personalized_events` with distance calculation
2. **Database Schema:** Events need `latitude` and `longitude` columns
3. **Profiles Schema:** Users need `latitude` and `longitude` columns
4. **Backend Notification Logic:** Priority-based notification sending

### 📋 Next Steps

1. **Check Backend:**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name = 'get_personalized_events';
   ```

2. **Check Database Schema:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'events' AND column_name IN ('latitude', 'longitude');

   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name IN ('latitude', 'longitude');
   ```

3. **Test Event Creation:**
   - Create events with latitude/longitude
   - Verify console logs show RPC success
   - Check event order in Discover tab

4. **Test Notifications:**
   - Create test events
   - Verify notifications arrive in priority order
   - Check notification content and timing

---

## Contact Points for Web Team

Questions to ask:

1. ✅ Is `get_personalized_events` PostgreSQL function implemented?
2. ✅ Do `events` and `profiles` tables have `latitude`/`longitude` columns?
3. ✅ Is event notification sending implemented on backend?
4. ✅ What is the notification priority calculation formula?
5. ✅ How are notification times scheduled (immediate, batched, time-based)?

---

**Testing starts after confirming backend implementation!** 🚀
