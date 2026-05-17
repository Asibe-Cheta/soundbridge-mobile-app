# External Events Integration — Songkick API

## Before Writing Any Code
1. Find the existing events system in the codebase:
   - How events are currently created and stored
   - The events table schema
   - How location matching works (the 20km radius logic)
   - How genre matching works for event discovery
   - The Discover screen Events tab and how it 
     currently queries and displays events
   - How push notifications are triggered for 
     creator-uploaded events
2. Find any existing external API integrations 
   to understand the pattern used
3. Report findings before making any changes

---

## Overview
Integrate the Songkick API to pull external live 
music events and display them in the Events tab 
on the Discover screen alongside SoundBridge-created 
events. External events are location and genre matched 
using the existing framework but do NOT trigger push 
notifications. SoundBridge-created events always 
take priority in ordering.

---

## Data Source
Songkick API
Base URL: https://api.songkick.com/api/3.0
Requires API key — store in environment variables 
as SONGKICK_API_KEY
Apply for API key at: songkick.com/developer

---

## What to Build

### 1. Background Sync Job
Create a scheduled background job that runs 
every 6 hours to fetch and cache external events 
from Songkick.

The job should:
- Query Songkick events endpoint filtered by 
  location and date range (today to 90 days ahead)
- Focus on UK locations initially (London, 
  Manchester, Birmingham, Leeds, Bristol, 
  Reading, Wokingham and surrounding areas)
- Store results in a new table: external_events
- Delete expired events (past their event date) 
  on each run
- Never duplicate — check event_external_id 
  before inserting

### 2. External Events Table
Create a new table:

external_events (
id: UUID primary key
event_external_id: string unique – Songkick event ID
source: string – ‘songkick’
title: string
artist_name: string
venue_name: string
venue_address: string | null
city: string
country: string
latitude: decimal | null
longitude: decimal | null
genre: string | null
event_date: timestamptz
ticket_url: string | null
image_url: string | null
is_claimed: boolean default false
claimed_by_user_id: UUID | null – FK to profiles
claimed_at: timestamptz | null
created_at: timestamptz
updated_at: timestamptz
)
### 3. Genre Mapping
Songkick uses its own genre/genre tags. Map 
Songkick genres to SoundBridge genres using 
the existing genre list in the codebase.

Create a mapping table or constant, for example:
- Songkick "Gospel" → SoundBridge "Gospel"
- Songkick "R&B/Soul" → SoundBridge "R&B"
- Songkick "Afrobeats" → SoundBridge "Afrobeats"
- Songkick "Hip-Hop" → SoundBridge "Hip Hop"
- Songkick "Jazz" → SoundBridge "Jazz"
- Songkick "Electronic" → SoundBridge "Electronic"
- Any unmapped genre → store as-is, display 
  in discovery but lower priority

### 4. Discover Screen — Events Tab

Update the Events tab query to combine both 
SoundBridge-created events and external events 
using the existing location and genre matching 
framework.

Priority ordering (strict):
1. SoundBridge-created events matching user's 
   location and genre — shown first, full card 
   with all features
2. External events matching user's location 
   and genre — shown below, slightly different 
   card style
3. SoundBridge-created events outside immediate 
   radius but same genre
4. External events outside immediate radius 
   but same genre

Use the existing 20km radius logic for location 
matching on external events — apply it to the 
latitude and longitude stored in external_events.

### 5. External Event Card Design
External event cards should be visually distinct 
from SoundBridge-created event cards but not 
drastically different. Add:
- A small badge or label: "Via Songkick" or 
  just "External Event"
- The badge should be subtle — small text or 
  a small icon, not a banner
- Show: artist name, event title, venue, date, 
  city
- "Get Tickets" button that opens ticket_url 
  in the device browser
- "Are you this artist? Claim this event" 
  text link at the bottom of the card

Do NOT show on external event cards:
- Tip button
- Request Room button
- SoundBridge promotional features

### 6. Claim Flow
When a user taps "Are you this artist? Claim 
this event":

1. If not logged in: prompt to log in or sign up
2. If logged in: show a simple confirmation modal:
   "Claim this event as [their SoundBridge 
   username]? Once claimed, this event will 
   appear on your profile and your followers 
   will be notified."
   Buttons: "Claim Event" | "Cancel"
3. On confirmation:
   - Set is_claimed = true on external_events
   - Set claimed_by_user_id to the user's ID
   - Create a corresponding entry in the main 
     events table linked to this user's profile
   - The event now graduates to Tier 1 — 
     SoundBridge created event treatment
   - Trigger the existing genre and location 
     based push notification system for this 
     event as if it were a new creator-uploaded 
     event
   - Show on the creator's profile under 
     their events

### 7. No Push Notifications for External Events
External events that have NOT been claimed 
must never trigger push notifications.

Only claimed external events — which graduate 
to Tier 1 — trigger the existing notification 
system.

This is non-negotiable. Do not modify the 
existing notification logic. Only plug the 
claimed event into it.

### 8. Expiry and Cleanup
The background sync job should:
- Remove external events where event_date 
  is in the past
- Do not remove claimed events — these are 
  now part of the creator's profile history
- Log each sync run with count of events 
  added, updated and removed

---

## Important Rules
- Store Songkick API key in environment 
  variables only. Never hardcode it.
- All Songkick data is read only — never 
  write back to Songkick
- External events are clearly labelled 
  at all times
- Use the existing location and genre 
  matching framework — do not rebuild it
- SoundBridge created events always appear 
  above external events in every list view
- Test that the Events tab still works 
  correctly with zero external events 
  returned (graceful empty state)

---

## Acceptance Criteria
- [ ] Songkick API key stored in environment
- [ ] Background sync job runs every 6 hours
- [ ] external_events table created
- [ ] Events ingested and stored correctly
- [ ] Expired events cleaned up on each run
- [ ] Genre mapping applied correctly
- [ ] Discover Events tab shows both 
      SoundBridge and external events
- [ ] Location matching uses existing 20km 
      framework
- [ ] Genre matching uses existing framework
- [ ] SoundBridge events always shown first
- [ ] External event cards have correct 
      badge and styling
- [ ] Get Tickets button opens correct URL
- [ ] Claim flow works end to end
- [ ] Claimed event graduates to Tier 1
- [ ] Claimed event triggers notification system
- [ ] No notifications for unclaimed external 
      events
- [ ] No existing events functionality broken
- [ ] Tested on iOS, Android and web
