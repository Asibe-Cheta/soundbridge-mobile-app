-- ============================================================================
-- Storage-Based Tier System - Database Migration
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

-- Step 3: Create index for storage calculations
-- ============================================================================
-- This index speeds up storage quota calculations by filtering deleted files
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
        ON audio_tracks(user_id, file_size)
        WHERE deleted_at IS NULL;

        RAISE NOTICE 'Created index idx_audio_tracks_storage';
    ELSE
        RAISE NOTICE 'Index idx_audio_tracks_storage already exists, skipping';
    END IF;
END $$;

-- Step 4: Backfill file_size for existing uploads
-- ============================================================================
-- NOTE: This requires integration with your storage provider (Supabase Storage)
-- Option A: If you have file URLs and can query storage metadata
-- Option B: Use a script to fetch and update file sizes

-- Check how many tracks need backfilling
SELECT
    COUNT(*) as total_tracks,
    COUNT(*) FILTER (WHERE file_size IS NULL OR file_size = 0) as needs_backfill,
    COUNT(*) FILTER (WHERE file_size > 0) as has_file_size
FROM audio_tracks
WHERE deleted_at IS NULL;

-- Sample backfill query (customize based on your storage setup)
-- Example for Supabase Storage:
/*
UPDATE audio_tracks at
SET file_size = (
    SELECT COALESCE((metadata->>'size')::BIGINT, 0)
    FROM storage.objects so
    WHERE so.name = at.file_url
    OR so.name LIKE '%' || at.file_url || '%'
)
WHERE at.file_size IS NULL OR at.file_size = 0;
*/

-- If you don't have storage metadata, you may need to:
-- 1. Use a server-side script to fetch file sizes from storage URLs
-- 2. Update in batches to avoid timeouts
-- 3. Set a default size (e.g., 10MB) for old uploads as fallback

-- Example fallback (use cautiously):
/*
UPDATE audio_tracks
SET file_size = 10485760  -- 10MB default
WHERE (file_size IS NULL OR file_size = 0)
AND deleted_at IS NULL;
*/

-- Step 5: Verification Queries
-- ============================================================================

-- Verify columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'audio_tracks'
AND column_name IN ('file_size', 'deleted_at')
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

-- Check storage usage distribution
SELECT
    tier,
    COUNT(*) as users,
    AVG(total_storage_mb)::NUMERIC(10,2) as avg_storage_mb,
    MAX(total_storage_mb)::NUMERIC(10,2) as max_storage_mb
FROM (
    SELECT
        COALESCE(p.subscription_tier, 'free') as tier,
        at.user_id,
        SUM(at.file_size) / 1024.0 / 1024.0 as total_storage_mb
    FROM audio_tracks at
    LEFT JOIN profiles p ON p.id = at.user_id
    WHERE at.deleted_at IS NULL
    GROUP BY p.subscription_tier, at.user_id
) user_storage
GROUP BY tier
ORDER BY tier;

-- Find users approaching storage limits
WITH user_storage AS (
    SELECT
        at.user_id,
        p.username,
        COALESCE(p.subscription_tier, 'free') as tier,
        SUM(at.file_size) as total_bytes,
        COUNT(*) as track_count,
        CASE
            WHEN COALESCE(p.subscription_tier, 'free') = 'free' THEN 150 * 1024 * 1024
            WHEN p.subscription_tier = 'premium' THEN 2 * 1024 * 1024 * 1024
            WHEN p.subscription_tier = 'unlimited' THEN 10 * 1024 * 1024 * 1024
            ELSE 150 * 1024 * 1024
        END as storage_limit
    FROM audio_tracks at
    LEFT JOIN profiles p ON p.id = at.user_id
    WHERE at.deleted_at IS NULL
    GROUP BY at.user_id, p.username, p.subscription_tier
)
SELECT
    username,
    tier,
    track_count,
    (total_bytes / 1024.0 / 1024.0)::NUMERIC(10,2) as used_mb,
    (storage_limit / 1024.0 / 1024.0)::NUMERIC(10,2) as limit_mb,
    ((total_bytes::FLOAT / storage_limit::FLOAT) * 100)::NUMERIC(10,2) as percent_used
FROM user_storage
WHERE (total_bytes::FLOAT / storage_limit::FLOAT) > 0.8  -- Over 80% used
ORDER BY percent_used DESC
LIMIT 50;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Next steps:
-- 1. Verify all columns and indexes exist (run verification queries above)
-- 2. Backfill file_size for existing uploads (use appropriate method)
-- 3. Update upload handlers to save file_size for new uploads
-- 4. Test storage quota calculations in the app
-- 5. Monitor storage usage and user behavior
-- ============================================================================
