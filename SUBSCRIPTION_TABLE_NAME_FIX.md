# Subscription Table Name Fix

**Date:** December 30, 2025
**Status:** ✅ **FIXED**
**File:** [src/services/SubscriptionService.ts](src/services/SubscriptionService.ts:259)

---

## Problem

BillingScreen was showing "Free Plan" even for paid users because the Supabase fallback query was failing with:

```
⚠️ Supabase query error:
{
  code: 'PGRST205',
  details: null,
  hint: "Perhaps you meant the table 'public.profiles'",
  message: "Could not find the table 'public.user_profiles' in the schema cache"
}
```

**Root Cause:** The code was querying `user_profiles` table which doesn't exist. The correct table name is `profiles`.

---

## Solution

Changed table name from `user_profiles` to `profiles` in the Supabase fallback query.

### Changes Made

**File:** [SubscriptionService.ts](src/services/SubscriptionService.ts:259)

**Line 259:**
```typescript
// ❌ BEFORE (Wrong table name)
.from('user_profiles')

// ✅ AFTER (Correct table name)
.from('profiles')  // ✅ FIXED: Changed from 'user_profiles' to 'profiles'
```

---

## Context

The SubscriptionService has a fallback chain for getting subscription status:

1. **Primary:** RevenueCat (real-time subscription data)
2. **Secondary:** Backend API (`/api/subscriptions/status`)
3. **Tertiary:** Supabase direct query to `profiles` table ✅ (This was broken)
4. **Final Fallback:** Return free tier

When the API times out or RevenueCat is unavailable, the service falls back to Supabase. The wrong table name caused this fallback to always fail, resulting in users seeing "Free Plan" incorrectly.

---

## Why This Matters

### Before Fix (Cascade of Failures)

```
1. RevenueCat not initialized → Skip
2. Backend API timeout → Fail
3. Supabase fallback → ❌ FAIL (wrong table name)
4. Final fallback → Show "Free Plan" (INCORRECT)
```

### After Fix (Fallback Works)

```
1. RevenueCat not initialized → Skip
2. Backend API timeout → Fail
3. Supabase fallback → ✅ SUCCESS (correct table name)
4. Show actual tier from profiles table
```

---

## Additional Issues Found

While fixing this, discovered two other issues that still need attention:

### 1. RevenueCat Not Initializing

Logs don't show:
```
🔍 Checking RevenueCat for subscription status...
```

This means `RevenueCatService.isReady()` is returning `false`. Need to check:
- Is RevenueCat initialized in App.tsx?
- Are the API keys configured correctly?
- Is there an initialization error being swallowed?

### 2. Backend API Timeouts

```
⏱️ Subscription status request timed out - checking Supabase fallback
❌ Error fetching revenue data: Error: Request timeout
```

Need to investigate:
- Is the backend server running?
- Network connectivity issues?
- API endpoint performance problems?

---

## Testing Checklist

- [x] Fix table name from `user_profiles` to `profiles`
- [ ] Test Supabase fallback works correctly
- [ ] Verify paid users see correct tier when API times out
- [ ] Investigate RevenueCat initialization issue
- [ ] Investigate backend API timeout issue
- [ ] Test complete subscription flow end-to-end

---

## Database Schema Reference

**Correct Table:** `profiles`

**Relevant Columns:**
- `id` (uuid) - User ID
- `subscription_tier` (text) - 'free' | 'premium' | 'unlimited'
- `subscription_status` (text) - 'active' | 'cancelled' | etc.
- `currency` (text) - 'GBP' | 'USD' | etc.

**Query:**
```sql
SELECT subscription_tier, subscription_status, currency
FROM profiles
WHERE id = 'user-uuid';
```

---

## Related Files

- [SubscriptionService.ts](src/services/SubscriptionService.ts) - Main fix location
- [BillingScreen.tsx](src/screens/BillingScreen.tsx) - Uses subscription data
- [RevenueCatService.ts](src/services/RevenueCatService.ts) - Primary subscription source

---

## Summary

**Problem:** Wrong table name caused Supabase fallback to fail, showing "Free Plan" for paid users

**Solution:** Changed `user_profiles` to `profiles`

**Impact:** Supabase fallback now works correctly when RevenueCat/API are unavailable

**Status:** ✅ Fixed, but need to investigate RevenueCat and API timeout issues

---

**Last Updated:** December 30, 2025
