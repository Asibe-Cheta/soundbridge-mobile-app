# WEB_TEAM_TIP_CURRENCY_FIX.md

**Date:** 2026-02-28
**Priority:** MEDIUM
**For:** Backend team

---

## Context: Dual Payout Provider System

SoundBridge uses **two different payout providers** depending on the creator's country. Understanding this is essential before reading the currency fix below.

| Provider | Countries | How it works |
|----------|-----------|-------------|
| **Stripe Connect** | US, UK, EU, Canada, Australia, Japan, Singapore, + ~35 others | Creator has a Stripe Connect account; platform transfers their earnings directly |
| **Wise** | **All African countries** (Nigeria, Ghana, Kenya, South Africa, Tanzania, Uganda, Egypt), India, Brazil, Mexico, Philippines, and 20+ others | Platform holds earnings in USD; Wise converts and sends to creator's local bank account at payout time |

The routing logic (already implemented in the backend) is:

```typescript
const WISE_COUNTRIES = ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'EG', 'IN', 'ID', ...];

if (WISE_COUNTRIES.includes(creatorCountryCode)) {
  await payoutToCreator({ ... });  // → Wise API (src/lib/wise/payout.ts)
} else {
  await stripeConnect.payout({ ... });  // → Stripe Connect
}
```

**African creators have no Stripe Connect account at all.** They use Wise exclusively. There is no BVN requirement, no Stripe KYC onboarding URL, no Stripe verification. The only identity check is Wise's own bank account name verification (`resolveAccount()` in `src/lib/wise/transfers.ts`), which runs automatically before the first transfer.

---

## What a Nigerian Creator Needs to Withdraw

Only the following — nothing else:

| Field | Details |
|-------|---------|
| Account holder name | Full legal name matching the bank account |
| Bank name | e.g. Access Bank, GTBank, Zenith, UBA |
| Account number | 10-digit NUBAN (e.g. `0123456789`) |
| Bank code | 3-digit CBN code (e.g. `044` for Access Bank) |
| Account type | Savings or Current |

When they request a payout:
1. Wise verifies the account holder name matches the account number (via `resolveAccount()`)
2. Wise creates a transfer from the platform's Wise balance in USD
3. Wise converts USD → NGN at the live exchange rate
4. Funds arrive in the creator's Nigerian bank account within **1–3 business days**
5. No Stripe involved at any step

The same pattern applies for Ghana (GHS), Kenya (KES), South Africa (ZAR), etc. — only the required bank fields differ (SWIFT for Ghana/Kenya, branch code for South Africa).

---

## The Tip Currency Problem

Tips are currently hardcoded to charge tippers in **USD** regardless of where either party is located:

```typescript
// src/components/TipModal.tsx — line 134
currency: 'USD',
```

This creates an inconsistency for **Stripe Connect countries** (UK, EU, etc.):
- A UK tipper sending a UK creator a "£10 tip" is actually charged $10 USD
- The creator's wallet accumulates in USD, not GBP
- The withdrawal screen shows amounts in USD even though the creator expects GBP

For **Wise countries (Africa, Asia, Latin America)**, this is **not a problem** — tips correctly stay in USD because Wise is specifically designed to receive USD and convert to local currency at payout. Changing the tip currency to NGN for a Nigerian creator would break the flow since Stripe cannot charge in NGN.

---

## What Needs to Change (Stripe Connect Countries Only)

### Backend — `POST /api/payments/create-tip`

Determine the correct charge currency based on the **creator's country and payout provider**:

```typescript
// In your create-tip handler:

const STRIPE_SUPPORTED_TIP_CURRENCIES = [
  'gbp', 'eur', 'cad', 'aud', 'sgd', 'hkd', 'jpy',
  'nzd', 'dkk', 'sek', 'nok', 'chf',
  // Do NOT include currencies for Wise-routed countries (ngn, ghs, kes, etc.)
];

const creatorWallet = await db.creator_wallets.findOne({ user_id: creatorId });
const creatorCurrency = (creatorWallet?.currency ?? 'USD').toLowerCase();

// Only switch currency if this creator is on Stripe Connect AND Stripe supports that currency.
// Wise countries always stay as USD — Wise handles the FX at payout.
const tipCurrency = STRIPE_SUPPORTED_TIP_CURRENCIES.includes(creatorCurrency)
  ? creatorCurrency
  : 'usd';

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(tipAmount * 100),
  currency: tipCurrency,  // Stripe expects lowercase
  // ... rest of params
});
```

Add `currency` to the response so the mobile app can display the correct symbol:

```typescript
// Updated response shape
{
  paymentIntentId: string
  clientSecret: string
  tipId: string
  platformFee: number
  creatorEarnings: number
  currency: string   // e.g. 'GBP', 'USD' — the currency the charge was made in
}
```

---

## Impact by Region

| Creator country | Payout provider | Tip charged in | After fix |
|----------------|-----------------|---------------|-----------|
| United Kingdom | Stripe Connect | USD ❌ | GBP ✅ |
| Germany / EU | Stripe Connect | USD ❌ | EUR ✅ |
| United States | Stripe Connect | USD ✅ | USD (no change) |
| Canada | Stripe Connect | USD ❌ | CAD ✅ |
| **Nigeria** | **Wise** | USD ✅ | **USD (no change — Wise converts at payout)** |
| **Ghana** | **Wise** | USD ✅ | **USD (no change)** |
| **Kenya** | **Wise** | USD ✅ | **USD (no change)** |
| **South Africa** | **Wise** | USD ✅ | **USD (no change)** |
| India | Wise | USD ✅ | USD (no change) |
| Brazil | Wise | USD ✅ | USD (no change) |

African and other Wise-routed countries are already working correctly. Only Stripe Connect countries need the fix.

---

## Mobile Changes Required (after backend ships)

Once the backend returns `currency` in the response, remove the hardcoded `'USD'` from the request body in two files:

**`src/components/TipModal.tsx` — line 134:**
```typescript
// BEFORE
currency: 'USD',

// AFTER — remove this line entirely; let backend determine currency from creator's wallet
```

**`src/components/live-sessions/LiveTippingModal.tsx`** — same change needed.

The mobile team will make these changes once you confirm the response includes `currency`. Please notify when deployed.

---

## No Breaking Changes

- Tips already recorded as USD in the database are unaffected
- Wise payout flow is untouched — it already works correctly for all African countries
- The `src/lib/wise/payout.ts` `payoutToCreator()` function and the `wise_payouts` table are unchanged
- Existing wallet balances display correctly regardless of this change

---

## Wise Environment Variables (confirm these are set in production)

```env
WISE_API_TOKEN=...
WISE_ENVIRONMENT=live
WISE_API_URL=https://api.wise.com
WISE_WEBHOOK_SECRET=...   # min 32 chars
WISE_PROFILE_ID=...       # numeric, from wise.com/settings/profiles
```

These are required for all African and other Wise-routed country payouts.

---

*Related mobile files: `src/components/TipModal.tsx:134`, `src/components/live-sessions/LiveTippingModal.tsx`*
*Related backend files: `src/lib/wise/payout.ts`, `src/lib/wise/transfers.ts`, `GLOBAL_COUNTRY_SUPPORT_FIX.md`*
