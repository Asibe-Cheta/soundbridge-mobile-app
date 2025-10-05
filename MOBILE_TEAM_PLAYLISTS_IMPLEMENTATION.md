# 🎵 Playlists Feature - Complete Implementation Guide

**Date:** October 5, 2025  
**Status:** ✅ **READY TO IMPLEMENT**  
**Priority:** 🟢 **MEDIUM** - Feature Enhancement

---

## 📋 **Overview**

The playlists feature is **fully implemented on the backend** with database tables, RLS policies, and API endpoints ready. The mobile app can now integrate this feature to replace the "Coming Soon" screen.

---

## 🗄️ **Database Schema**

### **`playlists` Table**
```sql
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    cover_image_url TEXT,
    tracks_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- in seconds
    followers_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`playlist_tracks` Table (Junction Table)**
```sql
CREATE TABLE playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)
);
```

### **Key Fields Explained:**
- **`tracks_count`**: Automatically updated when tracks are added/removed
- **`total_duration`**: Sum of all track durations in seconds
- **`followers_count`**: Number of users who follow/like this playlist
- **`is_public`**: If `true`, playlist appears in public discovery
- **`position`**: Order of tracks in the playlist (1, 2, 3, etc.)

---

## 🔒 **RLS (Row Level Security) Policies**

Already configured in the database:

```sql
-- Public playlists are viewable by everyone
CREATE POLICY "Public playlists are viewable by everyone" 
ON playlists FOR SELECT 
USING (is_public = true OR auth.uid() = creator_id);

-- Users can insert their own playlists
CREATE POLICY "Users can insert their own playlists" 
ON playlists FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Users can update their own playlists
CREATE POLICY "Users can update their own playlists" 
ON playlists FOR UPDATE 
USING (auth.uid() = creator_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete their own playlists" 
ON playlists FOR DELETE 
USING (auth.uid() = creator_id);

-- Playlist tracks policies
CREATE POLICY "Anyone can view tracks in public playlists" 
ON playlist_tracks FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND (is_public = true OR creator_id = auth.uid()))
);

CREATE POLICY "Users can manage tracks in their own playlists" 
ON playlist_tracks FOR ALL 
USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND creator_id = auth.uid())
);
```

---

## 🚀 **API Endpoints**

### **1. Get Public Playlists (Discovery)**

**Endpoint:** `GET /api/playlists/public`

**Query Parameters:**
- `limit` (optional): Number of playlists to return (default: 20)

**Example Request:**
```typescript
const response = await fetch('https://www.soundbridge.live/api/playlists/public?limit=20', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Response:**
```json
{
  "success": true,
  "playlists": [
    {
      "id": "uuid",
      "name": "Afrobeat Vibes",
      "description": "The best Afrobeat tracks",
      "cover_image_url": "https://...",
      "tracks_count": 25,
      "total_duration": 5400,
      "followers_count": 150,
      "created_at": "2025-10-01T10:00:00Z",
      "updated_at": "2025-10-05T14:30:00Z",
      "creator": {
        "id": "uuid",
        "username": "djkoolaid",
        "display_name": "DJ Kool Aid",
        "avatar_url": "https://..."
      }
    }
  ],
  "count": 20,
  "timestamp": "2025-10-05T15:00:00Z"
}
```

---

### **2. Get Playlist Details (with Tracks)**

**Endpoint:** `GET /api/playlists/[id]`

**Example Request:**
```typescript
const playlistId = 'uuid-here';
const response = await fetch(`https://www.soundbridge.live/api/playlists/${playlistId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Response:**
```json
{
  "success": true,
  "playlist": {
    "id": "uuid",
    "name": "Afrobeat Vibes",
    "description": "The best Afrobeat tracks",
    "cover_image_url": "https://...",
    "tracks_count": 25,
    "total_duration": 5400,
    "followers_count": 150,
    "is_public": true,
    "created_at": "2025-10-01T10:00:00Z",
    "updated_at": "2025-10-05T14:30:00Z",
    "creator": {
      "id": "uuid",
      "username": "djkoolaid",
      "display_name": "DJ Kool Aid",
      "avatar_url": "https://...",
      "bio": "Professional DJ and producer"
    },
    "tracks": [
      {
        "id": "uuid",
        "position": 1,
        "added_at": "2025-10-01T10:00:00Z",
        "track": {
          "id": "uuid",
          "title": "Lagos Nights",
          "description": "Smooth Afrobeat vibes",
          "file_url": "https://...",
          "cover_art_url": "https://...",
          "duration": 240,
          "genre": "Afrobeat",
          "play_count": 1500,
          "likes_count": 200,
          "is_public": true,
          "created_at": "2025-09-15T08:00:00Z",
          "creator": {
            "id": "uuid",
            "username": "artist1",
            "display_name": "Artist Name",
            "avatar_url": "https://..."
          }
        }
      }
    ]
  },
  "timestamp": "2025-10-05T15:00:00Z"
}
```

---

### **3. Get User's Playlists**

**Endpoint:** `GET /api/playlists/user/[userId]`

**Query Parameters:**
- `limit` (optional): Number of playlists to return (default: 50)

**Example Request:**
```typescript
const userId = 'uuid-here';
const response = await fetch(`https://www.soundbridge.live/api/playlists/user/${userId}?limit=50`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Response:** Same structure as public playlists endpoint

---

## 📱 **Mobile App Integration**

### **Step 1: Update Supabase Helper Functions**

Add these functions to your `src/lib/supabase.ts`:

```typescript
export const dbHelpers = {
  // ... existing functions ...

  // Get public playlists (for discovery)
  async getPublicPlaylists(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          created_at,
          updated_at,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting public playlists:', error);
      return { data: null, error };
    }
  },

  // Get playlist details with tracks
  async getPlaylistDetails(playlistId: string) {
    try {
      // Get playlist info
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          is_public,
          created_at,
          updated_at,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;

      // Get playlist tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('playlist_tracks')
        .select(`
          id,
          position,
          added_at,
          track:audio_tracks!playlist_tracks_track_id_fkey(
            id,
            title,
            description,
            file_url,
            cover_art_url,
            duration,
            genre,
            play_count,
            likes_count,
            is_public,
            created_at,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (tracksError) throw tracksError;

      return { 
        data: { ...playlist, tracks: tracks || [] }, 
        error: null 
      };
    } catch (error) {
      console.error('Error getting playlist details:', error);
      return { data: null, error };
    }
  },

  // Get user's playlists
  async getUserPlaylists(userId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          is_public,
          created_at,
          updated_at,
          creator:profiles!playlists_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return { data: null, error };
    }
  }
};
```

---

### **Step 2: Update DiscoverScreen Playlists Tab**

Replace the "Coming Soon" screen with real data:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { dbHelpers } from '../lib/supabase';

interface Playlist {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  tracks_count: number;
  total_duration: number;
  followers_count: number;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const PlaylistsTab = ({ navigation }: any) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await dbHelpers.getPublicPlaylists(20);
      
      if (error) throw error;
      
      setPlaylists(data || []);
      console.log('✅ Loaded', data?.length || 0, 'playlists');
    } catch (err) {
      console.error('❌ Error loading playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderPlaylistCard = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => navigation.navigate('PlaylistDetails', { playlistId: item.id })}
    >
      <Image
        source={{ uri: item.cover_image_url || 'https://via.placeholder.com/150' }}
        style={styles.coverImage}
      />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.creatorName} numberOfLines={1}>
          by {item.creator.display_name}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {item.tracks_count} tracks
          </Text>
          <Text style={styles.statText}>•</Text>
          <Text style={styles.statText}>
            {formatDuration(item.total_duration)}
          </Text>
          <Text style={styles.statText}>•</Text>
          <Text style={styles.statText}>
            {item.followers_count} followers
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading playlists...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPlaylists}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No playlists available yet</Text>
        <Text style={styles.emptySubtext}>Check back soon for curated playlists!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={playlists}
      renderItem={renderPlaylistCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshing={loading}
      onRefresh={loadPlaylists}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  playlistCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginRight: 6,
  },
});

export default PlaylistsTab;
```

---

### **Step 3: Create PlaylistDetailsScreen**

Create a new screen to show playlist details and tracks:

```typescript
// src/screens/PlaylistDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { dbHelpers } from '../lib/supabase';

const PlaylistDetailsScreen = ({ route, navigation }: any) => {
  const { playlistId } = route.params;
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylistDetails();
  }, [playlistId]);

  const loadPlaylistDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await dbHelpers.getPlaylistDetails(playlistId);
      
      if (error) throw error;
      
      setPlaylist(data);
      console.log('✅ Loaded playlist:', data?.name);
    } catch (err) {
      console.error('❌ Error loading playlist details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={styles.centerContainer}>
        <Text>Playlist not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Playlist Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: playlist.cover_image_url || 'https://via.placeholder.com/200' }}
          style={styles.coverImage}
        />
        <Text style={styles.playlistName}>{playlist.name}</Text>
        <Text style={styles.creatorName}>by {playlist.creator.display_name}</Text>
        <Text style={styles.description}>{playlist.description}</Text>
        <Text style={styles.stats}>
          {playlist.tracks_count} tracks • {playlist.followers_count} followers
        </Text>
      </View>

      {/* Track List */}
      <FlatList
        data={playlist.tracks}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.trackItem}>
            <Text style={styles.trackPosition}>{index + 1}</Text>
            <Image
              source={{ uri: item.track.cover_art_url || 'https://via.placeholder.com/50' }}
              style={styles.trackCover}
            />
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.track.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.track.creator.display_name}
              </Text>
            </View>
            <Text style={styles.trackDuration}>
              {Math.floor(item.track.duration / 60)}:{(item.track.duration % 60).toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

export default PlaylistDetailsScreen;
```

---

## ✅ **Implementation Checklist**

- [ ] Add playlist helper functions to `src/lib/supabase.ts`
- [ ] Update DiscoverScreen Playlists tab to load real data
- [ ] Create PlaylistDetailsScreen component
- [ ] Add navigation route for PlaylistDetailsScreen
- [ ] Test loading public playlists
- [ ] Test viewing playlist details
- [ ] Test error handling (no internet, empty state)
- [ ] Add pull-to-refresh functionality
- [ ] Add loading states and skeletons
- [ ] Test on both iOS and Android

---

## 🎯 **Key Features to Implement**

1. **Discovery Tab**: Show public playlists sorted by most recent
2. **Playlist Details**: Show all tracks in order with play functionality
3. **User Playlists**: Show user's own playlists on their profile
4. **Search**: Filter playlists by name or creator
5. **Play All**: Button to play all tracks in a playlist

---

## 📊 **Expected Data Flow**

```
DiscoverScreen (Playlists Tab)
  ↓
Load public playlists via dbHelpers.getPublicPlaylists()
  ↓
Display playlist cards with cover, name, creator, stats
  ↓
User taps playlist
  ↓
Navigate to PlaylistDetailsScreen
  ↓
Load playlist details via dbHelpers.getPlaylistDetails(playlistId)
  ↓
Display playlist info + track list
  ↓
User can play tracks, follow playlist, etc.
```

---

## 🚨 **Important Notes**

1. **No Mock Data**: All data comes from real database
2. **RLS Enforced**: Users can only see public playlists or their own
3. **Automatic Counts**: `tracks_count` and `total_duration` are managed by database triggers
4. **Performance**: Playlists are paginated (default 20, max 50)
5. **Images**: Use placeholder images if `cover_image_url` is null

---

## 🆘 **Troubleshooting**

### **No playlists showing?**
- Check if there are public playlists in the database
- Verify RLS policies allow public access
- Check console logs for errors

### **Tracks not loading?**
- Verify `playlist_tracks` table has data
- Check foreign key relationships
- Ensure tracks are public (`is_public = true`)

### **Authentication errors?**
- Playlists endpoint doesn't require auth for public playlists
- For user-specific playlists, ensure valid session token

---

**🎉 Ready to implement! The backend is fully set up and waiting for the mobile app integration.**
