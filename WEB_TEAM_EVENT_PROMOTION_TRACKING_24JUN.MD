# Web Team — Event Promotion Tracking Admin Dashboard
Date: 24 Jun 2026

## What mobile has built

Every user interaction with a promoted event is now recorded in `event_promotion_interactions`. Mobile tracks three moments:

| Moment | `source` value | Where triggered |
|---|---|---|
| User taps an event notification | `notification` | App.tsx notification handler |
| User taps an EventPostCard on the feed (For You / Following tabs) | `feed_card` | EventPostCard component |
| User taps an event card on the Events tab | `feed_card` | TestFeedScreen Events tab |
| Ticket purchase completes | sets `purchased_ticket = true` on most recent row | EventDetailsScreen after Stripe/Fincra confirms |
| No prior interaction exists at purchase | new row with `source = 'direct_search'` | EventDetailsScreen |

---

## `event_promotion_interactions` table schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | FK → `events.id` ON DELETE CASCADE |
| `user_id` | uuid | FK → `profiles.id` ON DELETE SET NULL |
| `source` | text | `notification` \| `feed_card` \| `direct_search` \| `shared_link` \| `other` |
| `viewed_at` | timestamptz | defaults to `now()` |
| `purchased_ticket` | boolean | default `false` |
| `purchased_at` | timestamptz | nullable |

### RLS
- `INSERT` / `UPDATE`: authenticated user (own rows only)
- `SELECT`: admin users only (`profiles.is_admin = true`)

---

## Admin dashboard — Events Promotion tab

Please add a dedicated **Events Promotion** tab to the admin dashboard (separate from the existing general Events listing).

---

### Summary cards (top of tab)

Show these five stats for the current calendar month (with option to change date range):

1. **Total event notifications sent this month**
   - Source: existing notification send logs (your table, not `event_promotion_interactions`)
   - If not tracked yet, note as "N/A — requires notification send logging"

2. **Total notification taps this month**
   ```sql
   select count(*) from event_promotion_interactions
   where source = 'notification'
     and viewed_at >= date_trunc('month', now());
   ```

3. **Total feed card views this month**
   ```sql
   select count(*) from event_promotion_interactions
   where source = 'feed_card'
     and viewed_at >= date_trunc('month', now());
   ```

4. **Tickets purchased via SoundBridge promotion this month**
   (source = `notification` or `feed_card`, purchased_ticket = true)
   ```sql
   select count(*) from event_promotion_interactions
   where source in ('notification', 'feed_card')
     and purchased_ticket = true
     and purchased_at >= date_trunc('month', now());
   ```

5. **Conversion rate** — promotion views → ticket purchases
   ```
   (tickets purchased via promotion / total promotion views) × 100
   ```
   Display as percentage, e.g. `4.2%`.

---

### Per-event breakdown table

Sortable by any column. Filterable by date range.

| Column | Query source |
|---|---|
| Event name | `events.title` |
| Creator name | `events.creator_id → profiles.full_name` |
| Notification taps | `COUNT(*) where source='notification'` |
| Feed card views | `COUNT(*) where source='feed_card'` |
| Tickets via promotion | `COUNT(*) where source in ('notification','feed_card') and purchased_ticket=true` |
| Tickets via other sources | `COUNT(*) where source not in ('notification','feed_card') and purchased_ticket=true` |
| Conversion rate | `(tickets via promotion / (notification taps + feed card views)) × 100` |

Query template:
```sql
select
  e.id,
  e.title,
  p.full_name as creator_name,
  count(*) filter (where epi.source = 'notification')                                   as notification_taps,
  count(*) filter (where epi.source = 'feed_card')                                      as feed_card_views,
  count(*) filter (where epi.source in ('notification','feed_card')
                     and epi.purchased_ticket = true)                                   as tickets_via_promotion,
  count(*) filter (where epi.source not in ('notification','feed_card')
                     and epi.purchased_ticket = true)                                   as tickets_other,
  round(
    count(*) filter (where epi.source in ('notification','feed_card') and epi.purchased_ticket = true)::numeric
    / nullif(count(*) filter (where epi.source in ('notification','feed_card')), 0) * 100,
    1
  ) as conversion_pct
from event_promotion_interactions epi
join events e on e.id = epi.event_id
left join profiles p on p.id = e.creator_id
-- add date filter here
group by e.id, e.title, p.full_name
order by notification_taps desc;
```

---

### Per-creator rollup (secondary view)

Same metrics aggregated across all events per creator. Toggle between "per-event" and "per-creator" views.

```sql
select
  p.id as creator_id,
  p.full_name as creator_name,
  p.username,
  count(distinct epi.event_id)                                                           as events_promoted,
  count(*) filter (where epi.source = 'notification')                                   as notification_taps,
  count(*) filter (where epi.source = 'feed_card')                                      as feed_card_views,
  count(*) filter (where epi.source in ('notification','feed_card')
                     and epi.purchased_ticket = true)                                   as tickets_via_promotion,
  round(
    count(*) filter (where epi.source in ('notification','feed_card') and epi.purchased_ticket = true)::numeric
    / nullif(count(*) filter (where epi.source in ('notification','feed_card')), 0) * 100,
    1
  ) as conversion_pct
from event_promotion_interactions epi
join events e on e.id = epi.event_id
left join profiles p on p.id = e.creator_id
group by p.id, p.full_name, p.username
order by tickets_via_promotion desc;
```

---

## Notes

- Rows with `source = 'direct_search'` represent purchases with no prior tracked interaction — do count their `purchased_ticket` in the "tickets via other sources" column.
- `user_id` may be `null` if the user account was deleted — show as "Deleted user" in any drill-down.
- `purchased_at` may differ from `viewed_at` significantly — use `purchased_at` for the purchase date filter, not `viewed_at`.
- The migration file is: `supabase/migrations/20260624000001_event_promotion_interactions.sql`
