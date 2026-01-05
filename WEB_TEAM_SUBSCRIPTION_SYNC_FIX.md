# Web Team: Critical Subscription Sync Fix Required

**Date:** December 30, 2025
**Priority:** 🔴 **CRITICAL**
**Impact:** All mobile app users with web subscriptions
**Status:** Database schema fixed, trigger ready to deploy

---

## Executive Summary

Mobile app users who subscribe via the web (Stripe) are seeing "Free Plan" instead of their actual subscription tier. This is because the `profiles` table (which the mobile app reads from) is missing required subscription columns and is not being updated by Stripe webhooks.

**Root Cause:** Database schema incomplete + no sync between `user_subscriptions` and `profiles` tables.

**Solution:** Run two SQL migrations to add missing columns and create automatic sync trigger.

---

## Problem Overview

### What's Broken

1. ❌ **Mobile app shows "Free Plan"** for paid subscribers
2. ❌ **Subscription amount shows £0.00/month** instead of actual price
3. ❌ **Subscription period shows incorrect dates**
4. ❌ **Revenue/payout data shows $0.00**

### Why It's Broken

```
Stripe Webhook Flow (CURRENT - BROKEN):
┌─────────────┐
│   Stripe    │ Webhook fires
│  Checkout   │ (customer.subscription.created)
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ user_subscriptions  │ ✅ Gets updated by webhook
│ - tier: 'pro'       │
│ - status: 'active'  │
│ - stripe_sub_id     │
└─────────────────────┘
       │
       X  ❌ NO SYNC TO PROFILES TABLE
       │
┌─────────────────────┐
│     profiles        │ ❌ Missing subscription columns
│ - tier: 'free'      │ ❌ Never updated by webhook
│ - amount: NULL      │ ❌ Mobile app reads from here
└─────────────────────┘
       │
       v
┌─────────────────────┐
│   Mobile App        │ ❌ Shows "Free Plan"
│   (reads profiles)  │ ❌ Shows £0.00/month
└─────────────────────┘
```

**Result:** Webhooks update `user_subscriptions`, but mobile app reads from `profiles` which is never updated.

---

## Technical Root Causes

### 1. Missing Database Columns

The `profiles` table is missing 9 required subscription columns:

```sql
-- ❌ MISSING from profiles table:
subscription_amount
subscription_currency
subscription_period
subscription_period_start
subscription_period_end
stripe_subscription_id
stripe_customer_id

-- ✅ EXISTS (but not populated):
subscription_tier
subscription_status
```

### 2. No Data Sync

Even if columns existed, there's no mechanism to sync data from `user_subscriptions` → `profiles`:

- ✅ Stripe webhooks update `user_subscriptions` table
- ❌ Stripe webhooks DO NOT update `profiles` table
- ❌ No database trigger to sync between tables
- ❌ Mobile app reads from `profiles` (gets stale/empty data)

### 3. Tier Name Mismatch

- `user_subscriptions` table stores tier as `'pro'`
- `profiles` table has check constraint: only allows `'free'`, `'premium'`, `'unlimited'`
- Attempting to copy `'pro'` → `profiles` violates constraint

---

## Solution: Two-Part Database Migration

### Part 1: Add Missing Columns ✅ READY

**File:** [ADD_MISSING_PROFILES_COLUMNS.sql](ADD_MISSING_PROFILES_COLUMNS.sql)

**What it does:**
1. Adds 9 missing subscription columns to `profiles` table
2. Creates performance indexes on subscription fields
3. Verifies schema changes
4. Checks current subscription data

**Run this first:**
```bash
# In Supabase SQL Editor or psql
psql -d your_database -f ADD_MISSING_PROFILES_COLUMNS.sql
```

**Expected result:**
```
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX

-- Should show all 9 columns added
column_name               | data_type | column_default
--------------------------+-----------+---------------
subscription_amount       | numeric   | NULL
subscription_currency     | text      | 'GBP'
subscription_period       | text      | NULL
subscription_period_start | timestamp | NULL
subscription_period_end   | timestamp | NULL
subscription_tier         | text      | 'free'
subscription_status       | text      | NULL
stripe_customer_id        | text      | NULL
stripe_subscription_id    | text      | NULL
```

---

### Part 2: Create Automatic Sync Trigger ✅ READY

**File:** [CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql](CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql)

**What it does:**

1. **Creates trigger function** that syncs `user_subscriptions` → `profiles`
   - Maps tier names: `'pro'` → `'premium'` (to match constraint)
   - Calculates subscription amount based on tier + billing cycle
   - Sets currency to 'GBP' (default, since `user_subscriptions` has no currency column)
   - Copies all subscription dates and Stripe IDs

2. **Creates trigger** that fires automatically on every INSERT/UPDATE to `user_subscriptions`
   - Future Stripe webhook updates will automatically sync to profiles
   - No code changes needed in webhook handler

3. **Backfills existing subscriptions** for ALL users with active subscriptions
   - Updates ALL users who already have subscriptions
   - Not just one user - fixes everyone

4. **Verifies the fix** with count queries
   - Shows total users with subscription data
   - Shows breakdown by tier (premium vs unlimited)
   - Checks specific user for confirmation

**Run this second:**
```bash
# In Supabase SQL Editor or psql
psql -d your_database -f CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql
```

**Expected result:**
```
DROP TRIGGER
DROP FUNCTION
CREATE FUNCTION
CREATE TRIGGER
GRANT
GRANT

-- Trigger verification
trigger_name                          | event_manipulation | event_object_table
--------------------------------------+--------------------+-------------------
sync_subscription_to_profiles_trigger | UPDATE             | user_subscriptions
sync_subscription_to_profiles_trigger | INSERT             | user_subscriptions

-- Backfill results (example)
UPDATE 15  -- 15 users updated

-- Verification counts
users_with_subscription_data | premium_users | unlimited_users
-----------------------------+---------------+----------------
15                           | 12            | 3

-- Specific user check
id           | subscription_tier | subscription_status | subscription_amount | ...
-------------+-------------------+---------------------+---------------------+-----
bd8a455d... | premium           | active              | 6.99                | ...
```

---

## How the Fix Works

### Trigger Function Logic

```sql
CREATE OR REPLACE FUNCTION sync_subscription_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    -- Map 'pro' to 'premium' to match profiles table constraint
    subscription_tier = CASE
      WHEN NEW.tier = 'pro' THEN 'premium'
      ELSE NEW.tier
    END,

    subscription_status = NEW.status,

    -- Calculate amount based on tier and billing cycle
    subscription_amount = CASE
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'monthly' THEN 6.99
      WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'yearly' THEN 69.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'monthly' THEN 12.99
      WHEN NEW.tier = 'unlimited' AND NEW.billing_cycle = 'yearly' THEN 129.99
      ELSE 0
    END,

    subscription_currency = 'GBP',
    subscription_period = NEW.billing_cycle,
    subscription_period_start = NEW.subscription_start_date,
    subscription_period_end = NEW.subscription_renewal_date,
    stripe_subscription_id = NEW.stripe_subscription_id,
    stripe_customer_id = NEW.stripe_customer_id,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### New Data Flow (AFTER FIX)

```
Stripe Webhook Flow (AFTER FIX - WORKING):
┌─────────────┐
│   Stripe    │ Webhook fires
│  Checkout   │ (customer.subscription.created)
└──────┬──────┘
       │
       v
┌─────────────────────┐
│ user_subscriptions  │ ✅ Updated by webhook
│ - tier: 'pro'       │
│ - status: 'active'  │
│ - billing_cycle     │
└──────┬──────────────┘
       │
       │ ✅ TRIGGER FIRES AUTOMATICALLY
       v
┌─────────────────────┐
│     profiles        │ ✅ Automatically synced
│ - tier: 'premium'   │ ✅ Tier mapped correctly
│ - amount: 6.99      │ ✅ Amount calculated
│ - currency: 'GBP'   │ ✅ All fields populated
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│   Mobile App        │ ✅ Shows "Premium"
│   (reads profiles)  │ ✅ Shows £6.99/month
└─────────────────────┘
```

---

## Tier Name Mapping

The trigger handles the tier name mismatch:

| user_subscriptions | profiles (after mapping) | Amount (monthly) | Amount (yearly) |
|-------------------|--------------------------|------------------|-----------------|
| `'pro'`           | `'premium'`              | £6.99            | £69.99          |
| `'premium'`       | `'premium'`              | £6.99            | £69.99          |
| `'unlimited'`     | `'unlimited'`            | £12.99           | £129.99         |
| `'free'`          | `'free'`                 | £0.00            | £0.00           |

---

## Testing After Deployment

### 1. Verify Trigger Was Created

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'sync_subscription_to_profiles_trigger';
```

**Expected:** 2 rows (INSERT and UPDATE events)

---

### 2. Check Existing Users Were Backfilled

```sql
SELECT
  COUNT(*) as total_subscribed_users,
  COUNT(*) FILTER (WHERE subscription_tier = 'premium') as premium_users,
  COUNT(*) FILTER (WHERE subscription_tier = 'unlimited') as unlimited_users
FROM profiles
WHERE subscription_tier IS NOT NULL
  AND subscription_tier != 'free';
```

**Expected:** Non-zero counts matching your active subscription count

---

### 3. Verify Specific User Data

```sql
SELECT
  id,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_currency,
  subscription_period,
  subscription_period_start,
  subscription_period_end,
  stripe_subscription_id
FROM profiles
WHERE email = 'test.user@example.com';
```

**Expected:** Actual subscription data, not NULLs

---

### 4. Test New Subscription Flow

1. Create a test subscription via Stripe checkout
2. Wait for webhook to fire
3. Check both tables:

```sql
-- Should be updated by webhook
SELECT * FROM user_subscriptions WHERE stripe_subscription_id = 'sub_test123';

-- Should be automatically synced by trigger
SELECT * FROM profiles WHERE stripe_subscription_id = 'sub_test123';
```

**Expected:** Both tables have matching subscription data

---

### 5. Test Mobile App

1. Open mobile app as a subscribed user
2. Navigate to billing/subscription screen
3. Verify displays:
   - ✅ Correct tier (Premium/Unlimited, not Free)
   - ✅ Correct amount (£6.99/month or £12.99/month)
   - ✅ Correct currency (GBP)
   - ✅ Correct subscription period dates

---

## Rollback Plan

If anything goes wrong, you can safely rollback:

### Remove Trigger

```sql
DROP TRIGGER IF EXISTS sync_subscription_to_profiles_trigger ON user_subscriptions;
DROP FUNCTION IF EXISTS sync_subscription_to_profiles();
```

### Remove Columns (⚠️ DESTRUCTIVE - data loss)

```sql
ALTER TABLE profiles
DROP COLUMN IF EXISTS subscription_amount,
DROP COLUMN IF EXISTS subscription_currency,
DROP COLUMN IF EXISTS subscription_period,
DROP COLUMN IF EXISTS subscription_period_start,
DROP COLUMN IF EXISTS subscription_period_end,
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS stripe_customer_id;
```

**Note:** The columns `subscription_tier` and `subscription_status` should NOT be removed as they may have existed before.

---

## Alternative: Update Webhook Handler Instead

If you prefer NOT to use a database trigger, you can update the Stripe webhook handler code instead:

**File:** `apps/web/app/api/webhooks/subscription/route.ts` (or similar)

**Add after updating user_subscriptions:**

```typescript
case 'customer.subscription.created':
case 'customer.subscription.updated':
  const subscription = event.data.object;

  // ✅ EXISTING: Update user_subscriptions
  const { error: subError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      tier: tier,
      status: status,
      billing_cycle: billingCycle,
      subscription_start_date: periodStart,
      subscription_renewal_date: periodEnd,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
    }, { onConflict: 'user_id' });

  // ✅ NEW: Also update profiles table
  const amount = tier === 'pro' || tier === 'premium'
    ? (billingCycle === 'monthly' ? 6.99 : 69.99)
    : tier === 'unlimited'
    ? (billingCycle === 'monthly' ? 12.99 : 129.99)
    : 0;

  const mappedTier = tier === 'pro' ? 'premium' : tier;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: mappedTier,
      subscription_status: status,
      subscription_amount: amount,
      subscription_currency: 'GBP',
      subscription_period: billingCycle,
      subscription_period_start: periodStart,
      subscription_period_end: periodEnd,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (profileError) {
    console.error('❌ Failed to update profiles table:', profileError);
  } else {
    console.log('✅ Updated profiles table for user:', userId);
  }
  break;
```

**Pros of webhook approach:**
- ✅ Logic visible in application code
- ✅ Easier to debug (webhook logs)
- ✅ More explicit control

**Cons of webhook approach:**
- ❌ Requires code deployment
- ❌ Doesn't backfill existing users
- ❌ More code to maintain
- ❌ Duplicate logic (update two tables)

**Recommendation:** Use the database trigger approach (simpler, automatic, works for all cases).

---

## Impact Assessment

### Users Affected

- **All mobile app users** who subscribed via web (Stripe)
- Estimated: All active Premium/Unlimited subscribers

### Severity

- **Critical:** Users are paying but see "Free Plan"
- **User Experience:** Confusing, looks like payment didn't work
- **Revenue Risk:** Users may request refunds or cancel
- **Support Impact:** Likely generating support tickets

### Urgency

- **Deploy ASAP:** This is a production data sync issue
- **Low Risk:** SQL migrations are idempotent (safe to re-run)
- **Quick Fix:** ~5 minutes to run both SQL files
- **Immediate Impact:** Users will see correct data on next app reload

---

## Deployment Checklist

- [ ] **Backup database** (recommended before any schema changes)
- [ ] **Run ADD_MISSING_PROFILES_COLUMNS.sql** in production database
- [ ] **Verify columns added** (check output of verification queries)
- [ ] **Run CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql** in production database
- [ ] **Verify trigger created** (check trigger exists in database)
- [ ] **Verify backfill worked** (check user counts in profiles table)
- [ ] **Test with specific user** (check one known subscriber)
- [ ] **Test mobile app** (have user reload and check subscription screen)
- [ ] **Create test subscription** (verify trigger works for new subscriptions)
- [ ] **Monitor webhook logs** (ensure no errors after trigger deployment)
- [ ] **Notify mobile team** (deployment complete, ask them to verify)

---

## Related Documentation

- [ADD_MISSING_PROFILES_COLUMNS.sql](ADD_MISSING_PROFILES_COLUMNS.sql) - SQL migration to add columns
- [CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql](CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql) - SQL migration for sync trigger
- [STRIPE_WEBHOOK_STATUS_FINDINGS.md](STRIPE_WEBHOOK_STATUS_FINDINGS.md) - Original issue investigation
- [SUBSCRIPTION_TIER_MAPPING_FIX.md](SUBSCRIPTION_TIER_MAPPING_FIX.md) - Tier mapping explanation
- [VERIFY_STRIPE_WEBHOOK_PROFILES_UPDATE.md](VERIFY_STRIPE_WEBHOOK_PROFILES_UPDATE.md) - Webhook verification guide

---

## Questions or Issues?

**Before deploying:**
- Review both SQL files to ensure they match your database schema
- Test in staging environment first (if available)
- Verify no custom modifications to `profiles` or `user_subscriptions` tables

**After deploying:**
- Monitor application logs for any errors
- Check Stripe webhook delivery logs for failures
- Test with at least one real user account

**If issues arise:**
- Rollback using the rollback SQL above
- Check constraints on `profiles` table: `SELECT * FROM pg_constraint WHERE conrelid = 'profiles'::regclass`
- Verify `user_subscriptions` schema: `\d user_subscriptions`

---

**Prepared by:** Mobile Team
**Date:** December 30, 2025
**Status:** ✅ Ready for Production Deployment
**Estimated Time:** 5-10 minutes
**Risk Level:** 🟢 Low (idempotent migrations, safe rollback available)
