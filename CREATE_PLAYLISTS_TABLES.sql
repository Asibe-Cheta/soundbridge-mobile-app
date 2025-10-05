-- =========================================
-- 🎵 SoundBridge Playlists Tables Creation
-- =========================================
-- Date: October 5, 2025
-- Purpose: Create playlists and playlist_tracks tables with full functionality
-- Status: Ready to execute in Supabase SQL Editor

-- =========================================
-- 1. CREATE TABLES
-- =========================================

-- Create playlists table
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

-- Create playlist_tracks junction table
CREATE TABLE IF NOT EXISTS playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES audio_tracks(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, track_id),
    UNIQUE(playlist_id, position)
);

-- =========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =========================================

-- Playlists indexes
CREATE INDEX IF NOT EXISTS idx_playlists_creator_id ON playlists(creator_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);

-- Playlist tracks indexes
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);

-- =========================================
-- 3. CREATE FUNCTIONS FOR TRIGGERS
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update playlist counts
CREATE OR REPLACE FUNCTION update_playlist_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tracks_count and total_duration for the affected playlist
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

-- =========================================
-- 4. CREATE TRIGGERS
-- =========================================

-- Trigger to auto-update updated_at on playlists
DROP TRIGGER IF EXISTS trigger_playlists_updated_at ON playlists;
CREATE TRIGGER trigger_playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update playlist counts when tracks added/removed
DROP TRIGGER IF EXISTS trigger_playlist_tracks_counts ON playlist_tracks;
CREATE TRIGGER trigger_playlist_tracks_counts
    AFTER INSERT OR UPDATE OR DELETE ON playlist_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_counts();

-- =========================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on both tables
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 6. CREATE RLS POLICIES
-- =========================================

-- Playlists policies
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON playlists;
CREATE POLICY "Public playlists are viewable by everyone" 
ON playlists FOR SELECT 
USING (is_public = true OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can insert their own playlists" ON playlists;
CREATE POLICY "Users can insert their own playlists" 
ON playlists FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their own playlists" ON playlists;
CREATE POLICY "Users can update their own playlists" 
ON playlists FOR UPDATE 
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete their own playlists" ON playlists;
CREATE POLICY "Users can delete their own playlists" 
ON playlists FOR DELETE 
USING (auth.uid() = creator_id);

-- Playlist tracks policies
DROP POLICY IF EXISTS "Anyone can view tracks in public playlists" ON playlist_tracks;
CREATE POLICY "Anyone can view tracks in public playlists" 
ON playlist_tracks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM playlists 
        WHERE id = playlist_id 
        AND (is_public = true OR creator_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can manage tracks in their own playlists" ON playlist_tracks;
CREATE POLICY "Users can manage tracks in their own playlists" 
ON playlist_tracks FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM playlists 
        WHERE id = playlist_id 
        AND creator_id = auth.uid()
    )
);

-- =========================================
-- 7. VERIFICATION QUERIES
-- =========================================

-- Check if tables were created successfully
SELECT 
    'Tables created successfully!' as status,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('playlists', 'playlist_tracks');

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('playlists', 'playlist_tracks');

-- Check if policies were created
SELECT 
    'RLS Policies created successfully!' as status,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('playlists', 'playlist_tracks');

-- Check if indexes were created
SELECT 
    'Indexes created successfully!' as status,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('playlists', 'playlist_tracks');

-- =========================================
-- 8. SUCCESS MESSAGE
-- =========================================

SELECT 
    '🎉 PLAYLISTS TABLES SETUP COMPLETE! 🎉' as message,
    'Mobile app can now use playlists feature' as status,
    'No mobile app code changes needed' as note;

-- =========================================
-- 9. OPTIONAL: CREATE TEST DATA
-- =========================================
-- Uncomment the section below to create sample playlists for testing

/*
-- Get a creator ID for test data
DO $$
DECLARE
    test_creator_id UUID;
    playlist1_id UUID;
    playlist2_id UUID;
BEGIN
    -- Get first creator
    SELECT id INTO test_creator_id 
    FROM profiles 
    WHERE role = 'creator' 
    LIMIT 1;
    
    -- Only create test data if we have a creator
    IF test_creator_id IS NOT NULL THEN
        -- Create test playlist 1
        INSERT INTO playlists (creator_id, name, description, is_public, cover_image_url)
        VALUES (
            test_creator_id,
            'Afrobeat Vibes',
            'The best Afrobeat tracks for any mood - perfect for dancing and good vibes!',
            true,
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'
        ) RETURNING id INTO playlist1_id;
        
        -- Create test playlist 2
        INSERT INTO playlists (creator_id, name, description, is_public, cover_image_url)
        VALUES (
            test_creator_id,
            'Gospel Classics',
            'Timeless gospel songs that uplift the spirit and inspire the soul.',
            true,
            'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop'
        ) RETURNING id INTO playlist2_id;
        
        -- Add tracks to first playlist (if tracks exist)
        INSERT INTO playlist_tracks (playlist_id, track_id, position)
        SELECT 
            playlist1_id,
            id,
            ROW_NUMBER() OVER (ORDER BY created_at)
        FROM audio_tracks 
        WHERE is_public = true 
        LIMIT 10;
        
        -- Add tracks to second playlist (if tracks exist)
        INSERT INTO playlist_tracks (playlist_id, track_id, position)
        SELECT 
            playlist2_id,
            id,
            ROW_NUMBER() OVER (ORDER BY created_at DESC)
        FROM audio_tracks 
        WHERE is_public = true 
        LIMIT 5;
        
        -- Success message for test data
        RAISE NOTICE '✅ Test playlists created successfully!';
        RAISE NOTICE '🎵 Created "Afrobeat Vibes" and "Gospel Classics" playlists';
        
    ELSE
        RAISE NOTICE '⚠️ No creators found - skipping test data creation';
        RAISE NOTICE '💡 Create some creator profiles first, then run this section again';
    END IF;
END $$;
*/

-- =========================================
-- 10. FINAL VERIFICATION
-- =========================================

-- Show final table counts
SELECT 
    'playlists' as table_name,
    COUNT(*) as record_count
FROM playlists
UNION ALL
SELECT 
    'playlist_tracks' as table_name,
    COUNT(*) as record_count
FROM playlist_tracks;

-- Show success message
SELECT 
    '🚀 READY FOR MOBILE APP!' as status,
    'Restart the mobile app to see playlists working' as next_step;
