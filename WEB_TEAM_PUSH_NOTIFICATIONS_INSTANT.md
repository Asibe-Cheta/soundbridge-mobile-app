# Action Required: Instant Push Notifications for All Event Types
**Date:** 2026-03-29  
**Priority:** High — users missing real-time engagement signals

---

## The Problem

Push notifications arrive with ~5 minute delays, and several event types (comments, follows, reactions, likes, audio purchases/sales) never arrive as push notifications at all — they only appear in the in-app notification bell.

Messages and event notifications arrive as push notifications — so the Expo push delivery pipeline works. The issue is **when and whether** the backend triggers a push for each event type.

## Mobile Side: Already Correct

The mobile app:
- Registers an Expo push token on login via `POST /api/user/push-token`
- Has notification channels configured for: `social`, `messages`, `tips`, `events`, `urgent_gigs`, `collaboration`, `moderation`, `opportunities`
- Handles all notification types on receipt including: `comment`, `reaction`, `like`, `new_follower`, `follow`, `content_purchase`, `tip`, `message`, `urgent_gig`, `gig_*`, `opportunity`, `event`, `event_reminder`, `withdrawal`, `payout`, `subscription`

No mobile changes are needed. Everything below is backend.

---

## What Needs to Happen on the Backend

### 1. Switch from polling to event-driven triggers

If you have a cron job polling `notifications` table every N minutes — replace it with **database triggers or real-time hooks** so every INSERT into `notifications` immediately fires a push.

The correct pattern:
```
Event occurs (e.g. new comment inserted)
  → INSERT into notifications table (for in-app bell)  
  → Immediately call Expo Push API for the recipient's token
```

The Expo Push API endpoint: `https://exp.host/--/expo-push-notification/v2/push/send`

### 2. Missing notification triggers — wire these up

The following events currently have NO push notification sent:

| Event | Table/Trigger | Push payload needed |
|-------|--------------|-------------------|
| New comment on post | `comments` INSERT | `type: "comment"`, title: "New comment", body: "{username} commented on your post" |
| New follower | `follows` INSERT | `type: "new_follower"`, body: "{username} started following you" |
| Reaction/like on post | `reactions` or `likes` INSERT | `type: "reaction"`, body: "{username} reacted to your post" |
| Audio track purchased | `content_purchases` INSERT | `type: "content_purchase"`, body: "{username} purchased {track_title}" |
| Tip received | `creator_tips` INSERT | `type: "tip"`, body: "You received a £X tip from {username}" |
| Gig matched/accepted | `urgent_gigs` status change | `type: "urgent_gig"` / `"gig_accepted"` |
| Opportunity interest | `opportunity_interests` INSERT | `type: "opportunity_interest"` |

### 3. Push notification payload format

The mobile app reads the `data` field from the Expo push payload. Use this shape:

```json
{
  "to": "ExponentPushToken[xxxx]",
  "title": "New Comment",
  "body": "Asibe Cheta commented on your post",
  "sound": "default",
  "priority": "high",
  "channelId": "social",
  "data": {
    "type": "comment",
    "entityId": "<comment_id>",
    "entityType": "comment",
    "creatorId": "<commenter_user_id>",
    "username": "asibe_cheta2"
  }
}
```

**`priority: "high"`** is critical — this is what causes immediate delivery. If this is missing or set to `"normal"`, iOS batches notifications and delivers them in bulk on its own schedule (hence the 5-minute delays).

**`channelId`** mapping for Android:
- `social` → comments, follows, reactions, likes
- `messages` → direct messages  
- `tips` → tips, content purchases, payouts
- `events` → event notifications, reminders
- `urgent_gigs` → gig matches, acceptances
- `opportunities` → opportunity interest, agreements
- `default` → everything else

### 4. Token lookup

When sending a push, look up the recipient's token:
```sql
SELECT expo_push_token FROM user_push_tokens 
WHERE user_id = $recipient_id 
AND is_active = true;
```
Or whichever table/column stores the token registered via `POST /api/user/push-token`.

### 5. Batch carefully

The Expo Push API accepts up to 100 notifications per request. For bulk events (e.g. a post with many followers), batch into groups of 100. Check receipts via `POST https://exp.host/--/expo-push-notification/v2/push/getReceipts` and deactivate tokens that return `DeviceNotRegistered`.

---

## Summary

| Fix | Impact |
|-----|--------|
| Add `priority: "high"` to all push payloads | Eliminates 5-min delay |
| Add push trigger for `comments` INSERT | Comments arrive as push |
| Add push trigger for `follows` INSERT | Follows arrive as push |
| Add push trigger for `reactions`/`likes` INSERT | Reactions arrive as push |
| Add push trigger for `content_purchases` INSERT | Sales arrive as push |
| Replace cron polling with event-driven triggers | All notifications instant |

— Mobile team
