# Stripe Subscription Setup Guide - Web App

**Date:** January 14, 2026
**To:** Web/Backend Team
**From:** Mobile App Team
**Priority:** 🔴 **CRITICAL** - Subscriptions Completely Broken
**Issue:** Stripe price IDs not configured, users cannot upgrade

---

## 🚨 The Problem

When users try to upgrade their subscription, they see:

**UI Error:**
```
Stripe pricing not configured. Please set up Stripe price IDs.
```

**Console Error:**
```
[SubscriptionService] Error creating checkout session:
Error: Stripe pricing not configured. Please set up Stripe price IDs.

Failed to load resource: the server responded with a status of 500 ()
https://www.soundbridge.live/api/stripe/create-checkout-session
```

**Root Cause:** The Stripe Price IDs are not configured in environment variables.

---

## ✅ The Fix (Step by Step)

### Step 1: Get Price IDs from Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Pricing**
3. Find your subscription products (Premium, Unlimited)
4. Copy the **Price IDs** (they look like `price_1234567890abcdef`)

**You should have these prices created:**

| Product | Billing | Price | Price ID Format |
|---------|---------|-------|-----------------|
| Premium | Monthly | £6.99 | `price_xxxxx` |
| Premium | Yearly | £69.99 | `price_xxxxx` |
| Unlimited | Monthly | £12.99 | `price_xxxxx` |
| Unlimited | Yearly | £129.99 | `price_xxxxx` |

### Step 2: Create Products in Stripe (If Not Done)

If the products don't exist yet, create them:

**Option A: Via Stripe Dashboard**

1. Go to Products → Add Product
2. Create "SoundBridge Premium"
   - Add Monthly price: £6.99 (recurring)
   - Add Yearly price: £69.99 (recurring)
3. Create "SoundBridge Unlimited"
   - Add Monthly price: £12.99 (recurring)
   - Add Yearly price: £129.99 (recurring)

**Option B: Via Stripe CLI or API**

```bash
# Create Premium product
stripe products create \
  --name="SoundBridge Premium" \
  --description="For growing creators"

# Create Premium monthly price
stripe prices create \
  --product="prod_xxxxx" \
  --unit-amount=699 \
  --currency=gbp \
  --recurring[interval]=month

# Create Premium yearly price
stripe prices create \
  --product="prod_xxxxx" \
  --unit-amount=6999 \
  --currency=gbp \
  --recurring[interval]=year

# Repeat for Unlimited...
```

### Step 3: Add Price IDs to Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs - THESE ARE REQUIRED!
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxx
STRIPE_PRICE_UNLIMITED_MONTHLY=price_xxxxx
STRIPE_PRICE_UNLIMITED_YEARLY=price_xxxxx

# Alternative naming convention (check your code)
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_YEARLY=price_xxxxx
```

### Step 4: Update Your Subscription Service

Your code probably looks something like this:

```typescript
// services/subscription-service.ts

const STRIPE_PRICES = {
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  },
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
    yearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY,
  },
};

export async function createCheckoutSession(plan: string, billing: string) {
  const priceId = STRIPE_PRICES[plan]?.[billing];

  if (!priceId) {
    throw new Error('Stripe pricing not configured. Please set up Stripe price IDs.');
  }

  // Create checkout session...
}
```

**The error is happening because `priceId` is undefined!**

### Step 5: Verify Environment Variables Are Loaded

Add this debug code temporarily:

```typescript
// At the top of your subscription service or API route
console.log('Stripe Price IDs:', {
  premiumMonthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premiumYearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  unlimitedMonthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
  unlimitedYearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY,
});
```

If they're all `undefined`, your env vars aren't being loaded correctly.

### Step 6: Restart Your Development Server

After adding env vars, restart:

```bash
# Kill and restart Next.js
npm run dev

# Or if using Vercel
vercel dev
```

### Step 7: Redeploy to Production

If using Vercel, Netlify, or similar:

1. Go to your project settings
2. Add the environment variables
3. Redeploy the application

---

## 📋 Complete API Endpoint Implementation

Here's how your checkout session endpoint should look:

```typescript
// app/api/stripe/create-checkout-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Map plan names to Stripe Price IDs
const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  },
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
    yearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, billing, userId, userEmail, successUrl, cancelUrl } = body;

    // Debug logging
    console.log('Creating checkout session:', { plan, billing, userId });
    console.log('Available price IDs:', PRICE_IDS);

    // Validate inputs
    if (!plan || !billing) {
      return NextResponse.json(
        { error: 'Plan and billing period are required' },
        { status: 400 }
      );
    }

    // Get the price ID
    const priceId = PRICE_IDS[plan.toLowerCase()]?.[billing.toLowerCase()];

    if (!priceId) {
      console.error('Price ID not found:', { plan, billing, availablePrices: PRICE_IDS });
      return NextResponse.json(
        { error: 'Stripe pricing not configured. Please set up Stripe price IDs.' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        plan: plan,
        billing: billing,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan,
        },
      },
    });

    console.log('Checkout session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

---

## 🔔 Webhook Handler for Subscription Updates

You also need to handle Stripe webhooks to update user subscriptions:

```typescript
// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

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

  console.log('Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  console.log(`Updating subscription for user ${userId} to ${plan}`);

  // Update user's subscription in database
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: plan.toLowerCase(),
      subscription_status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription updated successfully for user ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  const status = subscription.status;
  const plan = subscription.metadata?.plan || 'free';

  // Map Stripe status to our status
  let subscriptionStatus = 'active';
  if (status === 'canceled' || status === 'unpaid') {
    subscriptionStatus = 'canceled';
  } else if (status === 'past_due') {
    subscriptionStatus = 'past_due';
  }

  await supabase
    .from('profiles')
    .update({
      subscription_tier: subscriptionStatus === 'canceled' ? 'free' : plan,
      subscription_status: subscriptionStatus,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      subscription_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`Subscription canceled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  // Could send confirmation email here
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  // Could send dunning email here
}
```

---

## 🔧 Quick Checklist

### Environment Variables Needed

```bash
# .env.local or Vercel Environment Variables

# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Stripe Webhook Secret (from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs (from Stripe Dashboard → Products → Pricing)
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxx
STRIPE_PRICE_UNLIMITED_MONTHLY=price_xxxxx
STRIPE_PRICE_UNLIMITED_YEARLY=price_xxxxx
```

### Stripe Dashboard Configuration

1. ✅ Products created (Premium, Unlimited)
2. ✅ Prices configured (Monthly, Yearly for each)
3. ✅ Webhook endpoint added: `https://www.soundbridge.live/api/stripe/webhook`
4. ✅ Webhook events selected:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Code Changes

1. ✅ Environment variables added
2. ✅ Checkout session endpoint working
3. ✅ Webhook handler implemented
4. ✅ Database updated on subscription change
5. ✅ Error handling in place

---

## 🔄 Syncing with Mobile App (IAP)

**Important:** Web uses Stripe, Mobile uses IAP (In-App Purchases). They need to sync!

### Current Architecture

```
┌─────────────────┐       ┌─────────────────┐
│   Web App       │       │   Mobile App    │
│   (Stripe)      │       │   (IAP)         │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │                         │
         ▼                         ▼
┌─────────────────────────────────────────────┐
│              Supabase Database              │
│                                             │
│  profiles table:                            │
│  - subscription_tier (free/premium/unlimited)│
│  - subscription_status (active/canceled)    │
│  - stripe_customer_id (web purchases)       │
│  - iap_receipt_id (mobile purchases)        │
│  - subscription_platform (web/ios/android)  │
│  - subscription_updated_at                  │
└─────────────────────────────────────────────┘
```

### Database Schema for Cross-Platform Sync

```sql
-- Ensure profiles table has these columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS iap_receipt_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_platform VARCHAR(50); -- 'web', 'ios', 'android'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
```

### Sync Rules

1. **Web Purchase (Stripe):**
   - Update `subscription_tier`
   - Set `subscription_platform = 'web'`
   - Store `stripe_customer_id` and `stripe_subscription_id`

2. **Mobile Purchase (IAP):**
   - Update `subscription_tier`
   - Set `subscription_platform = 'ios'` or `'android'`
   - Store `iap_receipt_id`

3. **Cross-Platform Access:**
   - User logs in on mobile after web purchase → sees Premium features
   - User logs in on web after mobile purchase → sees Premium features
   - Both platforms read `subscription_tier` from database

---

## 🧪 Testing

### Test Mode

Use Stripe test keys first:
- `sk_test_xxxxx` instead of `sk_live_xxxxx`
- `pk_test_xxxxx` instead of `pk_live_xxxxx`

### Test Card Numbers

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | 3D Secure required |

### Test Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

---

## 📊 Verification Checklist

After setup, verify:

- [ ] Pricing page shows no error banner
- [ ] Clicking "Upgrade to Premium" opens Stripe Checkout
- [ ] Test payment completes successfully
- [ ] User's `subscription_tier` updates in database
- [ ] User sees Premium features after purchase
- [ ] Webhook events are received and processed
- [ ] Mobile app sees updated subscription (cross-platform sync)

---

## 🚨 Common Issues

### 1. "Stripe pricing not configured"
**Cause:** Environment variables not set
**Fix:** Add `STRIPE_PRICE_*` variables to `.env`

### 2. "No such price: price_xxxxx"
**Cause:** Wrong price ID or using test IDs in production
**Fix:** Copy correct price IDs from Stripe Dashboard

### 3. Webhook signature verification failed
**Cause:** Wrong webhook secret or raw body parsing issue
**Fix:** Use correct `STRIPE_WEBHOOK_SECRET` and ensure raw body parsing

### 4. Subscription not updating in database
**Cause:** Webhook not receiving events or missing userId in metadata
**Fix:** Check webhook logs in Stripe Dashboard, ensure metadata is passed

---

## 📞 Support

**Mobile Team Contact:** [Your Name]
**Stripe Documentation:** https://stripe.com/docs/billing/subscriptions

**This is blocking all subscription upgrades. Please fix ASAP!**

---

**Last Updated:** January 14, 2026
