# Web Team — Pro Resource Analytics

**From:** Mobile team / Justice  
**Date:** 2026-05-30  
**Priority:** Medium — mobile tracking is live but the table does not exist in prod yet

---

## What this is

Pro Resources is the screen where creators access Sound Academy courses,
book free mentoring appointments, and find industry partner services
(Talk 2 Dan, University of Hertfordshire).

Mobile already tracks every interaction. We need three things from you:
1. Run the migration SQL below so events actually land in the DB
2. Add the same tracking to the web Pro Resources page
3. Add a Pro Resources panel to the admin dashboard

---

## Step 1 — Run this SQL in Supabase (production)

```sql
-- Pro Resource Analytics
-- Tracks who views the Pro Resources screen and taps any resource/link.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pro_resource_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  -- event_type values:
  --   'screen_view'     — opened the Pro Resources screen / page
  --   'resource_tap'    — tapped/clicked a specific resource or link
  resource    text,
  -- resource values (when event_type = 'resource_tap'):
  --   'sa_module_1'     — Sound Academy Module 1 card
  --   'sa_module_2'     — Sound Academy Module 2 card
  --   'sa_booking'      — Sound Academy "Book a Free Appointment" (Calendly)
  --   't2d_t2d-1'       — Talk 2 Dan: Young People service card
  --   't2d_t2d-2'       — Talk 2 Dan: Universities & Colleges service card
  --   't2d_t2d-3'       — Talk 2 Dan: Media Companies service card
  --   't2d_t2d-4'       — Talk 2 Dan: Recruitment service card
  --   't2d_website'     — Talk 2 Dan main CTA button
  --   'herts_website'   — University of Hertfordshire CTA button
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pre_user_id    ON public.pro_resource_events (user_id);
CREATE INDEX IF NOT EXISTS idx_pre_type       ON public.pro_resource_events (event_type);
CREATE INDEX IF NOT EXISTS idx_pre_created_at ON public.pro_resource_events (created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.pro_resource_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own events only
DROP POLICY IF EXISTS "pre_insert_own" ON public.pro_resource_events;
CREATE POLICY "pre_insert_own" ON public.pro_resource_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admin profiles (is_admin = true) can read
DROP POLICY IF EXISTS "pre_admin_select" ON public.pro_resource_events;
CREATE POLICY "pre_admin_select" ON public.pro_resource_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- ─── Admin summary view ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.pro_resource_analytics_summary AS
SELECT
  event_type,
  resource,
  COUNT(*)                                                               AS total_events,
  COUNT(DISTINCT user_id)                                                AS unique_users,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days')       AS events_7d,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days')      AS events_30d,
  MAX(created_at)                                                        AS last_event_at
FROM public.pro_resource_events
GROUP BY event_type, resource
ORDER BY total_events DESC;

-- ─── Admin per-user view ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.pro_resource_user_events AS
SELECT
  e.id,
  e.event_type,
  e.resource,
  e.created_at,
  e.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.subscription_tier
FROM  public.pro_resource_events e
LEFT JOIN public.profiles p ON p.id = e.user_id
ORDER BY e.created_at DESC;
```

**Note on the error you may have seen:** The previous version of this SQL
used `profiles.role = 'admin'` which fails because `role` is an enum that
does not include `'admin'`. This version correctly uses `profiles.is_admin = true`.

---

## Step 2 — Web Pro Resources page tracking

Add the same events to the web version of the Pro Resources page.

### Events to fire

| `event_type` | `resource` | When |
|---|---|---|
| `screen_view` | null | User lands on the Pro Resources page |
| `resource_tap` | `sa_module_1` | User clicks Sound Academy Module 1 card |
| `resource_tap` | `sa_module_2` | User clicks Sound Academy Module 2 card |
| `resource_tap` | `sa_booking` | User clicks "Book a Free Appointment" (Calendly) |
| `resource_tap` | `t2d_t2d-1` | User clicks Talk 2 Dan — Young People card |
| `resource_tap` | `t2d_t2d-2` | User clicks Talk 2 Dan — Universities & Colleges card |
| `resource_tap` | `t2d_t2d-3` | User clicks Talk 2 Dan — Media Companies card |
| `resource_tap` | `t2d_t2d-4` | User clicks Talk 2 Dan — Recruitment card |
| `resource_tap` | `t2d_website` | User clicks Talk 2 Dan main CTA |
| `resource_tap` | `herts_website` | User clicks University of Hertfordshire CTA |

### Insert pattern (Supabase JS)

```js
// Fire and forget — never surface errors to the user
async function trackProResource(eventType, resource = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('pro_resource_events').insert({
      user_id: user.id,
      event_type: eventType,
      resource,
    });
  } catch {}
}

// Usage examples:
trackProResource('screen_view');
trackProResource('resource_tap', 'sa_booking');
trackProResource('resource_tap', 'sa_module_1');
```

Only fire for authenticated users. Silent failure only — no error shown.

---

## Step 3 — Admin dashboard panel

Add a "Pro Resources" section to the admin analytics dashboard.
Both views are already created by the migration above.

### Summary table — query `pro_resource_analytics_summary`

```js
const { data } = await supabase
  .from('pro_resource_analytics_summary')
  .select('*');
```

Suggested display:

| Resource | Total | Unique users | Last 7d | Last 30d | Last seen |
|---|---|---|---|---|---|
| Screen views | 142 | 89 | 23 | 78 | 2026-05-30 |
| SA Module 1 | 67 | 44 | 12 | 41 | 2026-05-29 |
| SA Booking | 31 | 28 | 8 | 19 | 2026-05-30 |
| … | | | | | |

**Highlight `sa_booking`** — this is the highest-value signal. It shows which
users clicked to book a Sound Academy appointment. The Sound Academy team can
use this list to follow up with users who expressed intent but didn't complete
a booking.

### Per-user drill-down — query `pro_resource_user_events`

```js
const { data } = await supabase
  .from('pro_resource_user_events')
  .select('*')
  .limit(100);
```

Show as a feed: username, avatar, subscription tier, what they tapped, when.

---

## What mobile has already done

- `ProResourceAnalyticsService.ts` fires on every screen view and tap
- All `resource_tap` values above are already implemented
- Service is silent — never surfaces errors to the user
- Only fires for authenticated users

**Until the migration is run, all mobile events are silently failing.**
There is no error shown to users, but nothing is being recorded.

---

## Actions needed

| Action | Owner |
|---|---|
| Run SQL above in prod Supabase | Web team |
| Add tracking to web Pro Resources page | Web team |
| Add Pro Resources panel to admin dashboard | Web team |
