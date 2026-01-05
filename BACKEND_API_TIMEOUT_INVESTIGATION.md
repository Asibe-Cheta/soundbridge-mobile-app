# Backend API Timeout Investigation

**Date:** December 30, 2025
**Status:** 🔴 **REQUIRES BACKEND TEAM ATTENTION**
**Priority:** HIGH - Blocking user subscription display

---

## Problem

The mobile app's subscription and revenue APIs are timing out after 10 seconds, causing users to see incorrect subscription information:

```
⏱️ Subscription status request timed out - checking Supabase fallback
❌ Error fetching revenue data: Error: Request timeout
```

**Impact:**
- Users see "Free Plan" even when subscribed to Premium/Unlimited
- Revenue/earnings show $0.00
- Payout data unavailable
- Poor user experience with long loading times

---

## Affected API Endpoints

All of the following endpoints are timing out (>10 seconds):

### 1. `/api/subscription/status` 🔴 CRITICAL
- **Called from:** `SubscriptionService.ts` line 206
- **Purpose:** Fetch user's subscription tier, status, billing info
- **Expected response time:** <2 seconds
- **Current behavior:** Times out after 10 seconds
- **Fallback:** Supabase direct query (now working after table name fix)

### 2. `/api/revenue/summary` 🔴 HIGH PRIORITY
- **Called from:** `SubscriptionService.ts` line 501
- **Purpose:** Fetch creator revenue summary (tips, earnings, payouts)
- **Expected response time:** <2 seconds
- **Current behavior:** Times out after 10 seconds
- **Fallback:** None - shows $0.00 to user

### 3. `/api/user/usage-statistics` 🟡 MEDIUM PRIORITY
- **Called from:** `SubscriptionService.ts` line 463
- **Purpose:** Fetch usage stats (uploads, storage, bandwidth)
- **Expected response time:** <2 seconds
- **Current behavior:** Network errors/timeouts

### 4. `/api/user/usage-limits` 🟡 MEDIUM PRIORITY
- **Called from:** `SubscriptionService.ts` line 332
- **Purpose:** Fetch usage limits based on subscription tier
- **Expected response time:** <2 seconds
- **Current behavior:** May be timing out

---

## Mobile App Request Details

### Base URLs
- **Development:** `http://192.168.1.122:3000`
- **Production:** `https://soundbridge.live`

### Request Configuration
```typescript
// From SubscriptionService.ts:143-180
private async makeRequest(url: string, session: Session, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // ⏱️ 10 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(session), // Includes Authorization: Bearer <token>
        ...options.headers,
      },
      signal: controller.signal,
    });
    // ... error handling
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.');
    }
    throw error;
  }
}
```

### Authentication Headers
```typescript
// From SubscriptionService.ts
private getAuthHeaders(session: Session) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}
```

---

## Expected API Responses

### `/api/subscription/status`

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "tier": "premium" | "unlimited" | "free",
      "status": "active" | "cancelled" | "past_due" | "expired",
      "stripe_subscription_id": "sub_xxxxx",
      "amount": 6.99,
      "currency": "GBP",
      "billing_cycle": "monthly" | "yearly",
      "current_period_start": "2025-12-30T00:00:00.000Z",
      "current_period_end": "2026-01-30T00:00:00.000Z",
      "subscription_start_date": "2025-12-30T00:00:00.000Z",
      "subscription_renewal_date": "2026-01-30T00:00:00.000Z",
      "subscription_ends_at": null,
      "cancel_at_period_end": false,
      "money_back_guarantee_eligible": true,
      "money_back_guarantee_end_date": "2026-01-06T00:00:00.000Z",
      "refund_count": 0
    },
    "features": {
      "unlimitedUploads": true,
      "unlimitedSearches": true,
      "unlimitedMessages": true,
      "advancedAnalytics": true,
      "customBranding": false,
      "prioritySupport": true,
      "revenueSharing": true,
      "whiteLabel": false
    },
    "limits": {
      "uploads": {
        "used": 5,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true,
        "period": "monthly"
      },
      "searches": {
        "used": 10,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true
      },
      "messages": {
        "used": 20,
        "limit": -1,
        "remaining": -1,
        "is_unlimited": true
      }
    },
    "moneyBackGuarantee": {
      "eligible": true,
      "withinWindow": true,
      "daysRemaining": 7
    }
  }
}
```

### `/api/revenue/summary`

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_earnings": 150.50,
      "available_balance": 100.25,
      "pending_balance": 50.25,
      "total_tips_received": 200.75,
      "total_payouts": 50.00,
      "currency": "USD",
      "last_payout_date": "2025-12-15T00:00:00.000Z",
      "next_payout_date": "2025-12-30T00:00:00.000Z"
    },
    "recent_tips": [
      {
        "id": "tip_xxxxx",
        "amount": 5.00,
        "currency": "USD",
        "tipper_name": "John Doe",
        "date": "2025-12-29T10:30:00.000Z",
        "track_title": "My Song",
        "status": "completed"
      }
    ],
    "payout_history": [
      {
        "id": "payout_xxxxx",
        "amount": 50.00,
        "currency": "USD",
        "status": "completed",
        "date": "2025-12-15T00:00:00.000Z",
        "method": "stripe"
      }
    ]
  }
}
```

---

## Likely Causes of Timeout

### 1. Slow Database Queries 🔴 MOST LIKELY

The backend is probably making unoptimized database queries:

```sql
-- ❌ BAD: Full table scan without indexes
SELECT * FROM subscriptions
WHERE user_id = 'xxx'
AND status = 'active';

-- ❌ BAD: Multiple sequential queries instead of JOINs
SELECT * FROM subscriptions WHERE user_id = 'xxx';
SELECT * FROM subscription_items WHERE subscription_id = 'xxx';
SELECT * FROM prices WHERE id = 'xxx';

-- ❌ BAD: No indexes on frequently queried columns
-- Missing indexes on: user_id, status, stripe_subscription_id
```

**Recommendations:**
- Add indexes on `user_id`, `status`, `stripe_subscription_id` columns
- Use JOINs instead of multiple sequential queries
- Add `EXPLAIN ANALYZE` to identify slow queries
- Consider caching subscription data (Redis) with 5-minute TTL

### 2. External API Calls (Stripe/RevenueCat) 🟡 POSSIBLE

The backend might be making synchronous calls to Stripe/RevenueCat on every request:

```javascript
// ❌ BAD: Synchronous external API call on every request
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
```

**Recommendations:**
- Cache Stripe/RevenueCat data in database
- Use webhooks to keep data in sync (don't fetch on every request)
- Only fetch from Stripe when cache is stale (>5 minutes old)

### 3. Missing Connection Pooling 🟡 POSSIBLE

Backend might be creating new database connections for each request:

**Recommendations:**
- Use connection pooling (pg-pool, Prisma, etc.)
- Set pool size appropriately (min: 5, max: 20)
- Reuse connections across requests

### 4. No Response Timeout Handling 🟡 POSSIBLE

Backend might not have timeout limits on database/external API calls:

**Recommendations:**
- Add 5-second timeout to all database queries
- Add 3-second timeout to external API calls
- Return cached/stale data if timeouts occur

### 5. Heavy Computation in Request Path 🟢 LESS LIKELY

Backend might be doing heavy calculations during the request:

**Recommendations:**
- Move heavy calculations to background jobs
- Pre-calculate usage stats and store in database
- Use materialized views for complex aggregations

---

## How to Debug (Backend Team)

### Step 1: Add Request Logging

Add logging to measure response times:

```javascript
// Example for Express.js
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`);
    if (duration > 2000) {
      console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});
```

### Step 2: Profile Database Queries

For each endpoint, log query execution times:

```javascript
// PostgreSQL example
const start = Date.now();
const result = await db.query('SELECT ...');
const duration = Date.now() - start;
if (duration > 100) {
  console.warn(`⚠️ SLOW QUERY (${duration}ms):`, query);
}
```

### Step 3: Check for N+1 Queries

Use database query logging to detect N+1 patterns:

```sql
-- Enable PostgreSQL query logging
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries >100ms
SELECT pg_reload_conf();

-- Check logs for repeated similar queries
```

### Step 4: Add Performance Monitoring

Use tools like:
- **New Relic** - Application performance monitoring
- **Datadog** - Infrastructure and APM
- **Sentry** - Error tracking with performance data
- **AWS CloudWatch** - If hosted on AWS

### Step 5: Test Specific User

Test the API with the user who reported the issue:

**User ID:** (Get from user's profile - see [FIND_YOUR_PROFILE.sql](FIND_YOUR_PROFILE.sql))

```bash
# Test subscription status endpoint
curl -X GET \
  https://soundbridge.live/api/subscription/status \
  -H "Authorization: Bearer <user_access_token>" \
  -H "Content-Type: application/json" \
  -w "\nTime: %{time_total}s\n"

# Expected: <2 seconds
# Current: >10 seconds (timeout)
```

---

## Temporary Workaround (Mobile App)

We've implemented a Supabase fallback that works when the API times out:

1. **Try RevenueCat** (if mobile IAP user)
2. **Try Backend API** (`/api/subscription/status`)
3. **✅ Fallback to Supabase** (direct query to `profiles` table)
4. **Final Fallback:** Return free tier

**Files Modified:**
- [SubscriptionService.ts](src/services/SubscriptionService.ts:255-304) - Enhanced Supabase fallback

**Supabase Fallback Query:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier, subscription_status, subscription_amount, subscription_currency, subscription_period_start, subscription_period_end')
  .eq('id', session.user.id)
  .single();
```

**This works for subscription display, but does NOT work for:**
- Revenue/earnings data
- Payout history
- Usage statistics
- Billing history

---

## Required Backend Fixes

### Priority 1: `/api/subscription/status` 🔴 CRITICAL

**Goal:** Reduce response time from >10s to <1s

**Checklist:**
- [ ] Add database indexes on `subscriptions.user_id`
- [ ] Cache Stripe subscription data in database
- [ ] Use Stripe webhooks to keep data in sync
- [ ] Add query timeout (5 seconds max)
- [ ] Profile and optimize slow queries
- [ ] Test with affected user

### Priority 2: `/api/revenue/summary` 🔴 HIGH

**Goal:** Reduce response time from >10s to <2s

**Checklist:**
- [ ] Add database indexes on `tips.creator_id`, `payouts.creator_id`
- [ ] Pre-calculate revenue summaries (background job)
- [ ] Cache revenue data with 5-minute TTL
- [ ] Add query timeout (5 seconds max)
- [ ] Profile and optimize slow aggregation queries
- [ ] Test with affected user

### Priority 3: `/api/user/usage-statistics` 🟡 MEDIUM

**Goal:** Reduce response time to <2s

**Checklist:**
- [ ] Pre-calculate usage stats (background job)
- [ ] Store in materialized view or cache table
- [ ] Add query timeout (5 seconds max)
- [ ] Test with affected user

---

## Testing Checklist

After backend fixes are deployed:

- [ ] Test `/api/subscription/status` returns in <2s
- [ ] Verify subscription tier displays correctly (Premium, not Free)
- [ ] Verify subscription amount displays correctly (£6.99/month, not £0.00)
- [ ] Verify subscription period displays correctly
- [ ] Test `/api/revenue/summary` returns in <2s
- [ ] Verify revenue data displays (not $0.00)
- [ ] Verify payout history displays
- [ ] Test with both Stripe and IAP users
- [ ] Test with free tier users (should not timeout)

---

## Related Files

### Mobile App
- [SubscriptionService.ts](src/services/SubscriptionService.ts) - API calls and fallback logic
- [BillingScreen.tsx](src/screens/BillingScreen.tsx) - Displays subscription info
- [UPDATE_SUBSCRIPTION_DATA.sql](UPDATE_SUBSCRIPTION_DATA.sql) - Manual data fix for user
- [SUBSCRIPTION_TABLE_NAME_FIX.md](SUBSCRIPTION_TABLE_NAME_FIX.md) - Previous fix

### Backend (Not in this repo)
- Endpoint: `https://soundbridge.live/api/subscription/status`
- Endpoint: `https://soundbridge.live/api/revenue/summary`
- Endpoint: `https://soundbridge.live/api/user/usage-statistics`
- Endpoint: `https://soundbridge.live/api/user/usage-limits`

---

## Summary

**Problem:** Backend API endpoints timing out after 10 seconds

**Root Cause:** Likely slow database queries without proper indexes/caching

**Impact:** Users see incorrect subscription info, $0.00 revenue/payouts

**Temporary Fix:** Supabase fallback for subscription tier (works for basic display)

**Required:** Backend team needs to optimize API endpoints and add proper caching

**Priority:** HIGH - Directly impacts user experience and trust

---

## Contact

If you're on the backend team and need more info:
- Check Vercel/server logs for slow queries
- Look for queries taking >2 seconds
- Check if Stripe API calls are blocking requests
- Verify database indexes exist on key columns

**Last Updated:** December 30, 2025
