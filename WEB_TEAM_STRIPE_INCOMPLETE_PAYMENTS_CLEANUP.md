# WEB_TEAM_STRIPE_INCOMPLETE_PAYMENTS_CLEANUP.md

**Date:** 2026-03-01
**Priority:** URGENT
**For:** Backend team

---

## Background

A poster created a project agreement for "Looking for a trumpeter" but cancelled/dismissed the Stripe payment sheet each time it appeared. Because the app previously had no retry path, they triggered the flow 4 times, creating 4 "Incomplete" PaymentIntents in Stripe without completing any of them.

There is now **one real project** in the database with `status = payment_pending`. It points to one of these PaymentIntents. The other 3 are orphaned and need to be cancelled.

The mobile app now has a **"Complete Payment" button** on the project screen (in the next build), which will let the poster retry payment properly. To support this, the existing PaymentIntent must be in a retryable state (`requires_payment_method`).

---

## Action Required

### Step 1 — Cancel 3 of the 4 Incomplete PaymentIntents in Stripe

Go to **Stripe Dashboard → Payments → filter by "Incomplete"** and find the 4 PaymentIntents for "Project: Looking for a trumpeter".

Identify which one the `opportunity_projects` table row is pointing to (`stripe_payment_intent_id` column). Keep that one. Cancel the other 3.

To cancel via Stripe dashboard: click a PaymentIntent → "Cancel payment intent" button.

Or via Stripe API:
```bash
stripe payment_intents cancel pi_XXXXX
stripe payment_intents cancel pi_YYYYY
stripe payment_intents cancel pi_ZZZZZ
```

### Step 2 — Verify the remaining PaymentIntent is retryable

Retrieve the PaymentIntent the project record points to and confirm its status is `requires_payment_method`:

```bash
stripe payment_intents retrieve pi_XXXXX
```

Expected: `"status": "requires_payment_method"`. If so, it is reusable — the poster can complete payment via the new button in the next app build.

If the status is anything else (e.g. `canceled`), skip to Step 3.

### Step 3 — If the remaining PaymentIntent is not usable (cancelled/expired)

Update the `opportunity_projects` row to clear the stale PaymentIntent fields. The mobile's retry endpoint (`POST /api/opportunity-projects/:id/retry-payment`, documented in `WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md`) will create a new PaymentIntent when the poster taps "Complete Payment".

```sql
UPDATE opportunity_projects
SET
  stripe_payment_intent_id = NULL,
  stripe_client_secret = NULL
WHERE id = '<the project UUID>';
```

---

## Optional: Manually unblock the project (skip payment for this test)

If you want to move the project forward immediately **without** waiting for the poster to retry payment (e.g. for testing), you can manually advance the status:

```sql
UPDATE opportunity_projects
SET status = 'awaiting_acceptance'
WHERE id = '<the project UUID>';
```

This puts the project into the "awaiting creator acceptance" state, which will show the creator an "Accept Agreement" button. **Only do this if the PaymentIntent has already been paid, or for internal testing.**

---

## How to Find the Project UUID

```sql
SELECT id, stripe_payment_intent_id, stripe_client_secret, status
FROM opportunity_projects
WHERE title ILIKE '%trumpeter%'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Related Documents

- `WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md` — retry-payment endpoint to build (CRITICAL)

---

*Document created: 2026-03-01*
