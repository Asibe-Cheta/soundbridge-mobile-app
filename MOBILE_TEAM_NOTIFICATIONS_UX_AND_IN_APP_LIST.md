# Mobile Team: Notifications UX & In-App List – Action Items

**Date:** February 2026  
**From:** Web/Backend team  
**Status:** Action required

---

## 1. Notification bell badge (red circle)

**Issue:** The notification bell in the app header does not show a red circle (or any badge) when there are unread notifications.

**Expected:** When the user has one or more unread notifications, the bell icon should display a visible indicator (e.g. red dot or count badge) so users know they have something to read.

**Action:** Add a badge/count on the bell icon that reflects unread count (from the same source as the “Notifications” screen). If the app already has an unread count from an API, use it for the badge; if not, ensure the API that powers the Notifications screen also returns `unreadCount` and the bell subscribes to it.

---

## 2. In-app “Notifications” screen is empty (event and other push notifications not listed)

**Issue:** When the user taps “View all” / opens the Notifications screen, it shows “No notifications” even though they receive push notifications (e.g. event notifications). So push notifications are **not** being shown in the in-app list.

**Likely cause:**  
- **Backend:** Event push notifications are recorded in the **`notification_history`** table (via `record_notification_sent` in the event webhook).  
- **In-app list:** The app (or the API it calls) may be reading from a **different** store (e.g. **`notification_logs`**).  
- Web API `GET /api/user/notifications` reads from **`notification_logs`**. If the mobile app uses that same API or its own query against `notification_logs`, event notifications will never appear because they are only written to `notification_history`.

**Action for mobile (choose one approach):**

- **Option A – Single source for list:**  
  Ensure the Notifications screen (and bell badge) reads from the **same** table that receives all push notification records. If that is `notification_history`, add or use an API that returns notifications from `notification_history` for the current user (with `type`, `title`, `body`, `data`/payload, `sent_at`, and a way to mark read). Then use that for both the list and the unread count.

- **Option B – Backend writes to the app’s table:**  
  If the app must keep reading from `notification_logs` (or another table), backend will need to also write event (and other) push notifications into that table whenever we send a push, so they show up in the list. Coordination with backend is needed so we know the exact table and columns.

**Backend note:** Event notifications are currently written only to `notification_history`. We can add a step to also insert into `notification_logs` (or the table the app uses) so event notifications appear in the in-app list without the app changing its data source. Confirm with backend which table the app uses for the Notifications screen.

---

## 3. All notification types from preferences + deep links

**Requirement:** All notification types that the user can enable in the **Notification preferences** screen should:

1. **Appear** in the in-app Notifications list when they are sent (same as section 2).
2. **Have deep links** so tapping the notification opens the right screen in the app.

Below is the list of types the backend supports (and their preferred deep links). The app should handle these types in the list and when opening from a push (using the `data` payload / `deepLink`).

| Notification type (from preferences) | Backend / push type / payload | Suggested deep link | Notes |
|--------------------------------------|-------------------------------|----------------------|--------|
| **Events**                           | `event`, `event_announcement`, `event_reminder` | `soundbridge://event/{eventId}` | Already sent; ensure they’re written to the table the app uses for the list. |
| **Messages**                         | `message`                     | `soundbridge://messages/{conversationId}` | Already in use. |
| **Tips received**                    | `tip`                         | `soundbridge://wallet/tips` | Toggle: `tip_notifications_enabled`. |
| **Follows**                          | `follow`, `creator_followed`  | `soundbridge://creator/{creatorId}` or profile | Toggle: follows in social/preferences. |
| **Redrops (reposts)**                | `repost`                      | `soundbridge://post/{postId}` or feed | Same as “reposts”; ensure repost notifications use this. |
| **Collaborations**                   | `collaboration_request`, `collaboration_accepted`, `collaboration_declined`, `collaboration_confirmed` | `soundbridge://collaboration/{requestId}` | Toggle: `collaboration_notifications_enabled`. |
| **Wallet / withdrawals**             | (withdrawal updates)           | `soundbridge://wallet/withdrawal/{withdrawalId}` or `soundbridge://wallet` | Toggle: `wallet_notifications_enabled`. |
| **Track / content**                  | `track_approved`, likes, etc.  | `soundbridge://track/{trackId}` | Depends on preference (e.g. creator activity). |
| **Post reactions / comments**        | `post_reaction`, `post_comment`, `comment_reply` | `soundbridge://post/{postId}` or comment thread | From social/preferences. |
| **Connections**                      | `connection_request`, `connection_accepted` | `soundbridge://connect` or profile | If used in preferences. |
| **Moderation**                       | (moderation alerts)           | `soundbridge://moderation` or relevant content | Shown in your “Moderation” tab. |

**Action:**

- For each type the user can enable in **Notification preferences**, ensure:
  1. When we send a push for that type, it is also **recorded** in the same store the Notifications screen uses (so it appears under “All” / “Unread” as needed).
  2. The push payload includes a **deep link** (e.g. in `data.deepLink` or `data.url`); the app should open that URL when the user taps the notification.
- Ensure the Notifications screen and the bell badge both use the same unread/read state and the same list source.

---

## 4. Summary checklist for mobile

- [ ] **Bell badge:** Show red circle (or count) when there are unread notifications.
- [ ] **In-app list:** Notifications screen shows **all** notification types (events, tips, follows, redrops, collaborations, etc.), not only messages. If the list is empty while pushes are received, fix data source (e.g. use table that receives event notifications or ask backend to dual-write).
- [ ] **Deep links:** Every notification type has a defined deep link; tapping the notification opens the correct screen (event, wallet/tips, creator profile, post, collaboration, etc.).
- [ ] **Preferences:** Only show and send notification types that the user has enabled in the Notification preferences screen; respect toggles (events, tips, collaborations, follows, etc.).

---

## 5. Backend / API reference (for implementation)

- **List + unread count (web):** `GET /api/user/notifications` – returns notifications from **`notification_logs`** and `unreadCount`. If the mobile app uses this, event notifications will not appear until we also write them to `notification_logs`.
- **Event push:** Sent by Supabase Edge Function `send-event-notifications`; records to **`notification_history`** only.
- **Deep links** used in backend payloads: see table in section 3; common pattern is `soundbridge://<screen>/<id>`.

If the mobile team confirms which table (and schema) they use for the Notifications screen and bell, backend can add dual-write or an alternate API so event (and other) notifications appear in the list and the badge stays in sync.
## 6. Conference category display (fixed Feb 2026)

**Issue:** Push and in-app notifications showed “Ebuka’s **Other** in Wokingham” instead of “Ebuka’s **Conference**” because Conference was stored as category `Other` in the database.

**Backend fix (done):**
- Added `Conference` to the `event_category` enum; new Conference events are now stored as `Conference`.
- API and Edge Function use `event.category` as-is, so push title/body now show “Conference”.
- Insert scripts and new events use `category: 'Conference'`.

**Mobile action:**
- **Display:** When showing event category (event detail, notifications, list), use the `category` value from the API as-is. For new Conference events you will receive `"Conference"`; no need to map `Other` → “Conference” for event types.
- **Legacy:** Existing events in the DB may still have `category: "Other"`. If you want to show a friendlier label only when you know it was created as Conference, you can keep an optional fallback (e.g. show “Conference” only when the notification payload or event metadata indicates it), but for new events the API will send `"Conference"` and push text will already say “Conference”.
