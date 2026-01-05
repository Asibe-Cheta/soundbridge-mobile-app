# Stripe Webhook Status - Findings

**Date:** December 30, 2025
**Status:** 🔴 **ISSUE CONFIRMED**
**Priority:** CRITICAL

---

## Key Finding

The `profiles` table is **missing critical columns** that the mobile app needs:

```
ERROR: column "stripe_subscription_id" does not exist
```

This means:
1. ❌ The profiles table schema was never fully migrated
2. ❌ Webhooks can't update profiles table (columns don't exist)
3. ❌ Mobile app's Supabase fallback will always fail

---

## What We Discovered

### ✅ Stripe Webhooks ARE Configured
- Endpoint: `https://soundbridge.live/api/webhooks/subscription`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Status: Active and working

### ✅ Webhooks Update `user_subscriptions` Table
- Confirmed from documentation
- Uses proper `upsert` logic
- Sets all required fields

### ❌ BUT: `profiles` Table Missing Columns
When trying to check `stripe_subscription_id` in profiles table:
```
ERROR: 42703: column "stripe_subscription_id" does not exist
```

**Missing columns:**
- `subscription_amount`
- `subscription_currency`
- `subscription_period` (monthly/yearly)
- `subscription_period_start`
- `subscription_period_end`
- `stripe_subscription_id`
- `stripe_customer_id`

---

## Why This is a Problem

The mobile app reads from `profiles` table (SubscriptionService.ts:259):

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier, subscription_status, subscription_amount, subscription_currency, subscription_period_start, subscription_period_end')
  .eq('id', session.user.id)
  .single();
```

**If these columns don't exist:**
- Query will fail or return NULL
- Fallback won't work
- Users see "Free Plan" even if subscribed

---

## The Complete Picture

### Database Tables:

**1. `user_subscriptions` table:**
- ✅ Has all subscription columns
- ✅ Updated by Stripe webhooks
- ❌ NOT read by mobile app

**2. `profiles` table:**
- ❌ Missing subscription columns (except tier, status)
- ❌ Can't be updated by webhooks (columns don't exist)
- ✅ IS read by mobile app

**Result:** Webhook updates the wrong table, mobile app reads from empty table.

---

## Solution: Two-Part Fix

### Part 1: Add Missing Columns to `profiles` Table ✅

Run [ADD_MISSING_PROFILES_COLUMNS.sql](ADD_MISSING_PROFILES_COLUMNS.sql):

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS subscription_currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS subscription_period TEXT,
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

**This allows:**
- Columns to exist for webhook to update
- Mobile app to read the data
- Supabase fallback to work

---

### Part 2: Verify/Update Webhook Handler

After adding columns, verify webhook handler updates BOTH tables:

```typescript
// apps/web/app/api/webhooks/subscription/route.ts

case 'customer.subscription.created':
case 'customer.subscription.updated':
  const subscription = event.data.object;

  // ✅ Update user_subscriptions (already working)
  await supabase.from('user_subscriptions').upsert({ ... });

  // ✅ ALSO update profiles (may be missing)
  await supabase.from('profiles').update({
    subscription_tier: tier,
    subscription_status: status,
    subscription_amount: amount,
    subscription_currency: currency,
    subscription_period: billingCycle,
    subscription_period_start: periodStart,
    subscription_period_end: periodEnd,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    updated_at: new Date().toISOString()
  }).eq('id', userId);
```

---

## Alternative: Database Trigger (Simpler)

Instead of modifying webhook code, create a trigger to auto-sync:

```sql
-- Create trigger function to sync user_subscriptions → profiles
CREATE OR REPLACE FUNCTION sync_subscription_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table whenever user_subscriptions changes
  UPDATE profiles SET
    subscription_tier = NEW.tier,
    subscription_status = NEW.status,
    subscription_amount = NEW.amount,
    subscription_currency = NEW.currency,
    subscription_period = NEW.billing_cycle,
    subscription_period_start = NEW.current_period_start,
    subscription_period_end = NEW.current_period_end,
    stripe_subscription_id = NEW.stripe_subscription_id,
    stripe_customer_id = NEW.stripe_customer_id,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER sync_subscription_to_profiles_trigger
AFTER INSERT OR UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_to_profiles();

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_subscription_to_profiles() TO authenticated;
```

**Benefits:**
- ✅ Automatic sync (no webhook code changes needed)
- ✅ Works even if webhook only updates user_subscriptions
- ✅ Handles all updates (webhook, manual, etc.)
- ✅ Simpler than modifying webhook handler

**Trade-offs:**
- Extra database overhead (minimal)
- Hidden logic (not visible in application code)

---

## Recommended Approach

**For fastest fix (recommended):**

1. ✅ **Run [ADD_MISSING_PROFILES_COLUMNS.sql](ADD_MISSING_PROFILES_COLUMNS.sql)** to add columns
2. ✅ **Create database trigger** to auto-sync tables
3. ✅ **Run [UPDATE_SUBSCRIPTION_DATA.sql](UPDATE_SUBSCRIPTION_DATA.sql)** to populate YOUR data
4. ⏳ **Backend team verifies webhook** updates both tables (nice to have)

**Why this is best:**
- Immediate fix for all users
- No webhook code changes needed
- Automatic going forward
- Works with existing webhook implementation

---

## Action Items

### Immediate (Database Admin):

1. ✅ Run [ADD_MISSING_PROFILES_COLUMNS.sql](ADD_MISSING_PROFILES_COLUMNS.sql)
   - Adds missing columns to profiles table
   - Creates indexes for performance
   - Verifies schema

2. ✅ Create sync trigger (optional but recommended)
   - Auto-syncs user_subscriptions → profiles
   - Ensures data consistency
   - No code changes needed

3. ✅ Run [UPDATE_SUBSCRIPTION_DATA.sql](UPDATE_SUBSCRIPTION_DATA.sql)
   - Populates YOUR subscription data
   - Immediate fix for your account
   - Test mobile app

### Follow-up (Backend Team):

1. 🔄 Verify webhook handler updates BOTH tables
   - Check `apps/web/app/api/webhooks/subscription/route.ts`
   - Ensure profiles table is updated
   - If not, add profiles update code

2. 🔄 Test with new subscription
   - Create test subscription
   - Verify both tables populated
   - Verify mobile app shows correct data

---

## Testing After Fix

```sql
-- 1. Verify columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'subscription%';

-- Should show:
-- subscription_tier
-- subscription_status
-- subscription_amount
-- subscription_currency
-- subscription_period
-- subscription_period_start
-- subscription_period_end

-- 2. Check your data
SELECT
  subscription_tier,
  subscription_amount,
  subscription_currency,
  subscription_period_start,
  subscription_period_end
FROM profiles
WHERE id = auth.uid();

-- Should show your actual subscription data, not NULL

-- 3. Test mobile app
-- Open BillingScreen
-- Should show Premium tier, £6.99/month, correct dates
```

---

## Summary

**Root Cause Found:**
- `profiles` table missing required columns
- Webhooks can't update what doesn't exist
- Mobile app can't read what isn't there

**Fix:**
1. Add columns to profiles table
2. Create sync trigger (or update webhook)
3. Populate existing user data

**Result:**
- ✅ Webhooks will work for new subscriptions
- ✅ Mobile app will show correct data
- ✅ No more "Free Plan" for paid users

---

**Status:** 🔴 CRITICAL - Database schema incomplete
**Action:** Run ADD_MISSING_PROFILES_COLUMNS.sql immediately
**Priority:** HIGHEST - Blocking all web subscribers

**Last Updated:** December 30, 2025
