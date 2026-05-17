# BUG FIX: Wise Users Stuck in "Pending" Verification Forever

## What's Happening

Nigerian (and all other Wise-routed) users who successfully add their bank account see:

- **Verification Status: Pending** — permanently, because `is_verified` is never set to `true`
- **"Complete Verification Now"** button — which opens Stripe Connect onboarding, which **does not support Nigeria** (or most African, Asian, and Latin American countries)
- **"Having Issues? Reset your account"** — which references Stripe Connect, also irrelevant

The user has money in their wallet and cannot withdraw it. The UI is actively misleading them into a dead-end flow.

---

## Root Cause

Two separate problems:

### Problem 1 — `is_verified` is never set to `true` for Wise accounts

When a bank account is inserted into `creator_bank_accounts`, `is_verified` defaults to `false`. There is no backend process that ever flips it:

- **Stripe Connect users**: Stripe webhooks *could* flip it (but this may also not be wired up)
- **Wise users (Nigeria, Ghana, Kenya, India, Brazil, etc.)**: Wise validates account details at **payout time**, not at account creation — so there will never be a creation webhook to trigger verification

### Problem 2 — Stripe-specific UI shown to all users regardless of payout provider

The "Complete Verification" banner and "Having Issues? / Reset" section are shown to **any** user with `verification_status = 'pending'`, including Wise users for whom Stripe is completely irrelevant.

---

## Mobile Fix (already shipped)

On mobile, the "Complete Verification" and "Having Issues?" sections are now **hidden for Wise-currency accounts**. Instead, Wise users see:

> **Ready for Withdrawals**
> Your bank account is set up. Payouts are processed via Wise directly to your local bank in NGN. No further verification needed — just request a withdrawal when you're ready.

The check uses the bank account's `currency` field against a known list of Wise-routed currencies.

---

## What the Web Team Must Do

### 1. Auto-verify Wise accounts on creation (backend — critical)

When inserting a new row into `creator_bank_accounts` for a Wise-routed currency, set `is_verified = true` immediately:

```js
const WISE_CURRENCIES = [
  'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'EGP', 'RWF', 'XOF', 'XAF',
  'INR', 'IDR', 'MYR', 'PHP', 'THB', 'VND', 'BDT', 'PKR', 'LKR', 'NPR', 'CNY', 'KRW',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'CRC', 'UYU',
  'TRY', 'ILS', 'MAD', 'UAH', 'GEL',
];

const isWise = WISE_CURRENCIES.includes(body.currency);

await db.creator_bank_accounts.insert({
  ...accountData,
  is_verified: isWise ? true : false,  // ← auto-verify Wise accounts
});
```

Also run this one-time migration to fix all existing Wise accounts stuck in pending:

```sql
UPDATE creator_bank_accounts
SET is_verified = true
WHERE currency IN (
  'NGN','GHS','KES','ZAR','TZS','UGX','EGP','RWF','XOF','XAF',
  'INR','IDR','MYR','PHP','THB','VND','BDT','PKR','LKR','NPR','CNY','KRW',
  'BRL','MXN','ARS','CLP','COP','CRC','UYU',
  'TRY','ILS','MAD','UAH','GEL'
)
AND (is_verified = false OR is_verified IS NULL);
```

### 2. Hide Stripe verification UI for Wise users (web frontend)

On the Payment Methods / Withdrawal Methods page, conditionally render based on the bank account's currency:

```js
const isWiseAccount = WISE_CURRENCIES.includes(bankAccount.currency);

// Show for Stripe users only
if (!isWiseAccount) {
  showCompleteVerificationBanner();
  showStripeResetSection();
}

// Show for Wise users instead
if (isWiseAccount) {
  showReadyForWithdrawalsMessage();
}
```

**"Complete Verification Now" must NOT appear for Wise users.** It leads to Stripe Connect onboarding which will either fail or confuse them.

### 3. Show correct status label for Wise accounts

Instead of showing `verification_status = "Pending"` on the bank account card for Wise users, show **"Active"** or **"Ready"** — since their account is genuinely ready to use.

```js
const displayStatus = isWiseAccount
  ? 'Active'                        // Wise — no verification needed
  : bankAccount.verification_status; // Stripe — use actual status
```

### 4. Withdrawal screen — unblock Wise users

The withdrawal screen currently disables the "Withdraw" button if `is_verified = false`. After applying fix #1 above, new Wise accounts will have `is_verified = true` on creation. But for existing accounts, the one-time SQL migration in fix #1 will unblock them immediately.

Also add a currency-based bypass as a safety net:

```js
const canWithdraw = bankAccount.is_verified || WISE_CURRENCIES.includes(bankAccount.currency);
```

---

## Wise Currency Reference (full list)

| Region | Currencies |
|--------|-----------|
| Africa | NGN, GHS, KES, ZAR, TZS, UGX, EGP, RWF, XOF, XAF |
| South & Southeast Asia | INR, IDR, MYR, PHP, THB, VND, BDT, PKR, LKR, NPR |
| East Asia | CNY, KRW |
| Latin America | BRL, MXN, ARS, CLP, COP, CRC, UYU |
| Middle East & Eastern Europe | TRY, ILS, MAD, UAH, GEL |

Stripe Connect countries (GBP, USD, EUR, CAD, AUD, etc.) are **not** in this list and go through the normal Stripe verification flow.

---

## Priority

**Critical** — existing users with these currencies have real money in their wallets and are blocked from withdrawing it.

The SQL migration in step 1 can be run immediately with zero risk and will unblock all affected users right away.
