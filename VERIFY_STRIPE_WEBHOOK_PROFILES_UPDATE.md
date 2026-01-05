# Verify Stripe Webhook Updates Profiles Table

**Date:** December 30, 2025
**Status:** 🔍 **VERIFICATION NEEDED**
**Priority:** HIGH

---

## What We Know

✅ **Stripe webhooks ARE configured** (from [WEBHOOK_CONFIGURATION_COMPLETE_GUIDE.md](WEBHOOK_CONFIGURATION_COMPLETE_GUIDE.md))
- Endpoint: `https://soundbridge.live/api/webhooks/subscription`
- Events listening: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Handler location: `apps/web/app/api/webhooks/subscription/route.ts` (or similar)

✅ **Webhooks update `user_subscriptions` table** (from [WEBHOOK_AUTOMATIC_UPDATE_VERIFICATION.md](WEBHOOK_AUTOMATIC_UPDATE_VERIFICATION.md))
- Uses `upsert` with `onConflict: 'user_id'`
- Sets `tier`, `status`, subscription dates correctly

❓ **Question: Do webhooks also update the `profiles` table?**

---

## The Critical Question

The mobile app's Supabase fallback reads from the **`profiles` table**, NOT `user_subscriptions` table.

**Mobile app code (SubscriptionService.ts:259):**
```typescript
const { data: profile } = await supabase
  .from('profiles')  // ← Reads from profiles, not user_subscriptions
  .select('subscription_tier, subscription_status, subscription_amount, ...')
  .eq('id', session.user.id)
  .single();
```

**So the question is:** When Stripe webhooks fire, do they update:
1. ✅ `user_subscriptions` table? (Yes, confirmed)
2. ❓ `profiles` table? (Unknown - need to verify)

---

## Verification Steps

### Step 1: Check Webhook Handler Code

**Backend team needs to check:** `apps/web/app/api/webhooks/subscription/route.ts`

Look for code that updates the `profiles` table:

```typescript
// ✅ GOOD: Updates both tables
case 'customer.subscription.created':
case 'customer.subscription.updated':
  // Update user_subscriptions table
  await supabase.from('user_subscriptions').upsert({ ... });

  // ✅ ALSO update profiles table
  await supabase.from('profiles').update({
    subscription_tier: tier,
    subscription_status: status,
    subscription_amount: amount,
    subscription_currency: currency,
    subscription_period_start: periodStart,
    subscription_period_end: periodEnd,
    // ...
  }).eq('id', userId);
```

**vs**

```typescript
// ❌ BAD: Only updates user_subscriptions, not profiles
case 'customer.subscription.created':
case 'customer.subscription.updated':
  // Update user_subscriptions table
  await supabase.from('user_subscriptions').upsert({ ... });

  // ❌ MISSING: profiles table update
  // Mobile app won't see subscription data!
```

---

### Step 2: Check Stripe Dashboard

1. **Go to:** Stripe Dashboard → Developers → Webhooks
2. **Find:** `https://soundbridge.live/api/webhooks/subscription`
3. **Click:** Recent deliveries
4. **Check:** Are webhooks succeeding (200 OK) or failing?

**If failing:**
- Check error logs to see why
- Common issues: signature verification, database errors, missing fields

**If succeeding:**
- Webhooks are firing correctly
- Problem might be that they're not updating `profiles` table

---

### Step 3: Check Database After Subscription

**For a user who subscribed via web (Stripe):**

```sql
-- Check user_subscriptions table
SELECT * FROM user_subscriptions
WHERE user_id = 'your-user-id';

-- ✅ If webhook works, this should show:
-- tier: 'premium' or 'unlimited'
-- status: 'active'
-- subscription_start_date: actual date
-- subscription_renewal_date: actual date

-- Check profiles table
SELECT
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_period_start,
  subscription_period_end
FROM profiles
WHERE id = 'your-user-id';

-- ❓ Does this ALSO show subscription data?
-- If NULL or 'free', webhook is NOT updating profiles table
```

---

## Two Possible Scenarios

### Scenario A: Webhook Updates BOTH Tables ✅

**If profiles table has correct data:**
- Webhook is working perfectly
- Mobile app should show correct subscription
- Problem might be elsewhere (API timeout, RevenueCat, etc.)

**Action:** Investigate why mobile app still shows "Free Plan"
- Check API response times
- Check if API is reading from profiles correctly
- Check RevenueCat initialization

---

### Scenario B: Webhook Only Updates user_subscriptions ❌

**If profiles table is NULL or stale:**
- Webhook needs to be updated to also update profiles table
- This is the missing link

**Action:** Update webhook handler to also update profiles table

**Code to add:**
```typescript
// After updating user_subscriptions, also update profiles
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    subscription_tier: tier,
    subscription_status: status,
    subscription_amount: amount,
    subscription_currency: currency,
    subscription_period: billingCycle,
    subscription_period_start: periodStart,
    subscription_period_end: periodEnd,
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString()
  })
  .eq('id', userId);

if (profileError) {
  console.error('❌ Failed to update profiles table:', profileError);
} else {
  console.log('✅ Updated profiles table for user:', userId);
}
```

---

## Quick Diagnostic SQL

Run this to see if webhook is populating profiles table:

```sql
-- Check if ANY users have subscription data in profiles table
SELECT COUNT(*) as users_with_subscription_data
FROM profiles
WHERE subscription_tier IS NOT NULL
  AND subscription_tier != 'free'
  AND subscription_amount IS NOT NULL;

-- If count = 0: Webhook is NOT updating profiles table
-- If count > 0: Webhook IS updating profiles table (at least sometimes)

-- If count > 0, check your specific user:
SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  subscription_amount,
  subscription_period_start,
  subscription_period_end,
  stripe_subscription_id
FROM profiles
WHERE id = 'YOUR_USER_ID';

-- If YOUR user has NULL values but others don't:
-- Your subscription might have happened before webhook was updated
-- Run UPDATE_SUBSCRIPTION_DATA.sql as workaround
```

---

## Most Likely Scenario

Based on the documentation:

1. ✅ Stripe webhooks are configured and working
2. ✅ Webhooks update `user_subscriptions` table
3. ❓ **Unknown:** Do webhooks ALSO update `profiles` table?
4. ❌ **Likely issue:** Webhook handler only updates `user_subscriptions`, not `profiles`

**Why this matters:**
- Mobile app's Supabase fallback reads from `profiles` table (line 259)
- If `profiles` table isn't updated, fallback won't work
- Users see "Free Plan" even though `user_subscriptions` table has correct data

---

## Action Items

### For Backend Team (Immediate):

**1. Check webhook handler code:**
```bash
# Find the webhook handler file
grep -r "api/webhooks/subscription" apps/web/

# Or likely location:
# apps/web/app/api/webhooks/subscription/route.ts
# OR
# apps/web/app/api/stripe/webhook/route.ts
```

**2. Verify if it updates profiles table:**
- Look for `supabase.from('profiles').update(...)` in webhook handler
- If missing, add code to update profiles table
- If present, check if it's working correctly

**3. Check Stripe Dashboard:**
- Verify webhooks are succeeding (200 OK)
- If failing, check error logs
- Re-send failed webhooks after fixing

**4. Test with new subscription:**
- Create test subscription on web
- Check both `user_subscriptions` AND `profiles` tables
- Verify mobile app shows correct subscription

### For Mobile Team:

**Wait for verification before assuming webhook is broken.**
- If webhook updates both tables: Problem is elsewhere
- If webhook only updates user_subscriptions: Needs backend fix

---

## Quick Win: Database Trigger (Alternative Solution)

**If updating webhook handler is complex,** you could create a database trigger to automatically sync `user_subscriptions` → `profiles`:

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION sync_subscription_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    subscription_tier = NEW.tier,
    subscription_status = NEW.status,
    subscription_amount = NEW.amount,
    subscription_currency = NEW.currency,
    subscription_period = NEW.billing_cycle,
    subscription_period_start = NEW.current_period_start,
    subscription_period_end = NEW.current_period_end,
    stripe_subscription_id = NEW.stripe_subscription_id,
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
```

**Pros:**
- Automatically syncs whenever `user_subscriptions` is updated
- Works even if webhook only updates one table
- No code changes needed

**Cons:**
- Adds database overhead
- Hidden logic (not visible in code)
- Harder to debug

---

## Conclusion

**Next step:** Backend team needs to verify if webhook handler updates the `profiles` table.

**Two possible outcomes:**
1. ✅ **It does update profiles** → Problem is elsewhere (investigate API timeout, RevenueCat, etc.)
2. ❌ **It doesn't update profiles** → Add profiles table update to webhook handler

**Fastest verification:**
```sql
-- Run this NOW to check
SELECT
  subscription_tier,
  subscription_amount,
  subscription_period_start
FROM profiles
WHERE id = 'your-user-id';

-- If NULL: Webhook doesn't update profiles (needs fix)
-- If has data: Webhook works (problem elsewhere)
```

---

**Last Updated:** December 30, 2025
**Status:** 🔍 AWAITING VERIFICATION
**Next Action:** Backend team check webhook handler code
