# Web Team: Personalized Events Not Showing for Some Users

## Status: BUG - Investigation Required

---

## The Problem

Users are seeing "No events found" even when there ARE events created for their location.

**Test case:**
1. User A (UK, Woodley) creates an event in Bayelsa, Nigeria
2. User B (Nigeria, Bayelsa) goes to Discover > Events
3. User B sees "No events found" even though an event exists in Bayelsa

**Meanwhile:**
- User A (UK) CAN see UK events in their Discover > Events tab
- User B CAN see events if they use "See all" or search

---

## Screenshots

| User A (UK) - Sees Events | User B (Nigeria) - No Events |
|---------------------------|------------------------------|
| Shows 2 events in Woodley | Shows "No events found" |

---

## Root Cause Analysis

The mobile app calls `get_personalized_events` RPC function:

```typescript
const { data, error } = await supabase.rpc('get_personalized_events', {
  p_user_id: userId,
  p_limit: limit,
  p_offset: 0
});
```

This RPC is supposed to return events near the user's location. It's likely failing or returning empty for the Nigerian user because:

### Possible Causes

1. **User's location not stored in database**
   - Check: `SELECT latitude, longitude, city FROM profiles WHERE id = 'USER_B_ID';`
   - If NULL, the RPC can't match by location

2. **Event's city/coordinates not matching**
   - Check: `SELECT city, latitude, longitude FROM events WHERE id = 'BAYELSA_EVENT_ID';`
   - The event might have city="Bayelsa" but user has city="Yenagoa" (city within Bayelsa)

3. **RPC logic bug**
   - The distance calculation might be returning NULL or infinite
   - City matching might be case-sensitive or exact-match only

4. **Location column naming mismatch**
   - Mobile sends: `locationState`, `locationCountry`
   - But RPC might expect: `city`, `state`, `country`

---

## How to Debug

### 1. Check User B's Profile Data

```sql
SELECT
  id,
  username,
  city,
  latitude,
  longitude,
  location_updated_at,
  notification_preferences
FROM profiles
WHERE id = 'USER_B_ID';
```

### 2. Check Event Data

```sql
SELECT
  id,
  title,
  city,
  latitude,
  longitude,
  location,
  event_date
FROM events
WHERE city ILIKE '%bayelsa%' OR location ILIKE '%bayelsa%';
```

### 3. Test the RPC Directly

```sql
SELECT * FROM get_personalized_events('USER_B_ID', 10, 0);
```

### 4. Check RPC Function Logic

```sql
\df+ get_personalized_events
```

---

## Expected RPC Behavior

The `get_personalized_events` function should:

1. Get user's location (latitude, longitude, city) from profiles
2. Find events that match ANY of:
   - Same city (case-insensitive)
   - Within X km radius (e.g., 50km)
   - In same country (fallback if no city match)
3. Filter by user's preferred event categories (if set)
4. Order by distance or event date
5. Return events even if user has no location (show country-based or all events)

---

## Suggested Fix

Update the `get_personalized_events` RPC to be more lenient:

```sql
CREATE OR REPLACE FUNCTION get_personalized_events(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Get user's location
  SELECT city, latitude, longitude,
         COALESCE(notification_preferences->'preferred_categories', '[]'::jsonb) as prefs
  INTO v_user
  FROM profiles
  WHERE id = p_user_id;

  -- If user has coordinates, use distance-based matching
  IF v_user.latitude IS NOT NULL AND v_user.longitude IS NOT NULL THEN
    RETURN QUERY
    SELECT e.*
    FROM events e
    WHERE e.event_date >= NOW()
      AND (
        -- Within 100km radius
        (e.latitude IS NOT NULL AND e.longitude IS NOT NULL AND
         6371 * acos(
           cos(radians(v_user.latitude)) * cos(radians(e.latitude)) *
           cos(radians(e.longitude) - radians(v_user.longitude)) +
           sin(radians(v_user.latitude)) * sin(radians(e.latitude))
         ) <= 100)
        OR
        -- Same city (case-insensitive partial match)
        (v_user.city IS NOT NULL AND e.city ILIKE '%' || v_user.city || '%')
        OR
        -- Event location contains user's city
        (v_user.city IS NOT NULL AND e.location ILIKE '%' || v_user.city || '%')
      )
    ORDER BY e.event_date ASC
    LIMIT p_limit
    OFFSET p_offset;

  -- If user has city but no coordinates
  ELSIF v_user.city IS NOT NULL THEN
    RETURN QUERY
    SELECT e.*
    FROM events e
    WHERE e.event_date >= NOW()
      AND (
        e.city ILIKE '%' || v_user.city || '%'
        OR e.location ILIKE '%' || v_user.city || '%'
      )
    ORDER BY e.event_date ASC
    LIMIT p_limit
    OFFSET p_offset;

  -- Fallback: Return all upcoming events if user has no location
  ELSE
    RETURN QUERY
    SELECT e.*
    FROM events e
    WHERE e.event_date >= NOW()
    ORDER BY e.event_date ASC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;
```

---

## Mobile Code Reference

The mobile app's event loading logic is in:
- [src/screens/DiscoverScreen.tsx](src/screens/DiscoverScreen.tsx) - `loadEvents()` function (line 1145)
- [src/lib/supabase.ts](src/lib/supabase.ts) - `getPersonalizedEvents()` (line 1040)

The mobile code is working correctly - it calls the RPC and displays whatever is returned. If the RPC returns empty, "No events found" is shown.

---

## Verification Steps After Fix

1. Query User B's profile to confirm location data exists
2. Query the event to confirm it has city/coordinates
3. Run the RPC directly to see what it returns
4. Have User B refresh the Discover screen

---

## Priority

**HIGH** - Users can't see events near them, defeating the purpose of personalized discovery.

---

## Related Issues

- Event notifications also depend on user location matching (see `WEB_TEAM_EVENT_NOTIFICATION_WEBHOOK_REQUIRED.md`)
- Location updates are now being sent from mobile (see `MOBILE_TEAM_LOCATION_UPDATE.md`)

---

*Document created: January 18, 2026*
