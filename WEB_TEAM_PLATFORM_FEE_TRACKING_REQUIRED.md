# Web Team: Platform Fee Tracking — Critical Gap

## Priority: P0 — Financial Accountability

Platform fees are currently invisible in Stripe. Every charge type (gigs, tips, event tickets, audio/content sales) deposits the full gross amount into the SoundBridge main Stripe balance with no fee line recorded. This makes it impossible to:

- Reconcile how much revenue SoundBridge has earned
- Produce accurate P&L for UK accounting / HMRC
- Audit individual transactions
- Report correctly to Companies House

This must be fixed before we scale.

---

## Current (Broken) Architecture

```
Client pays £25
  → Full £25 lands in SoundBridge Stripe balance (undifferentiated)
  → Backend credits creator internal wallet £22
  → £3 fee sits invisibly in balance, no record in Stripe
```

Stripe's "Collected fees" tab is **empty** despite real fees being deducted.

---

## Required Fix: Tag Every Charge with Fee Metadata

### Option A — Add Stripe metadata (quickest, no architecture change)

On every `PaymentIntent` or `charge` creation, pass a `metadata` object with the fee breakdown:

```ts
stripe.paymentIntents.create({
  amount: 2500, // £25.00 in pence
  currency: 'gbp',
  metadata: {
    charge_type: 'gig_payment',           // or 'tip', 'event_ticket', 'audio_sale'
    platform_fee_amount: '375',           // £3.75 in pence
    platform_fee_percent: '15',           // 15%
    creator_payout_amount: '2125',        // £21.25 in pence
    reference_id: 'opportunity_project_uuid',
    creator_user_id: 'user_uuid',
  },
});
```

This makes every Stripe charge self-documenting. You can then:
- Filter by `charge_type` in the Stripe dashboard
- Export and reconcile against your DB
- Build Stripe Sigma queries for revenue reporting

**This does NOT make fees appear in "Collected fees" tab** — but it makes every charge auditable.

---

### Option B — Stripe Connect with `application_fee_amount` (proper, longer term)

If creators have Stripe Connect accounts, you can pass `application_fee_amount` and Stripe will:
- Transfer the creator's share to their Connected account
- Retain the fee in your platform account
- Show fees in **Transactions → Collected fees** tab explicitly

```ts
stripe.paymentIntents.create({
  amount: 2500,
  currency: 'gbp',
  application_fee_amount: 300, // £3.00 stays with platform
  transfer_data: {
    destination: 'acct_creatorStripeAccountId',
  },
});
```

This requires creators to have Stripe Express/Standard connected accounts (onboarding flow needed).

**Recommendation:** Implement Option A immediately as a stop-gap. Plan Option B for when creator payouts move from internal wallet → direct Stripe Connect payouts.

---

## All Charge Types That Need Fee Metadata

| Charge Type | `charge_type` value | Fee basis |
|---|---|---|
| Gig / opportunity project payment | `gig_payment` | Platform fee % of agreed amount |
| Live session tip | `tip` | Platform % of tip amount (if any) |
| Event ticket purchase | `event_ticket` | Booking fee per ticket |
| Audio / content sale | `audio_sale` | Platform % of sale price |
| Subscription (Stripe Billing) | N/A — handled by Stripe Invoices | Already tracked via Billing tab |

---

## What to Store in Your DB

For every completed transaction, ensure the `wallet_transactions` table (or a new `platform_revenue` table) records:

| Column | Description |
|---|---|
| `gross_amount` | What the client paid (pence) |
| `platform_fee_amount` | Fee retained by SoundBridge (pence) |
| `platform_fee_percent` | Fee percentage applied |
| `creator_payout_amount` | Amount credited to creator wallet |
| `stripe_payment_intent_id` | For Stripe reconciliation |
| `charge_type` | `gig_payment`, `tip`, `event_ticket`, `audio_sale` |

Currently `platform_fee_percent` is being stored as `12` in existing `opportunity_projects` records. **Going forward this must be `15`** — update the payment creation logic to use 15% as the platform fee for all new transactions, and store the real percentage at payment creation time.

---

## Revenue Reconciliation Query (Supabase)

To get current platform revenue by charge type (once metadata is stored correctly):

```sql
SELECT
  charge_type,
  COUNT(*) AS transactions,
  SUM(gross_amount) / 100.0 AS gross_gbp,
  SUM(platform_fee_amount) / 100.0 AS fees_gbp,
  SUM(creator_payout_amount) / 100.0 AS creator_payouts_gbp
FROM platform_revenue
GROUP BY charge_type
ORDER BY fees_gbp DESC;
```

---

## Current State Audit

Run this now to see what's actually been collected vs what's recorded:

```sql
-- Gig fees
SELECT
  COUNT(*) AS completed_gigs,
  SUM(agreed_amount) AS gross_pence,
  SUM(agreed_amount - COALESCE(creator_payout_amount, agreed_amount)) AS fees_pence
FROM opportunity_projects
WHERE status = 'completed';

-- Tips (check your tips/live_tipping table)
-- Event tickets (check event_ticket_purchases)
-- Audio sales (check content_purchases)
```

---

## Summary Checklist

- [ ] Add `metadata` to all Stripe `PaymentIntent` creations (gigs, tips, tickets, audio sales)
- [ ] Fix `platform_fee_percent` — change to 15% for all new transactions (existing records used 12%)
- [ ] Confirm `platform_fee_amount` column in `opportunity_projects` populates correctly at 15%
- [ ] Create `platform_revenue` summary table or enrich `wallet_transactions` with fee columns
- [ ] (Future) Evaluate Stripe Connect `application_fee_amount` for explicit Stripe-side fee tracking
- [ ] Add monthly revenue reconciliation query to ops runbook
