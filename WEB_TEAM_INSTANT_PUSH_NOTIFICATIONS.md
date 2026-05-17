# Web Team: Push Notifications Must Fire Instantly

**Priority:** High
**Date:** 2026-04-02
**Issue:** Likes, comments, reactions, tips, and messages are not delivering push notifications instantly — delays of up to 5 minutes reported by users.

---

## Root Cause

Push notifications for social events (reactions, comments, tips, follows, messages) are either:
1. Being queued/batched and sent on a cron job rather than inline with the event
2. Not being triggered at all for some event types

The mobile app is not the issue — it receives pushes instantly when they arrive. The delay is entirely on the backend trigger side.

---

## Required Fix

Every event below must trigger a push notification **immediately and inline** — not via a cron, not batched, not deferred.

| Event | Table | Notification target | Message |
|---|---|---|---|
| Post reaction (like etc.) | `post_reactions` | post author | "{name} reacted to your post" |
| Post comment | `post_comments` | post author | "{name} commented on your post" |
| Tip received | `tips` / `wallet_transactions` | recipient | "{name} sent you a tip of £{amount}" |
| New follower | `follows` / `connections` | followed user | "{name} started following you" |
| New message | `messages` | receiver | "{name} sent you a message" |
| Live session started | `live_sessions` | followers | "{name} just went live" |
| Track approved/rejected | moderation event | uploader | "Your track {title} has been approved" |

---

## Implementation Pattern

Each API route or DB trigger that creates one of the above events should call the push notification service immediately after the DB write succeeds:

```typescript
// Example: after inserting a post reaction
await db.insert(postReactions).values({ ... });

// Immediately fire push — do NOT defer to cron
await sendPushNotification({
  userId: post.author_id,
  title: 'New reaction',
  body: `${reactingUser.display_name} reacted to your post`,
  data: { type: 'reaction', postId: post.id },
});
```

The push notification function should use the user's stored Expo push token from the `push_tokens` (or equivalent) table.

---

## Messages — Additional Note

The mobile app unread message badge has been updated to use Supabase realtime (instant). However push notifications for new messages must also fire instantly from the backend when a message is inserted — do not rely on polling.

---

## What NOT to Do

- Do not send notifications via a scheduled cron job
- Do not batch social notifications (each event = one immediate push)
- Do not skip notification if user is "online" — mobile users may be in another app

---

## ✅ Implemented — 2026-04-02

Web team completed the fix. Changes deployed:

- Social push dispatch is now inline/awaited (no fire-and-forget) for reactions, comments, replies, follows
- New internal instant message push webhook: `POST /api/internal/push/message`
- New internal live-session-started push webhook: `POST /api/internal/push/live-session-started`
- DB migration `20260402113000_instant_social_push_triggers.sql` — replaces `messages` trigger from `scheduled_notifications` queue to immediate `net.http_post`
- Live session trigger fires on status transition to `live`

### ⚠️ Action Required Before Validation

The following DB settings must be set in Supabase/Postgres config for the triggers to call webhook URLs. Without them, triggers safely no-op:

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = '<your_service_role_key>';
ALTER DATABASE postgres SET app.settings.instant_message_push_url = 'https://www.soundbridge.live/api/internal/push/message';
ALTER DATABASE postgres SET app.settings.live_session_started_push_url = 'https://www.soundbridge.live/api/internal/push/live-session-started';
```

Set these in production Supabase before testing live push notifications.

### ✅ Deployed to production — commit `fc12c95`

All changes live on `main`. Triggers read from `app_settings` table first, then fall back to `current_setting('app.settings.*')`. Web ops to populate `app_settings` to activate.
