
# Tip Room Feature
# Frictionless Instant Tipping Without Performance Context

## Before Writing Any Code
1. Find the existing Live Sessions screen and 
   how RadioLab and Request Room are structured 
   as tabs
2. Find the existing Request Room QR code 
   generation logic
3. Find the existing Digital Card and its QR code
4. Find the existing Stripe tipping flow
5. Report findings before making any changes

---

## Overview
Add a Tip Room tab to the Live Sessions screen, 
giving creators a dedicated QR code that leads to 
a minimal, single purpose tipping page, no profile, 
no scrolling, just an amount and a pay button.

This is distinct from Request Room, which is tied 
to live performance and song requests. Tip Room is 
for any moment a creator wants frictionless support, 
a merch table, a flyer, a casual meetup, anywhere.

---

## Part 1 — Tip Room Tab

Add "Tip Room" as a new tab on the Live Sessions 
screen, alongside the existing RadioLab and 
Request Room tabs.

### Tip Room screen for the creator
Display their dedicated Tip Room QR code prominently.

Headline: "Your Tip Room"
Subtext: "Show this QR code anywhere you want instant, 
frictionless support, no profile, no app required 
to give."

Below the QR code, show a simple live counter of 
tips received through this specific QR code today, 
this week, this month.

A "Share Tip Room Link" button, since some contexts 
need a tappable link rather than a scannable code.

---

## Part 2 — The Scan Experience

### What the supporter sees
When someone scans the Tip Room QR code, they land 
on a minimal page, not the creator's profile, not 
the fan landing page.

Show only:
- Creator name and profile photo, small, at the top
- Headline: "Support [Creator Name]"
- An amount input, defaulting to £1, editable
- Quick preset buttons: £1, £5, £10
- A single "Pay" button

No scrolling content, no music player, no bio, 
nothing else on this screen.

### On payment
Process through the existing Stripe tipping flow.

On success, show:
"Thank you for supporting [Creator Name]."

Then, exactly as with other tip flows, offer the 
existing post-tip community join prompt, but only 
after the payment is complete, never before it.

---

## Part 3 — Database

```
tip_room_qr_codes (
  id: UUID primary key
  creator_id: UUID FK to profiles
  qr_code_url: text
  created_at: timestamptz
)

tip_room_tips (
  id: UUID primary key
  creator_id: UUID FK to profiles
  amount: decimal
  tipped_at: timestamptz
)
```

Each creator gets exactly one persistent Tip Room 
QR code, generated once and reused indefinitely, 
not regenerated per session.

---

## General Rules
- This QR code never expires
- No profile browsing or scrolling before payment, 
  the scan to pay path must be as short as possible
- Reuses existing Stripe tipping infrastructure, 
  no new payment logic
- Match existing design system throughout
- Test on iOS Android and web

---

## Acceptance Criteria
- [ ] Tip Room tab added to Live Sessions screen
- [ ] Persistent QR code generated once per creator
- [ ] Tip counter displays correctly for today, 
      week, and month
- [ ] Share Tip Room Link works correctly
- [ ] Scanning leads directly to minimal single 
      purpose payment screen, no profile content
- [ ] Amount input and preset buttons work correctly
- [ ] Payment processes through existing Stripe flow
- [ ] Post-tip community join prompt appears only 
      after successful payment
- [ ] No existing functionality broken
- [ ] Tested on iOS Android and web
```

