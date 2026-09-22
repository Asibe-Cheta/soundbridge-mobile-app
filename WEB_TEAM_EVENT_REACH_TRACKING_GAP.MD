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

## CORRECTION (post-publish, via web team investigation)

The paragraphs below originally named `notification_history` (written by
`send-event-notifications` / `record_notification_sent`) as the real, already-tracked source for
Sent. That pipeline is real, but **it is not the one the app actually triggers for creator-initiated
event promotion**. Confirmed directly in `src/screens/CreateEventScreen.tsx`'s `handleSubmit`: the
only notification-trigger call the app makes after creating an event is
`POST /api/events/{id}/queue-notifications` (fire-and-forget) — which goes through
`EventNotificationService.queueNotificationsForEvent` and writes to a **different** table,
`event_notifications` (has `status` queued/sent/failed and already stores `expo_ticket_id` per
row), never touching `notification_history` at all.

**`event_notifications` is therefore the canonical table for Item 50**, not `notification_history`.
The RPC/read-side design below should target `event_notifications` once web confirms its schema
(city/area association per row, and where `delivered`/`opened` end up landing — web found existing
half-built receipt-polling code, `checkNotificationReceipts` in
`apps/web/src/services/expo-push.ts:260`, using `getPushNotificationReceiptsAsync` against
`expo_ticket_id`, but it currently targets a third, unused table `notification_logs` and is never
called from any route/cron).

## What's already real and doesn't need backend work

- **Booked**: `purchased_event_tickets` (`status = 'confirmed'`) is already directly queryable by
  the event's creator, including a `profiles!purchased_event_tickets_user_id_fkey(city, country)`
  join — proven working today in `src/services/CreatorRevenueService.ts`. No backend work needed.
- **Sent**: NOT yet confirmed real for this specific flow — see correction above.
  `event_notifications` may already have a usable row-per-recipient count once web confirms its
  shape; if so this needs no new backend work either, just a matching read-side RPC.

## The actual gap

Neither `event_notifications` nor `notification_history` currently has delivery/open tracking
wired to a live code path. `notification_history.delivered`/`.opened` exist in schema but are
never set (confirmed via exhaustive grep, still true — that table's dead for THIS flow regardless
of which table turns out canonical). Web is picking up the ask: revive/redirect the existing
`checkNotificationReceipts` Expo-receipt-polling logic into a real cron, targeting whichever table
is canonical, plus extending the existing `/api/events/notification-open` deep-link callback to
also flip an `opened`/`opened_at` column on the specific notification row (needs the push payload
to carry that row's id).

Once delivery + open tracking are real and populated (on the correct table), mobile can build the
rest of Item 50 directly — the geographic visualization, funnel, and UI design have already been
fully researched and are documented in this session's implementation plan, ready to build without
further investigation, just re-pointed at `event_notifications`.
