# WEB_TEAM_GIG_PAYMENT_INSTANT_WALLET.md

**Date:** 2026-02-28
**Priority:** HIGH — affects creator experience in all markets, especially Africa
**For:** Backend team

---

## The Problem

When a gig is marked complete today, the backend calls Wise directly and initiates a bank transfer. The creator sees nothing in their SoundBridge wallet or balance. They simply wait 1–3 business days until money appears in their bank account — with no in-app feedback.

This is not how Uber works. Uber drivers see their earnings appear in their account balance **instantly** after a trip ends. The bank transfer itself may take time, but the driver knows immediately that they've been paid.

Currently:
```
Gig complete → Wise bank transfer (1–3 days) → Creator's bank account
                         ↑
              Creator sees nothing during this time
```

What it should be:
```
Gig complete → Internal wallet credited (instant) → Creator sees balance immediately
                         ↓
              Creator requests withdrawal → Wise bank transfer (1–3 days) → Bank account
```

---

## The Fix: Two-Step Payout Model

### Step 1 — Instant Wallet Credit (on gig completion)

When `POST /api/gigs/:id/complete` is called and the Stripe PaymentIntent is captured:

1. **Do not call Wise immediately**
2. Instead, credit the creator's internal wallet in Supabase right away:

```typescript
// In your gig completion handler, after capturing the Stripe PaymentIntent:

const platformFee = gigAmount * PLATFORM_FEE_PCT;        // 12%
const creatorEarnings = gigAmount - platformFee;

// Credit creator's wallet immediately — this is instant
await supabase
  .from('creator_wallets')
  .update({
    balance: supabase.raw(`balance + ${creatorEarnings}`),
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', creatorId);

// Record the transaction so it shows in wallet history
await supabase
  .from('wallet_transactions')
  .insert({
    user_id: creatorId,
    transaction_type: 'gig_payment',
    amount: creatorEarnings,
    currency: 'USD',
    status: 'completed',
    description: `Gig payment: ${gigTitle}`,
    reference_type: 'opportunity_project',
    reference_id: gigId,
  });

// Send push notification to creator
await sendPush(creatorId, {
  title: '💰 Payment received!',
  body: `$${creatorEarnings.toFixed(2)} from "${gigTitle}" is in your SoundBridge wallet.`,
  data: { type: 'gig_payment', gigId },
});
```

The creator immediately sees the balance in their wallet. They can then withdraw whenever they choose.

---

### Step 2 — Withdrawal to Bank Account (creator-initiated, via Wise)

When the creator taps "Request Payout" in their wallet screen, **that** is when Wise is called:

```typescript
// Existing withdrawal flow — no changes needed to the Wise integration itself
// Just ensure gig_payment is a valid transaction_type that shows in wallet history
```

The Wise transfer timing (1–3 business days) now applies to the **withdrawal**, not to completing the gig. The creator already knows they have the money; they're just choosing when to move it to their bank.

---

## Why This Matters for African Creators

For Nigerian, Ghanaian, Kenyan, and other African creators:

| Before | After |
|--------|-------|
| Complete gig → wait 1–3 days → bank credit → first sign of payment | Complete gig → wallet credited in seconds → push notification → feels instant |
| No transparency during Wise processing | Balance visible immediately; bank transfer is a separate creator-controlled action |
| No recourse if gig disputed mid-transfer | Escrow → wallet → withdrawal: clean separation of states |

---

## On NIBSS NIP for Nigerian Withdrawals

Nigeria's **NIBSS Instant Payment (NIP)** system processes bank-to-bank transfers in **seconds to minutes** when it's running well. Wise uses NIBSS for NGN transfers but adds its own processing overhead before handing off, which is why it ends up taking 1–3 days overall.

For the fastest possible Nigerian withdrawals, two options exist:

### Option A — Keep Wise (current, sufficient)
- Creator withdraws → Wise converts USD → NGN → NIBSS → bank
- Total time: 1–2 business days typically (often next day)
- No integration changes needed beyond the wallet-credit fix above
- **Recommended for now**

### Option B — Add Paystack or Flutterwave for Nigerian withdrawals (future enhancement)
- Paystack and Flutterwave are Nigerian-founded payment processors, both fully licensed by CBN
- They can execute NGN transfers via NIP in **minutes** (not days)
- Integration would be: creator withdraws in NGN → Paystack/Flutterwave NIP transfer → bank account → minutes
- This would make the experience genuinely instant end-to-end for Nigerian creators
- **Requires a separate integration — suggest as Phase 2**

The wallet-credit fix in Step 1 above delivers the most important part of the "feels instant" experience without requiring a new payment processor. The Paystack/Flutterwave route would eliminate the withdrawal wait entirely for Nigerian creators in Phase 2.

---

## Gig Payment Flow Summary (After Fix)

```
1. Requester creates gig → Stripe PaymentIntent created → status: pending

2. Requester confirms payment → Stripe holds funds → status: escrowed

3. Provider selected → gig underway → status: escrowed (unchanged)

4. Gig completed (POST /api/gigs/:id/complete)
   → Stripe PaymentIntent captured
   → Creator wallet credited immediately           ← NEW: instant
   → Push notification sent to creator            ← NEW: instant
   → Transaction recorded in wallet_transactions  ← NEW: instant
   → status: released

5. Creator requests payout (whenever they choose)
   → Wise transfer created (USD → NGN/GHS/KES/etc.)
   → 1–3 business days
   → Money arrives in creator's bank account
   → Wise webhook updates payout status to completed
```

---

## Wallet Transaction Types

Ensure `gig_payment` is handled as a valid `transaction_type` in the `wallet_transactions` table and in `WalletService.getTransactionTypeDisplay()`:

```typescript
// src/services/WalletService.ts — getTransactionTypeDisplay()
case 'gig_payment': return 'Gig Payment';
case 'gig_refund':  return 'Gig Refund';
```

The mobile wallet screen already reads all transaction types from this method, so adding these two cases will make gig payments show up correctly in wallet history with no other mobile changes needed.

---

## Mobile Changes Required

**None for the core fix** — the wallet screen already polls the balance and transaction history. Once the backend credits the wallet on gig completion, the creator will see it the next time the wallet screen loads (or on pull-to-refresh).

One optional enhancement: send the `gig_payment` push notification (specified in Step 1 above) using the existing `NotificationService` infrastructure. Notification type `gig_payment` should be added to `NotificationType` in `src/services/NotificationService.ts` if you want a dedicated deep link or category. Otherwise it will fall through to the default tap handler, which is acceptable.

---

## Related Documents

- `WEB_TEAM_GIG_NOTIFICATIONS_BACKEND_REQUIRED.md` — gig push notification spec
- `GLOBAL_COUNTRY_SUPPORT_FIX.md` — Wise country routing
- `CREATOR_PAYOUT_AUTOMATION_IMPLEMENTATION.md` — full Wise payout implementation
- `PAYOUT_SYSTEM_DECISIONS.md` — design decisions (convert at payout time, not at receipt)

---

*Document created: 2026-02-28*
