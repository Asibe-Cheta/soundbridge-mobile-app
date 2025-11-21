-- ====================================================================
-- CLEANUP DUPLICATE LIVE SESSIONS
-- ====================================================================
-- Purpose: End duplicate/stale live sessions that were created
--          during testing or due to multiple "Go Live" attempts
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Review the sessions that will be affected below
-- 3. Run this script to end the duplicate sessions
-- ====================================================================

-- STEP 1: Check all currently "live" sessions (review before running cleanup)
-- Run this first to see which sessions will be affected
SELECT 
  id,
  creator_id,
  title,
  session_type,
  status,
  actual_start_time,
  created_at,
  agora_channel_name
FROM live_sessions
WHERE status = 'live'
ORDER BY actual_start_time DESC;

-- ====================================================================
-- STEP 2: End all "live" sessions except the most recent one per creator
-- ====================================================================
-- This will update the status to 'ended' and set the end time
-- for all sessions EXCEPT the most recently created one for each creator

-- OPTION A: End ALL live sessions (if you want to start fresh)
-- Uncomment the following lines to use this option:
/*
UPDATE live_sessions
SET 
  status = 'ended',
  end_time = NOW()
WHERE 
  status = 'live'
  AND end_time IS NULL;
*/

-- OPTION B: End only duplicate/older sessions (keep the newest one per creator)
-- This is the RECOMMENDED option
WITH ranked_sessions AS (
  SELECT 
    id,
    creator_id,
    ROW_NUMBER() OVER (
      PARTITION BY creator_id 
      ORDER BY actual_start_time DESC, created_at DESC
    ) as rn
  FROM live_sessions
  WHERE status = 'live'
)
UPDATE live_sessions
SET 
  status = 'ended',
  end_time = NOW()
WHERE 
  id IN (
    SELECT id 
    FROM ranked_sessions 
    WHERE rn > 1  -- Keep only the most recent session per creator
  );

-- ====================================================================
-- STEP 3: Verify cleanup (check remaining live sessions)
-- ====================================================================
SELECT 
  id,
  creator_id,
  title,
  session_type,
  status,
  actual_start_time,
  end_time,
  created_at
FROM live_sessions
WHERE status = 'live'
ORDER BY actual_start_time DESC;

-- ====================================================================
-- OPTIONAL: End a specific session by ID
-- ====================================================================
-- If you want to end a specific session, use this query:
-- Replace 'SESSION_ID_HERE' with the actual session ID
/*
UPDATE live_sessions
SET 
  status = 'ended',
  end_time = NOW()
WHERE 
  id = 'SESSION_ID_HERE'
  AND status = 'live';
*/

-- ====================================================================
-- NOTES:
-- - Sessions with status 'ended' will no longer appear in the "Live Now" tab
-- - Participants will be automatically disconnected when they see the session has ended
-- - The mobile app filters sessions by status = 'live', so ended sessions won't show
-- ====================================================================

