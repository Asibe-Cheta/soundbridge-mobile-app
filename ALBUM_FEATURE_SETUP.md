Excellent point! Let me first check your existing tier system before proposing anything. Let me find those files:

[6 tools called]

Perfect! Now I have the full picture. Let me revise the entire album feature plan based on your **actual tier system**:

---

# 🎵 **Revised Album Feature Implementation Plan**
### (Conformed to Existing SoundBridge Tier Structure)

---

## 📊 **Your Current Tier System**

| Tier | Price | Upload Limits | Reset Cycle |
|------|-------|---------------|-------------|
| **Free** | £0 | **3 tracks** (lifetime, not monthly) | - |
| **Premium** | £6.99/mo or £69.99/yr | **7 uploads/month** | Monthly (on renewal) |
| **Unlimited** | £12.99/mo or £129.99/yr | **Unlimited uploads** | - |

---

## 🎯 **Album Limits (Economic & Startup-Friendly)**

### **FREE Tier - £0**
- **0 albums** allowed
- **3 single tracks only** (existing limit)
- ❌ Cannot create albums
- ✅ Can add existing singles to other users' public playlists
- **Why:** Free users test the platform with singles, albums are a premium feature

### **PREMIUM Tier - £6.99/month**
- **2 albums maximum** (lifetime, not monthly)
- **Each album: Up to 7 tracks**
- **Singles:** Unlimited singles (within 7/month upload limit)
- **Conversion:** Can convert existing singles into albums
- **Drafts:** Yes, can save album drafts
- **Scheduled Releases:** Yes, albums only (singles go live immediately)
- **Why:** Encourages upgrade for artists releasing EPs/mini-albums

### **UNLIMITED Tier - £12.99/month**
- **Unlimited albums**
- **Each album: Unlimited tracks**
- **Everything from Premium** + no restrictions
- **Why:** For serious artists with full discographies

---

## 💡 **Key Design Decisions (Based on Your Answers)**

### 1. **Singles ↔ Albums Conversion** ✅ YES
- Users can convert existing singles into album tracks
- Tracks can exist as **BOTH** singles AND in albums simultaneously
- Example: "Summer Vibes" can be:
  - A standalone single
  - Track 3 on "Best of 2025" album
  - Track 1 on "Summer Hits" compilation

**Technical:** `audio_tracks` table has `album_id` (nullable), tracks without `album_id` are singles

### 2. **Tracks in Multiple Albums** ✅ YES
- **Junction table approach:** `album_tracks` (many-to-many)
- Single track can appear in multiple albums/compilations
- More flexible, better for artists who release compilations
- **Storage-efficient:** No duplicate track files

### 3. **Release Scheduling** ✅ YES (Albums Only)
- **Singles:** Go live immediately upon upload (existing behavior)
- **Albums:** Can schedule future release dates
- Allows artists to build hype before album drops
- **UI:** Album shows "Coming Soon" badge with countdown

### 4. **Draft Albums** ✅ YES
- Save work-in-progress albums
- Upload tracks over time, publish when ready
- Status: `draft`, `scheduled`, `published`
- Drafts don't count toward album limit until published

---

## 🗄️ **Database Schema**

### **1. Albums Table**
```sql
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  release_date DATE, -- Can be future date
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'published'
  genre VARCHAR(100),
  is_public BOOLEAN DEFAULT TRUE,
  
  -- Auto-calculated fields (triggers)
  tracks_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- seconds
  
  -- Analytics
  total_plays INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ -- When status changed to 'published'
);
```

**Indexes:**
```sql
CREATE INDEX idx_albums_creator_id ON albums(creator_id);
CREATE INDEX idx_albums_status ON albums(status);
CREATE INDEX idx_albums_release_date ON albums(release_date);
CREATE INDEX idx_albums_published_at ON albums(published_at DESC);
```

### **2. Album Tracks Junction Table (Many-to-Many)**
```sql
CREATE TABLE album_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
  track_number INTEGER NOT NULL, -- Position in album
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(album_id, track_id), -- Track can only appear once per album
  UNIQUE(album_id, track_number) -- No duplicate track numbers in same album
);
```

**Indexes:**
```sql
CREATE INDEX idx_album_tracks_album_id ON album_tracks(album_id);
CREATE INDEX idx_album_tracks_track_id ON album_tracks(track_id);
CREATE INDEX idx_album_tracks_track_number ON album_tracks(album_id, track_number);
```

### **3. Update Audio Tracks Table**
**No changes needed!** Tracks remain independent, albums link via junction table.

### **4. RLS Policies**
```sql
-- Public albums viewable by everyone
CREATE POLICY "view_public_albums" ON albums FOR SELECT
USING (is_public = true AND status = 'published' OR auth.uid() = creator_id);

-- Only creator can create/update/delete their albums
CREATE POLICY "manage_own_albums" ON albums FOR ALL
USING (auth.uid() = creator_id);

-- Anyone can view album tracks if album is public
CREATE POLICY "view_album_tracks" ON album_tracks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM albums 
    WHERE id = album_id 
    AND (is_public = true AND status = 'published' OR creator_id = auth.uid())
  )
);

-- Only album creator can manage tracks
CREATE POLICY "manage_album_tracks" ON album_tracks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM albums 
    WHERE id = album_id 
    AND creator_id = auth.uid()
  )
);
```

### **5. Triggers (Auto-update album stats)**
```sql
-- Update tracks_count and total_duration when tracks added/removed
CREATE OR REPLACE FUNCTION update_album_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE albums
  SET 
    tracks_count = (
      SELECT COUNT(*) FROM album_tracks WHERE album_id = COALESCE(NEW.album_id, OLD.album_id)
    ),
    total_duration = (
      SELECT COALESCE(SUM(at.duration), 0)
      FROM album_tracks albt
      JOIN audio_tracks at ON albt.track_id = at.id
      WHERE albt.album_id = COALESCE(NEW.album_id, OLD.album_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.album_id, OLD.album_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_album_stats
AFTER INSERT OR UPDATE OR DELETE ON album_tracks
FOR EACH ROW EXECUTE FUNCTION update_album_stats();
```

---

## 💾 **Storage Limits (Albums + Tracks)**

### **Artwork Storage:**
- **Album covers:** 2MB max (as you specified) ✅
- Bucket: `album-covers/`
- Path: `{creator_id}/{album_id}.jpg`

### **Track Upload Limits (Entire Album):**

**FREE:**
- 3 tracks lifetime × 50MB each = **150MB max** (existing)
- No albums

**PREMIUM:**
- 7 uploads/month × 50MB each = **350MB/month** (existing)
- **Per album:** 7 tracks max × 50MB = **350MB max per album**
- **Total albums:** 2 albums × 350MB = **700MB album storage**
- **Why economical:** Uses existing upload quotas, no extra storage cost

**UNLIMITED:**
- Unlimited uploads × 50MB each
- Unlimited albums
- **No per-album limit**

---

## 🔧 **Implementation Order**

### **Phase 1: Database (Week 1)** ✅ START HERE
1. Create `albums` table with indexes
2. Create `album_tracks` junction table
3. Create triggers for auto-calculating stats
4. Set up RLS policies
5. Create album cover storage bucket in Supabase
6. Test with sample data

### **Phase 2: Backend API (Week 2)**
Create helper functions in `dbHelpers`:
- `createAlbum(albumData)` - Create album (draft by default)
- `updateAlbum(albumId, updates)` - Update album details
- `publishAlbum(albumId)` - Change status to published
- `getAlbumById(albumId)` - Get album with tracks
- `getAlbumsByCreator(creatorId)` - User's albums
- `addTrackToAlbum(albumId, trackId, trackNumber)` - Link track
- `removeTrackFromAlbum(albumId, trackId)` - Unlink track
- `reorderAlbumTracks(albumId, newOrder)` - Change track numbers
- `deleteAlbum(albumId)` - Delete album (only if no plays)
- `getAlbumsWithStats()` - For discover screen
- `checkAlbumLimit(userId)` - Validate tier limits

### **Phase 3: Upload Flow (Week 3)**
Update `UploadScreen`:
- Add "Upload Mode" selector: **Single** | **Album**
- **Single mode:** Existing flow (unchanged)
- **Album mode:**
  1. Choose: **Create New Album** | **Add to Existing Album**
  2. If new: Fill album metadata (title, cover, description, genre, release date)
  3. Upload tracks (multi-select)
  4. Set track numbers (drag to reorder)
  5. Save as draft or publish immediately

**Validation:**
- Check tier limits (Free = 0 albums, Premium = 2 albums, Unlimited = unlimited)
- Check track limits per album (Premium = 7 tracks, Unlimited = unlimited)
- Check upload quota (Premium = 7/month)
- Show clear error messages with upgrade prompts

### **Phase 4: Album Detail Screen (Week 4)**
New `AlbumDetailsScreen.tsx`:
- Album cover (large, 300×300px)
- Title, artist, release date, description
- Track list with numbers, durations, play buttons
- **Play All** button (adds all tracks to queue)
- Like album button (inserts into `likes` table with `content_type: 'album'`)
- Share album button
- Download album button (Premium/Unlimited only)
- Options menu (edit, delete, schedule release)
- Total duration, play count
- Comments section

**Scheduled Albums:**
- Show "Releases on {date}" badge
- Countdown timer
- Allow pre-saves (adds to library when released)

### **Phase 5: UI Integration (Week 5)**
Update existing screens:

**DiscoverScreen:**
- Add "Albums" tab (alongside Tracks, Artists, Playlists)
- Show featured albums grid
- "New Releases" section
- "Trending Albums" section

**ProfileScreen:**
- Add "Albums" section (separate from singles)
- Show album count in stats
- Grid/list view toggle

**CreatorProfileScreen:**
- "Albums" tab
- Show published albums only (unless viewing own profile)

**AudioPlayerScreen:**
- Below track title, show album name (if part of album)
- "Go to Album" menu option → navigates to `AlbumDetailsScreen`
- Show track number (e.g., "Track 3 of 12")

**SearchScreen:**
- Add "Albums" results category
- Filter by albums only

---

## 📅 **Release Scheduling Logic**

**Singles:** Immediate (existing)
**Albums:**
- `status = 'scheduled'` + `release_date = future date`
- Cron job (or Cloud Function) checks daily for albums where `release_date ≤ NOW()`
- Auto-publish: `status = 'published'`, `published_at = NOW()`
- Send notification to followers: "New album from {Artist}!"

---

## 🚫 **What NOT to Implement (Keep Costs Low)**

1. ❌ **Album preview clips** - Uses existing track previews
2. ❌ **Album analytics dashboard** - Use existing track analytics
3. ❌ **Album collaborations** - Phase 2 feature
4. ❌ **Album comments** - Use existing track comments
5. ❌ **Album types** (EP, LP, Mixtape) - Just call everything "album"
6. ❌ **Album genres** - Use existing track genres
7. ❌ **Album download as ZIP** - Individual track downloads only

---

## 💰 **Cost Analysis (Why This is Economical)**

### **Storage Costs:**
**Scenario:** 1,000 users, 10% are Premium, 2% are Unlimited

- **900 Free users:** 900 × 150MB = 135GB (singles only)
- **98 Premium users:** 98 × (350MB/month × 7 tracks + 700MB albums) = **102.9GB**
- **20 Unlimited users:** 20 × 1GB (estimated avg) = 20GB
- **Total:** ~258GB

**Supabase Costs:**
- First 100GB: Free
- Next 158GB: £0.021/GB/month = £3.32/month
- **Annual cost: £39.84** ✅ **Very affordable!**

**Album Covers:**
- 2MB × 120 albums (total across all Premium/Unlimited) = 240MB
- **Negligible cost!**

### **Why It Won't Break Your Budget:**
✅ **Uses existing upload quotas** - No extra storage overhead  
✅ **Junction table** - Tracks shared across albums (no duplication)  
✅ **Album limits tied to tiers** - Free = 0, Premium = 2 max  
✅ **2MB artwork limit** - Prevents storage abuse  
✅ **No video/extra media** - Audio only

---

## 🎯 **Conversion Strategy (Revenue Impact)**

**FREE → PREMIUM Upgrade Triggers:**
1. User uploads 3 singles, wants to release EP → **"Upgrade to Premium for albums!"**
2. User wants to schedule release → **"Upgrade for scheduled releases!"**
3. User wants to convert singles into album → **"Upgrade to organize your music!"**

**PREMIUM → UNLIMITED Upgrade Triggers:**
1. User hits 2 album limit → **"Upgrade to Unlimited for more albums!"**
2. User wants album with 10+ tracks → **"Upgrade for unlimited tracks per album!"**
3. User uploads 7 tracks in a month, wants more → **"Upgrade for unlimited uploads!"**

---

## 📋 **Summary of Your Answers Applied**

| Question | Your Answer | Implementation |
|----------|-------------|----------------|
| Convert singles to albums? | ✅ YES | Junction table allows linking existing tracks |
| Tracks in multiple albums? | ✅ YES | Many-to-many via `album_tracks` table |
| Release scheduling? | ✅ YES (albums only) | `status='scheduled'` + `release_date` field |
| Draft albums? | ✅ YES | `status='draft'` doesn't count toward limit |

---

## ✅ **Next Steps**

**Ready to start?** I'll begin with:
1. Create SQL script for `albums` and `album_tracks` tables
2. Add triggers and RLS policies
3. Create Supabase storage bucket for album covers
4. Test with sample data

