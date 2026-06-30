# Web Team Handoff — Event Discovery in Feed
**From:** Mobile team / Justice  
**Date:** 2026-06-01  
**Priority:** High — mobile is already live with this feature (OTA `2b7d9f33`)

---

## 1. Database changes — run these first

Two new columns are needed on the `events` table before anything else.
Run in Supabase SQL editor (production):

```sql
-- Step 1: Add analytics counters to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS feed_impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feed_cta_taps    integer NOT NULL DEFAULT 0;

-- Step 2: Create an RPC to safely increment them
-- (avoids read-modify-write races from the client)
CREATE OR REPLACE FUNCTION public.increment_event_feed_stat(
  p_event_id uuid,
  p_field     text   -- 'feed_impressions' or 'feed_cta_taps'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_field = 'feed_impressions' THEN
    UPDATE public.events SET feed_impressions = feed_impressions + 1 WHERE id = p_event_id;
  ELSIF p_field = 'feed_cta_taps' THEN
    UPDATE public.events SET feed_cta_taps = feed_cta_taps + 1 WHERE id = p_event_id;
  END IF;
END;
$$;
```

These columns feed into the existing event analytics dashboard. Once the columns
exist, the mobile analytics calls will start recording automatically (they were
already deployed, just silently no-opping until the columns exist).

---

## 2. What mobile already shipped

Mobile deployed three components on 2026-06-01 (OTA `2b7d9f33`):

| Component | Purpose |
|---|---|
| `EventPostCard` | Full event card rendered when a feed post has `post_type = 'event'` |
| `EventsStrip` | Horizontal scrollable row injected after every 8th feed post |
| `EventMiniCard` | Compact 160×220 card used inside EventsStrip |

The web implementation must match this behaviour and visual language exactly.

---

## 3. Overview — three layers

```
Layer 1  Event posts in feed
         When a creator's post has post_type = 'event', render an event card
         instead of a standard post card. Visually distinct. Has a CTA button.

Layer 2  Horizontal events strip
         A horizontal scrollable row of matched events injected into the feed
         after every 8th post. Uses the same personalised matching as the
         Events tab.

Layer 3  Matching logic
         Reuse the existing get_personalized_events() RPC. Do not write new
         matching logic. The RPC already covers follows, genre affinity,
         location radius, and live interest.
```

---

## 4. Layer 1 — Event post card

### When to render it

In the feed query, posts already have a `post_type` column and an `event_id`
foreign key. When both conditions are true, render the event card:

```
post.post_type === 'event'  AND  post.event_id IS NOT NULL
```

For all other post types render the standard post card unchanged.

### Event data

The post record alone does not contain event details. Fetch the linked event:

```sql
SELECT
  id, title, description, event_date,
  location, venue, category, image_url,
  ticket_price, tickets_available, country,
  feed_impressions, feed_cta_taps
FROM public.events
WHERE id = :event_id
LIMIT 1;
```

On the web you can join this in the feed query to avoid N+1 requests:

```sql
-- Add to existing feed posts query
LEFT JOIN public.events e ON e.id = p.event_id AND p.post_type = 'event'
```

Then expose the joined fields as `post.event` in the API response.

### Card structure (top to bottom)

```
┌──────────────────────────────────────┐
│  🗓  EVENT                           │  ← gradient strip #DC2626 → #EC4899
├──────────────────────────────────────┤
│                                      │
│         [cover image]                │  ← full width, natural aspect ratio
│   or branded gradient placeholder   │     gradient placeholder: #1E1235 → #3B1D8A
│                                      │
├──────────────────────────────────────┤
│  Event Title (20px bold)             │
│  🗓  Saturday 14 June 2026 at 19:00  │
│  📍  Venue · City, Country           │
│  🎵  Genre tag pill                  │
├──────────────────────────────────────┤  ← hairline divider
│  [avatar]  Creator Name              │
│            is hosting an event       │
├──────────────────────────────────────┤
│  Description line 1                  │  ← 2 lines default
│  Description line 2...  [See more]   │  ← expand on click
├──────────────────────────────────────┤
│  [   Buy Ticket — £10 / Register    ]│  ← full-width gradient button
│  [   Free / View Event              ]│    #DC2626 → #EC4899
├──────────────────────────────────────┤  ← hairline divider
│  👍 Like  💬 Comment  ↗ Share  🔖   │  ← standard social actions
└──────────────────────────────────────┘
```

### CTA button label logic

```
if ticket_price > 0            → "Buy Ticket — {currency}{price}"
else if tickets_available > 0  → "Register Free"
else                           → "View Event"
```

Currency symbol from `country`:
```
Nigeria / NG  → ₦
Ghana / GH    → ₵
Kenya / KE    → KSh
US / USA      → $
Canada / CA   → CA$
Europe / EU   → €
default       → £
```

### CTA button action

Navigates to the existing event detail page:
```
/events/{event_id}
```

On mobile this navigates to `EventDetailsScreen`. On web navigate to your
existing event detail route.

### Social actions

Like, comment, share and bookmark work exactly the same as on regular posts.
They operate on the **post** record (not the event record). Wire them to the
same handlers as standard post cards.

### Analytics — track on render and on CTA tap

Call the RPC defined in Section 1:

```js
// On card mount / entering viewport
supabase.rpc('increment_event_feed_stat', {
  p_event_id: event.id,
  p_field: 'feed_impressions',
})

// On CTA button click
supabase.rpc('increment_event_feed_stat', {
  p_event_id: event.id,
  p_field: 'feed_cta_taps',
})
```

Wrap both in try/catch — never let analytics break the UI.

### Design tokens

| Property | Value |
|---|---|
| Header gradient | `#DC2626` → `#EC4899` (left to right) |
| Placeholder gradient | `#1E1235` → `#3B1D8A` → `#1E1235` |
| CTA gradient | `#DC2626` → `#EC4899` (left to right) |
| Genre tag background | `rgba(220,38,38,0.12)` |
| Genre tag text | `#DC2626` |
| Card border radius | `0` (full bleed like PostCard, not rounded) |
| CTA button radius | `10px` |
| CTA text | white, 15px, 700 weight |

---

## 5. Layer 2 — Horizontal events strip

### When to show it

Inject the strip **after every 8th post** in the feed list.
Do **not** show the strip if fewer than 3 matched events exist for the user.
Never show an empty strip.

```
posts[0..7]   → post cards
EventsStrip   ← injected here
posts[8..15]  → post cards
EventsStrip   ← injected here
...
```

### Fetching matched events

Reuse the existing RPC:

```sql
SELECT * FROM get_personalized_events(
  p_user_id  := :userId,
  p_limit    := 10,
  p_offset   := 0
);
```

Sort the result: soonest `event_date` first.
Cap at **10 events** maximum in the strip.

**Cache the result per user for 1 hour** on the client.
The RPC is a heavy geospatial query — don't call it on every feed scroll.

### Strip layout

```
Events near you  📍                      [count]
┌──────────┐ ┌──────────┐ ┌────────────
│  [img]   │ │  [img]   │ │  [img]  ···
│          │ │          │ │
│ Title    │ │ Title    │ │ Title
│ Sat 14   │ │ Sun 15   │ │ Mon 16
│ London   │ │ Bristol  │ │ Manchester
│ [Hip-Hop]│ │ [R&B]    │ │ [Grime]
│ Free     │ │ £10      │ │ £15
└──────────┘ └──────────┘ └────────────
```

Show **2.5 cards** visible at once to indicate scrollability.

### EventMiniCard dimensions and content

```
Width:  160px (fixed)
Height: 220px (fixed)
Radius: 12px

Top half  (105px): cover image or gradient placeholder
Bottom half (115px):
  - Event title: 13px bold, max 2 lines, ellipsis
  - Short date: "Sat 14 Jun"   (13px)
  - City (first segment of location): 11px
  - Genre tag pill: 10px #DC2626
  - Price badge overlay (bottom-right of image): white text on rgba(0,0,0,0.65)
```

Tapping any mini card navigates to `/events/{event_id}`.

### Strip section header

```
📍  Events near you            [count]
```

Header sits above the horizontal scroll row.
Font: 14px 700.

---

## 6. Layer 3 — Matching logic

**Do not write new matching logic.**

The existing `get_personalized_events()` RPC already handles all three
matching conditions from the spec:

| Condition | How it's handled |
|---|---|
| User follows the creator | Included in RPC |
| Genre affinity + location radius | Included in RPC |
| Live interest in creator's tracks | Included in RPC |

The RPC already returns events ranked by relevance. The strip then re-sorts
by soonest date for display purposes.

---

## 7. Feed query changes needed

The web feed API currently returns `posts` without joining event data. You
need to enrich event posts with their linked event record.

**Recommended approach — join in the existing feed query:**

```sql
SELECT
  p.*,
  -- Include event details for event posts only
  CASE WHEN p.post_type = 'event' AND p.event_id IS NOT NULL THEN
    json_build_object(
      'id',                e.id,
      'title',             e.title,
      'description',       e.description,
      'event_date',        e.event_date,
      'location',          e.location,
      'venue',             e.venue,
      'category',          e.category,
      'image_url',         e.image_url,
      'ticket_price',      e.ticket_price,
      'tickets_available', e.tickets_available,
      'country',           e.country
    )
  END AS event
FROM public.posts p
LEFT JOIN public.events e
  ON e.id = p.event_id AND p.post_type = 'event'
WHERE ...  -- your existing feed conditions
```

The `event` field will be `null` for non-event posts. The frontend checks for
it and renders EventPostCard when present.

---

## 8. Acceptance checklist

### Database
- [ ] `feed_impressions` column added to `events` table
- [ ] `feed_cta_taps` column added to `events` table
- [ ] `increment_event_feed_stat` RPC created

### Layer 1 — Event post card
- [ ] Event posts detected by `post_type = 'event'`
- [ ] EventPostCard rendered instead of standard PostCard
- [ ] Gradient header strip with calendar icon and "EVENT" label
- [ ] Cover image or branded gradient placeholder
- [ ] Event name, date, venue/location, genre tag all display correctly
- [ ] Creator avatar + "is hosting an event" row
- [ ] Description shows 2 lines with expand
- [ ] CTA button text correct (Buy Ticket / Register Free / View Event)
- [ ] CTA navigates to event detail page
- [ ] Like, comment, share, bookmark work as on standard posts
- [ ] `feed_impressions` incremented on card render
- [ ] `feed_cta_taps` incremented on CTA click

### Layer 2 — Events strip
- [ ] Strip injected after every 8th post
- [ ] Strip hidden when fewer than 3 matched events
- [ ] `get_personalized_events` RPC used (no new matching logic)
- [ ] Maximum 10 events in strip
- [ ] Events sorted by soonest date
- [ ] 2.5 cards visible to indicate scrollability
- [ ] EventMiniCard: image, title, short date, city, genre, price
- [ ] Tapping mini card navigates to event detail page
- [ ] Matched events cached for 1 hour per user

### General
- [ ] Existing feed and post functionality unaffected
- [ ] No existing notification system affected
- [ ] Tested on desktop, tablet, and mobile web breakpoints

---

## 9. Notes

**Post type routing:** The `post_type = 'event'` value already exists in the
posts table and is already used by mobile. No new post type needs to be
created. This is purely a render-layer change on the web.

**Event detail page:** Mobile navigates to `EventDetailsScreen` which already
exists. Web should navigate to its existing event detail route — no new page
needed.

**Existing events tab:** This feature does not change the Events tab. The Events
tab continues to work as-is. This is feed-only.

**Empty strip:** The `get_personalized_events` RPC may return zero results for
users who have not set location or genre preferences. In that case, hide the
strip entirely. Never render an empty strip.

🙏🏾
