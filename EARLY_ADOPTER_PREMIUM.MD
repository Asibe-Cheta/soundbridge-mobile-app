# Early Adopter Premium Expiry — Conversion Flow

## Before Writing Any Code
1. Find the existing early adopter 
  records in the database and how 
  their 3 month Premium access 
  is stored
2. Find how subscription tiers are 
  currently checked and enforced
3. Find the existing modal and 
  notification system in the 
  mobile app
4. Find how the existing upgrade 
  flow redirects to the web pricing 
  page
5. Find how push notifications are 
  currently sent
6. Report findings before making 
  any changes

---

## Overview
When an early adopter's 3 month 
free Premium access expires, show 
them a conversion flow that invites 
them to continue as a paying Premium 
subscriber. The flow should feel 
warm and appreciative, not pushy, 
and give them a clear reason to 
continue.

---

## Part 1 — Expiry Detection

Check daily in a background job 
for early adopter accounts whose 
Premium access has expired or 
is about to expire.

Three stages:

Stage 1 — 7 days before expiry:
Send a push notification and 
in-app notification:

Title: "Your Premium access expires 
in 7 days"

Body: "You have been with us from 
the beginning. We would love to 
keep you on Premium. Continue for 
just £6.99 per month."

Stage 2 — 1 day before expiry:
Send a push notification:

Title: "Your Premium access expires 
tomorrow"

Body: "Do not lose access to your 
Premium features. Continue for 
just £6.99 per month."

Stage 3 — Day of expiry:
Downgrade their account to Free 
tier automatically.
Trigger the conversion modal 
described in Part 2.

---

## Part 2 — Conversion Modal

On the first app open after their 
Premium access has expired show 
a full screen modal.

### Modal design
Match the existing modal style 
in the app.

**Header:**
A warm appreciative headline:
"You have been here from the start."

**Subheader:**
"Your 3 month Premium access has 
now ended. Thank you for being 
one of our earliest supporters. 
We built something we are proud 
of and you were part of that."

**Feature reminder section:**
Show a brief list of what they 
are losing access to:

- Unlimited music uploads
- AI Career Adviser
- Advanced event analytics
- Headline Posts
- Audio snippet trimmer
- Priority discovery placement

**Pricing line:**
"Continue as a Premium member 
for just £6.99 per month."

**Primary CTA button:**
"Continue as Premium"

Tapping this redirects to 
soundbridge.live/pricing 
using the existing upgrade 
redirect flow.

**Secondary option:**
"Remind me later"

Tapping this dismisses the modal 
for 3 days. After 3 days it 
appears again on next app open.

**Tertiary option in small text:**
"Continue with Free plan"

Tapping this dismisses the modal 
permanently and keeps them on 
the Free tier. Do not show the 
modal again after this selection.

---

## Part 3 — Reminder Cadence

After the initial expiry modal 
if the user selects "Remind me 
later" show the modal again on 
the following schedule:

Day 3 after expiry: modal appears again
Day 7 after expiry: modal appears again
Day 14 after expiry: final modal 
appearance with slightly different 
copy:

"Still thinking about it? 
Premium is waiting for you 
whenever you are ready. 
£6.99 per month. Cancel anytime."

After day 14 stop showing the 
modal unless the user navigates 
to a Premium-only feature, in 
which case show the standard 
upgrade prompt for that feature.

---

## Part 4 — Feature Gate Reminders

When a user who was previously 
on Premium tries to access a 
Premium-only feature after expiry 
show a contextual prompt:

"You used to have access to this. 
Continue as Premium for £6.99 
per month to unlock it again."

Button: "Continue as Premium"
Secondary: "Maybe later"

This appears every time they 
attempt to access a Premium 
feature regardless of the 
modal reminder cadence.

---

## Part 5 — Push Notification 
## at Day 7 and Day 14

In addition to the in-app modal 
send push notifications at the 
7 day and 14 day marks if the 
user has not yet converted:

Day 7 push:
Title: "Your Premium features 
are waiting"
Body: "Come back to Premium for 
just £6.99 per month. Everything 
you had before is still there."

Day 14 push:
Title: "One last nudge 🙏🏾"
Body: "We would love to have you 
back on Premium. £6.99 per month. 
Cancel anytime."

After day 14 stop push notifications 
about Premium expiry.

---

## Database additions

Add fields to track conversion 
flow state per early adopter:



early_adopter_conversion (
user_id: UUID FK to profiles
access_expired_at: timestamptz
modal_last_shown_at: timestamptz
modal_dismissed_permanently:
boolean default false
reminder_count: integer default 0
converted_to_paid: boolean default false
converted_at: timestamptz | null
)


---

## General Rules
- The tone throughout must be 
  warm and appreciative, never 
  guilt-tripping or aggressive
- After day 14 stop all expiry 
  related modals and notifications
- If the user converts to paid 
  at any point stop all conversion 
  prompts immediately
- If the user selects "Continue 
  with Free plan" respect that 
  decision and stop the modal
- Feature gate prompts continue 
  indefinitely whenever they 
  try to access Premium features
- Match existing design system throughout
- Test on iOS and Android

---

## Acceptance Criteria
- [ ] Background job detects 
      expiry correctly
- [ ] 7 day warning notification 
      sends correctly
- [ ] 1 day warning notification 
      sends correctly
- [ ] Account downgraded to Free 
      on expiry date
- [ ] Conversion modal appears 
      on first app open after expiry
- [ ] Modal copy is warm and 
      appreciative
- [ ] Feature list displays correctly
- [ ] £6.99 pricing displayed correctly
- [ ] Continue as Premium redirects 
      to pricing page
- [ ] Remind me later dismisses 
      for 3 days
- [ ] Continue with Free dismisses 
      permanently
- [ ] Day 3 reminder modal appears
- [ ] Day 7 reminder modal appears
- [ ] Day 14 final modal appears 
      with updated copy
- [ ] Day 7 push notification sends
- [ ] Day 14 push notification sends
- [ ] Feature gate prompts appear 
      when Premium features accessed
- [ ] No prompts after day 14 
      except feature gates
- [ ] Conversion tracked in database
- [ ] No existing functionality broken
- [ ] Tested on iOS and Android
