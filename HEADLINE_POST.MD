# Headline Post Feature — Premium Only

## Before Writing Any Code
1. Find the existing post creation flow 
  in the mobile app codebase
2. Find how the feed currently renders 
  post cards
3. Find the existing post card component 
  and its structure
4. Find how Premium tier is currently 
  checked and gated in the codebase
5. Find the existing animation libraries 
  already in use
6. Find how images and media are 
  currently attached to posts
7. Report findings before making 
  any changes

---

## Overview
Add a new post type called Headline Post 
available exclusively to Premium and 
Unlimited users. A Headline Post has a 
distinctive pill-shaped header with an 
animated gradient border containing the 
post title. Tapping the header triggers 
a scroll-reveal animation that unfolds 
the full post content beneath it like 
a scroll being opened.

Free users can see Headline Posts in 
their feed but cannot create them. 
When a free user taps the create 
button and selects Headline Post 
they see an upgrade prompt.

---

## Part 1 — Post Creation

### Entry point
In the existing post creation flow 
add a post type selector at the top:

Two options:
- Standard Post (existing, all users)
- Headline Post (new, Premium and 
 Unlimited only)

If a free user taps Headline Post 
show a prompt:

"Headline Posts are available on 
Premium and Unlimited plans. Creators 
who use them are three times more 
likely to get reads, reactions and 
connections. Access yours today."

Button: "Access Premium"


Button: "Access Premium" — redirects 
to pricing page

Secondary: "Maybe Later" — returns 
to Standard Post

### Headline Post creation fields
When a Premium or Unlimited user 
selects Headline Post show:

Field 1 — Headline (required)
Label: "Your headline"
Placeholder: "Write something that 
stops the scroll..."
Character limit: 80 characters maximum
Helper text beneath: "This is the first 
thing people see. Make it count."

Field 2 — Body (required)
Label: "The full story"
Placeholder: "Now tell them everything..."
Standard text input same as existing 
post body field

Field 3 — Media (optional)
Same image/media attachment as 
existing post creation

Field 4 — Gradient colour selection
Show 5 preset gradient combinations 
the creator can choose for their 
border animation:

Option 1: Pink to red (SoundBridge default)
Option 2: Blue to purple
Option 3: Gold to orange
Option 4: Green to teal
Option 5: White to silver

Show a small preview of each gradient 
as a pill shaped swatch. Default to 
Option 1.

---

## Part 2 — The Headline Post Card in Feed

### Collapsed state (default)
When a Headline Post appears in the feed 
it shows in collapsed state by default.

Visual design of collapsed card:

A pill shaped container, wider than it 
is tall, centered in the feed card. 
Rounded ends fully — a true pill shape.

Inside the pill: the headline text, 
centered, white, bold. Font size 
slightly larger than standard post text.

Border: an animated gradient border 
running around the pill shape 
continuously. The gradient rotates 
or sweeps around the border smoothly 
and infinitely using the colour 
combination the creator selected.

The animation speed should be slow 
and smooth — not fast or flashy. 
Think elegant, not distracting. 
Approximately one full rotation 
every 3 seconds.

Beneath the pill in small muted text:
"Tap to read"

The rest of the post body is completely 
hidden in collapsed state.

Standard post metadata below the pill:
Creator name, profile photo, timestamp, 
like and comment counts — same as 
existing post cards.

### Expanded state — the scroll reveal
When a user taps anywhere on the pill 
headline, the post body reveals below 
it with a scroll unfurl animation.

The animation:
The content appears to unroll downward 
from beneath the pill, as if a scroll 
of paper is being opened. Use a 
combination of height animation and 
a subtle vertical reveal — content 
appears from top to bottom 
progressively, not all at once.

Duration: 400ms to 600ms with 
an ease-out curve.

Once expanded:
- The pill headline remains at the top
- The gradient border animation continues
- The full post body text appears below
- Any attached images appear below 
 the text
- Like, comment and share actions 
 appear at the bottom

Tapping the pill again collapses 
the post with a reverse scroll 
animation — content rolls back up 
and hides beneath the pill.

### Multiple Headline Posts in feed
If a user scrolls past multiple 
Headline Posts, each one stays 
in its own collapsed state until 
tapped. Opening one does not 
affect others.

---

## Part 3 — Free User Experience

Free users see Headline Posts in their 
feed in collapsed state. They can tap 
to expand and read the full content 
just like Premium users.

Free users cannot create Headline Posts.

When a free user taps create and 
selects Headline Post they see the 
upgrade prompt described in Part 1.

This is intentional — the visibility 
of Headline Posts in the feed acts 
as a passive marketing tool. 
Free users see them, want to create 
them, and are prompted to upgrade.

---

## Part 4 — Gradient Border Animation

The animated gradient border must 
perform smoothly without draining 
battery or causing scroll jank.

Use React Native's Animated API or 
the existing animation library in 
the codebase for the rotation effect.

The gradient should sweep around the 
pill border continuously. If a 
LinearGradient approach is used, 
animate the rotation of the gradient 
rather than redrawing it on each frame.

Test on lower end Android devices 
to ensure the animation does not 
cause performance issues.

If performance is a concern, pause 
the gradient animation for posts 
that are off screen and resume 
it when they scroll into view.

---

## General Rules
- Headline Post is Premium and 
 Unlimited only for creation
- All users can read Headline Posts
- The pill shape must be a true 
 pill — fully rounded ends
- Gradient animation must be smooth 
 and elegant, not distracting
- Scroll reveal animation must feel 
 satisfying and intentional
- Music playback must never be 
 affected by any animation
- All existing Standard Post 
 functionality unchanged
- Match existing design system 
 for all non-headline elements
- Do not add new dependencies 
 without checking existing 
 libraries first
- Test on iOS and Android including 
 lower end devices

---

## Acceptance Criteria
- [ ] Post type selector added to 
     post creation flow
- [ ] Free users see upgrade prompt 
     when selecting Headline Post
- [ ] Headline field with 80 character 
     limit working correctly
- [ ] Gradient colour selection showing 
     5 presets correctly
- [ ] Pill shape renders correctly 
     in feed
- [ ] Animated gradient border runs 
     smoothly on selected colour
- [ ] Collapsed state shows headline 
     only with tap to read prompt
- [ ] Tap triggers scroll reveal 
     animation correctly
- [ ] Animation feels like a scroll 
     unrolling, top to bottom reveal
- [ ] Second tap collapses with 
     reverse animation
- [ ] Images display correctly 
     in expanded state
- [ ] Multiple headline posts in 
     feed are independent
- [ ] Free users can read but 
     not create
- [ ] Performance acceptable on 
     lower end Android devices
- [ ] Animation pauses off screen
- [ ] No existing post functionality 
     broken
- [ ] Tested on iOS and Android
And ensure the app always checks against users' tier to either permit this feature or restrict it, eithe rbecause they are now subscribed or have run out of subscription.
Below the "Access Premium" button 
add a secondary line in small text:

"Try Premium free for 7 days. 
Card required. Cancel anytime 
before day 7 and you will not 
be charged."

The free trial is handled entirely 
through Stripe. Do not build any 
custom trial logic — simply pass 
a trial_period_days: 7 parameter 
when creating the Stripe subscription 
session for Premium. Check the 
existing Stripe subscription flow 
in the codebase before making 
any changes.
The pricing page is hosted on the web app page at https://www.soundbridge.live/pricing