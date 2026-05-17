# Web Team: Pricing Model Update — All Tiers Can Monetize

## Priority: P0 — Business Model Change

This document specifies all backend, database, and web frontend changes required following a platform-wide pricing model update. Mobile has already implemented its side. Web must mirror these changes.

---

## Summary of Changes

1. **Platform fee raised from 12% → 15%** across all charge types
2. **All tiers (including Free) can now sell music, receive tips, and host paid events** — no subscription required to monetize
3. **Tier differentiation is now storage + features only** — not monetization access
4. **Event ticket sales open to all tiers** — previously gated to Premium/Unlimited

---

## 1. Platform Fee: 12% → 15% Everywhere

### Database — `opportunity_projects`

All new gig/opportunity project records must use 15%:

```sql
-- Verify current default (should already show 12 or variable)
SELECT platform_fee_percent, COUNT(*) FROM opportunity_projects GROUP BY platform_fee_percent;

-- No migration needed for historical records — leave them as-is.
-- Going forward, all new records must use 15.
```

**Backend change required:** Wherever `platform_fee_percent` or `platform_fee_amount` is calculated at payment creation time, update the constant:

```ts
// Before
const PLATFORM_FEE_PCT = 0.12;

// After
const PLATFORM_FEE_PCT = 0.15;
```

Apply this to every payment creation endpoint:
- `POST /api/gigs/pay` (opportunity project payment)
- `POST /api/tips/create` (live tips)
- `POST /api/events/tickets/purchase` (event ticket purchase)
- `POST /api/content/purchase` (audio/content sale)

### Stripe Metadata — Update All PaymentIntent Creations

Per `WEB_TEAM_PLATFORM_FEE_TRACKING_REQUIRED.md`, all PaymentIntents must include metadata. Update the fee values:

```ts
stripe.paymentIntents.create({
  amount: grossAmountPence,
  currency: 'gbp',
  metadata: {
    charge_type: 'gig_payment',           // or 'tip', 'event_ticket', 'audio_sale'
    platform_fee_percent: '15',           // UPDATED from 12
    platform_fee_amount: String(Math.round(grossAmount * 0.15 * 100)),
    creator_payout_amount: String(Math.round(grossAmount * 0.85 * 100)),
    reference_id: 'uuid',
    creator_user_id: 'uuid',
  },
});
```

### Tips — Flat 15% for All Tiers

Previously tips used a tiered fee (8% for Premium/Unlimited, 10% for Free). This is now flat:

```ts
// Before
const feeRate = (userTier === 'premium' || userTier === 'unlimited') ? 0.08 : 0.10;

// After
const feeRate = 0.15;
```

Update anywhere tip fee rates are calculated in the backend.

### Event Tickets — Confirm Fee Rate

Check the current event ticket fee rate. If it is 5% (as referenced in `PayoutService`), update to 15%:

```ts
// Before (if this exists)
const EVENT_TICKET_FEE = 0.05;

// After
const EVENT_TICKET_FEE = 0.15;
```

Confirm the `event_ticket_purchases` table has `platform_fee_amount` and `creator_payout_amount` columns and that they populate at 15%.

### Audio/Content Sales — Update to 15%

Previously 10% platform fee on audio sales. Now 15%:

```ts
// Before
const AUDIO_SALE_FEE = 0.10;

// After
const AUDIO_SALE_FEE = 0.15;
```

---

## 2. Remove Monetization Tier Gates — All Tiers Can Sell

### A. Music Sales (Audio Content)

**Before:** Only Premium/Unlimited users could enable paid content on uploads.

**After:** All tiers can sell music. Remove any subscription tier check on the content pricing endpoint.

Backend — remove this pattern wherever it exists:

```ts
// REMOVE THIS ENTIRE BLOCK
if (user.subscription_tier === 'free') {
  return res.status(403).json({ error: 'Premium subscription required to sell content' });
}
```

Database — if there is an RLS policy or DB-level check blocking Free tier users from setting `is_paid = true` on content:

```sql
-- Check for restrictive policies
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename IN ('tracks', 'albums', 'content_purchases');

-- Remove any policy that restricts free users from marking content as paid
-- Example of what to drop if found:
-- DROP POLICY "premium_only_paid_content" ON tracks;
```

### B. Tips — Remove Tier Gate

All users can receive tips. If there is any backend check blocking Free tier users from receiving tips, remove it.

```ts
// REMOVE: Any check like this
if (recipient.subscription_tier === 'free') {
  throw new Error('Recipient must have Premium subscription to receive tips');
}
```

### C. Paid Events — All Tiers Can Host Paid Events

**Before:** Creating a paid event (with ticket prices > 0) required Premium or Unlimited subscription.

**After:** All tiers can host paid events. Remove the subscription check on event creation.

Backend — `POST /api/events` or equivalent:

```ts
// REMOVE THIS ENTIRE BLOCK
const subscription = await getSubscription(userId);
if (subscription.tier === 'free' && eventData.ticket_price > 0) {
  return res.status(403).json({
    error: 'Premium subscription required to host paid events'
  });
}
```

Database — if there is a DB-level constraint or RLS policy:

```sql
-- Check for policies blocking free tier paid events
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'events';

-- Remove any that gate on subscription tier for paid events
```

---

## 3. Tier Differentiation — Storage Only

Tiers now differentiate on storage and features, not monetization. Update any tier comparison logic:

### Storage Limits (Keep These — They Are Correct)

| Tier | Storage | Upload limit |
|---|---|---|
| Free | 250MB | ~30-40 tracks |
| Premium (£6.99/mo) | 2GB | ~250 tracks |
| Unlimited (£12.99/mo) | 10GB | 1000+ tracks |

These limits must remain enforced. Do not remove storage quota checks.

### What Differentiates Tiers (Not Monetization)

| Feature | Free | Premium | Unlimited |
|---|---|---|---|
| Upload & sell music | ✅ | ✅ | ✅ |
| Receive tips | ✅ | ✅ | ✅ |
| Host paid events | ✅ | ✅ | ✅ |
| Storage | 250MB | 2GB | 10GB |
| Analytics | Basic | Advanced | Advanced |
| SoundBridge branding | Visible | Hidden | Hidden |
| Discover placement | No | 1x/month | 2x/month |
| Feed priority | Standard | Priority | Top |
| Profile badge | None | Pro | Unlimited |

---

## 4. Web Frontend Changes

### Pricing Page

Update the pricing/subscription comparison page:

**Remove:**
- Any mention of "Premium required to sell music"
- "Upgrade to monetize"
- "Host paid events (Premium only)"
- "Sell audio downloads (Premium only)"
- Any lock icons on selling features for Free tier

**Add to Free tier column:**
- "Upload & sell your music — keep 85%"
- "Receive tips from fans — keep 85%"
- "Host paid events — keep 85% of ticket revenue"
- "Upgrade when you need more storage"

**Update headline messaging:**
```
Before: "Upgrade to start earning"
After:  "Start earning for free. Upgrade for more space."
```

### Upload Flow

Remove any gate/modal that appears when a Free tier user tries to enable paid content on a track or album. The pricing toggle must be available to all users.

Update the earnings preview to show 85% (not 90% or 88%):
```
Sale Price:         £10.00
Platform Fee (15%): -£1.50
Your Earnings (85%): £8.50
```

### Create Event Flow

Remove the "Upgrade to Premium to host paid events" prompt and the `UpgradeForPaidEventsModal` trigger that fires when a Free tier user tries to set ticket prices. All users must be able to set `isFree = false` on events.

### Upgrade Prompts

Replace all monetization-based upgrade prompts with storage-based ones:

```
Before: "Upgrade to Premium to sell your music"
After:  "You've used 240MB of your 250MB — upgrade for 2GB of storage"

Before: "Premium required to host paid events"
After:  "Upgrade to remove SoundBridge branding from your event pages"
```

### Earnings Display

Wherever creator earnings are displayed (wallet, analytics, transaction history), ensure the fee shown is 15% (not 12%, 10%, or 8%):

```
Gig earnings:    £25.00 gross → £3.75 fee (15%) → £21.25 to you
Tip received:    £10.00 → £1.50 fee (15%) → £8.50 to you
Ticket sale:     £15.00 → £2.25 fee (15%) → £12.75 to you
Audio sale:      £5.00  → £0.75 fee (15%) → £4.25 to you
```

---

## 5. Database Audit Queries

Run these after deploying to verify correctness:

```sql
-- Check fee percentages on recent opportunity projects
SELECT
  platform_fee_percent,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM opportunity_projects
GROUP BY platform_fee_percent
ORDER BY latest DESC;

-- Any content marked as paid by free tier users (should now be allowed)
SELECT
  t.id, t.is_paid, t.price, p.subscription_tier
FROM tracks t
JOIN profiles p ON p.id = t.user_id
WHERE t.is_paid = true AND p.subscription_tier = 'free'
LIMIT 20;

-- Verify tip fees at 15%
SELECT
  amount,
  platform_fee_amount,
  ROUND((platform_fee_amount / amount) * 100, 1) as fee_pct
FROM live_tips
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 6. Verification Checklist

After implementation, confirm:

- [ ] Free tier user can upload a track and enable "Make available for purchase" — no upgrade prompt
- [ ] Free tier user can create an event with ticket price > 0 — no upgrade prompt
- [ ] Free tier user can receive tips — no restriction
- [ ] Platform fee on all new transactions calculates at 15% (not 12%, 10%, or 8%)
- [ ] Creator earnings display shows 85% kept, 15% platform fee
- [ ] Pricing page shows selling features available on Free tier
- [ ] Upgrade prompts reference storage limits, not monetization access
- [ ] Stripe PaymentIntent metadata uses `platform_fee_percent: '15'`
- [ ] `opportunity_projects.platform_fee_percent` = 15 on new records
- [ ] No 403 errors when Free tier users attempt to sell content or host paid events

---

## 7. Files Already Updated on Mobile

For reference, mobile has already made the following changes:

| File | Change |
|---|---|
| `src/components/PricingControls.tsx` | Removed `canSellContent` tier gate; updated fee display to 15%/85% |
| `src/screens/CreateEventScreen.tsx` | Removed `canCreatePaidEvents` subscription check; removed "Upgrade to Premium" prompt |
| `src/screens/ProviderGigDetailScreen.tsx` | `PLATFORM_FEE_PCT` 0.12 → 0.15 |
| `src/screens/CreateUrgentGigScreen.tsx` | `PLATFORM_FEE_PCT` 0.12 → 0.15 |
| `src/screens/UrgentGigConfirmationScreen.tsx` | `PLATFORM_FEE_PCT` 0.12 → 0.15 |
| `src/components/ProjectAgreementModal.tsx` | Fee display 12%/88% → 15%/85% |
| `src/components/TipModal.tsx` | Flat 15% fee for all tiers (was tiered 8%/10%) |
| `src/constants/subscriptionPlans.ts` | Free tier now lists selling, tips, events; tier features updated |

No mobile build is required for backend or DB changes. Mobile will reflect the correct fee once the backend returns 15% in all relevant responses.
