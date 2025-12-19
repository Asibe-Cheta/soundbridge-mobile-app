# 🎵 Albums Feature - Implementation Guide

## Status: Phase 1 Ready for Execution

This guide walks you through implementing the albums feature for SoundBridge, following the plan in `ALBUM_FEATURE_SETUP.md`.

---

## ✅ Phase 1: Database Setup (Do This Now)

### Step 1: Run the SQL Script

1. Open **Supabase Dashboard** → Your SoundBridge project
2. Go to **SQL Editor**
3. Create new query
4. Copy and paste the entire contents of `CREATE_ALBUMS_TABLES.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Verify success messages appear

**Expected Results:**
- ✅ `albums` table created
- ✅ `album_tracks` table created
- ✅ 6 indexes created
- ✅ 3 triggers created
- ✅ 7 RLS policies created
- ✅ Verification queries show counts

### Step 2: Create Storage Bucket

Since storage buckets can't be created via SQL, you must create it manually:

1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"**
3. Bucket settings:
   - **Name:** `album-covers`
   - **Public bucket:** ✅ **Yes** (enable public access)
   - **File size limit:** 2 MB
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp`

4. After bucket is created, set up **Storage Policies**:

**Policy 1: Public can view album covers**
```sql
-- SELECT policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'album-covers' );
```

**Policy 2: Users can upload to their own folder**
```sql
-- INSERT policy
CREATE POLICY "Users can upload own covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'album-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Users can update their own covers**
```sql
-- UPDATE policy
CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'album-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 4: Users can delete their own covers**
```sql
-- DELETE policy
CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'album-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Test the Setup (Optional)

To create test albums, uncomment section 13 in `CREATE_ALBUMS_TABLES.sql` and run it separately:

```sql
-- Copy lines 383-449 from CREATE_ALBUMS_TABLES.sql
-- The section starting with "DO $$"
```

This will create 2 sample albums for testing.

### Step 4: Verify Everything Works

Run these verification queries:

```sql
-- Check albums table exists
SELECT COUNT(*) FROM albums;

-- Check album_tracks table exists
SELECT COUNT(*) FROM album_tracks;

-- Check RLS policies
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('albums', 'album_tracks');

-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'album-covers';
```

---

## ⏳ Phase 2: Backend API (Next Task)

**When Phase 1 is complete**, I'll create these helper functions in `src/lib/supabase.ts`:

### Functions to Create:

```typescript
// Album Management
createAlbum(albumData): Promise<Album>
updateAlbum(albumId, updates): Promise<Album>
deleteAlbum(albumId): Promise<void>
publishAlbum(albumId): Promise<Album>

// Album Retrieval
getAlbumById(albumId): Promise<Album>
getAlbumsByCreator(creatorId): Promise<Album[]>
getPublicAlbums(limit): Promise<Album[]>
getUserAlbums(userId): Promise<Album[]>

// Album Tracks Management
addTrackToAlbum(albumId, trackId, trackNumber): Promise<void>
removeTrackFromAlbum(albumId, trackId): Promise<void>
reorderAlbumTracks(albumId, newOrder): Promise<void>
getAlbumTracks(albumId): Promise<Track[]>

// Validation
checkAlbumLimit(userId): Promise<{ canCreate: boolean, limit: number, current: number }>
checkTrackLimitForAlbum(albumId, userId): Promise<{ canAdd: boolean, limit: number, current: number }>

// Statistics
getAlbumStats(albumId): Promise<AlbumStats>
incrementAlbumPlays(albumId): Promise<void>
```

---

## ⏳ Phase 3: Upload Flow (After Phase 2)

Update `UploadScreen.tsx` to add album upload mode:

### UI Changes:

1. **Mode Selector** (top of screen):
   ```
   [ Single Track ] [ Album ]
   ```

2. **Album Mode Flow**:
   - Step 1: Choose "Create New Album" or "Add to Existing"
   - Step 2: Album metadata form (if new)
   - Step 3: Track upload (multi-select)
   - Step 4: Track ordering (drag to reorder)
   - Step 5: Review and publish/save draft

3. **Validation**:
   - Check tier limits before allowing album creation
   - Show upgrade prompt if limit reached
   - Validate track count per album based on tier

---

## ⏳ Phase 4: Album Details Screen (After Phase 3)

Create new `AlbumDetailsScreen.tsx`:

### Features:
- Album cover (300×300px)
- Title, artist, release date
- Description
- Track list with play buttons
- **Play All** button
- Like/Share buttons
- Options menu (edit, delete, schedule)
- Comments section

### Scheduled Albums:
- "Releases on {date}" badge
- Countdown timer
- Pre-save button

---

## ⏳ Phase 5: UI Integration (After Phase 4)

Update existing screens:

### DiscoverScreen
- Add "Albums" tab
- Show featured albums
- New releases section

### ProfileScreen
- Add "Albums" section
- Show album count in stats
- Grid view of user's albums

### CreatorProfileScreen
- "Albums" tab
- Show published albums

### AudioPlayerScreen
- Show album name below track title
- "Go to Album" menu option works
- Show track number (e.g., "Track 3 of 12")

### SearchScreen
- Add "Albums" results
- Filter by albums

---

## 📊 Tier Limits Implementation

When validating album/track limits, use these values:

```typescript
const ALBUM_LIMITS = {
  free: {
    albums: 0,
    tracksPerAlbum: 0,
  },
  premium: {
    albums: 2, // lifetime
    tracksPerAlbum: 7,
  },
  unlimited: {
    albums: -1, // unlimited
    tracksPerAlbum: -1, // unlimited
  },
};
```

**Important:** Draft albums don't count toward limits until published!

---

## 🧪 Testing Checklist

### Phase 1 (Database):
- [ ] Albums table created successfully
- [ ] Album_tracks table created successfully
- [ ] All indexes created
- [ ] All triggers working (test by inserting data)
- [ ] RLS policies enforced correctly
- [ ] Storage bucket created
- [ ] Storage policies working

### Phase 2 (Backend):
- [ ] Create album (draft)
- [ ] Update album metadata
- [ ] Publish album
- [ ] Delete album
- [ ] Add track to album
- [ ] Remove track from album
- [ ] Reorder album tracks
- [ ] Check tier limits
- [ ] Fetch albums by creator
- [ ] Fetch public albums

### Phase 3 (Upload):
- [ ] Upload single track (existing flow)
- [ ] Create new album
- [ ] Add tracks to new album
- [ ] Add track to existing album
- [ ] Upload album cover
- [ ] Reorder tracks in album
- [ ] Save album as draft
- [ ] Publish album immediately
- [ ] Schedule album release
- [ ] Tier limit validation works
- [ ] Upgrade prompts show correctly

### Phase 4 (Album Screen):
- [ ] Album details display correctly
- [ ] Track list shows with numbers
- [ ] Play All button works
- [ ] Individual track play works
- [ ] Like album works
- [ ] Share album works
- [ ] Scheduled albums show countdown
- [ ] Pre-save works
- [ ] Edit album works (creator only)
- [ ] Delete album works (creator only)

### Phase 5 (Integration):
- [ ] Albums tab in Discover
- [ ] Featured albums show
- [ ] New releases show
- [ ] Albums in profile
- [ ] Albums in creator profile
- [ ] Album search works
- [ ] "Go to Album" from player works
- [ ] Track number shows in player

---

## 🚨 Important Notes

1. **Draft Albums Don't Count**
   - Only published albums count toward tier limits
   - Users can create unlimited drafts

2. **Track Reuse**
   - Tracks can be in multiple albums
   - Deleting album doesn't delete tracks
   - Deleting track removes it from all albums

3. **Scheduled Releases**
   - Need cron job to auto-publish albums when `release_date` arrives
   - Send notifications to followers

4. **Storage Costs**
   - Album covers: 2MB max (enforced in upload)
   - Tracks use existing storage quotas
   - No additional costs beyond current limits

5. **Permissions**
   - Only creator can edit/delete albums
   - Published albums visible to everyone
   - Draft/scheduled albums visible to creator only

---

## 📝 Current Status

### ✅ Completed:
- [x] Planning and documentation
- [x] Database schema design
- [x] SQL script created

### ⏳ Pending (Your Tasks):
- [ ] Run SQL script in Supabase
- [ ] Create storage bucket
- [ ] Set up storage policies
- [ ] Test database setup
- [ ] Confirm ready for Phase 2

### 🔜 Next Up (My Tasks):
- [ ] Phase 2: Backend API helpers
- [ ] Phase 3: Upload flow
- [ ] Phase 4: Album details screen
- [ ] Phase 5: UI integration

---

## 🆘 Troubleshooting

### Issue: SQL script fails
**Solution:** Check if tables already exist. Drop them first:
```sql
DROP TABLE IF EXISTS album_tracks CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
```

### Issue: Storage bucket creation fails
**Solution:** Bucket name must be unique. Try `album-covers-soundbridge`

### Issue: RLS policies block legitimate access
**Solution:** Verify user is authenticated and creator_id matches

### Issue: Triggers not firing
**Solution:** Check function exists:
```sql
SELECT * FROM information_schema.routines 
WHERE routine_name LIKE '%album%';
```

---

## 📞 Need Help?

If you encounter issues:
1. Check verification queries in SQL script
2. Review Supabase logs (Dashboard → Logs)
3. Test RLS policies in SQL editor with `set local role authenticated;`
4. Share error messages for debugging

---

**Ready to proceed?** Let me know when Phase 1 is complete and I'll start Phase 2!

