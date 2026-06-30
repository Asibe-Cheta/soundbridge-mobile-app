# Web Team — Pro Resources Partner Click Tracking
Date: 22 Jun 2026

## What we've built on mobile

Every time a user taps a partner resource card in the Pro Resources screen, the mobile app now writes a row to the new `partner_resource_clicks` table in addition to the existing `pro_resource_events` table.

### `partner_resource_clicks` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `profiles.id` (nullable on delete) |
| `partner_name` | text | One of the four values below |
| `clicked_at` | timestamptz | defaults to `now()` |

#### Partner name values (exactly as stored)
- `Sound Academy`
- `Talk2Dan`
- `University of Hertfordshire`
- `MBG Sonics`

### RLS policies
- `INSERT`: any authenticated user (own rows only, `auth.uid() = user_id`)
- `SELECT`: admin users only (`profiles.is_admin = true`)

---

## Admin dashboard required

Please add a **Pro Resources — Partner Clicks** section to the admin dashboard on the web app.

### Summary cards (top of section)
Show one stat card per partner for the **current calendar month**:
- Partner name
- Total clicks this month
- Small delta vs last month (optional but nice)

Query:
```sql
select
  partner_name,
  count(*) filter (where clicked_at >= date_trunc('month', now())) as this_month,
  count(*) filter (where clicked_at >= date_trunc('month', now() - interval '1 month')
                     and clicked_at <  date_trunc('month', now())) as last_month
from partner_resource_clicks
group by partner_name
order by this_month desc;
```

### Clicks table (below summary cards)
A paginated/scrollable table showing individual click events:

| Column | Source |
|---|---|
| Creator name | `profiles.full_name` |
| Username | `profiles.username` (formatted as `@username`) |
| Partner | `partner_resource_clicks.partner_name` |
| Date & Time | `partner_resource_clicks.clicked_at` (local timezone) |

Query (join):
```sql
select
  prc.id,
  prc.partner_name,
  prc.clicked_at,
  p.full_name,
  p.username
from partner_resource_clicks prc
left join profiles p on p.id = prc.user_id
order by prc.clicked_at desc;
```

### Filters
- **Partner** — chips or dropdown: All / Sound Academy / Talk2Dan / University of Hertfordshire / MBG Sonics
- **Date range** — This month / Last 7 days / All time

---

## Notes
- The existing `pro_resource_events` table is still populated for every event type (`screen_view`, `explore_courses_tap`, `resource_tap`). `partner_resource_clicks` is a clean, purpose-built table for partner attribution only — use this for the dashboard.
- Deleting a user sets `user_id` to `null` (ON DELETE SET NULL). Handle null `full_name`/`username` gracefully in the table (show "Deleted user").
