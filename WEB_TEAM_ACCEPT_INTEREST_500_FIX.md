# Accept Interest → 500 "Failed to create project"

**Date:** 2026-03-16
**Priority:** CRITICAL — opportunity flow completely blocked
**For:** Web / Backend team
**From:** Mobile team

---

## The Error

```
POST https://www.soundbridge.live/api/opportunities/18155649-6ce5-4e76-a075-6bb5ad6b3541/interests/c4be2175-9d71-47eb-b783-b1f6ad201bb0/accept
→ 500  { "error": "Failed to create project" }
```

The request reaches the server (auth passes — token is valid), but the handler throws internally and returns a generic 500.

---

## What the mobile sends

```json
POST /api/opportunities/:opportunityId/interests/:interestId/accept
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "agreed_amount": 25,
  "currency": "GBP",
  "deadline": "",          // optional, may be empty string or omitted
  "brief": "..."           // ≥10 chars, required
}
```

---

## What the mobile expects back

```json
{
  "project": {
    "id": "uuid",
    "opportunity_id": "uuid",
    "interest_id": "uuid",
    "poster_user_id": "uuid",
    "creator_user_id": "uuid",
    "title": "string",
    "brief": "string",
    "agreed_amount": 25.00,
    "currency": "GBP",
    "platform_fee_percent": 12,
    "platform_fee_amount": 3.00,
    "creator_payout_amount": 22.00,
    "deadline": "2026-04-01",      // or null
    "status": "payment_pending",   // or "awaiting_acceptance"
    "stripe_payment_intent_id": "pi_...",
    "created_at": "2026-03-16T..."
  },
  "client_secret": "pi_..._secret_..."   // Stripe PaymentIntent client_secret
}
```

> If Stripe setup fails, `client_secret` may be `null`/omitted — the mobile handles that gracefully (shows "Agreement Sent" without payment sheet).

---

## Most Likely Causes of the 500

### 1. Missing or wrong column name in INSERT

The handler probably does something like:

```typescript
await db.insert('opportunity_projects', { ... })
```

Check the actual column names in `opportunity_projects`. Common mismatches:

| Mobile expects | Possible DB column name |
|---|---|
| `poster_user_id` | may be `client_user_id` or `buyer_id` |
| `creator_user_id` | may be `provider_user_id` or `seller_id` |
| `platform_fee_percent` | may not exist yet |
| `platform_fee_amount` | may not exist yet |
| `creator_payout_amount` | may not exist yet |
| `interest_id` | may not have a FK or NOT NULL constraint satisfied |
| `title` | may be NOT NULL but handler isn't copying it from the opportunity |

**Quick check:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'opportunity_projects'
ORDER BY ordinal_position;
```

### 2. `deadline` is an empty string, not NULL

If `deadline` is a `DATE` or `TIMESTAMP` column and the handler passes `""` instead of `null`, Postgres will throw a cast error.

**Fix:**
```typescript
deadline: data.deadline?.trim() || null,   // never pass empty string to a date column
```

### 3. Stripe PaymentIntent creation fails silently and crashes the whole handler

If the handler creates the Stripe PaymentIntent **before** inserting the project row, and Stripe throws (e.g. invalid currency, missing API key in prod env), the entire handler crashes.

**Fix:** Create the project row first (status = `awaiting_acceptance`), then create the Stripe intent, then update the project's `stripe_payment_intent_id` and status. Wrap Stripe in its own try/catch so a Stripe failure doesn't kill the project creation.

### 4. `opportunity_projects` table doesn't have the required fee columns yet

If `platform_fee_percent`, `platform_fee_amount`, or `creator_payout_amount` don't exist in the table, the INSERT will fail.

**Migration to add them if missing:**
```sql
ALTER TABLE opportunity_projects
  ADD COLUMN IF NOT EXISTS platform_fee_percent  NUMERIC NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS platform_fee_amount   NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_payout_amount NUMERIC NOT NULL DEFAULT 0;
```

---

## Recommended Handler Structure

```typescript
POST /api/opportunities/:opportunityId/interests/:interestId/accept

1. Verify caller owns the opportunity (poster_user_id = auth.uid)
2. Load the interest row → get creator_user_id
3. Load opportunity title
4. Compute fees:
     platform_fee_percent = 12
     platform_fee_amount  = agreed_amount * 0.12
     creator_payout_amount = agreed_amount * 0.88
5. INSERT into opportunity_projects:
     {
       opportunity_id, interest_id,
       poster_user_id: auth.uid,
       creator_user_id,
       title: opportunity.title,
       brief: body.brief,
       agreed_amount: body.agreed_amount,
       currency: body.currency,
       deadline: body.deadline?.trim() || null,   // ← null, NOT ""
       platform_fee_percent, platform_fee_amount, creator_payout_amount,
       status: 'payment_pending',
       created_at: now()
     }
6. Create Stripe PaymentIntent (wrap in try/catch):
     amount: agreed_amount * 100   // pence/cents
     currency: body.currency.toLowerCase()
     metadata: { recipientUserId: creator_user_id, payerUserId: poster_user_id, type: 'gig_payment', projectId: project.id }
7. UPDATE opportunity_projects SET stripe_payment_intent_id = pi.id WHERE id = project.id
8. Return { project, client_secret: pi.client_secret }
```

---

## Specific IDs for Testing

The exact request that failed:
- Opportunity ID: `18155649-6ce5-4e76-a075-6bb5ad6b3541`  ("I need a drummer")
- Interest ID: `c4be2175-9d71-47eb-b783-b1f6ad201bb0`  (Merit Uche)
- Amount: GBP 25 sent in the body

Once the fix is deployed, this exact pair can be retried.

---

## Checklist

- [ ] Add server-side error logging — log the actual exception, not just "Failed to create project"
- [ ] Check `opportunity_projects` column names match what the handler inserts
- [ ] Ensure `deadline` is passed as `null` not `""`
- [ ] Add missing fee columns if not present
- [ ] Wrap Stripe call in its own try/catch so project creation succeeds even if Stripe fails
- [ ] Include `recipientUserId` in PaymentIntent metadata so webhook can credit wallet
