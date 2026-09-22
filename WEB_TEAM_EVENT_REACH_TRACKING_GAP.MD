# Event Promotion Reach — data model gap blocking Item 50

## Context

Item 50 (Event Promotion Reach Visualization) asks for a screen showing, per event: a geographic
breakdown of promotion reach (numbered circles per nearby area with real notified counts) and a
Sent / Reached / Opened / Booked engagement funnel.

The mobile side scoped this down for now: **only the event-creation success screen was rebuilt**
(styled screen replacing the old native Alert, CTA currently points at the existing Events
Insights screen). The actual Promotion Reach view (visualization + funnel) is **on hold** until
the gap below is closed — Justice decided not to ship a funnel that's honest-but-partial (two of
four numbers permanently reading "not tracked yet").

## What's already real and doesn't need backend work

- **Sent**: `notification_history` gets a real row per notified user today (`event_id`,
  `user_id`, `sent_at`) via `record_notification_sent`. Per-area breakdown is derivable by joining
  to `profiles.city` — mobile just needs a new read-only RPC (creator-owned, aggregate-only) since
  RLS on that table is currently recipient-only. No new columns needed for this one.
- **Booked**: `purchased_event_tickets` (`status = 'confirmed'`) is already directly queryable by
  the event's creator, including a `profiles!purchased_event_tickets_user_id_fkey(city, country)`
  join — proven working today in `src/services/CreatorRevenueService.ts`. No backend work needed.

## The actual gap

`notification_history.delivered` and `notification_history.opened` (both booleans, already in the
schema per `EVENT_PROXIMITY_NOTIFICATION_MIGRATION.sql`) are **never set to `true` by any code
path** — confirmed via exhaustive grep across the mobile repo. There is no push-delivery-receipt
handling and no notification-open tracking anywhere today. `event_analytics.notifications_sent` /
`.notifications_opened` are likewise dead columns, never written.

To unblock Reached/Opened, the backend needs (roughly):
1. **Delivery receipts** — whatever push provider is used (FCM/APNs via Expo push, or direct) needs
   to report delivery status back per notification, and something needs to write
   `notification_history.delivered = true` (and ideally a `delivered_at` timestamp) when that
   happens.
2. **Open tracking** — when a user taps/opens a promotion notification, something needs to mark
   `notification_history.opened = true` (+ `opened_at`) for that row. This likely means the
   notification payload needs a stable reference back to its `notification_history` row id so the
   client (or a deep-link handler) can report the open.

Once both are real and populated, mobile can build the rest of Item 50 directly — the geographic
visualization, funnel, and UI design have already been fully researched and are documented in this
session's implementation plan, ready to build without further investigation.
