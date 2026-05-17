# WEB_TEAM_GIG_PAYMENT_RETRY_ENDPOINT.md

**Date:** 2026-03-01
**Priority:** ~~CRITICAL~~ ✅ IMPLEMENTED (2026-03-01)
**For:** Backend team

---

## Status

**`POST /api/opportunity-projects/:id/retry-payment` is now working.**

Fix applied: The handler no longer writes `stripe_client_secret` back to the DB (which was causing the 500 when that column didn't yet exist after migration). It now only updates `stripe_payment_intent_id` + `updated_at`, and returns `{ client_secret }` directly in the response. Mobile calls `initPaymentSheet()` with that value. No mobile release required.

**`GET /api/opportunity-projects/:id`** (single project fetch) already returns `stripe_client_secret` for the poster when `status === 'payment_pending'` and the column exists. The list endpoint (`?role=poster`) intentionally omits it; mobile always falls back to `retry-payment` for list items. This is the correct design.

---

## Problem (original)

When a poster accepts a creator's interest and creates a project, the backend correctly creates a Stripe PaymentIntent and returns a `client_secret`. The mobile then presents the Stripe payment sheet. **If the poster dismisses or cancels the sheet**, the PaymentIntent is left in `"incomplete"` state in Stripe and the project stays in `payment_pending` forever.

The mobile now shows a **"Complete Payment" button** on the project screen when `status === 'payment_pending'` and the user is the poster. This button needs a backend endpoint to:

1. Return the existing `client_secret` if the PaymentIntent is still usable (status: `requires_payment_method`)
2. Create a **new** PaymentIntent if the original is expired or cancelled, and update the project record

---

## Endpoint to Build

```
POST /api/opportunity-projects/:id/retry-payment
Authorization: Bearer {poster_token}
```

### Business rules
- Only the **poster** of the project can call this endpoint (check `poster_user_id === auth.uid()`)
- Only callable when `project.status === 'payment_pending'`
- If status is anything else, return `400 Bad Request`

### Logic

```typescript
// 1. Fetch the project (verify poster ownership + payment_pending status)
const project = await db.opportunityProjects.findById(params.id);
if (project.poster_user_id !== auth.uid()) return 403;
if (project.status !== 'payment_pending') return 400;

// 2. Check if existing PaymentIntent is still usable
const existingPi = await stripe.paymentIntents.retrieve(project.stripe_payment_intent_id);

if (existingPi.status === 'requires_payment_method') {
  // Reuse the existing PaymentIntent — just return the client_secret
  return { client_secret: project.stripe_client_secret };
}

// 3. Existing PaymentIntent is not reusable (cancelled/expired) — create a new one
const newPi = await stripe.paymentIntents.create({
  amount: Math.round(project.agreed_amount * 100),
  currency: project.currency.toLowerCase(),
  metadata: {
    project_id: project.id,
    opportunity_id: project.opportunity_id,
    poster_user_id: project.poster_user_id,
    creator_user_id: project.creator_user_id,
  },
  capture_method: 'automatic',
});

// 4. Update project record with new PaymentIntent details
await db.opportunityProjects.update(project.id, {
  stripe_payment_intent_id: newPi.id,
  stripe_client_secret: newPi.client_secret,
});

return { client_secret: newPi.client_secret };
```

### Success response

```json
{
  "client_secret": "pi_xxx_secret_yyy"
}
```

### Error responses

| Status | When |
|--------|------|
| `400` | Project is not in `payment_pending` status |
| `403` | Caller is not the poster of this project |
| `404` | Project not found |
| `500` | Stripe API error |

---

## Also: Return `stripe_client_secret` from GET Project endpoint

**Current:** `GET /api/opportunity-projects/:id` may not return `stripe_client_secret` in the response.

**Required:** The response must include `stripe_client_secret` when the project is in `payment_pending` status (and the caller is the poster). This allows the mobile to skip the retry endpoint and use the stored secret directly on the first attempt.

```json
{
  "id": "...",
  "status": "payment_pending",
  "stripe_payment_intent_id": "pi_xxx",
  "stripe_client_secret": "pi_xxx_secret_yyy",   // ← include this for poster when payment_pending
  ...
}
```

Only expose `stripe_client_secret` to the **poster** of the project, never to the creator.

---

## Also: Return `project_id` on 409 Conflict

When the poster tries to accept the same interest a second time, the backend returns `409 Conflict`. The mobile currently shows a generic "contact support" message.

**Required:** Include the existing `project_id` in the 409 response body so the mobile can navigate the poster directly to the project screen:

```json
{
  "error": "Project already created for this interest",
  "project_id": "abc-123"
}
```

The mobile will use this to navigate: `navigation.navigate('OpportunityProject', { projectId: 'abc-123' })`.

---

## Context: The Duplicate Payments

There are currently 4 "Incomplete" PaymentIntents in Stripe for "Project: Looking for a trumpeter":
- These were created because the poster tried 4 times without completing payment
- The duplicate-project guard (409) worked for attempts 2–4, but no retry path existed
- These 4 PaymentIntents should be cancelled in Stripe admin to clean up

To cancel in Stripe dashboard: Payments → find each "Incomplete" → Cancel payment intent.

Or via API:
```typescript
await stripe.paymentIntents.cancel('pi_xxx');
```

Only the most recent one matters — ensure the project record points to the correct active PaymentIntent.

---

## Related Documents

- `WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md` — wallet credit flow on delivery
- `WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md` — overall gig payment architecture

---

*Document created: 2026-03-01*
