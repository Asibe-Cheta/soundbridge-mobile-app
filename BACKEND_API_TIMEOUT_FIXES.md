# Backend API Timeout Fixes - Implementation Guide

**Date:** December 30, 2025  
**Status:** 🔴 **CRITICAL - REQUIRES IMMEDIATE ACTION**  
**Priority:** HIGH - Blocking user subscription display

---

## Executive Summary

The mobile app's subscription and revenue APIs are timing out after 10 seconds due to **multiple sequential database queries** and **fetching entire tables without limits**. This document provides specific fixes for each endpoint.

**Root Causes Identified:**
1. ❌ **N+1 Query Pattern** - Multiple sequential database calls
2. ❌ **Fetching All Rows** - `select('*')` on `audio_tracks` without limit
3. ❌ **No Parallelization** - All queries execute sequentially
4. ❌ **Heavy Aggregations** - RPC functions doing expensive calculations
5. ❌ **No Caching** - Every request hits the database

---

## Critical Issues Found

### Issue #1: `/api/subscription/status` - Fetching ALL Tracks

**Current Code (Line 36-39):**
```typescript
// ❌ BAD: Fetches ALL audio tracks for user (could be thousands)
const { data: tracks, error: tracksError } = await supabase
  .from('audio_tracks')
  .select('*')  // ⚠️ Fetches ALL columns and ALL rows
  .eq('creator_id', user.id);
```

**Problem:**
- If user has 1000+ tracks, this fetches 1000+ rows with all columns
- Each row includes large JSON fields, file metadata, etc.
- Network transfer time alone could be 5-10 seconds
- Then processes all rows in JavaScript (reduce operations)

**Fix:**
```typescript
// ✅ GOOD: Only fetch counts and aggregates, not full rows
const { count: tracksCount, error: tracksError } = await supabase
  .from('audio_tracks')
  .select('*', { count: 'exact', head: true })
  .eq('creator_id', user.id);

// ✅ OR: Use database aggregation
const { data: tracksStats, error: tracksError } = await supabase
  .rpc('get_user_tracks_stats', { p_user_id: user.id });
```

---

### Issue #2: `/api/subscription/status` - Sequential Queries

**Current Code (Lines 14-196):**
```typescript
// ❌ BAD: All queries execute sequentially (one after another)
const { data: profile } = await supabase.from('profiles')...;  // Query 1
const { data: subscription } = await supabase.from('user_subscriptions')...;  // Query 2
const { data: tracks } = await supabase.from('audio_tracks')...;  // Query 3
const { data: events } = await supabase.from('events')...;  // Query 4
const { count: followersCount } = await supabase.from('follows')...;  // Query 5
const { data: revenue } = await supabase.from('creator_revenue')...;  // Query 6
const { data: uploadLimit } = await supabase.rpc('check_upload_limit')...;  // Query 7
const { data: searchLimit } = await supabase.rpc('check_search_limit')...;  // Query 8
const { data: messageLimit } = await supabase.rpc('check_message_limit')...;  // Query 9
```

**Problem:**
- 9 sequential queries = 9 × (network latency + query time)
- If each query takes 500ms, total = 4.5 seconds minimum
- With network latency, easily exceeds 10 seconds

**Fix:**
```typescript
// ✅ GOOD: Execute independent queries in parallel
const [
  { data: profile },
  { data: subscription },
  { count: tracksCount },
  { count: eventsCount },
  { count: followersCount },
  { data: revenue },
  { data: uploadLimit },
  { data: searchLimit },
  { data: messageLimit }
] = await Promise.all([
  supabase.from('profiles').select('...').eq('id', user.id).single(),
  supabase.from('user_subscriptions').select('...').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single(),
  supabase.from('audio_tracks').select('*', { count: 'exact', head: true }).eq('creator_id', user.id),
  supabase.from('events').select('*', { count: 'exact', head: true }).eq('creator_id', user.id),
  supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
  supabase.from('creator_revenue').select('...').eq('user_id', user.id).single(),
  supabase.rpc('check_upload_limit', { p_user_id: user.id }),
  supabase.rpc('check_search_limit', { p_user_id: user.id }),
  supabase.rpc('check_message_limit', { p_user_id: user.id })
]);
```

**Time Saved:** ~4-6 seconds (from 9 sequential to 1 parallel batch)

---

### Issue #3: `/api/subscription/status` - Heavy JavaScript Processing

**Current Code (Lines 64-97):**
```typescript
// ❌ BAD: Processing all tracks in JavaScript
const totalPlays = tracks?.reduce((sum, track) => sum + (track.play_count || 0), 0) || 0;
const totalLikes = tracks?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;
const musicUploads = tracks?.filter(t => t.track_type === 'music').length || 0;
const totalStorageUsed = tracks?.reduce((sum, t) => sum + (t.file_size || 0), 0) || 0;
// ... more processing
```

**Problem:**
- If 1000 tracks, this processes 1000 rows in JavaScript
- Multiple reduce/filter operations
- Could take 1-2 seconds for large datasets

**Fix:**
```typescript
// ✅ GOOD: Use database aggregation (RPC function)
const { data: tracksStats } = await supabase.rpc('get_user_tracks_stats', {
  p_user_id: user.id
});

// Returns: {
//   total_tracks: 100,
//   total_plays: 5000,
//   total_likes: 200,
//   music_uploads: 80,
//   podcast_uploads: 20,
//   total_storage_bytes: 1024000000
// }
```

**Create Database Function:**
```sql
CREATE OR REPLACE FUNCTION get_user_tracks_stats(p_user_id UUID)
RETURNS TABLE (
  total_tracks BIGINT,
  total_plays BIGINT,
  total_likes BIGINT,
  music_uploads BIGINT,
  podcast_uploads BIGINT,
  total_storage_bytes BIGINT,
  last_upload_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tracks,
    COALESCE(SUM(play_count), 0)::BIGINT as total_plays,
    COALESCE(SUM(like_count), 0)::BIGINT as total_likes,
    COUNT(*) FILTER (WHERE track_type IS NULL OR track_type = 'music' OR track_type = 'song')::BIGINT as music_uploads,
    COUNT(*) FILTER (WHERE track_type = 'podcast')::BIGINT as podcast_uploads,
    COALESCE(SUM(file_size), 0)::BIGINT as total_storage_bytes,
    MAX(created_at) as last_upload_at
  FROM audio_tracks
  WHERE creator_id = p_user_id
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Time Saved:** ~1-2 seconds (database aggregation is faster than JavaScript)

---

### Issue #4: `/api/revenue/summary` - Multiple Queries

**Current Code (Lines 60-89):**
```typescript
// ❌ BAD: Sequential queries
const { data: wallet } = await supabase.from('user_wallets')...;  // Query 1
const { data: transactions } = await supabase.from('wallet_transactions')...;  // Query 2
// Then processes transactions in JavaScript
```

**Problem:**
- Two sequential queries
- Processing transactions in JavaScript
- Could be slow if many transactions

**Fix:**
```typescript
// ✅ GOOD: Parallel queries + use database aggregation
const [
  { data: wallet },
  { data: revenueSummary }
] = await Promise.all([
  supabase.from('user_wallets').select('balance, currency').eq('user_id', user.id).single(),
  supabase.rpc('get_creator_revenue_summary', { user_uuid: user.id })
]);
```

**Note:** The RPC function `get_creator_revenue_summary` already exists, but might need optimization.

---

### Issue #5: RPC Functions May Be Slow

**Potential Issue:**
The `get_creator_revenue_summary` RPC function does multiple subqueries:

```sql
-- From database/fix_revenue_schema.sql
SELECT SUM(creator_earnings) FROM tip_analytics WHERE creator_id = user_uuid AND ...
SELECT SUM(creator_earnings) FROM tip_analytics WHERE creator_id = user_uuid AND ...
SELECT SUM(creator_earnings) FROM tip_analytics WHERE creator_id = user_uuid AND ...
```

**Problem:**
- Multiple subqueries on `tip_analytics` table
- If table is large, each subquery could be slow
- No indexes on `creator_id` or `created_at` could cause full table scans

**Fix:**
```sql
-- ✅ Add indexes
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_id ON tip_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_created_at ON tip_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_status ON tip_analytics(status);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_status ON tip_analytics(creator_id, status);

-- ✅ Optimize RPC function to use single query with conditional aggregation
CREATE OR REPLACE FUNCTION get_creator_revenue_summary(user_uuid UUID)
RETURNS TABLE (
  total_earned DECIMAL,
  total_paid_out DECIMAL,
  pending_balance DECIMAL,
  available_balance DECIMAL,
  this_month_earnings DECIMAL,
  last_month_earnings DECIMAL,
  total_tips DECIMAL,
  total_track_sales DECIMAL,
  total_subscriptions DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cr.total_earned, 0) as total_earned,
    COALESCE(cr.total_paid_out, 0) as total_paid_out,
    COALESCE(cr.pending_balance, 0) as pending_balance,
    COALESCE(cr.available_balance, 0) as available_balance,
    -- ✅ Single query with conditional aggregation (faster than multiple subqueries)
    COALESCE(SUM(ta.creator_earnings) FILTER (
      WHERE ta.status = 'completed' 
      AND DATE_TRUNC('month', ta.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as this_month_earnings,
    COALESCE(SUM(ta.creator_earnings) FILTER (
      WHERE ta.status = 'completed' 
      AND DATE_TRUNC('month', ta.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    ), 0) as last_month_earnings,
    COALESCE(SUM(ta.creator_earnings) FILTER (WHERE ta.status = 'completed'), 0) as total_tips,
    0.00 as total_track_sales,
    0.00 as total_subscriptions
  FROM creator_revenue cr
  LEFT JOIN tip_analytics ta ON ta.creator_id = user_uuid
  WHERE cr.user_id = user_uuid
  GROUP BY cr.total_earned, cr.total_paid_out, cr.pending_balance, cr.available_balance;
  
  -- If no revenue record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Optimized Implementation

### Optimized `/api/subscription/status`

**File:** `apps/web/app/api/subscription/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Execute all independent queries in parallel
    const [
      { data: profile },
      { data: subscription },
      { data: tracksStats },
      { count: eventsCount },
      { count: followersCount },
      { data: revenue },
      { data: uploadLimit },
      { data: searchLimit },
      { data: messageLimit }
    ] = await Promise.all([
      // Query 1: Profile subscription data
      supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_period, subscription_start_date, subscription_renewal_date')
        .eq('id', user.id)
        .single(),
      
      // Query 2: Old subscription data (fallback)
      supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      
      // Query 3: Tracks stats (using RPC function - much faster)
      supabase.rpc('get_user_tracks_stats', { p_user_id: user.id }),
      
      // Query 4: Events count (only count, not full rows)
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id),
      
      // Query 5: Followers count (only count, not full rows)
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id),
      
      // Query 6: Revenue data
      supabase
        .from('creator_revenue')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      
      // Query 7-9: Usage limits (parallel RPC calls)
      supabase.rpc('check_upload_limit', { p_user_id: user.id }),
      supabase.rpc('check_search_limit', { p_user_id: user.id }),
      supabase.rpc('check_message_limit', { p_user_id: user.id })
    ]);

    // ✅ Build response from parallel query results
    const finalSubscription = profile?.subscription_tier ? {
      tier: profile.subscription_tier,
      status: profile.subscription_status || 'active',
      billing_cycle: profile.subscription_period || 'monthly',
      subscription_start_date: profile.subscription_start_date || null,
      subscription_renewal_date: profile.subscription_renewal_date || null,
      subscription_ends_at: profile.subscription_renewal_date || null,
      money_back_guarantee_eligible: subscription?.money_back_guarantee_eligible || false,
      refund_count: subscription?.refund_count || 0,
      created_at: profile.subscription_start_date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : (subscription || {
      tier: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      subscription_start_date: null,
      subscription_renewal_date: null,
      subscription_ends_at: null,
      money_back_guarantee_eligible: false,
      refund_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // ✅ Use tracks stats from RPC function (already aggregated)
    const usage = {
      music_uploads: tracksStats?.[0]?.music_uploads || 0,
      podcast_uploads: tracksStats?.[0]?.podcast_uploads || 0,
      event_uploads: eventsCount || 0,
      total_storage_used: tracksStats?.[0]?.total_storage_bytes || 0,
      total_plays: tracksStats?.[0]?.total_plays || 0,
      total_followers: followersCount || 0,
      last_upload_at: tracksStats?.[0]?.last_upload_at || null,
      formatted_storage: formatStorage(tracksStats?.[0]?.total_storage_bytes || 0),
      formatted_plays: (tracksStats?.[0]?.total_plays || 0).toLocaleString(),
      formatted_followers: (followersCount || 0).toLocaleString()
    };

    const defaultRevenue = {
      total_earned: 0,
      total_paid_out: 0,
      pending_balance: 0,
      last_payout_at: null,
      payout_threshold: 50.00
    };

    // Check money-back guarantee
    let withinGuarantee = false;
    if (finalSubscription && ['premium', 'unlimited'].includes(finalSubscription.tier) && finalSubscription.subscription_start_date) {
      const startDate = new Date(finalSubscription.subscription_start_date);
      const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      withinGuarantee = daysSinceStart <= 7 && finalSubscription.money_back_guarantee_eligible;
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ /api/subscription/status completed in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        subscription: finalSubscription,
        usage: usage,
        revenue: revenue || defaultRevenue,
        limits: {
          uploads: uploadLimit || { used: 0, limit: 3, remaining: 3, is_unlimited: false },
          searches: searchLimit || { used: 0, limit: 5, remaining: 5, is_unlimited: false },
          messages: messageLimit || { used: 0, limit: 3, remaining: 3, is_unlimited: false }
        },
        moneyBackGuarantee: {
          eligible: finalSubscription?.money_back_guarantee_eligible || false,
          withinWindow: withinGuarantee,
          daysRemaining: withinGuarantee && finalSubscription?.subscription_start_date
            ? Math.max(0, 7 - Math.floor((Date.now() - new Date(finalSubscription.subscription_start_date).getTime()) / (1000 * 60 * 60 * 24)))
            : 0
        },
        features: {
          unlimitedUploads: finalSubscription.tier === 'unlimited',
          unlimitedSearches: ['premium', 'unlimited'].includes(finalSubscription.tier),
          unlimitedMessages: ['premium', 'unlimited'].includes(finalSubscription.tier),
          advancedAnalytics: ['premium', 'unlimited'].includes(finalSubscription.tier),
          customUsername: ['premium', 'unlimited'].includes(finalSubscription.tier),
          prioritySupport: ['premium', 'unlimited'].includes(finalSubscription.tier),
          revenueSharing: ['premium', 'unlimited'].includes(finalSubscription.tier),
          featuredPlacement: ['premium', 'unlimited'].includes(finalSubscription.tier),
          verifiedBadge: ['premium', 'unlimited'].includes(finalSubscription.tier)
        }
      }
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
```

**Expected Performance:**
- **Before:** 10+ seconds (timeout)
- **After:** <1 second (with parallel queries and RPC functions)

---

### Optimized `/api/revenue/summary`

**File:** `apps/web/app/api/revenue/summary/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // ✅ Execute queries in parallel
    const [
      { data: wallet },
      { data: revenueSummary }
    ] = await Promise.all([
      supabase
        .from('user_wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .single(),
      supabase.rpc('get_creator_revenue_summary', { user_uuid: user.id })
    ]);

    // Handle wallet error (not critical)
    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error fetching wallet:', walletError);
    }

    // Handle revenue summary error
    if (revenueSummaryError) {
      console.error('Error fetching revenue summary:', revenueSummaryError);
      return NextResponse.json(
        { error: 'Failed to fetch revenue summary' },
        { status: 500, headers: corsHeaders }
      );
    }

    const summary = revenueSummary?.[0] || {
      total_earned: 0,
      total_paid_out: 0,
      pending_balance: 0,
      available_balance: 0,
      this_month_earnings: 0,
      last_month_earnings: 0,
      total_tips: 0,
      total_track_sales: 0,
      total_subscriptions: 0
    };

    const responseTime = Date.now() - startTime;
    console.log(`✅ /api/revenue/summary completed in ${responseTime}ms`);

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            total_earnings: summary.total_earned || 0,
            available_balance: summary.available_balance || wallet?.balance || 0,
            pending_balance: summary.pending_balance || 0,
            total_tips_received: summary.total_tips || 0,
            total_payouts: summary.total_paid_out || 0,
            currency: wallet?.currency || 'USD',
            last_payout_date: summary.last_payout_date || null,
            next_payout_date: summary.next_payout_date || null
          },
          this_month_earnings: summary.this_month_earnings || 0,
          last_month_earnings: summary.last_month_earnings || 0
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error fetching revenue summary:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
```

**Expected Performance:**
- **Before:** 10+ seconds (timeout)
- **After:** <1 second (with parallel queries and optimized RPC)

---

## Database Optimizations Required

### 1. Create `get_user_tracks_stats` RPC Function

**File:** `database/add_user_tracks_stats_function.sql`

```sql
-- Create function to get user tracks statistics (replaces fetching all tracks)
CREATE OR REPLACE FUNCTION get_user_tracks_stats(p_user_id UUID)
RETURNS TABLE (
  total_tracks BIGINT,
  total_plays BIGINT,
  total_likes BIGINT,
  music_uploads BIGINT,
  podcast_uploads BIGINT,
  total_storage_bytes BIGINT,
  last_upload_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tracks,
    COALESCE(SUM(play_count), 0)::BIGINT as total_plays,
    COALESCE(SUM(like_count), 0)::BIGINT as total_likes,
    COUNT(*) FILTER (WHERE track_type IS NULL OR track_type = 'music' OR track_type = 'song')::BIGINT as music_uploads,
    COUNT(*) FILTER (WHERE track_type = 'podcast')::BIGINT as podcast_uploads,
    COALESCE(SUM(file_size), 0)::BIGINT as total_storage_bytes,
    MAX(created_at) as last_upload_at
  FROM audio_tracks
  WHERE creator_id = p_user_id
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_tracks_stats(UUID) TO authenticated;
```

### 2. Add Database Indexes

**File:** `database/add_performance_indexes.sql`

```sql
-- Indexes for subscription/status endpoint
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_id ON audio_tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_creator_deleted ON audio_tracks(creator_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_creator_revenue_user_id ON creator_revenue(user_id);

-- Indexes for revenue/summary endpoint
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_id ON tip_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_created_at ON tip_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_status ON tip_analytics(status);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_status ON tip_analytics(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_tip_analytics_creator_date ON tip_analytics(creator_id, created_at);
```

---

## Testing Checklist

After implementing fixes:

- [ ] Test `/api/subscription/status` returns in <2s
- [ ] Test `/api/revenue/summary` returns in <2s
- [ ] Test `/api/user/usage-statistics` returns in <2s
- [ ] Test `/api/user/usage-limits` returns in <2s
- [ ] Verify subscription tier displays correctly
- [ ] Verify revenue data displays correctly
- [ ] Test with users who have 1000+ tracks
- [ ] Test with users who have many transactions
- [ ] Check Vercel function logs for response times
- [ ] Monitor for any errors

---

## Performance Monitoring

Add logging to track response times:

```typescript
const startTime = Date.now();
// ... API logic ...
const responseTime = Date.now() - startTime;
console.log(`✅ ${request.url} completed in ${responseTime}ms`);

if (responseTime > 2000) {
  console.warn(`⚠️ SLOW REQUEST: ${request.url} took ${responseTime}ms`);
}
```

---

## Summary

**Critical Fixes:**
1. ✅ Use `Promise.all()` for parallel queries
2. ✅ Replace `select('*')` with counts or RPC functions
3. ✅ Create `get_user_tracks_stats` RPC function
4. ✅ Add database indexes
5. ✅ Optimize `get_creator_revenue_summary` RPC function

**Expected Results:**
- **Before:** 10+ seconds (timeout)
- **After:** <1 second

**Priority:** 🔴 **CRITICAL** - Implement immediately

---

**Last Updated:** December 30, 2025

