# Critical: Stripe Webhook Not Syncing to Profiles Table

**Date:** December 30, 2025
**Status:** 🔴 **CRITICAL - AFFECTS ALL WEB SUBSCRIBERS**
**Priority:** HIGHEST

---

## Problem

The `UPDATE_SUBSCRIPTION_DATA.sql` script is a **manual workaround for one user only**. It does NOT solve the underlying issue affecting **all users who subscribed via Stripe** (web).

**Impact:**
- Every user who subscribed on the web sees "Free Plan" in mobile app
- Manual SQL needed for each user (not scalable)
- Subscription data gets stale when billing period changes
- Revenue/earnings data missing for all users

---

## Root Cause

The backend **Stripe webhook handler is not updating the `profiles` table** when users subscribe via web.

### What Should Happen:

```
User subscribes on web (Stripe)
  ↓
Stripe webhook: customer.subscription.created/updated
  ↓
Backend webhook handler updates profiles table ✅
  ↓
Mobile app reads from profiles table (fast)
  ↓
All users see correct subscription status
```

### What's Actually Happening:

```
User subscribes on web (Stripe)
  ↓
Stripe webhook: customer.subscription.created/updated
  ↓
Backend webhook handler does NOT update profiles table ❌
  ↓
Mobile app calls /api/subscription/status
  ↓
API tries to fetch from Stripe on every request (slow)
  ↓
Times out after 10 seconds
  ↓
Supabase fallback reads profiles table
  ↓
No data in profiles table (NULL values)
  ↓
Shows "Free Plan" incorrectly for ALL paid users ❌
```

---

## Evidence

### Profiles Table Missing Data

For users who subscribed via Stripe web, the `profiles` table has:
```sql
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_period_start,
  subscription_period_end
FROM profiles
WHERE id = 'web-subscriber-user-id';

-- Results:
-- subscription_tier: NULL or 'free' (WRONG - should be 'premium')
-- subscription_status: NULL (WRONG - should be 'active')
-- subscription_amount: NULL (WRONG - should be 6.99)
-- subscription_period_start: NULL (WRONG - should be subscription date)
-- subscription_period_end: NULL (WRONG - should be next billing date)
```

This data should have been populated by the Stripe webhook handler when the user subscribed.

---

## What Backend Team Must Implement

### 1. Stripe Webhook Handler for Subscriptions

**Endpoint:** `POST /api/webhooks/stripe`

**Webhooks to Handle:**
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed (upgrade/downgrade/renewal)
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Successful payment (renewal)
- `invoice.payment_failed` - Failed payment

### 2. Update Profiles Table in Webhook Handler

When receiving `customer.subscription.created` or `customer.subscription.updated`:

```typescript
// apps/web/app/api/webhooks/stripe/route.ts

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS
  );

  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;

    // Get user ID from Stripe customer metadata
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;

    if (!userId) {
      console.error('No Supabase user ID in Stripe customer metadata');
      return new Response('No user ID', { status: 400 });
    }

    // Determine tier from Stripe price ID
    const priceId = subscription.items.data[0].price.id;
    let tier: 'free' | 'premium' | 'unlimited' = 'free';
    let amount = 0;
    let billingCycle: 'monthly' | 'yearly' = 'monthly';

    // Map Stripe price IDs to tiers (adjust to your actual price IDs)
    if (priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY) {
      tier = 'premium';
      amount = 6.99;
      billingCycle = 'monthly';
    } else if (priceId === process.env.STRIPE_PRICE_PREMIUM_YEARLY) {
      tier = 'premium';
      amount = 69.99;
      billingCycle = 'yearly';
    } else if (priceId === process.env.STRIPE_PRICE_UNLIMITED_MONTHLY) {
      tier = 'unlimited';
      amount = 12.99;
      billingCycle = 'monthly';
    } else if (priceId === process.env.STRIPE_PRICE_UNLIMITED_YEARLY) {
      tier = 'unlimited';
      amount = 129.99;
      billingCycle = 'yearly';
    }

    // ✅ UPDATE PROFILES TABLE - THIS IS THE CRITICAL MISSING PIECE
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: subscription.status,
        subscription_amount: amount,
        subscription_currency: subscription.currency.toUpperCase(),
        subscription_period: billingCycle,
        subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response('Profile update failed', { status: 500 });
    }

    console.log(`✅ Updated profile for user ${userId}: ${tier} (${subscription.status})`);

    // Also update user_subscriptions table if needed
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status,
        tier: tier,
        amount: amount,
        currency: subscription.currency.toUpperCase(),
        billing_cycle: billingCycle,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        created_at: new Date(subscription.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stripe_subscription_id'
      });

    if (subError) {
      console.error('Error updating subscription:', subError);
    }
  }

  // Handle subscription deletion (cancellation)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;

    if (userId) {
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'cancelled',
          subscription_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      console.log(`✅ Cancelled subscription for user ${userId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

---

## Database Schema Requirements

The `profiles` table must have these columns (already added):

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_currency TEXT,
ADD COLUMN IF NOT EXISTS subscription_period TEXT, -- 'monthly' or 'yearly'
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id
ON profiles(stripe_subscription_id);
```

---

## Testing Checklist

After implementing the webhook handler:

### 1. Test Webhook Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### 2. Verify Database Updates
```sql
-- After triggering webhook, check profiles table
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_period_start,
  subscription_period_end,
  stripe_subscription_id
FROM profiles
WHERE stripe_subscription_id IS NOT NULL;

-- Should show updated values, not NULL
```

### 3. Test Real Subscription Flow
1. Subscribe to Premium on web (use test card: 4242 4242 4242 4242)
2. Check Stripe dashboard → Webhooks → Verify webhook was sent
3. Check Supabase → profiles table → Verify data updated
4. Open mobile app → Check BillingScreen → Should show Premium

### 4. Test Subscription Updates
1. Upgrade from Premium to Unlimited on web
2. Verify webhook fires: `customer.subscription.updated`
3. Verify profiles table updates to `unlimited`
4. Mobile app should reflect change immediately

### 5. Test Cancellation
1. Cancel subscription on web
2. Verify webhook fires: `customer.subscription.deleted`
3. Verify profiles table updates:
   - `subscription_status` = 'cancelled'
   - `subscription_tier` = 'free' (or stays as 'premium' until period ends)
4. Mobile app should show cancellation

---

## Stripe Webhook Configuration

### Production Setup

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint:** `https://soundbridge.live/api/webhooks/stripe`
3. **Select events:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Copy webhook signing secret** → Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Verify Webhook is Working

After deployment:
1. Create a test subscription on production
2. Check Stripe Dashboard → Webhooks → Recent deliveries
3. Should show `200 OK` response
4. Check logs for: `✅ Updated profile for user xxx`
5. Verify profiles table has correct data

---

## Why This is Critical

### Current Situation (Broken):
- ❌ Manual SQL needed for every user
- ❌ Data gets stale when subscription renews
- ❌ No automatic sync between Stripe and database
- ❌ Mobile app shows "Free Plan" for paid users
- ❌ Backend API times out trying to fetch from Stripe on every request

### After Fix (Proper):
- ✅ Automatic sync when user subscribes
- ✅ Real-time updates on subscription changes
- ✅ Fast mobile app (<100ms to read from profiles)
- ✅ No API timeouts
- ✅ All users see correct subscription status
- ✅ Scales to thousands of users

---

## Related Issues

This webhook sync issue is likely why:
1. `/api/subscription/status` times out (trying to fetch from Stripe on every request)
2. Mobile app shows "Free Plan" for paid users (no data in profiles table)
3. Revenue data is missing (not synced from Stripe)

**Once this webhook handler is implemented properly, many of these issues will be resolved automatically.**

---

## Priority

🔴 **CRITICAL - MUST FIX BEFORE PUBLIC LAUNCH**

This is not optional. Without proper Stripe webhook handling:
- App is not production-ready
- Every web subscriber will have a broken mobile experience
- Manual intervention needed for every single user
- Data integrity issues

---

## Action Items for Backend Team

- [ ] Implement Stripe webhook handler at `/api/webhooks/stripe`
- [ ] Update `profiles` table on subscription events
- [ ] Update `user_subscriptions` table on subscription events
- [ ] Test with Stripe CLI locally
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Deploy to production
- [ ] Verify webhook deliveries succeed (200 OK)
- [ ] Test with real subscription flow
- [ ] Remove `UPDATE_SUBSCRIPTION_DATA.sql` workaround (no longer needed)

---

**Last Updated:** December 30, 2025
**Status:** 🔴 CRITICAL - Not yet implemented
**Impact:** ALL web subscribers (not just one user)
