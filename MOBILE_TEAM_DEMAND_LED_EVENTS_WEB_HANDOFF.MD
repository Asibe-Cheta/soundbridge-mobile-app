# Web Team — Demand-Led Event Creation System

**From:** Mobile team / Justice  
**Date:** 2026-05-30  
**Priority:** High — mobile is fully built; needs backend cron + web page

Full product spec: `DEMAND_LED_EVENT_CREATION.MD`

---

## Step 1 — Run the migration SQL

File: `migrations/demand_led_events.sql`

Run the entire file in Supabase SQL editor (production). It creates:

- `poll_campaigns` — one record per poll sent by a creator
- `poll_responses` — one record per listener vote (UNIQUE per user per campaign)
- `live_interest_push_sent` — tracks which (user, track) pairs received the live interest push (prevents duplicates)
- `interest_threshold_notifications` — prevents notifying the same creator more than once per 30 days
- `dispatch_poll_campaign(...)` RPC — creates campaign + bulk DMs atomically (mobile calls this)
- `respond_to_poll(...)` RPC — records a vote and increments response counter
- `get_poll_results(...)` RPC — returns aggregated results for a campaign (creator only)

---

## Step 2 — Daily threshold background job (backend cron)

Mobile cannot run cron jobs. The web backend needs a daily job that:

1. For every creator, count distinct users who said `responded_yes = true` to any of their tracks in `live_interest_responses`
2. Count the creator's `profiles.followers_count`
3. Trigger if EITHER condition is met:
   - `yes_count >= followers_count * 0.15` (15% of followers)
   - OR `yes_count >= 25` (absolute minimum)
4. Check `interest_threshold_notifications` — skip if `notified_at > now() - interval '30 days'`
5. If trigger fires:
   - Insert into `notifications` table for the creator (in-app notification)
   - Send a push notification to `profiles.expo_push_token`
   - Upsert `interest_threshold_notifications` with new `notified_at`

### Notification content

```
title: "Your audience wants you live"
body:  "[yes_count] people have said they want to hear your music live. It is time to ask them when and where."
data:  { "screen": "CreatorInsightsDashboard", "tab": "event-poll" }
```

### Notification insert (Supabase)

```sql
INSERT INTO notifications (user_id, type, title, body, data)
VALUES (
  $creator_id,
  'live_interest_threshold',
  'Your audience wants you live',
  $yes_count || ' people have said they want to hear your music live. It is time to ask them when and where.',
  '{"screen":"CreatorInsightsDashboard","tab":"event-poll"}'
);
```

### Push notification (Expo Push API)

```js
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: creatorPushToken,      // from profiles.expo_push_token
    title: 'Your audience wants you live',
    body: `${yesCount} people have said they want to hear your music live.`,
    data: { screen: 'CreatorInsightsDashboard', tab: 'event-poll' },
  }),
});
```

### Upsert threshold record

```sql
INSERT INTO interest_threshold_notifications (creator_id, yes_count, notified_at)
VALUES ($creator_id, $yes_count, now())
ON CONFLICT (creator_id) DO UPDATE
SET yes_count = EXCLUDED.yes_count,
    notified_at = now();
```

---

## Step 3 — Poll response handling (web side)

When a listener receives the poll DM and taps an option in the web message view, call:

```js
await supabase.rpc('respond_to_poll', {
  p_campaign_id: campaignId,
  p_user_id: session.user.id,
  p_selected_option: 'Manchester — Saturday 14 June',
  p_selected_date: 'Saturday 14 June',
  p_selected_location: 'Manchester',
});
```

The RPC handles deduplication (UNIQUE constraint) and increments the response counter.

---

## Step 4 — Web Pro Resources page + event poll entry point

Add a "Live Demand" or "Event Poll" section to the web creator analytics dashboard using the same data:

```js
// Interested listener count
const { count } = await supabase
  .from('live_interest_responses')
  .select('user_id', { count: 'exact', head: true })
  .eq('responded_yes', true)
  .in('track_id', creatorTrackIds);

// Active campaign
const { data: campaign } = await supabase
  .from('poll_campaigns')
  .select('*')
  .eq('creator_id', session.user.id)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

If `count >= 25` and no active campaign: show "Send Poll to Your Audience" CTA.  
If active campaign exists: show response rate and "View Results" link.

---

## Step 5 — Expire campaigns (cron)

Daily job: update campaigns where `expires_at < now()` and `status = 'active'` to `status = 'expired'`.

```sql
UPDATE poll_campaigns
SET status = 'expired'
WHERE expires_at < now() AND status = 'active';
```

---

## What mobile has already built

| Feature | Status |
|---|---|
| `EventPollSetupScreen` — message editor, date/location pickers, combination generator | ✅ Done |
| `PollResultsScreen` — response rate, winning combo, breakdown, location agg, Create Event CTA | ✅ Done |
| `dispatch_poll_campaign` RPC called on send (creates campaign + bulk DMs in one transaction) | ✅ Done |
| `get_poll_results` RPC called for results display | ✅ Done |
| `⬡ Event Poll` tab in Creator Insights Dashboard | ✅ Done |
| Part 5: live interest push after 2nd listen (inserts into `notifications` table) | ✅ Done |
| Tier gating (Free sees upgrade prompt, Premium/Unlimited have full access) | ✅ Done |
| Migration SQL | ✅ Written — `migrations/demand_led_events.sql` |
| Database types | ✅ Added to `src/types/database.ts` |

**Needs backend:**
- Daily threshold check cron job (Part 1)
- Push notification dispatch for threshold notification
- Poll response handling in web DM/message view
- Campaign expiry cron job
