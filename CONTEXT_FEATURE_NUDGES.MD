# Contextual Feature Nudges
# Psychologically Timed Suggestions Across Key Moments

## Before Writing Any Code
1. Find the existing MBG Sonics distribution prompt 
   and confirm whether the post-upload nudge specified 
   there was ever actually implemented, report this 
   first before building anything new
2. Find the existing track upload flow
3. Find the existing service marketplace booking 
   and payment flow
4. Find the existing onboarding and signup flow
5. Find the existing AI Career Adviser data access 
   function and creator activity data
6. Report findings before making any changes

---

## Overview
Add contextually timed nudges at key moments in the 
creator journey, each one only shown when genuinely 
appropriate, never as generic upsells.

---

## Part 1 — After First Track Upload

Immediately after a successful upload, show two 
nudges in sequence, not simultaneously, distribution 
first, AI Career Adviser deferred.

**Distribution nudge, shown immediately:**
"Get this track on Spotify and major platforms"
Button: "Distribute This Track"
Leads directly into the existing MBG Sonics 
distribution flow, pre-selecting this track.

**AI Career Adviser nudge, deferred:**
Do not show this immediately on first upload. Instead, 
trigger it once the creator has accumulated at least 
3 days of activity since their first upload, and at 
least one of the following has occurred: a tip 
received, a repeat listen recorded, or 20 plus plays 
total. Only then show:
"Curious how this is actually performing? Your AI 
Career Adviser has real insight now."
Button: "Check My Career Adviser"

If none of those conditions are met within 14 days, 
do not show this nudge for that track, the data 
simply was not there yet.

---

## Part 2 — After a Service Marketplace Booking 
## or Payment

When a creator completes a payment to another creator 
through the service marketplace, regardless of whether 
the full project is finished, show:

"Just worked with [Name]? If you have something new 
to share, promoting an event is free and goes straight 
to people in your city looking for exactly this."
Button: "Promote an Event"

---

## Part 3 — Immediately After Signup

Replace any generic "welcome" messaging with a direct, 
sequential checklist shown right after account creation:

"Let's get you set up properly"
1. Complete your profile
2. Set up your Service Provider Dashboard
3. Verify your identity

Each item links directly to that specific screen. Do 
not show this as a dismissible tip, show it as the 
actual first screen after signup, so nobody has to be 
manually walked through this individually going forward.

---

## General Rules
- Never show the AI Career Adviser nudge to a creator 
  with no qualifying activity yet
- Distribution nudge always fires immediately on upload, 
  no waiting period
- Event promotion nudges can fire freely regardless of 
  current platform size, no dependency on follower count
- Confirm with Cursor whether any of these nudges were 
  already partially built in a previous prompt before 
  duplicating work
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Confirmation received on whether the original 
      distribution nudge was already built before any 
      new work begins
- [ ] Distribution nudge fires immediately on every 
      first upload
- [ ] AI Career Adviser nudge only fires once 
      qualifying activity conditions are met
- [ ] AI Career Adviser nudge does not fire if no 
      conditions met within 14 days
- [ ] Service marketplace payment triggers event 
      promotion nudge correctly
- [ ] New signup checklist replaces generic welcome 
      messaging and links correctly to each screen
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
