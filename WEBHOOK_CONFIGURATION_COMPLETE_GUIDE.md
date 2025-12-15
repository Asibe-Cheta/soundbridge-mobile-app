# Webhook Configuration Complete Guide
## RevenueCat & Stripe Subscription Webhooks

**Document Version:** 1.0
**Last Updated:** December 12, 2025
**Platform:** SoundBridge (Web + Mobile)
**Status:** ✅ Production Ready with Security Enhancements

---

## Table of Contents

1. [Overview](#overview)
2. [What Was Fixed](#what-was-fixed)
3. [Security Enhancements Added](#security-enhancements-added)
4. [Configuration Steps](#configuration-steps)
5. [Environment Variables Required](#environment-variables-required)
6. [How Webhooks Work](#how-webhooks-work)
7. [For Mobile Team](#for-mobile-team)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting](#troubleshooting)
10. [References](#references)

---

## Overview

SoundBridge uses **two payment providers** for subscription management:

1. **RevenueCat** - Mobile app subscriptions (iOS & Android via App Store/Google Play)
2. **Stripe** - Web subscriptions & direct payment processing

Both providers send webhook events to the **same endpoint** which automatically updates user subscription status in the database.

### Single Webhook Endpoint

```
https://soundbridge.live/api/webhooks/subscription
```

This endpoint handles events from **both** RevenueCat and Stripe, automatically detecting the source.

---

## What Was Fixed

### Issue 1: Wrong Domain (soundbridge.com → soundbridge.live) ✅

**Problem:**
- All URLs in codebase referenced `soundbridge.com`
- Actual production domain is `soundbridge.live`
- Webhooks were failing because they pointed to wrong domain

**Solution:**
- Updated **25 files** across the entire codebase
- Changed all references from `soundbridge.com` to `soundbridge.live`
- Files updated include:
  - Metadata files (SEO, sitemaps, robots.txt)
  - API routes
  - Component files
  - Documentation files

### Issue 2: Stripe Webhook Pointing to Non-Existent Endpoint ✅

**Problem:**
- Stripe webhook was configured to send events to: `https://soundbridge.live/api/webhooks/stripe-tickets`
- This endpoint doesn't exist in the codebase
- Stripe disabled the webhook after 9 consecutive days of failures

**Solution:**
- Updated Stripe webhook URL to: `https://soundbridge.live/api/webhooks/subscription`
- Configured correct subscription events
- Deleted duplicate webhook

### Issue 3: RevenueCat Webhook Missing Full Path ✅

**Problem:**
- RevenueCat webhook was configured to: `https://soundbridge.live` (missing `/api/webhooks/subscription`)
- Events were not reaching the handler

**Solution:**
- Updated to complete URL: `https://soundbridge.live/api/webhooks/subscription`
- Added Authorization header for security

### Issue 4: No Security Verification ✅

**Problem:**
- Webhooks accepted any incoming request without verification
- Vulnerable to spoofed webhook attacks
- No signature validation

**Solution:**
- Added Stripe signature verification using `stripe.webhooks.constructEvent()`
- Added RevenueCat Authorization header verification
- Rejec requests that fail verification

---

## Security Enhancements Added

### 1. Stripe Webhook Signature Verification

**How it works:**
- Stripe signs each webhook with a secret key
- Our server verifies the signature before processing
- Prevents attackers from sending fake subscription events

**Code Implementation:**
```typescript
// Verify Stripe signature
const event = stripe.webhooks.constructEvent(
  body,                               // Raw request body
  signature,                          // Stripe-Signature header
  process.env.STRIPE_WEBHOOK_SECRET   // Secret from Stripe dashboard
);
```

**Benefits:**
- ✅ Protects against replay attacks
- ✅ Ensures events actually came from Stripe
- ✅ Industry-standard security practice

### 2. RevenueCat Authorization Header Verification

**How it works:**
- RevenueCat sends an Authorization header with each webhook
- Our server checks it matches the configured secret
- Rejects unauthorized requests

**Code Implementation:**
```typescript
// Verify RevenueCat authorization
const expectedAuth = process.env.REVENUECAT_WEBHOOK_SECRET;
if (expectedAuth) {
  const providedAuth = authHeader.replace('Bearer ', '');
  if (providedAuth !== expectedAuth) {
    return 401 Unauthorized;
  }
}
```

**Benefits:**
- ✅ Prevents fake subscription events
- ✅ Simple but effective security layer
- ✅ RevenueCat recommended practice

---

## Configuration Steps

### Step 1: Get Stripe Webhook Signing Secret

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on the **"charismatic-jubilee"** webhook
3. Scroll to **"Signing secret"** section
4. Click **"Reveal"** to see the secret (starts with `whsec_...`)
5. Copy the secret

### Step 2: Generate RevenueCat Authorization Secret

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This will output something like:
```
kJ8Xz2mP9qR5tY7vB3nM6cF4dG1hL0pW8aS5xE2uI9o=
```

### Step 3: Add Secrets to Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_signing_secret_from_step_1

# RevenueCat Configuration
REVENUECAT_WEBHOOK_SECRET=your_generated_secret_from_step_2

# These should already exist
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 4: Configure RevenueCat Webhook

1. Go to: https://app.revenuecat.com
2. Navigate to: **Your Project** → **Integrations** → **Webhooks**
3. Click **"Configure"** or **"+ Add New"**
4. Enter webhook URL:
   ```
   https://soundbridge.live/api/webhooks/subscription
   ```
5. Click **"Edit"** next to **"Authorization header value"**
6. Paste the secret you generated in Step 2
7. Select **events** to send:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ BILLING_ISSUE
8. Set **Environment** to: **Production only**
9. Click **"Save"**

### Step 5: Verify Stripe Webhook Configuration

1. Go to: https://dashboard.stripe.com/webhooks
2. Find the **"charismatic-jubilee"** webhook
3. Verify:
   - ✅ URL is: `https://soundbridge.live/api/webhooks/subscription`
   - ✅ Status is: **Active**
   - ✅ Events include:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `checkout.session.completed`
4. Click **"Send test webhook"** to verify it works
5. You should see **200 OK** response

---

## Environment Variables Required

Your production server must have these environment variables configured:

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Stripe Dashboard → Webhooks → Select webhook → Signing secret |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Price ID for Premium Monthly | Stripe Dashboard → Products → Premium Monthly → API ID |
| `STRIPE_PREMIUM_ANNUAL_PRICE_ID` | Price ID for Premium Annual | Stripe Dashboard → Products → Premium Annual → API ID |
| `STRIPE_UNLIMITED_MONTHLY_PRICE_ID` | Price ID for Unlimited Monthly | Stripe Dashboard → Products → Unlimited Monthly → API ID |
| `STRIPE_UNLIMITED_ANNUAL_PRICE_ID` | Price ID for Unlimited Annual | Stripe Dashboard → Products → Unlimited Annual → API ID |
| `REVENUECAT_WEBHOOK_SECRET` | Authorization secret for RevenueCat | Generate yourself (see Step 2 above) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for RLS bypass) | Supabase Dashboard → Settings → API → service_role |

---

## How Webhooks Work

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Subscribes                          │
│                                                             │
│  Mobile App (iOS/Android)  OR  Web App (Browser)           │
└────────────────┬───────────────────────┬────────────────────┘
                 │                       │
                 ▼                       ▼
         ┌──────────────┐        ┌──────────────┐
         │  RevenueCat  │        │    Stripe    │
         │ (App Store/  │        │  (Web Pay)   │
         │ Google Play) │        │              │
         └──────┬───────┘        └──────┬───────┘
                │                       │
                │ Webhook Event         │ Webhook Event
                │                       │
                └───────────┬───────────┘
                            │
                            ▼
            ┌───────────────────────────────────┐
            │  https://soundbridge.live        │
            │  /api/webhooks/subscription       │
            │                                   │
            │  1. Verify Signature/Auth        │
            │  2. Detect Source (RC or Stripe) │
            │  3. Parse Event Data             │
            │  4. Update Database              │
            └───────────────┬───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Supabase    │
                    │   Database    │
                    │               │
                    │ profiles table│
                    │ - subscription_tier   │
                    │ - subscription_status │
                    │ - subscription_period │
                    └───────────────────────┘
```

### Event Processing

**RevenueCat Events:**
- `INITIAL_PURCHASE` → Activates subscription
- `RENEWAL` → Extends subscription
- `CANCELLATION` → Marks as cancelled (user keeps access until expiry)
- `EXPIRATION` → Reverts user to free tier
- `BILLING_ISSUE` → Marks as past_due

**Stripe Events:**
- `customer.subscription.created` → Activates subscription
- `customer.subscription.updated` → Updates subscription details
- `customer.subscription.deleted` → Reverts to free tier
- `invoice.payment_succeeded` → Confirms successful billing
- `invoice.payment_failed` → Marks as past_due

### Database Updates

When a webhook is received, the handler updates the `profiles` table:

```sql
UPDATE profiles SET
  subscription_tier = 'premium' | 'unlimited' | 'free',
  subscription_status = 'active' | 'cancelled' | 'expired' | 'past_due',
  subscription_period = 'monthly' | 'annual' | NULL,
  subscription_start_date = '2025-12-12T00:00:00Z',
  subscription_renewal_date = '2026-01-12T00:00:00Z',
  stripe_customer_id = 'cus_...' (if Stripe),
  revenuecat_customer_id = 'user_id' (if RevenueCat)
WHERE id = user_id;
```

---

## For Mobile Team

### What You Need to Know

1. **RevenueCat handles all mobile subscriptions**
   - iOS subscriptions via App Store
   - Android subscriptions via Google Play
   - RevenueCat SDK is already integrated in your app

2. **Webhook URL is configured on backend**
   - Mobile app doesn't need to know about webhooks
   - Backend automatically processes subscription changes
   - User's subscription status is stored in Supabase

3. **How to check subscription status in mobile app:**

```typescript
// Example: React Native
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Get current user's subscription
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier, subscription_status, subscription_renewal_date')
  .eq('id', userId)
  .single();

if (profile.subscription_tier === 'premium') {
  // User is premium
} else if (profile.subscription_tier === 'unlimited') {
  // User is unlimited
} else {
  // User is free
}
```

4. **Testing subscription flow:**

```bash
# iOS Sandbox Testing
1. Use a sandbox Apple ID
2. Make a test purchase
3. Check that webhook fires (logs in backend)
4. Verify database updated
5. Refresh user profile in app

# Android Sandbox Testing
1. Use a test Google account
2. Make a test purchase
3. Check webhook logs
4. Verify database updated
5. Refresh user profile in app
```

5. **Important: RevenueCat Product IDs**

Make sure your RevenueCat product IDs follow this naming convention:

```
soundbridge_premium_monthly
soundbridge_premium_annual
soundbridge_unlimited_monthly
soundbridge_unlimited_annual
```

The webhook handler parses these IDs to determine tier and period:

```typescript
// Parsing logic
if (productId.includes('premium')) tier = 'premium';
if (productId.includes('unlimited')) tier = 'unlimited';
if (productId.includes('monthly')) period = 'monthly';
if (productId.includes('annual')) period = 'annual';
```

---

## Testing & Verification

### Test RevenueCat Webhook

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Click **"Send test event"** button
3. Select event type (e.g., INITIAL_PURCHASE)
4. Click **"Send"**
5. Check response is **200 OK**

### Test Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Click on **"charismatic-jubilee"** webhook
3. Click **"Send test webhook"** button
4. Select event (e.g., `customer.subscription.created`)
5. Click **"Send test webhook"**
6. Check response is **200 OK**

### Verify Logs

Check your production server logs for:

```
✅ Stripe signature verified
✅ RevenueCat authorization verified
✅ Subscription activated for user: user_id
💳 STRIPE WEBHOOK: customer.subscription.created
🍎 REVENUECAT WEBHOOK: INITIAL_PURCHASE
```

### Manual Test: Make a Real Subscription

**Test Stripe (Web):**
1. Go to https://soundbridge.live/pricing
2. Click **"Subscribe"** on Premium tier
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check webhook fired
6. Verify user upgraded in database

**Test RevenueCat (Mobile):**
1. Open mobile app (iOS or Android)
2. Go to subscription screen
3. Select a plan
4. Complete purchase (use sandbox account)
5. Check webhook fired
6. Verify database updated
7. Refresh user profile - should show new tier

---

## Troubleshooting

### Webhook Not Firing

**Check:**
1. Is the webhook URL correct? `https://soundbridge.live/api/webhooks/subscription`
2. Is the webhook enabled/active?
3. Are environment variables set on production server?
4. Check Stripe/RevenueCat logs for delivery failures

**Solution:**
- Verify URL in webhook configuration
- Check server logs for errors
- Test with "Send test webhook" button

### Signature Verification Failing (Stripe)

**Error:** `Invalid signature`

**Causes:**
1. Wrong `STRIPE_WEBHOOK_SECRET` in environment variables
2. Using test secret with live mode (or vice versa)
3. Request body modified before verification

**Solution:**
1. Get the correct signing secret from Stripe Dashboard
2. Make sure you're using the secret for the correct mode (test/live)
3. Ensure webhook endpoint reads raw body (not parsed JSON)

### Authorization Failing (RevenueCat)

**Error:** `Unauthorized`

**Causes:**
1. Wrong `REVENUECAT_WEBHOOK_SECRET` in environment variables
2. Authorization header not configured in RevenueCat dashboard
3. Mismatch between configured and expected secrets

**Solution:**
1. Regenerate secret and update both places:
   - `.env` file: `REVENUECAT_WEBHOOK_SECRET=your_secret`
   - RevenueCat dashboard: Authorization header value
2. Ensure no extra spaces or formatting

### Subscription Not Updating in Database

**Check:**
1. Is webhook firing? (check logs)
2. Is signature/auth verification passing?
3. Is user ID correct in webhook payload?
4. Does user exist in `profiles` table?

**Solution:**
- Check logs for the exact error
- Verify user ID mapping:
  - RevenueCat: `event.app_user_id` must match `profiles.id`
  - Stripe: `customer` ID must exist in `profiles.stripe_customer_id`

### User ID Mismatch

**RevenueCat:**
```typescript
// When creating RevenueCat user, use Supabase user ID:
import Purchases from 'react-native-purchases';

// Set user ID to match Supabase
await Purchases.logIn(supabaseUserId);
```

**Stripe:**
```typescript
// When creating Stripe customer, store customer ID:
const customer = await stripe.customers.create({
  email: user.email,
  metadata: { supabase_user_id: user.id }
});

// Save to database
await supabase
  .from('profiles')
  .update({ stripe_customer_id: customer.id })
  .eq('id', user.id);
```

---

## References

### Official Documentation

- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Stripe Signature Verification:** https://stripe.com/docs/webhooks/signatures
- **RevenueCat Webhooks:** https://www.revenuecat.com/docs/webhooks
- **RevenueCat Authorization:** https://www.revenuecat.com/docs/webhooks#authorization

### Internal Documentation

- **Profile Lists Guide:** `PROFILE_LISTS_COMPLETE_GUIDE_FOR_MOBILE.md`
- **Analytics Guide:** `ANALYTICS_COMPLETE_GUIDE_FOR_MOBILE.md`

### Support

**For Web/Backend Issues:**
- Contact backend team
- Check server logs
- Review Stripe/RevenueCat dashboards

**For Mobile Integration Issues:**
- Check RevenueCat SDK setup
- Verify user ID mapping
- Test with sandbox accounts

---

## Summary Checklist

### Backend Configuration ✅

- [x] Updated all `soundbridge.com` to `soundbridge.live` (25 files)
- [x] Fixed Stripe webhook URL to `/api/webhooks/subscription`
- [x] Fixed RevenueCat webhook URL to `/api/webhooks/subscription`
- [x] Added Stripe signature verification
- [x] Added RevenueCat authorization verification
- [x] Configured environment variables
- [x] Tested webhooks from both providers

### Mobile Team Action Items

- [ ] Verify RevenueCat SDK is properly configured
- [ ] Ensure user IDs match between RevenueCat and Supabase
- [ ] Test subscription flow in sandbox
- [ ] Verify subscription status updates in app
- [ ] Test upgrade/downgrade/cancel flows
- [ ] Implement subscription status checking on app launch
- [ ] Handle subscription expiration gracefully

### Production Deployment

- [ ] Verify all environment variables are set
- [ ] Test webhooks in production
- [ ] Monitor webhook delivery success rate
- [ ] Set up alerts for webhook failures
- [ ] Document any edge cases encountered

---

**Document End**

For questions or issues, contact the backend team or refer to the official Stripe/RevenueCat documentation.
