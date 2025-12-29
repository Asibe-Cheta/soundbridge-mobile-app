-- ============================================
-- MANUAL APPROVAL: Stuck Tracks Workaround
-- ============================================
-- Use this to manually approve tracks stuck in 'pending_check'
-- while web team fixes the cron job issue
-- ============================================

-- 🎯 OPTION 1: Approve ALL pending tracks at once
-- ============================================
-- This is the fastest way to unblock everything

UPDATE audio_tracks
SET 
  moderation_status = 'approved',
  moderation_checked_at = NOW(),
  moderation_flagged = false,
  reviewed_by = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e', -- Your user ID
  reviewed_at = NOW()
WHERE moderation_status = 'pending_check'
  AND deleted_at IS NULL
RETURNING 
  id, 
  title, 
  moderation_status as new_status,
  created_at as uploaded_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as days_stuck;

-- Expected result: 8 tracks approved
-- After running this:
-- ✅ All tracks will be playable in mobile app
-- ✅ Tracks will disappear from "Pending" tab (if it was showing them)
-- ✅ Users can play their tracks immediately


-- 🎯 OPTION 2: Approve specific tracks by title
-- ============================================
-- Use this if you want to approve tracks individually

/*
UPDATE audio_tracks
SET 
  moderation_status = 'approved',
  moderation_checked_at = NOW(),
  moderation_flagged = false,
  reviewed_by = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e',
  reviewed_at = NOW()
WHERE title IN ('Lovely', 'Healing', 'Healing in you')
  AND moderation_status = 'pending_check'
  AND deleted_at IS NULL
RETURNING id, title, moderation_status;
*/


-- 🎯 OPTION 3: Flag one track for testing admin panel
-- ============================================
-- This will test if admin panel can see flagged tracks

/*
UPDATE audio_tracks
SET 
  moderation_status = 'flagged',
  moderation_flagged = true,
  flag_reasons = ARRAY['Manual test - verifying admin panel display'],
  moderation_confidence = 0.75,
  moderation_checked_at = NOW()
WHERE title = 'Lovely'
  AND deleted_at IS NULL
RETURNING id, title, moderation_status, flag_reasons;

-- After running this:
-- 1. Go to admin panel: https://www.soundbridge.live/admin/moderation
-- 2. Check "Flagged" tab
-- 3. Should see "Flagged (1)" with "Lovely" track
-- 4. If you still see "Flagged (0)", RLS is blocking admin access
*/


-- 🔍 VERIFICATION: Check results after approval
-- ============================================

SELECT 
  moderation_status,
  COUNT(*) as count,
  ARRAY_AGG(title ORDER BY created_at DESC) as tracks
FROM audio_tracks
WHERE deleted_at IS NULL
GROUP BY moderation_status
ORDER BY 
  CASE moderation_status
    WHEN 'pending_check' THEN 1
    WHEN 'checking' THEN 2
    WHEN 'flagged' THEN 3
    WHEN 'approved' THEN 4
    WHEN 'clean' THEN 5
    WHEN 'rejected' THEN 6
    ELSE 7
  END;

-- Expected after OPTION 1:
-- approved: 8 tracks
-- pending_check: 0 tracks


-- 🧪 TEST: Check if tracks are now playable
-- ============================================
-- Run this to see tracks that should now work in mobile app

SELECT 
  id,
  title,
  moderation_status,
  moderation_checked_at,
  reviewed_by,
  reviewed_at,
  CASE 
    WHEN moderation_status IN ('clean', 'approved') THEN '✅ Playable'
    WHEN moderation_status IN ('pending_check', 'checking') THEN '⏳ Pending'
    WHEN moderation_status IN ('flagged', 'rejected', 'appealed') THEN '❌ Blocked'
    ELSE '❓ Unknown'
  END as playable_status
FROM audio_tracks
WHERE deleted_at IS NULL
ORDER BY created_at DESC;


-- ============================================
-- 📊 IMPACT ANALYSIS
-- ============================================
-- Run this BEFORE approving to see what will change

SELECT 
  'Current State' as report_section,
  COUNT(*) as total_tracks,
  COUNT(*) FILTER (WHERE moderation_status = 'pending_check') as stuck_in_pending,
  COUNT(*) FILTER (WHERE moderation_status IN ('clean', 'approved')) as already_approved,
  COUNT(*) FILTER (WHERE moderation_status = 'flagged') as flagged,
  COUNT(*) FILTER (WHERE moderation_status IN ('rejected', 'appealed')) as rejected_or_appealed,
  ROUND(
    COUNT(*) FILTER (WHERE moderation_status = 'pending_check')::numeric / 
    NULLIF(COUNT(*), 0) * 100,
    1
  ) as percent_stuck
FROM audio_tracks
WHERE deleted_at IS NULL;

-- Example output:
-- total_tracks: 8
-- stuck_in_pending: 8
-- already_approved: 0
-- flagged: 0
-- rejected_or_appealed: 0
-- percent_stuck: 100.0%


-- ============================================
-- 🚨 ROLLBACK (if needed)
-- ============================================
-- If you approved by mistake, rollback to pending_check

/*
UPDATE audio_tracks
SET 
  moderation_status = 'pending_check',
  moderation_checked_at = NULL,
  moderation_flagged = false,
  reviewed_by = NULL,
  reviewed_at = NULL
WHERE reviewed_at > NOW() - INTERVAL '5 minutes' -- Only rollback recent approvals
  AND reviewed_by = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'
RETURNING id, title, moderation_status;
*/


-- ============================================
-- 📝 NOTES
-- ============================================

/*
WHY IS THIS NECESSARY?

The automated moderation cron job is not running, leaving all tracks
stuck in 'pending_check' status. This manual approval is a temporary
workaround until the web team fixes the cron job.

WHEN TO USE OPTION 1 (Approve All):
- You trust all uploaded tracks are safe
- You want to quickly unblock all content
- You're testing mobile app functionality

WHEN TO USE OPTION 2 (Approve Specific):
- You want to review tracks individually
- You're unsure about some content
- You want to flag certain tracks for review

WHEN TO USE OPTION 3 (Flag for Testing):
- You want to test admin panel display
- You want to test appeal workflow
- You want to test playability blocking

AFTER RUNNING THIS:
1. Refresh mobile app
2. Try playing previously unplayable tracks
3. Verify moderation badges update
4. Test that everything works

REMEMBER:
This is a TEMPORARY workaround. The proper fix is to get the
cron job running so future uploads are processed automatically.
*/

