# Edge Function: send-event-notifications — code for mobile team

**Location in web repo:** `supabase/functions/send-event-notifications/`

Create the same structure in your Supabase project and paste the code below. Then deploy with:

```bash
supabase functions deploy send-event-notifications
```

---

## File layout

```
supabase/functions/send-event-notifications/
├── index.ts           # main handler
└── _lib/
    ├── expo.ts        # Expo push API
    └── time-window.ts # quiet-hours check
```

---

## 1. `supabase/functions/send-event-notifications/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotifications } from './_lib/expo.ts'
import { isWithinTimeWindow } from './_lib/time-window.ts'

// Define types
interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  image_url: string | null;
  creator: {
    username: string;
    display_name: string | null;
  };
}

interface EligibleUser {
  user_id: string;
  expo_push_token: string;
  username: string;
  display_name: string | null;
  city: string;
  distance_km: number | null;
  preferred_categories: string[];
  start_hour: number;
  end_hour: number;
}

// Constants
const MAX_DISTANCE_KM = 20;
const DAILY_NOTIFICATION_LIMIT = 3;

function formatNaturalDate(eventDate: string): string {
  const event = new Date(eventDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(event.getFullYear(), event.getMonth(), event.getDate());
  const diffDays = Math.round(
    (startOfEventDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;

  return event.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getEventCity(event: Event): string {
  if (event?.city) return event.city;
  if (event?.location) {
    const parts = event.location.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts[1];
    if (parts.length > 0) return parts[0];
  }
  return 'your area';
}

function getCTA(event: Event): string {
  const isPaid = (event as any)?.price_gbp > 0 || (event as any)?.price_ngn > 0;
  const maxAttendees = (event as any)?.max_attendees ?? 0;
  const currentAttendees = (event as any)?.current_attendees ?? 0;
  const hasLimitedSpots = maxAttendees > 0 && currentAttendees >= maxAttendees * 0.8;

  if (hasLimitedSpots && isPaid) return 'Limited spots - get your ticket!';
  if (hasLimitedSpots && !isPaid) return 'Limited spots - check in now!';
  if (isPaid) {
    const paidCTAs = ['Get your ticket!', 'Reserve your spot!', 'Grab your ticket now!'];
    return paidCTAs[Math.floor(Math.random() * paidCTAs.length)];
  }
  const freeCTAs = ['RSVP now!', 'Join the event!', 'Save your spot!'];
  return freeCTAs[Math.floor(Math.random() * freeCTAs.length)];
}

function buildEventNotification(event: Event, creatorName: string) {
  const city = getEventCity(event);
  const naturalDate = formatNaturalDate(event.event_date);
  const cta = getCTA(event);

  const eventDate = new Date(event.event_date);
  const daysUntil =
    (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  if (isUrgent) {
    return {
      title: `Don't miss out! ${creatorName}'s ${event.category} is ${naturalDate}`,
      body: `${event.title} in ${city}. Limited spots available!`,
    };
  }

  const templateType = Math.floor(Math.random() * 5);
  switch (templateType) {
    case 0:
      return {
        title: `${creatorName} is hosting a ${event.category} ${naturalDate}!`,
        body: `${event.title} in ${city}. ${cta}`,
      };
    case 1:
      return {
        title: `${creatorName} has a ${event.category} coming up!`,
        body: `${event.title} in ${city} ${naturalDate}. ${cta}`,
      };
    case 2:
      return {
        title: `Hey! ${creatorName} has something for you`,
        body: `${event.category}: ${event.title} in ${city} ${naturalDate}`,
      };
    case 3:
      return {
        title: `${event.category} happening in ${city} ${naturalDate}!`,
        body: `${creatorName} presents: ${event.title}. ${cta}`,
      };
    case 4:
    default:
      return {
        title: `${event.title} - ${naturalDate}`,
        body: `${creatorName}'s ${event.category} in ${city}. ${cta}`,
      };
  }
}

serve(async (req) => {
  try {
    // Parse request body
    const { record } = await req.json();
    console.log('🔔 Event created webhook triggered:', record.id);

    // Validate event has required fields
    if (!record.city && !record.latitude) {
      console.warn('⚠️ Event missing city and coordinates, skipping notifications');
      return new Response(
        JSON.stringify({ success: false, reason: 'No location data' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!record.category) {
      console.warn('⚠️ Event missing category, skipping notifications');
      return new Response(
        JSON.stringify({ success: false, reason: 'No category' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get event with creator details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, creator:profiles!creator_id(username, display_name)')
      .eq('id', record.id)
      .single();

    if (eventError || !event) {
      console.error('❌ Error fetching event:', eventError);
      return new Response(
        JSON.stringify({ success: false, error: eventError?.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Find nearby users using database function
    const { data: nearbyUsers, error: usersError } = await supabase
      .rpc('find_nearby_users_for_event', {
        p_event_id: event.id,
        p_max_distance_km: MAX_DISTANCE_KM
      });

    if (usersError) {
      console.error('❌ Error finding nearby users:', usersError);
      return new Response(
        JSON.stringify({ success: false, error: usersError.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!nearbyUsers || nearbyUsers.length === 0) {
      console.log('ℹ️ No nearby users found for event:', event.id);
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📍 Found ${nearbyUsers.length} nearby users in ${event.city}`);

    // Filter users by time window and daily quota
    const eligibleUsers: EligibleUser[] = [];

    for (const user of nearbyUsers as EligibleUser[]) {
      // Check time window
      if (!isWithinTimeWindow(user.start_hour, user.end_hour)) {
        console.log(`⏰ User ${user.username} outside time window, skipping`);
        continue;
      }

      // Check daily quota
      const { data: canSend } = await supabase
        .rpc('check_notification_quota', {
          p_user_id: user.user_id,
          p_daily_limit: DAILY_NOTIFICATION_LIMIT
        });

      if (!canSend) {
        console.log(`🚫 User ${user.username} reached daily limit, skipping`);
        continue;
      }

      eligibleUsers.push(user);
    }

    console.log(`✅ ${eligibleUsers.length} users eligible for notifications`);

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Build notification messages
    const creatorName = event.creator.display_name || event.creator.username;
    const deepLink = `soundbridge://event/${event.id}`;
    const { title, body } = buildEventNotification(event, creatorName);

    const messages = eligibleUsers.map(user => ({
      to: user.expo_push_token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'event',
        eventId: event.id,
        eventTitle: event.title,
        eventCategory: event.category,
        eventLocation: event.location,
        city: event.city,
        creatorName: creatorName,
        distance: user.distance_km,
        deepLink,
        url: deepLink
      },
      url: deepLink,
      channelId: 'events'
    }));

    // Send push notifications via Expo
    const results = await sendPushNotifications(messages);

    // Record notification history
    for (let i = 0; i < eligibleUsers.length; i++) {
      const user = eligibleUsers[i];
      const result = results[i];

      await supabase.rpc('record_notification_sent', {
        p_user_id: user.user_id,
        p_event_id: event.id,
        p_type: 'event',
        p_title: messages[i].title,
        p_body: messages[i].body,
        p_data: JSON.stringify(messages[i].data)
      });

      // Dual-write to notifications table so in-app list and bell badge show event notifications (mobile)
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: user.user_id,
        type: 'event',
        title: messages[i].title,
        body: messages[i].body,
        data: messages[i].data,
        read: false
      });
      if (notifErr) {
        console.warn(`⚠️ Could not write to notifications table for ${user.username}:`, notifErr.message);
      }

      // Log individual result
      if (result.status === 'ok') {
        console.log(`✉️ Sent to ${user.username} (${user.city}, ${user.distance_km}km)`);
      } else {
        console.error(`❌ Failed to send to ${user.username}:`, result.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: eligibleUsers.length,
        event: {
          id: event.id,
          title: event.title,
          city: event.city,
          category: event.category
        }
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## 2. `supabase/functions/send-event-notifications/_lib/expo.ts`

```typescript
/**
 * Expo Push Notification Helper
 * Sends push notifications using Expo's API
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo recommends max 100 messages per request

interface PushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: any;
  channelId?: string;
  url?: string;
}

interface PushReceipt {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

/**
 * Send push notifications via Expo API
 * @param messages Array of push messages to send
 * @returns Array of receipts
 */
export async function sendPushNotifications(
  messages: PushMessage[]
): Promise<PushReceipt[]> {
  if (messages.length === 0) {
    return [];
  }

  // Split into chunks of 100
  const chunks = chunkArray(messages, CHUNK_SIZE);
  const allReceipts: PushReceipt[] = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Expo API error:', response.status, errorText);

        // Return error receipts for this chunk
        allReceipts.push(...chunk.map(() => ({
          status: 'error' as const,
          message: `Expo API error: ${response.status}`
        })));
        continue;
      }

      const { data } = await response.json();
      allReceipts.push(...data);

    } catch (error) {
      console.error('Error sending push notifications:', error);

      // Return error receipts for this chunk
      allReceipts.push(...chunk.map(() => ({
        status: 'error' as const,
        message: error.message
      })));
    }
  }

  return allReceipts;
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

---

## 3. `supabase/functions/send-event-notifications/_lib/time-window.ts`

```typescript
/**
 * Time Window Validation Helper
 * Checks if current time is within user's notification time window
 */

/**
 * Check if current time is within notification time window
 * @param startHour User's notification start hour (0-23)
 * @param endHour User's notification end hour (0-23)
 * @param timezone User's timezone (optional, defaults to UTC)
 * @returns true if within window, false otherwise
 */
export function isWithinTimeWindow(
  startHour: number,
  endHour: number,
  timezone: string = 'UTC'
): boolean {
  try {
    // Get current hour in user's timezone
    const now = new Date();
    const currentHour = parseInt(
      now.toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone
      })
    );

    // Handle same-day time window (e.g., 8 AM - 10 PM)
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour <= endHour;
    }

    // Handle overnight time window (e.g., 10 PM - 6 AM)
    return currentHour >= startHour || currentHour <= endHour;

  } catch (error) {
    console.error('Error checking time window:', error);
    // Default to allowing notification if timezone check fails
    return true;
  }
}

/**
 * Get user-friendly time window description
 */
export function formatTimeWindow(startHour: number, endHour: number): string {
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}
```

---

## Prerequisites (database)

These must exist in the same Supabase project (migrations run by web team):

- `find_nearby_users_for_event` RPC
- `check_notification_quota` RPC
- `record_notification_sent` RPC
- `notifications` table with columns: `user_id`, `type`, `title`, `body`, `data`, `read`
- Trigger on `events` that invokes this Edge Function on INSERT

If you use the **same** Supabase project as the web app, the migrations are already there. If the mobile app uses a **different** Supabase project, the web team needs to run the same migrations there or share the DB.

## Deploy

From project root (with Supabase CLI linked to the same project):

```bash
supabase functions deploy send-event-notifications
```

No extra secrets are required for basic push (Expo’s push API is public). If you add Expo access tokens later, set them with `supabase secrets set EXPO_ACCESS_TOKEN=...`.
