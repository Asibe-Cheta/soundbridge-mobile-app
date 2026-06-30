# User Behaviour Profile System

## Before Writing Any Code
1. Find the existing profiles table 
   in Supabase
2. Find where plays, tips, event views, 
   bookmarks, follows and live interest 
   responses are currently stored
3. Find how the user's location is 
   currently captured
4. Report findings before making 
   any changes

---

## Overview
Create a user_behaviour_profiles table 
that automatically builds and updates 
a behavioural profile for every user 
based on their actions on SoundBridge. 
This profile feeds the AI Career Adviser 
and the discovery engine.

No user action required. No external 
APIs. Everything is derived from 
existing platform activity.

---

## Database Table



user_behaviour_profiles (
user_id: UUID primary key FK to profiles

events_viewed: integer default 0
events_bookmarked: integer default 0
events_purchased: integer default 0
events_attended_via_request_room:
integer default 0
preferred_event_cities: text[]
preferred_event_days: text[]
preferred_event_times: text[]

tracks_played: integer default 0
tracks_repeat_listened: integer default 0
tracks_tipped: integer default 0
preferred_genres: text[]
preferred_moods: text[]

creators_followed: integer default 0
creators_tipped: integer default 0
live_interests_expressed: integer default 0

most_active_day: text
most_active_hour: integer
primary_location_city: text

last_updated: timestamptz
)


---

## When to Update

Update the relevant fields automatically 
whenever any of these actions occur:

User plays a track: increment tracks_played, 
update preferred_genres and preferred_moods

User plays a track more than once: 
increment tracks_repeat_listened

User tips a track or creator: 
increment tracks_tipped or creators_tipped

User views an event: 
increment events_viewed, 
update preferred_event_cities

User bookmarks an event: 
increment events_bookmarked

User purchases an event ticket: 
increment events_purchased

User tips via Request Room: 
increment events_attended_via_request_room

User follows a creator: 
increment creators_followed, 
update preferred_genres

User expresses live interest: 
increment live_interests_expressed

User opens the app: 
update most_active_day and 
most_active_hour based on 
current timestamp

User location detected: 
update primary_location_city

---

## Preferred Fields Calculation

preferred_genres: 
Top 3 genres based on combined 
plays, tips and follows

preferred_moods: 
Top 3 moods from tracks the user 
has played more than once or tipped

preferred_event_cities: 
Cities from events the user has 
viewed, bookmarked or purchased

preferred_event_days: 
Day of week pattern from event 
purchases and bookmarks

most_active_day: 
Day of week the user most frequently 
opens the app

most_active_hour: 
Hour of day the user most frequently 
opens the app

---

## Create Profile on Signup
When a new user signs up create 
a blank user_behaviour_profiles 
record for them immediately with 
all fields at their defaults.

---

## Acceptance Criteria
- [ ] Table created in Supabase
- [ ] Profile record created for 
      every new user on signup
      existing users get records 
      created in a one-time migration
- [ ] All fields update correctly 
      on relevant user actions
- [ ] preferred_genres calculates 
      correctly
- [ ] preferred_moods calculates 
      correctly
- [ ] most_active_day and hour 
      update correctly
- [ ] No existing functionality broken


