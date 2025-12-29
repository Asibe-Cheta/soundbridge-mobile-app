-- ============================================================================
-- Storage-Based Tier System - Database Migration (FIXED)
-- ============================================================================
-- Description: Adds file_size column and index for storage quota calculations
-- Date: December 28, 2025
-- Status: Production Ready
-- ============================================================================

-- Step 1: Add file_size column (if not exists)
-- ============================================================================
DO $$
BEGIN
    -- Check if file_size column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audio_tracks'
        AND column_name = 'file_size'
    ) THEN
        -- Add file_size column
        ALTER TABLE audio_tracks
        ADD COLUMN file_size BIGINT DEFAULT 0;

        RAISE NOTICE 'Added file_size column to audio_tracks';
    ELSE
        RAISE NOTICE 'Column file_size already exists, skipping';
    END IF;
END $$;

-- Step 2: Verify deleted_at column exists (should already exist)
-- ============================================================================
DO $$
BEGIN
    -- Check if deleted_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audio_tracks'
        AND column_name = 'deleted_at'
    ) THEN
        -- Add deleted_at column if missing
        ALTER TABLE audio_tracks
        ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

        RAISE NOTICE 'Added deleted_at column to audio_tracks';
    ELSE
        RAISE NOTICE 'Column deleted_at already exists (confirmed)';
    END IF;
END $$;

-- Step 3: Detect user column name and create appropriate index
-- ============================================================================
-- The user column might be named 'user_id', 'creator_id', 'uploader_id', etc.
-- We'll detect the correct column name and create the index accordingly

DO $$
DECLARE
    user_column_name TEXT;
BEGIN
    -- Try to find the user-related column (common names: user_id, creator_id, uploader_id, artist_id, owner_id)
    SELECT column_name INTO user_column_name
    FROM information_schema.columns
    WHERE table_name = 'audio_tracks'
    AND column_name IN ('user_id', 'creator_id', 'uploader_id', 'artist_id', 'owner_id', 'profile_id')
    LIMIT 1;

    IF user_column_name IS NULL THEN
        RAISE NOTICE 'Could not find user column in audio_tracks table. Please create index manually.';
        RAISE NOTICE 'Columns available: %', (
            SELECT string_agg(column_name, ', ')
            FROM information_schema.columns
            WHERE table_name = 'audio_tracks'
        );
    ELSE
        RAISE NOTICE 'Detected user column: %', user_column_name;

        -- Check if index exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'audio_tracks'
            AND indexname = 'idx_audio_tracks_storage'
        ) THEN
            -- Create index using the detected column name
            EXECUTE format(
                'CREATE INDEX idx_audio_tracks_storage ON audio_tracks(%I, file_size) WHERE deleted_at IS NULL',
                user_column_name
            );
            RAISE NOTICE 'Created index idx_audio_tracks_storage on (%I, file_size)', user_column_name;
        ELSE
            RAISE NOTICE 'Index idx_audio_tracks_storage already exists, skipping';
        END IF;
    END IF;
END $$;

-- Step 4: Display table schema for verification
-- ============================================================================
SELECT
    'SCHEMA CHECK: audio_tracks columns' AS info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audio_tracks'
ORDER BY ordinal_position;

-- Step 5: Check how many tracks need backfilling
-- ============================================================================
SELECT
    'BACKFILL STATUS' AS info,
    COUNT(*) as total_tracks,
    COUNT(*) FILTER (WHERE file_size IS NULL OR file_size = 0) as needs_backfill,
    COUNT(*) FILTER (WHERE file_size > 0) as has_file_size,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_tracks
FROM audio_tracks;

-- Step 6: Verify index exists
-- ============================================================================
SELECT
    'INDEX CHECK' AS info,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'audio_tracks'
AND indexname = 'idx_audio_tracks_storage';

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Next steps:
-- 1. Review output above to confirm:
--    - file_size column exists
--    - deleted_at column exists
--    - Index created successfully
--    - User column name detected correctly
-- 2. Backfill file_size for existing uploads (see BACKFILL_FILE_SIZES.md)
-- 3. Update upload handlers to save file_size for new uploads
-- 4. Test storage quota calculations in the app
-- ============================================================================
