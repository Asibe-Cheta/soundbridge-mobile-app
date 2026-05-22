# SoundBridge Digital Card — Cryptographic Authentication Layer

## Before Writing Any Code
1. Find the existing Persona verification 
  integration in the codebase
2. Find how the digital card is currently 
  generated and what data is embedded 
  in the QR code
3. Find the existing authentication flow — 
  Google sign in, Apple sign in, and 
  email/password routes
4. Find the existing account recovery 
  or password reset flow if any
5. Find how the QR code is currently 
  generated and what library is used
6. Find the existing Supabase auth 
  configuration
7. Report all findings before making 
  any changes

---

## Overview
Add a cryptographic authentication layer 
to the SoundBridge digital card so it 
can be used as a secure account recovery 
method. A creator who has lost access to 
their email and password can recover their 
account by uploading their original digital 
card combined with a live face verification 
via Persona.

The card must be cryptographically unique 
to the specific generation event. Duplicates, 
screenshots, or copies of the card — even 
pixel perfect ones — must fail verification. 
Only the original file saved by the creator 
at the time of generation is valid.

Supported original card formats: JPG, PNG, PDF

---

## Part 1 — Cryptographic Signature 
## at Card Generation

### When the card is generated
At the moment a creator generates their 
digital card, the system must:

1. Generate a unique cryptographic token 
  for this specific card generation event.

  The token is constructed from:
  - creator_id (UUID)
  - account_created_at timestamp
  - card_generated_at timestamp (millisecond precision)
  - A server-side secret key stored in 
    environment variables as CARD_SECRET_KEY
  - A random salt generated at generation time

  Hash these together using HMAC-SHA256 
  to produce the card_auth_token.

2. Store the following in a new database table:

card_auth_tokens (
id: UUID primary key
creator_id: UUID FK to profiles
card_auth_token: text — the HMAC hash
salt: text — the random salt used
generated_at: timestamptz
is_active: boolean default true
used_for_recovery_at: timestamptz | null
invalidated_at: timestamptz | null
file_fingerprint: text | null
)
   Only one active card_auth_token per 
   creator at any time. When a creator 
   regenerates their card, the previous 
   token is invalidated (is_active set 
   to false) and a new one is created.

3. Embed the card_auth_token into the 
   QR code on the digital card alongside 
   the profile URL.

   QR code payload format:
{
“url”: “soundbridge.live/[username]/home”,
“token”: “[card_auth_token]”,
“uid”: “[creator_id]”
}

Encode this as a JSON string then 
as the QR code value.

4. Generate a file fingerprint of the 
card image at generation time:
- Take the raw bytes of the generated 
  PNG or PDF
- Hash them using SHA-256
- Store this hash as file_fingerprint 
  in card_auth_tokens

This fingerprint is what makes 
duplicates detectable. Any modification 
to the file — including re-saving, 
screenshotting, or re-exporting — 
changes the bytes and therefore 
the fingerprint.

5. Show the creator a one-time notice 
when their card is generated:

Modal title: "Keep your original card safe"

Body: "Your SoundBridge card contains 
a unique security signature. If you 
ever lose access to your account, 
your original card file can be used 
to recover it. Copies and screenshots 
will not work — only your original 
saved file. Store it somewhere safe."

Button: "I understand"

This modal appears once per card 
generation only.

---

## Part 2 — Account Recovery Flow

### Entry point
Add a new option to the existing 
login screen:

Below the standard sign in options 
add a text link:
"Lost access? Recover with your 
SoundBridge card"

This opens the card recovery flow.

### Recovery screen — Step 1: Upload card

Screen title: "Recover Your Account"

Instruction text:
"Upload your original SoundBridge 
digital card file. Screenshots and 
copies will not work — you must 
upload the original file you saved 
when you generated your card."

File upload button:
"Upload My Card"

Accepts: JPG, PNG, PDF only
Maximum file size: 20MB

On upload:
1. Extract the QR code from the 
uploaded file. Use a QR code 
reading library to decode it.
Check what is available in the 
codebase before adding a dependency.

2. Parse the JSON payload from 
the QR code to extract:
- token (card_auth_token)
- uid (creator_id)

3. Generate a SHA-256 hash of the 
uploaded file's raw bytes

4. Send to the server:
- extracted token
- extracted uid
- file hash

5. Server checks:
a. Does a card_auth_token record exist 
   for this uid where is_active is true
b. Does the token match the stored 
   card_auth_token for this uid
c. Does the file hash match the stored 
   file_fingerprint

ALL THREE must pass.

If any check fails, return a clear 
error message:
"This card could not be verified. 
Please make sure you are uploading 
your original card file, not a 
screenshot or copy."

Do not reveal which specific check 
failed for security reasons.

6. If all three pass, mark this 
recovery attempt as pending and 
proceed to Step 2.

---

### Recovery screen — Step 2: 
### Face Verification (Verified creators only)

If the creator has completed Persona 
verification (check their profile for 
persona_verified: true):

Show a face verification prompt using 
the existing Persona integration.

Instruction text:
"To confirm your identity, we need 
to verify your face matches the 
identity on your account. This uses 
the same verification you completed 
when setting up your creator profile."

Trigger a Persona liveness check 
(not just a photo — must be live 
video to prevent photo spoofing).

On successful Persona verification:
- Proceed to Step 3

On failed Persona verification:
- Show error: "Face verification 
failed. If you are having trouble, 
please contact support at 
support@soundbridge.live"
- Do not proceed

---

### Recovery screen — Step 2 (alternative):
### Manual review (Unverified creators)

If the creator has NOT completed 
Persona verification:

Show a manual review notice:

"Since your account has not completed 
identity verification, your recovery 
request will be reviewed manually. 
This typically takes 24 to 48 hours.

Please record a short selfie video 
(5 to 10 seconds) saying your name 
and today's date. This helps us 
confirm your identity."

Video upload field.

On submission:
- Store the card file, file hash, 
token match result and selfie video 
in a recovery_requests table for 
manual admin review
- Show confirmation: "Your recovery 
request has been submitted. We will 
contact you within 48 hours."
- Notify Justice via admin dashboard 
of pending manual recovery request

---

### Recovery screen — Step 3: 
### Account access restored

On successful card verification AND 
face verification:

1. Invalidate the used card token:
- Set used_for_recovery_at to now
- Set is_active to false on the 
  card_auth_tokens record

2. Generate a secure one-time login 
token for this creator's account

3. Log them into their account 
using this token

4. Immediately prompt them to:
- Update their email address if 
  they have lost access to it
- Change their password
- Generate a new digital card 
  (since the old one is now 
  invalidated for recovery use)

5. Show a notice:
"You are back in. For security, 
your previous card has been 
invalidated. Please generate 
a new card to keep as your 
recovery backup."

---

## Part 3 — Admin Dashboard

Add a Card Recovery section to the 
existing admin dashboard showing:

- All recovery attempts (successful 
and failed)
- Pending manual review requests 
with the submitted card and 
selfie video
- Ability to approve or reject 
manual recovery requests
- Creator ID, timestamp and 
outcome for each attempt

---

## Part 4 — Security Rules

- A maximum of 3 failed recovery 
attempts per IP address per hour. 
After 3 failures lock recovery 
attempts from that IP for 1 hour.

- A maximum of 5 failed recovery 
attempts per creator_id per 24 hours. 
After 5 failures flag the account 
for admin review.

- All recovery attempts are logged 
with IP address, timestamp, 
outcome and creator_id.

- The CARD_SECRET_KEY used for 
HMAC generation must be stored 
only in server-side environment 
variables. Never expose it to 
the client.

- The file fingerprint check and 
token validation must happen 
server-side only. Never send 
the stored fingerprint or token 
to the client for comparison.

- Recovery tokens generated in 
Step 3 expire after 15 minutes 
if not used.

---

## Database Tables Required

card_auth_tokens (
id: UUID primary key
creator_id: UUID FK to profiles
card_auth_token: text
salt: text
generated_at: timestamptz
is_active: boolean default true
used_for_recovery_at: timestamptz | null
invalidated_at: timestamptz | null
file_fingerprint: text | null
)
recovery_attempts (
id: UUID primary key
creator_id: UUID | null
ip_address: text
attempted_at: timestamptz
outcome: ‘success’ | ‘failed_token’ |
‘failed_fingerprint’ |
‘failed_face’ | ‘pending_manual’
card_token_matched: boolean
fingerprint_matched: boolean
face_verified: boolean | null
notes: text | null
)
recovery_requests (
id: UUID primary key
creator_id: UUID
card_file_url: text
selfie_video_url: text
submitted_at: timestamptz
status: ‘pending’ | ‘approved’ | ‘rejected’
reviewed_by: text | null
reviewed_at: timestamptz | null
admin_notes: text | null
)

---

## Acceptance Criteria

### Card Generation
- [ ] HMAC-SHA256 token generated 
      at card creation
- [ ] Token stored in card_auth_tokens 
      table with salt and fingerprint
- [ ] Previous token invalidated when 
      new card generated
- [ ] Token embedded in QR code as 
      JSON payload alongside URL and uid
- [ ] File fingerprint generated and 
      stored correctly
- [ ] One-time safety notice shown 
      to creator after generation

### Recovery Flow
- [ ] Card recovery entry point on 
      login screen
- [ ] JPG, PNG and PDF uploads accepted
- [ ] QR code extracted and decoded 
      from uploaded file
- [ ] Token match check works correctly
- [ ] File fingerprint check works correctly
- [ ] Screenshot of card fails 
      fingerprint check
- [ ] All three checks must pass 
      before proceeding
- [ ] Persona face verification triggered 
      for verified creators
- [ ] Liveness detection used not 
      just photo check
- [ ] Manual review flow for 
      unverified creators
- [ ] Used token invalidated after 
      successful recovery
- [ ] Creator prompted to generate 
      new card after recovery
- [ ] Rate limiting applied per IP 
      and per creator

### Security
- [ ] CARD_SECRET_KEY server-side only
- [ ] Fingerprint and token checks 
      server-side only
- [ ] Recovery attempts logged fully
- [ ] Account flagged after 5 failed 
      attempts in 24 hours
- [ ] Recovery tokens expire after 
      15 minutes

### Admin Dashboard
- [ ] Recovery attempts visible 
      in admin dashboard
- [ ] Manual review requests visible 
      with card and video
- [ ] Approve and reject actions work
- [ ] No existing auth functionality broken
## Card Generation Limits

Track card generations per user in a 
new field on their profile or in the 
card_auth_tokens table using a monthly 
counter:

card_generations_this_month: integer default 0
card_generations_lifetime: integer default 0
card_generation_month: date 
  (reset counter when month changes)

Limits per tier:
- Free: 3 lifetime total
- Premium: 5 per month
- Unlimited: 15 per month

When a creator attempts to generate 
a card and has hit their limit show:

"You have used all your card generations 
for this period. Upgrade your plan to 
generate more."

With a link to the upgrade screen.

When a creator updates their profile 
photo, show a nudge asking if they 
want to regenerate their card. 
This nudge counts against their 
generation limit if they proceed.

Card regeneration invalidates the 
previous token and creates a new one. 
The old card file is no longer valid 
for account recovery.

Do not call remove.bg during card 
generation. Use the already processed 
profile photo stored in the database 
from when it was originally uploaded.
