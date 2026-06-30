# Discovery Intelligence — Tightened Logic

## Before Writing Any Code
1. Find the existing discovery feed 
  and how tracks are currently 
  served to listeners
2. Find the existing audio_tracks 
  table and all relevant fields
3. Find the existing play tracking 
  system — how plays are currently 
  counted and stored
4. Find the existing tips table 
  and how tips are linked to tracks
5. Find the existing live_interest_responses 
  table built in a previous prompt
6. Find the existing genre and 
  location matching logic
7. Find the existing user preferences 
  and notification opt-in system
8. Report all findings before 
  making any changes

---

## Overview
Implement three layers of discovery 
intelligence that go beyond genre 
matching to build accurate audience 
profiles for each creator. These 
three layers work together to 
surface the right music to the 
right listeners and give creators 
actionable data about their 
real audience.

Layer 1 — Mood tags on tracks
Layer 2 — Listener quality signals
Layer 3 — Audience intelligence 
dashboard for creators

---

## Layer 1 — Mood Tags

### Upload form addition
Add a mood tag selector to the 
existing track upload form, 
displayed after the genre selector.

Label: "What mood does this track 
create?"

Multi-select — creator can choose 
up to 3 moods from this list:

Worshipful
Energetic
Reflective
Celebratory
Raw and honest
Uplifting
Melancholic
Peaceful
Intense
Romantic
Nostalgic
Motivational

Store selected moods as an array 
on the audio_tracks table:
mood_tags: text[] | null

### Listener mood preferences
Add mood preferences to the 
existing notification and 
discovery preferences screen.

Label: "What moods move you most?"

Same multi-select list as above.

Store on user preferences table:
preferred_moods: text[] | null

### Discovery matching update
Update the existing discovery 
feed query to include mood matching 
alongside existing genre and 
location matching.

Priority order for track serving:
1. Matches genre AND mood AND location
2. Matches genre AND mood
3. Matches genre AND location
4. Matches genre only

Tracks that match on more dimensions 
appear higher in the discovery feed.

---

## Layer 2 — Listener Quality Signals

### New table
Create a table to store aggregated 
quality signals per track:



track_quality_signals (
id: UUID primary key
track_id: UUID FK to audio_tracks
creator_id: UUID FK to profiles

total_plays: integer default 0
unique_listeners: integer default 0
repeat_listens: integer default 0

tip_count: integer default 0
tip_total_amount: decimal default 0
tip_rate: decimal default 0

live_interest_yes_count: integer default 0
live_interest_rate: decimal default 0

share_count: integer default 0
bookmark_count: integer default 0

quality_score: decimal default 0

updated_at: timestamptz
)


### Quality score calculation
The quality_score is calculated 
automatically whenever the underlying 
signals update. Use this formula:

quality_score = 
  (repeat_listens / total_plays * 40) +
  (tip_rate * 35) +
  (live_interest_rate * 15) +
  ((share_count + bookmark_count) / 
   unique_listeners * 10)

This produces a score between 0 
and 100 where:
- 40% weight: repeat listen rate 
  (most honest quality signal)
- 35% weight: tip rate 
  (financial validation)
- 15% weight: live interest rate 
  (fan demand signal)
- 10% weight: share and bookmark rate 
  (social validation)

Recalculate quality_score whenever 
any of the contributing signals 
are updated.

### How quality score affects discovery
Tracks with higher quality scores 
receive broader discovery exposure.

Score 0 to 30: served to opted-in 
listeners in creator's immediate 
location only

Score 31 to 60: served to opted-in 
listeners within expanded radius 
and similar genre listeners

Score 61 to 80: featured in genre 
discovery feeds beyond location

Score 81 to 100: eligible for 
platform-wide featured placement 
in discovery

This creates a natural meritocracy 
where quality rises organically 
based on genuine listener response, 
not paid promotion.

### Tracking repeat listens
A repeat listen is defined as the 
same user playing the same track 
more than once within a 30 day window.

Create a new table:



play_sessions (
id: UUID primary key
track_id: UUID FK to audio_tracks
user_id: UUID FK to profiles
played_at: timestamptz
play_duration_seconds: integer
completed: boolean
)


A play only counts as a valid play 
if the user listened for at least 
30 seconds or 50% of the track 
duration, whichever is less.

When a play is recorded check if 
the same user has played this track 
before within 30 days. If yes 
increment repeat_listens on 
track_quality_signals.

### Tracking audience similarity
When a listener engages with 
multiple tracks (tips, repeat listens, 
live interest) store a listener 
profile tag:



listener_genre_affinity (
id: UUID primary key
user_id: UUID FK to profiles
creator_id: UUID FK to profiles
affinity_score: decimal default 0
tips_sent: integer default 0
repeat_listens: integer default 0
live_interest_expressed: boolean default false
updated_at: timestamptz
)


When serving discovery recommendations 
find listeners who have high affinity 
with similar creators and serve them 
tracks from new creators with 
matching genre and mood profiles.

This is the audience similarity 
engine — fans who love Creator A 
and also engage with Creator B 
suggest that Creator B's new 
listeners might come from 
Creator A's audience.

---

## Layer 3 — Creator Audience 
## Intelligence Dashboard

Add a new section to the creator's 
existing analytics or profile 
dashboard called "Your Audience 
Intelligence."

This section is visible to all 
creators but depth of data is 
tiered by subscription:

### Free tier
Show a locked preview with 
upgrade prompt:

"Discover who your real audience 
is, where they are, and when they 
want to hear you live. Available 
on Premium and Unlimited."

Button: "Access Premium"

### Premium tier
Show the following metrics:

Track Performance Summary
For each uploaded track show:
- Total plays and unique listeners
- Repeat listen rate as percentage
- Tip rate as percentage
- Quality score out of 100
- Live interest count

Audience Location Overview
A list of cities where the creator's 
listeners are concentrated, ranked 
by engagement level, not just 
play count.

Format:
"Manchester — 23 engaged listeners
London — 18 engaged listeners
Lagos — 12 engaged listeners"

An engaged listener is defined as 
someone who has either tipped, 
repeated a listen, or expressed 
live interest.

Live Interest Summary
Total number of listeners who 
expressed live interest across 
all tracks.
Top 3 cities by live interest count.
Most common availability preference 
(weekends, weekday evenings, any time).

### Unlimited tier
Everything in Premium plus:

Audience Similarity Insights
"Listeners who engage with your 
music also engage with [Genre/Mood] 
creators. This suggests your 
audience responds to [specific 
characteristic]."

Optimal Event Timing
Based on availability preferences 
captured from live interest prompts:
"Your strongest audience availability 
is Saturday evenings. 67% of your 
live-interested listeners in 
Manchester prefer weekends."

Track Quality Breakdown
Full quality score breakdown per 
track showing each contributing 
signal and how it compares to 
the platform average for that genre.

Growth Signals
Month on month comparison of 
quality scores, repeat listen rates 
and tip rates to show whether 
audience engagement is improving.

---

## Post-Upload Guidance

When a creator successfully uploads 
a new track show a brief guidance 
card on the success screen:

"Your track is live. Here is how 
SoundBridge will find your audience:

Your music will be served to 
listeners who have opted in for 
[genre] and [mood] in [location].

As listeners engage we build a 
clearer picture of who loves your 
sound. Check your Audience 
Intelligence dashboard to see 
this data grow.

The more genuine the engagement, 
the further your music travels."

This educates creators on how 
the system works without 
overwhelming them.

---

## General Rules
- Quality score must never be 
  manually adjustable by creators
- A play under 30 seconds or 
  less than 50% of track duration 
  does not count
- Audience intelligence data 
  updates daily not in real time 
  to reduce database load
- All existing discovery and 
  genre matching logic remains 
  unchanged — this adds layers 
  on top of it
- Mood tags are optional on upload 
  but encouraged
- Do not expose quality scores 
  publicly — only creators can 
  see their own score
- Match existing design system throughout

---

## Acceptance Criteria

### Mood Tags
- [ ] mood_tags field added to 
      audio_tracks table
- [ ] Mood selector added to 
      upload form
- [ ] Preferred moods added to 
      user preferences
- [ ] Discovery feed query updated 
      to include mood matching
- [ ] Priority order correctly 
      implemented

### Quality Signals
- [ ] track_quality_signals table created
- [ ] play_sessions table created
- [ ] Play validity check works 
      (30 seconds or 50% minimum)
- [ ] Repeat listen detection works
- [ ] tip_rate calculates correctly
- [ ] live_interest_rate pulls from 
      existing live_interest_responses
- [ ] quality_score formula calculates 
      correctly
- [ ] quality_score recalculates on 
      signal updates
- [ ] Discovery exposure expands 
      with quality score correctly
- [ ] listener_genre_affinity table 
      created and updates correctly

### Audience Intelligence Dashboard
- [ ] Free tier shows locked preview 
      with upgrade prompt
- [ ] Premium tier shows track 
      performance summary
- [ ] Premium tier shows audience 
      location by engagement
- [ ] Premium tier shows live 
      interest summary
- [ ] Unlimited tier shows audience 
      similarity insights
- [ ] Unlimited tier shows optimal 
      event timing
- [ ] Unlimited tier shows quality 
      breakdown and growth signals
- [ ] Post upload guidance card 
      displays correctly
- [ ] Data updates daily
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
