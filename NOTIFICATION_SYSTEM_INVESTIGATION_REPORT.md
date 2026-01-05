# Notification System Investigation Report

**Date:** December 30, 2025
**Focus:** Event notifications with category filtering and city-based proximity
**Status:** 🟡 **MOBILE READY - BACKEND INCOMPLETE**

---

## Executive Summary

The notification infrastructure is **fully built on mobile** but **missing critical backend logic**:

### ✅ What's Working (Mobile Side)

1. **Complete notification infrastructure** using Expo Push Notifications
2. **User preference collection** (time windows, event categories, location)
3. **Push token registration** and management
4. **Deep linking** to specific screens from notifications
5. **Notification inbox** with history and badge management
6. **Location services** (GPS + geocoding with rate limiting)

### 🔴 What's Missing (Backend Side)

1. **Event notification trigger** - No automatic notifications when events are created
2. **City-based proximity filtering** - No logic to find users in the same city
3. **Event category matching** - Events lack category field for filtering
4. **Notification delivery service** - No backend endpoint to send push notifications
5. **Frequency limiting** - No enforcement of notification quotas

---

## 1. CURRENT NOTIFICATION FLOW

### How It Works Now

```
Creator creates event
↓
Event saved to database via API
↓
❌ NOTHING HAPPENS
↓
No notifications sent
No users alerted
Event just appears in "All Events" feed
```

### How It Should Work (Your Requirements)

```
Creator creates event in Manchester
↓
Event saved with category + city location
↓
Backend finds all users in Manchester
↓
Backend filters by user's preferred event categories
↓
Backend checks notification time window (8 AM - 10 PM)
↓
Backend sends push notifications to eligible users
↓
Users in Manchester with matching categories get notified
↓
Users in London do NOT get notified (different city)
```

---

## 2. NOTIFICATION SERVICE ARCHITECTURE

### Expo Push Notifications

**File:** `src/services/NotificationService.ts` (945 lines)

**Key Details:**
- Uses Expo push notification service (NOT Firebase)
- Project ID: `96a15afd-b1fd-4031-a790-2701fa0bffdf`
- Push tokens stored in: `profiles.expo_push_token`
- Supports iOS and Android with platform-specific channels

**Initialization Flow:**
```typescript
1. Check device support (physical device required)
2. Request notification permissions
3. Generate Expo push token
4. Configure Android notification channels
5. Setup notification listeners (received + tapped)
6. Request location permissions
7. Get timezone
8. Load user preferences
9. Register token with backend
```

**Android Notification Channels:**
```typescript
{
  'default': General notifications (HIGH priority)
  'events': Event notifications (HIGH priority)
  'tips': Tips & payments (MAX priority - interrupts calls)
  'messages': Direct messages (HIGH priority)
  'collaboration': Collaboration requests (HIGH priority)
  'moderation': Content moderation (HIGH priority)
}
```

---

## 3. SUPPORTED NOTIFICATION TYPES

### Complete List (13 types)

| Type | Purpose | Channel | Deep Link |
|------|---------|---------|-----------|
| `event` | New nearby event | events | soundbridge://event/{id} |
| `event_reminder` | Event reminder | events | soundbridge://event/{id} |
| `tip` | Payment received | tips | soundbridge://wallet/tips |
| `message` | Direct message | messages | soundbridge://messages/{id} |
| `collaboration_request` | Collab invite | collaboration | soundbridge://collaboration/{id} |
| `collaboration_accepted` | Collab accepted | collaboration | soundbridge://collaboration/{id} |
| `collaboration_declined` | Collab declined | collaboration | soundbridge://collaboration/{id} |
| `collaboration_confirmed` | Collab confirmed | collaboration | soundbridge://collaboration/{id} |
| `withdrawal` | Withdrawal processed | default | soundbridge://wallet/withdrawal/{id} |
| `track_approved` | Track approved | moderation | soundbridge://track/{id} |
| `track_featured` | Track featured | default | soundbridge://track/{id} |
| `creator_post` | Creator post | default | soundbridge://creator/{id} |
| `live_session` | Live session | default | soundbridge://live/{id} |

### Notification Data Structure

```typescript
interface NotificationData {
  type: NotificationType;
  deepLink?: string;

  // Entity references
  entityId?: string;
  entityType?: string;

  // Event-specific
  eventId?: string;
  eventTitle?: string;
  eventLocation?: string;
  eventCategory?: string;

  // Location/distance
  distance?: number;
  city?: string;

  // Creator info
  creatorId?: string;
  creatorName?: string;
  creatorUsername?: string;

  // Additional context
  amount?: number;
  currency?: string;
  title?: string;
  body?: string;

  [key: string]: any;
}
```

---

## 4. USER NOTIFICATION PREFERENCES

### Preference Structure

**File:** `src/screens/NotificationPreferencesScreen.tsx`

```typescript
interface NotificationPreferences {
  // Master toggle
  notificationsEnabled: boolean;  // Default: true

  // Time window (all notifications respect this)
  notificationStartHour: number;  // Default: 8 (8 AM)
  notificationEndHour: number;    // Default: 22 (10 PM)
  timezone: string;               // From device

  // Type-specific toggles
  eventNotificationsEnabled: boolean;          // Default: true
  messageNotificationsEnabled: boolean;        // Default: true
  tipNotificationsEnabled: boolean;            // Default: true
  collaborationNotificationsEnabled: boolean;  // Default: true
  walletNotificationsEnabled: boolean;         // Default: true

  // Event category filtering
  preferredEventGenres: string[];  // Array of category names

  // Location for proximity
  locationState: string;   // e.g., "England"
  locationCountry: string; // e.g., "United Kingdom"
  locationCity: string;    // e.g., "London" (NEW - needs to be added)
}
```

### Available Event Categories (13 total)

These are the categories users can select in preferences:

```typescript
const EVENT_CATEGORIES = [
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
  'Other'
];
```

**Note:** These match the categories used in event creation.

### How Preferences Are Stored

**Local Storage:**
```typescript
// AsyncStorage key: 'notificationPreferences'
await AsyncStorage.setItem('notificationPreferences', JSON.stringify(prefs));
```

**Backend API:**
```typescript
// Synced to backend on change
PUT https://www.soundbridge.live/api/user/notification-preferences
Body: { ...preferences }
```

---

## 5. EVENT CREATION & CATEGORY CAPTURE

### Event Creation Form

**File:** `src/screens/CreateEventScreen.tsx`

**Data Captured:**
```typescript
{
  title: string;              // Required
  description: string;        // Required
  event_date: ISO8601;       // Required (combined date + time)
  location: string;          // Required (text address)
  latitude: number | null;   // Optional (from geocoding)
  longitude: number | null;  // Optional (from geocoding)
  country: string | null;    // From reverse geocoding
  venue_name: string;        // Optional
  category: string;          // Required ← THIS IS THE KEY FIELD
  price_gbp: number;         // Optional
  price_ngn: number;         // Optional
  max_attendees: number;     // Optional
  image_url: string;         // Optional
}
```

**Category Selection:**

User selects from dropdown with same 13 categories:
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

**Location Capture Process:**

1. User enters location text (e.g., "Luton, UK")
2. App geocodes using `expo-location`:
   ```typescript
   const results = await Location.geocodeAsync(locationText);
   const { latitude, longitude } = results[0];
   ```
3. Reverse geocode to get country:
   ```typescript
   const address = await Location.reverseGeocodeAsync({ latitude, longitude });
   const country = address[0].country;
   ```
4. Show confirmation with coordinates
5. User can proceed without coordinates (warning shown)

**API Submission:**
```typescript
POST https://www.soundbridge.live/api/events
Headers: {
  'Authorization': 'Bearer {token}',
  'Content-Type': 'application/json'
}
Body: {event data as shown above}
```

---

## 6. LOCATION SERVICES & CITY DETECTION

### Location Permission Request

```typescript
// Lines 702-715 in NotificationService.ts
async requestLocationPermission(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

  if (foregroundStatus !== 'granted') {
    console.log('⚠️ Location permission denied');
    return false;
  }

  console.log('✅ Location permission granted');
  return true;
}
```

### Getting Current Location

```typescript
// Lines 717-754
async getCurrentLocation(): Promise<{ city: string; state: string; country: string } | null> {
  // 1. Check rate limiting (60 seconds between attempts)
  const lastGeocode = await AsyncStorage.getItem('lastGeocodeAttempt');
  if (lastGeocode) {
    const timeSince = Date.now() - parseInt(lastGeocode);
    if (timeSince < 60000) {
      console.log('⏱️ Rate limiting: wait before geocoding again');
      return null;
    }
  }

  // 2. Get GPS location
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });

  // 3. Reverse geocode to get city/state/country
  const address = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  });

  const { city, region, country } = address[0];

  // 4. Save to cache
  await AsyncStorage.setItem('lastGeocodeAttempt', Date.now().toString());
  await AsyncStorage.setItem('cachedLocation', JSON.stringify({ city, region, country }));

  return { city: city || '', state: region || '', country: country || '' };
}
```

### City vs. State vs. Country

**Granularity Levels:**

1. **City** (most specific)
   - Examples: London, Manchester, Birmingham, Leeds
   - Used for: Tight proximity filtering
   - Best for: Urban areas

2. **State/Region** (medium)
   - Examples: England, Scotland, Wales
   - Used for: Regional filtering
   - Best for: Fallback if city not available

3. **Country** (least specific)
   - Examples: United Kingdom, United States
   - Used for: Broad filtering only
   - Too broad for effective proximity

**Recommendation:** Use **city-based filtering** as primary method.

---

## 7. DATABASE SCHEMA

### events Table (Current)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_time TEXT,
  location TEXT,           -- Text address
  venue_name TEXT,
  latitude DECIMAL,        -- May be null
  longitude DECIMAL,       -- May be null
  country TEXT,            -- From reverse geocoding
  category TEXT,           -- ✅ THIS EXISTS (Music Concert, etc.)
  price_gbp DECIMAL,
  price_ngn DECIMAL,
  max_attendees INTEGER,
  tickets_available INTEGER,
  image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 🔴 MISSING FIELDS:
  city TEXT,               -- ❌ Need to add for city-based filtering
  state TEXT,              -- ❌ Need to add for regional filtering
  region TEXT              -- ❌ Alternative name for state
);
```

### profiles Table (Current)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,

  -- Push notification
  expo_push_token TEXT,    -- ✅ Stores Expo push token

  -- Location
  country TEXT,            -- ✅ Stored during onboarding
  location TEXT,           -- General location text
  latitude DECIMAL,        -- May be null
  longitude DECIMAL,       -- May be null

  -- 🔴 MISSING FIELDS:
  city TEXT,               -- ❌ Need for city-based notifications
  state TEXT,              -- ❌ Need for regional filtering
  region TEXT,             -- ❌ Alternative name for state

  -- Other fields...
  avatar_url TEXT,
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### notification_preferences Table (Expected - May Not Exist)

```sql
-- This table should exist on backend to store user preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,

  -- Master toggle
  enabled BOOLEAN DEFAULT true,

  -- Time window
  start_hour INTEGER DEFAULT 8,   -- 8 AM
  end_hour INTEGER DEFAULT 22,    -- 10 PM
  timezone TEXT DEFAULT 'UTC',

  -- Type toggles
  event_notifications_enabled BOOLEAN DEFAULT true,
  message_notifications_enabled BOOLEAN DEFAULT true,
  tip_notifications_enabled BOOLEAN DEFAULT true,
  collaboration_notifications_enabled BOOLEAN DEFAULT true,
  wallet_notifications_enabled BOOLEAN DEFAULT true,

  -- Event category filtering
  preferred_event_categories TEXT[],  -- Array of category names

  -- Location
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 8. WHAT'S MISSING - BACKEND IMPLEMENTATION

### Missing Component #1: Event Creation Webhook

**When:** Event is created via POST /api/events

**Expected Trigger:**
```typescript
// Supabase Edge Function or Database Trigger

export async function onEventCreated(event: Event) {
  console.log(`📢 New event created: ${event.title} in ${event.city}`);

  // Step 1: Validate event has required fields
  if (!event.city || !event.category) {
    console.warn('⚠️ Event missing city or category, skipping notifications');
    return;
  }

  // Step 2: Find eligible users
  const eligibleUsers = await findEligibleUsers(event);

  // Step 3: Send notifications
  await sendBulkNotifications(eligibleUsers, event);
}
```

### Missing Component #2: Find Eligible Users

**Function:** `findEligibleUsers(event: Event)`

**Logic:**
```typescript
async function findEligibleUsers(event: Event): Promise<User[]> {
  // 1. Find all users in the same city
  const { data: cityUsers } = await supabase
    .from('profiles')
    .select('id, username, display_name, expo_push_token, city')
    .eq('city', event.city)
    .not('expo_push_token', 'is', null);  // Must have push token

  // 2. Get their notification preferences
  const userIds = cityUsers.map(u => u.id);
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds)
    .eq('enabled', true)                          // Master toggle ON
    .eq('event_notifications_enabled', true);     // Event notifications ON

  // 3. Filter by event category preference
  const eligibleUsers = [];
  for (const user of cityUsers) {
    const userPrefs = preferences.find(p => p.user_id === user.id);
    if (!userPrefs) continue;  // No preferences = skip

    // Check if user's preferred categories include this event's category
    const categoriesMatch = userPrefs.preferred_event_categories.includes(event.category);
    if (!categoriesMatch) continue;  // Category mismatch = skip

    // Check time window
    const currentHour = new Date().getHours();
    const inTimeWindow = currentHour >= userPrefs.start_hour && currentHour <= userPrefs.end_hour;
    if (!inTimeWindow) continue;  // Outside time window = skip

    eligibleUsers.push({
      ...user,
      preferences: userPrefs
    });
  }

  console.log(`✅ Found ${eligibleUsers.length} eligible users in ${event.city}`);
  return eligibleUsers;
}
```

### Missing Component #3: Send Bulk Notifications

**Function:** `sendBulkNotifications(users: User[], event: Event)`

**Logic:**
```typescript
async function sendBulkNotifications(users: User[], event: Event) {
  const notifications = users.map(user => ({
    to: user.expo_push_token,
    sound: 'default',
    title: `New ${event.category} in ${event.city}!`,
    body: `${event.title} by ${event.creator_name} on ${formatDate(event.event_date)}`,
    data: {
      type: 'event',
      eventId: event.id,
      eventTitle: event.title,
      eventCategory: event.category,
      eventLocation: event.location,
      city: event.city,
      creatorName: event.creator_name,
      deepLink: `soundbridge://event/${event.id}`
    },
    channelId: 'events'  // Android channel
  }));

  // Send to Expo Push Notification API
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(notifications)
  });

  const receipts = await response.json();
  console.log(`📨 Sent ${notifications.length} notifications`, receipts);

  // Optional: Store notification history in database
  await storeNotificationHistory(users, event, receipts);
}
```

### Missing Component #4: City Extraction from Location

**Problem:** Events currently store location as text (e.g., "Luton, UK") but not city field.

**Solution:** Extract city during event creation:

```typescript
// In backend API: POST /api/events
export async function createEvent(req, res) {
  const eventData = req.body;

  // If location has coordinates, reverse geocode to get city
  if (eventData.latitude && eventData.longitude) {
    const address = await reverseGeocode(eventData.latitude, eventData.longitude);
    eventData.city = address.city;
    eventData.state = address.state;
    eventData.country = address.country;
  } else {
    // Parse city from location text (fallback)
    eventData.city = extractCityFromLocation(eventData.location);
  }

  // Save event with city field
  const { data: event, error } = await supabase
    .from('events')
    .insert(eventData)
    .select()
    .single();

  if (error) throw error;

  // Trigger notification webhook
  await onEventCreated(event);

  return res.json({ success: true, event });
}
```

---

## 9. NOTIFICATION FREQUENCY LIMITING

### Current UI Mention

**From NotificationPreferencesScreen.tsx:**

```typescript
"You'll receive a maximum of 5 notifications per day,
excluding tips and notifications from creators you follow."
```

### What This Means

**Current Status:** ❌ **NOT IMPLEMENTED**

This is a UI promise but there's no backend enforcement.

**Should Implement:**
```typescript
// Backend logic needed:
async function canSendNotification(userId: string, type: string): Promise<boolean> {
  // Exclusions (always send):
  if (type === 'tip') return true;
  if (type === 'creator_post' && userFollowsCreator) return true;

  // Check daily quota
  const { count } = await supabase
    .from('notification_history')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('sent_at', startOfDay())
    .not('type', 'in', '(tip,creator_post)');

  return count < 5;  // Max 5 per day
}
```

**Recommendation for Your Requirements:**

Since you said "allow notifications flow normally" and will add follower requirement later, I recommend:
- **Do NOT implement daily limit** for now
- Let all city-based event notifications through
- Monitor actual usage to determine if limits are needed
- Add limits later if users complain about notification spam

---

## 10. TESTING & VERIFICATION

### How to Test Locally

**1. Test Push Token Registration:**
```bash
# Check if token is saved in database
SELECT username, expo_push_token FROM profiles WHERE id = '{your_user_id}';
```

**2. Test Notification Sending (Manual):**

```typescript
// In NotificationService.ts
async testLocalNotification() {
  await notificationService.sendLocalNotification({
    title: 'Test Event Notification',
    body: 'New Gospel Concert in London!',
    data: {
      type: 'event',
      eventId: 'test-123',
      city: 'London',
      category: 'Gospel Concert'
    }
  });
}
```

**3. Test Time Window Filtering:**

```typescript
// Set preferences with narrow time window
await notificationService.updatePreferences({
  notificationStartHour: 10,
  notificationEndHour: 11
});

// Try sending notification outside window (should not appear)
// Try sending within window (should appear)
```

**4. Test Category Filtering:**

```typescript
// Set preferences to only receive "Gospel Concert"
await notificationService.updatePreferences({
  preferredEventGenres: ['Gospel Concert']
});

// Create event with category "Music Concert"
// Should NOT receive notification

// Create event with category "Gospel Concert"
// Should receive notification
```

### End-to-End Test Flow

```
1. User A (Creator) in London creates "Gospel Concert" event
2. User B in London has "Gospel Concert" in preferences → ✅ Should notify
3. User C in London has "Music Concert" in preferences → ❌ Should NOT notify
4. User D in Manchester has "Gospel Concert" in preferences → ❌ Should NOT notify (different city)
5. User E in London has event notifications disabled → ❌ Should NOT notify
6. User F in London, outside time window (3 AM) → ❌ Should NOT notify
```

---

## 11. IMPLEMENTATION CHECKLIST

### Database Changes

- [ ] Add `city` column to `events` table
- [ ] Add `state` column to `events` table
- [ ] Add `city` column to `profiles` table
- [ ] Add `state` column to `profiles` table
- [ ] Create `notification_preferences` table (if doesn't exist)
- [ ] Create `notification_history` table (for tracking sent notifications)
- [ ] Add indexes on city fields for performance

### Backend API Endpoints

- [ ] Update `POST /api/events` to extract city from coordinates
- [ ] Create webhook/trigger for event creation
- [ ] Implement `findEligibleUsers()` function
- [ ] Implement `sendBulkNotifications()` function
- [ ] Implement reverse geocoding service
- [ ] Add notification history tracking
- [ ] Add daily quota checking (optional - not for initial release)

### Mobile App Updates

- [ ] Update `CreateEventScreen` to show extracted city in confirmation
- [ ] Update `NotificationPreferencesScreen` to save city in preferences
- [ ] Add "City" field to user profile settings
- [ ] Update onboarding to capture city during location selection
- [ ] Test notification reception with different scenarios

### Testing & Validation

- [ ] Unit test: City extraction from coordinates
- [ ] Unit test: Category matching logic
- [ ] Unit test: Time window filtering
- [ ] Integration test: End-to-end notification flow
- [ ] Load test: 1000 users in same city (bulk notification performance)
- [ ] User acceptance test: Real devices receiving notifications

---

## 12. PROPOSED IMPLEMENTATION APPROACH

### Phase 1: Database Schema (15 minutes)

```sql
-- Add city fields to events table
ALTER TABLE events
ADD COLUMN city TEXT,
ADD COLUMN state TEXT;

-- Add city fields to profiles table
ALTER TABLE profiles
ADD COLUMN city TEXT,
ADD COLUMN state TEXT;

-- Create indexes for performance
CREATE INDEX idx_events_city ON events(city) WHERE city IS NOT NULL;
CREATE INDEX idx_profiles_city ON profiles(city) WHERE city IS NOT NULL;

-- Create notification_preferences table (if doesn't exist)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  start_hour INTEGER DEFAULT 8,
  end_hour INTEGER DEFAULT 22,
  timezone TEXT DEFAULT 'UTC',
  event_notifications_enabled BOOLEAN DEFAULT true,
  message_notifications_enabled BOOLEAN DEFAULT true,
  tip_notifications_enabled BOOLEAN DEFAULT true,
  collaboration_notifications_enabled BOOLEAN DEFAULT true,
  wallet_notifications_enabled BOOLEAN DEFAULT true,
  preferred_event_categories TEXT[] DEFAULT '{}',
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification history table (optional)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  event_id UUID REFERENCES events(id),
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  opened BOOLEAN DEFAULT false
);

CREATE INDEX idx_notification_history_user_sent ON notification_history(user_id, sent_at);
```

### Phase 2: Backend Event Creation Enhancement (30 minutes)

```typescript
// File: apps/web/app/api/events/route.ts (or similar)

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eventData = await req.json();

  // Extract city from coordinates (if available)
  if (eventData.latitude && eventData.longitude) {
    const address = await reverseGeocode(
      eventData.latitude,
      eventData.longitude
    );

    eventData.city = address.city;
    eventData.state = address.state;
    eventData.country = address.country;
  } else {
    // Fallback: Parse from location text
    // "Luton, UK" → city = "Luton"
    const parts = eventData.location.split(',');
    eventData.city = parts[0]?.trim();
  }

  // Save event to database
  const { data: event, error } = await supabase
    .from('events')
    .insert(eventData)
    .select('*, creator:profiles(display_name, username)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger notification webhook (async - don't block response)
  sendEventNotifications(event).catch(err => {
    console.error('Failed to send event notifications:', err);
  });

  return NextResponse.json({ success: true, event });
}
```

### Phase 3: Notification Sending Logic (1 hour)

```typescript
// File: apps/web/lib/notifications.ts

interface User {
  id: string;
  expo_push_token: string;
  city: string;
  preferences: {
    preferred_event_categories: string[];
    start_hour: number;
    end_hour: number;
  };
}

export async function sendEventNotifications(event: Event) {
  // 1. Validate event has required fields
  if (!event.city || !event.category) {
    console.warn('Event missing city or category');
    return;
  }

  // 2. Find users in the same city with push tokens
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, display_name, expo_push_token, city')
    .eq('city', event.city)
    .not('expo_push_token', 'is', null);

  if (!users || users.length === 0) {
    console.log('No users with push tokens in', event.city);
    return;
  }

  // 3. Get notification preferences
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .in('user_id', users.map(u => u.id))
    .eq('enabled', true)
    .eq('event_notifications_enabled', true);

  // 4. Filter by category preference and time window
  const currentHour = new Date().getHours();
  const eligibleUsers: User[] = [];

  for (const user of users) {
    const pref = preferences?.find(p => p.user_id === user.id);
    if (!pref) continue;

    // Check category match
    const hasCategory = pref.preferred_event_categories.includes(event.category);
    if (!hasCategory) continue;

    // Check time window
    const inWindow = currentHour >= pref.start_hour && currentHour <= pref.end_hour;
    if (!inWindow) continue;

    eligibleUsers.push({
      id: user.id,
      expo_push_token: user.expo_push_token,
      city: user.city,
      preferences: pref
    });
  }

  console.log(`Found ${eligibleUsers.length} eligible users in ${event.city}`);

  if (eligibleUsers.length === 0) return;

  // 5. Build notification messages
  const messages = eligibleUsers.map(user => ({
    to: user.expo_push_token,
    sound: 'default',
    title: `New ${event.category} in ${event.city}!`,
    body: `${event.title} on ${formatEventDate(event.event_date)}`,
    data: {
      type: 'event',
      eventId: event.id,
      eventTitle: event.title,
      eventCategory: event.category,
      eventLocation: event.location,
      city: event.city,
      creatorName: event.creator.display_name || event.creator.username,
      deepLink: `soundbridge://event/${event.id}`
    },
    channelId: 'events'
  }));

  // 6. Send to Expo Push Notification API
  const chunks = chunkArray(messages, 100); // Max 100 per request

  for (const chunk of chunks) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      },
      body: JSON.stringify(chunk)
    });

    const receipts = await response.json();
    console.log(`Sent ${chunk.length} notifications:`, receipts);

    // Optional: Store notification history
    await storeNotificationHistory(chunk, event.id, receipts);
  }
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

### Phase 4: Mobile App Updates (30 minutes)

**Update NotificationPreferencesScreen to capture city:**

```typescript
// Add city field to preferences
const [city, setCity] = useState(preferences.locationCity || '');

// Save city in preferences
await notificationService.updatePreferences({
  ...preferences,
  locationCity: city,
  locationState: state,
  locationCountry: country
});
```

**Update CreateEventScreen to show city confirmation:**

```typescript
// After geocoding, show city to user
Alert.alert(
  'Event Location Confirmed',
  `City: ${city}\nCountry: ${country}\n\nUsers in ${city} will be notified!`,
  [{ text: 'Continue', onPress: handleSubmit }]
);
```

---

## 13. SUMMARY & NEXT STEPS

### Current State: Event Categories ✅

**Good news:** You used the correct term! The system already uses **event categories**:
- Music Concert
- Gospel Concert
- Comedy Night
- Workshop
- etc.

**User preferences** already collect these categories.
**Event creation** already captures category field.
**The connection** between the two just needs backend logic.

### What's Working

| Component | Status |
|-----------|--------|
| Event category capture | ✅ Working |
| User category preferences | ✅ Working |
| Push token registration | ✅ Working |
| Notification infrastructure | ✅ Working |
| Location services (GPS) | ✅ Working |
| Deep linking | ✅ Working |
| Time window preferences | ✅ Working |

### What Needs Implementation

| Component | Complexity | Time Est. |
|-----------|------------|-----------|
| Add city fields to database | Easy | 15 min |
| Extract city in event creation | Medium | 30 min |
| Find eligible users by city | Medium | 30 min |
| Send bulk notifications | Medium | 30 min |
| Notification history tracking | Easy | 15 min |
| Mobile app city capture | Easy | 30 min |
| Testing | Medium | 1 hour |
| **TOTAL** | | **3-4 hours** |

### Key Decisions Confirmed

Based on your clarifications:

✅ **Event Categories (not music genres)** - System already uses these correctly
✅ **City-based proximity** - Users in same city get notified
✅ **No follower requirement initially** - All creators can send notifications
✅ **No daily limits initially** - Let notifications flow freely

### Recommended Implementation Order

1. **Database schema updates** (15 min)
2. **Backend event creation enhancement** (30 min)
3. **Notification sending logic** (1 hour)
4. **Mobile app city capture** (30 min)
5. **Testing with real data** (1 hour)

**Total:** 3-4 hours for complete implementation

---

## Next Steps - Awaiting Your Approval

Before I start coding, please confirm:

1. ✅ Use **city-based** filtering (not country or state)
2. ✅ Match event **category** to user preferences
3. ✅ Send to all users in same city (no follower count check)
4. ✅ No daily notification limits initially
5. ❓ Should we also notify users in nearby cities (e.g., within 20km)? Or strict city match only?
6. ❓ If event has no coordinates/city, should we skip notifications entirely? Or use broader filtering?

Once confirmed, I'll implement the complete solution!

---

**Files Referenced:**
- `src/services/NotificationService.ts` (945 lines)
- `src/screens/NotificationPreferencesScreen.tsx`
- `src/screens/NotificationInboxScreen.tsx`
- `src/screens/CreateEventScreen.tsx`
- `src/types/database.ts`

**Status:** Investigation Complete - Ready to Implement
**Priority:** 🔴 **HIGH** - Core user engagement feature
**Estimated Development Time:** 3-4 hours
