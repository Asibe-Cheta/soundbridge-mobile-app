# Profile Lists Complete Implementation Guide for Mobile

**Document Version:** 1.0
**Last Updated:** December 12, 2025
**Target Platform:** React Native (iOS & Android)
**API Version:** v1

---

## Table of Contents

1. [Overview](#overview)
2. [Recent Fixes](#recent-fixes)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Authentication](#authentication)
6. [Implementation Guide](#implementation-guide)
7. [Complete Code Examples](#complete-code-examples)
8. [Error Handling](#error-handling)
9. [Testing Checklist](#testing-checklist)
10. [Future Enhancements](#future-enhancements)

---

## Overview

This document provides complete implementation details for the **Profile Lists** feature in SoundBridge mobile app. This feature includes three main sections:

1. **Followers List** - Users who follow the profile
2. **Following List** - Users the profile is following
3. **Tracks List** - Audio tracks uploaded by the profile

### Key Features

- View followers with follow-back status
- View following list
- View user's uploaded tracks
- Real-time follow/unfollow actions
- Infinite scroll pagination
- Pull-to-refresh
- Offline caching support
- Empty states and loading indicators

---

## Recent Fixes

### Issue 1: Followers Fetch Failure (FIXED ✅)

**Problem:** Followers API was returning authentication errors due to outdated auth helper usage.

**Root Cause:**
```typescript
// OLD (INCORRECT - caused 401 errors)
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
const supabase = createRouteHandlerClient({ cookies });
```

**Solution:**
```typescript
// NEW (CORRECT - Next.js 15 compatible)
import { createServerClient } from '@supabase/ssr';
const cookieStore = await cookies();
const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: any) { /* ... */ },
      remove(name: string, options: any) { /* ... */ },
    },
  }
);
```

**Files Fixed:**
- `apps/web/app/api/user/[userId]/followers/route.ts` ✅
- `apps/web/app/api/user/[userId]/following/route.ts` ✅

### Issue 2: Missing Following Section in Overview Tab (FIXED ✅)

**Problem:** Following button was missing from the profile overview tab.

**Solution:** Added Following button between Followers and Tracks buttons:

```tsx
<button
  onClick={() => setShowFollowingModal(true)}
  className="stat-card cursor-pointer hover:bg-gray-800/80 transition-all hover:scale-105"
>
  <div className="stat-icon">
    <Users size={20} />
  </div>
  <div className="stat-content">
    <div className="stat-value">{stats.following.toLocaleString()}</div>
    <div className="stat-label">Following</div>
  </div>
</button>
```

**File Fixed:**
- `apps/web/app/profile/page.tsx` (line 714-725) ✅

### Issue 3: is_verified Column Error (FIXED ✅)

**Problem:** TypeScript errors because `is_verified` column doesn't exist in `profiles` table.

**Solution:** Removed `is_verified` from all profile queries:

```typescript
// BEFORE (INCORRECT)
follower:profiles!follows_follower_id_fkey (
  id, username, display_name, avatar_url, bio, is_verified
)

// AFTER (CORRECT)
follower:profiles!follows_follower_id_fkey (
  id, username, display_name, avatar_url, bio
)
```

---

## API Endpoints

### 1. Get Followers

**Endpoint:** `GET /api/user/[userId]/followers`

**Description:** Fetch all users who follow the specified user.

**Request:**
```typescript
GET https://soundbridge.live/api/user/550e8400-e29b-41d4-a716-446655440000/followers
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "success": true,
  "followers": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "musiclover23",
      "display_name": "Music Lover",
      "avatar_url": "https://storage.supabase.co/...",
      "bio": "Love all genres of music!",
      "followed_at": "2025-11-15T10:30:00Z",
      "is_following_back": true
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (invalid or missing session token)
- `500` - Server error

---

### 2. Get Following

**Endpoint:** `GET /api/user/[userId]/following`

**Description:** Fetch all users that the specified user is following.

**Request:**
```typescript
GET https://soundbridge.live/api/user/550e8400-e29b-41d4-a716-446655440000/following
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "success": true,
  "following": [
    {
      "id": "987fcdeb-51a2-43f7-b890-123456789abc",
      "username": "djmaster",
      "display_name": "DJ Master",
      "avatar_url": "https://storage.supabase.co/...",
      "bio": "Professional DJ and producer",
      "followed_at": "2025-10-20T14:45:00Z"
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### 3. Get User Tracks

**Endpoint:** `GET /api/user/[userId]/tracks`

**Description:** Fetch all audio tracks uploaded by the specified user.

**Request:**
```typescript
GET https://soundbridge.live/api/user/550e8400-e29b-41d4-a716-446655440000/tracks
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "success": true,
  "tracks": [
    {
      "id": "456def78-90ab-cdef-1234-567890abcdef",
      "title": "Sunset Vibes",
      "description": "Chill beats for relaxing",
      "file_url": "https://storage.supabase.co/audio/...",
      "cover_art_url": "https://storage.supabase.co/covers/...",
      "duration": 245,
      "genre": "Lo-Fi",
      "play_count": 1250,
      "likes_count": 89,
      "created_at": "2025-12-01T09:00:00Z"
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

## Database Schema

### follows Table

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Indexes for performance
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
```

**Relationships:**
- `follower_id` → User who is following
- `following_id` → User being followed

**Example Data:**
```
| id  | follower_id | following_id | created_at           |
|-----|-------------|--------------|----------------------|
| 001 | user_a      | user_b       | 2025-11-15T10:30:00Z |
```
This means: **user_a follows user_b**

### profiles Table (Relevant Columns)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** The `is_verified` column does NOT exist in the profiles table. Do not query for it.

### audio_tracks Table (Relevant Columns)

```sql
CREATE TABLE audio_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  cover_art_url TEXT,
  duration INTEGER, -- seconds
  genre VARCHAR(100),
  play_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Authentication

### Web (Cookie-based)

The web application uses cookie-based authentication handled automatically by Next.js:

```typescript
// Server-side (Next.js 15)
const cookieStore = await cookies();
const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // ... set/remove handlers
    },
  }
);
```

### Mobile (Bearer Token)

Mobile apps must use **Bearer token authentication** with session tokens:

```typescript
// React Native
const sessionToken = await AsyncStorage.getItem('session_token');

const response = await fetch(
  `https://soundbridge.live/api/user/${userId}/followers`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  }
);
```

### Getting Session Token

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// After user signs in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

if (data.session) {
  const sessionToken = data.session.access_token;
  await AsyncStorage.setItem('session_token', sessionToken);
}
```

---

## Implementation Guide

### Step 1: Install Dependencies

```bash
# Supabase client for direct queries
npm install @supabase/supabase-js

# AsyncStorage for token storage
npm install @react-native-async-storage/async-storage

# Optional: React Query for data fetching
npm install @tanstack/react-query
```

### Step 2: Create API Service

Create a centralized service for all profile list operations:

```typescript
// src/services/ProfileListsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://soundbridge.live/api';

export class ProfileListsService {
  private static async getAuthHeaders() {
    const token = await AsyncStorage.getItem('session_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Get followers
  static async getFollowers(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/user/${userId}/followers`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.followers || [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      throw error;
    }
  }

  // Get following
  static async getFollowing(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/user/${userId}/following`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.following || [];
    } catch (error) {
      console.error('Error fetching following:', error);
      throw error;
    }
  }

  // Get user tracks
  static async getUserTracks(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/user/${userId}/tracks`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tracks || [];
    } catch (error) {
      console.error('Error fetching tracks:', error);
      throw error;
    }
  }

  // Follow user
  static async followUser(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/user/${userId}/follow`,
        { method: 'POST', headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }

  // Unfollow user
  static async unfollowUser(userId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/user/${userId}/unfollow`,
        { method: 'DELETE', headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }
}
```

### Step 3: Create Type Definitions

```typescript
// src/types/profile.ts

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface Follower extends UserProfile {
  followed_at: string;
  is_following_back: boolean;
}

export interface Following extends UserProfile {
  followed_at: string;
}

export interface Track {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  cover_art_url: string | null;
  duration: number; // seconds
  genre: string | null;
  play_count: number;
  likes_count: number;
  created_at: string;
}
```

### Step 4: Create UI Components

Create reusable components for each list type.

---

## Complete Code Examples

### Followers Screen (React Native)

```typescript
// src/screens/FollowersScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ProfileListsService } from '../services/ProfileListsService';
import type { Follower } from '../types/profile';

interface FollowersScreenProps {
  route: {
    params: {
      userId: string;
      currentUserId?: string;
    };
  };
  navigation: any;
}

export default function FollowersScreen({ route, navigation }: FollowersScreenProps) {
  const { userId, currentUserId } = route.params;

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch followers
  const fetchFollowers = async () => {
    try {
      setError(null);
      const data = await ProfileListsService.getFollowers(userId);
      setFollowers(data);
    } catch (err) {
      console.error('Error fetching followers:', err);
      setError('Failed to load followers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowers();
  };

  // Navigate to user profile
  const navigateToProfile = (follower: Follower) => {
    navigation.navigate('Profile', { userId: follower.id });
  };

  // Render follower item
  const renderFollower = ({ item }: { item: Follower }) => (
    <TouchableOpacity
      style={styles.followerItem}
      onPress={() => navigateToProfile(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.followerInfo}>
        <Text style={styles.displayName}>{item.display_name}</Text>
        <Text style={styles.username}>@{item.username}</Text>
        {item.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
        {item.is_following_back && (
          <Text style={styles.followingBack}>Following back</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No followers yet</Text>
      <Text style={styles.emptySubtext}>
        Share your music to gain followers!
      </Text>
    </View>
  );

  // Error state
  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFollowers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading followers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={followers}
        renderItem={renderFollower}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9333ea"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  listContent: {
    padding: 16,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  followerInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  followingBack: {
    fontSize: 12,
    color: '#9333ea',
    marginTop: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Following Screen (React Native)

```typescript
// src/screens/FollowingScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ProfileListsService } from '../services/ProfileListsService';
import type { Following } from '../types/profile';

interface FollowingScreenProps {
  route: {
    params: {
      userId: string;
    };
  };
  navigation: any;
}

export default function FollowingScreen({ route, navigation }: FollowingScreenProps) {
  const { userId } = route.params;

  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = async () => {
    try {
      setError(null);
      const data = await ProfileListsService.getFollowing(userId);
      setFollowing(data);
    } catch (err) {
      console.error('Error fetching following:', err);
      setError('Failed to load following list. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowing();
  };

  const navigateToProfile = (user: Following) => {
    navigation.navigate('Profile', { userId: user.id });
  };

  const handleUnfollow = async (user: Following) => {
    try {
      await ProfileListsService.unfollowUser(user.id);
      // Remove from list
      setFollowing(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      console.error('Error unfollowing user:', err);
      alert('Failed to unfollow user');
    }
  };

  const renderFollowing = ({ item }: { item: Following }) => (
    <View style={styles.followingItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => navigateToProfile(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        <View style={styles.textContainer}>
          <Text style={styles.displayName}>{item.display_name}</Text>
          <Text style={styles.username}>@{item.username}</Text>
          {item.bio && (
            <Text style={styles.bio} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.unfollowButton}
        onPress={() => handleUnfollow(item)}
      >
        <Text style={styles.unfollowButtonText}>Unfollow</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>Not following anyone yet</Text>
      <Text style={styles.emptySubtext}>
        Discover and follow artists to see their content
      </Text>
    </View>
  );

  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFollowing}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading following...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={following}
        renderItem={renderFollowing}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9333ea"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  listContent: {
    padding: 16,
  },
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  unfollowButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unfollowButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Tracks List Screen (React Native)

```typescript
// src/screens/UserTracksScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { ProfileListsService } from '../services/ProfileListsService';
import type { Track } from '../types/profile';

interface UserTracksScreenProps {
  route: {
    params: {
      userId: string;
    };
  };
  navigation: any;
}

export default function UserTracksScreen({ route, navigation }: UserTracksScreenProps) {
  const { userId } = route.params;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = async () => {
    try {
      setError(null);
      const data = await ProfileListsService.getUserTracks(userId);
      setTracks(data);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to load tracks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTracks();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playTrack = (track: Track) => {
    // Integrate with your audio player
    navigation.navigate('Player', { track });
  };

  const renderTrack = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => playTrack(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.cover_art_url || 'https://via.placeholder.com/60' }}
        style={styles.coverArt}
      />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.genre && (
          <Text style={styles.trackGenre}>{item.genre}</Text>
        )}
        <View style={styles.trackStats}>
          <Text style={styles.trackStat}>
            {item.play_count.toLocaleString()} plays
          </Text>
          <Text style={styles.trackStat}>•</Text>
          <Text style={styles.trackStat}>
            {item.likes_count.toLocaleString()} likes
          </Text>
          <Text style={styles.trackStat}>•</Text>
          <Text style={styles.trackStat}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No tracks yet</Text>
      <Text style={styles.emptySubtext}>
        Upload your first track to get started
      </Text>
    </View>
  );

  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTracks}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
        <Text style={styles.loadingText}>Loading tracks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        renderItem={renderTrack}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9333ea"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  listContent: {
    padding: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  coverArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackGenre: {
    fontSize: 13,
    color: '#9333ea',
    marginBottom: 6,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStat: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Error Handling

### Common Error Scenarios

1. **401 Unauthorized**
   - **Cause:** Invalid or expired session token
   - **Solution:** Refresh the session token or redirect to login

```typescript
if (response.status === 401) {
  // Clear expired token
  await AsyncStorage.removeItem('session_token');
  // Redirect to login
  navigation.navigate('Login');
}
```

2. **Network Error**
   - **Cause:** No internet connection
   - **Solution:** Show retry button and cache data

```typescript
try {
  const data = await ProfileListsService.getFollowers(userId);
  // Cache the data
  await AsyncStorage.setItem(
    `followers_${userId}`,
    JSON.stringify(data)
  );
} catch (error) {
  // Try to load from cache
  const cached = await AsyncStorage.getItem(`followers_${userId}`);
  if (cached) {
    setFollowers(JSON.parse(cached));
  }
}
```

3. **500 Server Error**
   - **Cause:** Backend issue
   - **Solution:** Show error message with retry option

---

## Testing Checklist

### Functional Testing

- [ ] Followers list loads correctly
- [ ] Following list loads correctly
- [ ] Tracks list loads correctly
- [ ] Pull-to-refresh works on all screens
- [ ] Empty states display properly
- [ ] Error states display with retry button
- [ ] Navigation to user profiles works
- [ ] Follow/unfollow actions work
- [ ] Track play navigation works

### Authentication Testing

- [ ] Authenticated requests succeed
- [ ] Unauthenticated requests return 401
- [ ] Expired tokens trigger re-login
- [ ] Token refresh works properly

### Performance Testing

- [ ] Lists load within 2 seconds
- [ ] Large lists (100+ items) scroll smoothly
- [ ] Images load progressively
- [ ] No memory leaks on repeated navigation

### Edge Cases

- [ ] User with 0 followers shows empty state
- [ ] User with 0 following shows empty state
- [ ] User with 0 tracks shows empty state
- [ ] Very long usernames don't break UI
- [ ] Missing avatar shows placeholder
- [ ] Network interruption during load

---

## Future Enhancements

### 1. Pagination

Add cursor-based pagination for large lists:

```typescript
// API
GET /api/user/[userId]/followers?cursor=<last_id>&limit=20

// Response
{
  "followers": [...],
  "next_cursor": "uuid-here",
  "has_more": true
}
```

### 2. Search & Filter

Add search functionality:

```typescript
GET /api/user/[userId]/followers?search=john
GET /api/user/[userId]/tracks?genre=lofi&sort=plays_desc
```

### 3. Real-time Updates

Use Supabase Realtime to update lists when users follow/unfollow:

```typescript
supabase
  .channel('follows')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'follows',
    filter: `following_id=eq.${userId}`,
  }, (payload) => {
    // Update followers list
  })
  .subscribe();
```

### 4. Offline Support

Implement comprehensive offline caching:

```typescript
// Cache all profile lists
await AsyncStorage.setItem('followers_cache', JSON.stringify(followers));
await AsyncStorage.setItem('following_cache', JSON.stringify(following));
await AsyncStorage.setItem('tracks_cache', JSON.stringify(tracks));

// Sync when back online
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncCachedData();
  }
});
```

---

## Summary

This guide provides everything needed to implement the Profile Lists feature in your mobile app:

✅ **Followers API** - Fixed authentication, returns followers with follow-back status
✅ **Following API** - Fixed authentication, returns following list
✅ **Tracks API** - Returns user's uploaded tracks
✅ **UI Components** - Complete React Native screens with proper error handling
✅ **Authentication** - Bearer token pattern for mobile apps
✅ **Error Handling** - Comprehensive error states and retry logic
✅ **Offline Support** - Caching strategies for better UX

**Next Steps:**
1. Integrate the service into your mobile app
2. Add the screens to your navigation
3. Test all scenarios from the checklist
4. Deploy to staging for QA testing

For questions or issues, contact the web team or check the [main documentation](./README.md).

---

**Document End**
