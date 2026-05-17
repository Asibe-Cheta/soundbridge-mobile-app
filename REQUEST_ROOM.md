# Request Room — Full Feature Specification

## Before Writing Any Code
1. Find the existing Live Rooms screen and UI in the mobile app 
   codebase
2. Find the existing Live Rooms UI components, animations, and 
   design patterns
3. Find the existing digital wallet and payout system
4. Find how Stripe is currently integrated for payments
5. Find the Supabase Realtime implementation used elsewhere
6. Check if QR code generation exists anywhere in the codebase
7. Report back before making any changes

---

## Overview
Request Room is a feature that lives within the existing Live Rooms 
section on both the mobile app and web app. It allows any creator 
(DJ, singer, performer, podcaster) to open a live request session 
where their audience can make song requests and tip them directly 
in real time — without the audience needing to download the app 
or have an account.

The feature has two sharing methods:
1. QR Code — generated on the web app for laptop projection via 
   HDMI at venues and events
2. Shareable Link — generated on the mobile app for sending via 
   WhatsApp, Instagram DM, or any messaging platform

Both methods lead to the same public session page, wired to the 
creator's account and digital wallet.

---

## Feature Name & Entry Point

### Mobile App
- Add "Request Room" as a distinct option within the existing 
  Live Rooms screen
- Use the existing Live Rooms UI as a base but make Request Room 
  visually distinct — unique colour accent, icon, and description
- Description shown to creator before they start:
  "Open a live request session. Set a minimum tip, share your link 
  or QR code, and let your audience make song requests and tip you 
  in real time."
- On mobile, the creator can:
  1. Generate a shareable link directly (copy and send anywhere)
  2. Tap "Generate QR Code for Projection" which opens 
     soundbridge.live/request-room/[session-id] in the device 
     browser with a prompt to open on laptop for projection

### Web App
- Add Request Room to the web app dashboard
- On the web app, the creator can:
  1. Generate the QR code — displayed large and full screen, 
     ready for laptop to projector HDMI connection
  2. Copy the shareable link
- The web app Request Room dashboard is where the creator monitors 
  incoming requests and tips in real time when using the 
  projection setup

---

## Creator Setup Flow

1. Creator opens Request Room on mobile app or web app
2. They set:
   - Session name (optional, e.g. "Saturday Night at Lounge 44")
   - Minimum tip amount (required, e.g. £2, £5, £10)
3. Tap "Start Session"
4. System generates:
   - A unique session ID
   - A public URL: soundbridge.live/request/[session-id]
   - A QR code encoding that URL
5. Creator chooses:
   - "Project QR Code" — full screen QR code on web app for HDMI 
     projection
   - "Copy Link" — copies the session URL to clipboard for sharing
6. Session remains active until creator taps "End Session"
7. When session ends, the QR code and link become inactive

---

## Creator Dashboard UI (Mobile App and Web App)

This is the real time view the creator sees while their session 
is live. It should feel distinct from but inspired by the 
existing Live Rooms UI.

### Visual elements:
- Animated tip feed — every new tip that comes in triggers a 
  visual animation. Think coins or sound waves flying across 
  the screen, similar to live stream tip animations. Each tip 
  shows the amount and the tipper's name or "Anonymous"
- Running total — a live counter showing total tips earned 
  in this session
- Request queue — an ordered list of song requests with the 
  tip amount attached to each. Creator can mark each request 
  as "Playing" or "Done"
- Session stats — number of requests received, number of 
  tippers, total earned
- End Session button — prominent, clearly separate from 
  other controls

---

## Audience-Facing Session Page 
(Public web page, no app or account required)

URL format: soundbridge.live/request/[session-id]

### Page shows:
- Creator's profile photo and name
- Session name if set
- "Make a Song Request" heading
- Text field: "What song would you like to hear?"
- Tip amount field with minimum pre-filled and enforced — 
  user cannot submit below the minimum
- Optional email field:
  "Your email (optional — get updates from [Creator Name] 
  on SoundBridge)"
- Pay button via Stripe

### After payment:
- Confirmation screen: "Your request has been sent! 
  [Creator Name] will see it now."
- Invite prompt: "Want to support more artists like this? 
  Join SoundBridge free." with link to soundbridge.live

### For registered SoundBridge users:
- If the audience member is a registered SoundBridge user 
  and is logged in on their phone, they see a native 
  in-app version of the session page instead of the 
  browser page
- They can make requests and pay tips directly from 
  their in-app wallet without re-entering card details
- Their username appears on the creator's dashboard 
  instead of "Anonymous"

---

## Data Collection & Storage

### For non-registered tippers:
- If email is provided, store in a dedicated table: 
  `request_room_leads` with fields:
  - email
  - session_id
  - creator_id
  - tip_amount
  - song_request
  - created_at
  - converted (boolean — true if they later register 
    on SoundBridge)
- These emails are for SoundBridge marketing use only — 
  to invite them to join the platform
- Email collection must comply with GDPR — include a 
  clear opt-in statement on the form

### For registered SoundBridge users:
- Link their user_id to the request and tip
- Their data is already in the system — no additional 
  collection needed

### Session data stored:
- session_id
- creator_id
- session_name
- minimum_tip_amount
- started_at
- ended_at
- total_tips_collected
- total_requests_received

---

## Payment & Wallet

- All tips go through existing Stripe integration
- Net amount (after Stripe fees and SoundBridge 
  commission) credited directly to creator's existing 
  digital wallet in real time
- Use Supabase Realtime to push tip and request 
  notifications to creator dashboard instantly
- SoundBridge takes its standard commission percentage 
  — do not create a separate commission logic, use 
  whatever is already applied to tips elsewhere in 
  the app

---

## Technical Requirements

- Session URL must be publicly accessible with no 
  login required
- QR code encodes the session URL — use existing QR 
  code library if available, otherwise install one 
  compatible with React Native and Expo
- Supabase Realtime for live tip and request feed 
  on creator dashboard
- Session expires immediately when creator ends it — 
  QR code and link become inactive, page shows 
  "This session has ended"
- All session data persisted in database for 
  creator's records
- Test thoroughly on mobile browser (iOS Safari and 
  Android Chrome) as this is the primary audience 
  experience
- Test QR code scanning on both iOS and Android 
  native camera apps

---

## Logo

- Use @logo-trans-lockup.png for SoundBridge branding 
  on the public audience-facing session page and on 
  the QR code display screen

---

## Acceptance Criteria
- [ ] Request Room entry point visible within Live 
      Rooms on mobile app
- [ ] Creator can set minimum tip and start session
- [ ] QR code generates and displays full screen on 
      web app
- [ ] Shareable link copies correctly on mobile app
- [ ] Public session page works in mobile browser 
      with no account required
- [ ] Minimum tip enforced — cannot submit below 
      minimum
- [ ] Registered SoundBridge users see native in-app 
      version
- [ ] Tips credited to creator wallet in real time
- [ ] Animated tip feed displays on creator dashboard
- [ ] Request queue updates in real time
- [ ] Email leads stored in request_room_leads table 
      with GDPR compliant opt-in
- [ ] Session ends cleanly and link/QR becomes 
      inactive
- [ ] No existing Live Rooms functionality broken
- [ ] Tested on iOS and Android mobile browsers

---

## Web Team — Implementation Notes

### Database
Run `REQUEST_ROOM_DB_MIGRATION.sql` on the Supabase project 
(`aunxdbqukbxyyiusaeqi`). The mobile app will not work until 
this migration is applied.

### Public Audience Page
URL format: `soundbridge.live/request/[session-id]`

1. Read the session from `request_room_sessions` — if 
   `status` is not `'active'` or the row doesn't exist, 
   show "This session has ended."
2. Display the creator's profile photo and name (join on 
   `profiles` via `creator_id`).
3. Show the session name if set.
4. Accept: song request (text) + tip amount (enforced 
   minimum from `minimum_tip_amount`) + optional email 
   with GDPR opt-in checkbox.
5. Process payment via Stripe PaymentIntent.
6. On payment success, INSERT into `request_room_requests` 
   using the service_role key (bypasses RLS).
7. If email provided AND `gdpr_consent = true`, INSERT 
   into `request_room_leads`.
8. Credit creator wallet using the same commission logic 
   already applied to live session tips.

### Realtime
The mobile dashboard subscribes to `request_room_requests` 
via Supabase Realtime. No extra setup needed — Realtime is 
enabled by the migration.

### Creator Dashboard (Web App)
Mirror the mobile dashboard UI. The web dashboard is the 
primary view for creators using the QR projection setup 
(laptop → projector via HDMI). Show: animated tip feed, 
running total, request queue with Playing/Done controls, 
End Session button.

### QR Code (Web App)
On the web app, display the QR code full screen, ready for 
HDMI projection. Use `soundbridge.live/request/[session-id]` 
as the QR value. Embed the SoundBridge logo 
(`logo-trans-lockup.png`) in the centre of the QR code.