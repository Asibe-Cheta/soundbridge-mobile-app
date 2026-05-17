# Engagement Notification System — Educational & Growth Nudges

## Before Writing Any Code
1. Find the existing push notification system 
   in the codebase
2. Find how existing nudges are stored and 
   dismissed per user
3. Find the existing deep linking system 
   to understand how notifications currently 
   navigate to specific screens
4. Find the existing events creation screen 
   and upload screen
5. Report findings before making any changes

---

## Overview
Create a new set of educational and growth 
focused push notifications that inform creators 
about SoundBridge features and opportunities. 
Each notification taps through to a dedicated 
in-app screen that explains the topic in detail 
with links to relevant action screens.

All notifications follow existing dismissal rules:
- Fire once per user only
- Never repeat after dismissal
- Store dismissal state per user in database
- No more than one nudge per session

---

## Part 1 — Monthly Payout Notifications

### Notification 1A — Monthly Payout Awareness
Trigger: User has been on platform 3 days 
and has not seen this notification yet

Title: "SoundBridge pays creators every month"
Body: "The creator with the highest plays this 
month gets paid directly by SoundBridge. 
Are you in the running?"

Deep link: Opens Payout Info Screen (see below)

### Notification 1B — Share to Win Plays
Trigger: User has uploaded at least one track 
but has fewer than 50 plays

Title: "More plays = more chance to get paid"
Body: "Share your SoundBridge profile on 
Instagram and WhatsApp. Every play counts 
toward this month's SoundBridge payout."

Deep link: Opens Payout Info Screen

### Notification 1C — WhatsApp Conversion
Trigger: User has been active for 7 days

Title: "Turn your contacts into listeners"
Body: "Share your SoundBridge profile link 
on WhatsApp today. Your contacts can listen 
to your music for free and tip you directly. 
Every play brings you closer to this month's 
SoundBridge payout."

Deep link: Opens user's own profile share screen

---

## Payout Info Screen
Create a new in-app screen accessible from 
all payout notifications.

Screen content:
- Headline: "Get Paid by SoundBridge Every Month"
- Body: Explain the monthly payout system. 
  SoundBridge pays out to the creator with 
  the highest plays every month. The more 
  people listen to your music on SoundBridge 
  the higher your chance of winning.
- How to increase your plays section:
  - Share your profile on Instagram
  - Share your link on WhatsApp
  - Tell your fans your music is on SoundBridge
  - Upload more tracks
- CTA button: "Share My Profile" 
  (opens native share sheet with profile link)
- Secondary link: "Upload a Track" 
  (deep links to upload screen)

---

## Part 2 — Event Promotion Notifications

### Notification 2A — No More Ad Spend
Trigger: User has never created an event 
on SoundBridge

Title: "Stop paying for event ads"
Body: "SoundBridge promotes your events for 
free to people who already love your genre 
in your city. No ad spend needed."

Deep link: Opens Event Promotion Info Screen

### Notification 2B — Smart Audience Matching
Trigger: User has created a profile with 
genre and location but no events

Title: "Your audience is already here"
Body: "SoundBridge matches your events to 
listeners in your area who have opted in 
for your genre. Post your next event and 
we will do the rest."

Deep link: Opens Event Promotion Info Screen

### Notification 2C — Event Reminder
Trigger: User has not created an event 
in 30 days

Title: "Got a show coming up?"
Body: "Post it on SoundBridge. We will 
promote it to the right people in your 
city automatically and for free."

Deep link: Opens Event Promotion Info Screen

---

## Event Promotion Info Screen
Create a new in-app screen accessible from 
all event promotion notifications.

Screen content:
- Headline: "Free Event Promotion. No Ads. No Spend."
- Body: Explain how SoundBridge event promotion 
  works. When you create an event on SoundBridge 
  we automatically notify users in your area 
  who have opted in for your genre. No Facebook 
  ads. No Instagram spend. Just intelligent 
  promotion to the right people.
- Why it works section:
  - Location matched to your event venue
  - Genre matched to your audience
  - Fans already opted in and looking for events
  - Free for all creators on SoundBridge
- CTA button: "Create My Event" 
  (deep links to event creation screen)
- Secondary link: "See My Upcoming Events" 
  (deep links to user's event management screen)

---

## Part 3 — Coming Soon Notifications

### Notification 3A — Event Sponsorship Teaser
Trigger: User has been on platform 14 days

Title: "SoundBridge is coming to your city"
Body: "We will soon be sponsoring live music 
events across the UK and Nigeria. Keep 
sharing SoundBridge and stay tuned."

Deep link: Opens Coming Soon Screen

### Notification 3B — Music Competition Teaser
Trigger: User has uploaded at least one track

Title: "Music competitions are coming"
Body: "SoundBridge will be hosting music 
competitions with real prizes. The more 
you grow this community the sooner it 
happens. Share the platform today."

Deep link: Opens Coming Soon Screen

### Notification 3C — Growth Milestone Nudge
Trigger: Fires when platform hits specific 
user milestones (1000, 2000, 5000 users)
This one fires to ALL users not just once

Title: "We just hit [X] users on SoundBridge"
Body: "The network is growing. The bigger 
it gets the more powerful it becomes for 
every creator here. Share it with one 
person today."

Deep link: Opens user's own profile share screen

---

## Coming Soon Screen
Create a new in-app screen accessible from 
coming soon notifications.

Screen content:
- Headline: "Big Things Are Coming to SoundBridge"
- Three sections with icons:

Section 1 — Event Sponsorship:
"SoundBridge will sponsor live music events 
across the UK and Nigeria. Your next show 
could be supported by us."

Section 2 — Music Competitions:
"We are building competitions where creators 
compete, fans vote, and winners earn real 
prizes. Coming soon."

Section 3 — AI Career Adviser:
"Your personal AI adviser that analyses 
your data and tells you exactly what to 
do next to grow your music career. 
Unlocks at 2,000 users."

- Progress bar showing current users vs 
  2,000 user milestone
- CTA button: "Share SoundBridge Now" 
  (opens native share sheet)
- Secondary link: "Invite a Friend" 
  (opens profile share screen)

---

## General Rules for All Screens
- Match existing app design system exactly
- All screens must have a back button
- All CTA buttons use existing button styles
- All deep links use existing navigation system
- Screens must work on iOS, Android and web
- Do not create new navigation patterns

## Acceptance Criteria
- [ ] All 9 notifications implemented with 
      correct triggers
- [ ] All notifications deep link to correct screens
- [ ] Payout Info Screen created with share 
      and upload CTAs
- [ ] Event Promotion Info Screen created 
      with event creation CTA
- [ ] Coming Soon Screen created with 
      progress bar and share CTA
- [ ] All dismissal states stored per user
- [ ] Milestone notification fires to all 
      users at correct thresholds
- [ ] No existing notification logic broken
- [ ] Tested on iOS and Android
