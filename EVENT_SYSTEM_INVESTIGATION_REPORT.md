# Event System Investigation Report

**Date:** December 30, 2025
**Investigator:** Development Team
**Status:** 🔴 **CRITICAL GAPS IDENTIFIED**

---

## Executive Summary

The event system has **significant gaps** that prevent the desired user experience:

### 🔴 Critical Issues Found

1. **NO Proximity-Based Sorting** - Events are NOT sorted by distance from user
2. **NO Genre Filtering** - Events table lacks genre field; user preferences not applied
3. **NO Location-Based Notifications** - Backend notification logic missing
4. **Conflated Concepts** - Event categories vs. music genres are confused
5. **Incomplete Backend Integration** - Missing RPC function for personalized events

### ✅ What Works

- Event creation with GPS coordinates
- Basic event display (date/alphabetical sorting)
- User genre preference collection
- Notification infrastructure (mobile side)

---

## Detailed Findings

### 1. EVENT LOCATION & PROXIMITY SORTING

#### Current State: 🔴 **NOT WORKING AS INTENDED**

**What's Stored:**
```typescript
Event Data:
- location: "Luton, UK" (text)
- latitude: 51.8787 (number or null)
- longitude: -0.4200 (number or null)
- country: "United Kingdom" (string)

User Profile Data:
- latitude: number | null
- longitude: number | null
- country: string
```

**How Events Are Currently Sorted:**

File: `src/screens/AllEventsScreen.tsx`
```typescript
// Only two sort options available:
1. By Date: new Date(a.event_date) - new Date(b.event_date)
2. Alphabetical: a.title.localeCompare(b.title)

// NO proximity-based sorting
// NO "nearest first" option
```

**Personalized Events Query (Fallback):**

File: `src/lib/supabase.ts:958-1028`
```typescript
async getPersonalizedEvents(userId, limit) {
  // Step 1: Get user's country
  const { data: profile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', userId)
    .single();

  // Step 2: Filter events by COUNTRY ONLY
  query = query.eq('country', profile.country);

  // Step 3: Sort by date
  query = query.order('event_date', { ascending: true });

  // NO distance calculation
  // NO proximity-based sorting
}
```

**The Problem:**
- User in **London** sees Manchester events with same priority as London events
- Only filters by country, not city or proximity
- No distance calculation or "nearest first" sorting
- Backend RPC function `get_personalized_events` is referenced but likely doesn't exist

**What Should Happen:**
```
User opens Events tab
↓
App gets user's current location (GPS or profile)
↓
Backend calculates distance to each event
↓
Events sorted by proximity (closest first)
↓
User sees London events at top, Manchester events below
```

---

### 2. GENRE-BASED FILTERING

#### Current State: 🔴 **COMPLETELY MISSING**

**User Genre Preferences:**

✅ **Collection Works:**
- User selects preferred genres during onboarding
- Stored in `user_preferred_genres` table
- 40+ music genres available (Gospel, Afrobeats, Hip Hop, etc.)

File: `src/services/GenreService.ts`
```typescript
async getUserPreferredGenres(session): Promise<UserPreferredGenre[]>
async setUserPreferredGenres(session, genreIds): Promise<void>
```

❌ **Application to Events DOES NOT Work:**

**Events Table Schema - MISSING GENRE FIELD:**
```typescript
// Current events table (from queries):
{
  id: UUID,
  title: string,
  description: string,
  location: string,
  latitude: number,
  longitude: number,
  country: string,
  event_date: timestamp,
  ticket_price: number,
  tickets_available: number,
  category: string,  // ← This exists but stores "Music Concert", NOT genres
  // NO genre field!
  // NO music_genre field!
}
```

**Event Categories vs. Music Genres:**

The system **conflates two different concepts**:

**Event Categories** (type of event):
- Music Concert
- Birthday Party
- Carnival
- Get Together
- Music Karaoke
- Comedy Night
- Gospel Concert
- Instrumental
- Jazz Room
- Workshop
- Conference
- Festival
- Other

**Music Genres** (type of music):
- Gospel
- Afrobeats
- Hip Hop
- R&B
- Pop
- UK Drill
- Reggae
- Jazz
- etc. (40+ total)

**The Problem:**
1. User selects "Gospel" as preferred genre during onboarding
2. Creator creates event with category "Music Concert" (no genre specified)
3. Event has no genre field to match against user's "Gospel" preference
4. Event appears in user's feed even though it's not Gospel music
5. No filtering happens

**What's Missing:**
```typescript
// Events table needs:
{
  genre_ids: UUID[],  // Array of genre IDs from genres table
  // OR
  genre_id: UUID,  // Single genre reference
  // OR
  music_genre: string,  // Genre name
}

// Then filtering can work:
const userGenres = await getUserPreferredGenres(userId);
const filteredEvents = events.filter(event =>
  userGenres.some(userGenre => event.genre_ids.includes(userGenre.id))
);
```

---

### 3. EVENT NOTIFICATIONS

#### Current State: 🟡 **MOBILE READY, BACKEND MISSING**

**Mobile Infrastructure:** ✅ **COMPLETE**

File: `src/services/NotificationService.ts`

```typescript
// Notification types supported:
- 'event': General event notification
- 'event_reminder': Event reminder notification

// Android channels configured:
{
  name: 'Events',
  importance: AndroidImportance.HIGH,
  sound: true,
  vibrationPattern: [0, 250, 250, 250],
}

// Location tracking for notifications:
async requestLocationPermission()
async getCurrentLocation()  // GPS + reverse geocoding
```

**User Notification Preferences:** ✅ **STORED**

File: `src/screens/NotificationPreferencesScreen.tsx`

```typescript
interface NotificationPreferences {
  enabled: boolean;
  startHour: number;  // e.g., 9 (9 AM)
  endHour: number;    // e.g., 21 (9 PM)
  eventNotificationsEnabled: boolean;
  preferredEventGenres: string[];
  locationState: string;
  locationCountry: string;
}
```

**Backend Notification Logic:** ❌ **MISSING**

The mobile app expects the backend to:

1. **When creator publishes event:**
   ```
   Creator creates event in Manchester
   ↓
   Backend identifies eligible users:
     - Users within X km radius (e.g., 50km)
     - Users whose preferred genres match event genre
     - Users with event notifications enabled
     - Users within notification time window
   ↓
   Backend sends push notifications to eligible users
   ```

2. **Expected conditions (from code comments):**
   ```typescript
   // Backend should send notifications when:
   // - New event is created nearby (within X km/miles)
   // - Event creator has Y+ followers (e.g., 100+)
   // - Event matches user's preferred genres
   // - Event is within 7 days
   ```

**Current Behavior:**
- User creates event → Event saved to database
- **NO notifications sent to nearby users**
- **NO follower count check**
- **NO genre matching**
- **NO proximity filtering**

**What Should Happen:**

```typescript
// Backend webhook/trigger on event creation:

async function onEventCreated(event) {
  // 1. Get event location
  const eventLocation = { lat: event.latitude, lon: event.longitude };

  // 2. Find nearby users (within radius)
  const nearbyUsers = await findUsersWithinRadius(eventLocation, 50); // 50km

  // 3. Filter by genre preferences
  const eligibleUsers = nearbyUsers.filter(user =>
    user.preferredEventGenres.includes(event.genre)
  );

  // 4. Check notification time window
  const usersInTimeWindow = eligibleUsers.filter(user => {
    const currentHour = new Date().getHours();
    return currentHour >= user.startHour && currentHour <= user.endHour;
  });

  // 5. Send notifications
  for (const user of usersInTimeWindow) {
    await sendPushNotification(user.pushToken, {
      title: `New ${event.genre} Event Nearby!`,
      body: `${event.creatorName} created: ${event.title} in ${event.location}`,
      data: { type: 'event', eventId: event.id }
    });
  }
}
```

---

### 4. LOCATION HANDLING - LIVE GPS vs. PROFILE LOCATION

#### Current State: 🟡 **PARTIAL IMPLEMENTATION**

**User Location Sources:**

1. **Live GPS Location:**
   ```typescript
   // File: src/services/NotificationService.ts

   async getCurrentLocation() {
     const location = await Location.getCurrentPositionAsync({
       accuracy: Location.Accuracy.Balanced
     });

     return {
       latitude: location.coords.latitude,
       longitude: location.coords.longitude
     };
   }

   // Rate-limited: 1 minute between attempts
   // Cached: Results stored for 1 minute
   ```

2. **Profile Location (Pre-selected):**
   ```typescript
   // Stored in profiles table:
   {
     latitude: number | null,
     longitude: number | null,
     country: string
   }

   // Set during onboarding or profile update
   ```

**Current Usage:**

✅ **For Event Creation:**
- Uses GPS when user adds event
- Geocodes location text to coordinates
- Stores coordinates with event

❌ **For Event Filtering:**
- Uses profile country only (NOT coordinates)
- Does NOT use live GPS location
- Does NOT calculate proximity distance

**What Should Happen:**

```typescript
// Priority order for user location:
1. Live GPS (if permission granted and recent)
2. Profile coordinates (if GPS unavailable)
3. Geocoded profile city/state (if no coordinates)

// Then use for proximity filtering:
const userLocation = await getUserLocation();
const eventsWithDistance = events.map(event => ({
  ...event,
  distance: calculateDistance(userLocation, event.location)
}));

// Sort by distance
eventsWithDistance.sort((a, b) => a.distance - b.distance);
```

**Location Permission State:**

File: `src/services/NotificationService.ts`
```typescript
// Location permission is requested
// User can grant or deny
// If denied, falls back to profile location
// No error shown to user (graceful degradation)
```

---

### 5. DATABASE SCHEMA ANALYSIS

#### Events Table (Inferred from Queries)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  latitude DECIMAL,  -- May be null
  longitude DECIMAL, -- May be null
  country TEXT,
  venue_name TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT,  -- "Music Concert", "Comedy Night", etc.
  ticket_price DECIMAL,
  tickets_available INTEGER,
  max_attendees INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MISSING:
-- genre_id UUID REFERENCES genres(id)
-- genre_ids UUID[]  -- Array of genre references
-- music_genre TEXT  -- Genre name
```

#### User Preferred Genres Table (EXISTS)

```sql
CREATE TABLE user_preferred_genres (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, genre_id)
);

-- Indexes exist for performance:
CREATE INDEX idx_user_preferred_genres_user_id ON user_preferred_genres(user_id);
CREATE INDEX idx_user_preferred_genres_genre_id ON user_preferred_genres(genre_id);
```

#### Genres Table (EXISTS)

```sql
CREATE TABLE genres (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- "Gospel", "Afrobeats", "Hip Hop", etc.
  category TEXT NOT NULL,     -- "music" or "podcast"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 35 music genres + 17 podcast categories = 52 total
```

**The Gap:**
- User preferences stored: ✅
- Genres table exists: ✅
- Events table has genre field: ❌ **MISSING**
- Event-to-genre relationship: ❌ **DOES NOT EXIST**

---

### 6. BACKEND RPC FUNCTION STATUS

#### Expected Function: `get_personalized_events`

**Mobile Code Reference:**

File: `src/lib/supabase.ts:958-1028`
```typescript
async getPersonalizedEvents(userId, limit) {
  // Tries to call backend RPC function:
  const { data, error } = await supabase.rpc('get_personalized_events', {
    p_user_id: userId,
    p_limit: limit
  });

  if (error) {
    console.warn('RPC function not available, using fallback');
    // Falls back to manual query (country filter only)
  }
}
```

**Expected Function Signature:**
```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  country TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  ticket_price DECIMAL,
  distance_km DECIMAL,  -- Calculated distance from user
  genre_match BOOLEAN   -- Whether event matches user's genres
) AS $$
BEGIN
  -- Calculate distance from user's location to each event
  -- Filter by genre preferences
  -- Sort by proximity and date
  -- Return top N results
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Current Status:** ❓ **UNKNOWN - LIKELY DOES NOT EXIST**

The mobile code has a fallback, which suggests:
- The RPC function was planned but never implemented
- OR it exists but with different parameters
- OR it exists but is broken

**Fallback Behavior:**
```typescript
// When RPC fails, mobile uses this logic:
1. Get user's country from profile
2. Filter events by country match
3. Sort by event_date ascending
4. Return results

// NO proximity sorting in fallback
// NO genre filtering in fallback
```

---

### 7. NOTIFICATION PREFERENCES - CURRENT IMPLEMENTATION

#### What Users Can Configure:

File: `src/screens/NotificationPreferencesScreen.tsx`

```typescript
interface NotificationPreferences {
  // Master toggle
  enabled: boolean;

  // Time window (e.g., only between 9 AM - 9 PM)
  startHour: number;
  endHour: number;

  // Notification type toggles
  eventNotificationsEnabled: boolean;
  messageNotificationsEnabled: boolean;
  tipNotificationsEnabled: boolean;
  collaborationNotificationsEnabled: boolean;
  walletNotificationsEnabled: boolean;

  // Genre preferences for events
  preferredEventGenres: string[];  // Array of genre names

  // Location for proximity filtering
  locationState: string;
  locationCountry: string;
}
```

**How It's Stored:**

```typescript
// Saved to AsyncStorage as JSON
await AsyncStorage.setItem('notificationPreferences', JSON.stringify(prefs));

// Also sent to backend for server-side filtering:
await fetch('https://www.soundbridge.live/api/users/{userId}/notification-preferences', {
  method: 'POST',
  body: JSON.stringify(prefs)
});
```

**Genre Selection UI:**

```typescript
// Available event genres (hardcoded):
const EVENT_GENRES = [
  'Music Concert',
  'Birthday Party',
  'Carnival',
  'Get Together',
  'Music Karaoke',
  'Comedy Night',
  'Gospel Concert',  // ← This is an event category, not a music genre
  'Instrumental',
  'Jazz Room',
  'Workshop',
  'Conference',
  'Festival',
  'Other'
];

// User can select multiple
// Stored in preferredEventGenres array
```

**The Problem:**
- These are **event categories**, not **music genres**
- User might want "Gospel" music events, not just "Gospel Concert" category
- "Gospel Concert" is too specific
- Missing granularity: What about Gospel events under "Music Concert" category?

---

### 8. FILE REFERENCES

**Event Creation & Display:**
- `src/screens/CreateEventScreen.tsx` (557 lines) - Event creation form
- `src/screens/AllEventsScreen.tsx` - Event list with basic sorting
- `src/screens/EventDetailsScreen.tsx` - Individual event view
- `src/screens/DiscoverScreen.tsx` - Personalized event feed

**Services:**
- `src/services/NotificationService.ts` - Notification infrastructure
- `src/services/GenreService.ts` - Genre management
- `src/services/EventTicketService.ts` - Ticket purchases (not relevant)

**Database & API:**
- `src/lib/supabase.ts` (lines 958-1028) - Event queries
- `CREATE_GENRES_TABLE_MIGRATION.sql` - Genre system schema

**Configuration:**
- `src/screens/NotificationPreferencesScreen.tsx` - User notification settings

---

## Summary of Gaps

### 🔴 Critical Issues

| Issue | Current State | Impact |
|-------|---------------|--------|
| **Proximity Sorting** | Only sorts by date/A-Z | London user sees Manchester events first |
| **Genre Filtering** | Events have no genre field | User preferences ignored completely |
| **Event Notifications** | Backend logic missing | No notifications sent for nearby events |
| **RPC Function** | `get_personalized_events` likely doesn't exist | Fallback uses country filter only |
| **Event-Genre Link** | No relationship between events and genres table | Cannot match user preferences to events |

### 🟡 Moderate Issues

| Issue | Current State | Impact |
|-------|---------------|--------|
| **Live GPS Usage** | Only used for event creation | Event filtering uses stale profile location |
| **Genre vs. Category** | Conflated concepts | Confusing user experience |
| **Follower Count Check** | Not implemented | All creators send notifications equally |

### ✅ What's Working

| Feature | Status |
|---------|--------|
| Event creation with GPS | ✅ Working |
| User genre preference collection | ✅ Working |
| Notification infrastructure (mobile) | ✅ Working |
| Basic event display | ✅ Working |
| Genres table & schema | ✅ Working |

---

## Recommended Architecture

### Database Changes Needed

```sql
-- 1. Add genre relationship to events table
ALTER TABLE events
ADD COLUMN genre_ids UUID[] DEFAULT '{}';

-- OR for single genre:
ALTER TABLE events
ADD COLUMN genre_id UUID REFERENCES genres(id);

-- 2. Add index for genre filtering
CREATE INDEX idx_events_genre_ids ON events USING GIN(genre_ids);

-- 3. Add index for location queries
CREATE INDEX idx_events_location ON events(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### Backend RPC Function Needed

```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  country TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  category TEXT,
  genre_ids UUID[],
  ticket_price DECIMAL,
  distance_km DECIMAL,
  genre_match BOOLEAN
) AS $$
DECLARE
  v_user_lat DECIMAL;
  v_user_lon DECIMAL;
  v_user_genres UUID[];
BEGIN
  -- Get user's location
  SELECT latitude, longitude INTO v_user_lat, v_user_lon
  FROM profiles
  WHERE id = p_user_id;

  -- Get user's preferred genres
  SELECT ARRAY_AGG(genre_id) INTO v_user_genres
  FROM user_preferred_genres
  WHERE user_id = p_user_id;

  -- Return events with distance calculation and genre matching
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.location,
    e.latitude,
    e.longitude,
    e.country,
    e.event_date,
    e.category,
    e.genre_ids,
    e.ticket_price,
    -- Calculate distance using Haversine formula
    ROUND(
      6371 * acos(
        cos(radians(v_user_lat)) *
        cos(radians(e.latitude)) *
        cos(radians(e.longitude) - radians(v_user_lon)) +
        sin(radians(v_user_lat)) *
        sin(radians(e.latitude))
      )
    )::DECIMAL AS distance_km,
    -- Check if event genres match user preferences
    (e.genre_ids && v_user_genres) AS genre_match
  FROM events e
  WHERE e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND e.event_date >= NOW()
    AND (v_user_genres IS NULL OR e.genre_ids && v_user_genres)  -- Genre filter
  ORDER BY
    distance_km ASC,      -- Closest first
    e.event_date ASC      -- Then soonest
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Backend Notification Webhook

```typescript
// Supabase Edge Function or webhook
export async function onEventCreated(event) {
  // 1. Find users within radius
  const nearbyUsers = await supabase.rpc('find_users_within_radius', {
    event_lat: event.latitude,
    event_lon: event.longitude,
    radius_km: 50
  });

  // 2. Filter by genre preferences
  const eligibleUsers = nearbyUsers.filter(user =>
    user.preferred_genres.some(genreId => event.genre_ids.includes(genreId))
  );

  // 3. Check notification time window
  const currentHour = new Date().getHours();
  const usersInTimeWindow = eligibleUsers.filter(user =>
    user.event_notifications_enabled &&
    currentHour >= user.start_hour &&
    currentHour <= user.end_hour
  );

  // 4. Send notifications
  for (const user of usersInTimeWindow) {
    await sendPushNotification({
      token: user.push_token,
      title: `New ${event.genre_name} Event Nearby!`,
      body: `${event.creator_name} created: ${event.title}`,
      data: {
        type: 'event',
        eventId: event.id,
        distance: user.distance_km
      }
    });
  }
}
```

---

## Next Steps

1. **Confirm with you:**
   - Do you want genre-to-event as many-to-many (array) or one-to-one?
   - What's the maximum notification radius (50km? 100km?)
   - Should follower count be checked (100+ followers to send notifications)?

2. **Database migration:**
   - Add genre_ids column to events table
   - Add indexes for performance

3. **Backend implementation:**
   - Create `get_personalized_events` RPC function
   - Create event notification webhook/trigger
   - Create `find_users_within_radius` helper function

4. **Mobile app updates:**
   - Update CreateEventScreen to capture genre(s)
   - Update event queries to use RPC function
   - Add "Nearest First" sort option to AllEventsScreen
   - Update NotificationPreferencesScreen to use music genres instead of event categories

5. **Testing:**
   - Test proximity sorting with real coordinates
   - Test genre filtering with user preferences
   - Test notification delivery to nearby users only

---

**Status:** Investigation Complete - Awaiting approval to proceed with implementation
**Priority:** 🔴 **HIGH** - Core user experience feature
**Estimated Implementation Time:**
- Backend: 4-6 hours
- Mobile: 2-3 hours
- Testing: 2 hours
- **Total: 8-11 hours**
