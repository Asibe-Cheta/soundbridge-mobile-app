
# Event Promotion Tracking and Feed Parity Check

## Part 1 — Feed Screen Investigation, 
## Do This First

Before building anything else, investigate and 
report back on the following:

1. Find the original FeedScreen.tsx and the logic 
   that determines when and how event promotion 
   cards render on it, including whatever threshold 
   or condition triggers an event being shown as 
   promoted content
2. Find TestFeedScreen.tsx, currently the active 
   main feed, and check whether this same event 
   promotion rendering logic exists there at all
3. Report clearly whether TestFeedScreen has full 
   parity with FeedScreen on this specific feature, 
   partial parity, or whether it is missing entirely

Do not build anything else until this is reported 
back, since the rest of this prompt depends on 
knowing whether this foundation already exists.

---

## Part 2 — Event Promotion Source Tracking

### Overview
Track precisely how a user arrived at an event, 
notification tap, feed card tap, or other, and 
whether they purchased a ticket, so this becomes 
measurable and visible in the admin dashboard.

### Database
event_promotion_interactions ( id: UUID primary key event_id: UUID FK to events user_id: UUID FK to profiles source: text – ‘notification’ ‘feed_card’ ‘direct_search’ – ‘shared_link’ ‘other’ viewed_at: timestamptz purchased_ticket: boolean default false purchased_at: timestamptz | null )
### Tracking notification taps
When a user taps an event notification, record an 
event_promotion_interactions entry with source set 
to 'notification', before navigating to the event 
detail screen.

### Tracking feed card taps
When a user taps an event card on the feed, record 
an entry with source set to 'feed_card'.

### Tracking ticket purchases
When a ticket purchase completes, find the most 
recent event_promotion_interactions record for that 
user and event, set purchased_ticket to true and 
record purchased_at. If no prior interaction record 
exists for that user and event, create one with 
source set to 'direct_search'.

---

## Part 3 — Admin Dashboard, New Events 
## Promotion Tab

Add a dedicated Events Promotion tab to the admin 
dashboard, separate from the existing general 
events listing.

### Summary cards
- Total event notifications sent this month
- Total notification taps this month
- Total feed card views this month
- Total tickets purchased that originated from 
  SoundBridge promotion (notification or feed card 
  sources combined) this month
- Conversion rate, promotion views to ticket 
  purchases, as a percentage

### Per-event breakdown table
Columns: event name, creator name, notifications 
sent, notification taps, feed card views, tickets 
purchased via promotion, tickets purchased via 
other sources, conversion rate

Sortable by any column, filterable by date range.

### Per-creator rollup
A secondary view showing the same metrics 
aggregated per creator across all their events, 
so you can see which creators are converting best 
from SoundBridge promotion specifically.

---

## General Rules
- Complete Part 1 investigation before building 
  Part 2 or Part 3
- Tracking must not delay or interrupt normal 
  navigation
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Part 1 investigation completed and reported 
      before any building begins
- [ ] event_promotion_interactions table created
- [ ] Notification tap source tracked correctly
- [ ] Feed card tap source tracked correctly
- [ ] Ticket purchase correctly linked to most 
      recent interaction or created as direct_search
- [ ] Events Promotion tab added to admin dashboard
- [ ] Summary cards display correct aggregated data
- [ ] Per-event breakdown table displays and sorts 
      correctly
- [ ] Per-creator rollup displays correctly
- [ ] If FeedScreen event logic is missing from 
      TestFeedScreen, this is clearly flagged as a 
      separate required fix, not silently skipped
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web

