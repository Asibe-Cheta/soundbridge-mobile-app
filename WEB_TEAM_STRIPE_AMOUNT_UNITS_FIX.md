# Stripe Amount Units — Fix Required in Webhook Handler

**Date:** 2026-03-16
**Priority:** HIGH — causes wallet amounts to display incorrectly
**For:** Web / Backend team
**From:** Mobile team

---

## The Problem

Stripe stores all amounts in **minor units** (pence, cents):
- £10.00 → Stripe sends `amount: 1000`
- $2.85 → Stripe sends `amount: 285`

The `wallet_transactions.amount` and `user_wallets.balance` columns store in **major units** (pounds, dollars):
- £10.00 → DB should store `10.00`
- $2.85 → DB should store `2.85`

If the webhook handler stores `pi.amount` directly without dividing by 100, £10 gets stored as `1000.00` and displays as **£1,000.00** in the app.

---

## Fix: Divide by 100 Everywhere You Write Stripe Amounts

### payment_intent.succeeded handler

```typescript
case 'payment_intent.succeeded': {
  const pi = event.data.object as Stripe.PaymentIntent;

  const amountInMajorUnits = pi.amount / 100;           // ← divide by 100
  const platformFee = Math.round(pi.amount * 0.10) / 100; // ← divide by 100
  const recipientAmount = amountInMajorUnits - platformFee;

  await supabase.from('wallet_transactions').insert({
    amount: recipientAmount,   // e.g. 8.80, not 880
    currency: pi.currency.toUpperCase(),
    ...
  });

  await supabase.from('user_wallets')
    .update({ balance: supabase.rpc('increment_wallet_balance', {
      p_user_id: recipientUserId,
      p_amount: recipientAmount,  // major units
    })});
  break;
}
```

### increment_wallet_balance RPC

The RPC currently accepts `p_amount INTEGER`. Change it to `NUMERIC` so decimal amounts work correctly:

```sql
CREATE OR REPLACE FUNCTION increment_wallet_balance(
  p_user_id UUID,
  p_amount   NUMERIC   -- ← was INTEGER, now NUMERIC to support 8.80 etc.
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Also update user_wallets balance the same way
CREATE OR REPLACE FUNCTION increment_user_wallet_balance(
  p_user_id UUID,
  p_amount   NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE user_wallets
  SET balance = COALESCE(balance, 0) + p_amount
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_user_wallet_balance(UUID, NUMERIC) TO service_role;
```

### Anywhere else Stripe amounts are written to the DB

Apply the same rule — always divide by 100:

| Stripe field | Divide? | Example |
|---|---|---|
| `payment_intent.amount` | ÷ 100 | 1000 → 10.00 |
| `payment_intent.amount_received` | ÷ 100 | 1000 → 10.00 |
| `charge.amount` | ÷ 100 | 1000 → 10.00 |
| `invoice.amount_paid` | ÷ 100 | 1000 → 10.00 |
| `transfer.amount` | ÷ 100 | 880 → 8.80 |
| `balance_transaction.amount` | ÷ 100 | 1000 → 10.00 |
| `opportunity_projects.agreed_amount` | Already in major units — **do not divide** |
| `opportunity_projects.creator_payout_amount` | Already in major units — **do not divide** |

---

## Manual Fix for the Affected Transaction

The incorrect `1000.00` deposit inserted into Asibe's wallet needs to be removed (if not already done):

```sql
DELETE FROM wallet_transactions
WHERE reference_id = 'pi_3T6GcG0Bt6mXrdye10HwRyaF'
AND user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

UPDATE profiles
SET wallet_balance = 0
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';
```

The correct credit (£8.80 to the creator `f02105c6`) is already in place and correct.

---

## Note on Mobile App

The mobile app (`WalletService.ts`) now includes a normalisation guard:
- If an amount arrives from the API as a **whole integer with no decimal point** (e.g. `1000`), it is divided by 100 automatically
- If it has decimal places (e.g. `8.80`, `1000.00`), it is used as-is

This is a safety net only. **The canonical fix is on the backend** — store amounts in major units from the start so no guessing is needed.
