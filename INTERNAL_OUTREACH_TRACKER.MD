
# Internal Outreach Tracker
# CRM-Style Pipeline, Restricted to Internal Team Only

## Before Writing Any Code
1. Find the existing profiles table structure
2. Find the existing push notification system and 
   how scheduled, time-based notifications are 
   currently handled, if at all, for example the 
   28-day visa fund reminders or similar
3. Find the existing Profile screen navigation 
   structure
4. Report findings before making any changes

---

## Overview
Build an internal outreach tracking feature, 
restricted to two specific accounts only. This is 
a checklist-style tracker per contact, not a 
drag-and-drop board, four independent status 
checkboxes per contact, plus meeting scheduling 
with a timed reminder notification.

---

## Part 1 — Access Control, Critical

Add to profiles table:
is_internal_team: boolean default false
Run a one-time manual update to set this true only 
for the two accounts:
asibechetachukwu@gmail.com
merituche2003@gmail.com

Do not hardcode these email addresses anywhere in 
the app's client-side code at any point. The screen 
and its navigation entry point must only render if 
the currently logged in user's is_internal_team 
field is true, checked via the existing auth and 
profile fetch logic, never by comparing email strings 
in the app itself.

If a user without this flag somehow navigates to the 
route directly, redirect to the home screen or test feed screen with no 
error message indicating the feature exists.

---

## Part 2 — Entry Point

Add a hidden entry point on the Profile screen, only 
rendered when is_internal_team is true:

Label: "Outreach Tracker"

Position it at the very bottom of the Profile screen, 
below all standard creator tools, visually no 
different in style from other settings rows so it 
does not stand out to anyone who should not see it.

---

## Part 3 — Database

outreach_contacts ( id: UUID primary key contact_name: text organisation_name: text | null contact_type: text – ‘institution’ ‘artist’ ‘venue’ ‘church’ – ‘other’ notes: text | null meeting_held: boolean default false on_platform: boolean default false profile_completed: boolean default false has_invited_others: boolean default false created_by: UUID FK to profiles created_at: timestamptz updated_at: timestamptz )
outreach_meetings ( id: UUID primary key contact_id: UUID FK to outreach_contacts scheduled_at: timestamptz meeting_link_or_location: text | null reminder_sent: boolean default false created_by: UUID FK to profiles created_at: timestamptz )
---

## Part 4 — Outreach Tracker Screen

### Contact list
A scrollable list of contact cards, most recently 
updated first.

Each card shows:
- Contact name
- Organisation name if provided
- Contact type as a small tag
- Four checkboxes, each tappable directly from the 
  card without opening it:
  - "Meeting held"
  - "On platform"
  - "Profile completed"
  - "Invited others"
- A small progress indicator showing how many of 
  the four are checked, for example "2 of 4"

### Search and filter
A search field by contact name or organisation.
Filter pills by contact type.
Filter toggle: "Show completed only" or 
"Show in progress only" based on whether all four 
checkboxes are ticked.

### Add new contact
A floating add button opens a simple form:
Contact name (required)
Organisation name (optional)
Contact type (required, select from list)
Notes (optional)

### Contact detail view
Tapping a card opens a detail screen showing all 
fields, editable notes field, the four checkboxes 
in larger form with timestamps showing when each 
was last toggled, and a section to schedule a meeting.

---

## Part 5 — Meeting Scheduling and Reminder

### Scheduling
From the contact detail screen, "Schedule a meeting":
Date and time picker
Optional meeting link or location field

Creates an outreach_meetings record.

### Reminder notification
Run a background job checking upcoming meetings 
every few minutes.

When the current time reaches exactly 90 minutes 
before scheduled_at, and reminder_sent is false, 
send a push notification to both internal accounts, 
regardless of who created the meeting:

Title: "Meeting in 90 minutes"
Body: "[Contact Name] at [time]. [Meeting link or 
location if provided]."

Set reminder_sent to true immediately after sending 
so it never fires twice.

### Upcoming meetings view
Add a small section at the top of the Outreach 
Tracker screen showing the next 3 upcoming meetings 
across all contacts, sorted by soonest first, each 
tappable to jump straight to that contact's detail screen.

---

## General Rules
- Access strictly limited via the is_internal_team 
  database flag, never via hardcoded email checks 
  in client code
- Both internal accounts receive every meeting 
  reminder, regardless of who scheduled it
- This screen and its data must never appear to any 
  other user under any circumstance
- Match existing design system throughout
- Test on iOS and Android

---

## Acceptance Criteria
- [ ] is_internal_team flag added to profiles, set 
      correctly for the two specified accounts only
- [ ] Outreach Tracker entry point visible only to 
      flagged accounts
- [ ] Non-flagged users cannot access the screen 
      even via direct navigation
- [ ] Contact list displays correctly with working 
      checkboxes
- [ ] Search and filters work correctly
- [ ] Add new contact form works correctly
- [ ] Contact detail view displays and saves 
      correctly
- [ ] Meeting scheduling works correctly
- [ ] Reminder notification fires exactly 90 minutes 
      before scheduled time, to both internal accounts
- [ ] reminder_sent prevents duplicate notifications
- [ ] Upcoming meetings section displays correctly
- [ ] No existing functionality broken
- [ ] Tested on iOS and Android
🙏🏾
