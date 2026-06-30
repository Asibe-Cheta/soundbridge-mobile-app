# Communities Tab — Connect Screen
# REVISED VERSION

## Before Writing Any Code
1. Find the existing Connect screen 
  in the mobile app codebase
2. Find what tabs currently exist 
  on the Connect screen
3. Find the existing follows table 
  and how follows are currently stored
4. Find the existing tips and 
  transactions tables
5. Find the existing profile screen 
  and how the follow button works
6. Find the existing notification 
  system
7. Report findings before making 
  any changes

---

## Important Architecture Decision

Following a creator and joining 
their community are two separate 
and distinct actions.

Following: a lightweight professional 
connection. The user sees the 
creator's content in their feed 
and receives new release notifications. 
Similar to following on LinkedIn. 
Low commitment. No community 
notifications.

Joining a community: a deliberate 
opt-in that means the user wants 
deeper engagement. They receive 
community updates, creator goal 
notifications, event announcements 
and direct community moments from 
that creator specifically.

These must never be conflated. 
Do not automatically add a user 
to a community when they follow 
a creator.

---

## Part 1 — Join Community Button

### Where it appears
Add a Join Community button to 
every creator's profile screen. 
This button is separate from and 
visually distinct from the existing 
Follow button.

### Button design
Position the Join Community button 
below or beside the Follow button 
on the creator profile.

When not yet joined:
Button label: "Join Community"
Style: outlined or secondary style 
to distinguish from the primary 
Follow button

When already joined:
Button label: "Community Member"
Style: filled with a subtle 
brand colour to indicate active membership
A small checkmark icon beside the text

### What happens when tapped
When a user taps Join Community:

1. Create a community_memberships 
  record linking this user to 
  this creator
2. Show a brief confirmation:
  "You have joined [Creator Name]'s 
  community. You will now receive 
  their updates and announcements."
3. The button state changes to 
  "Community Member"

When a Community Member taps 
the button again:
Show a confirmation dialog:
"Leave [Creator Name]'s community?
You will no longer receive their 
community updates."
Options: "Leave Community" or "Cancel"

On confirming leave:
Delete the community_memberships record.
Button returns to "Join Community" state.

---

## Part 2 — Post-Tip Community Join Prompt

When a user tips a creator for 
the first time and they are not 
yet a community member show a 
prompt on the thank you screen 
after the tip completes:

"You just supported [Creator Name].

Would you like to join their 
community to stay connected with 
their journey, upcoming events 
and exclusive moments?"

Button: "Join Their Community"
Secondary: "Maybe Later"

Tapping Join Their Community 
creates the community_memberships 
record and shows confirmation.

Tapping Maybe Later dismisses 
without joining. Do not show 
this prompt again for 7 days 
for the same creator.

---

## Part 3 — Database

Add a new table:



community_memberships (
id: UUID primary key
user_id: UUID FK to profiles
creator_id: UUID FK to profiles
joined_at: timestamptz
join_source: text
– ‘manual’ ‘post_tip_prompt’
)


A user can only have one membership 
record per creator. Enforce a 
unique constraint on user_id 
and creator_id combined.

---

## Part 4 — Communities Tab 
## on Connect Screen

Add a Communities tab to the 
existing Connect screen.

This tab shows only communities 
the user has deliberately joined 
via the Join Community button 
or the post-tip prompt.

It does NOT show all creators 
the user follows.

### Communities list
A scrollable list of creator 
communities the user has joined.

Each list item shows:
Creator profile photo — circular avatar
Creator display name in bold
Creator genre tag in small muted text
Member count: "[number] members"
A right chevron indicating tappable

Sort order:
Most recently joined first.

### Empty state
If the user has not joined any 
communities show:

"You have not joined any communities yet.

Visit a creator's profile and 
tap Join Community to become 
part of their world."

Button: "Discover Creators"
Tapping navigates to the 
discovery or feed screen.

---

## Part 5 — Community Screen

When a user taps any community 
in the list open a dedicated 
Community Screen for that creator.

This screen is the creator's 
community space — not just 
their profile. The framing 
should feel like entering 
a space that belongs to 
the creator and their fans.

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
"Community Member" badge on the 
user's own view to confirm membership

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
community members.
A count label: "and [number] others"

---

## Part 6 — Notifications

Community members receive 
notifications that followers 
do not receive:

Creator Goal launches — 
only goes to community members 
not all followers

Community announcements — 
any post the creator marks 
as a community update

48 hour event reminders — 
for events the community 
member has not yet bookmarked 
or purchased

Followers who are not community 
members receive:
New music release notifications
Standard event notifications

This distinction makes community 
membership feel genuinely valuable 
and different from simply following.

---

## Part 7 — Member Count Calculation

A creator's community member count 
is the total number of users with 
an active community_memberships 
record for that creator.

This is separate from and will 
always be lower than their 
follower count.

Both counts can be displayed 
on the creator's profile:
"[X] followers · [Y] community members"

This distinction adds credibility — 
a creator with 500 followers and 
200 community members signals 
genuine deep engagement.

---

## General Rules
- Following and community membership 
  are strictly separate actions
- Never auto-add a follower to 
  a community
- Community membership requires 
  a deliberate user action
- The Communities tab shows only 
  deliberately joined communities
- Community members receive 
  richer notifications than followers
- Creator Goals notifications 
  go to community members only 
  not all followers
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Join Community Button
- [ ] Join Community button added 
      to creator profile screen
- [ ] Button is visually distinct 
      from Follow button
- [ ] Tapping creates community_memberships 
      record correctly
- [ ] Button state changes to 
      Community Member after joining
- [ ] Leave community confirmation 
      dialog works correctly
- [ ] Leaving deletes membership 
      record correctly
- [ ] Button returns to Join Community 
      after leaving

### Post-Tip Prompt
- [ ] Prompt appears after first 
      tip to a creator
- [ ] Only shows if not already 
      a community member
- [ ] Join Their Community creates 
      membership record correctly
- [ ] join_source recorded as 
      post_tip_prompt correctly
- [ ] Maybe Later dismisses for 7 days
- [ ] Does not show again within 
      7 days for same creator

### Database
- [ ] community_memberships table created
- [ ] Unique constraint on user_id 
      and creator_id enforced
- [ ] join_source recorded correctly

### Communities Tab
- [ ] Communities tab added to 
      Connect screen
- [ ] Shows only deliberately 
      joined communities
- [ ] Does NOT show all followed creators
- [ ] List items display correctly
- [ ] Sort order correct — most 
      recent first
- [ ] Empty state displays correctly
- [ ] Discover Creators button 
      navigates correctly

### Community Screen
- [ ] Opens correctly from Communities tab
- [ ] All sections display correctly
- [ ] Music plays correctly
- [ ] Events display and hide correctly
- [ ] Posts render correctly
- [ ] Member count correct
- [ ] Tip button always visible
- [ ] Community Member badge visible

### Notifications
- [ ] Creator Goal notifications 
      go to community members only
- [ ] Community members receive 
      richer notification set
- [ ] Followers receive standard 
      notifications only
- [ ] Distinction between follower 
      and community member 
      notifications enforced

### Member Count
- [ ] Member count displayed 
      correctly on creator profile
- [ ] Follower count and member 
      count shown separately
- [ ] Counts update correctly 
      when users join or leave

### General
- [ ] Following a creator does NOT 
      add them to communities
- [ ] No existing Connect screen 
      functionality broken
- [ ] No existing follow functionality 
      broken
- [ ] Tested on iOS Android and web


🙏🏾