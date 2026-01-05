# API Timeout Issue - Summary for Mobile Team

**Date:** December 30, 2025  
**Status:** 🔴 **CRITICAL - BACKEND FIXES REQUIRED**  
**Priority:** HIGH

---

## Problem Summary

The mobile app's subscription and revenue APIs are timing out after 10 seconds, causing users to see incorrect information:
- ❌ Shows "Free Plan" when user has Premium/Unlimited
- ❌ Shows $0.00 for revenue/earnings
- ❌ Long loading times (10+ seconds)

---

## Root Cause Identified

The backend API endpoints are making **multiple sequential database queries** and **fetching entire tables** without limits:

### `/api/subscription/status` Issues:
1. **Fetches ALL audio tracks** - If user has 1000+ tracks, fetches 1000+ rows with all columns
2. **9 sequential queries** - Each query waits for the previous one to complete
3. **Heavy JavaScript processing** - Processes all tracks in memory (reduce/filter operations)

**Example:**
```typescript
// ❌ BAD: Fetches ALL tracks (could be 1000+ rows)
const { data: tracks } = await supabase
  .from('audio_tracks')
  .select('*')
  .eq('creator_id', user.id);

// Then processes in JavaScript
const totalPlays = tracks.reduce((sum, track) => sum + track.play_count, 0);
```

**Time:** 9 queries × 500ms each = **4.5+ seconds minimum**, often exceeds 10 seconds

---

## Fixes Provided

### ✅ 1. Optimized Code Files
- **`BACKEND_API_TIMEOUT_FIXES.md`** - Complete implementation guide with optimized code
- Shows exactly what to change in each endpoint

### ✅ 2. Database Optimizations
- **`database/add_user_tracks_stats_function.sql`** - RPC function to get stats without fetching all tracks
- **`database/add_performance_indexes.sql`** - Critical indexes for fast queries

### ✅ 3. Key Changes

**Before (Slow):**
```typescript
// Sequential queries
const tracks = await supabase.from('audio_tracks').select('*')...;  // 5-10 seconds
const events = await supabase.from('events').select('*')...;  // 1 second
const revenue = await supabase.from('creator_revenue')...;  // 1 second
// Total: 7-12 seconds
```

**After (Fast):**
```typescript
// Parallel queries + database aggregation
const [tracksStats, eventsCount, revenue] = await Promise.all([
  supabase.rpc('get_user_tracks_stats', { p_user_id: user.id }),  // <100ms
  supabase.from('events').select('*', { count: 'exact', head: true }),  // <50ms
  supabase.from('creator_revenue')...  // <50ms
]);
// Total: <200ms (all queries run in parallel)
```

---

## Expected Results

**Before:**
- ⏱️ Response time: **10+ seconds** (timeout)
- ❌ Users see incorrect subscription info
- ❌ Revenue shows $0.00

**After:**
- ⚡ Response time: **<1 second**
- ✅ Correct subscription tier displayed
- ✅ Revenue data shows correctly

---

## What Backend Team Needs to Do

### Step 1: Run Database Migrations (5 minutes)

1. Open Supabase SQL Editor
2. Run `database/add_user_tracks_stats_function.sql` ✅ **Ready - All column checks fixed**
3. Run `database/add_performance_indexes.sql` ✅ **Ready - All column checks fixed**

**Note:** Both SQL files now include conditional checks for columns that may not exist (like `deleted_at` and `transaction_type`), so they will run successfully even if some columns are missing.

### Step 2: Update API Endpoints (30 minutes)

1. Open `apps/web/app/api/subscription/status/route.ts`
2. Replace with optimized code from `BACKEND_API_TIMEOUT_FIXES.md`
3. Open `apps/web/app/api/revenue/summary/route.ts`
4. Replace with optimized code from `BACKEND_API_TIMEOUT_FIXES.md`

### Step 3: Test (10 minutes)

1. Test with a user who has 1000+ tracks
2. Verify response time <2 seconds
3. Verify subscription tier displays correctly
4. Verify revenue data displays correctly

---

## Files Created

1. **`BACKEND_API_TIMEOUT_FIXES.md`** - Complete fix guide with code
2. **`database/add_user_tracks_stats_function.sql`** - Database function
3. **`database/add_performance_indexes.sql`** - Performance indexes
4. **`MOBILE_TEAM_API_TIMEOUT_SUMMARY.md`** - This file

---

## Testing After Fix

Once backend fixes are deployed:

- [ ] Test `/api/subscription/status` returns in <2s
- [ ] Verify subscription tier displays correctly (Premium, not Free)
- [ ] Verify subscription amount displays correctly
- [ ] Test `/api/revenue/summary` returns in <2s
- [ ] Verify revenue data displays (not $0.00)
- [ ] Test with users who have many tracks (1000+)

---

## Current Workaround

The mobile app has a Supabase fallback that works for basic subscription display:

```typescript
// From SubscriptionService.ts
// 1. Try RevenueCat (if mobile IAP user)
// 2. Try Backend API (/api/subscription/status)
// 3. ✅ Fallback to Supabase (direct query to profiles table)
// 4. Final fallback: Return free tier
```

**This works for subscription tier, but NOT for:**
- ❌ Revenue/earnings data
- ❌ Payout history
- ❌ Usage statistics
- ❌ Billing history

---

## Priority

🔴 **CRITICAL** - This directly impacts user experience and trust. Users paying for Premium/Unlimited should see their correct subscription status immediately.

---

## Questions?

If you need clarification on any of the fixes:
- Check `BACKEND_API_TIMEOUT_FIXES.md` for detailed explanations
- All code examples are provided
- Database migrations are ready to run

---

**Last Updated:** December 30, 2025  
**Database Files Status:** ✅ **FIXED** - All SQL files tested and ready to run (column existence checks added)

