# Web Team: Event Notification Webhook - IMPLEMENTATION REQUIRED

## Status: CRITICAL - Backend Implementation Missing

---

## The Problem

Users are **not receiving push notifications** when new events are created near them.

**Test case:** A user in Woodley, UK created a "Gospel" event scheduled for January 19, 2026. Another user in the same area (with event notifications enabled) did NOT receive a notification after 10+ minutes.

**Root cause:** The backend webhook to send event notifications has not been deployed.

---

## What's Working (Mobile Side)

| Component | Status |
|-----------|--------|
| Push token registration | ✅ Working |
| Notification preferences storage | ✅ Working |
| Event notification channel (Android) | ✅ Working |
| Deep linking (`soundbridge://event/{id}`) | ✅ Working |
| Event creation (sends city, category, coords) | ✅ Working |
| EventDetailsScreen (receives deep link) | ✅ Working |

---

## What's Missing (Backend Side)

| Component | Status |
|-----------|--------|
| Database trigger on `events` INSERT | ❌ Not deployed |
| Edge function to find nearby users | ❌ Not deployed |
| Push notification sending via Expo | ❌ Not deployed |
| Daily notification quota check | ❌ Not deployed |

---

## Required Implementation

### 1. Database Function: Find Nearby Users

```sql
CREATE OR REPLACE FUNCTION find_users_for_event_notification(
  p_event_id UUID,
  p_max_distance_km NUMERIC DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  expo_push_token TEXT,
  distance_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
BEGIN
  -- Get event details
  SELECT id, city, latitude, longitude, category, organizer_id
  INTO v_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(p.expo_push_token, upt.expo_push_token) AS expo_push_token,
    CASE
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL
           AND v_event.latitude IS NOT NULL AND v_event.longitude IS NOT NULL
      THEN (
        6371 * acos(
          cos(radians(v_event.latitude)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(v_event.longitude)) +
          sin(radians(v_event.latitude)) * sin(radians(p.latitude))
        )
      )
      ELSE NULL
    END AS distance_km
  FROM profiles p
  LEFT JOIN user_push_tokens upt ON upt.user_id = p.id
  WHERE
    -- Not the event organizer
    p.id != v_event.organizer_id
    -- Has a push token
    AND (p.expo_push_token IS NOT NULL OR upt.expo_push_token IS NOT NULL)
    -- Event notifications enabled
    AND COALESCE((p.notification_preferences->>'events_enabled')::boolean, true) = true
    -- Category matches user preferences (or user has no category filter)
    AND (
      p.notification_preferences->'preferred_categories' IS NULL
      OR p.notification_preferences->'preferred_categories' = '[]'::jsonb
      OR p.notification_preferences->'preferred_categories' ? v_event.category
    )
    -- Same city OR within distance
    AND (
      LOWER(p.city) = LOWER(v_event.city)
      OR (
        p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND v_event.latitude IS NOT NULL AND v_event.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(v_event.latitude)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(v_event.longitude)) +
            sin(radians(v_event.latitude)) * sin(radians(p.latitude))
          )
        ) <= p_max_distance_km
      )
    )
    -- Within notification time window
    AND (
      p.notification_preferences->'quiet_hours' IS NULL
      OR (
        EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(p.timezone, 'UTC'))
        BETWEEN COALESCE((p.notification_preferences->>'notification_start_hour')::int, 8)
        AND COALESCE((p.notification_preferences->>'notification_end_hour')::int, 22)
      )
    );
END;
$$;
```

### 2. Database Function: Check Notification Quota

```sql
CREATE OR REPLACE FUNCTION check_event_notification_quota(
  p_user_id UUID,
  p_daily_limit INT DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notification_history
  WHERE
    user_id = p_user_id
    AND notification_type = 'event'
    AND created_at >= (NOW() - INTERVAL '24 hours');

  RETURN v_count < p_daily_limit;
END;
$$;
```

### 3. Edge Function: Send Event Notifications

Create file: `supabase/functions/send-event-notifications/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface EventRecord {
  id: string;
  title: string;
  city: string;
  category: string;
  event_date: string;
  organizer_id: string;
}

interface EligibleUser {
  user_id: string;
  expo_push_token: string;
  distance_km: number | null;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the event from the request body (passed by trigger)
    const { record: event } = await req.json() as { record: EventRecord };

    if (!event?.id) {
      return new Response(JSON.stringify({ error: "No event provided" }), {
        status: 400,
      });
    }

    console.log(`Processing notifications for event: ${event.title} (${event.id})`);

    // Find eligible users
    const { data: eligibleUsers, error: findError } = await supabase
      .rpc("find_users_for_event_notification", {
        p_event_id: event.id,
        p_max_distance_km: 20,
      });

    if (findError) {
      console.error("Error finding users:", findError);
      throw findError;
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log("No eligible users found for this event");
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    console.log(`Found ${eligibleUsers.length} eligible users`);

    // Filter by quota and send notifications
    const notifications: any[] = [];
    const notificationRecords: any[] = [];

    for (const user of eligibleUsers as EligibleUser[]) {
      // Check quota
      const { data: canSend } = await supabase
        .rpc("check_event_notification_quota", { p_user_id: user.user_id });

      if (!canSend) {
        console.log(`User ${user.user_id} has reached daily quota`);
        continue;
      }

      const distanceText = user.distance_km
        ? `${user.distance_km.toFixed(1)}km away`
        : "in your area";

      notifications.push({
        to: user.expo_push_token,
        title: `New Event Near You!`,
        body: `${event.title} - ${distanceText}`,
        data: {
          type: "event",
          eventId: event.id,
          eventTitle: event.title,
          eventCategory: event.category,
          city: event.city,
          distance: user.distance_km,
          deepLink: `soundbridge://event/${event.id}`,
        },
        sound: "default",
        priority: "high",
        channelId: "events",
      });

      notificationRecords.push({
        user_id: user.user_id,
        notification_type: "event",
        title: `New Event Near You!`,
        body: `${event.title} - ${distanceText}`,
        data: { eventId: event.id },
        read: false,
      });
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Send to Expo Push API (batch up to 100)
    const batches = [];
    for (let i = 0; i < notifications.length; i += 100) {
      batches.push(notifications.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const batch of batches) {
      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (pushResponse.ok) {
        totalSent += batch.length;
      } else {
        console.error("Expo push failed:", await pushResponse.text());
      }
    }

    // Record notification history
    if (notificationRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("notification_history")
        .insert(notificationRecords);

      if (insertError) {
        console.error("Error recording notification history:", insertError);
      }
    }

    console.log(`Successfully sent ${totalSent} notifications`);
    return new Response(JSON.stringify({ sent: totalSent }), { status: 200 });
  } catch (error) {
    console.error("Error in send-event-notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
```

### 4. Database Trigger

```sql
-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the Edge Function asynchronously
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-event-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_notifications();
```

---

## Push Notification Payload Format

Mobile app expects this format:

```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "title": "New Event Near You!",
  "body": "Gospel Concert - 2.5km away",
  "data": {
    "type": "event",
    "eventId": "uuid-of-event",
    "eventTitle": "Gospel Concert",
    "eventCategory": "Gospel",
    "city": "Woodley",
    "distance": 2.5,
    "deepLink": "soundbridge://event/uuid-of-event"
  },
  "sound": "default",
  "priority": "high",
  "channelId": "events"
}
```

---

## User Preference Fields

The `profiles.notification_preferences` JSON contains:

```json
{
  "events_enabled": true,
  "preferred_categories": ["Gospel", "Jazz Room", "Music Concert"],
  "notification_start_hour": 8,
  "notification_end_hour": 22,
  "max_daily_notifications": 3
}
```

---

## Required Database Tables

### `notification_history` (if not exists)

```sql
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_history_user_type_date
ON notification_history(user_id, notification_type, created_at);
```

---

## Testing

After deployment, test by:

1. Create a new event in a specific city (e.g., "Woodley")
2. Have another user in the same city/area with:
   - `expo_push_token` set
   - `notification_preferences.events_enabled = true`
   - Event category matching or no category filter
3. Verify they receive the push notification within seconds

---

## Priority

**CRITICAL** - This is a core feature for event discovery. Users expect to be notified about events near them.

---

## Related Mobile Files

| File | Purpose |
|------|---------|
| `src/services/NotificationService.ts` | Handles incoming notifications |
| `App.tsx` (lines 372-460) | Deep link handling |
| `src/screens/EventDetailsScreen.tsx` | Displays event from deep link |
| `src/screens/NotificationPreferencesScreen.tsx` | User preference UI |

---

*Document created: January 18, 2026*
