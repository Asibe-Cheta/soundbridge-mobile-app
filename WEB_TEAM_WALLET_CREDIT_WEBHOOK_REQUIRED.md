# Wallet Credit Webhook — Critical Fix Required

**Date:** 2026-03-16
**Priority:** URGENT — user payment received by Stripe but wallet balance is £0
**For:** Web / Backend team
**From:** Mobile team

---

## The Immediate Problem

A real payment of **£10.00 GBP** has been captured in Stripe but the recipient's Digital Wallet in the app shows **$0.00**. The money is sitting in Stripe and has not been credited to the user.

**Stripe Transaction Details:**
- Payment ID: `pi_3T6GcG0Bt6mXrdye10HwRyaF`
- Amount: £10.00 GBP (net £9.65 after Stripe fees)
- Customer: `gcus_1TBFvr0Bt6mXrdyehreQXM1n`
- Status: Succeeded ✅
- Captured: 16 Mar 2026, 14:46
- Funds available in Stripe Balance: 19 Mar 2026

**Root Cause:** There is no `payment_intent.succeeded` webhook handler that credits the user's wallet. The existing webhook (`/api/webhooks/subscription`) only handles subscription lifecycle events — it does not handle one-off payment intents (tips, gig payments, content purchases).

---

## Immediate Manual Fix (Do This Now)

Find the user linked to Stripe customer `gcus_1TBFvr0Bt6mXrdyehreQXM1n`:

```sql
-- Step 1: Find the user
SELECT id, display_name, email, wallet_balance
FROM profiles
WHERE stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n';
```

Then credit their wallet and log the transaction:

```sql
-- Step 2: Insert wallet transaction
INSERT INTO wallet_transactions (
  user_id,
  transaction_type,
  amount,
  currency,
  description,
  status,
  reference_type,
  reference_id,
  created_at
)
VALUES (
  '<user_id_from_step_1>',
  'deposit',
  1000,              -- amount in pence/minor units (£10.00 = 1000p)
  'GBP',
  'Payment received — pi_3T6GcG0Bt6mXrdye10HwRyaF',
  'completed',
  null,
  'pi_3T6GcG0Bt6mXrdye10HwRyaF',
  NOW()
);

-- Step 3: Update wallet balance
UPDATE profiles
SET wallet_balance = COALESCE(wallet_balance, 0) + 1000
WHERE stripe_customer_id = 'gcus_1TBFvr0Bt6mXrdyehreQXM1n';
```

> **Note on amount units:** Confirm whether `wallet_transactions.amount` stores pence (1000 = £10) or pounds (10.00 = £10). Use whichever matches existing rows in the table.

---

## Root Cause: Missing Webhook Handler

### What needs to exist

A new webhook endpoint (or extend the existing one) to handle `payment_intent.succeeded`:

```
POST /api/webhooks/payments
```

Or add a new `case` to the existing subscription webhook handler.

### Stripe events to handle

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Credit recipient's wallet |
| `payment_intent.payment_failed` | Refund payer if escrow held |
| `transfer.created` | Log when funds move to connected account |
| `payout.paid` | Mark withdrawal as completed in wallet |

---

## payment_intent.succeeded Handler

```typescript
// In your webhook handler switch statement:

case 'payment_intent.succeeded': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  await handlePaymentIntentSucceeded(paymentIntent);
  break;
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const {
    recipientUserId,   // who receives the money
    payerUserId,       // who paid
    type,              // 'tip' | 'gig_payment' | 'content_purchase' | 'ticket'
    gigId,
    projectId,
    contentId,
  } = pi.metadata;

  if (!recipientUserId) {
    console.error('No recipientUserId in payment_intent metadata:', pi.id);
    return;
  }

  const amount = pi.amount;           // in minor units (pence/cents)
  const currency = pi.currency.toUpperCase();

  // Deduct platform fee (e.g. 10%)
  const platformFee = Math.round(amount * 0.10);
  const recipientAmount = amount - platformFee;

  // 1. Credit recipient wallet
  await supabase.from('wallet_transactions').insert({
    user_id: recipientUserId,
    transaction_type: 'deposit',
    amount: recipientAmount,
    currency,
    description: getDescription(type, pi),
    status: 'completed',
    reference_type: type === 'gig_payment' ? 'opportunity_project' : null,
    reference_id: gigId || projectId || contentId || pi.id,
    stripe_payment_intent_id: pi.id,
    created_at: new Date().toISOString(),
  });

  await supabase.rpc('increment_wallet_balance', {
    p_user_id: recipientUserId,
    p_amount: recipientAmount,
  });

  // 2. Send push notification to recipient
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token, display_name')
    .eq('id', recipientUserId)
    .single();

  if (profile?.expo_push_token) {
    await fetch('https://exp.host/--/expo-push/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: 'Payment Received',
        body: `${formatCurrency(recipientAmount, currency)} has been added to your wallet`,
        data: { type: 'gig_payment', amount: recipientAmount },
        channelId: 'tips',
        sound: 'default',
      }),
    });
  }

  console.log(`✅ Wallet credited: ${recipientUserId} +${recipientAmount} ${currency}`);
}

function getDescription(type: string, pi: Stripe.PaymentIntent): string {
  switch (type) {
    case 'tip': return 'Tip received';
    case 'gig_payment': return 'Gig payment received';
    case 'content_purchase': return 'Content sale';
    case 'ticket': return 'Ticket sale';
    default: return `Payment received (${pi.id})`;
  }
}
```

---

## Required: Payment Intent Metadata

When creating a `PaymentIntent` on the backend, **always include metadata** so the webhook knows who to credit:

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,       // £10.00 in pence
  currency: 'gbp',
  metadata: {
    recipientUserId: 'uuid-of-creator',   // REQUIRED — who gets paid
    payerUserId: 'uuid-of-payer',         // who paid
    type: 'gig_payment',                  // tip | gig_payment | content_purchase | ticket
    gigId: 'uuid-of-gig',                 // if applicable
    projectId: 'uuid-of-project',         // if applicable
    contentId: 'uuid-of-content',         // if applicable
  },
});
```

> The existing `pi_3T6GcG0Bt6mXrdye10HwRyaF` likely has no metadata, which is why no automatic crediting occurred. All future payment intents must include `recipientUserId`.

---

## Required: `increment_wallet_balance` RPC

If not already present, add this Supabase function to prevent race conditions:

```sql
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Stripe Webhook Endpoint — Register These Events

In Stripe Dashboard → Developers → Webhooks, ensure the endpoint listens for:

```
payment_intent.succeeded
payment_intent.payment_failed
payout.paid
payout.failed
transfer.created
customer.subscription.created      (already exists)
customer.subscription.updated      (already exists)
customer.subscription.deleted      (already exists)
invoice.payment_succeeded          (already exists)
invoice.payment_failed             (already exists)
checkout.session.completed         (already exists)
```

---

## Checklist

- [ ] Manually credit `pi_3T6GcG0Bt6mXrdye10HwRyaF` to the affected user's wallet (see SQL above)
- [ ] Add `payment_intent.succeeded` handler to webhook
- [ ] Ensure all PaymentIntent creation includes `recipientUserId` in metadata
- [ ] Register `payment_intent.succeeded` in Stripe Dashboard webhook event list
- [ ] Add `increment_wallet_balance` RPC if not present
- [ ] Test end-to-end: create test payment → wallet credited → push notification received

---

## Contact

Mobile team (Justice) — `WEB_TEAM_WALLET_CREDIT_WEBHOOK_REQUIRED.md`
