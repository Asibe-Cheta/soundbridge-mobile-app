I'll provide the exact working queries based on the existing database schema and how the web app currently queries this data:

## **🚨 EXACT DATABASE SCHEMA & WORKING QUERIES**

### **1. FEATURED ARTISTS QUERY - EXACT WORKING CODE**

**❌ Fields that DON'T exist in `profiles` table:**
- `followers_count` - NOT stored, must be COMPUTED
- `tracks_count` - NOT stored, must be COMPUTED
- `is_creator` - DOESN'T EXIST (use `role` instead)
- `is_verified` - DOESN'T EXIST in current schema

**✅ Correct query for Featured Artists:**
```typescript
const getFeaturedArtists = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      location,
      genre,
      role,
      created_at
    `)
    .eq('role', 'creator')
    .order('created_at', { ascending: false })
    .limit(10);
    
  return { data, error };
};
```

**✅ To get followers and tracks counts, use this enhanced query:**
```typescript
const getFeaturedArtistsWithStats = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      location,
      genre,
      role,
      created_at,
      followers:follows!follows_following_id_fkey(count),
      tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
    `)
    .eq('role', 'creator')
    .order('created_at', { ascending: false })
    .limit(10);
    
  return { data, error };
};
```

### **2. SEARCH TRACKS - EXACT WORKING CODE**

**✅ Exact field names in `audio_tracks` table:**
- `id` ✅
- `title` ✅
- `description` ✅
- `file_url` ✅ (NOT `audio_url`)
- `cover_art_url` ✅ (NOT `cover_image_url`)
- `duration` ✅
- `genre` ✅
- `play_count` ✅
- `likes_count` ✅ (NOT `like_count`)
- `is_public` ✅
- `creator_id` ✅
- `created_at` ✅

**✅ Working search tracks query:**
```typescript
const searchTracks = async (query: string) => {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select(`
      id,
      title,
      description,
      file_url,
      cover_art_url,
      duration,
      genre,
      play_count,
      likes_count,
      creator_id,
      created_at,
      creator:profiles!audio_tracks_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_public', true)
    .order('play_count', { ascending: false })
    .limit(20);
    
  return { data, error };
};
```

### **3. SEARCH ARTISTS - EXACT WORKING CODE**

**✅ Working search artists query:**
```typescript
const searchArtists = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      location,
      genre,
      role,
      created_at
    `)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
    .eq('role', 'creator')
    .order('username', { ascending: true })
    .limit(10);
    
  return { data, error };
};
```

**✅ With stats (followers/tracks counts):**
```typescript
const searchArtistsWithStats = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      location,
      genre,
      role,
      created_at,
      followers:follows!follows_following_id_fkey(count),
      tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
    `)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
    .eq('role', 'creator')
    .order('username', { ascending: true })
    .limit(10);
    
  return { data, error };
};
```

### **4. SEARCH EVENTS - EXACT WORKING CODE**

**✅ Exact field names in `events` table:**
- `id` ✅
- `title` ✅
- `description` ✅
- `event_date` ✅
- `location` ✅
- `venue` ✅
- `category` ✅
- `price_gbp` ✅
- `price_ngn` ✅
- `image_url` ✅
- `creator_id` ✅
- `created_at` ✅

**✅ Working search events query:**
```typescript
const searchEvents = async (query: string) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      event_date,
      location,
      venue,
      category,
      price_gbp,
      price_ngn,
      image_url,
      creator_id,
      created_at,
      organizer:profiles!events_creator_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(20);
    
  return { data, error };
};
```

### **5. COMPLETE DISCOVER SCREEN IMPLEMENTATION**

**✅ Copy-paste ready code for DiscoverScreen:**
```typescript
// DiscoverScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

export default function DiscoverScreen() {
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    tracks: [],
    artists: [],
    events: []
  });
  const [loading, setLoading] = useState(true);

  // Load featured artists
  const loadFeaturedArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          genre,
          role,
          created_at,
          followers:follows!follows_following_id_fkey(count),
          tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setFeaturedArtists(data || []);
    } catch (error) {
      console.error('Error loading featured artists:', error);
    }
  };

  // Search tracks
  const searchTracks = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          file_url,
          cover_art_url,
          duration,
          genre,
          play_count,
          likes_count,
          creator_id,
          created_at,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  };

  // Search artists
  const searchArtists = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          location,
          genre,
          role,
          created_at,
          followers:follows!follows_following_id_fkey(count),
          tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
        `)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .eq('role', 'creator')
        .order('username', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching artists:', error);
      return [];
    }
  };

  // Search events
  const searchEvents = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          venue,
          category,
          price_gbp,
          price_ngn,
          image_url,
          creator_id,
          created_at,
          organizer:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [], events: [] });
      return;
    }

    setLoading(true);
    try {
      const [tracks, artists, events] = await Promise.all([
        searchTracks(query),
        searchArtists(query),
        searchEvents(query)
      ]);

      setSearchResults({ tracks, artists, events });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedArtists();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Search Bar */}
      <View style={{ padding: 16 }}>
        <TextInput
          style={{
            backgroundColor: 'white',
            padding: 12,
            borderRadius: 8,
            fontSize: 16
          }}
          placeholder="Search tracks, artists, events..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            handleSearch(text);
          }}
        />
      </View>

      {/* Featured Artists */}
      {!searchQuery && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
            Featured Artists
          </Text>
          {featuredArtists.map((artist) => (
            <View key={artist.id} style={{ 
              backgroundColor: 'white', 
              padding: 16, 
              marginBottom: 12, 
              borderRadius: 8 
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>
                {artist.display_name}
              </Text>
              <Text style={{ fontSize: 14, color: '#666' }}>
                @{artist.username}
              </Text>
              {artist.bio && (
                <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                  {artist.bio}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Search Results */}
      {searchQuery && (
        <View style={{ padding: 16 }}>
          {/* Tracks Results */}
          {searchResults.tracks.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
                Tracks ({searchResults.tracks.length})
              </Text>
              {searchResults.tracks.map((track) => (
                <View key={track.id} style={{ 
                  backgroundColor: 'white', 
                  padding: 16, 
                  marginBottom: 12, 
                  borderRadius: 8 
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>
                    {track.title}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {track.creator?.display_name || 'Unknown Artist'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Artists Results */}
          {searchResults.artists.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
                Artists ({searchResults.artists.length})
              </Text>
              {searchResults.artists.map((artist) => (
                <View key={artist.id} style={{ 
                  backgroundColor: 'white', 
                  padding: 16, 
                  marginBottom: 12, 
                  borderRadius: 8 
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>
                    {artist.display_name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    @{artist.username}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Events Results */}
          {searchResults.events.length > 0 && (
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
                Events ({searchResults.events.length})
              </Text>
              {searchResults.events.map((event) => (
                <View key={event.id} style={{ 
                  backgroundColor: 'white', 
                  padding: 16, 
                  marginBottom: 12, 
                  borderRadius: 8 
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>
                    {event.title}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {new Date(event.event_date).toLocaleDateString()} • {event.location}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
```

### **KEY POINTS FOR MOBILE TEAM:**

1. **NO `is_creator` field** - Use `role = 'creator'` instead
2. **NO `is_verified` field** - This doesn't exist in current schema
3. **Counts are COMPUTED** - Use Supabase relationships to get counts
4. **Field names are exact** - `file_url`, `cover_art_url`, `play_count`, `likes_count`
5. **Use `.or()` for search** - Multiple field search with ILIKE
6. **Include creator info** - Use relationships to get creator details

This is the exact working code that matches the current database schema.