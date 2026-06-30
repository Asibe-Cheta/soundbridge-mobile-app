# Calendar Integration — Google Calendar
# Availability and Event Intelligence

## Before Writing Any Code
1. Find the existing user preferences 
  and settings screen in the mobile app
2. Find the existing user_behaviour_profiles 
  table built in a previous prompt
3. Find the existing live_interest_responses 
  table and demand-led event creation system
4. Find how push notifications are 
  currently sent and what data they use
5. Find the existing event creation flow
6. Check if any OAuth or third party 
  authentication is already implemented
7. Report findings before making 
  any changes

---

## Overview
Allow users to optionally connect their 
Google Calendar to SoundBridge. When 
connected SoundBridge uses availability 
data only — never event content — to:

1. Send smarter event notifications 
  that match when the user is actually free
2. Feed aggregate availability patterns 
  into the demand-led event creation 
  system so creators know when their 
  fans are available
3. Update the user behaviour profile 
  with general availability patterns

This is entirely opt-in. Never accessed 
without explicit user consent. Never 
reads event titles, descriptions or 
attendees. Only reads free and busy 
time slots.

---

## Part 1 — Connect Google Calendar

### Entry point
Add a new section to the user's 
settings screen called 
"Connected Apps"

Show a Google Calendar connection card:

Icon: Google Calendar logo
Title: "Google Calendar"
Description: "Help SoundBridge find 
events that fit your schedule. 
We only check when you are free — 
never what your events are about."

Button: "Connect Google Calendar"

### OAuth flow
When the user taps Connect:

1. Trigger Google OAuth consent screen
2. Request only the following scope:
  https://www.googleapis.com/auth/calendar.freebusy
  
  This scope allows SoundBridge to 
  check free and busy times only.
  It does NOT allow reading event 
  titles, descriptions, attendees 
  or any personal event content.

3. On successful auth store:
  - Google OAuth access token 
    (encrypted in database)
  - Google OAuth refresh token 
    (encrypted in database)
  - Token expiry timestamp
  - calendar_connected: true
  - calendar_connected_at: timestamptz

4. Show confirmation:
  "Google Calendar connected. 
  SoundBridge will now find events 
  that fit around your schedule."

### Disconnect option
After connecting show a Disconnect 
button on the same settings card.

On disconnect:
- Revoke the OAuth token with Google
- Delete all stored tokens from database
- Set calendar_connected to false
- Delete any stored availability 
 patterns from user_behaviour_profiles
- Show confirmation:
 "Google Calendar disconnected. 
 Your calendar data has been removed."

### Database additions
Add to profiles or a new 
calendar_integrations table:



calendar_integrations (
user_id: UUID primary key FK to profiles
provider: text default ‘google’
access_token: text encrypted
refresh_token: text encrypted
token_expires_at: timestamptz
calendar_connected: boolean default false
calendar_connected_at: timestamptz | null
last_synced_at: timestamptz | null
)


---

## Part 2 — Availability Checking

### How it works
When SoundBridge is about to send 
an event notification to a user 
who has connected their Google Calendar:

1. Call Google Calendar FreeBusy API 
   for that user for the event date 
   and time window
2. If the user is free: send the 
   notification as normal
3. If the user is busy: hold the 
   notification and check again 
   24 hours before the event
4. If still busy 24 hours before: 
   do not send the notification

This means users only receive event 
notifications for times they are 
actually available. No spam. 
No irrelevant suggestions.

### FreeBusy API call
Use the Google Calendar FreeBusy API:
POST https://www.googleapis.com/calendar/v3/freeBusy

Request only the primary calendar 
for the time window of the event 
plus 2 hours either side.

Do not store the raw API response. 
Only store the binary result — 
free or busy — for that time slot.

### Refresh token handling
Access tokens expire after 1 hour. 
Use the refresh token to obtain 
a new access token automatically 
before any FreeBusy API call.

If the refresh token is invalid 
or revoked by the user on Google's 
side, set calendar_connected to false 
and notify the user in-app that 
their calendar connection needs 
to be renewed.

---

## Part 3 — Availability Pattern 
## Learning

### Weekly availability patterns
After 4 weeks of calendar data 
build a general availability pattern 
for each connected user without 
storing any specific event data.

Store only aggregate patterns 
in user_behaviour_profiles:



calendar_free_days: text[]
– e.g. [‘Saturday’, ‘Sunday’]

calendar_free_times: text[]
– e.g. [‘Evening’, ‘Afternoon’]

calendar_pattern_confidence: decimal
– 0 to 1, increases with more data

calendar_pattern_updated_at: timestamptz


These patterns are derived from 
checking free and busy slots across 
4 weeks. No individual event data 
is ever stored.

### How patterns are used
The availability pattern feeds into 
the demand-led event creation system.

When a creator views their poll 
response dashboard the availability 
insight now shows:

"Based on calendar availability 
data from your interested listeners, 
Saturday evenings have the highest 
free slot rate at 78%."

This is more accurate than the 
self-reported availability from 
poll responses because it is 
derived from actual calendar data.

---

## Part 4 — Privacy and Transparency

### In-app privacy notice
When the user taps Connect Google Calendar 
show a clear privacy notice before 
the OAuth screen:

"What SoundBridge accesses:
Only your free and busy times.

What SoundBridge never accesses:
Event names, descriptions, locations, 
attendees or any other details.

How we use it:
To recommend events that fit your 
schedule and help artists plan 
performances when you are free.

You can disconnect at any time 
from Settings."

The user must tap "I understand, 
continue" before the OAuth screen 
appears.

### Privacy policy update
Flag to Justice that the Privacy 
Policy at soundbridge.live/legal/privacy 
needs to be updated to include 
Google Calendar integration and 
the FreeBusy scope before this 
feature goes live. Do not go live 
without this update.

---

## Part 5 — Settings Screen Update

Update the connected apps section 
to show connection status clearly:

Connected state:
Green indicator dot
"Google Calendar — Connected"
"Last synced: [time]"
"Disconnect" button

Disconnected state:
Grey indicator dot
"Google Calendar — Not connected"
"Connect Google Calendar" button

---

## General Rules
- Calendar connection is entirely 
  opt-in — never prompted aggressively
- Only FreeBusy scope requested — 
  never more permissions than needed
- Never store event titles, descriptions 
  or attendee data under any circumstances
- Refresh tokens stored encrypted 
  in database
- Disconnect fully revokes all 
  tokens and deletes all calendar data
- GDPR compliant — explicit consent 
  before any data access
- Privacy policy must be updated 
  before feature goes live
- Match existing design system throughout
- Test on iOS and Android

---

## Acceptance Criteria

### Connection Flow
- [ ] Connected Apps section added 
      to settings screen
- [ ] Google Calendar card displays 
      correctly in disconnected state
- [ ] Privacy notice shown before 
      OAuth screen
- [ ] OAuth flow completes correctly
- [ ] Only FreeBusy scope requested
- [ ] Tokens stored encrypted in database
- [ ] Connected state displays correctly 
      with last synced time
- [ ] Disconnect revokes token correctly
- [ ] Disconnect deletes all stored 
      data correctly
- [ ] Disconnected state shows correctly 
      after disconnect

### Availability Checking
- [ ] FreeBusy API called before 
      sending event notifications
- [ ] Notifications held when user 
      is busy
- [ ] Notifications sent when user 
      is free
- [ ] 24 hour recheck works correctly
- [ ] Token refresh works automatically
- [ ] Invalid token handled gracefully 
      with in-app notification

### Availability Patterns
- [ ] Pattern calculation runs after 
      4 weeks of data
- [ ] Only aggregate patterns stored 
      not individual events
- [ ] calendar_free_days and 
      calendar_free_times update correctly
- [ ] Demand-led event dashboard shows 
      calendar-derived availability insight

### Privacy
- [ ] Privacy notice displays before 
      OAuth screen
- [ ] I understand button required 
      before proceeding
- [ ] No event content ever stored
- [ ] Justice notified to update 
      Privacy Policy before going live

### General
- [ ] No existing functionality broken
- [ ] Tested on iOS and Android


🙏🏾