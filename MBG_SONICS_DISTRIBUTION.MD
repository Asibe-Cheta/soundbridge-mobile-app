# MBG Sonics Distribution Feature

## Before Writing Any Code
1. Find the existing Pro Resources 
   screen in the mobile app and 
   web app
2. Find the existing card design 
   used for Sound Academy, Talk2Dan 
   and University of Hertfordshire 
   on the Pro Resources screen
3. Find the existing audio_tracks 
   table and how track files are 
   stored in Supabase storage
4. Find the existing ISRC assignment 
   system and where ISRC codes 
   are stored per track
5. Find the existing Stripe payment 
   flow used for subscriptions
6. Find the existing profiles table 
   and how creator emails and 
   usernames are stored
7. Find the existing notification 
   and email system
8. Report findings before making 
   any changes

---

## Overview
Build a music distribution feature 
that allows SoundBridge creators 
to distribute their tracks to 
major streaming platforms through 
MBG Sonics as a partner.

Four components:

1. MBG Sonics card on the Pro 
   Resources screen
2. Distribution request flow where 
   creator submits track details 
   and pays via Stripe
3. Automated email to MBG Sonics 
   with all track data and a 
   secure download link
4. Admin tracking of all distribution 
   requests and payments

---

## Part 1 — MBG Sonics Card on 
## Pro Resources Screen

### What to build
Add an MBG Sonics card to the 
existing Pro Resources screen 
using the exact same card design 
already used for Sound Academy, 
Talk2Dan and University of 
Hertfordshire cards.

Do not create a new card design. 
Match the existing card component 
exactly.

### Card content
Logo: mbg.png 
(to be added to assets folder)

Partner name: MBG Sonics

Description:
"Distribute your music to Spotify, 
Apple Music, Tidal and major 
streaming platforms worldwide 
through our official distribution 
partner MBG Sonics."

Button: "Distribute My Music"

Tapping the button opens the 
Distribution Request Flow described 
in Part 2.

---

## Part 2 — Distribution Request Flow

### Entry points
The distribution flow can be 
triggered from two places:

1. The MBG Sonics card on the 
   Pro Resources screen — 
   distributes a track the 
   creator selects

2. A nudge on the track management 
   screen after a creator uploads 
   a track:
   "Get this track on Spotify and 
   major platforms. Distribute 
   through MBG Sonics."
   Button: "Distribute This Track"
   Tapping pre-selects this track 
   in the distribution form

### Step 1 — Select track
If coming from the Pro Resources 
card show a track selector:

"Which track would you like to distribute?"

Show a list of the creator's 
uploaded tracks with title and 
cover art. Creator selects one.

If coming from the track nudge 
skip this step — the track is 
already pre-selected.

### Step 2 — Distribution form
Show a form with the following fields:

**Pre-populated automatically 
(not editable by creator):**
- Artist name: pulled from profile
- Track title: pulled from track data
- Genre: pulled from track data
- ISRC code: pulled from track data
- Creator email: pulled from profile
- SoundBridge Creator ID: user UUID

**Creator fills in:**

Requested release date (required)
Label: "When would you like 
this track to go live?"
Date picker — minimum 7 days 
from today to allow processing time

Featured artists (optional)
Label: "Any featured artists 
on this track?"
Placeholder: "e.g. ft. Artist Name"
Leave blank if none

Explicit content (required)
Label: "Does this track contain 
explicit content?"
Toggle: Yes or No

**Distribution fee:**
Show the fee clearly before payment:

"Distribution fee: £[AMOUNT]"
Note: Replace £[AMOUNT] with 
the actual price confirmed by 
Isreal after the call. Use £75 
as placeholder until confirmed.

A breakdown below the fee:
"This covers distribution to 
Spotify, Apple Music, Tidal, 
Amazon Music, YouTube Music 
and 150+ platforms worldwide."

### Step 3 — Payment
A pay button at the bottom:
"Pay £[AMOUNT] and Submit"

Process payment through the 
existing Stripe payment flow.

On successful payment:
- Create a distribution_requests 
  record in the database
- Trigger the automated email 
  to MBG Sonics described in Part 3
- Show creator a confirmation screen:
  "Your distribution request has 
  been submitted successfully.
  
  Track: [Track Title]
  Release date: [Date]
  Reference: [distribution request ID]
  
  MBG Sonics will process your 
  request and your track will 
  be live on streaming platforms 
  by your requested release date.
  
  We will notify you when your 
  track goes live."

---

## Part 3 — Automated Email to 
## MBG Sonics

When a distribution request is 
successfully paid and submitted 
send an automated email to 
MBG Sonics immediately.

Send to: [Isreal's email — 
to be confirmed after call]

Subject: "New Distribution Request 
from SoundBridge — [Track Title] 
by [Artist Name]"

Email body:

"Hi MBG Sonics team,

A new distribution request has 
been submitted through SoundBridge.

TRACK DETAILS
Track Title: [Track Title]
Artist Name: [Artist Name]
Featured Artists: [Featured Artists 
or Not Applicable]
Genre: [Genre]
ISRC Code: [ISRC Code]
Explicit Content: [Yes or No]
Requested Release Date: [Date]

CREATOR DETAILS
Creator Email: [Email]
SoundBridge Creator ID: [UUID]

DISTRIBUTION FEE
Amount paid by creator: £[Amount]
SoundBridge reference: [Request ID]

TRACK DOWNLOAD
Please download the track file 
using the secure link below. 
This link expires in 7 days:

[SECURE DOWNLOAD LINK]

Cover art download:
[SECURE COVER ART LINK]

Please confirm receipt of this 
request by replying to this email.

Thank you.

SoundBridge Live Ltd
justice@soundbridge.live"

### Secure download link generation
Generate a signed URL from 
Supabase storage for both the 
audio file and the cover art.

Set expiry to 7 days — sufficient 
time for Isreal to download 
without exposing files permanently.

Use Supabase's existing signed 
URL generation — do not build 
a custom file server.

---

## Part 4 — Distribution Requests 
## Database Table



distribution_requests (
id: UUID primary key
creator_id: UUID FK to profiles
track_id: UUID FK to audio_tracks
artist_name: text
track_title: text
genre: text
isrc_code: text
featured_artists: text | null
explicit_content: boolean
requested_release_date: date
creator_email: text
stripe_payment_id: text
amount_paid: decimal
amount_owed_to_partner: decimal
soundbridge_margin: decimal
payment_to_partner_status: text
default ‘pending’
– ‘pending’ ‘paid’
payment_to_partner_date: timestamptz | null
email_sent_to_partner: boolean default false
email_sent_at: timestamptz | null
track_status: text default ‘submitted’
– ‘submitted’ ‘processing’
– ‘live’ ‘failed’
track_went_live_at: timestamptz | null
created_at: timestamptz
)


Note: amount_owed_to_partner and 
soundbridge_margin are placeholder 
fields. The actual split values 
will be hardcoded after the call 
with Isreal confirms pricing.

---

## Part 5 — Admin Dashboard Section

Add a Distribution Requests section 
to the existing admin dashboard.

### Summary cards
Total distributions submitted this month
Total revenue from distribution fees
Total amount owed to MBG Sonics
Total paid to MBG Sonics

### Requests table
Columns:
- Creator name and username
- Track title
- Submitted date
- Requested release date
- Amount paid
- Amount owed to MBG Sonics
- Email sent to partner: Yes or No
- Track status
- Partner payment status

### Actions per row
Mark as Live — updates track_status 
to live and sends creator notification:
"Your track [Track Title] is now 
live on streaming platforms."

Mark Partner Paid — updates 
payment_to_partner_status to paid 
and records the date

---

## Part 6 — Creator Notification 
## When Track Goes Live

When Justice marks a distribution 
request as Live in the admin dashboard 
send the creator a push notification 
and email:

Push notification:
Title: "Your track is live"
Body: "[Track Title] is now available 
on Spotify, Apple Music and major 
streaming platforms."

Email:
Subject: "Your track is live on 
streaming platforms"

"Hi [Creator Name],

Great news. Your track [Track Title] 
is now live on Spotify, Apple Music, 
Tidal, Amazon Music, YouTube Music 
and major streaming platforms worldwide.

Search for your track on your 
preferred platform to verify it 
is live.

Thank you for distributing through 
SoundBridge.

Justice Asibe
Founder and CEO, SoundBridge Live Ltd"

---

## Placeholder Values to Replace 
## After Call with Isreal

The following values are placeholders 
and must be updated after the call:

- Distribution fee shown to creator: 
  currently £75 — replace with 
  confirmed price
- Amount owed to MBG Sonics: 
  currently £60 — replace with 
  confirmed wholesale price
- SoundBridge margin: 
  currently £15 — replace with 
  actual difference
- Isreal's email address for 
  automated emails: currently 
  placeholder — replace with 
  confirmed email
- Platform list: currently 
  "Spotify, Apple Music, Tidal, 
  Amazon Music, YouTube Music 
  and 150+ platforms" — confirm 
  exact platforms with Isreal

---

## General Rules
- Card design on Pro Resources 
  screen must exactly match 
  existing card components
- Logo file: mbg.png — add to 
  assets before building
- Payment via Stripe only — 
  no other payment method
- Secure download links via 
  Supabase signed URLs only
- Links expire after 7 days
- Creator UUID always used as 
  Creator ID — never null
- All placeholder values clearly 
  marked for replacement after call
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria

### Pro Resources Card
- [ ] MBG Sonics card added to 
      Pro Resources screen
- [ ] Card design matches existing 
      cards exactly
- [ ] mbg.png logo displays correctly
- [ ] Distribute My Music button 
      opens distribution flow

### Distribution Form
- [ ] Track selector works correctly 
      from Pro Resources entry point
- [ ] Track pre-selected from 
      nudge entry point
- [ ] All pre-populated fields 
      pull correct data
- [ ] Release date picker enforces 
      7 day minimum
- [ ] Featured artists field optional
- [ ] Explicit content toggle works
- [ ] Distribution fee displayed correctly
- [ ] Payment processes through 
      existing Stripe flow

### Post-Payment
- [ ] distribution_requests record 
      created on payment success
- [ ] Confirmation screen shows 
      correct details and reference ID
- [ ] Automated email sent to 
      MBG Sonics immediately
- [ ] Email contains all correct 
      track and creator details
- [ ] Secure download links generated 
      and included in email
- [ ] Links expire after 7 days
- [ ] email_sent_to_partner updated 
      to true after send

### Admin Dashboard
- [ ] Distribution Requests section added
- [ ] Summary cards display correctly
- [ ] Requests table shows all fields
- [ ] Mark as Live updates status 
      and sends creator notification
- [ ] Mark Partner Paid updates 
      payment status and date
- [ ] Creator push notification 
      sends correctly when marked live
- [ ] Creator email sends correctly 
      when marked live

### Track Nudge
- [ ] Nudge appears on track 
      management screen after upload
- [ ] Tapping nudge pre-selects 
      track in distribution form

### General
- [ ] No existing Pro Resources 
      functionality broken
- [ ] No existing Stripe flow broken
- [ ] Tested on iOS Android and web


🙏🏾