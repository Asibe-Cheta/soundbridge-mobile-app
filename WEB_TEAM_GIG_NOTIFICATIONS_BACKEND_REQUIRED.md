# WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md

**Date:** 2026-02-27
**Priority:** HIGH — core feature for Urgent Gigs MVP
**For:** Backend team

---

## Overview

The mobile app is fully instrumented to receive and act on gig push notifications. Users can opt in/out via **NotificationPreferencesScreen**. However, **no backend logic has been deployed yet to send these notifications**. This document specifies everything required.

There are two distinct notification flows:

| Flow | Trigger | Recipients |
|------|---------|-----------|
| **Urgent Gig** | Poster creates a new urgent gig (POST `/api/gigs/urgent`) | Nearby providers who match skill + availability |
| **Planned Opportunity** | Poster publishes a new opportunity (POST `/api/opportunities`) | Nearby creators who match the required skill |

---

## Part 1 — Urgent Gig Notifications

### 1.1 When to trigger

After payment is confirmed (Stripe Payment Intent succeeded), run the matching algorithm and send push notifications to matched providers.

### 1.2 Matching Algorithm

```typescript
// After Stripe confirms payment on POST /api/gigs/urgent

async function findAndNotifyProviders(gig: UrgentGig): Promise<void> {
  // Step 1: Find candidate providers within the poster's radius
  const candidates = await supabase.rpc('find_gig_providers', {
    p_gig_id: gig.id,
    p_lat: gig.location_lat,
    p_lng: gig.location_lng,
    p_radius_km: gig.location_radius_km,
    p_skill: gig.skill_required,
    p_date_needed: gig.date_needed,
  });

  // Step 2: Score and rank (distance, skill match, avg rating, response rate)
  const ranked = rankCandidates(candidates, gig);

  // Step 3: Filter by rate limits, DND, and availability
  const eligible = await filterByRateLimits(ranked, gig);

  // Step 4: Take top 10
  const topTen = eligible.slice(0, 10);

  // Step 5: Send push notifications
  await sendUrgentGigNotifications(gig, topTen);
}
```

### 1.3 Database Function: Find Providers

```sql
CREATE OR REPLACE FUNCTION find_gig_providers(
  p_gig_id       UUID,
  p_lat          DOUBLE PRECISION,
  p_lng          DOUBLE PRECISION,
  p_radius_km    DOUBLE PRECISION,
  p_skill        TEXT,
  p_date_needed  TIMESTAMPTZ
)
RETURNS TABLE (
  user_id              UUID,
  expo_push_token      TEXT,
  distance_km          DOUBLE PRECISION,
  avg_rating           NUMERIC,
  max_notifications    INT,
  dnd_start            TEXT,
  dnd_end              TEXT,
  timezone             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id                                               AS user_id,
    COALESCE(p.expo_push_token, upt.expo_push_token)  AS expo_push_token,
    (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(ua.current_lat)) *
        cos(radians(ua.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ua.current_lat))
      )
    )                                                  AS distance_km,
    COALESCE(p.avg_rating, 0)                          AS avg_rating,
    COALESCE(ua.max_notifications_per_day, 5)          AS max_notifications,
    ua.dnd_start,
    ua.dnd_end,
    COALESCE(p.timezone, 'UTC')                        AS timezone
  FROM user_availability ua
  JOIN profiles p ON p.id = ua.user_id
  LEFT JOIN user_push_tokens upt ON upt.user_id = p.id
  WHERE
    -- Provider opted in to urgent gig notifications
    ua.available_for_urgent_gigs = TRUE
    -- Has a push token
    AND (p.expo_push_token IS NOT NULL OR upt.expo_push_token IS NOT NULL)
    -- Not the gig poster
    AND p.id != (SELECT created_by FROM opportunities WHERE id = p_gig_id)
    -- Location known and within radius
    AND ua.current_lat IS NOT NULL
    AND ua.current_lng IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(ua.current_lat)) *
        cos(radians(ua.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ua.current_lat))
      )
    ) <= p_radius_km
    -- Skill matches (check profile skills array)
    AND p.skills @> ARRAY[p_skill]
    -- Urgent gig notifications enabled in notification_preferences
    AND COALESCE(
      (p.notification_preferences->>'urgentGigNotificationsEnabled')::boolean,
      TRUE
    ) = TRUE;
END;
$$;
```

### 1.4 Rate Limiting & DND Filter

Before sending to each candidate, check:

```typescript
async function filterByRateLimits(
  candidates: ProviderCandidate[],
  gig: UrgentGig
): Promise<ProviderCandidate[]> {
  const eligible: ProviderCandidate[] = [];

  for (const candidate of candidates) {
    // 1. Daily quota check
    const { count } = await supabase
      .from('notification_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', candidate.user_id)
      .eq('notification_type', 'urgent_gig')
      .gte('sent_at', startOfDayInTimezone(candidate.timezone));

    if ((count ?? 0) >= candidate.max_notifications) continue;

    // 2. DND check
    if (candidate.dnd_start && candidate.dnd_end) {
      const now = currentTimeInTimezone(candidate.timezone);
      if (isDuringDND(now, candidate.dnd_start, candidate.dnd_end)) continue;
    }

    // 3. Consecutive decline cooloff — if declined 3 in a row within 2h, skip
    const recentDeclines = await supabase
      .from('notification_rate_limits')
      .select('action')
      .eq('user_id', candidate.user_id)
      .eq('notification_type', 'urgent_gig')
      .eq('action', 'declined')
      .gte('sent_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(3);

    if (recentDeclines.data?.length === 3) continue;

    eligible.push(candidate);
  }

  return eligible;
}
```

### 1.5 Push Notification Payload

Mobile expects this exact format:

```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "title": "🎺 Urgent Gig: Trumpeter Tonight 7pm",
  "body": "£120 · Gospel · 2.3km away · Luton",
  "categoryId": "urgent_gig",
  "sound": "default",
  "priority": "high",
  "data": {
    "type": "urgent_gig",
    "gigId": "uuid-of-gig",
    "distance_km": 2.3,
    "payment": 120,
    "payment_currency": "GBP",
    "skill": "Trumpeter",
    "genre": "Gospel",
    "date_needed": "2026-02-27T19:00:00Z",
    "deepLink": "soundbridge://gig/uuid-of-gig"
  }
}
```

The `categoryId: "urgent_gig"` causes iOS/Android to show **ACCEPT / DECLINE / VIEW DETAILS** action buttons in the notification. This is already registered in the mobile app.

### 1.6 After Sending — Record in Rate Limit Table

```sql
INSERT INTO notification_rate_limits (user_id, notification_type, gig_id, sent_at)
VALUES (p_user_id, 'urgent_gig', p_gig_id, NOW());
```

### 1.7 Handle Provider Response (POST /api/gigs/:id/respond)

When a provider responds via the notification action button or the app:

| action | Send notification to | Type |
|--------|---------------------|------|
| `accept` | Gig poster | `gig_accepted` |
| `decline` | Nobody (log decline in rate_limits) | — |

Update `notification_rate_limits` with `action = 'accepted' | 'declined'`.

### 1.8 Gig Confirmed (POST /api/gigs/:id/select)

When poster selects a provider:
- Send `gig_confirmed` to the selected provider
- Send `not_selected` to all other providers who accepted/are pending (optional)

### 1.9 Notification Templates for Other Events

| Event | Type | Title | Body |
|-------|------|-------|------|
| Provider accepted | `gig_accepted` | "⚡ Someone accepted your gig!" | "{name} accepted your {skill} gig." |
| Provider confirmed | `gig_confirmed` | "✅ You got the gig!" | "You've been selected for {title} — {date}" |
| Starting soon (1h) | `gig_starting_soon` | "⏰ Gig starting in 1 hour" | "{title} starts at {time}. {address}" |
| Gig expired | `gig_expired` | "😔 Your gig expired" | "No provider was found. You have not been charged." |
| Rate prompt (24h after) | `gig_rating_received` | "⭐ Rate your gig" | "How did {name} do? Share your feedback." |

---

## Part 2 — Planned Opportunity Notifications

When a user creates a new opportunity (`POST /api/opportunities`), notify nearby creators who match the required skill.

### 2.1 Matching Logic

Same location + skill matching as urgent gigs, but:
- No payment confirmation required — trigger immediately on creation
- Use `profiles.location` / `profiles.latitude` / `profiles.longitude` instead of `user_availability.current_lat/lng` (providers may not have real-time GPS active)
- Daily limit: **3 opportunity notifications per user per day** (separate counter from urgent gigs)

### 2.2 Push Notification Payload

```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "title": "📢 New Opportunity Near You",
  "body": "Looking for a Bassist · Jazz · London",
  "sound": "default",
  "priority": "normal",
  "data": {
    "type": "opportunity",
    "opportunityId": "uuid",
    "skill": "Bassist",
    "city": "London",
    "deepLink": "soundbridge://opportunity/uuid"
  }
}
```

### 2.3 Rate Limiting for Opportunities

```sql
-- Re-use notification_rate_limits table with notification_type = 'opportunity'
INSERT INTO notification_rate_limits (user_id, notification_type, gig_id, sent_at)
VALUES (p_user_id, 'opportunity', p_opportunity_id, NOW());

-- Daily limit check:
SELECT COUNT(*) FROM notification_rate_limits
WHERE user_id = p_user_id
  AND notification_type = 'opportunity'
  AND sent_at >= CURRENT_DATE;
-- Limit: 3 per day
```

### 2.4 Notification Preference Field

Mobile notification preferences already store `urgentGigNotificationsEnabled`. Add a separate preference for planned opportunities. Mobile will expose this in **Phase 2 of NotificationPreferencesScreen**. For now, default to `TRUE` for all users.

---

## Part 3 — Background Jobs Required

### Job 1: Expire Stale Urgent Gigs (every 1 minute)

```sql
-- Find urgent gigs past expires_at with no provider selected
SELECT id, created_by, title
FROM opportunities
WHERE gig_type = 'urgent'
  AND urgent_status = 'searching'
  AND expires_at < NOW();
```

For each:
1. Set `urgent_status = 'expired'`
2. Trigger Stripe refund via Payment Intent cancel
3. Send `gig_expired` push notification to poster

### Job 2: Pre-Gig Reminders (every 5 minutes)

```sql
-- Find confirmed gigs starting 55–65 minutes from now
SELECT o.id, o.title, o.date_needed, o.location_address,
       o.created_by, gr.provider_id
FROM opportunities o
JOIN gig_responses gr ON gr.gig_id = o.id AND gr.status = 'confirmed'
WHERE o.urgent_status = 'confirmed'
  AND o.date_needed BETWEEN NOW() + INTERVAL '55 minutes'
                        AND NOW() + INTERVAL '65 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM notification_rate_limits nrl
    WHERE nrl.gig_id = o.id
      AND nrl.notification_type = 'gig_starting_soon'
  );
```

Send `gig_starting_soon` notification to both poster and provider.

### Job 3: Rating Prompts (every 30 minutes)

```sql
-- Gigs completed 20–30 hours ago without a rating prompt sent
SELECT o.id, o.created_by, gr.provider_id
FROM opportunities o
JOIN gig_responses gr ON gr.gig_id = o.id AND gr.status = 'confirmed'
WHERE o.urgent_status = 'completed'
  AND o.completed_at BETWEEN NOW() - INTERVAL '30 hours'
                         AND NOW() - INTERVAL '20 hours'
  AND NOT EXISTS (
    SELECT 1 FROM notification_rate_limits nrl
    WHERE nrl.gig_id = o.id
      AND nrl.notification_type = 'gig_rating_prompt'
  );
```

---

## Part 4 — Required Tables

### `notification_rate_limits` (if not exists)

```sql
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- 'urgent_gig' | 'opportunity' | 'gig_starting_soon' | 'gig_rating_prompt'
  gig_id            UUID,           -- references opportunities(id)
  action            TEXT,           -- 'accepted' | 'declined' | 'no_response' (filled later)
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_rate_limits_user_type_day
  ON notification_rate_limits (user_id, notification_type, sent_at);
```

---

## Part 5 — Frequency Rules Summary

| Notification type | Daily limit | Cool-off rules |
|-------------------|-------------|---------------|
| `urgent_gig` | User-configurable, default **5/day** (stored in `user_availability.max_notifications_per_day`) | 3 consecutive declines within 2h → skip for 2h |
| `opportunity` | **3/day** (flat limit) | None |
| `gig_starting_soon` | 1 per gig (deduped by `notification_rate_limits`) | — |
| `gig_rating_prompt` | 1 per gig (deduped by `notification_rate_limits`) | — |
| All | DND window respected | `user_availability.dnd_start` / `dnd_end` |
| All | General active hours | 8 AM – 10 PM user's timezone (from `profiles.timezone`) |

---

## Part 6 — Mobile App: What's Ready

The following is already implemented and waiting for backend notifications:

| Component | Status |
|-----------|--------|
| Push token registration | ✅ Done |
| Notification categories (`urgent_gig`, `gig_update`) | ✅ Done |
| ACCEPT / DECLINE / VIEW action buttons | ✅ Done |
| `respondToGigFromNotification()` API call | ✅ Done |
| Preference toggle: "Urgent Gig Alerts" | ✅ Done |
| Preference toggle: "Show action buttons" | ✅ Done |
| Deep link routing (`soundbridge://gig/:id`) | ✅ Done |
| Realtime screen updates (`UrgentGigRealtimeService`) | ✅ Done |

**What mobile still needs to expose (Phase 2 — low priority):**
- Max notifications per day stepper (1–10, default 5)
- Do Not Disturb time range picker

These are stored in `user_availability` but not yet surfaced in the UI. Default values will be used until Phase 2 is released.

---

## Part 7 — Testing Checklist

1. Create urgent gig in area where 2+ providers exist with matching skill and GPS location on file
2. Verify providers receive push notification within 5 seconds of payment confirmation
3. Tap **ACCEPT** in notification → verify gig poster receives `gig_accepted` push immediately
4. Tap **DECLINE** → verify `action = 'declined'` recorded in `notification_rate_limits`
5. Create 5 urgent gigs targeting same provider → verify 6th is skipped for that provider (daily limit)
6. Set provider's DND to current time → verify notification is not sent
7. Create planned opportunity → verify nearby creators with matching skill are notified (max 3/day)
8. Confirm gig → verify both parties receive `gig_starting_soon` 1 hour before
9. Mark gig complete → verify rating prompt sent ~24h later

---

*Document created: 2026-02-27*
*Related: WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md, WEB_TEAM_OPPORTUNITIES_BACKEND_REQUIREMENTS.md*
