# Partner Referral Tracking System
# Dan Edmund and Sound Academy

## Before Writing Any Code
1. Find the existing user signup flow 
  on both the mobile app and web app
2. Find how subscription tiers are 
  currently assigned to users
3. Find the existing profiles table 
  and all relevant fields
4. Find how Premium access is currently 
  activated for users
5. Find the existing Stripe subscription 
  flow on the web app
6. Find any existing referral or 
  tracking system in the codebase
7. Report findings before making 
  any changes

---

## Overview
Build a referral tracking system that:

1. Gives Dan Edmund (dguitroman@gmail.com , User UID 55b5bc91-5f6a-4155-9594-2e0237417976)a unique referral 
  link so subscribers who join through 
  him are tracked and he earns 10% 
  commission automatically

2. Gives Sound Academy students a 
  dedicated signup link that 
  automatically identifies them as 
  Sound Academy students and activates 
  one year of free Premium access 
  upon signup

Both must work on mobile app and web app.

---

## Part 1 — Referral Link System 
## (Dan Edmund and future partners)

### Database additions

Add the following to the existing 
profiles or a new partners table:



partners (
id: UUID primary key
user_id: UUID FK to profiles
referral_code: text unique
referral_link: text unique
commission_rate: decimal default 0.10
total_referrals: integer default 0
total_subscribers_referred: integer default 0
total_commission_earned: decimal default 0
created_at: timestamptz
)

referral_signups (
id: UUID primary key
partner_id: UUID FK to partners
referred_user_id: UUID FK to profiles
signed_up_at: timestamptz
converted_to_paid: boolean default false
converted_at: timestamptz | null
subscription_tier: text | null
commission_amount: decimal | null
commission_paid: boolean default false
)


### Dan Edmund's referral link

Generate a unique referral code for 
Dan Edmund's partner account.

Format: soundbridge.live/join?ref=danedmund

or on mobile via deep link:
soundbridge://join?ref=danedmund

The ref parameter is stored in the 
referral_signups table when a new 
user completes signup through the link.

### How referral tracking works

When a user visits any signup page 
with a ref parameter in the URL:

1. Store the referral code in a 
   cookie or local session for 30 days
2. When the user completes signup 
   create a referral_signups record 
   linking their new account to 
   the partner
3. When that referred user subscribes 
   to any paid tier update 
   converted_to_paid to true and 
   calculate commission:
   commission_amount = subscription 
   monthly value multiplied by 
   commission_rate (0.10 for Dan)
4. Update total_commission_earned 
   on the partners record

### Commission visibility for partners

Add a simple Partner Dashboard 
accessible from the partner's 
profile settings showing:

- Total users referred
- Total who converted to paid
- Total commission earned to date
- Commission pending payment
- A table of referred users 
  (anonymised — show join date 
  and subscription status only, 
  not names)

This dashboard lives on the web app 
and is accessible to any user 
with a partner record.

---

## Part 2 — Sound Academy Student 
## Signup Flow

### Dedicated signup URL

Create a dedicated signup page at:
soundbridge.live/join/soundacademy

This page is identical to the 
standard signup page with two 
additions:

1. A Sound Academy branded header:
   Sound Academy logo (use @sa.jpg)
   Text: "Welcome, Sound Academy student. 
   Create your free SoundBridge account 
   to activate your one year Premium 
   access."

2. A hidden field that tags this 
   signup as source: 'sound_academy'

### On signup completion

When a user completes signup through 
soundbridge.live/join/soundacademy:

1. Create their account as normal
2. Automatically set their subscription 
   tier to Premium
3. Set premium_expires_at to exactly 
   one year from signup date
4. Set a field on their profile:
   institutional_partner: 'sound_academy'
   institutional_access_granted_at: now
   institutional_access_expires_at: 
   one year from now
5. Do not require any payment or 
   card details for this signup flow
6. Send them a welcome email confirming 
   their one year Premium access 
   is active

### Database additions for institutional access

Add to the profiles table or a 
separate institutional_access table:



institutional_access (
id: UUID primary key
user_id: UUID FK to profiles
institution: text – ‘sound_academy’
access_tier: text – ‘premium’
granted_at: timestamptz
expires_at: timestamptz
is_active: boolean default true
)


### When institutional access expires

30 days before expiry send an 
automated email:

"Your Sound Academy Premium access 
expires in 30 days. To continue 
enjoying Premium features subscribe 
at £6.99/month."

On expiry date set is_active to false 
and downgrade their tier to Free 
unless they have an active Stripe 
subscription.

### Mobile app deep link

The Sound Academy signup link must 
also work as a deep link on mobile:

soundbridge://join/soundacademy

When tapped on a mobile device 
open the app directly to the 
Sound Academy signup screen if 
the app is installed, or redirect 
to soundbridge.live/join/soundacademy 
if not installed.

---

## Part 3 — Admin Dashboard Additions

Add two sections to the existing 
admin dashboard:

### Partners section
Table showing all partners with:
- Partner name and username
- Referral code and link
- Total referrals
- Total paid conversions
- Total commission earned
- Commission pending payment
- Date joined as partner

A button to create a new partner 
record for any existing user — 
Justice uses this to set up new 
partner accounts like Dan Edmund.

### Institutional Access section
Table showing all institutional 
signups with:
- User name and username
- Institution name
- Access tier
- Date granted
- Expiry date
- Status (Active or Expired)

Filter by institution name.

---

## Email Templates Required

### Dan Edmund — referral link delivery
Subject: Your SoundBridge Referral Link

"Hey Dan, here is your unique 
referral link. Share this with 
your network and anyone who subscribes 
to SoundBridge through your link 
earns you 10% commission automatically.

Your link: [referral link]

You can track your referrals and 
commission anytime from your 
SoundBridge dashboard.

Justice | SoundBridge"

### Sound Academy students — welcome email
Subject: Your SoundBridge Premium 
Access is Active

"Welcome to SoundBridge.

Your one year Premium access has 
been activated as part of the 
Sound Academy partnership with 
SoundBridge.

Here is what to do next:
- Complete your profile with your 
  bio, photo and genre
- List your audio engineering 
  services so clients can find 
  and book you
- Upload a sample of your work

Your Premium access is active 
until [expiry date].

Any questions reach out anytime.

Justice | SoundBridge"

---

## General Rules
- Referral tracking must persist 
  for 30 days from first click
- Sound Academy signup requires 
  no payment details
- Institutional access expires 
  automatically on the correct date
- Commission is tracked but not 
  paid automatically — Justice 
  pays manually and marks as paid 
  in the admin dashboard
- All partner and institutional 
  data visible in admin dashboard
- Deep links work on iOS and Android
- No existing signup flow broken

---

## Acceptance Criteria

### Referral System
- [ ] partners table created
- [ ] referral_signups table created
- [ ] Dan Edmund partner record created 
      with unique referral code
- [ ] Referral link works on web 
      and mobile
- [ ] ref parameter captured on signup
- [ ] referral_signups record created 
      on new user signup via link
- [ ] converted_to_paid updates when 
      referred user subscribes
- [ ] Commission calculated correctly 
      at 10%
- [ ] Partner dashboard shows correct 
      data
- [ ] Admin dashboard partners section 
      works correctly
- [ ] New partner creation works 
      from admin dashboard

### Sound Academy
- [ ] soundbridge.live/join/soundacademy 
      page live with Sound Academy branding
- [ ] Signup completes without payment
- [ ] Premium activated automatically 
      on signup
- [ ] institutional_access record created
- [ ] Expiry date set to exactly 
      one year from signup
- [ ] Welcome email sent on signup
- [ ] 30 day expiry warning email works
- [ ] Tier downgraded to Free on expiry
- [ ] Mobile deep link works on 
      iOS and Android
- [ ] Admin institutional access 
      section shows correct data
- [ ] No existing signup flow broken


🙏🏾