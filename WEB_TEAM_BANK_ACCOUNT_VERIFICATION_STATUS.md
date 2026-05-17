# BUG: creator_bank_accounts.is_verified Never Set to True

## Symptom

Users see **"Pending"** on their bank account in the Withdraw Funds screen, even after successfully adding it. The Payment Methods screen correctly shows "Verified" — but that's reading from the Stripe Connect account status, which is a completely separate system.

## Root Cause

The Withdrawal screen reads `is_verified` from the `/wallet/withdrawal-methods` response, which maps to `creator_bank_accounts.is_verified`. This field is inserted as `false` (or never set) and is never updated after account creation.

## What Needs to Change

### Option A — Auto-verify on creation (recommended if no manual review needed)

When inserting a new row into `creator_bank_accounts`, set `is_verified = true` immediately:

```sql
INSERT INTO creator_bank_accounts (
  user_id,
  account_holder_name,
  method_type,
  method_name,
  country,
  currency,
  bank_details,
  is_default,
  is_verified   -- ← set this to true on creation
) VALUES (..., true);
```

Or run a one-time migration to fix existing rows:

```sql
UPDATE creator_bank_accounts
SET is_verified = true
WHERE is_verified = false OR is_verified IS NULL;
```

### Option B — Verify after Stripe Connect is confirmed (if verification is intentional)

If bank accounts are supposed to require manual or automated verification before being usable for withdrawal, the backend needs a process to set `is_verified = true` after approval. Currently no such process exists — accounts are stuck in `pending` forever.

If this is the intent, document the trigger (e.g. admin dashboard action, Stripe webhook, Wise webhook) and implement it.

---

## Impact

Until this is fixed:
- All manually-added bank accounts appear as "Pending" in the Withdrawal screen
- Users cannot select them for withdrawals (the card is greyed out and disabled)
- Users with verified Stripe Connect accounts can't withdraw because their linked bank account is stuck as unverified

## Mobile Side

The mobile code is correct — `WithdrawalScreen.tsx` correctly reads `method.is_verified` from the API and disables unverified methods. No mobile changes needed.

---

**Priority:** High — blocks all withdrawals via manually-added bank accounts.
