# Mobile Team — Event Analytics, Bookmarks & Share (Web complete + RPC fix)

**Date:** 2026-05-21  
**From:** Web team  
**Re:** Parity with your shipped mobile work + **required mobile fix**

---

## RPC fix (action required on mobile / DB)

The original `track_event_action` migration referenced **`events.organizer_id`**, but production events use **`events.creator_id`** (web + current schema). That meant the RPC could silently no-op when inserting/updating `event_analytics`.

**Fix applied in production (web team ran):**  
`supabase/migrations/20260521120000_fix_track_event_action_creator_id.sql`

The function now does:

```sql
select creator_id into v_creator_id from events where id = p_event_id;
```

### What mobile needs to do

1. **Do not re-ship RPC using `organizer_id`** — use the fixed function above (or pull latest migration).
2. **On event create**, ensure **`creator_id` is set** on the `events` row (not only `organizer_id`). Web writes `creator_id`; analytics `creator_id` on `event_analytics` comes from this column.
3. **Keep calling the same RPC** — signature unchanged:

```typescript
await supabase.rpc('track_event_action', {
  p_event_id: eventId,
  p_action: 'view' | 'bookmark' | 'unbookmark' | 'share_link' | 'share_card',
});
```

4. **Bookmarks** — use table **`event_bookmarks`** (not legacy polymorphic `bookmarks`):
   - Insert → then RPC `'bookmark'`
   - Delete → then RPC `'unbookmark'`
   - Unique on `(user_id, event_id)`

5. **Notification opens** — on event detail load with deep link / query **`ref=notification`**:
   - Call RPC `'view'` as usual
   - **Also** increment `notifications_opened` server-side (web uses `POST /api/events/notification-open`; mobile can direct service-role update or add `notification_open` RPC if you prefer)

6. **Share URLs** — web serves **`https://soundbridge.live/events/[event-id]`** (matches your deep links).

---

## What web implemented

### Tracking (RPC)
| User action | Web call |
|---|---|
| Open event detail | `track_event_action(event_id, 'view')` — public via API (service role) |
| Bookmark | insert `event_bookmarks` + `'bookmark'` |
| Unbookmark | delete `event_bookmarks` + `'unbookmark'` |
| Share link | `'share_link'` |
| Share card | `'share_card'` |
| Push open (`?ref=notification`) | `'view'` + `notifications_opened` increment |

### API routes (web)
- `POST /api/events/[id]/track`
- `GET|POST|DELETE /api/events/[id]/bookmark`
- `GET /api/events/bookmarks` (saved events)
- `GET /api/events/[id]/analytics` (creator only, RLS)
- `POST /api/events/notification-open`
- `GET /api/admin/events` (admin service role)

### Server-side counters (not client RPC)
- **`notifications_sent`** — incremented in `EventNotificationService` when push sends succeed
- **`ticket_sales_count` / `ticket_sales_revenue`** — incremented in `confirm-ticket-purchase` after Stripe success

### UI
- Bookmark + share on **`/events`** cards and **`/events/[id]`**
- **Saved** tab on **`/events/dashboard`** (+ profile link)
- **Creator analytics** on event detail + created events (dashboard):
  - **Free** — locked card → `/pricing`
  - **Premium** — notifications, opens, views, bookmarks, shares, ticket sales
  - **Unlimited** — above + conversion rates + JSON breakdowns when populated
- **Admin** — **`/admin/events`** read-only table + detail panel

---

## Tier parity checklist (mobile ↔ web)

- [ ] Free: locked analytics + “Access Premium” → pricing
- [ ] Premium: standard metrics only
- [ ] Unlimited: advanced section (city/genre JSON, peak hour, conversion %)
- [ ] Bookmark/share available for **all** tiers
- [ ] `creator_id` populated on all new events

---

## Questions / follow-ups

- If you want a dedicated **`notification_open`** RPC action (instead of server-side counter update), tell us and we can add it in a shared migration.
- **`views_by_city` / `views_by_genre_match` / `peak_view_hour`** — not auto-populated by current RPC; wire on mobile if you collect geo/genre on view.

Web is live on `main` after this commit. Ping us once mobile aligns on `creator_id` + RPC so we can smoke-test end-to-end counters together.
