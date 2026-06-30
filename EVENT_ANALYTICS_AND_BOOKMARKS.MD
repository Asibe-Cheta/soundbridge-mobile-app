# Event Analytics, Bookmark, and Share Features

## Before Writing Any Code
1. Find the existing events system in 
  both the mobile app and web app
2. Find how events are currently 
  displayed and managed
3. Find how push notifications are 
  currently sent for events and 
  what data is tracked
4. Find how ticket sales are currently 
  processed and recorded
5. Find the existing subscription 
  tier checking logic
6. Find the existing admin dashboard 
  and how it is structured
7. Find how sharing is currently 
  implemented anywhere in the app
8. Report findings before making 
  any changes

---

## Overview
Build three connected features:

1. Event bookmark and save functionality 
  for both mobile and web
2. In-app event sharing for both 
  mobile and web
3. Event performance analytics for 
  creators, tiered by subscription, 
  for both mobile and web
4. Admin dashboard event overview

---

## Part 1 — Bookmark and Save Event

### Mobile App
Add a bookmark icon to every event 
card and event detail screen.

Position: top right of the event 
card and event detail screen, 
alongside existing action icons.

Behaviour:
- Tapping bookmarks the event and 
 the icon fills to indicate saved state
- Tapping again removes the bookmark
- Bookmark state persists across 
 sessions stored in the database

A saved events section in the 
user's profile or a dedicated 
tab where they can view all 
events they have bookmarked.

### Web App
Same bookmark functionality on 
event cards and event detail pages.
Same saved events section accessible 
from the user's profile.

### Database
Add a new table:



event_bookmarks (
id: UUID primary key
user_id: UUID FK to profiles
event_id: UUID FK to events
bookmarked_at: timestamptz
)


### Analytics tracking
When a user bookmarks an event 
record it against that event's 
analytics record for the creator 
to see in their insights.

---

## Part 2 — In-App Event Sharing

### Mobile App
Add a share icon to every event 
card and event detail screen.

Tapping share opens a share sheet 
with two options:

Option 1 — Share Link
Generates a deep link to the event 
detail page on the web app:
soundbridge.live/events/[event-id]
Opens the native share sheet with 
the link and a pre-filled message:
"Check out this event on SoundBridge: 
[Event Name] — [Date] — [Location]"

Option 2 — Share Card
Generates a branded image card 
for the event showing:
- Event name
- Date and time
- Location
- Creator name and profile photo
- SoundBridge logo
- Event cover image if available

The card is generated as a PNG 
and shared via native share sheet.

### Web App
Add a share button to event cards 
and event detail pages.

On web, share generates a copyable 
link and optionally opens a native 
share dialog on mobile browsers.

### Analytics tracking
When a user shares an event record 
the share method (link or card) 
against that event's analytics 
for the creator to see.

---

## Part 3 — Event Performance Analytics

### Data to collect per event
Track the following for every event 
created on SoundBridge:



event_analytics (
id: UUID primary key
event_id: UUID FK to events
creator_id: UUID FK to profiles

– Reach
notifications_sent: integer default 0
notifications_opened: integer default 0
event_page_views: integer default 0

– Engagementbookmarks_count: integer default 0
shares_link_count: integer default 0
shares_card_count: integer default 0

– Conversion
ticket_sales_count: integer default 0
ticket_sales_revenue: decimal default 0

– Advanced (Unlimited only)
views_by_city: JSON | null
views_by_genre_match: JSON | null
notification_open_rate: decimal | null
peak_view_hour: integer | null

updated_at: timestamptz
)


Increment the relevant counter 
each time an action occurs:
- notification_sent increments when 
  each push notification is dispatched
- notifications_opened increments 
  when a user taps the notification
- event_page_views increments on 
  each unique event detail page visit
- bookmarks, shares, ticket sales 
  increment on each action

---

### Creator-facing analytics screens

#### Free users
No analytics visible. On the event 
management screen show a locked 
analytics card:

"See how your event is performing. 
Reach, ticket sales, notification 
opens and more. Available on 
Premium and Unlimited."

Button: "Access Premium"

#### Premium users
Show a standard analytics card 
on the event detail and event 
management screens containing:

- Notifications sent: [number]
- Notifications opened: [number] 
  and open rate percentage
- Event page views: [number]
- Bookmarks: [number]
- Shares: [number] broken down 
  by link and card
- Ticket sales: [number] and 
  total revenue if applicable

Displayed as clean metric cards 
with simple bar or line charts 
where relevant.

#### Unlimited users
Everything in Premium plus:

- Views broken down by city
- Views broken down by genre 
  match category
- Notification open rate trend 
  over time
- Peak viewing hour — what time 
  of day most people viewed the event
- Conversion rate — percentage of 
  notification recipients who viewed 
  the event page
- Conversion rate — percentage of 
  page viewers who bought tickets

Displayed as additional expanded 
sections below the standard metrics.

### Where analytics appear

Mobile app:
- On the event detail screen when 
  the creator views their own event
- In a dedicated Events section 
  of the creator's dashboard or 
  profile area showing all their 
  events with summary metrics

Web app:
- Same screens mirrored on web
- Creators logged into soundbridge.live 
  can view their event analytics 
  from their dashboard

---

## Part 4 — Admin Dashboard Event Overview

Add an Events section to the existing 
admin dashboard on the web app.

### What to show
A paginated table of all events 
created on SoundBridge containing:

| Column | Description |
|---|---|
| Event Name | Title of the event |
| Creator | Name and username of creator |
| Created At | Date event was created |
| Event Date | Scheduled date of the event |
| Location | City and country |
| Genre | Genre tag |
| Status | Upcoming, Live, Past, Cancelled |
| Tickets | Number of tickets sold if applicable |

### Table features
- Search by event name or creator name
- Filter by status
- Filter by date range
- Sort by any column
- Paginated at 50 rows per page

### Event detail view
Clicking any event row opens a 
detail panel showing all event 
fields and basic analytics summary:
notifications sent, page views, 
bookmarks and shares.

Keep it simple and read-only. 
No editing from the admin dashboard.

---

## General Rules
- Bookmark and share work for all 
  users regardless of tier
- Analytics visibility is tiered 
  by subscription as described
- Free users see locked analytics 
  with upgrade prompt
- All analytics update in real time 
  or near real time
- Both mobile app and web app must 
  have feature parity on bookmark, 
  share and analytics
- Admin dashboard is read-only
- Do not change any existing event 
  creation or promotion logic
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Bookmark
- [ ] Bookmark icon on event cards 
      and detail screens
- [ ] Bookmark state persists in database
- [ ] Saved events visible in 
      user profile
- [ ] Works on mobile and web
- [ ] Bookmark count tracked in 
      event analytics

### Share
- [ ] Share icon on event cards 
      and detail screens
- [ ] Share link generates correct URL
- [ ] Share card generates branded 
      PNG with event details
- [ ] Native share sheet opens 
      on mobile
- [ ] Share count tracked by method 
      in event analytics
- [ ] Works on mobile and web

### Analytics
- [ ] event_analytics table created
- [ ] All counters increment correctly
- [ ] Free users see locked state 
      with upgrade prompt
- [ ] Premium users see standard 
      metrics correctly
- [ ] Unlimited users see advanced 
      metrics correctly
- [ ] Analytics visible on event 
      detail screen for creator
- [ ] Analytics visible in creator 
      dashboard events section
- [ ] Works on mobile and web

### Admin Dashboard
- [ ] Events section added to 
      admin dashboard
- [ ] Table shows all events with 
      correct columns
- [ ] Search works correctly
- [ ] Filters work correctly
- [ ] Event detail panel opens 
      on row click
- [ ] No existing functionality broken


🙏🏾