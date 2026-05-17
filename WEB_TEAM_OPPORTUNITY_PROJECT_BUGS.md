# 🚨 URGENT — Two Opportunity/Project Bugs Blocking the Full Flow

---

## Bug 1: "Failed to create project" — Accept Interest Still 500ing

### What's Happening

The conversation fix worked — the error changed. But now the endpoint crashes one step later:

```
POST /api/opportunities/18155649-6ce5-4e76-a075-6bb5ad6b3541/interests/c4be2175-9d71-47eb-b783-b1f6ad201bb0/accept
→ HTTP 500 { "error": "Failed to create project" }
```

### Evidence from Stripe Dashboard

Stripe shows **two Incomplete £30 PaymentIntents** for "Project: I need a drummer":
- 15 Mar, 14:43 — Incomplete (yesterday's failed attempt)
- 16 Mar, 11:13 — Incomplete (today's failed attempt)

This means:
1. The conversation is now being created successfully ✅
2. Stripe PaymentIntent IS being created successfully ✅
3. But the `opportunity_projects` (or equivalent) table **insert is failing** ❌
4. The endpoint returns 500 without capturing or cancelling the Stripe PaymentIntent, leaving orphaned Incomplete intents in Stripe

### What to Fix

1. **Find the project insert in the `/accept` route** — log the actual DB error (same pattern as the conversation fix)
2. **Check `opportunity_projects` table constraints** — likely a NOT NULL column missing from the insert, a unique constraint violation (project for this interest already exists from attempt 1), or an RLS policy blocking the insert
3. **Handle duplicate project** — if a project for this `interest_id` already exists (from a previous failed attempt), reuse it rather than inserting again:
   ```js
   let project = await db.opportunity_projects.findOne({ where: { interest_id: interestId } });
   if (!project) {
     project = await db.opportunity_projects.create({ ... });
   }
   ```
4. **Cancel orphaned Stripe PaymentIntents** — if the project insert fails, cancel the PaymentIntent that was just created so Stripe doesn't accumulate Incomplete intents. Or better: create the project record FIRST, then create the Stripe PaymentIntent.

### Orphaned Stripe PaymentIntents to Cancel

These should be cancelled immediately in the Stripe dashboard to keep things clean:
- £30 Incomplete — "Project: I need a drummer" — 15 Mar, 14:43
- £30 Incomplete — "Project: I need a drummer" — 16 Mar, 11:13

---

## Bug 2: "Looking for a Trumpeter" — Payment Made But App Shows "Complete Payment"

### What's Happening

The poster paid £10 into escrow for "Looking for a Trumpeter". Stripe confirms:
- **£10.00 GBP — Uncaptured** — `pi_3T6GcG0Bt6mXrdye10HwRyaF` — 15 Mar, 14:45

The payment is sitting in escrow (Uncaptured = held, not yet captured/released).

But the mobile app **still shows "Payment required — tap to complete" and a "Complete Payment" button** on the project card.

### Two Problems

**Problem A — App doesn't recognise the payment was made**

The project's payment status is not being updated after a successful Stripe payment. Either:
- The Stripe webhook for `payment_intent.created` or `payment_intent.amount_capturable_updated` is not being handled
- The `opportunity_projects` table has a `payment_status` column that is not being set to `'held'` / `'escrow'` / `'uncaptured'` when the PaymentIntent reaches `requires_capture` state
- The mobile polls the project status but the backend never updates it

**Fix:** When a PaymentIntent reaches `requires_capture` (i.e. payer authorised payment, funds are held), set the project's payment status to `'escrow'` or `'payment_held'`. The mobile checks this status to decide whether to show "Complete Payment".

**Problem B — No way for the provider to confirm delivery**

Once payment is in escrow, there is no UI for the service provider (the drummer, the trumpeter) to say "I have delivered the work." This is required before the poster can release payment.

The flow should be:
1. Poster accepts interest → payment goes into escrow ✅
2. **Provider marks work as delivered** ← MISSING
3. Poster confirms delivery → Stripe capture triggered → funds released to provider's wallet

**What's needed:**
- Provider sees a "Mark as Delivered" button on their side of the project
- When tapped, it notifies the poster
- Poster sees "Confirm Delivery & Release Payment" button
- On confirmation, backend calls `stripe.paymentIntents.capture(paymentIntentId)` and credits the provider's wallet

### Stripe PaymentIntent to Handle

- `pi_3T6GcG0Bt6mXrdye10HwRyaF` — £10 Uncaptured — this should either be:
  - Captured when the poster confirms delivery, OR
  - Cancelled if the project is abandoned

---

## Summary

| Bug | Status | Blocker |
|-----|--------|---------|
| "I need a drummer" — 500 on accept | Still failing (new error: project insert) | Entire opportunity flow broken |
| "Looking for a trumpeter" — stuck on "Complete Payment" | Payment made but not recognised | Poster can't proceed, payment sits uncaptured |
| Provider delivery confirmation | Missing entirely | No way to complete the gig and release payment |

All three are backend fixes. The mobile is ready for all of them.
