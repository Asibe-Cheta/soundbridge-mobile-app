# My Community Screen
# Creator-Facing Community Management

## Before Writing Any Code
1. Find the existing community_memberships table 
   built for the fan-facing Communities tab
2. Find the existing Profile screen structure 
   and navigation
3. Find the existing post creation flow and 
   how standard posts work
4. Find the existing feed rendering logic
5. Report findings before making any changes

---

## Overview
Add a My Community screen accessible from the 
Profile screen, giving creators visibility into 
who has joined their community, and the ability 
to post updates visible only to those members, 
separate from their public feed posts.

This reuses the existing community_memberships 
table already built for the fan side, no new 
membership logic is needed here, this is purely 
the creator-facing view and management layer.

---

## Part 1 — Navigation Entry Point

Add a "My Community" item to the Profile screen, 
positioned alongside the existing Service Provider 
Dashboard, AI Career Adviser, Event Creation and 
Earnings sections.

Tapping it opens the My Community screen.

---

## Part 2 — Member List

### Screen header
Show the creator's total community member count 
prominently at the top:

"[Number] people in your community"

### Member list
A scrollable list of everyone who has joined this 
creator's community, derived from the existing 
community_memberships table.

Each list item shows:
- Member profile photo
- Member display name
- Join date
- A small indicator if they have tipped, for 
  example a subtle badge or icon

Sort order, most recently joined first by default, 
with an option to sort by join date oldest first.

### Empty state
If the creator has zero community members:

"No one has joined your community yet. Share your 
fan link to start building one."

Button: "Share My Fan Link"
Reuses the existing share functionality already 
built for the creator's profile.

---

## Part 3 — Community Only Updates

### New post type
Add a new option when creating a post, alongside 
the existing standard post and headline post 
options:

"Community Update" — visible only to community 
members, not the public feed

### Creation flow
Same composer as a standard post, text and 
optional image, but with a clear label at the 
top indicating this will only be seen by community 
members, and a small lock icon to reinforce that 
visually.

### Where it appears
Community Update posts do not appear in the main 
public feed, the Discover screen, or any other 
user's feed who is not a member of that creator's 
community.

They appear:
- On the My Community screen itself, in a feed 
  style list below the member list, most recent first
- For each community member, on a dedicated 
  section of that creator's Community Screen 
  when the member views it, which already exists 
  from the fan-facing build

### Database
```
community_updates (
  id: UUID primary key
  creator_id: UUID FK to profiles
  content: text
  image_url: text | null
  posted_at: timestamptz
)
```

### Notification
When a creator posts a Community Update, send a 
notification to all community members:

"[Creator Name] shared an update with their 
community"

Tapping opens the update directly.

---

## General Rules
- Reuses the existing community_memberships table, 
  no changes to how membership itself works
- Community Updates are strictly separate from 
  public feed posts
- Member list is read only, no direct messaging 
  capability in this build
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] My Community navigation item added to 
      Profile screen
- [ ] Member count displays correctly at top 
      of screen
- [ ] Member list displays correctly with photo, 
      name, join date and tip indicator
- [ ] Sort order works correctly
- [ ] Empty state displays correctly with working 
      share link button
- [ ] Community Update post type available in 
      creator post flow
- [ ] Community Updates never appear in public 
      feed or non-member views
- [ ] Community Updates appear correctly on My 
      Community screen and member-facing 
      Community Screen
- [ ] Notification sent correctly to all members 
      on new update
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
```

🙏🏾