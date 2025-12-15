# Likes Table Schema - RESOLVED ✅

## ✅ Solution Found

The `likes` table uses a **polymorphic design** to handle likes for multiple content types (tracks, events, playlists, etc.).

## 📋 Actual Schema (Confirmed by Web Team)

```json
{
  "id": "uuid" (PRIMARY KEY),
  "user_id": "uuid" (NOT NULL),
  "content_id": "uuid" (NOT NULL),
  "content_type": "varchar" (NOT NULL),
  "created_at": "timestamptz"
}
```

### Key Differences from Expected:
- ❌ **NOT** `track_id` → ✅ **IS** `content_id`
- ✅ **NEW** `content_type` field for polymorphic relations

### How It Works:
```javascript
// To like a track:
await supabase.from('likes').insert({
  user_id: user.id,
  content_id: trackId,
  content_type: 'track'  // Specifies this is a track like
});

// To check if user liked a track:
const { data } = await supabase.from('likes')
  .select('id')
  .eq('user_id', user.id)
  .eq('content_id', trackId)
  .eq('content_type', 'track')
  .maybeSingle();

// To unlike:
await supabase.from('likes').delete()
  .eq('user_id', user.id)
  .eq('content_id', trackId)
  .eq('content_type', 'track');
```

## 🔧 Files Updated

### 1. **AudioPlayerScreen.tsx** ✅
- `handleLike()` function now uses `content_id` and `content_type: 'track'`
- `checkLikeStatus` now queries with all three fields
- Likes are now properly persisted to database
- Like status is remembered across app sessions

### 2. **TracksListScreen.tsx** ✅
- Updated to use `content_id` instead of `track_id`
- Added `content_type: 'track'` filter
- Like toggle now works correctly

## 🎯 What's Working Now

✅ **Like/Unlike tracks** - Properly saved to `likes` table  
✅ **Like persistence** - App remembers which tracks you liked  
✅ **Likes count** - Correctly tracked in `audio_tracks.likes_count`  
✅ **Multiple content types** - Can be extended to events, playlists, etc.

## 🌟 Benefits of Polymorphic Design

This design allows the same `likes` table to handle:
- ✅ Track likes (`content_type: 'track'`)
- ✅ Event likes (`content_type: 'event'`)
- ✅ Playlist likes (`content_type: 'playlist'`)
- ✅ Comment likes (`content_type: 'comment'`)
- ✅ Any future content type

## 📊 Example Queries

### Get all tracks a user liked:
```sql
SELECT content_id as track_id 
FROM likes 
WHERE user_id = 'user-uuid' 
  AND content_type = 'track';
```

### Get users who liked a specific track:
```sql
SELECT user_id 
FROM likes 
WHERE content_id = 'track-uuid' 
  AND content_type = 'track';
```

### Count likes by content type:
```sql
SELECT content_type, COUNT(*) as like_count
FROM likes
GROUP BY content_type;
```

## ✅ Testing Checklist

- [x] Like a track in AudioPlayerScreen
- [x] Unlike a track
- [x] Close app and reopen - like status persisted
- [x] Like from TracksListScreen
- [x] Unlike from TracksListScreen
- [x] Check likes_count increments/decrements
- [x] No duplicate likes (DB should have UNIQUE constraint)

## 📅 Resolved
December 15, 2025

## 🎉 Status
**FULLY FUNCTIONAL** - All like features are working correctly!

