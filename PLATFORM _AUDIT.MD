# Platform Engagement Audit & Nudge System

## Before Writing Any Code
1. Audit the entire notification and push notification system 
   currently in the codebase
2. Audit how events are currently created and how event 
   promotion notifications are triggered
3. Audit how music/tracks are currently distributed to 
   listeners and whether genre filtering is applied
4. Audit what onboarding nudges or modals currently exist 
   if any
5. Report findings before making any changes

---

## Part 1 — Event Promotion Audit

### Questions to answer:
- When a creator posts an event, does the system send push 
  notifications to nearby users who have opted in for that 
  genre?
- Is location used to determine who receives the event 
  notification?
- Is genre matching applied so only relevant users are 
  notified?
- If these are not working, fix them

### Additional nudges to implement for events:
If not already present, add the following proactive nudges:

Nudge A — Creator has not posted an event in 30 days:
"Have you got a show coming up? Promote your next event 
on SoundBridge for free and we'll send it to the right 
audience in your area."
Buttons: "Post an Event" | "Maybe Later"

Nudge B — Creator has never posted an event:
"Did you know you can promote your events here for free? 
No ad spend. We send it directly to people in your area 
who love your genre."
Buttons: "Try It Now" | "Got It"

Each nudge fires once per user only. Once dismissed it 
never appears again. Store dismissal state per user in 
the database.

---

## Part 2 — Music Distribution Audit

### Questions to answer:
- When a creator uploads a track, is it shown only to 
  users who have opted in for that specific genre or 
  podcast category?
- Or is it shown to everyone regardless of preference?
- Is there a genre/category preference system for 
  listeners currently in the app?
- If genre filtering is not applied to music distribution 
  and discovery feeds, implement it so that:
  - Tracks are surfaced to users who have opted in for 
    that genre
  - Podcast content is surfaced only to users who have 
    opted in for podcasts
  - Users who have not set preferences see a mixed 
    discovery feed with a prompt to set their preferences

---

## Part 3 — First Track Upload Nudge

If a creator has registered but has not uploaded any 
track after 48 hours, send a push notification:

"You haven't uploaded your first track yet. Upload now 
and we'll promote it to listeners who are already looking 
for your sound."
Buttons: "Upload Now" | "Later"

This fires once only. Never repeat after dismissal.

---

## Part 4 — Fan Nudges (Non-Creator Users)

For users who are listeners rather than creators, 
implement the following:

When a new track is uploaded by a creator whose genre 
matches the listener's preferences, send a push 
notification:

"New music just dropped in [Genre]. [Creator Name] just 
uploaded a new track we think you'll love. Give it a 
listen and show some love."
Buttons: "Listen Now" | "Maybe Later"

If the listener plays the track for more than 30 seconds, 
show a subtle in-app prompt:
"Enjoying this? You can tip [Creator Name] from £1. 
Every tip goes directly to them."
Buttons: "Send a Tip" | "Maybe Later"

---

## Part 5 — Venue & Gig Discovery Nudges

If not already present, implement the following 
proactive nudges for creators:

Nudge A — Creator has never searched for a venue:
"Looking for a venue for your next show? We can help 
you find one that fits your budget and location."
Buttons: "Find a Venue" | "Got It"

Nudge B — Creator has never posted a gig or urgent 
gig request:
"Do you need a drummer, guitarist, or sound engineer 
for your next session? Post a gig and connect with 
the right professional instantly."
Buttons: "Post a Gig" | "Maybe Later"

Nudge C — General discovery prompt for creators:
"Are you looking for collaborators, session musicians, 
or producers near you? Check out who's available on 
SoundBridge right now."
Buttons: "Explore" | "Got It"

---

## General Rules for All Nudges
- Every nudge fires once per user maximum
- Once dismissed it never appears again
- Store all dismissal states in the database per user
- Never show more than one nudge per session on the 
  same screen
- All nudge copy must match the existing app tone 
  and design system
- Nudge modals must match existing modal styles 
  in the codebase

---

## Acceptance Criteria
- [ ] Event promotion confirmed working with location 
      and genre matching
- [ ] Music distribution confirmed filtered by genre 
      preference
- [ ] First track upload nudge implemented
- [ ] Fan music discovery nudge implemented
- [ ] Fan tip prompt after 30 seconds listening 
      implemented
- [ ] Venue discovery nudge implemented
- [ ] Gig posting nudge implemented
- [ ] All dismissal states stored per user
- [ ] No existing functionality broken
- [ ] Tested on iOS and Android