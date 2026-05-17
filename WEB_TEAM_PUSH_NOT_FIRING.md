# Push Notifications Not Firing — Investigation Required

**Date:** 2026-03-28
**Priority:** Critical — social push notifications (likes, comments, follows) confirmed not reaching devices

---

## Symptoms

- User receives a like on their post
- No push notification arrives on device
- In-app notifications tab also not showing the event
- Messages push appears to work (different path — fired from mobile client directly)

---

## Mobile Status (confirmed working)

- Expo push tokens are registered on every login via two paths:
  1. `POST /user/push-token` (backend)
  2. `UPDATE profiles SET expo_push_token = ...` (direct Supabase)
- `NotificationService.initialize()` runs on app launch
- Token is stored in `profiles.expo_push_token`
- Handlers for `like`, `reaction`, `comment`, `new_follower` are all wired — they just need the push to arrive

---

## Likely Root Causes to Check (backend)

### 1. `expo_push_token` not being read correctly

When sending, are you reading from `profiles.expo_push_token` for the **post author** (not the liker)?

```sql
-- This is the token you need:
SELECT expo_push_token FROM profiles WHERE id = {post_author_id}
```

Confirm the column is populated — check a real user:
```sql
SELECT id, email, expo_push_token FROM profiles WHERE expo_push_token IS NOT NULL LIMIT 5;
```

If it's null for most users, the token registration endpoint may not be persisting correctly.

### 2. `notification_preferences` check blocking sends

The guard checks `likes_on_posts` before sending. If the migration added the column with `DEFAULT false` instead of `DEFAULT true`, all existing users would have it off. Verify:

```sql
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
AND column_name = 'likes_on_posts';
```

Should be `true`. If it's `false`, run:
```sql
ALTER TABLE notification_preferences ALTER COLUMN likes_on_posts SET DEFAULT true;
UPDATE notification_preferences SET likes_on_posts = true WHERE likes_on_posts IS NULL OR likes_on_posts = false;
```

### 3. Expo push API receiving but not delivering

Add logging to the push send call and check the Expo push receipts API for errors. Common reasons:
- Token format wrong (should be `ExponentPushToken[...]`)
- Token expired/invalid (device uninstalled app)
- Expo servers throttling

Check receipts: `POST https://exp.host/--/api/v2/push/getReceipts` with the `receiptId` from the send response.

### 4. Reaction/like webhook not triggering at all

Add a log at the entry point of the like handler. Does it even execute when a like is posted via `POST /api/posts/{id}/reactions`?

---

## Also: Remove Message Upgrade Prompt

Same as the mobile fix applied today — please also remove any message limit / upgrade prompt on the **web app** side. Messaging should be unlimited for all users on both platforms.

Specifically:
- Remove any message count checks before sending
- Remove any "Upgrade to Pro to send more messages" modal or banner
- Remove the message count badge from the conversations list header

---

## What We Need From You

1. Confirm `profiles.expo_push_token` is populated for active users
2. Confirm `notification_preferences.likes_on_posts` default is `true`
3. Add logging to the like/reaction push handler and share what fires (or doesn't) when a like occurs
4. Check Expo push receipts for any delivery errors
5. Remove message upgrade prompts on web
