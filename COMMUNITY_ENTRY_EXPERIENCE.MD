Got it. Here is the full Cursor prompt covering everything:

# Community Entry Experience — Referral, 
# Fan Page and Digital Card Flows

## Before Writing Any Code
1. Find the existing onboarding flow 
   in the mobile app
2. Find how referral codes are currently 
   stored and tracked during signup
3. Find the existing partners table 
   and referral_signups table
4. Find the existing institutional_access 
   table for Sound Academy
5. Find the existing fan landing page 
   at soundbridge.live/[username]/home
6. Find how deferred deep links are 
   currently handled after app install
7. Find the existing follow functionality 
   in the mobile app and web app
8. Report findings before making 
   any changes

---

## Overview
Build a community entry experience 
that activates after onboarding for 
any new user who arrived via:

- A referral link (e.g. soundbridge.live/join?ref=danedmund)
- The fan landing page 
  (soundbridge.live/[username]/home)
- A digital card QR code 
  (which also leads to the fan landing page)

The experience shows the new user 
a dedicated welcome screen that 
makes them feel they have joined 
a specific creator's community, 
not just downloaded an app.

After seeing this screen they can 
use the app exactly like any other 
user. This is a one-time welcome 
moment only.

---

## Part 1 — Referral Code Persistence 
## Through Onboarding

### Current behaviour
The referral code from the URL 
parameter is stored in a cookie 
before onboarding begins.

### What to confirm and fix if needed
Ensure the referral code cookie 
persists through the entire 
onboarding flow regardless of:
- Which role the user selects 
  (listener, creator, industry 
  professional, event organiser, 
  podcaster)
- How long the onboarding takes
- Whether the user closes and 
  reopens the app during onboarding

On signup completion:
1. Read the referral code from 
   the cookie
2. Match it to the correct partner 
   record in the partners table
3. Create a referral_signups record 
   tagging this new user to that partner
4. Set the community_entry_creator_id 
   field (new field described below) 
   to the partner's user_id
5. Clear the cookie

This must work for all partner 
referral codes including Dan Edmund's 
danedmund code and any future 
partner codes.

Sound Academy institutional access 
is handled separately via the 
existing institutional_access table 
and does not need a community 
entry screen — their flow is 
already handled.

---

## Part 2 — Fan Landing Page 
## Deep Link Persistence

### How it works
When a user taps the "Join [Creator Name]'s 
community on SoundBridge" CTA on 
the fan landing page:

On mobile if the app is installed:
Open the app directly and proceed 
to the community welcome screen 
for that creator immediately.

On mobile if the app is not installed:
Store the creator's username in 
the deferred deep link payload.
After the user installs the app 
and completes onboarding read 
the deferred deep link and set 
community_entry_creator_id to 
that creator's user_id.

On web:
After the user creates an account 
via the web app set 
community_entry_creator_id to 
that creator's user_id and show 
the community welcome screen 
on the web app.

---

## New Database Field

Add to the profiles table:



community_entry_creator_id:
UUID FK to profiles | null
community_entry_shown_at:
timestamptz | null


community_entry_creator_id stores 
which creator this user arrived 
through. Null if they signed up 
organically.

community_entry_shown_at records 
when the welcome screen was shown. 
Once set the welcome screen never 
shows again.

---

## Part 3 — Community Welcome Screen

### When it appears
On the first app open after 
completing onboarding if 
community_entry_creator_id is set 
and community_entry_shown_at is null.

This screen appears once only. 
After the user taps the CTA or 
dismisses it set 
community_entry_shown_at to now.

### Screen design
Full screen experience. Not a modal. 
A dedicated welcome screen that 
feels intentional and warm.

Background: 
Dark SoundBridge brand background.

Top section:
The creator's profile photo as a 
large circular avatar centered 
on the screen with the animated 
gradient ring used elsewhere 
in the app.

Below the avatar:
Creator's display name in large 
bold white text.

Their genre or content category 
in smaller muted text below that.

Middle section:
Headline:
"Welcome to [Creator Name]'s 
community."

Body text:
"You are now connected with 
[Creator Name] on SoundBridge. 
Follow them to get notified 
about new music, events and 
everything they create."

Bottom section:
Primary CTA button:
"Follow [Creator Name]"

Tapping this:
1. Follows the creator on behalf 
   of the new user automatically
2. Navigates to that creator's 
   full profile screen
3. Sets community_entry_shown_at 
   to now

Secondary text link below button:
"Explore SoundBridge"

Tapping this:
1. Does NOT follow the creator
2. Navigates to the main feed(TestFeedScreen.tsx on the mobile app)
3. Sets community_entry_shown_at 
   to now

After either action the user 
can use the app exactly like 
any other user. The welcome 
screen never appears again.

---

## Part 4 — Fan Landing Page CTA Update

Update the post-tip CTA on the 
fan landing page at 
soundbridge.live/[username]/home.

Find the current button that says:
"Join SoundBridge" or similar

Change to:
"Join [Creator Name]'s community 
on SoundBridge"

Subtext below the button:
"Get notified every time they 
release new music or announce 
an event near you."

This applies on both mobile 
and web versions of the fan 
landing page.

---

## Part 5 — Web App Community 
## Welcome Screen

For users who sign up via the 
web app rather than the mobile 
app, show an equivalent welcome 
experience.

After completing web signup if 
community_entry_creator_id is set 
show a full page welcome screen 
at soundbridge.live/welcome/[username]
with the same content as the 
mobile welcome screen.

Primary CTA: "Follow [Creator Name]"
Secondary link: "Explore SoundBridge"

Both actions set 
community_entry_shown_at and 
redirect appropriately.

---

## General Rules
- Welcome screen appears once only
- Sound Academy institutional flow 
  is unchanged
- Normal onboarding role selection 
  is unchanged for all entry points
- After the welcome screen the user 
  has full unrestricted access to 
  the app
- Referral tracking in partners 
  and referral_signups tables 
  is unchanged
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Referral Persistence
- [ ] Referral code cookie persists 
      through entire onboarding
- [ ] referral_signups record created 
      on signup completion
- [ ] community_entry_creator_id set 
      correctly from referral code
- [ ] Works for all partner codes

### Fan Landing Page Deep Link
- [ ] Creator username carried through 
      deferred deep link after install
- [ ] community_entry_creator_id set 
      after onboarding via fan page
- [ ] Works when app already installed
- [ ] Works after fresh install

### Community Welcome Screen
- [ ] Screen appears on first app 
      open if community_entry_creator_id set
- [ ] Creator photo name and genre 
      display correctly
- [ ] Headline and body copy correct
- [ ] Follow button follows creator 
      and navigates to their profile
- [ ] Explore button navigates to feed 
      without following
- [ ] community_entry_shown_at set 
      after either action
- [ ] Screen never appears again 
      after being shown
- [ ] Works on iOS and Android

### Fan Landing Page CTA
- [ ] CTA text updated to community 
      framing with creator name
- [ ] Subtext displays correctly
- [ ] Works on mobile and web

### Web Welcome Screen
- [ ] Web welcome page displays 
      correctly after web signup
- [ ] Follow and explore actions work
- [ ] community_entry_shown_at set correctly

### General
- [ ] Sound Academy flow unchanged
- [ ] Normal onboarding unchanged
- [ ] No existing functionality broken


🙏🏾