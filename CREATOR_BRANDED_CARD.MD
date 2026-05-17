# Creator Fan Link Share Nudge & Branded Card

## Before Writing Any Code
1. Find the existing nudge and modal 
   system in the mobile app codebase
2. Find how dismissal states are 
   currently stored per user
3. Find the existing QR code generation 
   implementation if any
4. Find the existing share functionality 
   using React Native Share or Expo Sharing
5. Find how creator profiles are 
   identified — specifically the 
   username field used for the 
   fan landing page URL
6. Find the existing profile photo 
   storage and how to access it
7. Find @logo-trans-lockup.png 
   in the assets folder
8. Report findings before making 
   any changes

---

## Overview
Build a creator-only nudge system 
that encourages creators to share 
their SoundBridge fan landing page 
with their external audience. The 
nudge offers two sharing options: 
a plain link and a beautifully 
branded shareable card with their 
photo on it.

This feature is for creators only. 
Do not show it to fans or non-creator 
accounts.

---

## Part 0 — Occasional Teaser Modal 
## on App Launch

Before the main nudge system, build 
a separate teaser modal that appears 
occasionally when a creator opens 
the app. This is designed to build 
awareness and curiosity about the 
digital card feature before the 
creator has generated theirs.

### When it appears
- Creator account only
- Creator has not yet generated 
  or shared their card
- Fires on app launch only — 
  not on screen navigation
- Fires every 4th app launch 
  until the creator generates 
  their card
- Once the creator generates 
  their card it never appears again
- Store a launch counter per 
  user in the database

### Teaser modal design
A visually compelling modal that 
shows the creator a preview of 
what their digital card could 
look like.

The preview card inside the modal 
uses their actual profile photo, 
name and genre — not a generic 
placeholder. It should feel 
personal and real, like they 
are looking at something already 
made for them.

Show the card preview at a slight 
angle or with a subtle glow effect 
to make it feel premium and exciting.

Content above the card preview:
Headline: "Your SoundBridge Card is ready"
Subheadline: "Let your fans join your 
community and support you directly."

Content below the card preview:
Primary button: "Try It"
Tapping "Try It" dismisses this 
teaser modal and opens the 
Share My Card modal directly 
(Part 3 below)

Secondary text link below button:
"Maybe later"
Tapping this dismisses the teaser 
for this session. It returns 
after 4 more app launches.

### Important
This teaser modal must feel exciting 
and aspirational — not like a 
notification or an obligation. 
The creator should look at it and 
think "I want that." The card 
preview doing the selling, not the copy.

---

## Part 1 — The Nudge Modal

### When it appears
The nudge modal fires for creator 
accounts only under the following 
conditions:

- User is identified as a creator 
  in the database
- They have not yet shared their 
  fan landing page link or card 
  (track this in the database)
- It fires once per session on 
  app open or when they navigate 
  to their own profile screen
- It continues appearing every 
  session until the creator 
  completes a share action
- Once they share — either the 
  link or the card — it dismisses 
  permanently and never appears again
- Tapping "Maybe later" dismisses 
  for the current session only. 
  It returns next session.

### Modal design
Match the existing modal style 
in the app exactly.

Content:

Headline:
"Your audience is waiting for you."

Body:
"Share your SoundBridge home and 
let your audience discover your 
content, support you directly, and 
stay connected with everything you do. 
One share is all it takes."

Two primary action buttons:

Button 1 — "Share My Link"
Button 2 — "Share My Card"

Both buttons are equal in weight 
and size. Neither is more prominent 
than the other.

Below both buttons, a smaller 
text link:
"Maybe later"

### Database storage
Add a field to the creator's 
profile or a separate table:

fan_link_shared: boolean default false
fan_link_shared_at: timestamptz | null
fan_link_share_method:
‘link’ | ‘card’ | null
app_launch_count: integer default 0
teaser_last_shown_at_launch:
integer default 0

When the creator completes any 
share action set fan_link_shared 
to true. The nudge never appears 
again for this user.

Increment app_launch_count on 
every app open for creator accounts.

Show teaser modal when:
app_launch_count minus 
teaser_last_shown_at_launch 
equals 4 or more

On teaser shown, set 
teaser_last_shown_at_launch 
to current app_launch_count.

---

## Part 2 — Share My Link

When the creator taps "Share My Link":

1. Generate their fan landing page URL:
   soundbridge.live/[username]/home

2. Open the native share sheet 
   with the following:
   - URL: soundbridge.live/[username]/home
   - Message: "Discover my content and 
     support me directly on SoundBridge"

3. On successful share, set 
   fan_link_shared to true in 
   the database and dismiss 
   the nudge permanently.

4. Show a brief confirmation toast:
   "Link shared. Your audience can 
   now find you on SoundBridge 🙏🏾"

---

## Part 3 — Share My Card

When the creator taps "Share My Card" 
or "Try It" from the teaser modal, 
open a new full screen modal showing 
their generated branded card.

### Card Design

The card is a beautifully designed 
image sized for Instagram stories 
(1080 x 1920px ratio) with the 
following layout:

**Background:**
Dark gradient background using 
SoundBridge's brand colours. 
SoundBridge's gradient palette 
includes blue, pink, red and white. 
Use these as the gradient combination 
for the card background and accents. 
Keep it rich, deep and premium feeling.

**Top section:**
SoundBridge logo (@logo-trans-lockup.png) 
centered at the top. Small size. 
Subtle. Not dominant.

**Center section:**
Creator's profile photo as a large 
circular avatar centered on the card.
Size: approximately 200px diameter.
Border: glowing gradient ring using 
the platform's blue, pink and red 
colour palette.

Below the avatar:
Creator's display name in large 
bold white text.

Genre tags or content category 
beneath the name in smaller 
muted text.

**Middle section:**
A short statement in medium sized 
white text, centered:

"Hear my music.
Support me directly."

Note: Use this copy as the default. 
It is direct, warm and works well 
for the majority of audio creators 
including musicians, vocalists 
and producers. Do not make this 
dynamic or conditional based on 
creator type at this stage.

**Bottom section:**
A pill shaped button graphic 
(not tappable — this is part 
of the image) that says:
"Support me on SoundBridge"

Below that in smaller text:
soundbridge.live/[username]/home

A QR code encoding their fan 
landing page URL. Small, clean, 
centered. Scannable.

SoundBridge logo again very small 
at the very bottom.

### Card generation
Use the existing html-to-image 
or similar library already in 
the codebase to generate this 
card as a PNG image from a 
React Native View component.

If no such library exists, check 
what is already available before 
adding a new dependency.

### Card modal controls

Below the card preview show 
three options:

Button 1 — "Download Card"
Saves the card image to camera 
roll using Expo MediaLibrary. 
Request permission before saving 
if not already granted.

Button 2 — "Share Card"
Opens native share sheet with 
the card image attached. 
Pre-filled message:
"Discover my content and support 
me directly on SoundBridge"

Button 3 — "Copy My Link"
Copies soundbridge.live/[username]/home 
to clipboard. Shows a brief 
confirmation: "Link copied!"

Close button at the top right 
of the modal.

### On successful share or download
Set fan_link_shared to true 
in the database.
Dismiss the nudge permanently.
Dismiss the teaser permanently.
Show a brief toast:
"Your card is ready to share. 
Let your audience find you 🙏🏾"

---

## Part 4 — QR Code on Profile Screen

In addition to the nudge, add 
a permanent QR code access point 
on the creator's own profile screen.

Add a small QR code icon button 
in the top right area of the 
profile screen alongside existing 
action buttons.

Tapping it opens the Share My Card 
modal directly, bypassing the nudge.

This gives creators ongoing access 
to share their card and QR code 
at any time — not just when the 
nudge appears.

Only show this icon when the user 
is viewing their own profile, 
not other people's profiles.

---

## General Rules
- This feature is for creator 
  accounts only
- Never show nudge or teaser 
  to fan or non-creator accounts
- Music playback must never 
  be affected
- Card generation must work 
  offline if profile data 
  is cached
- All share actions use 
  existing native share APIs
- Match existing design system 
  throughout
- SoundBridge gradient colours 
  are blue, pink, red and white — 
  use these consistently on the card
- Do not add new dependencies 
  without checking existing 
  libraries first

---

## Acceptance Criteria
- [ ] Teaser modal appears every 
      4th app launch for creators 
      who have not yet generated card
- [ ] Teaser shows real profile 
      photo, name and genre of creator
- [ ] Teaser "Try It" button opens 
      Share My Card modal directly
- [ ] Teaser "Maybe later" dismisses 
      for current session only
- [ ] Teaser never appears after 
      card is generated
- [ ] Launch counter stored and 
      incremented correctly
- [ ] Nudge modal appears for 
      creators only
- [ ] Headline reads "Your audience 
      is waiting for you."
- [ ] Body copy uses "content" 
      not "music"
- [ ] Nudge fires once per session 
      until action is taken
- [ ] Maybe later dismisses for 
      current session only
- [ ] Permanent dismissal stored 
      in database after share
- [ ] Share My Link opens native 
      share sheet with correct URL
- [ ] Share My Card opens card 
      modal correctly
- [ ] Card displays with correct 
      profile photo, name, genre 
      or content category, logo 
      and QR code
- [ ] Card uses SoundBridge blue 
      pink red and white gradient
- [ ] Card is sized correctly for 
      Instagram stories
- [ ] Download saves to camera roll
- [ ] Share opens native share sheet 
      with card image
- [ ] Copy link copies correct URL
- [ ] fan_link_shared set to true 
      after any share action
- [ ] QR code icon on profile screen 
      opens card modal
- [ ] QR code icon only visible on 
      own profile
- [ ] Tested on iOS and Android
