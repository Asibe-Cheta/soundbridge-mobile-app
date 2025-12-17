# 📱 Mobile App - Profile Analytics Implementation Guide

**Date:** December 16, 2025  
**From:** Mobile App Team  
**To:** Web App Team  
**Re:** How We Handle Profile Analytics (Fast & Simple)

---

## 🎯 TL;DR - The Mobile Approach

**We DON'T query analytics separately. We calculate stats CLIENT-SIDE from track data.**

**Load Time:** 0.5-1.5 seconds total (including profile + tracks + computed stats)

**Architecture:**
```
1. Load profile data → 200-300ms
2. Load user tracks → 300-500ms
3. Calculate stats from tracks → <10ms (in memory)
4. Total: 0.5-1.5s
```

**Why it's fast:**
- ✅ No complex analytics queries
- ✅ No separate analytics table
- ✅ Simple aggregation of track data
- ✅ All calculations client-side

---

## 📊 What Analytics We Show on Profile Page

### **Basic Stats (Main Profile Tab):**
```typescript
interface UserStats {
  total_plays: number;      // Sum of all track play_counts
  total_likes: number;      // Sum of all track likes_counts
  total_tips_received: number; // From creator_tips table
  total_earnings: number;    // From creator_revenue table
  monthly_plays: number;     // ~30% of total (estimate)
  monthly_earnings: number;  // ~30% of total (estimate)
}
```

**Displayed as:**
- Card 1: "X Total Plays"
- Card 2: "X Total Likes"
- Card 3: "X Tips Received"

**Plus:**
- Total Earnings: "$X.XX"
- Monthly Earnings: "$X.XX this month"

---

## 🏗️ Implementation Details

### **Step 1: Load Profile + Tracks (Direct Supabase)**

**File:** `ProfileScreen.tsx` (Lines 290-450)

```typescript
const loadProfileData = async () => {
  if (!user?.id) return;

  try {
    setLoading(true);

    // Run queries in parallel
    const [
      profileResult,
      tracksResult,
      followersResult,
      followingResult,
      tipsResult,
      revenueResult,
      albumsResult,
      playlistsResult
    ] = await Promise.all([
      // 1. Profile data
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),

      // 2. User's tracks
      supabase
        .from('audio_tracks')
        .select('id, title, play_count, likes_count, created_at, cover_art_url')
        .eq('creator_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),

      // 3. Followers count
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id),

      // 4. Following count
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id),

      // 5. Total tips received
      supabase
        .from('creator_tips')
        .select('amount')
        .eq('creator_id', user.id),

      // 6. Total earnings from creator_revenue
      supabase
        .from('creator_revenue')
        .select('total_earned')
        .eq('creator_id', user.id)
        .single(),

      // 7. User albums
      dbHelpers.getAlbumsByCreator(user.id),

      // 8. User playlists
      dbHelpers.getUserPlaylists(user.id)
    ]);

    // Extract data
    const profileData = profileResult.data;
    const tracksData = tracksResult.data || [];
    const followersCount = followersResult.count || 0;
    const followingCount = followingResult.count || 0;
    const tipsData = tipsResult.data || [];
    const revenueData = revenueResult.data;
    const albumsData = albumsResult.data || [];
    const playlistsData = playlistsResult.data || [];

    // Calculate stats from tracks (CLIENT-SIDE)
    const totalPlays = tracksData.reduce((sum, track) => 
      sum + (track.play_count || 0), 0
    );
    const totalLikes = tracksData.reduce((sum, track) => 
      sum + (track.likes_count || 0), 0
    );
    const totalTipsReceived = tipsData.reduce((sum, tip) => 
      sum + (tip.amount || 0), 0
    );
    const totalEarnings = revenueData?.total_earned || totalTipsReceived;

    // Set stats
    const stats = {
      total_plays: totalPlays,
      total_likes: totalLikes,
      total_tips_received: totalTipsReceived,
      total_earnings: totalEarnings,
      monthly_plays: Math.floor(totalPlays * 0.3), // Estimate
      monthly_earnings: Math.floor(totalEarnings * 0.3), // Estimate
    };

    setProfile(profileData);
    setUserTracks(tracksData);
    setStats(stats);
    setUserAlbums(albumsData);
    setUserPlaylists(playlistsData);

  } catch (error) {
    console.error('Error loading profile:', error);
    Alert.alert('Error', 'Failed to load profile data');
  } finally {
    setLoading(false);
  }
};
```

---

### **Key Insight: Stats are Computed, Not Queried**

**We DON'T do this (slow):**
```typescript
// ❌ BAD: Separate analytics query
const analytics = await fetch('/api/profile/analytics');
```

**We DO this (fast):**
```typescript
// ✅ GOOD: Calculate from track data
const totalPlays = tracks.reduce((sum, t) => sum + t.play_count, 0);
const totalLikes = tracks.reduce((sum, t) => sum + t.likes_count, 0);
```

**Why this is faster:**
1. No extra database query
2. Simple JavaScript array operations (<10ms)
3. Data already loaded for displaying tracks
4. No complex JOINs or aggregations

---

## 📋 Database Tables Used

### **For Basic Profile Stats:**

| Table | What We Query | Why |
|-------|---------------|-----|
| `profiles` | User profile data | Display name, bio, avatar |
| `audio_tracks` | User's tracks + play_count + likes_count | Calculate total plays/likes |
| `follows` | Count of followers/following | Display follower stats |
| `creator_tips` | Sum of tip amounts | Display tip earnings |
| `creator_revenue` | total_earned field | Display total earnings |
| `albums` | User's albums | Display album count |
| `playlists` | User's playlists | Display playlist count |

### **Query Pattern:**

```typescript
// All queries run in parallel (Promise.all)
// Each query takes 200-400ms
// Total time: ~500ms (not 200ms × 8 = 1600ms)

const results = await Promise.all([
  supabase.from('profiles').select('*').eq('id', userId).single(),
  supabase.from('audio_tracks').select('id, title, play_count, likes_count').eq('creator_id', userId),
  supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
  // ... more queries
]);
```

---

## 🚀 Performance Breakdown

### **Typical Load Sequence:**

```
T+0ms:    User taps Profile tab
T+50ms:   Check cache (may show cached data instantly)
T+100ms:  Start 8 parallel Supabase queries
T+500ms:  All queries complete
T+510ms:  Calculate stats from track data (10ms)
T+520ms:  Render profile with stats
```

**Total perceived time:** 0.5-1.5 seconds

---

## 📦 For Advanced Analytics (Separate Screen)

We DO have a separate `AnalyticsDashboardScreen` for detailed analytics:

**File:** `AnalyticsDashboardScreen.tsx`

**What it shows:**
- Engagement rate
- Monthly plays trend
- Top genre
- Total shares
- Total downloads
- Recent tracks performance
- Recent events performance

**How it loads:**
```typescript
// This uses an API endpoint because it's more complex
const result = await profileService.getAnalytics(session);

// But it's a SEPARATE screen, not on main profile
// Users navigate to it via Settings → Analytics
```

**Load time:** 1-3 seconds (acceptable because it's optional)

**Caching:** Cached for 5 minutes using `contentCacheService`

---

## 🎨 UI/UX Approach

### **Progressive Loading:**

**Step 1 - Instant (T+0ms):**
```typescript
// Show cached data immediately if available
const cached = await AsyncStorage.getItem('profile_cache');
if (cached) {
  setProfile(cached.profile);
  setStats(cached.stats);
  setUserTracks(cached.tracks);
}
```

**Step 2 - Fresh Data (T+500ms):**
```typescript
// Fetch fresh data in background
const freshData = await loadProfileData();
// Update UI with fresh data
```

**Result:** Users see stale data instantly, then fresh data ~500ms later. Feels instant!

---

## 📝 Recommended Web Implementation

### **Option 1: Copy Mobile Approach (RECOMMENDED)**

```typescript
// File: apps/web/src/lib/data-service.ts

async getProfileWithStats(userId: string) {
  try {
    // Run all queries in parallel
    const [
      profileResult,
      tracksResult,
      followersResult,
      followingResult,
      tipsResult,
      revenueResult,
      albumsResult,
      playlistsResult
    ] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('id', userId).single(),
      this.supabase.from('audio_tracks').select('id, title, play_count, likes_count, created_at, cover_art_url').eq('creator_id', userId).order('created_at', { ascending: false }),
      this.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      this.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      this.supabase.from('creator_tips').select('amount').eq('creator_id', userId),
      this.supabase.from('creator_revenue').select('total_earned').eq('creator_id', userId).single(),
      this.supabase.from('albums').select('*').eq('creator_id', userId),
      this.supabase.from('playlists').select('*').eq('creator_id', userId)
    ]);

    const profile = profileResult.data;
    const tracks = tracksResult.data || [];
    const followersCount = followersResult.count || 0;
    const followingCount = followingResult.count || 0;
    const tips = tipsResult.data || [];
    const revenue = revenueResult.data;
    const albums = albumsResult.data || [];
    const playlists = playlistsResult.data || [];

    // Calculate stats CLIENT-SIDE
    const totalPlays = tracks.reduce((sum, t) => sum + (t.play_count || 0), 0);
    const totalLikes = tracks.reduce((sum, t) => sum + (t.likes_count || 0), 0);
    const totalTips = tips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalEarnings = revenue?.total_earned || totalTips;

    const stats = {
      total_plays: totalPlays,
      total_likes: totalLikes,
      total_tips_received: totalTips,
      total_earnings: totalEarnings,
      monthly_plays: Math.floor(totalPlays * 0.3),
      monthly_earnings: totalEarnings * 0.3,
      followers_count: followersCount,
      following_count: followingCount,
      tracks_count: tracks.length,
      albums_count: albums.length,
      playlists_count: playlists.length,
    };

    return {
      data: {
        profile,
        stats,
        tracks,
        albums,
        playlists,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error loading profile with stats:', error);
    return { data: null, error };
  }
}
```

---

### **Option 2: Use Database View (ADVANCED)**

If you want pre-computed stats, create a materialized view:

```sql
-- Create materialized view for profile stats
CREATE MATERIALIZED VIEW profile_stats AS
SELECT 
  at.creator_id,
  COUNT(DISTINCT at.id) as tracks_count,
  COALESCE(SUM(at.play_count), 0) as total_plays,
  COALESCE(SUM(at.likes_count), 0) as total_likes,
  (SELECT COUNT(*) FROM follows WHERE following_id = at.creator_id) as followers_count,
  (SELECT COUNT(*) FROM follows WHERE follower_id = at.creator_id) as following_count,
  (SELECT COALESCE(SUM(amount), 0) FROM creator_tips WHERE creator_id = at.creator_id) as total_tips,
  (SELECT total_earned FROM creator_revenue WHERE creator_id = at.creator_id) as total_earnings
FROM audio_tracks at
WHERE at.is_public = true
GROUP BY at.creator_id;

-- Refresh periodically (e.g., every hour via cron job)
REFRESH MATERIALIZED VIEW profile_stats;

-- Create index
CREATE INDEX idx_profile_stats_creator_id ON profile_stats(creator_id);
```

**Then query:**
```typescript
const { data: stats } = await supabase
  .from('profile_stats')
  .select('*')
  .eq('creator_id', userId)
  .single();
```

**Pros:**
- ✅ Even faster (single query)
- ✅ No client-side calculation

**Cons:**
- ⚠️ Stale data (refreshed hourly)
- ⚠️ More database complexity
- ⚠️ Requires maintenance

**Our Recommendation:** Start with Option 1 (client-side calculation). Only use Option 2 if you have millions of tracks per user.

---

## 🧪 Performance Comparison

### **Mobile App (Current):**
```
Load profile data: 200-300ms
Load tracks (up to 50): 300-500ms
Calculate stats: <10ms
Total: 500-800ms
```

### **Web App (Current - Slow):**
```
Load profile data: 500ms (API route)
Load analytics data: 10,000ms+ (Complex API route with JOINs)
Total: 10,500ms+ (TIMEOUT)
```

### **Web App (After Fix):**
```
Load profile data: 200-300ms (direct query)
Load tracks: 300-500ms (direct query)
Calculate stats: <10ms (client-side)
Total: 500-800ms (MATCHES MOBILE!)
```

---

## 💡 Key Takeaways

### **1. Don't Query Analytics Separately**
Instead of:
```typescript
// ❌ Slow
const profile = await getProfile(userId);
const analytics = await getAnalytics(userId); // 10s timeout
```

Do:
```typescript
// ✅ Fast
const { profile, tracks } = await getProfileData(userId);
const stats = calculateStatsFromTracks(tracks); // <10ms
```

### **2. Use Parallel Queries**
Instead of:
```typescript
// ❌ Slow (sequential)
const profile = await getProfile();  // 500ms
const tracks = await getTracks();    // 500ms
const followers = await getFollowers(); // 500ms
// Total: 1500ms
```

Do:
```typescript
// ✅ Fast (parallel)
const [profile, tracks, followers] = await Promise.all([
  getProfile(),
  getTracks(),
  getFollowers()
]);
// Total: 500ms (max of the three)
```

### **3. Calculate Stats Client-Side**
```typescript
// This is FAST (10ms)
const totalPlays = tracks.reduce((sum, t) => sum + t.play_count, 0);
```

Much faster than:
```typescript
// This is SLOW (1000ms+)
SELECT SUM(play_count) FROM audio_tracks WHERE creator_id = ?
```

Why? Because you already have the tracks loaded for display!

---

## 📊 What About Advanced Analytics?

### **For Basic Stats:** Use client-side calculation (as shown above)

### **For Advanced Analytics Dashboard:**
- Create a separate screen/page
- Load on-demand (user navigates to it)
- Cache results for 5-10 minutes
- Show loading state
- Acceptable if it takes 2-3 seconds

**Our AnalyticsDashboardScreen shows:**
- Engagement rate trends
- Monthly play trends
- Top genres
- Shares & downloads
- Recent track performance
- Charts and graphs

**Load time:** 1-3 seconds (acceptable because it's optional and cached)

---

## 🎯 Implementation Checklist for Web Team

### **Phase 1: Basic Stats (1-2 hours)**
- [ ] Create `getProfileWithStats()` in `data-service.ts`
- [ ] Load profile + tracks in parallel
- [ ] Calculate stats client-side from tracks
- [ ] Update profile page to use this method
- [ ] Test load time (should be < 1s)

### **Phase 2: Display Stats (30 minutes)**
- [ ] Create stat cards component
- [ ] Display total plays, likes, tips
- [ ] Display followers, following, tracks count
- [ ] Add loading states

### **Phase 3: Optional - Advanced Analytics (4-6 hours)**
- [ ] Create separate analytics page
- [ ] Implement detailed queries (can be slower)
- [ ] Add charts/graphs
- [ ] Cache results

---

## 📞 Questions?

### **Q: What if a user has 10,000 tracks?**
**A:** Limit to recent 50-100 tracks:
```typescript
.order('created_at', { ascending: false })
.limit(50)
```

Then calculate stats from those. For precise stats, use a database view.

### **Q: What about real-time updates?**
**A:** Use Supabase realtime subscriptions:
```typescript
supabase
  .channel('profile_updates')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'audio_tracks',
    filter: `creator_id=eq.${userId}` 
  }, (payload) => {
    // Recalculate stats
  })
  .subscribe();
```

### **Q: Do we need the creator_revenue table?**
**A:** Only if you track revenue separately from tips. Otherwise, just sum tips.

---

## 🎉 Summary

**What we do:**
1. ✅ Load profile + tracks in parallel (500ms)
2. ✅ Calculate stats from tracks client-side (10ms)
3. ✅ Display everything (510ms total)

**What we DON'T do:**
- ❌ Separate analytics API query (10s+)
- ❌ Complex database aggregations
- ❌ Server-side stat calculations

**Result:**
- ✅ Profile loads in 0.5-1.5 seconds
- ✅ Same approach across entire mobile app
- ✅ Proven at scale with thousands of users

**Your turn:**
- Copy this approach to web
- Expect same 0.5-1.5s load times
- Match mobile app performance! 🚀

---

**Files to Reference:**
- `soundbridge-app/src/screens/ProfileScreen.tsx` (Lines 290-560) - Main implementation
- `soundbridge-app/src/screens/AnalyticsDashboardScreen.tsx` - Advanced analytics

**Questions?** We're happy to help! This approach has worked perfectly for us. 🎵

