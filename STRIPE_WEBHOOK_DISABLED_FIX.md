# Stripe Webhook Disabled - Critical Fix Required

**Date:** January 15, 2026
**To:** Web/Backend Team
**From:** Mobile App Team
**Priority:** CRITICAL - Subscription Status Not Updating

---

## The Problem

Stripe has **disabled the subscription webhook** due to 9 days of failed requests:

**Disabled Webhook URL:**
```
https://soundbridge.live/api/webhooks/subscription
```

**Error Summary:**
- 22 requests had errors
- Webhook endpoint not returning HTTP 200-299

**Impact:**
- User subscriptions are **not updating** when payments succeed or fail
- Users who cancel/miss payments still show as "Premium" in database
- Users who subscribe don't get their tier upgraded

---

## Immediate Actions Required

### Step 1: Re-enable the Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Find the disabled endpoint: `https://soundbridge.live/api/webhooks/subscription`
4. Click **Enable** button

### Step 2: Fix the Webhook Endpoint

The endpoint is failing. Common causes:

**A. Endpoint Not Found (404)**
```typescript
// Check if route exists at:
// app/api/webhooks/subscription/route.ts
// or
// pages/api/webhooks/subscription.ts
```

**B. Signature Verification Failing**
```typescript
// Make sure you're using raw body, not parsed JSON
export async function POST(request: NextRequest) {
  const body = await request.text(); // NOT request.json()
  const signature = request.headers.get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
```

**C. Missing Webhook Secret**
```bash
# Check environment variable is set
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**D. Handler Throwing Errors**
```typescript
// Always return 200 even if you log errors
try {
  // Process event
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  // STILL return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}
```

### Step 3: Complete Webhook Handler Implementation

```typescript
// app/api/webhooks/subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin access
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Webhook received:', event.type);

  try {
    switch (event.type) {
      // New subscription created
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      // Subscription updated (plan change, renewal)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      // Subscription canceled or expired
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // Payment succeeded (renewal)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      // Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      // Checkout completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    // Return 200 to acknowledge receipt (prevents retries)
    return NextResponse.json({ received: true, error: error.message });
  }
}

// ============ Handler Functions ============

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const plan = getPlanFromSubscription(subscription);

  console.log('Subscription created:', { customerId, status, plan });

  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No user found for customer:', customerId);
    return;
  }

  await updateUserSubscription(profile.id, {
    subscription_tier: plan,
    subscription_status: status === 'active' ? 'active' : 'pending',
    stripe_subscription_id: subscription.id,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const plan = getPlanFromSubscription(subscription);

  console.log('Subscription updated:', { customerId, status, plan });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No user found for customer:', customerId);
    return;
  }

  // Handle different statuses
  if (status === 'active') {
    await updateUserSubscription(profile.id, {
      subscription_tier: plan,
      subscription_status: 'active',
    });
  } else if (status === 'past_due') {
    await updateUserSubscription(profile.id, {
      subscription_status: 'past_due',
    });
  } else if (status === 'canceled' || status === 'unpaid') {
    // Start grace period on cancellation
    await startGracePeriod(profile.id);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('Subscription deleted:', { customerId });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, storage_used')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No user found for customer:', customerId);
    return;
  }

  // Start grace period (90 days to act before content becomes private)
  await startGracePeriod(profile.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  console.log('Payment succeeded:', { customerId, subscriptionId });

  // Payment succeeded, ensure subscription is active
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdated(subscription);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log('Payment failed:', { customerId });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No user found for customer:', customerId);
    return;
  }

  // Mark subscription as past_due
  await updateUserSubscription(profile.id, {
    subscription_status: 'past_due',
  });

  // TODO: Send email notification to user about failed payment
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log('Checkout completed:', { userId, plan, customerId });

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  await updateUserSubscription(userId, {
    subscription_tier: plan?.toLowerCase() || 'premium',
    subscription_status: 'active',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    // Clear any grace period
    grace_period_ends: null,
    downgraded_at: null,
  });
}

// ============ Helper Functions ============

function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  // Get plan from price ID
  const priceId = subscription.items.data[0]?.price.id;

  if (priceId?.includes('unlimited')) return 'unlimited';
  if (priceId?.includes('premium')) return 'premium';

  // Fallback: check metadata
  return subscription.metadata?.plan || 'premium';
}

async function updateUserSubscription(userId: string, updates: Record<string, any>) {
  console.log('Updating user subscription:', { userId, updates });

  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }

  console.log('Subscription updated successfully');
}

async function startGracePeriod(userId: string) {
  console.log('Starting grace period for user:', userId);

  // Get current storage usage to record at time of downgrade
  const { data: tracks } = await supabase
    .from('audio_tracks')
    .select('file_size')
    .eq('creator_id', userId)
    .is('deleted_at', null);

  const storageUsed = tracks?.reduce((sum, t) => sum + (t.file_size || 0), 0) || 0;

  // Set 90-day grace period
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + 90);

  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'grace_period',
      grace_period_ends: graceEnd.toISOString(),
      downgraded_at: new Date().toISOString(),
      storage_at_downgrade: storageUsed,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log('Grace period started, ends:', graceEnd.toISOString());
}
```

---

## Manual Fix for Current Users

Since the webhook has been down, you need to manually sync subscription statuses:

### Option 1: Sync from Stripe

```typescript
// scripts/sync-subscriptions.ts
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncSubscriptions() {
  // Get all active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    status: 'all',
    limit: 100,
  });

  for (const sub of subscriptions.data) {
    const customerId = sub.customer as string;

    // Find user by customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!profile) continue;

    if (sub.status === 'active') {
      // Active subscription
      await supabase
        .from('profiles')
        .update({
          subscription_tier: sub.metadata?.plan || 'premium',
          subscription_status: 'active',
          grace_period_ends: null,
        })
        .eq('id', profile.id);
    } else if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
      // Lapsed subscription - start grace period
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + 90);

      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'grace_period',
          grace_period_ends: graceEnd.toISOString(),
          downgraded_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
    }

    console.log(`Synced user ${profile.id}: ${sub.status}`);
  }
}

syncSubscriptions();
```

### Option 2: Manual Database Update

For a specific user whose subscription has lapsed:

```sql
-- Check current status
SELECT id, email, subscription_tier, subscription_status, grace_period_ends
FROM profiles
WHERE email = 'user@example.com';

-- Update to free with grace period
UPDATE profiles
SET
  subscription_tier = 'free',
  subscription_status = 'grace_period',
  grace_period_ends = NOW() + INTERVAL '90 days',
  downgraded_at = NOW(),
  subscription_updated_at = NOW()
WHERE email = 'user@example.com';
```

---

## Required Database Columns

Ensure your `profiles` table has these columns:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS storage_at_downgrade BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMPTZ;
```

---

## Testing the Webhook

### 1. Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:3000/api/webhooks/subscription

# In another terminal, trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### 2. Check Webhook Logs

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your endpoint
3. View "Recent Events" and check for failures

---

## Checklist

- [ ] Re-enable webhook in Stripe Dashboard
- [ ] Verify webhook endpoint exists and returns 200
- [ ] Check STRIPE_WEBHOOK_SECRET is correct
- [ ] Test with Stripe CLI locally
- [ ] Run manual sync for affected users
- [ ] Monitor webhook logs for 24 hours

---

## Support

This issue is blocking subscription management for all users. Please prioritize!

**Last Updated:** January 15, 2026
