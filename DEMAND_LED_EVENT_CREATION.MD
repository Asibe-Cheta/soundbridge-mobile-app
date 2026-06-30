# Demand-Led Event Creation System

## Before Writing Any Code
1. Find the existing live_interest_responses 
   table built previously
2. Find the existing DM or messaging 
   system in the mobile app
3. Find the existing event creation flow
4. Find how push notifications are 
   currently sent
5. Find the existing creator follower 
   count data
6. Find the existing notification 
   preferences system
7. Report findings before making 
   any changes

---

## Overview
Build a demand-led event creation system 
that uses live interest data to help 
creators identify when enough listeners 
want to hear them live, automatically 
message those listeners with a date and 
location poll, aggregate the responses, 
and recommend the optimal event setup 
based on real audience data.

This feature is Premium and Unlimited only 
for the DM poll and response dashboard. 
Live interest collection remains free 
for all users.

---

## Part 1 — Significant Interest Threshold

### Threshold calculation
Monitor live_interest_responses per creator 
continuously. When the following condition 
is met for any single track or cumulatively 
across all tracks by the same creator, 
trigger the notification:

Trigger when EITHER condition is met:
- Live interest yes responses reach 15% 
  or more of the creator's total follower 
  count on SoundBridge
- OR absolute minimum of 25 yes responses 
  is reached across any track or tracks

Check this threshold daily in a background 
job. Once triggered for a creator, do not 
trigger again for 30 days to prevent 
notification fatigue.

### Creator in-app notification
When threshold is met send an in-app 
notification to the creator:

Title: "Your audience wants you live"

Body: "[Number] people have said they 
want to hear your music live. It is 
time to ask them when and where."

Deep link: Opens the Event Poll Setup 
screen described in Part 2.

Also send a push notification with 
the same content if the creator has 
push notifications enabled.

---

## Part 2 — Event Poll Setup Screen

### Screen layout

Header: "Ask your audience when 
and where"

Subheader: "[Number] listeners want 
to hear you live. Send them a poll 
to find the best date and location."

### Message preview section
Show a preview of the DM that will 
be sent to interested listeners. 
The message is pre-written but 
editable:

Default message:
"Hey, you mentioned you wanted to 
hear [Track Name] live. I am thinking 
of making it happen. Help me pick 
the best date and place.

[Poll options appear below]

[Artist Name]"

If live interest spans multiple tracks 
use the track with the most yes 
responses in the message.

The creator can edit the message body 
but the poll options are inserted 
automatically below it.

### Date options section
Label: "Add up to 4 date options"

Up to 4 date pickers. Minimum 1 required.
Each date option shows as a selectable 
poll option in the DM.

### Location options section
Label: "Add up to 3 location options"

Up to 3 text inputs for city or venue 
name. Minimum 1 required.
Each location shows as a selectable 
poll option in the DM.

### Poll format in the DM
The poll in the DM shows as a 
combination of date and location:

Example:
Option A: Manchester — Saturday 14 June
Option B: Manchester — Saturday 21 June
Option C: London — Saturday 14 June

The system generates all combinations 
of dates and locations automatically. 
Maximum 6 combinations shown.

Recipients tap one option in the DM 
to cast their vote.

### Recipients
The DM poll is sent to every user who 
responded yes to the live interest 
prompt for any track by this creator.

Show the creator how many people will 
receive the poll before they send.

### Send button
"Send Poll to [Number] Listeners"

On send:
- Create a poll_campaigns record 
  in the database
- Dispatch the DM to all recipients
- Show confirmation: "Your poll has 
  been sent. Check back to see 
  the responses."

---

## Part 3 — Poll Response Database



poll_campaigns (
id: UUID primary key
creator_id: UUID FK to profiles
message_body: text
date_options: text[]
location_options: text[]
combined_options: JSON
total_recipients: integer
total_responses: integer default 0
sent_at: timestamptz
expires_at: timestamptz – 14 days after sending
status: ‘active’ | ‘expired’ | ‘completed’
created_at: timestamptz
)

poll_responses (
id: UUID primary key
campaign_id: UUID FK to poll_campaigns
user_id: UUID FK to profiles
selected_option: text – the date+location combo
selected_date: text
selected_location: text
responded_at: timestamptz
)


---

## Part 4 — Poll Response Dashboard

Add a new section to the creator's 
analytics or dashboard called 
"Event Poll Results" visible when 
they have an active or completed 
poll campaign.

### What to show

Response summary:
- Total sent vs total responded
- Response rate as percentage

Winning combination:
Highlight the date and location 
combination with the most votes:

"Manchester on Saturday 14 June 
is your strongest option.
67% of respondents chose this."

Full breakdown:
A bar chart or ranked list showing 
all combinations and their vote 
percentages.

Location breakdown:
If one city appears across multiple 
date options, aggregate its total 
votes:

"Manchester: 78 total votes across 
all date options."

Availability insight:
Pull from existing availability 
preference data captured during 
live interest prompts:

"Most of your interested listeners 
in Manchester are available on 
weekends."

### CTA at bottom of dashboard
"Ready to make it official?"

Button: "Create This Event"

Tapping pre-fills the event creation 
form with the winning date and 
location from the poll results.

---

## Part 5 — Push Notification for 
## Live Interest (Enhancement)

Add a push notification layer to 
the existing live interest prompt 
system.

When a user completes a second 
full listen of the same track 
(as defined by play_sessions — 
30 seconds minimum or 50% of 
track duration):

If the track has live_interest_enabled 
set to true and the user has not 
yet been shown the live interest 
prompt for this track:

Send a push notification:

Title: "[Artist Name]"
Body: "You have listened to 
[Track Name] twice. Would you 
like to hear it live?"

Tapping the notification opens 
the music player with the live 
interest prompt visible and 
ready to respond.

Rules:
- Maximum one push notification 
  per track per user ever
- Only fires if user has SoundBridge 
  push notifications enabled
- Only fires after second complete 
  listen as defined above
- Never fires for the same track 
  twice regardless of any settings
- The in-app prompt still appears 
  as normal — the push notification 
  is an additional layer only

---

## Tier Gating

Free users:
- Live interest collection works normally
- Cannot access Event Poll Setup screen
- Cannot send polls to listeners
- Cannot view Poll Response Dashboard
- When they navigate to these features 
  show upgrade prompt:
  "Send a poll to your interested 
  listeners and find out exactly 
  when and where to perform. 
  Available on Premium and Unlimited."
  Button: "Access Premium"

Premium and Unlimited users:
Full access to all features in 
this prompt.

---

## General Rules
- Poll expires 14 days after sending
- Creator can only have one active 
  poll campaign at a time
- Threshold check runs as a daily 
  background job
- Do not trigger threshold notification 
  more than once per 30 days per creator
- DMs sent as part of poll campaign 
  should be clearly marked as 
  from the artist not from SoundBridge
- Music playback never affected
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Threshold System
- [ ] Daily background job checks 
      threshold correctly
- [ ] 15% of followers OR 25 absolute 
      responses triggers notification
- [ ] Creator in-app notification 
      fires correctly
- [ ] Push notification fires if 
      enabled
- [ ] Threshold not triggered more 
      than once per 30 days

### Poll Setup
- [ ] Event Poll Setup screen displays 
      correctly
- [ ] Message preview editable
- [ ] Up to 4 date options work
- [ ] Up to 3 location options work
- [ ] All date and location combinations 
      generated correctly
- [ ] Recipient count shown before sending
- [ ] Poll dispatched as DM to all 
      recipients
- [ ] poll_campaigns record created
- [ ] Confirmation shown after send

### Response Dashboard
- [ ] Response summary displays correctly
- [ ] Winning combination highlighted
- [ ] Full breakdown shows all options 
      and vote percentages
- [ ] Location aggregation works correctly
- [ ] Availability insight pulled from 
      existing data
- [ ] Create This Event CTA pre-fills 
      event creation form correctly

### Push Notification Enhancement
- [ ] Push notification fires after 
      second complete listen
- [ ] Only fires once per track per user
- [ ] Tapping opens music player with 
      live interest prompt visible
- [ ] In-app prompt unaffected

### Tier Gating
- [ ] Free users see upgrade prompt 
      on poll features
- [ ] Premium and Unlimited have 
      full access
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web


🙏🏾