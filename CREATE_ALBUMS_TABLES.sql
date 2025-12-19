-- =========================================
-- 🎵 SoundBridge Albums Feature - Database Schema
-- =========================================
-- Date: December 15, 2025
-- Purpose: Create albums and album_tracks tables with full functionality
-- Status: Ready to execute in Supabase SQL Editor
-- Documentation: See ALBUM_FEATURE_SETUP.md for details

-- =========================================
-- 1. CREATE ALBUMS TABLE
-- =========================================

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

COMMENT ON TABLE albums IS 'Albums created by artists - can contain multiple tracks';
COMMENT ON COLUMN albums.status IS 'draft = work in progress, scheduled = future release, published = live';
COMMENT ON COLUMN albums.tracks_count IS 'Auto-calculated by trigger when tracks added/removed';
COMMENT ON COLUMN albums.total_duration IS 'Auto-calculated sum of all track durations in seconds';

-- =========================================
-- 2. CREATE ALBUM_TRACKS JUNCTION TABLE
-- =========================================

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

COMMENT ON TABLE album_tracks IS 'Junction table linking tracks to albums (many-to-many)';
COMMENT ON COLUMN album_tracks.track_number IS 'Position of track in album (allows reordering)';

-- =========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =========================================

-- Albums indexes
CREATE INDEX IF NOT EXISTS idx_albums_creator_id ON albums(creator_id);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date);
CREATE INDEX IF NOT EXISTS idx_albums_published_at ON albums(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_genre ON albums(genre);

-- Album tracks indexes
CREATE INDEX IF NOT EXISTS idx_album_tracks_album_id ON album_tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_album_tracks_track_id ON album_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_album_tracks_track_number ON album_tracks(album_id, track_number);

-- =========================================
-- 4. CREATE FUNCTIONS FOR TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_albums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update album stats (tracks_count, total_duration)
CREATE OR REPLACE FUNCTION update_album_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_album_id UUID;
BEGIN
    -- Determine which album to update
    IF TG_OP = 'DELETE' THEN
        target_album_id := OLD.album_id;
    ELSE
        target_album_id := NEW.album_id;
    END IF;

    -- Update the album's track count and total duration
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

-- Function to set published_at when status changes to 'published'
CREATE OR REPLACE FUNCTION update_album_published_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed from anything to 'published', set published_at
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        NEW.published_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 5. CREATE TRIGGERS
-- =========================================

-- Trigger to auto-update updated_at on albums
DROP TRIGGER IF EXISTS trigger_albums_updated_at ON albums;
CREATE TRIGGER trigger_albums_updated_at
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_albums_updated_at();

-- Trigger to auto-update album stats when tracks added/removed
DROP TRIGGER IF EXISTS trigger_update_album_stats ON album_tracks;
CREATE TRIGGER trigger_update_album_stats
    AFTER INSERT OR UPDATE OR DELETE ON album_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_album_stats();

-- Trigger to set published_at when album is published
DROP TRIGGER IF EXISTS trigger_album_published_at ON albums;
CREATE TRIGGER trigger_album_published_at
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_album_published_at();

-- =========================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on both tables
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_tracks ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 7. CREATE RLS POLICIES FOR ALBUMS
-- =========================================

-- Policy: Anyone can view published public albums
DROP POLICY IF EXISTS "view_public_albums" ON albums;
CREATE POLICY "view_public_albums"
ON albums FOR SELECT
USING (
    (is_public = true AND status = 'published')
    OR auth.uid() = creator_id
);

-- Policy: Anyone can view scheduled albums if they're public (for pre-save feature)
DROP POLICY IF EXISTS "view_scheduled_albums" ON albums;
CREATE POLICY "view_scheduled_albums"
ON albums FOR SELECT
USING (
    (is_public = true AND status = 'scheduled')
    OR auth.uid() = creator_id
);

-- Policy: Users can create their own albums
DROP POLICY IF EXISTS "create_own_albums" ON albums;
CREATE POLICY "create_own_albums"
ON albums FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Policy: Users can update their own albums
DROP POLICY IF EXISTS "update_own_albums" ON albums;
CREATE POLICY "update_own_albums"
ON albums FOR UPDATE
USING (auth.uid() = creator_id);

-- Policy: Users can delete their own albums
DROP POLICY IF EXISTS "delete_own_albums" ON albums;
CREATE POLICY "delete_own_albums"
ON albums FOR DELETE
USING (auth.uid() = creator_id);

-- =========================================
-- 8. CREATE RLS POLICIES FOR ALBUM_TRACKS
-- =========================================

-- Policy: Anyone can view tracks in public published/scheduled albums
DROP POLICY IF EXISTS "view_album_tracks" ON album_tracks;
CREATE POLICY "view_album_tracks"
ON album_tracks FOR SELECT
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

-- Policy: Album creators can manage their album tracks
DROP POLICY IF EXISTS "manage_album_tracks" ON album_tracks;
CREATE POLICY "manage_album_tracks"
ON album_tracks FOR ALL
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

-- =========================================
-- 9. UPDATE LIKES TABLE TO SUPPORT ALBUMS
-- =========================================

-- Note: Your existing likes table already uses polymorphic design with content_id and content_type
-- No changes needed, but adding comment for clarity

COMMENT ON TABLE likes IS 'Polymorphic likes table - supports tracks, events, playlists, and albums';

-- Verify likes table structure (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'likes' AND column_name = 'content_type'
    ) THEN
        RAISE EXCEPTION 'likes table does not have content_type column - please check schema';
    END IF;
END $$;

-- =========================================
-- 10. CREATE STORAGE BUCKET (Run in Supabase Dashboard)
-- =========================================

-- NOTE: Storage buckets must be created via Supabase Dashboard or Storage API
-- This is a reminder to create the bucket manually

-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create new bucket: "album-covers"
-- 3. Set as PUBLIC (allow public access to view album covers)
-- 4. Configure policies:
--    - SELECT: Public can view all files
--    - INSERT: Authenticated users can upload to their own folder ({creator_id}/*)
--    - UPDATE: Users can update files in their own folder
--    - DELETE: Users can delete files in their own folder

-- Example storage path: album-covers/{creator_id}/{album_id}.jpg

-- =========================================
-- 11. CREATE HELPER VIEWS (Optional but Useful)
-- =========================================

-- View: Albums with creator details and track count
CREATE OR REPLACE VIEW albums_with_details AS
SELECT 
    a.id,
    a.title,
    a.description,
    a.cover_image_url,
    a.release_date,
    a.status,
    a.genre,
    a.is_public,
    a.tracks_count,
    a.total_duration,
    a.total_plays,
    a.total_likes,
    a.created_at,
    a.updated_at,
    a.published_at,
    p.id as creator_id,
    p.username as creator_username,
    p.display_name as creator_display_name,
    p.avatar_url as creator_avatar_url
FROM albums a
JOIN profiles p ON a.creator_id = p.id;

COMMENT ON VIEW albums_with_details IS 'Albums with joined creator profile information';

-- =========================================
-- 12. VERIFICATION QUERIES
-- =========================================

-- Check if tables were created successfully
SELECT 
    'Albums and album_tracks tables created successfully!' as status,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('albums', 'album_tracks');

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('albums', 'album_tracks');

-- Check if policies were created
SELECT 
    'RLS Policies created successfully!' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('albums', 'album_tracks');

-- Check if indexes were created
SELECT 
    'Indexes created successfully!' as status,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('albums', 'album_tracks');

-- Check if triggers were created
SELECT 
    'Triggers created successfully!' as status,
    COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE event_object_table IN ('albums', 'album_tracks');

-- =========================================
-- 13. OPTIONAL: CREATE TEST DATA
-- =========================================
-- Uncomment the section below to create sample albums for testing

/*
DO $$
DECLARE
    test_creator_id UUID;
    album1_id UUID;
    album2_id UUID;
    track1_id UUID;
    track2_id UUID;
    track3_id UUID;
BEGIN
    -- Get a creator ID for test data
    SELECT id INTO test_creator_id 
    FROM profiles 
    WHERE role = 'creator' 
    LIMIT 1;
    
    -- Only create test data if we have a creator
    IF test_creator_id IS NOT NULL THEN
        -- Create test album 1 (Published)
        INSERT INTO albums (creator_id, title, description, status, genre, is_public, release_date)
        VALUES (
            test_creator_id,
            'Summer Vibes',
            'A collection of feel-good summer anthems perfect for beach days and road trips.',
            'published',
            'Pop',
            true,
            CURRENT_DATE
        ) RETURNING id INTO album1_id;
        
        -- Create test album 2 (Scheduled for future)
        INSERT INTO albums (creator_id, title, description, status, genre, is_public, release_date)
        VALUES (
            test_creator_id,
            'Winter Tales',
            'Coming soon - An intimate acoustic album exploring themes of reflection and renewal.',
            'scheduled',
            'Acoustic',
            true,
            CURRENT_DATE + INTERVAL '30 days'
        ) RETURNING id INTO album2_id;
        
        -- Get some tracks from this creator
        SELECT id INTO track1_id FROM audio_tracks WHERE creator_id = test_creator_id AND is_public = true LIMIT 1 OFFSET 0;
        SELECT id INTO track2_id FROM audio_tracks WHERE creator_id = test_creator_id AND is_public = true LIMIT 1 OFFSET 1;
        SELECT id INTO track3_id FROM audio_tracks WHERE creator_id = test_creator_id AND is_public = true LIMIT 1 OFFSET 2;
        
        -- Add tracks to first album (if tracks exist)
        IF track1_id IS NOT NULL THEN
            INSERT INTO album_tracks (album_id, track_id, track_number)
            VALUES (album1_id, track1_id, 1);
        END IF;
        
        IF track2_id IS NOT NULL THEN
            INSERT INTO album_tracks (album_id, track_id, track_number)
            VALUES (album1_id, track2_id, 2);
        END IF;
        
        IF track3_id IS NOT NULL THEN
            INSERT INTO album_tracks (album_id, track_id, track_number)
            VALUES (album1_id, track3_id, 3);
        END IF;
        
        RAISE NOTICE '✅ Test albums created successfully!';
        RAISE NOTICE '🎵 Created "Summer Vibes" (published) and "Winter Tales" (scheduled)';
        
    ELSE
        RAISE NOTICE '⚠️ No creators found - skipping test data creation';
        RAISE NOTICE '💡 Create some creator profiles first, then run this section again';
    END IF;
END $$;
*/

-- =========================================
-- 14. FINAL VERIFICATION
-- =========================================

-- Show final table counts
SELECT 
    'albums' as table_name,
    COUNT(*) as record_count
FROM albums
UNION ALL
SELECT 
    'album_tracks' as table_name,
    COUNT(*) as record_count
FROM album_tracks;

-- Show success message
SELECT 
    '🚀 ALBUMS FEATURE DATABASE SETUP COMPLETE! 🚀' as status,
    'Mobile app can now use albums feature' as next_step,
    'Remember to create album-covers storage bucket in Supabase Dashboard' as important_reminder;

-- =========================================
-- 15. TIER LIMITS REFERENCE
-- =========================================

COMMENT ON TABLE albums IS 
'Album limits by tier:
- Free: 0 albums
- Premium (£6.99/mo): 2 albums max, 7 tracks per album
- Unlimited (£12.99/mo): Unlimited albums and tracks
Draft albums do not count toward limits until published.';

-- =========================================
-- END OF SCRIPT
-- =========================================

-- Next Steps for Mobile Team:
-- 1. ✅ Run this script in Supabase SQL Editor
-- 2. ⏳ Create "album-covers" storage bucket in Supabase Dashboard
-- 3. ⏳ Add dbHelpers functions (Phase 2)
-- 4. ⏳ Update UploadScreen for album uploads (Phase 3)
-- 5. ⏳ Create AlbumDetailsScreen (Phase 4)
-- 6. ⏳ Integrate into Discover/Profile screens (Phase 5)

