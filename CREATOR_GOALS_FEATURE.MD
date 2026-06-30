# Creator Goals Feature

## Before Writing Any Code
1. Find the existing creator profile 
   screen on mobile and web
2. Find the existing fan landing page
3. Find the existing notification 
   system and how follower notifications 
   are currently sent
4. Find the existing tips and 
   transactions tables
5. Find how the feed currently 
   renders post and event cards
6. Find the existing modal system 
   in the mobile app
7. Report findings before making 
   any changes

---

## Overview
Build a Creator Goals feature that 
allows creators to set time-limited 
fundraising goals which their followers 
can support with a flexible minimum 
contribution starting at £1.

This is a fan relationship feature 
not a discovery feature. Notifications 
and nudges go to existing followers 
only — not to matched users who 
do not yet follow the creator.

---

## Part 1 — Creator Goal Setup

### Nudge to create a goal
Add a nudge card on the creator 
dashboard for creators who have 
not yet created a goal or whose 
last goal has ended.

Card content:
Icon: a small target or star icon
Headline: "Set a goal for something 
that matters"
Body: "Have your fans join you to 
make your dream come true. Whether 
it is recording time, new equipment, 
or a live event — your community 
wants to help."
Button: "Create a Goal"

Show this card once per week 
maximum. Do not show it if the 
creator has an active goal already.

### Goal creation screen
When the creator taps Create a Goal 
open a dedicated goal creation screen.

Fields:

**Goal title (required)**
Label: "What is your goal?"
Placeholder: "Recording studio session, 
New microphone, Live event in London..."
Character limit: 100 characters

**Goal description (required)**
Label: "Tell your fans why this matters"
Placeholder: "Describe what you are 
working toward and what it means 
for your music and your community..."
Character limit: 500 characters

**Target amount (required)**
Label: "How much do you need?"
Currency: £ (GBP)
Minimum: £10
No maximum

**Minimum support amount (required)**
Label: "Minimum support per fan"
Default: £1
Creator can set higher minimum 
if they choose
Cannot be set lower than £1

**Goal window (required)**
Label: "How long should this goal run?"
Three options as selectable pills:
- 7 days
- 14 days
- 30 days

**Fan reward (optional)**
Label: "What will you give your fans 
in return? (optional)"
Placeholder: "Early access to the 
recording, a personal shoutout, 
behind the scenes content..."
Character limit: 200 characters

**Publish button:**
"Launch My Goal"

On launch:
- Create goal record in database
- Trigger follower notifications 
  as described in Part 3
- Show goal on creator profile 
  as described in Part 2

---

## Part 2 — Goal Display

### On creator profile
Add a Creator Goal section to 
the creator profile screen on 
both mobile and web.

Position it prominently below 
the creator bio and above their 
music uploads.

Only show this section when the 
creator has an active goal. 
Hide it when no active goal exists.

**Goal card design:**

Goal title in bold at the top.

Progress bar below the title:
Full width. Fills left to right 
as contributions come in.
Show percentage complete above 
the bar: "73% funded"

Below the progress bar show 
three stats in a row:
- Amount raised: £847 raised
- Supporters: 847 fans
- Time left: 12 days left

Goal description below the stats 
in smaller text. Show first two 
lines with a "Read more" option.

Fan reward if set:
Small pill badge showing:
"Fans get: [reward text]"

Support button at the bottom:
"Support this goal — from £[minimum]"

Tapping the support button opens 
the contribution flow described 
in Part 4.

### On fan landing page
Show the active goal card on the 
creator's fan landing page 
(soundbridge.live/[username]/home) 
in the same design as above.

This means fans arriving via the 
creator's fan link see the goal 
immediately and can contribute 
even before or after their £1 tip.

---

## Part 3 — Notifications

### When a goal is launched
When a creator publishes a new goal 
send the following to all users 
who follow that creator:

**Push notification:**
Title: "[Creator Name] has a new goal"
Body: "[Creator Name] wants to 
[goal title]. Help them get there."

**In-app notification:**
Same content as push notification.
Tapping opens the creator profile 
showing the goal card.

Send to followers only. Do not 
send to users who simply match 
the creator by genre, mood or 
location but do not follow them.

### 48 hour reminder
When 48 hours remain on an active 
goal send a reminder notification 
to followers who have not yet 
contributed:

Push notification:
Title: "48 hours left"
Body: "[Creator Name]'s goal closes 
in 48 hours. Have you shown your 
support yet?"

Do not send this reminder to 
followers who have already contributed.

### Goal completed notification
When a goal reaches its target 
amount before the window closes 
send a celebration notification 
to all contributors:

Push notification:
Title: "Goal reached!"
Body: "[Creator Name]'s goal has 
been reached. You made it happen. 
Thank you 🙏🏾"

---

## Part 4 — Fan Nudge Modal

### When it appears
When a follower opens the app 
for the first time after a creator 
they follow has launched a new goal 
show a nudge modal.

Show this modal once per goal 
per user only.

### Modal design
Full screen modal or large bottom sheet.

Creator profile photo at the top 
as a circular avatar.

Headline:
"[Creator Name] has a goal"

Body — dynamically generated from 
the goal details:
"[Creator Name] wants to [goal title] 
[goal description first sentence]. 
Help them achieve their goal. 
Mind helping with just £[minimum amount]?"

Example:
"Love Abolade wants to get a 
recording studio space to record 
better songs and host her personal 
events for you. Help her achieve 
her goal. Mind helping with just £1?"

Progress bar showing current 
funding status.

Support amount input:
Pre-filled with the minimum amount.
User can tap and change to any 
higher amount.
Label: "You choose the amount. 
£[minimum] is just the start."

Primary button:
"Support [Creator Name]"

Secondary text link:
"Maybe later"

Tapping Maybe Later dismisses 
the modal. The goal remains 
visible on the creator's profile.

---

## Part 5 — Contribution Flow

### Payment
When a fan taps Support [Creator Name] 
from either the modal or the 
goal card on the profile:

Show a simple confirmation screen:

"You are supporting [Creator Name]'s goal:
[Goal title]

Amount: £[selected amount]

[Pay button]"

Process payment through existing 
Stripe flow.

On successful payment:
- Update goal amount raised
- Update supporter count
- Show thank you screen:
  "Thank you for supporting 
  [Creator Name]. You are one 
  of [number] fans helping make 
  this happen 🙏🏾"
- If fan reward is set show:
  "Your reward: [reward text]"

### Revenue split
Creator receives 85% of each 
contribution (Premium creator rate)
SoundBridge retains 15%
Referral commission of 10% paid 
from SoundBridge's 15% share 
where applicable

---

## Part 6 — Goal Completion and Expiry

### When goal reaches target
Mark goal as completed.
Send celebration notification 
to all contributors as described 
in Part 3.
Show a Completed badge on the 
goal card on the creator profile 
for 7 days after completion.
After 7 days hide the goal card.

### When window expires without 
### reaching target
Mark goal as expired.
Creator keeps all funds raised 
regardless of whether target 
was reached.
Show goal card as Closed on 
creator profile for 48 hours 
then hide.
Send a thank you notification 
to all contributors:
"[Creator Name]'s goal has closed. 
Thank you for your support. 
Every contribution counts 🙏🏾"

### Creator can only have one 
### active goal at a time
If a creator tries to create a 
new goal while one is active 
show a message:
"You already have an active goal. 
Your current goal must end before 
you can create a new one."

---

## Database Table



creator_goals (
id: UUID primary key
creator_id: UUID FK to profiles
title: text
description: text
target_amount: decimal
minimum_support: decimal default 1.00
amount_raised: decimal default 0
supporter_count: integer default 0
fan_reward: text | null
window_days: integer – 7, 14 or 30
starts_at: timestamptz
ends_at: timestamptz
status: text – ‘active’ ‘completed’ ‘expired’
created_at: timestamptz
)

goal_contributions (
id: UUID primary key
goal_id: UUID FK to creator_goals
fan_id: UUID FK to profiles
amount: decimal
contributed_at: timestamptz
)


---

## General Rules
- Notifications go to followers only
- Never notify non-followers about goals
- Creator can only have one active 
  goal at a time
- Creator keeps all funds regardless 
  of whether target is reached
- Minimum contribution is £1
- Fan nudge modal shows once per 
  goal per user only
- Match existing design system 
  throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Goal Creation
- [ ] Nudge card appears on creator 
      dashboard correctly
- [ ] Goal creation screen opens correctly
- [ ] All fields save correctly
- [ ] Goal publishes and appears 
      on profile immediately
- [ ] Creator cannot create second 
      goal while one is active

### Goal Display
- [ ] Goal card appears on creator 
      profile correctly
- [ ] Progress bar updates in real time
- [ ] Stats show correctly
- [ ] Fan reward badge shows when set
- [ ] Goal card hidden when no 
      active goal
- [ ] Goal card appears on fan 
      landing page

### Notifications
- [ ] Launch notification sent to 
      followers only on goal creation
- [ ] 48 hour reminder sent to 
      non-contributing followers only
- [ ] Completion notification sent 
      to contributors
- [ ] No notifications sent to 
      non-followers

### Fan Nudge Modal
- [ ] Modal appears on first app 
      open after goal launch
- [ ] Modal shows once per goal 
      per user only
- [ ] Creator name and goal details 
      populate correctly
- [ ] Amount input pre-filled 
      and editable
- [ ] Maybe Later dismisses correctly

### Contribution Flow
- [ ] Payment processes correctly
- [ ] Amount raised updates correctly
- [ ] Supporter count updates correctly
- [ ] Thank you screen shows correctly
- [ ] Fan reward shown if set
- [ ] Revenue split correct at 85/15

### Completion and Expiry
- [ ] Goal marked complete when 
      target reached
- [ ] Celebration notification sent
- [ ] Completed badge shows for 7 days
- [ ] Expiry handled correctly
- [ ] Creator keeps all funds on expiry
- [ ] Thank you notification on expiry

### General
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web


🙏🏾

## Notification Throttling for 
## Creator Goals

### Hard cap per fan
A fan must never receive more than:
- 1 Creator Goal notification per day
- 3 Creator Goal notifications per week

Once either cap is reached for that 
fan stop all further goal notifications 
for the remainder of that day or week 
regardless of how many creators 
they follow who have active goals.

Reset daily cap at midnight.
Reset weekly cap every Monday at midnight.

### Priority queue
When multiple creators followed 
by the same fan have active goals 
and the fan has not yet hit their 
cap, send notifications in this 
priority order:

Priority 1: Creators the fan has 
tipped at least once
Priority 2: Creators the fan has 
expressed live interest in
Priority 3: Creators the fan has 
listened to most recently
Priority 4: Goals expiring within 
48 hours regardless of creator tier

If two goals have the same priority 
level send the one with less time 
remaining first.

### Fan notification preference
Add a new setting to the notification 
preferences screen:

Label: "Creator Goals"
Subtext: "How often would you like 
to hear about goals from creators 
you follow?"

Three options as selectable pills:
- Up to 1 per day
- Up to 3 per week (default)
- Only from creators I have 
  supported before

Store on user preferences:
goal_notification_preference: text

The hard cap applies regardless 
of preference. The preference 
can only reduce frequency further 
not increase it beyond the hard cap.

### Goals still visible without 
### notification
If a fan's notification cap is 
reached and a creator they follow 
launches a goal the goal still 
appears on:
- The creator's profile
- The creator's fan landing page
- The feed when the fan visits 
  the creator's profile directly
- Any feed card from that creator

The fan can still discover and 
contribute to goals they were 
not notified about. The cap only 
limits push and in-app notifications 
not visibility.

### Fan nudge modal throttle
The fan nudge modal described 
in Part 4 follows the same cap.
If the daily or weekly cap has 
been reached do not show the 
modal for lower priority goals 
that day or week.
Show the modal for the highest 
priority goal that has not yet 
been shown.

## Acceptance Criteria additions
- [ ] Daily cap of 1 goal notification 
      per fan enforced correctly
- [ ] Weekly cap of 3 goal notifications 
      per fan enforced correctly
- [ ] Priority queue orders correctly 
      by tipping history then live 
      interest then recency then urgency
- [ ] Fan notification preference 
      setting added and works correctly
- [ ] Goals still visible in feed 
      and profile when cap is reached
- [ ] Modal throttle follows same cap
- [ ] Caps reset at correct times