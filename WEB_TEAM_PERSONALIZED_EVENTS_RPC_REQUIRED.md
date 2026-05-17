# Personalized Events RPC Function - REQUIRED

## Status: CRITICAL - Events tab shows nothing because RPC function doesn't exist

---

## Problem

The mobile app calls `get_personalized_events` PostgreSQL RPC function, but it doesn't exist on the backend. This causes the Events tab to show "No events found" even when events exist that should match the user.

**This is blocking core functionality.**

---

## What Mobile Calls

```typescript
const { data, error } = await supabase
  .rpc('get_personalized_events', {
    p_user_id: userId,    // UUID of the logged-in user
    p_limit: limit,       // Number of events to return (default 20)
    p_offset: 0           // For pagination
  });
```

---

## Required: Create the RPC Function

The backend team needs to create this PostgreSQL function in Supabase:

```sql
-- Personalized Events Discovery (MOAT #1 from Business Plan)
-- Returns events matching user's location and category preferences
-- This is a core business differentiator - DO NOT return unfiltered events

CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_date TIMESTAMPTZ,
  location TEXT,
  venue TEXT,
  category TEXT,
  price_gbp DECIMAL,
  price_ngn DECIMAL,
  max_attendees INT,
  current_attendees INT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  creator_id UUID,
  distance_km FLOAT  -- Optional: distance from user
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_lat FLOAT;
  user_lng FLOAT;
  user_country TEXT;
  user_state TEXT;
  user_categories TEXT[];
  user_radius_km INT;
BEGIN
  -- Get user's location and preferences
  SELECT
    p.latitude,
    p.longitude,
    np.location_country,
    np.location_state,
    np.preferred_event_categories,
    COALESCE(np.event_radius_km, 50)  -- Default 50km radius
  INTO
    user_lat,
    user_lng,
    user_country,
    user_state,
    user_categories,
    user_radius_km
  FROM profiles p
  LEFT JOIN notification_preferences np ON np.user_id = p.id
  WHERE p.id = p_user_id;

  -- Return personalized events using 5-layer matching from business plan:
  -- Layer 1: Location-Based Category Matching
  -- Layer 2: Geographic Verification (within radius)
  -- Layer 3: Genre/Category Behavioral Matching
  -- Layer 4: Attendance History (future enhancement)
  -- Layer 5: Temporal Optimization (future enhancement)

  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.location,
    e.venue,
    e.category,
    e.price_gbp,
    e.price_ngn,
    e.max_attendees,
    e.current_attendees,
    e.image_url,
    e.created_at,
    e.creator_id,
    -- Calculate distance if coordinates available
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL
           AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
      THEN (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(e.latitude))
        )
      )
      ELSE NULL
    END as distance_km
  FROM events e
  WHERE
    -- Only future events
    e.event_date >= NOW()
    -- Match user's preferred categories (if they have preferences set)
    AND (
      user_categories IS NULL
      OR array_length(user_categories, 1) IS NULL
      OR e.category = ANY(user_categories)
    )
    -- Location matching: either within radius OR same country/state
    AND (
      -- Option A: Within radius (if coordinates available)
      (
        user_lat IS NOT NULL AND user_lng IS NOT NULL
        AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(user_lat)) * cos(radians(e.latitude)) *
            cos(radians(e.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) * sin(radians(e.latitude))
          )
        ) <= user_radius_km
      )
      -- Option B: Same country (fallback if no coordinates)
      OR (
        (user_lat IS NULL OR user_lng IS NULL OR e.latitude IS NULL OR e.longitude IS NULL)
        AND e.country = user_country
      )
      -- Option C: No location data - show all events (new users)
      OR (user_country IS NULL AND user_lat IS NULL)
    )
  ORDER BY
    -- Prioritize by distance (nearest first) if available
    CASE
      WHEN user_lat IS NOT NULL AND e.latitude IS NOT NULL
      THEN (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(user_lng)) +
          sin(radians(user_lat)) * sin(radians(e.latitude))
        )
      )
      ELSE 9999
    END ASC,
    -- Then by date (soonest first)
    e.event_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_personalized_events TO authenticated;
```

---

## Required Database Schema Updates

### 1. Add coordinates to events table (if not exists)

```sql
ALTER TABLE events
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS country TEXT;
```

### 2. Add coordinates to profiles table (if not exists)

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;
```

### 3. Ensure notification_preferences has required columns

```sql
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS preferred_event_categories TEXT[],
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_state TEXT,
ADD COLUMN IF NOT EXISTS event_radius_km INT DEFAULT 50;
```

---

## Mobile Already Sends Location Data

The mobile app already sends user location to:
- `PUT /api/user/location` - with `latitude`, `longitude`, `locationState`, `locationCountry`

Make sure this endpoint saves coordinates to the `profiles` table.

---

## Testing

After implementing the RPC function:

1. **Test with a user who has location set:**
   ```sql
   SELECT * FROM get_personalized_events('user-uuid-here', 20, 0);
   ```

2. **Verify events appear in mobile app:**
   - Open app > Explore tab > Events
   - Should now show events matching location/preferences

3. **Test edge cases:**
   - User with no location → should show events (new user experience)
   - User with location but no preferences → should show nearby events
   - User with preferences but no matching events → should show empty (correct)

---

## Business Context (Why This Matters)

From the business plan (MOAT #1: Precision Event Discovery):

> "We eliminate advertising costs entirely through Precision Event Discovery, which operates through five technical layers working simultaneously..."

> "Layer One: Location-Based Category Matching. When a creator publishes an event on SoundBridge, the system automatically notifies nearby users who have expressed interest in that event category."

This RPC function is the foundation of our competitive advantage. Without it, the Events tab is broken.

---

## Priority

**CRITICAL** - This blocks core app functionality. Users cannot see any events.

---

*Document created: January 17, 2026*
