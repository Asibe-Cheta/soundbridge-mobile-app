# Event Discovery in Feed — Three Layer System

## Before Writing Any Code
1. Find the existing feed screen in 
  the mobile app codebase
2. Find how events are currently 
  created and stored in the database
3. Find how the existing feed posts 
  are rendered and what components 
  are used
4. Find the existing notification 
  system for events and how matched 
  users are selected
5. Find how ticket purchasing is 
  currently handled
6. Find the existing design system 
  for cards and feed components
7. Report findings before making 
  any changes

---

## Overview
Build a three layer event discovery 
system within the feed:

Layer 1 — Event posts appearing in 
the main feed for matched users with 
a unique card design and CTA button

Layer 2 — A horizontal scrollable 
events strip appearing within the 
feed showing matched events

Layer 3 — The matching logic that 
selects which users see which events 
in their feed (mirrors existing 
notification matching logic)

Notifications remain unchanged. 
This is a feed-only addition.

---

## Layer 1 — Event Posts in Feed

### What changes
When a creator posts an event it 
should appear in the feeds of 
matched users just like a regular 
post but with a distinct visual 
design that makes it immediately 
identifiable as an event.

### Event post card design
The event post card must look 
visually different from a standard 
post or music post. It should feel 
like an event listing not a social 
media post.

Card structure from top to bottom:

**Event header strip:**
A full width coloured strip at the 
top of the card in the platform's 
brand gradient with a small calendar 
icon and the label "Event" in white. 
This immediately signals to the 
user that this is an event post.

**Event cover image:**
Full width event cover image if 
the creator has uploaded one. 
If no cover image, use a branded 
gradient placeholder with the 
event name centered on it.

**Event details section:**
Event name in large bold text
Date and time — formatted clearly 
as Day DD Month YYYY at HH:MM
Location — venue name and city
Genre tag

**Creator info row:**
Creator profile photo (small, circular)
Creator display name
"is hosting an event" label

**Description:**
First 2 lines of the event 
description visible. Tap to expand 
for full description.

**CTA button:**
A prominent full width button at 
the bottom of the card.

Button text options based on 
event type:
- If tickets available and price 
 is greater than zero: 
 "Buy Ticket — £[price]"
- If free event with registration: 
 "Register Free"
- If no ticketing set up: 
 "View Event"

Tapping the CTA button opens the 
full event detail screen where the 
user can complete the ticket 
purchase or registration.

**Social actions row:**
Below the CTA button show the 
standard social actions:
Like, Comment, Share, Bookmark

These work exactly as they do on 
regular posts. Users can comment 
on the event post, like it, share 
it, and bookmark it.

Comment section functions normally — 
users can ask questions about the 
event, the creator can respond.

### Feed placement logic
Event posts appear in the feeds of 
users who match the event on:
- Genre (user has opted in for 
 the event's genre)
- Location (user is within the 
 event's promotion radius)

Use the same matching logic already 
built for event notifications. 
Do not duplicate the logic — 
reuse the existing matching function.

An event post appears in a matched 
user's feed once. It does not 
repeat or resurface unless the 
creator boosts it in future.

The event post also appears in 
the feeds of users who follow 
the creator regardless of genre 
or location match.

### Database additions
Add a field to the events table:



feed_impressions: integer default 0
feed_clicks: integer default 0feed_cta_taps: integer default 0


Increment these counters when the 
event card is shown, tapped, or 
CTA button tapped. Feed into the 
existing event analytics dashboard.

---

## Layer 2 — Horizontal Events Strip

### What it is
A dedicated horizontal scrollable 
section that appears within the 
main feed, between regular content 
posts, showing event cards matched 
to the current user.

### Position in feed
Insert the events strip after 
every 8th post in the feed. 
If fewer than 8 posts exist, 
place it at the top of the feed 
below the stories row or header 
if applicable.

If no matched events exist for 
the user do not show the strip 
at all. Never show an empty strip.

### Strip header
A small section header above the 
horizontal scroll:
"Events near you" 
with a subtle location pin icon.

### Event cards in the strip
Each card in the horizontal strip 
is smaller than the full feed 
event post. Design as a compact 
vertical card:

Width: approximately 160px
Height: approximately 220px
Rounded corners

Content:
- Event cover image (top half 
  of card, or gradient placeholder)
- Event name (bold, max 2 lines, 
  truncate with ellipsis)
- Date in short format: 
  Sat 14 Jun
- City name
- Genre tag pill
- Price or Free label at bottom

Tapping any card in the strip opens 
the full event detail screen.

### Scrolling behaviour
Horizontal scroll only. 
Show 2.5 cards visible at once 
to indicate there are more to 
swipe through.

Minimum 3 events required to 
show the strip. Maximum 10 events 
shown in the strip at once.

Events in the strip are ranked by:
1. Distance from user (closest first)
2. Date (soonest first)
3. Quality score of the creator 
   if available

### Strip on web app
On the web app render the same 
events strip as a horizontal 
scrollable row within the feed. 
Same matching logic. Same card 
design adapted for web.

---

## Layer 3 — Matching Logic

### How matched users are selected
Reuse the existing notification 
matching function to determine 
which users see event content 
in their feed.

A user sees an event in their 
feed if ANY of these conditions 
are true:

Condition A: User follows the creator
Condition B: User has opted in for 
the event's genre AND is within 
the event's promotion radius
Condition C: User has expressed 
live interest in any of the 
creator's tracks

Priority ranking for the events 
strip:
1. Events where user has expressed 
   live interest in the creator's 
   tracks (highest relevance)
2. Events from creators the user 
   follows
3. Events matching genre and 
   location

### Feed injection timing
Event posts and strip cards are 
injected into the feed at the 
time of feed load. They are not 
real time pushed into an already 
loaded feed.

Cache matched events per user 
for 1 hour to avoid repeated 
heavy queries on every feed scroll.

---

## Web App Parity
Both the event post card and 
the horizontal events strip must 
appear on the web app feed as well 
as the mobile app feed.

Design tokens and card dimensions 
adapt for web but the functionality 
and matching logic are identical.

---

## General Rules
- Existing notification system 
  unchanged
- Event posts must be visually 
  distinct from regular posts 
  at first glance
- CTA button must be prominent 
  and tappable
- Social actions (like, comment, 
  share, bookmark) work as normal
- Horizontal strip only shows 
  when 3 or more matched events exist
- Never show empty strip
- Matched events cached per user 
  for 1 hour
- Match existing design system 
  throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Event Post Card
- [ ] Event post card visually 
      distinct from regular posts
- [ ] Event header strip with 
      "Event" label displays correctly
- [ ] Cover image displays correctly 
      with gradient fallback
- [ ] Event name date time location 
      and genre display correctly
- [ ] Creator info row displays correctly
- [ ] Description truncated at 2 lines 
      with expand option
- [ ] CTA button shows correct text 
      based on ticket type
- [ ] CTA button opens event detail 
      screen correctly
- [ ] Like comment share bookmark 
      all work correctly
- [ ] Comments section functions 
      as normal

### Feed Placement
- [ ] Event posts appear in feeds 
      of matched users
- [ ] Event posts appear in feeds 
      of creator's followers
- [ ] Matching uses existing 
      notification logic
- [ ] Event appears once per user 
      per event in feed
- [ ] feed_impressions increments 
      when card shown
- [ ] feed_cta_taps increments 
      when CTA tapped

### Horizontal Events Strip
- [ ] Strip appears after every 
      8th post in feed
- [ ] Strip not shown when fewer 
      than 3 matched events exist
- [ ] Compact event cards display 
      correctly
- [ ] 2.5 cards visible to indicate 
      scrollability
- [ ] Horizontal scroll works smoothly
- [ ] Tapping card opens event 
      detail screen
- [ ] Events ranked by distance 
      then date
- [ ] Maximum 10 events in strip
- [ ] Matched events cached for 1 hour
- [ ] Strip appears on web app

### General
- [ ] Notification system unaffected
- [ ] No existing feed functionality broken
- [ ] Tested on iOS Android and web


🙏🏾