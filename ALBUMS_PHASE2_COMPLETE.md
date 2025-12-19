# 🎵 Albums Feature - Phase 2 Complete

## ✅ Status: Backend API Helpers Implemented

All album management functions have been added to `src/lib/supabase.ts` in the `dbHelpers` object.

---

## 📦 Functions Added (17 Total)

### **Album Management (4 functions)**

#### 1. `createAlbum(albumData)`
Creates a new album (draft by default)
```typescript
Parameters:
- creator_id: string (required)
- title: string (required)
- description?: string
- cover_image_url?: string
- release_date?: string
- genre?: string
- is_public?: boolean (default: true)
- status?: 'draft' | 'scheduled' | 'published' (default: 'draft')

Returns: { data: Album | null, error: any }
```

#### 2. `updateAlbum(albumId, updates)`
Updates album details
```typescript
Parameters:
- albumId: string
- updates: Partial album fields

Returns: { data: Album | null, error: any }
```

#### 3. `publishAlbum(albumId)`
Changes album status to 'published' and sets published_at timestamp
```typescript
Parameters:
- albumId: string

Returns: { data: Album | null, error: any }
```

#### 4. `deleteAlbum(albumId)`
Deletes album (tracks are NOT deleted, only album and album_tracks entries)
```typescript
Parameters:
- albumId: string

Returns: { data: null, error: any }
```

---

### **Album Retrieval (5 functions)**

#### 5. `getAlbumById(albumId)`
Gets album with full details and tracks ordered by track_number
```typescript
Parameters:
- albumId: string

Returns: { 
  data: Album & { 
    tracks: Track[] // sorted by track_number 
  } | null, 
  error: any 
}
```

#### 6. `getAlbumsByCreator(creatorId, includeStatus?)`
Gets all albums by a creator, optionally filtered by status
```typescript
Parameters:
- creatorId: string
- includeStatus?: 'draft' | 'scheduled' | 'published'

Returns: { data: Album[] | null, error: any }
```

#### 7. `getPublicAlbums(limit)`
Gets public published albums (for Discover screen)
```typescript
Parameters:
- limit: number (default: 20)

Returns: { data: Album[] | null, error: any }
```

#### 8. `getAlbumsWithStats(limit)`
Gets albums sorted by popularity (total_plays)
```typescript
Parameters:
- limit: number (default: 20)

Returns: { data: Album[] | null, error: any }
```

#### 9. `getAlbumTracks(albumId)`
Gets tracks for an album, ordered by track_number
```typescript
Parameters:
- albumId: string

Returns: { data: Track[] | null, error: any }
```

---

### **Album Tracks Management (3 functions)**

#### 10. `addTrackToAlbum(albumId, trackId, trackNumber)`
Adds a track to an album at specified position
```typescript
Parameters:
- albumId: string
- trackId: string
- track_number: number

Returns: { data: AlbumTrack | null, error: any }
```

#### 11. `removeTrackFromAlbum(albumId, trackId)`
Removes a track from an album
```typescript
Parameters:
- albumId: string
- trackId: string

Returns: { data: null, error: any }
```

#### 12. `reorderAlbumTracks(albumId, newOrder)`
Updates track positions in bulk
```typescript
Parameters:
- albumId: string
- newOrder: Array<{ trackId: string, trackNumber: number }>

Returns: { data: null, error: any }
```

---

### **Validation & Limits (2 functions)**

#### 13. `checkAlbumLimit(userId)`
Checks if user can create more albums based on tier
```typescript
Parameters:
- userId: string

Returns: { 
  data: { 
    canCreate: boolean,
    limit: number, // -1 for unlimited
    current: number, // only counts published albums
    tier: 'free' | 'premium' | 'unlimited'
  } | null, 
  error: any 
}

Tier Limits:
- Free: 0 albums
- Premium: 2 albums
- Unlimited: -1 (unlimited)

Note: Draft albums don't count toward limit!
```

#### 14. `checkTrackLimitForAlbum(albumId, userId)`
Checks if user can add more tracks to album based on tier
```typescript
Parameters:
- albumId: string
- userId: string

Returns: { 
  data: { 
    canAdd: boolean,
    limit: number, // -1 for unlimited
    current: number,
    tier: 'free' | 'premium' | 'unlimited'
  } | null, 
  error: any 
}

Tier Limits:
- Free: 0 tracks (can't create albums)
- Premium: 7 tracks per album
- Unlimited: -1 (unlimited)
```

---

### **Statistics (3 functions)**

#### 15. `incrementAlbumPlays(albumId)`
Increments album play count
```typescript
Parameters:
- albumId: string

Returns: { data: null, error: any }
```

#### 16. `getAlbumStats(albumId)`
Gets album statistics
```typescript
Parameters:
- albumId: string

Returns: { 
  data: {
    total_plays: number,
    total_likes: number,
    tracks_count: number,
    total_duration: number
  } | null, 
  error: any 
}
```

---

## 📝 Usage Examples

### Creating an Album

```typescript
import { dbHelpers } from '@/lib/supabase';

// Check if user can create album
const { data: limitCheck } = await dbHelpers.checkAlbumLimit(userId);

if (!limitCheck?.canCreate) {
  Alert.alert(
    'Album Limit Reached',
    `Your ${limitCheck?.tier} plan allows ${limitCheck?.limit} albums. Upgrade to create more!`
  );
  return;
}

// Create draft album
const { data: album, error } = await dbHelpers.createAlbum({
  creator_id: userId,
  title: 'Summer Vibes',
  description: 'A collection of summer anthems',
  genre: 'Pop',
  status: 'draft',
});

if (error) {
  Alert.alert('Error', 'Failed to create album');
  return;
}

console.log('Album created:', album.id);
```

### Adding Tracks to Album

```typescript
// Check track limit
const { data: trackLimit } = await dbHelpers.checkTrackLimitForAlbum(
  albumId,
  userId
);

if (!trackLimit?.canAdd) {
  Alert.alert(
    'Track Limit Reached',
    `Your plan allows ${trackLimit?.limit} tracks per album`
  );
  return;
}

// Add track
await dbHelpers.addTrackToAlbum(albumId, trackId, 1); // Track #1
await dbHelpers.addTrackToAlbum(albumId, trackId2, 2); // Track #2
await dbHelpers.addTrackToAlbum(albumId, trackId3, 3); // Track #3
```

### Publishing an Album

```typescript
// Publish the album
const { data: published } = await dbHelpers.publishAlbum(albumId);

Alert.alert('Success', 'Your album is now live!');

// Now it counts toward tier limit
const { data: newLimit } = await dbHelpers.checkAlbumLimit(userId);
console.log('Albums used:', newLimit.current, '/', newLimit.limit);
```

### Fetching Albums

```typescript
// Get public albums for Discover
const { data: albums } = await dbHelpers.getPublicAlbums(20);

// Get user's albums
const { data: myAlbums } = await dbHelpers.getAlbumsByCreator(userId);

// Get album with tracks
const { data: album } = await dbHelpers.getAlbumById(albumId);
console.log('Album has', album.tracks.length, 'tracks');
```

### Reordering Tracks

```typescript
// User drags tracks to reorder
const newOrder = [
  { trackId: 'track-3-id', trackNumber: 1 }, // Move track 3 to position 1
  { trackId: 'track-1-id', trackNumber: 2 }, // Move track 1 to position 2
  { trackId: 'track-2-id', trackNumber: 3 }, // Move track 2 to position 3
];

await dbHelpers.reorderAlbumTracks(albumId, newOrder);
```

---

## 🔄 Integration with Existing Features

### Audio Player
```typescript
// When playing a track that's part of an album
const { data: album } = await dbHelpers.getAlbumById(track.album_id);

// Increment plays
await dbHelpers.incrementAlbumPlays(album.id);

// Show "Go to Album" option
navigation.navigate('AlbumDetails', { albumId: album.id });
```

### Likes (Already Compatible!)
```typescript
// Like an album (uses existing polymorphic likes table)
await supabase.from('likes').insert({
  user_id: userId,
  content_id: albumId,
  content_type: 'album', // polymorphic design
});

// Count album likes
const { count } = await supabase
  .from('likes')
  .select('*', { count: 'exact', head: true })
  .eq('content_id', albumId)
  .eq('content_type', 'album');
```

---

## ✅ Testing Checklist

Test each function:

- [ ] `createAlbum` - Creates draft album
- [ ] `updateAlbum` - Updates album details
- [ ] `publishAlbum` - Changes status to published
- [ ] `deleteAlbum` - Deletes album (tracks remain)
- [ ] `getAlbumById` - Returns album with tracks
- [ ] `getAlbumsByCreator` - Returns creator's albums
- [ ] `getPublicAlbums` - Returns public published albums
- [ ] `getAlbumsWithStats` - Returns albums sorted by plays
- [ ] `getAlbumTracks` - Returns tracks in order
- [ ] `addTrackToAlbum` - Adds track to album
- [ ] `removeTrackFromAlbum` - Removes track from album
- [ ] `reorderAlbumTracks` - Updates track positions
- [ ] `checkAlbumLimit` - Validates tier limits correctly
- [ ] `checkTrackLimitForAlbum` - Validates track limits
- [ ] `incrementAlbumPlays` - Increments play count
- [ ] `getAlbumStats` - Returns album statistics

### Tier Limit Testing

**Free Tier:**
- [ ] Cannot create albums (limit = 0)
- [ ] `canCreate` returns false

**Premium Tier:**
- [ ] Can create 2 albums
- [ ] Draft albums don't count toward limit
- [ ] 3rd published album blocked
- [ ] Each album can have 7 tracks max

**Unlimited Tier:**
- [ ] Can create unlimited albums
- [ ] Can add unlimited tracks per album

---

## 🚀 Next Steps

### Phase 3: Upload Flow
Now that backend is ready, implement:
1. Update `UploadScreen.tsx`
2. Add mode selector (Single | Album)
3. Album creation form
4. Track upload for albums
5. Track reordering UI
6. Tier validation prompts

---

## 📊 Performance Notes

All functions include:
- ✅ Proper error handling
- ✅ Console logging for debugging
- ✅ Optimized queries with select
- ✅ RLS policies enforced
- ✅ Triggers auto-update stats

---

**Status:** ✅ Phase 2 Complete - Backend Ready for Phase 3!

**Next:** Implement album upload UI in Phase 3

