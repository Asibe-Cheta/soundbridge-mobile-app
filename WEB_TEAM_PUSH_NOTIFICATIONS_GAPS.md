# Push Notification Gaps — Web Team Action Required

**Date:** 2026-03-28
**Priority:** High — core engagement notifications are not reaching users

---

## Context

Push token registration is fully working on mobile. When a user logs in:
1. `Notifications.getExpoPushTokenAsync()` is called
2. Token is stored at `profiles.expo_push_token`
3. Token is also posted to `POST /user/push-token`

The mobile app also has full deep link routing and in-app handlers for all the types below. **The only missing piece is the backend sending the push when these events occur.**

---

## How to Send a Push (Reference — already used for messages)

```typescript
// Pattern already working for messages — use this same approach
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: expoPushToken,           // from profiles.expo_push_token
    title: 'Notification title',
    body: 'Notification body',
    data: { type: 'comment', postId: '...' },  // for deep linking
    sound: 'default',
    badge: 1,
  }),
});
```

Alternatively, trigger via `POST /notifications/message` pattern already in use.

---

## Missing Notifications — Please Implement

### 1. Comments on Posts (`type: "comment"`)

**Trigger:** When `POST /api/comments` succeeds
**Recipient:** Post author (`posts.user_id`)
**Exclude:** Don't notify if commenter === post author

```json
{
  "title": "@{commenter_username} commented on your post",
  "body": "{comment_text_truncated_to_100_chars}",
  "data": {
    "type": "comment",
    "postId": "{post_id}",
    "commentId": "{comment_id}"
  }
}
```

**Deep link on mobile:** `soundbridge://post/{postId}` ✅ already wired

---

### 2. Reactions / Likes on Posts (`type: "like"` or `type: "reaction"`)

**Trigger:** When a reaction is added to a post
**Recipient:** Post author (`posts.user_id`)
**Exclude:** Don't notify if reactor === post author
**Batch:** If user gets 10+ likes in 1 minute, send one summary instead of 10

```json
{
  "title": "@{reactor_username} reacted to your post",
  "body": "🔥 {reaction_emoji} on your drop",
  "data": {
    "type": "reaction",
    "postId": "{post_id}"
  }
}
```

**Deep link on mobile:** `soundbridge://post/{postId}` ✅ already wired

---

### 3. Follows (`type: "new_follower"`)

**Trigger:** When a user follows another user
**Recipient:** The user being followed

```json
{
  "title": "@{follower_username} started following you",
  "body": "Tap to view their profile",
  "data": {
    "type": "new_follower",
    "followerId": "{follower_user_id}"
  }
}
```

**Deep link on mobile:** `soundbridge://follower/{followerId}` ✅ already wired

---

### 4. Connection Requests (`type: "connection_request"`)

**Trigger:** When a user sends a connection request
**Recipient:** The user receiving the request

```json
{
  "title": "@{sender_username} wants to connect",
  "body": "Tap to accept or decline",
  "data": {
    "type": "connection_request",
    "requesterId": "{requester_user_id}"
  }
}
```

---

### 5. Connection Accepted (`type: "connection_accepted"`)

**Trigger:** When a connection request is accepted
**Recipient:** The original sender of the request

```json
{
  "title": "@{accepter_username} accepted your connection",
  "body": "You're now connected",
  "data": {
    "type": "connection_accepted",
    "userId": "{accepter_user_id}"
  }
}
```

---

### 6. Audio / Content Sales (`type: "content_purchase"`)

**Trigger:** When a user purchases paid content (track, album, etc.)
**Recipient:** The content creator

```json
{
  "title": "Someone purchased your content",
  "body": "{buyer_username} bought \"{content_title}\" for {amount}",
  "data": {
    "type": "content_purchase",
    "contentId": "{content_id}",
    "amount": "{amount}"
  }
}
```

**Deep link on mobile:** `soundbridge://wallet` ✅ already wired

---

### 7. Tips (`type: "tip"`) — Verify This Is Working

Mobile has this type defined and the handler routes to `soundbridge://wallet/tips`. Please confirm:
- Is a push being sent when `POST /api/payments/create-tip` succeeds?
- Is the recipient the creator being tipped?

If not yet implemented, use:
```json
{
  "title": "@{tipper_username} tipped you {amount}",
  "body": "Check your wallet",
  "data": {
    "type": "tip",
    "amount": "{amount}",
    "tipperId": "{tipper_user_id}"
  }
}
```

---

## Notification Preference Checks

Before sending any push, check the user's preferences in `notification_preferences` table:

| Column | Controls |
|---|---|
| `comments_on_posts` | Comment notifications |
| `likes_on_posts` | Reaction/like notifications |
| `new_followers` | Follow notifications |
| `content_sales` | Audio sale notifications |

These preferences are already managed by the mobile app's Notification Preferences screen. Please respect them server-side before dispatching.

---

## Already Working (No Action Needed)

| Type | Status |
|---|---|
| Events | ✅ Supabase Edge Function `send-event-notifications` |
| Messages | ✅ `POST /notifications/message` |
| Urgent Gigs | ✅ Backend real-time matching |
| Gig accepted/confirmed/payment/rating | ✅ |
| Moderation | ✅ |
