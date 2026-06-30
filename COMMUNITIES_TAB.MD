# Communities Tab — Connect Screen

## Before Writing Any Code
1. Find the existing Connect screen 
  in the mobile app codebase
2. Find what tabs currently exist 
  on the Connect screen — 
  Connections, Opportunities, etc
3. Find how follows and community 
  memberships are currently stored 
  in the database
4. Find how the creator profile 
  screen is currently structured
5. Find how member counts or 
  follower counts are currently 
  calculated
6. Find how music uploads, events 
  and posts are currently fetched 
  per creator
7. Report findings before making 
  any changes

---

## Overview
Add a Communities tab to the existing 
Connect screen.

This tab shows the current user 
a list of all creator communities 
they belong to — meaning all creators 
they follow or have tipped at least 
once.

Tapping any community opens a 
dedicated Community Screen for 
that creator.

---

## Part 1 — Communities Tab

### Tab addition
Add a new tab to the Connect screen:

Existing tabs remain unchanged.
New tab label: "Communities"
Position: add after the existing 
last tab on the Connect screen.

### Communities list
The Communities tab shows a 
scrollable list of creator 
communities the current user 
belongs to.

A user belongs to a community if:
- They follow that creator
OR
- They have tipped that creator 
 at least once

### Community list item design
Each item in the list shows:

Creator profile photo — circular avatar
Creator display name in bold
Creator genre tag in small muted text
Member count: "[number] members"
A right chevron indicating it is tappable

Sort order:
Show communities where the user 
has tipped the creator first 
(most financially invested).
Then show communities where the 
user only follows, sorted by 
most recently followed.

### Empty state
If the user has not followed or 
tipped any creator show:

"You have not joined any communities yet.

Discover creators and follow them 
to join their community."

Button: "Discover Creators"
Tapping navigates to the discovery 
or feed screen.

---

## Part 2 — Community Screen

When a user taps any community 
in the list open a dedicated 
Community Screen for that creator.

This is a focused version of the 
creator's profile framed as a 
community space the fan belongs 
to rather than a profile they 
are visiting.

### Community Screen sections 
### from top to bottom:

**Header**
Creator profile photo — large circular
Creator display name in bold large text
Genre tag
Short bio — first two lines, 
tap to expand
"[number] members in this community"
Tip button — always visible in header

**Their Music**
Section label: "Latest Music"
Show the creator's 3 most recent 
uploaded tracks as playable cards.
Each card shows track title, 
cover art and a play button.
A "See all music" link below 
navigates to their full profile.

**Upcoming Events**
Section label: "Upcoming Events"
Show any events the creator 
has listed that have not yet passed.
If no upcoming events hide 
this section entirely.
Each event shows as a compact 
card with event name, date, 
city and a View Event button.

**Their Posts**
Section label: "From [Creator Name]"
Show the creator's most recent 
5 posts — both standard posts 
and headline posts.
Standard feed card design.
A "See all posts" link below.

**Community Members Preview**
Section label: "Others in this community"
Show circular avatars of 5 other 
members who are also in this 
community — users who follow 
or have tipped this creator.
A count label: "and [number] others"
This creates a sense of belonging 
and social proof.

---

## Part 3 — Member Count Calculation

A user is counted as a community 
member if:
- They follow the creator
OR
- They have tipped the creator 
 at least once

Store or calculate this count 
from existing follows and tips data.

Do not create a separate membership 
table. Derive the count from 
existing data.

---

## General Rules
- Community membership is derived 
 from follows and tips only
- No separate join or leave action 
 needed — following a creator 
 automatically makes you a member
- Creator Goals section is NOT 
 included at this stage — 
 to be added in a future update
- Community Screen is read only 
 for fans — they cannot edit 
 the creator's content from here
- Tip button always visible 
 throughout the Community Screen
- Match existing design system throughout
- Test on iOS and Android

---

## Acceptance Criteria

### Communities Tab
- [ ] Communities tab added to 
     Connect screen correctly
- [ ] Tab shows all creators the 
     user follows or has tipped
- [ ] Community list items display 
     correctly with photo name 
     genre and member count
- [ ] Sort order correct — tipped 
     creators first
- [ ] Empty state displays correctly
- [ ] Discover Creators button 
     navigates correctly

### Community Screen
- [ ] Opens correctly when tapping 
     a community list item
- [ ] Creator header displays correctly
- [ ] Member count displays correctly
- [ ] Tip button visible in header
- [ ] Latest Music section shows 
     3 most recent tracks
- [ ] Tracks are playable from 
     Community Screen
- [ ] See all music link works correctly
- [ ] Upcoming Events section shows 
     correctly when events exist
- [ ] Events section hidden when 
     no upcoming events
- [ ] Posts section shows 5 most 
     recent posts correctly
- [ ] Headline posts render correctly
- [ ] See all posts link works correctly
- [ ] Community members preview 
     shows 5 avatars correctly
- [ ] Creator Goals NOT included

### General
- [ ] No existing Connect screen 
     functionality broken
- [ ] Member count derived from 
     existing follows and tips data
- [ ] Tested on iOS and Android


🙏🏾