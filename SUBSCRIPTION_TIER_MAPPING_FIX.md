# Subscription Tier Mapping Fix

**Date:** December 30, 2025
**Issue:** Check constraint violation when syncing subscription data
**Status:** ✅ FIXED

---

## Problem

When running CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql, got error:

```
ERROR: 23514: new row for relation "profiles" violates check constraint "profiles_subscription_tier_check"
```

### Root Cause

**Schema mismatch between tables:**

1. **user_subscriptions table** uses tier value: `'pro'`
2. **profiles table** has check constraint that only allows: `'free'`, `'premium'`, `'unlimited'`
3. Trigger tried to copy `'pro'` → profiles, which violated the constraint

---

## Solution

Added tier mapping in both the trigger function and backfill query:

### Trigger Function (Lines 14-18)

```sql
subscription_tier = CASE
  -- Map 'pro' to 'premium' to match profiles table constraint
  WHEN NEW.tier = 'pro' THEN 'premium'
  ELSE NEW.tier
END,
```

### Amount Calculation (Lines 22-23)

```sql
WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'monthly' THEN 6.99
WHEN (NEW.tier = 'premium' OR NEW.tier = 'pro') AND NEW.billing_cycle = 'yearly' THEN 69.99
```

### Backfill Query (Lines 64-68)

```sql
subscription_tier = CASE
  -- Map 'pro' to 'premium' to match profiles table constraint
  WHEN us.tier = 'pro' THEN 'premium'
  ELSE us.tier
END,
```

---

## What This Fixes

✅ **Trigger function** now maps 'pro' → 'premium' before updating profiles table
✅ **Amount calculation** handles both 'pro' and 'premium' tier names
✅ **Backfill query** maps existing 'pro' subscriptions to 'premium'
✅ **Check constraint** no longer violated

---

## Complete Fixes Applied

The CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql now has THREE fixes:

1. ✅ **Removed `us.currency` reference** (column doesn't exist) - defaults to 'GBP'
2. ✅ **Added tier mapping** ('pro' → 'premium') - matches constraint
3. ✅ **Updated amount calculation** - handles both 'pro' and 'premium'

---

## Next Step

Run the corrected [CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql](CREATE_SUBSCRIPTION_SYNC_TRIGGER.sql) to:
1. Create the trigger for automatic future syncs
2. Backfill ALL existing subscriptions to profiles table
3. Verify your subscription displays correctly in mobile app

This will fix the subscription display for ALL users, not just you.

---

**Last Updated:** December 30, 2025
**Status:** ✅ READY TO RUN
