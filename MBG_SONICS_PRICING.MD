
# MBG Sonics Distribution Feature
# Complete and Final Specification

## Before Writing Any Code
1. Find the existing Pro Resources screen and the 
   card design already used for Sound Academy, 
   Talk2Dan and University of Hertfordshire
2. Find the existing audio_tracks table and how 
   track files and cover art are stored in Supabase 
   storage or Cloudflare R2
3. Find the existing ISRC assignment system
4. Find the existing Stripe payment flow used for 
   subscriptions
5. Find the existing profiles table and how creator 
   emails and usernames are stored
6. Find the existing notification and email system
7. Find the existing admin dashboard structure
8. Report findings before making any changes

---

## Overview
Build a complete distribution feature allowing 
SoundBridge creators to distribute their music to 
Spotify, Apple Music, Tidal and major streaming 
platforms worldwide through MBG Sonics.

The fee is £15.79 per release, paid once by the 
creator. SoundBridge keeps 100% of this fee. There 
is no payment owed to MBG Sonics from this fee at 
any point. MBG Sonics is compensated entirely 
separately through their own royalty arrangement 
directly with the artist's streaming earnings once 
the track is live, completely outside of 
SoundBridge's involvement.

---

## Part 1 — MBG Sonics Card on Pro Resources Screen

Add an MBG Sonics card to the Pro Resources screen 
using the exact same card design already used for 
the other partner cards. Do not create a new design.

Logo: mbg.png (add to assets folder if not present)
Partner name: MBG Sonics
Description: "Distribute your music to Spotify, 
Apple Music, Tidal and major streaming platforms 
worldwide."
Button: "Distribute My Music"

Tapping opens the Distribution Request Flow in Part 2.

---

## Part 2 — Distribution Request Flow

### Entry points
1. The MBG Sonics card on Pro Resources, where the 
   creator selects which track to distribute
2. A nudge on the track management screen after 
   upload: "Get this track on Spotify and major 
   platforms. Distribute through MBG Sonics." with 
   a "Distribute This Track" button that pre-selects 
   that track

### Step 1 — Select track (Pro Resources entry only)
Show the creator's uploaded tracks with title and 
cover art, they select one.

### Step 2 — Cover art validation
Before proceeding, validate the selected track's 
cover art against distribution platform requirements:
- Minimum 3000 by 3000 pixels, square aspect ratio
- JPEG or PNG format
- No third party logos, URLs, or social media handles
- No explicit imagery unless marked explicit

If the existing cover art fails validation, show:

"Your current cover art does not meet streaming 
platform requirements. Please upload a new cover 
art image at least 3000 by 3000 pixels and square 
before continuing."

Provide an upload field specifically for this 
distribution-grade cover art, separate from their 
existing SoundBridge cover art.

### Step 3 — Distribution form

**Pre-populated automatically, not editable:**
- Artist name, from profile
- Track title, from track data
- Genre, from track data
- ISRC code, from track data
- Creator email, from profile
- SoundBridge Creator ID, the user's UUID

**Creator fills in:**

Requested release date (required), minimum 14 days 
from today to allow processing time

Featured artists (optional)

Explicit content toggle (required)

Rights confirmation checkbox (required):
"I confirm that I own or have the necessary rights 
to distribute this track, including any samples, 
co-writes or features."

### Step 4 — Fee and payment

Display:
"Distribution fee: £15.79"

Subtext: "This fee covers SoundBridge's facilitation 
service. Streaming royalty terms are separate and 
handled directly between you and MBG Sonics."

Button: "Pay £15.79 and Submit"

Process payment through the existing Stripe payment 
flow already used elsewhere in the app.

On successful payment:
- Create the distribution_requests record
- Trigger the automated email to MBG Sonics 
  described in Part 3
- Show confirmation:

"Your distribution request has been submitted 
successfully.

Track: [Track Title]
Release date: [Date]
Reference: [distribution request ID]

MBG Sonics will process your request and your track 
will be live on streaming platforms by your requested 
release date. We will notify you when it goes live."

---

## Part 3 — Automated Email to MBG Sonics

Send to MBG Sonics' email immediately on successful 
payment.

Subject: "New Distribution Request from SoundBridge 
— [Track Title] by [Artist Name]"

Body:

"Hi MBG Sonics team,

A new distribution request has been submitted 
through SoundBridge.

TRACK DETAILS
Track Title: [Track Title]
Artist Name: [Artist Name]
Featured Artists: [Featured Artists or Not Applicable]
Genre: [Genre]
ISRC Code: [ISRC Code]
Explicit Content: [Yes or No]
Requested Release Date: [Date]

CREATOR DETAILS
Creator Email: [Email]
SoundBridge Creator ID: [UUID]

Reference: [Request ID]

TRACK DOWNLOAD
[Secure download link, expires in 7 days]

Cover art download:
[Secure cover art download link]

Please confirm receipt by replying to this email.

Thank you.

SoundBridge Live Ltd
justice@soundbridge.live"

Generate secure download links using signed URLs 
from wherever the audio file and cover art are 
actually stored, expiring after 7 days.

---

## Part 4 — Database

distribution_requests ( id: UUID primary key creator_id: UUID FK to profiles track_id: UUID FK to audio_tracks artist_name: text track_title: text genre: text isrc_code: text featured_artists: text | null explicit_content: boolean rights_confirmed: boolean requested_release_date: date creator_email: text stripe_payment_id: text amount_paid: decimal default 15.79 payment_status: text default ‘paid’ email_sent_to_partner: boolean default false email_sent_at: timestamptz | null track_status: text default ‘submitted’ – ‘submitted’ ‘processing’ ‘live’ ‘failed’ track_went_live_at: timestamptz | null created_at: timestamptz )
Do not include any field for amount owed to MBG 
Sonics or any SoundBridge margin calculation, those 
do not apply, the full £15.79 belongs to SoundBridge 
with nothing owed onward.

---

## Part 5 — Admin Dashboard Section

Add a Distribution Requests section to the existing 
admin dashboard.

### Summary cards
- Total distributions submitted this month
- Total revenue from distribution fees this month

### Requests table
Columns: creator name, track title, submitted date, 
requested release date, amount paid, email sent to 
partner, track status

### Actions
"Mark as Live" — updates track_status to live, sets 
track_went_live_at, and triggers the creator 
notification in Part 6

There is no partner payment action of any kind, 
since no payment is ever owed to MBG Sonics from 
SoundBridge.

---

## Part 6 — Creator Notification When Track Goes Live

Push notification:
Title: "Your track is live"
Body: "[Track Title] is now available on Spotify, 
Apple Music and major streaming platforms."

Email:
Subject: "Your track is live on streaming platforms"

"Hi [Creator Name],

Great news. Your track [Track Title] is now live on 
Spotify, Apple Music, Tidal and major streaming 
platforms worldwide.

Search for it on your preferred platform to confirm.

Justice Asibe
Founder and CEO, SoundBridge Live Ltd"

---

## General Rules
- Fee is £15.79, fixed, no variation
- SoundBridge keeps 100% of the fee
- No payment ever owed to MBG Sonics from SoundBridge
- Minimum 14 day lead time on release date
- Cover art must pass validation before submission allowed
- Rights confirmation checkbox required before payment
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] MBG Sonics card added to Pro Resources, 
      matching existing design
- [ ] Track selection works from Pro Resources entry
- [ ] Nudge on upload screen pre-selects track correctly
- [ ] Cover art validation blocks non-compliant 
      images with clear error message
- [ ] Distribution-grade cover art upload works separately
- [ ] All pre-populated fields pull correct real data
- [ ] Release date enforces 14 day minimum
- [ ] Rights confirmation checkbox required before payment
- [ ] Fee displayed correctly as £15.79 with facilitation clarity line
- [ ] Payment processes through existing Stripe flow
- [ ] distribution_requests record created only after 
      successful payment
- [ ] No partner owed amount or margin field present anywhere
- [ ] Automated email to MBG Sonics sends correctly 
      with working secure download links
- [ ] Confirmation screen displays correct reference 
      and release date
- [ ] Admin dashboard section displays correctly
- [ ] Mark as Live triggers correct creator notification
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
