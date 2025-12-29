-- ============================================================================
-- Storage-Based Tier System - Database Migration (CORRECT)
-- ============================================================================
-- Description: Adds file_size column and index for storage quota calculations
-- Date: December 28, 2025
-- Status: Production Ready
-- Column: audio_tracks.creator_id (confirmed from codebase)
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

        RAISE NOTICE '✅ Added file_size column to audio_tracks';
    ELSE
        RAISE NOTICE 'ℹ️  Column file_size already exists, skipping';
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

        RAISE NOTICE '✅ Added deleted_at column to audio_tracks';
    ELSE
        RAISE NOTICE '✅ Column deleted_at already exists (confirmed)';
    END IF;
END $$;

-- Step 3: Create index for storage calculations
-- ============================================================================
-- This index speeds up storage quota calculations by filtering deleted files
-- Index on (creator_id, file_size) WHERE deleted_at IS NULL
DO $$
BEGIN
    -- Check if index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'audio_tracks'
        AND indexname = 'idx_audio_tracks_storage'
    ) THEN
        -- Create index
        CREATE INDEX idx_audio_tracks_storage
        ON audio_tracks(creator_id, file_size)
        WHERE deleted_at IS NULL;

        RAISE NOTICE '✅ Created index idx_audio_tracks_storage on (creator_id, file_size)';
    ELSE
        RAISE NOTICE 'ℹ️  Index idx_audio_tracks_storage already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audio_tracks'
AND column_name IN ('file_size', 'deleted_at', 'creator_id')
ORDER BY column_name;

-- Verify index exists
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'audio_tracks'
AND indexname = 'idx_audio_tracks_storage';

-- Check how many tracks need backfilling
SELECT
    COUNT(*) as total_tracks,
    COUNT(*) FILTER (WHERE file_size IS NULL OR file_size = 0) as needs_backfill,
    COUNT(*) FILTER (WHERE file_size > 0) as has_file_size,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_tracks
FROM audio_tracks;

-- Sample a few tracks to see current state
SELECT
    id,
    creator_id,
    title,
    file_size,
    deleted_at,
    created_at
FROM audio_tracks
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Next steps:
-- 1. Verify output above shows:
--    ✅ file_size column exists
--    ✅ deleted_at column exists
--    ✅ creator_id column exists
--    ✅ Index idx_audio_tracks_storage created
-- 2. Backfill file_size for existing uploads (see BACKFILL_FILE_SIZES.md)
-- 3. Update upload handlers to save file_size for new uploads
-- 4. Test storage quota calculations in the app
-- ============================================================================
