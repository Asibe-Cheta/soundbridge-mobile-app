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

// Mirrors CreateEventScreen.tsx's CATEGORY_ENUM_TO_LABEL (mobile) exactly — the raw
// value in events.category is a DB enum (Secular, Gospel, Christian, Hip-Hop, ...),
// never meant to be shown to a user as-is. Notification copy was putting that raw
// word directly into push text (e.g. "...hosting a Secular ..."); this maps it back
// to the same friendly label shown in the category picker before it's used in copy.
const CATEGORY_LABELS: Record<string, string> = {
  Secular: 'Music Concert',
  Other: 'Other',
  Carnival: 'Carnival',
  Gospel: 'Gospel Concert',
  Classical: 'Instrumental',
  Jazz: 'Jazz Room',
  Conference: 'Conference',
  Christian: 'Other',
  'Hip-Hop': 'Other',
  Afrobeat: 'Other',
  Rock: 'Other',
  Pop: 'Other',
};

function getCategoryLabel(category: string | null): string {
  if (!category) return 'event';
  const label = CATEGORY_LABELS[category] || category;
  // 'Other' is a real DB enum value but not a word — "a Other"/"an Other"
  // reads as broken English, so it falls back to the same generic 'event'
  // label used for a missing category.
  return label === 'Other' ? 'event' : label;
}

// "a"/"an" by the label's actual leading sound, not the raw category word —
// matters once 'Other'/missing collapse to 'event' (needs "an") while most
// real labels (Carnival, Jazz Room, ...) still need "a". Approximate (English
// has silent-H exceptions this won't catch), same tradeoff as the rest of
// this file's copy generation.
function withArticle(label: string): string {
  return `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`;
}

// Collapses internal double-spaces and trims ends — a profile's display_name
// can carry stray whitespace (e.g. a trailing space from a first/last name
// field that was never fully entered), which otherwise shows up verbatim in
// push copy as "Name  is hosting...".
function cleanName(name: string | null | undefined): string {
  return (name ?? '').replace(/\s+/g, ' ').trim();
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
  const categoryLabel = getCategoryLabel(event.category);

  const eventDate = new Date(event.event_date);
  const daysUntil =
    (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  if (isUrgent) {
    return {
      title: `Don't miss out! ${creatorName}'s ${categoryLabel} is ${naturalDate}`,
      body: `${event.title} in ${city}. Limited spots available!`,
    };
  }

  const templateType = Math.floor(Math.random() * 5);
  switch (templateType) {
    case 0:
      return {
        title: `${creatorName} is hosting ${withArticle(categoryLabel)} ${naturalDate}!`,
        body: `${event.title} in ${city}. ${cta}`,
      };
    case 1:
      return {
        title: `${creatorName} has ${withArticle(categoryLabel)} coming up!`,
        body: `${event.title} in ${city} ${naturalDate}. ${cta}`,
      };
    case 2:
      return {
        title: `Hey! ${creatorName} has something for you`,
        body: `${categoryLabel}: ${event.title} in ${city} ${naturalDate}`,
      };
    case 3:
      return {
        title: `${categoryLabel} happening in ${city} ${naturalDate}!`,
        body: `${creatorName} presents: ${event.title}. ${cta}`,
      };
    case 4:
    default:
      return {
        title: `${event.title} - ${naturalDate}`,
        body: `${creatorName}'s ${categoryLabel} in ${city}. ${cta}`,
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

    // Filter users by time window and daily quota. Dedupe is no longer a
    // prior SELECT here — the claim insert below (upsert + ignoreDuplicates
    // against the (user_id, event_id, type) unique constraint,
    // notification_history_user_event_type_unique) is the dedupe now, and is
    // atomic against a concurrent/overlapping run in a way a prior SELECT
    // never could be.
    const eligibleUsers: EligibleUser[] = [];

    for (const user of nearbyUsers as EligibleUser[]) {
      // Check time window (in the user's own timezone, not always UTC)
      if (!isWithinTimeWindow(user.start_hour, user.end_hour, user.timezone)) {
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

    const creatorName = cleanName(event.creator.display_name) || cleanName(event.creator.username) || 'A creator';
    const deepLink = `soundbridge://event/${event.id}`;
    const { title, body } = buildEventNotification(event, creatorName);

    // Claim-before-send: the INSERT itself is the atomic decision. A second
    // overlapping run racing on the exact same (user, event, type) gets zero
    // rows back from the upsert and skips, instead of both independently
    // deciding "not sent yet" from a prior SELECT. Mirrors
    // record_notification_sent's own column set exactly (notification_type =
    // type, sent_at/created_at = now, read = false), since this replaces
    // that RPC call for this write.
    const claims: { user: EligibleUser; claimId: string; data: Record<string, unknown> }[] = [];
    for (const user of eligibleUsers) {
      const claimedAt = new Date().toISOString();
      const data = {
        type: 'event',
        eventId: event.id,
        eventTitle: event.title,
        eventCategory: event.category,
        eventLocation: event.location,
        city: event.city,
        creatorName,
        distance: user.distance_km,
        deepLink,
        url: deepLink,
      };
      const { data: claimedRows } = await supabase
        .from('notification_history')
        .upsert(
          {
            user_id: user.user_id,
            event_id: event.id,
            type: 'event_announcement',
            notification_type: 'event_announcement',
            title,
            body,
            data,
            sent_at: claimedAt,
            created_at: claimedAt,
            read: false,
          },
          { onConflict: 'user_id,event_id,type', ignoreDuplicates: true }
        )
        .select('id');
      if (claimedRows && claimedRows.length > 0) {
        claims.push({ user, claimId: claimedRows[0].id, data });
      }
      // No row back => already claimed (this event, this user, this type) —
      // by this function's own earlier run. The unique constraint matches
      // on the literal type string, not the 'event' vs 'event_announcement'
      // alias the read-based checks elsewhere in this codebase understand —
      // so this only fully replaces that protection once the one-off
      // backfill migration (20261116030000) has actually been run,
      // collapsing every legacy 'event' row into 'event_announcement'.
      // Until then, an event whose only existing record is still the
      // legacy type could claim and re-send here.
    }

    if (claims.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const messages = claims.map(({ user, data }) => ({
      to: user.expo_push_token,
      sound: 'default',
      title,
      body,
      data,
      url: deepLink,
      channelId: 'events'
    }));

    // Send push notifications via Expo
    const results = await sendPushNotifications(messages);

    for (let i = 0; i < claims.length; i++) {
      const { user, claimId } = claims[i];
      const result = results[i];

      if (result.status === 'ok') {
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
        console.log(`✉️ Sent to ${user.username} (${user.city}, ${user.distance_km}km)`);
      } else {
        // Release this run's own claim by id — a failed push becomes
        // retryable on the next event-created webhook/run, instead of
        // permanently marked done the way an unconditional record used to.
        await supabase.from('notification_history').delete().eq('id', claimId);
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
