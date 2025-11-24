# Critical Issue: Data Loading Buffering Problem in React Native App

## Problem Summary

**Issue:** Multiple screens (HomeScreen, DiscoverScreen, ProfileScreen) show persistent buffering/loading states when:
1. User logs in for the first time
2. User reopens the app after being away for a while

**Symptom:** Content doesn't load - screens remain in loading state indefinitely. Only after closing and reopening the app does content load properly.

**Impact:** Critical UX issue - app appears broken to users. This needs to work reliably for millions of users.

---

## Technical Context

### App Architecture
- **Framework:** React Native with Expo
- **Backend:** Supabase (PostgreSQL database)
- **State Management:** React Context (AuthContext, AudioPlayerContext, ThemeContext)
- **Navigation:** React Navigation
- **Storage:** AsyncStorage for session persistence

### Affected Screens

#### 1. **HomeScreen** (`src/screens/HomeScreen.tsx`)
- **Data Fetched:**
  - Featured Creator
  - Trending Tracks (via `dbHelpers.getPersonalizedTracks()` or `getTrendingTracks()`)
  - Recent Tracks (direct Supabase query from `audio_tracks` table)
  - Hot Creators (via `dbHelpers.getHotCreators()`)
  - Events (via `dbHelpers.getPersonalizedEvents()` or `getEvents()`)

- **Loading States:**
  ```typescript
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  ```

- **Data Loading Pattern:**
  ```typescript
  useEffect(() => {
    loadHomeContent();
  }, []);

  const loadHomeContent = async () => {
    try {
      await Promise.all([
        loadFeaturedCreator(),
        loadTrendingTracks(),
        loadRecentTracks(),
        loadHotCreators(),
        loadEvents(),
      ]);
    } catch (error) {
      console.error('Error loading home content:', error);
    }
  };
  ```

- **Key Queries:**
  - `dbHelpers.getPersonalizedTracks(userId, 10)` - Complex query with genre filtering
  - `dbHelpers.getTrendingTracks(10)` - Fallback if personalized fails
  - Direct Supabase query: `supabase.from('audio_tracks').select(...).order('created_at', { ascending: false }).limit(10)`
  - `dbHelpers.getHotCreators(10)`
  - `dbHelpers.getPersonalizedEvents(userId, 10)` or `getEvents(10)`

#### 2. **DiscoverScreen** (`src/screens/DiscoverScreen.tsx`)
- **Data Fetched:**
  - Trending Tracks
  - Recent Tracks
  - Featured Artists (via `dbHelpers.getCreatorsWithStats()`)
  - Events
  - Playlists

- **Loading States:**
  ```typescript
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  ```

- **Data Loading Pattern:**
  ```typescript
  useEffect(() => {
    if (!authLoading) {
      loadDiscoverContent();
    }
  }, [activeTab, authLoading, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    
    const loadInitialContent = async () => {
      await Promise.all([
        loadFeaturedArtists(),
        loadEvents(),
        loadTrendingTracks(),
        loadRecentTracks(),
        loadPlaylists()
      ]);
    };
    loadInitialContent();
  }, [authLoading, user?.id]);
  ```

- **Timeout Mechanism (6 seconds):**
  ```typescript
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingTracks) {
        console.warn('DiscoverScreen: Track data timed out, using fallback dataset.');
        setTrendingTracks(prev => (prev.length > 0 ? prev : DISCOVER_MOCK_TRACKS);
        setRecentTracks(prev => (prev.length > 0 ? prev : DISCOVER_MOCK_TRACKS);
        setLoadingTracks(false);
      }
      // Similar for artists, events, playlists...
    }, 6000);
    return () => clearTimeout(timeout);
  }, [authLoading, loadingTracks, loadingArtists, loadingEvents, loadingPlaylists]);
  ```

- **Key Queries:**
  - `dbHelpers.getPersonalizedTracks(user.id, 20)` or `getTrendingTracks(20)`
  - `dbHelpers.getCreatorsWithStats(10)` - Makes multiple count queries per creator
  - `dbHelpers.getPersonalizedEvents(user.id, 10)` or `getEvents(10)`

#### 3. **ProfileScreen** (`src/screens/ProfileScreen.tsx`)
- **Data Fetched:**
  - User Profile (from `profiles` table)
  - Followers Count (count query from `followers` table)
  - Following Count (count query from `followers` table)
  - Tracks Count (count query from `audio_tracks` table)
  - User Tracks (from `audio_tracks` table)
  - User Stats (calculated from tracks)

- **Loading States:**
  ```typescript
  const [loading, setLoading] = useState(true);
  ```

- **Data Loading Pattern:**
  ```typescript
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Load profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // Get counts in parallel
      const [followersResult, followingResult, tracksCountResult] = await Promise.all([
        supabase.from('followers').select('id', { count: 'exact' }).eq('following_id', user.id),
        supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', user.id),
        supabase.from('audio_tracks').select('id', { count: 'exact' }).eq('creator_id', user.id)
      ]);
      
      // Load user tracks
      const { data: tracksData } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', user.id)
        .limit(10);
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };
  ```

---

## Database Helper Functions (`src/lib/supabase.ts`)

### `getPersonalizedTracks(userId, limit)`
```typescript
async getPersonalizedTracks(userId: string, limit = 20) {
  // 1. Get user genres
  const { data: userGenres } = await this.getUserGenres(userId);
  
  // 2. If no genres, fallback to trending
  if (!userGenres || userGenres.length === 0) {
    return this.getTrendingTracks(limit);
  }
  
  // 3. Complex query with JOINs
  const { data, error } = await supabase
    .from('audio_tracks')
    .select(`
      id, title, description, audio_url, file_url, cover_art_url, artwork_url,
      duration, play_count, likes_count, created_at,
      creator:profiles!creator_id(id, username, display_name, avatar_url),
      content_genres!inner(genre_id)
    `)
    .eq('is_public', true)
    .in('content_genres.genre_id', genreIds)
    .order('play_count', { ascending: false })
    .limit(limit);
}
```

### `getTrendingTracks(limit)`
```typescript
async getTrendingTracks(limit = 20) {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select(`
      id, title, description, audio_url, file_url, cover_art_url, artwork_url,
      duration, play_count, likes_count, created_at,
      creator:profiles!creator_id(id, username, display_name, avatar_url)
    `)
    .eq('is_public', true)
    .order('play_count', { ascending: false })
    .limit(limit);
}
```

### `getCreatorsWithStats(limit)`
```typescript
async getCreatorsWithStats(limit = 20) {
  // 1. Get creators
  const { data: creators } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, ...')
    .eq('role', 'creator')
    .limit(limit);
  
  // 2. For EACH creator, make 3 separate count queries
  const creatorsWithStats = await Promise.all(
    creators.map(async (creator) => {
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', creator.id);
      
      const { count: tracksCount } = await supabase
        .from('audio_tracks')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creator.id);
      
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creator.id);
      
      return { ...creator, followers_count, tracks_count, events_count };
    })
  );
}
```

### `getPersonalizedEvents(userId, limit)`
```typescript
async getPersonalizedEvents(userId: string, limit = 10) {
  // Gets user preferences, then filters events by country/location
  // Similar pattern to getPersonalizedTracks
}
```

---

## Authentication Context (`src/contexts/AuthContext.tsx`)

### Session Management
```typescript
useEffect(() => {
  const getInitialSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setSession(session);
        setUser(session.user);
        await loadUserProfile(session.user.id);
      }
    } catch (err) {
      console.error('Error getting initial session:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // 5 second timeout
  const timeoutId = setTimeout(() => {
    setLoading(false);
  }, 5000);
  
  getInitialSession();
}, []);
```

### `loadUserProfile(userId)`
```typescript
const loadUserProfile = async (userId: string, activeSession: Session | null = session) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  // Also fetches creator_types via API
  if (activeSession) {
    creatorTypes = await fetchCreatorTypes(userId, { session: activeSession });
  }
}
```

---

## Supabase Client Configuration

```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'; // Required for React Native
import { createClient, processLock } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock, // Prevents setSession() hanging
  },
});

// AppState listener for session refresh
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
```

---

## Observed Behavior

### When It Works (After Reopening App):
- User closes app completely
- Reopens app
- All screens load data properly
- Loading states clear correctly

### When It Fails (First Login / After Being Away):
- User logs in or reopens app after being away
- Screens show loading/buffering state
- Data never loads
- Loading states never clear
- Only fix: Close and reopen app

### Pattern Analysis:
- **First load after login:** Data fetching might be racing with session establishment
- **After being away:** Session might be expired/stale, causing queries to hang
- **Second open works:** Session is fresh, queries succeed

---

## Potential Root Causes

1. **Session Race Condition:**
   - Screens start loading before session is fully established
   - Queries execute with invalid/stale session tokens
   - Queries hang waiting for authentication

2. **Supabase Query Hanging:**
   - Complex JOINs might be timing out
   - No request timeouts on Supabase queries
   - Network issues causing silent failures

3. **Loading State Management:**
   - Loading states set to `true` but never cleared if queries hang
   - No error handling to clear loading states
   - Timeout mechanism in DiscoverScreen (6s) might not be working

4. **Parallel Query Issues:**
   - `Promise.all()` waits for all queries - if one hangs, all hang
   - No individual timeouts per query
   - No cancellation mechanism

5. **Auth Context Loading:**
   - Screens depend on `authLoading` state
   - If `authLoading` never resolves, screens never load
   - 5-second timeout might not be sufficient

---

## Current Error Handling

### HomeScreen:
- Basic try/catch around `loadHomeContent()`
- Individual load functions have try/catch
- Fallback to mock data on error
- **BUT:** Loading states might not clear if queries hang (no timeout)

### DiscoverScreen:
- 6-second timeout mechanism
- Fallback to mock data on timeout
- **BUT:** Only triggers if loading states are still `true` after 6s
- Might not work if queries hang silently

### ProfileScreen:
- Basic try/catch
- Fallback to default data
- **BUT:** No timeout mechanism
- `setLoading(false)` in finally block should work, but might not if query hangs

---

## Questions for Claude

1. **Why do Supabase queries hang on first load but work on second load?**
   - Is this a session/authentication issue?
   - Are queries waiting for something that only resolves on second load?
   - Could it be related to AsyncStorage or session persistence?

2. **How can we add proper timeouts to Supabase queries?**
   - Supabase JS client doesn't have built-in timeout
   - Should we wrap queries in Promise.race() with timeout?
   - What's the best timeout duration for mobile networks?

3. **How should we handle loading states when queries hang?**
   - Should we set a maximum wait time and show fallback data?
   - How to detect if a query is hanging vs. just slow?
   - Should we show cached data immediately while fetching fresh data?

4. **Is the session establishment race condition the issue?**
   - Should screens wait for `authLoading === false` before fetching?
   - How to ensure session is valid before making queries?
   - Should we verify session token before each query?

5. **How to optimize `getCreatorsWithStats()` which makes N+1 queries?**
   - Currently makes 3 count queries per creator
   - For 10 creators = 30+ queries
   - Should we use database views or stored procedures?
   - Can we batch count queries?

6. **What's the best pattern for parallel data loading with timeouts?**
   - Current `Promise.all()` approach fails if one query hangs
   - Should we use `Promise.allSettled()` instead?
   - How to implement per-query timeouts?

7. **Should we implement request cancellation?**
   - AbortController for fetch requests
   - How to cancel Supabase queries?
   - Should we cancel pending queries when component unmounts?

8. **How to implement optimistic loading with caching?**
   - Show cached data immediately
   - Fetch fresh data in background
   - Update UI when fresh data arrives
   - What caching strategy for React Native?

9. **What's the best error recovery strategy?**
   - Retry failed queries?
   - Show user-friendly error messages?
   - Allow manual refresh?
   - Log errors for monitoring?

10. **How to ensure this works reliably for millions of users?**
    - What performance optimizations are needed?
    - How to handle network failures gracefully?
    - What monitoring/logging should we add?
    - How to test under various network conditions?

---

## Code Examples Needed

Please provide:
1. **Timeout wrapper for Supabase queries** - Generic function to wrap any Supabase query with timeout
2. **Improved loading state management** - Pattern to ensure loading states always clear
3. **Session validation before queries** - How to verify session is valid before fetching
4. **Optimized `getCreatorsWithStats()`** - Reduce N+1 queries
5. **Parallel loading with individual timeouts** - Replace `Promise.all()` with timeout-aware version
6. **Request cancellation on unmount** - Clean up pending queries
7. **Caching strategy** - Show cached data while fetching fresh
8. **Error recovery** - Retry logic and user feedback

---

## Additional Context

- **Network Conditions:** App must work on slow/unreliable mobile networks
- **User Expectations:** Content should appear within 1-2 seconds
- **Scale:** Must handle millions of concurrent users
- **Platform:** React Native iOS/Android
- **Backend:** Supabase (PostgreSQL) with RLS policies
- **Authentication:** Supabase Auth with JWT tokens

---

## Priority

**CRITICAL** - This blocks core app functionality and creates poor user experience. Users see blank/buffering screens and think the app is broken.

