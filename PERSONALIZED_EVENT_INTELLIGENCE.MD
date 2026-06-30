# Personalised Event Intelligence System
# "This Event is For You"

## Before Writing Any Code
1. Find the existing user_behaviour_profiles 
  table built in a previous prompt
2. Find the existing events table 
  and how events are stored
3. Find the existing event preferences 
  and notification preferences screens
4. Find the existing feed screen 
  and how event cards are rendered
5. Find the existing push notification 
  system
6. Find the existing calendar_integrations 
  table if built
7. Find how the home or feed screen 
  header is currently structured
8. Report findings before making 
  any changes

---

## Overview
Build a personalised event intelligence 
system that scores upcoming events 
against each user's behaviour profile 
and surfaces the best matches with 
a compelling personalised reason.

This is NOT a full AI conversation 
system. It is a scoring algorithm 
that uses a lightweight AI model 
only for generating a short 
personalised reason line per match.

Three components:

1. A background event scoring job 
  that runs daily per user
2. A pulsating indicator on the 
  home screen when a high confidence 
  match is found
3. A "This event is for you" overlay 
  on matched event cards with a 
  personalised reason

---

## Part 1 — Event Match Scoring

### Background job
Run a daily background job that 
scores all upcoming events against 
each user's behaviour profile.

For each user with at least one 
completed preference or behaviour 
signal, score every upcoming event 
within the next 90 days.

### Scoring formula
Calculate a match_score between 
0 and 100 for each user-event pair:

**Genre match (25 points)**
If the event genre is in the user's 
preferred_genres: +25
If the event genre is related to 
a genre the user has tipped on: +15
No genre match: +0

**Mood match (15 points)**
If the event mood tags overlap with 
the user's preferred_moods: +15
Partial overlap: +8
No overlap: +0

**Location match (20 points)**
If the event city matches the user's 
primary_location_city: +20
If the event city is in the user's 
preferred_event_cities: +15
Within 50 miles of user location: +10
No location match: +0

**Availability match (20 points)**
If the event date and time falls 
within the user's preferred_notification_times: +10
If the event date falls within 
the user's active_event_months: +10
If Google Calendar shows user is 
free on event date (if connected): +20 
(replaces the 20 points above if 
calendar is connected)

**Artist affinity (15 points)**
If the user has tipped the event 
creator: +15
If the user has expressed live 
interest in the event creator's tracks: +15
If the user follows the event creator: +8

**Planning window match (5 points)**
If the event timing matches the 
user's event_planning_window: +5

### Match threshold
Score 75 and above: High confidence match
Score 50 to 74: Standard match
Score below 50: Do not surface as 
personalised recommendation

### Database table


event_match_scores (
id: UUID primary key
user_id: UUID FK to profiles
event_id: UUID FK to events
match_score: decimal
match_reasons: JSON
personalised_reason: text | null
indicator_shown: boolean default false
indicator_dismissed: boolean default false
calculated_at: timestamptz
expires_at: timestamptz – event date
)


match_reasons stores the individual 
scores that contributed to the total 
as a JSON object. This feeds the 
personalised reason generation.

---

## Part 2 — Personalised Reason Generation

### When to generate
Only generate a personalised reason 
for events with match_score of 75 
or above. Do not generate for 
lower scoring matches.

### How to generate
Use Google Gemini Flash API 
(gemini-flash model) to generate 
a single short personalised reason.

The API call should be:

System prompt:
"You write short, warm, human 
personalised event recommendations 
in one or two sentences maximum. 
Never use em dashes. Never sound 
like an AI. Sound like a friend 
who knows the person well."

User prompt built from match_reasons:
"Generate a personalised reason 
why this user should attend this event.

Event: [event name]
Artist: [creator name]
Genre: [genre]
Date: [date]
City: [city]

Why this matches:
[list the matching signals from 
match_reasons e.g. 
- User has tipped this artist before
- User is free on this date
- Gospel is their top genre
- They are in London]

Write one to two sentences maximum. 
Be specific. Be warm. Be human."

### Example outputs
"You tipped [Artist] last month 
and you are free this Saturday. 
We think you should be in that room."

"This is gospel worship in London 
on a Saturday evening. It has your 
name all over it."

"You have been listening to [Artist] 
on repeat. Now you can hear them live."

Store the generated reason in 
personalised_reason field.

### Cost management
Only call the API for high confidence 
matches (75 and above).
Cache the generated reason — never 
regenerate for the same user-event pair.
Use Gemini Flash free tier first. 
Monitor usage and switch to paid 
tier only when free limits are exceeded.

---

## Part 3 — Pulsating Indicator

### What it is
A small pulsating red dot that 
appears on the
Test feed screen header when a high 
confidence match event is found 
for the user.

### Where it appears
Position it in the top area of 
the test feed screen. 
It should be visible without 
scrolling.

A small circular badge with a 
continuous gentle pulse animation. 
Red fill. White or transparent border. 
Approximately 12px diameter.

The pulse animation should be 
slow and subtle — not aggressive 
or alarming. Think of a gentle 
heartbeat. Pulse outward and fade 
every 2 seconds.

### When it appears
Show the indicator when:
- At least one event has a 
  match_score of 75 or above
- The indicator has not yet 
  been shown for this specific event
- The event has not yet passed
- The user has not dismissed it

### What happens when tapped
Tapping the pulsating indicator 
opens a dedicated screen or 
bottom sheet called:

Title: "Events picked for you"

Shows all events with match_score 
75 and above in descending score order.

Each event displays as a standard 
event card with an overlay badge:

The overlay badge sits in the 
top left corner of the event card:
Background: brand primary colour 
with slight transparency
Text: "For you"
Small icon: a subtle sparkle or 
target icon

Below the event card title and 
details show the personalised reason 
in italic text:

"You tipped [Artist] last month 
and you are free this Saturday. 
We think you should be in that room."

### Dismissal
After the user views the matched 
events screen set indicator_shown 
to true for all shown events.

The indicator disappears from the 
home screen once all high confidence 
matches have been viewed.

It reappears if a new high confidence 
match is found in the next daily run.

---

## Part 4 — Feed Integration

### Event cards in the main feed
When a standard event card appears 
in the main feed (test feed screen, i believe) for a user and 
that event has a match_score of 
75 or above, show the overlay badge 
on the card:

Top left badge:
"For you"
Brand primary colour background
Same styling as described in Part 3

Below the event description show 
the personalised reason in smaller 
italic muted text.

This means the recommendation 
appears both in the dedicated 
matched events screen AND in 
the regular feed naturally.

---

## Part 5 — Scoring Job Schedule

Run the scoring job daily at 3AM 
UK time when server load is lowest.

For each user:
1. Fetch their user_behaviour_profile
2. Fetch their event preferences 
   and notification timing preferences
3. Fetch their calendar availability 
   if calendar is connected
4. Score all events starting from 
   tomorrow up to 90 days ahead
5. Insert or update event_match_scores
6. Generate personalised reasons 
   for new high confidence matches 
   using Gemini Flash
7. Delete expired records where 
   event date has passed

Process users in batches of 100 
to avoid API rate limits.

---

## General Rules
- Scoring job runs daily at 3AM
- Only generate AI reasons for 
  scores 75 and above
- Cache generated reasons — 
  never regenerate same pair
- Pulsating animation is subtle 
  not aggressive
- Indicator only appears for 
  genuinely high confidence matches
- If no high confidence match 
  exists do not show indicator
- All personalised reasons must 
  feel human and warm
- Never mention the score or 
  algorithm to the user
- Match existing design system 
  throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Scoring Job
- [ ] Daily background job runs 
      at 3AM
- [ ] Scoring formula calculates 
      correctly for all signals
- [ ] Calendar availability used 
      when connected
- [ ] event_match_scores table 
      created and populated correctly
- [ ] Expired records cleaned up
- [ ] Batch processing works correctly

### Reason Generation
- [ ] Gemini Flash API called only 
      for scores 75 and above
- [ ] Generated reasons feel human 
      and warm
- [ ] Reasons cached correctly
- [ ] No duplicate API calls for 
      same user-event pair
- [ ] Reasons stored in database correctly

### Pulsating Indicator
- [ ] Indicator appears on home 
      screen when high confidence 
      match exists
- [ ] Pulse animation is subtle 
      and slow
- [ ] Tapping opens matched events 
      screen
- [ ] Matched events screen shows 
      correct events in score order
- [ ] For you badge displays on 
      event cards correctly
- [ ] Personalised reason displays 
      below event card
- [ ] Indicator disappears after 
      user views matched events
- [ ] Indicator reappears for new 
      matches next day

### Feed Integration
- [ ] For you badge appears on 
      matched event cards in feed
- [ ] Personalised reason shows 
      below event description in feed
- [ ] Only appears for scores 
      75 and above

### General
- [ ] No existing feed functionality broken
- [ ] No existing notification 
      system broken
- [ ] Tested on iOS Android and web
