# Data Loading Implementation Guide

## ✅ Completed

1. **Created `src/utils/dataLoading.ts`** - All utility functions for timeout, parallel loading, session validation
2. **Updated `src/lib/supabase.ts`** - Database helpers now use timeout wrappers
3. **Created SQL function** - `get_creators_with_stats.sql` for optimized queries

## 📋 Next Steps

### 1. Run SQL Function in Supabase
Execute `supabase_functions/get_creators_with_stats.sql` in your Supabase SQL Editor to enable optimized creator stats queries.

### 2. Update Screens

The screens need to be updated to use the new loading utilities. Here's what needs to change:

#### **HomeScreen Updates Needed:**
- Import: `loadQueriesInParallel`, `waitForValidSession`, `LoadingStateManager`, `CancellableQuery`
- Replace `loadHomeContent()` to use `loadQueriesInParallel()`
- Add `LoadingStateManager` to track loading states
- Wait for valid session before loading
- Use individual timeouts per query

#### **DiscoverScreen Updates Needed:**
- Same pattern as HomeScreen
- Update `loadDiscoverContent()` to use new utilities
- Remove the 6-second timeout useEffect (handled by LoadingStateManager now)

#### **ProfileScreen Updates Needed:**
- Update `loadProfileData()` to use `loadQueriesInParallel()`
- Add timeout wrappers to all queries

### 3. Update AuthContext (Optional but Recommended)
- Add `sessionReady` state to indicate when session is fully validated
- Screens can wait for `sessionReady` instead of just `loading`

## 🚀 Quick Implementation

The key changes are:
1. Replace `Promise.all()` with `loadQueriesInParallel()`
2. Wrap all Supabase queries with `withQueryTimeout()`
3. Use `LoadingStateManager` instead of individual useState for loading
4. Call `waitForValidSession()` before loading data

## 📝 Example Pattern

```typescript
// OLD WAY (can hang):
const loadData = async () => {
  const [tracks, artists, events] = await Promise.all([
    dbHelpers.getTrendingTracks(),
    dbHelpers.getCreatorsWithStats(),
    dbHelpers.getEvents(),
  ]);
};

// NEW WAY (with timeouts):
const loadData = async () => {
  if (user?.id) {
    await waitForValidSession(supabase, 3000);
  }
  
  const results = await loadQueriesInParallel({
    tracks: {
      name: 'tracks',
      query: () => dbHelpers.getTrendingTracks(10),
      timeout: 5000,
      fallback: [],
    },
    artists: {
      name: 'artists',
      query: () => dbHelpers.getCreatorsWithStats(10),
      timeout: 8000,
      fallback: [],
    },
    events: {
      name: 'events',
      query: () => dbHelpers.getEvents(10),
      timeout: 6000,
      fallback: [],
    },
  });
  
  setTracks(results.tracks);
  setArtists(results.artists);
  setEvents(results.events);
};
```

## ⚠️ Important Notes

1. **SQL Function**: Must be run in Supabase SQL Editor before the optimized queries will work
2. **Fallback Data**: Always provide fallback data in case queries timeout
3. **Timeouts**: Adjust timeout values based on your network conditions (3-8 seconds recommended)
4. **Testing**: Test on slow networks to ensure timeouts work correctly

