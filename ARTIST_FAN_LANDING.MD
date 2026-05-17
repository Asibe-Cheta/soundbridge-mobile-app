# Artist Fan Landing Page — Web App & Mobile App

## Important
This feature requires coordination between 
the web app team and the mobile app team.
Each team handles their own side but must 
align on data, design consistency and 
deep linking before building.

Both teams should read this full prompt 
before starting work.

---

## Before Writing Any Code

### Web App Team
1. Find the existing Next.js web app 
   structure and routing
2. Find how creator profiles are currently 
   fetched and displayed on the web
3. Find the existing Stripe payment 
   integration on the web app
4. Find the existing design system — 
   colours, fonts, gradients, glassmorphism
5. Find the SoundBridge logo file 
   @logo-trans-lockup.png
6. Check how dynamic routes work for 
   creator usernames e.g. 
   soundbridge.live/[username]
7. Report findings before making any changes

### Mobile App Team
1. Find the existing onboarding and 
   account creation flow
2. Find how deep links are currently 
   handled in the app
3. Find how creator profiles are 
   fetched and displayed in the app
4. Find the existing follow functionality
5. Report findings before making any changes

---

## Overview

Build a dedicated artist fan landing page 
accessible at:
soundbridge.live/[username]/home

Example: soundbridge.live/loveabolade/home

This page is designed specifically for 
fans arriving from an artist's Instagram, 
TikTok or any external link. It is not 
the standard creator profile page. It is 
an emotional, fan-first experience that:

1. Immediately connects the fan to the 
   artist through visual presence and 
   community
2. Showcases the artist's music catalogue
3. Invites the fan to support the artist 
   with a £1 minimum tip
4. After tipping, converts the fan into 
   a SoundBridge app user by prompting 
   them to download and join the artist's 
   community

No account is required to tip. Account 
creation happens after the tip as a 
natural next step.

---

## Web App — Fan Landing Page

### URL Structure
soundbridge.live/[username]/home

This route fetches the creator's profile 
data dynamically based on their username.

If the username does not exist show a 
clean 404 page with the SoundBridge logo 
and a link to soundbridge.live

---

### Screen Layout — Top Section

**Background:**
Full screen dark background using 
SoundBridge's existing dark colour palette. 
Subtle animated gradient or particle 
effect in the background to add depth 
and life. Keep it subtle — not distracting.

**Artist Avatar — Center of screen:**
The artist's profile photo displayed as 
a large circular avatar, centered 
horizontally on the screen.

Size: approximately 120px diameter
Border: a glowing ring in the platform's 
gradient colour (red to pink as per 
existing brand)
Position: upper center of the screen

**Floating Community Avatars:**
Around the central artist avatar, display 
a collection of smaller circular avatars 
representing other fans or followers of 
this artist on SoundBridge.

Pull real follower profile photos from 
the database — up to 12 avatars. If 
fewer than 12 followers exist, use 
placeholder gradient circles.

Animation: Each small avatar floats 
gently around the central avatar in 
a slow orbital motion. Different avatars 
move at slightly different speeds and 
distances, like stars orbiting a sun. 
The motion should be smooth, gentle 
and continuous using CSS animations.

The overall visual effect: the artist 
is at the center of their community.

**Artist Name:**
Displayed directly below the central 
avatar in large bold text.

**Tagline beneath name:**
"Welcome to [Artist Name]'s home on SoundBridge"

---

### Screen Layout — Middle Section

**Stacked Music Cards:**
Directly below the artist name and tagline, 
display the artist's uploaded music tracks 
as stacked cards.

Card stack behaviour:
- The top card is fully visible
- The card behind it peeks out from 
  beneath — approximately 8 to 12px 
  visible at the bottom, slightly 
  scaled down and darker to create 
  depth
- Up to 3 cards visible in the stack 
  at once
- User can swipe or tap to cycle 
  through tracks

Each card contains:
- Cover art (left side, square, 
  rounded corners)
- Track title (bold)
- Artist name (smaller, muted)
- Duration if available
- A play button — tapping plays 
  a preview of the track directly 
  on this page using the existing 
  audio streaming infrastructure
- Genre tag

Card design:
- Rectangular with rounded corners 
  matching existing card styles
- Glassmorphism background matching 
  existing design system
- Subtle shadow to enhance the 
  stacking depth effect

If the artist has no tracks uploaded 
yet, show a single placeholder card 
that says "Music coming soon"

---

### Screen Layout — Support Section

Below the music cards, display the 
support call to action:

**Headline:**
"Connect with [Artist Name]"

**Body text:**
"[Artist Name] pours everything into 
their music. Show them you are listening 
with a direct tip. Every penny goes 
straight to them."

**Tip amount:**
A single prominent tip button showing:
"Support with £1"

This is not a variable amount input. 
It is a fixed £1 entry point. Clean, 
simple, one tap.

The button should be large, prominent, 
and use the existing brand gradient style.

Beneath the button in small muted text:
"You can choose your own amount after tapping"

This means tapping the £1 button opens 
the tip flow where they can adjust the 
amount upward if they wish, but the 
default is £1.

**Payment:**
Use the existing Stripe payment integration 
on the web app. No account required to 
complete the tip. Guest checkout only 
on this page.

Collect:
- Email address (required for receipt)
- Card details via Stripe
- Optional name

Store the tip data in the existing 
tips table linked to the creator's 
account and their digital wallet.

Also store in a new table or extend 
existing fan data table:
- tipper email
- tipper name if provided
- amount tipped
- artist id
- source: 'fan_landing_page'
- created_at

This data feeds into the creator's 
fan CRM data for future use.

---

### After Tip — Thank You Screen

On successful payment, replace the 
support section with a thank you screen:

**Animation:**
A brief celebratory animation — 
confetti, floating hearts, or 
a pulse from the artist avatar. 
Keep it joyful and warm.

**Message:**
"You just supported [Artist Name] directly.
Every penny goes straight to them. 
Thank you for being part of this. 🙏🏾"

**Primary CTA — prominent button:**
"Join [Artist Name]'s Community on SoundBridge"

This button deep links to the mobile app:
- If the app is installed: opens the 
  app directly to the artist's profile
- If the app is not installed: opens 
  the App Store or Google Play 
  depending on device

Use a universal link or app link 
pattern for this. Coordinate with 
the mobile app team on the deep 
link URL format.

**Secondary CTA — smaller text link:**
"Or join on web at soundbridge.live"

This takes them to the web app 
signup page.

---

### Bottom Section — About the Artist

Below the support section, display 
a brief about section:

**Artist bio** — pulled from their 
existing profile bio field. 
Truncated to 150 characters with 
a "Read more" expand option.

**Stats row:**
- Number of tracks
- Number of followers on SoundBridge
- Genre tags

**SoundBridge branding:**
At the very bottom of the page:
SoundBridge logo (@logo-trans-lockup.png)
Small text: "Powered by SoundBridge — 
Music networking that pays"
Link: soundbridge.live

---

### Page Metadata for Social Sharing

When this URL is shared on WhatsApp, 
Instagram or any platform, the 
preview must show:

Title: "[Artist Name] is on SoundBridge"
Description: "Listen to [Artist Name]'s 
music and support them directly. 
No middleman. Every tip goes straight 
to them."
Image: The artist's profile photo

Set Open Graph and Twitter Card 
meta tags accordingly using the 
artist's dynamic data.

---

### Analytics

Track the following events per page visit:
- Page viewed
- Track played
- Tip button tapped
- Tip completed (with amount)
- App download CTA tapped
- Web signup CTA tapped

Store these against the artist's 
account so they can see how their 
fan landing page is performing.

---

## Mobile App — Deep Link Handler

### What the mobile team needs to build

When a user taps the "Join [Artist Name]'s 
Community on SoundBridge" button on the 
web fan landing page, one of two things 
happens:

**If the app is already installed:**
The app opens directly to that artist's 
creator profile screen. The user sees 
the artist's profile, their music, 
and a prominent Follow button.

**If the app is not installed:**
The user is taken to the App Store 
or Google Play. After installing and 
opening the app for the first time, 
the onboarding flow begins. At the 
end of onboarding, the app 
automatically navigates to that 
specific artist's profile.

This requires implementing deferred 
deep linking. Check if a deferred 
deep link library is already in 
the codebase before adding a new 
dependency.

The deep link format to agree with 
the web team:
soundbridge://artist/[username]

Or using universal links:
soundbridge.live/[username]

Both teams must agree on the format 
before either team builds their side.

### Artist profile on first open

When a new user completes onboarding 
and lands on the artist's profile 
via deep link, show a welcome prompt:

"You are now connected with 
[Artist Name] on SoundBridge. 
Follow them to get notified about 
their music and events."

Prominent Follow button.

Dismiss button below: "Maybe later"

---

## Design Consistency Requirements

Both teams must use:
- The same dark background colour
- The same gradient accent colour 
  (red to pink)
- The same glassmorphism card style
- The same font family and weights
- The same button styles
- @logo-trans-lockup.png for all 
  SoundBridge branding

The web fan landing page and the 
mobile app profile should feel like 
they belong to the same product. 
A fan who moves from web to app 
should feel continuity not a 
jarring transition.

---

## Data Flow Between Teams

The web app handles:
- Fetching artist profile data
- Displaying the fan landing page
- Processing the tip via Stripe
- Storing tip data and fan email
- Generating the deep link for 
  the app CTA button

The mobile app handles:
- Receiving the deep link
- Deferred deep linking after install
- Displaying the artist profile 
  on first open
- Handling the follow action

Both teams share:
- The same Supabase backend
- The same creator profile data
- The same tips table

---

## Acceptance Criteria

### Web App
- [ ] Route soundbridge.live/[username]/home 
      live and working
- [ ] Artist avatar displayed centered 
      with glowing ring
- [ ] Floating community avatars animated 
      around central avatar
- [ ] Stacked music cards display correctly
- [ ] Track preview plays on card tap
- [ ] Cards swipeable or tappable to cycle
- [ ] Support section displays with £1 
      default tip button
- [ ] Stripe guest checkout works without 
      account
- [ ] Tip data stored correctly including 
      fan email and source
- [ ] Thank you screen displays after 
      successful tip
- [ ] Celebratory animation on thank you
- [ ] App download CTA deep links correctly
- [ ] Web signup CTA links to signup page
- [ ] Artist bio and stats display correctly
- [ ] SoundBridge branding at bottom
- [ ] Open Graph meta tags set correctly
- [ ] Analytics events tracked
- [ ] Works perfectly on iOS Safari and 
      Android Chrome
- [ ] Page loads in under 2 seconds

### Mobile App
- [ ] Deep link soundbridge://artist/[username] 
      handled correctly
- [ ] App opens to artist profile when 
      already installed
- [ ] Deferred deep link works after 
      fresh install
- [ ] Welcome prompt displays on first 
      open via deep link
- [ ] Follow button works correctly
- [ ] Tested on iOS and Android

### Both Teams
- [ ] Deep link format agreed and consistent
- [ ] Design tokens consistent across 
      web and mobile
- [ ] No existing functionality broken
