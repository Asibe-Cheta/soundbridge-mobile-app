# CRITICAL: Opportunity Project Payment — Two Required Backend Endpoints

## Context

SoundBridge is a global platform. Manual fixes are never acceptable.
Every payment must automatically trigger the next step in the flow for every user, at scale.

Currently confirmed broken in production:
- PaymentIntent `pi_3TBl5W0Bt6mXrdye0xGkcwHx` — £25.00 GBP — authorized (uncaptured)
- Project "I need a drummer" (`project_id: 8e8fdc13-0154-445d-88ff-2b27b1f910a2`)
- Status is still `payment_pending` — provider has no idea the payment was made

---

## Root Cause

The Stripe webhook `payment_intent.amount_capturable_updated` fires when a user
successfully authorizes payment in the Payment Sheet, but the backend is not acting on it.

The project status is never moved from `payment_pending` → `awaiting_acceptance`,
so the provider is never notified and the project cannot progress.

---

## Required Backend Work (Two Things)

### 1. Fix the Stripe Webhook Handler

Register and handle `payment_intent.amount_capturable_updated` in the webhook endpoint.

When this event fires:

```js
// pseudocode
const paymentIntent = event.data.object;
const project = await db.opportunity_projects.findOne({
  stripe_payment_intent_id: paymentIntent.id,
  status: 'payment_pending',
});

if (!project) return; // already handled or not an opportunity project

await db.opportunity_projects.update(project.id, {
  status: 'awaiting_acceptance',
});

await sendPushNotification(project.creator_user_id, {
  title: 'Project Ready — Review Agreement',
  body: `Payment secured in escrow. Tap to review and accept the project agreement.`,
  data: { type: 'project_payment_confirmed', project_id: project.id },
});
```

Also handle `payment_intent.payment_failed` to keep status at `payment_pending`
and optionally notify the poster that their card failed.

### 2. New Endpoint: `POST /api/opportunity-projects/:id/confirm-payment`

This is the mobile app's belt-and-suspenders call made immediately after the
Payment Sheet succeeds. It does the same job as the webhook but is triggered
directly by the mobile — so payment confirmation happens in under 1 second,
even if the webhook is delayed.

**Request:** Authenticated. No body needed (payment intent ID is already on the project).

**Logic:**
```js
const project = await db.opportunity_projects.findOne(id);

// Guard: only the poster can call this
if (project.poster_user_id !== req.user.id) return 403;

// Guard: only move forward if currently payment_pending
if (project.status !== 'payment_pending') {
  return res.json(project); // idempotent — already confirmed
}

// Verify with Stripe directly
const paymentIntent = await stripe.paymentIntents.retrieve(project.stripe_payment_intent_id);

if (paymentIntent.status === 'requires_capture') {
  await db.opportunity_projects.update(id, { status: 'awaiting_acceptance' });
  await sendPushNotification(project.creator_user_id, {
    title: 'Project Ready — Review Agreement',
    body: `Payment secured in escrow. Tap to review and accept.`,
    data: { type: 'project_payment_confirmed', project_id: id },
  });
}

return res.json(await db.opportunity_projects.findOne(id)); // return updated project
```

**Response:** Full updated `OpportunityProject` object (same shape as `GET /api/opportunity-projects/:id`).

---

## Why Both Are Required

| Scenario | Webhook alone | Confirm-payment endpoint alone | Both |
|----------|--------------|-------------------------------|------|
| Normal flow | ✅ Works (but ~5–30s delay) | ✅ Works instantly | ✅ Best |
| Webhook temporarily down | ❌ Project stuck forever | ✅ Still works | ✅ |
| Mobile offline after payment | ✅ Webhook handles it | ❌ Never called | ✅ |
| At scale (millions of users) | Reliable only if infra is perfect | Reliable only if mobile is online | ✅ Always reliable |

Manual SQL fixes are not an option for a global platform. Both must be implemented.

---

## The Full Escrow Flow (for reference)

```
1. Poster accepts interest + sets amount
   POST /api/opportunities/:id/interests/:iid/accept
   └── Backend: creates PaymentIntent (capture_method: manual) → returns client_secret

2. Mobile presents Payment Sheet → user authorizes card
   └── Stripe fires: payment_intent.amount_capturable_updated
   └── Mobile calls: POST /api/opportunity-projects/:id/confirm-payment

   BOTH of the above must → project.status: 'awaiting_acceptance' + notify provider

3. Provider sees notification → taps "Accept Agreement"
   POST /api/opportunity-projects/:id/accept-agreement
   └── project.status → 'active'

4. Provider completes work → taps "Mark Delivered"
   POST /api/opportunity-projects/:id/mark-delivered
   └── project.status → 'delivered', notify poster (48h auto-release countdown starts)

5. Poster confirms delivery
   POST /api/opportunity-projects/:id/confirm-delivery
   └── stripe.paymentIntents.capture(payment_intent_id)
   └── stripe.transfers.create({ amount: payout_amount, destination: provider_stripe_account })
   └── project.status → 'completed'
   └── SoundBridge keeps the 12% platform fee in its own Stripe balance
```

---

## Platform Fee Verification

Once the flow works end-to-end, confirm in Stripe:

| Transaction | Total | Platform Fee (12%) | Provider Payout |
|-------------|-------|--------------------|-----------------|
| "Looking for a trumpeter" (completed) | £10.00 | £1.20 | £8.80 |
| "I need a drummer" (pending) | £25.00 | £3.00 | £22.00 |

Platform fees should appear in Stripe under: Payments → Collected fees.

---

---

## Urgent Gig Confirm-Payment Endpoint (Same Pattern)

The mobile also calls this immediately after Payment Sheet for urgent gigs:

**`POST /api/gigs/:id/confirm-payment`**

**Logic:**
```js
const gig = await db.opportunity_posts.findOne(id);

// Guard: only the requester can call this
if (gig.created_by !== req.user.id) return 403;

// Idempotent: already escrowed
if (gig.payment_status === 'escrowed') return res.json(gig);

// Verify with Stripe
const paymentIntent = await stripe.paymentIntents.retrieve(gig.stripe_payment_intent_id);
if (paymentIntent.status !== 'requires_capture') return 400;

await db.opportunity_posts.update(id, {
  payment_status: 'escrowed',
  urgent_status: 'searching',
});

// Send push to all matched providers (same as webhook flow)
await notifyMatchedProviders(gig);

return res.json(updated_gig);
```

**Response:** Full updated `UrgentGig` object.

The Stripe webhook `payment_intent.amount_capturable_updated` should also handle
this for urgent gigs (advance payment_status + urgent_status + notify providers),
mirroring the opportunity project webhook.

---

## Priority

**P0 — Critical.** Every opportunity project AND urgent gig payment on the platform is
currently relying solely on webhooks. The money leaves the user's card but without
the confirm-payment endpoints and robust webhook handling, projects and gigs cannot
start reliably at scale.
