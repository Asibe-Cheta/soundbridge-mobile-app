# Live Interest Feature — Music Player Prompt

## Before Writing Any Code
1. Find the music player screen in the mobile app
2. Find how the track upload form is structured 
   and what fields currently exist
3. Find how the audio_tracks table is structured 
   in the database
4. Find how user location is currently captured 
   and stored
5. Find how existing player overlays or 
   animations are implemented if any
6. Report findings before making any changes

---

## Overview
Add a subtle live interest prompt to the music 
player that allows listeners to signal they would 
like to hear a specific track performed live. 
This data feeds into the AI Career Adviser to 
help creators make informed decisions about 
where and when to host events.

This feature only applies to music and album 
tracks. It does not apply to podcasts, 
mixtapes, or audiobooks.

---

## Part 1 — Upload Form Toggle

Add a new toggle to the track upload form, 
visible only when content_type is 'music':

Label: "Ask listeners if they'd like to hear 
this live"

Description shown beneath toggle:
"This helps us gather data on where your 
audience wants to see you perform. We'll 
show a subtle prompt to listeners after 
they've played this track."

Default: OFF. Creator must opt in.

Store as a boolean field on the audio_tracks 
table:
live_interest_enabled: boolean default false

---

## Part 2 — The Live Interest Prompt

### When it appears
The prompt appears on the music player screen 
after the listener has played the track for 
at least 60 seconds OR completed one full play, 
whichever comes first.

Rules:
- Only appears if live_interest_enabled is true 
  on that track
- Only appears once per user per track, ever
- Never appears again after the user has 
  responded or dismissed it
- Store dismissal and response state per user 
  per track in the database

### Visual design
The prompt must NOT block the screen or 
interrupt playback in any way.

Position: Top of the player screen, 
floating above the content

Style:
- Semi-transparent background with blur effect 
  (glassmorphism) matching the existing app 
  design system
- Rounded corners matching existing card styles
- Subtle drop shadow
- Small and compact, not a full modal

Content:
- Small music note icon or waveform icon on 
  the left
- Text: "Would you like to hear this live?"
- Two small buttons: "Yes 🎵" and "Maybe later"
- No close/X button — it auto-dismisses

### Animation
Entry: Slides down from the top of the screen 
into view smoothly. Duration 300ms. 
Use ease-out curve.

Auto-dismiss: After 10 seconds of no 
interaction, slides back up and disappears. 
Duration 300ms. Use ease-in curve.

On tap "Yes": Immediately slides back up, 
records the response, shows a brief micro 
confirmation — a small checkmark or 
"Got it 🙌🏾" toast that appears for 
1.5 seconds then disappears.

On tap "Maybe later": Immediately slides 
back up, records as dismissed. Never 
appears again for this track for this user.

On auto-dismiss: Records as dismissed. 
Never appears again for this track 
for this user.

Music playback must never pause or be 
affected by this prompt in any way.

---

## Part 3 — Secondary Question (on Yes tap)

After the user taps "Yes" and the prompt 
slides back up, wait 1 second then show 
a second small prompt using the same 
animation pattern:

Text: "When are you most likely to attend?"

Four small pill buttons in a row:
- "Weekends"
- "Weekday evenings"  
- "Any time"
- "Not sure"

User taps one. Prompt slides back up 
immediately. Response stored.

This secondary prompt also auto-dismisses 
after 8 seconds if not tapped, in which 
case availability is stored as null.

---

## Part 4 — Data Storage

Create a new table:

live_interest_responses (
id: UUID primary key
track_id: UUID FK to audio_tracks
user_id: UUID FK to profiles
creator_id: UUID FK to profiles
responded: boolean
response: ‘yes’ | ‘maybe_later’ |
‘auto_dismissed’
availability: ‘weekends’ |
‘weekday_evenings’ |
‘any_time’ |
‘not_sure’ | null
profile_location: string | null
profile_city: string | null
profile_country: string | null
current_location_lat: decimal | null
current_location_lng: decimal | null
current_city: string | null
current_country: string | null
responded_at: timestamptz
)
When a user responds YES:
- Store their profile location fields from 
  their existing profile record
- Store their current GPS location if 
  available and permission granted
- Do not request location permission 
  specifically for this feature — only 
  use location if already available from 
  existing location services in the app

When a user taps Maybe Later or 
auto-dismisses:
- Store response as 'maybe_later' or 
  'auto_dismissed'
- Do not store location for dismissals

---

## Part 5 — Creator Dashboard Data

Add a Live Interest section to the creator's 
analytics or track management screen.

For each track with live_interest_enabled, 
show:

- Total number of "Yes" responses
- Breakdown by profile location (city level):
  "Manchester — 23 listeners"
  "London — 18 listeners"
  "Lagos — 12 listeners"
  etc.
- Availability breakdown:
  Weekends: X%
  Weekday evenings: X%
  Any time: X%
- A note: "Data is based on listener 
  profile locations. Use this to inform 
  where and when to plan your next event."

Only show this section if there are at 
least 3 responses to protect privacy. 
Below 3 responses show:
"Not enough data yet. Keep sharing your 
music to gather more insights."

---

## Part 6 — AI Career Adviser Integration

When generating event recommendations in 
the AI Career Adviser, include live interest 
data as a signal.

The AI Career Adviser should be able to 
surface insights like:

"23 listeners in Manchester have expressed 
interest in hearing [Track Name] live. 
This is your strongest demand signal for 
a live event. Most of them are available 
on weekends."

This data should be queryable by creator_id 
and filterable by track_id so the AI Career 
Adviser can reference it when generating 
location and timing recommendations.

---

## General Rules
- Music playback never affected by this 
  feature under any circumstances
- Prompt appears maximum once per user 
  per track, ever
- Feature only active on music content types
- Creator must explicitly enable it per track
- Minimum 3 responses before showing 
  creator data to protect privacy
- Match existing app design system exactly
- Do not request new permissions — use 
  only what is already available

---

## Acceptance Criteria
- [ ] Upload form toggle added for music tracks
- [ ] live_interest_enabled field added to 
      audio_tracks table
- [ ] Prompt appears after 60 seconds or 
      one full play
- [ ] Prompt appears only once per user 
      per track
- [ ] Slide down animation 300ms ease-out
- [ ] Auto-dismiss after 10 seconds with 
      slide up animation
- [ ] Yes tap triggers secondary 
      availability question
- [ ] Secondary question auto-dismisses 
      after 8 seconds
- [ ] All responses stored in 
      live_interest_responses table
- [ ] Profile location captured on Yes response
- [ ] Current location captured only if 
      already available
- [ ] Creator dashboard shows live interest 
      data per track
- [ ] Minimum 3 responses before showing 
      creator data
- [ ] AI Career Adviser can query this data
- [ ] Music playback never interrupted
- [ ] Tested on iOS and Android
