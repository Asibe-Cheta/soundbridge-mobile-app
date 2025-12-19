# 🌐 SoundBridge Web App Implementation Guide

**Date:** December 16, 2025  
**Version:** 1.0  
**Purpose:** Complete implementation guide for web app team to achieve feature parity with mobile app  
**Status:** 📋 Ready for Implementation

---

## 📋 Table of Contents

1. [Database Schemas](#database-schemas)
2. [API Endpoints](#api-endpoints)
3. [Deep Linking & Share URLs](#deep-linking--share-urls)
4. [Tier System & Limits](#tier-system--limits)
5. [Data Structures](#data-structures)
6. [Business Logic](#business-logic)
7. [Row Level Security (RLS)](#row-level-security-rls)
8. [Storage Buckets](#storage-buckets)
9. [Testing & Validation](#testing--validation)

---

## 🗄️ Database Schemas

### **1. Albums Feature**

#### **Albums Table**
```sql
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    release_date DATE, -- Can be future date for scheduled releases
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'published'
    genre VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Auto-calculated fields (updated by triggers)
    tracks_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- in seconds
    
    -- Analytics
    total_plays INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ -- When status changed to 'published'
);

-- Indexes
CREATE INDEX idx_albums_creator_id ON albums(creator_id);
CREATE INDEX idx_albums_status ON albums(status);
CREATE INDEX idx_albums_release_date ON albums(release_date);
CREATE INDEX idx_albums_published_at ON albums(published_at DESC);
CREATE INDEX idx_albums_created_at ON albums(created_at DESC);
CREATE INDEX idx_albums_genre ON albums(genre);
```

#### **Album Tracks Junction Table**
```sql
CREATE TABLE IF NOT EXISTS album_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    track_number INTEGER NOT NULL, -- Position in album (1, 2, 3, etc.)
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(album_id, track_id), -- Track can only appear once per album
    UNIQUE(album_id, track_number) -- No duplicate track numbers in same album
);

-- Indexes
CREATE INDEX idx_album_tracks_album_id ON album_tracks(album_id);
CREATE INDEX idx_album_tracks_track_id ON album_tracks(track_id);
CREATE INDEX idx_album_tracks_track_number ON album_tracks(album_id, track_number);
```

#### **Triggers for Albums**
```sql
-- Function to update album stats
CREATE OR REPLACE FUNCTION update_album_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_album_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_album_id := OLD.album_id;
    ELSE
        target_album_id := NEW.album_id;
    END IF;

    UPDATE albums
    SET 
        tracks_count = (
            SELECT COUNT(*)
            FROM album_tracks
            WHERE album_id = target_album_id
        ),
        total_duration = (
            SELECT COALESCE(SUM(at.duration), 0)
            FROM album_tracks albt
            JOIN audio_tracks at ON albt.track_id = at.id
            WHERE albt.album_id = target_album_id
        ),
        updated_at = NOW()
    WHERE id = target_album_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_album_stats
    AFTER INSERT OR UPDATE OR DELETE ON album_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_album_stats();

-- Function to set published_at timestamp
CREATE OR REPLACE FUNCTION update_album_published_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        NEW.published_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_album_published_at
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_album_published_at();
```

---

### **2. Playlists Feature**

#### **Playlists Table**
```sql
CREATE TABLE IF NOT EXISTS playlists (
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

-- Indexes
CREATE INDEX idx_playlists_creator_id ON playlists(creator_id);
CREATE INDEX idx_playlists_is_public ON playlists(is_public);
CREATE INDEX idx_playlists_created_at ON playlists(created_at DESC);
```

#### **Playlist Tracks Junction Table**
```sql
CREATE TABLE IF NOT EXISTS playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, track_id),
    UNIQUE(playlist_id, position)
);

-- Indexes
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
```

#### **Triggers for Playlists**
```sql
-- Function to update playlist counts
CREATE OR REPLACE FUNCTION update_playlist_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE playlists
    SET 
        tracks_count = (
            SELECT COUNT(*)
            FROM playlist_tracks pt
            WHERE pt.playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id)
        ),
        total_duration = (
            SELECT COALESCE(SUM(at.duration), 0)
            FROM playlist_tracks pt
            JOIN audio_tracks at ON pt.track_id = at.id
            WHERE pt.playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.playlist_id, OLD.playlist_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_playlist_tracks_counts
    AFTER INSERT OR UPDATE OR DELETE ON playlist_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_counts();
```

---

### **3. Likes Table (Polymorphic)**

**Important:** The `likes` table uses a polymorphic design with `content_id` and `content_type`:

```sql
-- Table should already exist, but here's the structure for reference
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content_id UUID NOT NULL, -- Can reference tracks, albums, playlists, events
    content_type VARCHAR(50) NOT NULL, -- 'track', 'album', 'playlist', 'event'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

-- Indexes
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_content_id ON likes(content_id);
CREATE INDEX idx_likes_content_type ON likes(content_type);
```

**Content Types:**
- `'track'` - Track likes
- `'album'` - Album likes
- `'playlist'` - Playlist likes
- `'event'` - Event likes

---

## 🔌 API Endpoints

### **Albums API**

#### **Create Album**
```typescript
POST /api/albums

Body:
{
  creator_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  release_date?: string; // ISO date string
  status?: 'draft' | 'scheduled' | 'published'; // default: 'draft'
  genre?: string;
  is_public?: boolean; // default: true
}

Response:
{
  data: Album;
  error?: string;
}
```

#### **Get Album Details**
```typescript
GET /api/albums/:albumId

Response:
{
  data: {
    album: Album;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
    tracks: Track[]; // Ordered by track_number
  };
  error?: string;
}
```

#### **Update Album**
```typescript
PUT /api/albums/:albumId

Body: Partial<Album>

Response:
{
  data: Album;
  error?: string;
}
```

#### **Delete Album**
```typescript
DELETE /api/albums/:albumId

Response:
{
  success: boolean;
  error?: string;
}
```

#### **Add Track to Album**
```typescript
POST /api/albums/:albumId/tracks

Body:
{
  track_id: string;
  track_number: number;
}

Response:
{
  success: boolean;
  error?: string;
}
```

#### **Remove Track from Album**
```typescript
DELETE /api/albums/:albumId/tracks/:trackId

Response:
{
  success: boolean;
  error?: string;
}
```

#### **Reorder Album Tracks**
```typescript
PUT /api/albums/:albumId/reorder

Body:
{
  track_ids: string[]; // Array of track IDs in new order
}

Response:
{
  success: boolean;
  error?: string;
}
```

#### **Get Albums by Creator**
```typescript
GET /api/creators/:creatorId/albums?status=published

Query Params:
- status?: 'draft' | 'scheduled' | 'published' | 'all'
- limit?: number
- offset?: number

Response:
{
  data: Album[];
  count: number;
  error?: string;
}
```

#### **Get Public Albums (Discovery)**
```typescript
GET /api/albums/public?sort=recent&limit=20

Query Params:
- sort?: 'recent' | 'popular' | 'trending'
- genre?: string
- limit?: number
- offset?: number

Response:
{
  data: Album[];
  count: number;
  error?: string;
}
```

---

### **Playlists API**

#### **Create Playlist**
```typescript
POST /api/playlists

Body:
{
  creator_id: string;
  name: string;
  description?: string;
  is_public?: boolean; // default: true
  cover_image_url?: string;
}

Response:
{
  data: Playlist;
  error?: string;
}
```

#### **Get Playlist Details**
```typescript
GET /api/playlists/:playlistId

Response:
{
  data: {
    playlist: Playlist;
    creator: Creator;
    tracks: Track[]; // Ordered by position
  };
  error?: string;
}
```

#### **Update Playlist**
```typescript
PUT /api/playlists/:playlistId

Body: Partial<Playlist>

Response:
{
  data: Playlist;
  error?: string;
}
```

#### **Add Track to Playlist**
```typescript
POST /api/playlists/:playlistId/tracks

Body:
{
  track_id: string;
  position: number;
}

Response:
{
  success: boolean;
  error?: string;
}
```

#### **Remove Track from Playlist**
```typescript
DELETE /api/playlists/:playlistId/tracks/:trackId

Response:
{
  success: boolean;
  error?: string;
}
```

#### **Get User's Playlists**
```typescript
GET /api/users/:userId/playlists

Query Params:
- include_private?: boolean // Only if userId matches authenticated user

Response:
{
  data: Playlist[];
  count: number;
  error?: string;
}
```

---

### **Likes API (Polymorphic)**

#### **Toggle Like**
```typescript
POST /api/likes/toggle

Body:
{
  user_id: string;
  content_id: string;
  content_type: 'track' | 'album' | 'playlist' | 'event';
}

Response:
{
  data: {
    liked: boolean; // true if like added, false if removed
  };
  error?: string;
}
```

#### **Check Like Status**
```typescript
GET /api/likes/check?user_id={userId}&content_id={contentId}&content_type={type}

Response:
{
  data: {
    isLiked: boolean;
  };
  error?: string;
}
```

#### **Get User's Likes**
```typescript
GET /api/users/:userId/likes?content_type=track

Query Params:
- content_type?: 'track' | 'album' | 'playlist' | 'event' | 'all'
- limit?: number
- offset?: number

Response:
{
  data: Like[];
  count: number;
  error?: string;
}
```

---

## 🔗 Deep Linking & Share URLs

### **URL Structure**

All shareable content uses the domain `soundbridge.live`:

#### **Track Links**
```
https://soundbridge.live/track/[track-id]
```

**Example:**
```
https://soundbridge.live/track/ff707546-6f34-4a31-895a-103612ceb9c4
```

#### **Album Links**
```
https://soundbridge.live/album/[album-id]
```

**Example:**
```
https://soundbridge.live/album/a1b2c3d4-5678-90ab-cdef-1234567890ab
```

#### **Creator Profile Links**
```
https://soundbridge.live/creator/[creator-id]
```

**Example:**
```
https://soundbridge.live/creator/bd8a455d-a54d-45c5-968d-e4cf5e8d928e
```

#### **Playlist Links**
```
https://soundbridge.live/playlist/[playlist-id]
```

**Example:**
```
https://soundbridge.live/playlist/12345678-90ab-cdef-1234-567890abcdef
```

#### **Event Links**
```
https://soundbridge.live/event/[event-id]
```

---

### **Share Message Formats**

#### **Track Share**
```
🎵 Check out "{track.title}" by {artist.display_name} on SoundBridge!

https://soundbridge.live/track/{track.id}
```

#### **Album Share**
```
🎵 Check out "{album.title}" by {artist.display_name} on SoundBridge!

{album.tracks_count} tracks • {formatted_duration}

https://soundbridge.live/album/{album.id}
```

#### **Playlist Share**
```
🎵 Check out "{playlist.name}" by {creator.display_name} on SoundBridge!

{playlist.tracks_count} tracks • {formatted_duration}

https://soundbridge.live/playlist/{playlist.id}
```

#### **Creator Share**
```
👤 Check out {creator.display_name} on SoundBridge!

Follow for amazing music and updates.

https://soundbridge.live/creator/{creator.id}
```

---

### **Web Integration Requirements**

#### **1. Apple App Site Association (iOS)**
**File:** `https://soundbridge.live/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.soundbridge.mobile",
        "paths": [
          "/track/*",
          "/album/*",
          "/creator/*",
          "/event/*",
          "/playlist/*"
        ]
      }
    ]
  }
}
```

**Requirements:**
- Content-Type: `application/json`
- HTTPS only
- No redirects
- Must be at root domain

#### **2. Digital Asset Links (Android)**
**File:** `https://soundbridge.live/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.soundbridge.mobile",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

#### **3. Open Graph Tags (Social Media Previews)**

**Track Page:**
```html
<meta property="og:type" content="music.song">
<meta property="og:title" content="{track.title} - {artist.name}">
<meta property="og:description" content="Listen to {track.title} by {artist.name} on SoundBridge">
<meta property="og:image" content="{track.cover_art_url}">
<meta property="og:url" content="https://soundbridge.live/track/{track.id}">
<meta property="og:site_name" content="SoundBridge">

<meta name="twitter:card" content="player">
<meta name="twitter:title" content="{track.title} - {artist.name}">
<meta name="twitter:image" content="{track.cover_art_url}">
```

**Album Page:**
```html
<meta property="og:type" content="music.album">
<meta property="og:title" content="{album.title} - {artist.name}">
<meta property="og:description" content="{album.tracks_count} tracks • {duration}">
<meta property="og:image" content="{album.cover_image_url}">
<meta property="og:url" content="https://soundbridge.live/album/{album.id}">
```

---

## 💎 Tier System & Limits

### **Current Tier Structure**

| Tier | Price | Upload Limits | Album Limits | Tracks per Album |
|------|-------|---------------|--------------|------------------|
| **Free** | £0 | 3 tracks (lifetime) | 0 albums | N/A |
| **Premium** | £6.99/mo or £69.99/yr | 7 uploads/month | 2 albums max | 7 tracks max |
| **Unlimited** | £12.99/mo or £129.99/yr | Unlimited | Unlimited | Unlimited |

### **Validation Rules**

#### **Album Creation**
```typescript
function canCreateAlbum(user: User): boolean {
  if (user.tier === 'free') {
    return false; // No albums for free users
  }
  
  if (user.tier === 'premium') {
    const publishedAlbumsCount = getUserPublishedAlbumsCount(user.id);
    return publishedAlbumsCount < 2; // Max 2 published albums
  }
  
  if (user.tier === 'unlimited') {
    return true; // No limits
  }
  
  return false;
}
```

#### **Track Addition to Album**
```typescript
function canAddTrackToAlbum(user: User, album: Album): boolean {
  if (user.tier === 'unlimited') {
    return true;
  }
  
  if (user.tier === 'premium') {
    return album.tracks_count < 7; // Max 7 tracks per album
  }
  
  return false;
}
```

#### **Monthly Upload Quota**
```typescript
function checkUploadQuota(user: User): boolean {
  if (user.tier === 'unlimited') {
    return true;
  }
  
  if (user.tier === 'premium') {
    const uploadsThisMonth = getUserUploadsThisMonth(user.id);
    return uploadsThisMonth < 7; // Max 7 uploads/month
  }
  
  if (user.tier === 'free') {
    const totalUploads = getUserTotalUploads(user.id);
    return totalUploads < 3; // Max 3 lifetime
  }
  
  return false;
}
```

---

## 📦 Data Structures

### **Album**
```typescript
interface Album {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  release_date?: string; // ISO date
  status: 'draft' | 'scheduled' | 'published';
  genre?: string;
  is_public: boolean;
  tracks_count: number;
  total_duration: number; // seconds
  total_plays: number;
  total_likes: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  published_at?: string; // ISO timestamp
}
```

### **AlbumTrack**
```typescript
interface AlbumTrack {
  id: string;
  album_id: string;
  track_id: string;
  track_number: number;
  added_at: string; // ISO timestamp
}
```

### **Playlist**
```typescript
interface Playlist {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
  tracks_count: number;
  total_duration: number; // seconds
  followers_count: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
```

### **PlaylistTrack**
```typescript
interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string; // ISO timestamp
}
```

### **Like**
```typescript
interface Like {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'album' | 'playlist' | 'event';
  created_at: string; // ISO timestamp
}
```

### **Track** (Existing, for reference)
```typescript
interface Track {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  file_url: string; // or audio_url
  cover_art_url?: string; // or artwork_url
  duration: number; // seconds
  genre?: string;
  is_public: boolean;
  play_count: number; // or plays_count
  likes_count: number;
  created_at: string;
  updated_at: string;
}
```

**Important Field Name Consistency:**
The mobile app uses these field names for tracks:
- `file_url` or `audio_url`
- `cover_art_url` or `artwork_url`
- `play_count` or `plays_count`
- `likes_count`

Ensure API responses use consistent field names.

---

## 🔒 Row Level Security (RLS)

### **Albums RLS Policies**

```sql
-- View published public albums
CREATE POLICY "view_public_albums" ON albums FOR SELECT
USING (
    (is_public = true AND status = 'published')
    OR auth.uid() = creator_id
);

-- View scheduled public albums (for pre-save)
CREATE POLICY "view_scheduled_albums" ON albums FOR SELECT
USING (
    (is_public = true AND status = 'scheduled')
    OR auth.uid() = creator_id
);

-- Create own albums
CREATE POLICY "create_own_albums" ON albums FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Update own albums
CREATE POLICY "update_own_albums" ON albums FOR UPDATE
USING (auth.uid() = creator_id);

-- Delete own albums
CREATE POLICY "delete_own_albums" ON albums FOR DELETE
USING (auth.uid() = creator_id);
```

### **Album Tracks RLS Policies**

```sql
-- View album tracks
CREATE POLICY "view_album_tracks" ON album_tracks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM albums
        WHERE id = album_id
        AND (
            (is_public = true AND (status = 'published' OR status = 'scheduled'))
            OR creator_id = auth.uid()
        )
    )
);

-- Manage own album tracks
CREATE POLICY "manage_album_tracks" ON album_tracks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM albums
        WHERE id = album_id
        AND creator_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM albums
        WHERE id = album_id
        AND creator_id = auth.uid()
    )
);
```

### **Playlists RLS Policies**

```sql
-- View public playlists
CREATE POLICY "Public playlists are viewable by everyone" ON playlists FOR SELECT 
USING (is_public = true OR auth.uid() = creator_id);

-- Create own playlists
CREATE POLICY "Users can insert their own playlists" ON playlists FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Update own playlists
CREATE POLICY "Users can update their own playlists" ON playlists FOR UPDATE 
USING (auth.uid() = creator_id);

-- Delete own playlists
CREATE POLICY "Users can delete their own playlists" ON playlists FOR DELETE 
USING (auth.uid() = creator_id);
```

### **Playlist Tracks RLS Policies**

```sql
-- View tracks in public playlists
CREATE POLICY "Anyone can view tracks in public playlists" ON playlist_tracks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM playlists 
        WHERE id = playlist_id 
        AND (is_public = true OR creator_id = auth.uid())
    )
);

-- Manage tracks in own playlists
CREATE POLICY "Users can manage tracks in their own playlists" ON playlist_tracks FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM playlists 
        WHERE id = playlist_id 
        AND creator_id = auth.uid()
    )
);
```

---

## 📁 Storage Buckets

### **Album Covers**
- **Bucket Name:** `album-covers`
- **Public:** Yes (read-only)
- **Path Structure:** `{creator_id}/{album_id}.jpg`
- **Max File Size:** 2MB
- **Allowed Types:** JPG, PNG, WEBP

### **Playlist Covers**
- **Bucket Name:** `playlist-covers` (or use existing bucket)
- **Public:** Yes (read-only)
- **Path Structure:** `{creator_id}/{playlist_id}.jpg`
- **Max File Size:** 2MB

### **Storage Policies**
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'album-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view all album covers
CREATE POLICY "Public can view album covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'album-covers');

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'album-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'album-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🧪 Testing & Validation

### **Test Cases for Albums**

1. **Create Album**
   - ✅ Free user cannot create album (returns error)
   - ✅ Premium user can create up to 2 albums
   - ✅ Premium user cannot create 3rd album (returns error)
   - ✅ Unlimited user can create unlimited albums
   - ✅ Album created with status 'draft' by default

2. **Add Tracks to Album**
   - ✅ Premium user can add up to 7 tracks
   - ✅ Premium user cannot add 8th track (returns error)
   - ✅ Unlimited user can add unlimited tracks
   - ✅ Track count auto-updates
   - ✅ Total duration auto-updates

3. **Publish Album**
   - ✅ Status changes from 'draft' to 'published'
   - ✅ `published_at` timestamp is set
   - ✅ Album appears in public discovery

4. **Schedule Album**
   - ✅ Status set to 'scheduled' with future `release_date`
   - ✅ Album shows "Coming Soon" badge
   - ✅ Album auto-publishes on release date

5. **Like Album**
   - ✅ Like inserted with `content_type: 'album'`
   - ✅ `total_likes` count updates
   - ✅ Toggle like removes like

6. **Delete Album**
   - ✅ Album and all album_tracks cascade delete
   - ✅ Tracks themselves are NOT deleted (only junction records)

### **Test Cases for Playlists**

1. **Create Playlist**
   - ✅ All users can create playlists
   - ✅ Public/private toggle works

2. **Add Tracks**
   - ✅ Track count auto-updates
   - ✅ Total duration auto-updates
   - ✅ Position numbers unique per playlist

3. **Reorder Tracks**
   - ✅ Position numbers update correctly
   - ✅ No duplicate positions

4. **View Public Playlists**
   - ✅ Discover screen shows public playlists
   - ✅ Private playlists hidden from others

5. **Like Playlist**
   - ✅ Like inserted with `content_type: 'playlist'`

### **Test Cases for Deep Linking**

1. **Track Link**
   - ✅ Opens TrackDetailsScreen in mobile app
   - ✅ Falls back to web player if app not installed

2. **Album Link**
   - ✅ Opens AlbumDetailsScreen in mobile app
   - ✅ Falls back to web page if app not installed

3. **Playlist Link**
   - ✅ Opens PlaylistDetailsScreen in mobile app
   - ✅ Falls back to web page if app not installed

4. **Creator Link**
   - ✅ Opens CreatorProfileScreen in mobile app
   - ✅ Falls back to web page if app not installed

---

## 📝 Implementation Checklist

### **Phase 1: Database** ⏳
- [ ] Run `CREATE_ALBUMS_TABLES.sql` in Supabase SQL Editor
- [ ] Run `CREATE_PLAYLISTS_TABLES.sql` in Supabase SQL Editor
- [ ] Verify tables created with indexes and triggers
- [ ] Verify RLS policies enabled
- [ ] Create `album-covers` storage bucket
- [ ] Configure storage policies

### **Phase 2: API Endpoints** ⏳
- [ ] Implement Albums API (create, read, update, delete)
- [ ] Implement Album Tracks API (add, remove, reorder)
- [ ] Implement Playlists API (create, read, update, delete)
- [ ] Implement Playlist Tracks API (add, remove, reorder)
- [ ] Implement Likes API (polymorphic toggle, check, get)
- [ ] Add tier validation to create/update endpoints

### **Phase 3: Web Pages** ⏳
- [ ] Create web page for `/track/[id]`
- [ ] Create web page for `/album/[id]`
- [ ] Create web page for `/playlist/[id]`
- [ ] Create web page for `/creator/[id]`
- [ ] Add Open Graph meta tags to all pages
- [ ] Add Twitter Card meta tags

### **Phase 4: Deep Linking** ⏳
- [ ] Host `.well-known/apple-app-site-association`
- [ ] Host `.well-known/assetlinks.json`
- [ ] Configure HTTPS with no redirects
- [ ] Test universal links on iOS
- [ ] Test universal links on Android

### **Phase 5: Testing** ⏳
- [ ] Test all API endpoints with Postman/Insomnia
- [ ] Test tier validation logic
- [ ] Test auto-calculated fields (counts, durations)
- [ ] Test RLS policies (can't access others' private content)
- [ ] Test deep links from shared messages
- [ ] Test social media link previews

---

## 📚 Reference Files

**All implementation details are in these files:**

### **Database Schemas:**
- `CREATE_ALBUMS_TABLES.sql` - Complete albums schema with triggers and RLS
- `CREATE_PLAYLISTS_TABLES.sql` - Complete playlists schema with triggers and RLS

### **Documentation:**
- `ALBUM_FEATURE_SETUP.md` - Full album feature specification
- `SHARE_LINKS_AND_DEEP_LINKING.md` - Complete deep linking guide
- `ALBUMS_IMPLEMENTATION_GUIDE.md` - Mobile app implementation guide

### **API Reference:**
- Mobile app uses `src/lib/supabase.ts` → `dbHelpers` functions as reference

---

## 🚀 Summary

**What the Mobile App Has:**
- ✅ Albums feature (create, view, edit, delete)
- ✅ Playlists feature (create, view, add tracks)
- ✅ "Add to Playlist" from music player
- ✅ "My Albums" section in profile
- ✅ "My Playlists" section in profile
- ✅ Albums tab in Discover screen
- ✅ Share tracks with deep links
- ✅ Share albums with deep links
- ✅ Share playlists with deep links
- ✅ "Go to Album" from music player
- ✅ Polymorphic likes system
- ✅ Tier-based upload/album limits
- ✅ Album cover uploads (2MB max)

**What the Web App Needs:**
1. **Database:** Run SQL scripts to create tables, triggers, RLS policies
2. **API:** Implement REST endpoints for albums, playlists, likes
3. **Web Pages:** Create landing pages for shared links with Open Graph tags
4. **Deep Linking:** Host AASA and assetlinks.json files
5. **Storage:** Create storage buckets for album/playlist covers
6. **Validation:** Implement tier-based limits on creation/upload

**Result:** Full feature parity between mobile and web apps! 🎉

---

**Questions?** Contact the mobile team for clarification on any implementation details.

