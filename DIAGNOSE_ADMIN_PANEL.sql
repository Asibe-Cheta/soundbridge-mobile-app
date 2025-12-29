-- ============================================
-- DIAGNOSTIC: Admin Panel Empty Issue
-- ============================================
-- Run this in Supabase SQL Editor to diagnose
-- why admin/moderation page shows no content
-- ============================================

-- 1️⃣ CHECK: What moderation statuses exist in database?
-- ============================================
SELECT 
  moderation_status,
  COUNT(*) as count,
  ARRAY_AGG(title ORDER BY created_at DESC) FILTER (WHERE title IS NOT NULL) as sample_tracks
FROM audio_tracks
WHERE deleted_at IS NULL
GROUP BY moderation_status
ORDER BY count DESC;

-- Expected Output:
-- If you see many 'clean' or 'approved', AI auto-approved everything
-- If you see 'pending_check', those should show in "Pending" tab
-- If you see 'flagged', those should show in "Flagged" tab


-- 2️⃣ CHECK: Specific tracks mentioned earlier
-- ============================================
SELECT 
  id,
  title,
  creator_id,
  moderation_status,
  moderation_flagged,
  moderation_checked_at,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_old
FROM audio_tracks
WHERE title IN ('Healing in you', 'Lovely', 'Healing')
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Expected: Should show these tracks with their current status


-- 3️⃣ CHECK: What should appear in "Pending" tab
-- ============================================
-- This is what the admin panel SHOULD query for "Pending" tab
SELECT 
  id,
  title,
  creator_id,
  moderation_status,
  moderation_flagged,
  flag_reasons,
  moderation_confidence,
  created_at
FROM audio_tracks
WHERE moderation_status IN ('pending_check', 'checking', 'flagged')
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Expected: If empty, then all tracks were auto-approved
-- If has results, then RLS policy is blocking admin access


-- 4️⃣ CHECK: What should appear in "Flagged" tab
-- ============================================
SELECT 
  id,
  title,
  creator_id,
  moderation_status,
  moderation_flagged,
  flag_reasons,
  moderation_confidence,
  created_at
FROM audio_tracks
WHERE moderation_status = 'flagged'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Tracks that AI specifically flagged as problematic


-- 5️⃣ CHECK: RLS Policies (Are they blocking admin?)
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual as policy_condition,
  with_check
FROM pg_policies
WHERE tablename = 'audio_tracks'
ORDER BY policyname;

-- Expected: Should see policies that allow admin access
-- Look for: role = 'authenticated' or special admin checks


-- 6️⃣ CHECK: Your user's role
-- ============================================
-- Replace 'YOUR_USER_ID' with actual user ID
-- Or replace 'YOUR_EMAIL' with your email
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at as role_assigned_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'asibechetachukwu@gmail.com';

-- Expected: Should show role = 'admin'


-- 7️⃣ CHECK: All tracks (regardless of RLS)
-- ============================================
-- This bypasses RLS to see ALL tracks
-- Run this as service_role or postgres user
SELECT 
  id,
  title,
  creator_id,
  moderation_status,
  moderation_flagged,
  created_at,
  deleted_at
FROM audio_tracks
ORDER BY created_at DESC
LIMIT 30;


-- ============================================
-- 🎯 INTERPRETATION GUIDE
-- ============================================

/*
CASE 1: Query #1 shows mostly 'clean' or 'approved'
→ AI auto-approved everything
→ Solution: Manually flag a test track to test admin panel

CASE 2: Query #3 returns tracks, but admin panel shows empty
→ RLS policy is blocking admin access
→ Solution: Check if you ran FIX_MODERATION_PAGE_RLS.sql
→ Or check query #6 to confirm you have 'admin' role

CASE 3: Query #3 returns empty, and Query #1 shows 'pending_check'
→ Admin panel is querying wrong statuses
→ Solution: Web team needs to update their query

CASE 4: All queries return empty
→ No tracks in database at all
→ Solution: Upload a test track via mobile app

CASE 5: Query #2 shows tracks exist, but Query #3 shows empty
→ Tracks were auto-approved or manually approved already
→ Solution: Upload new track or manually set status to 'flagged'
*/


-- ============================================
-- 🔧 QUICK FIX: Manually flag a track for testing
-- ============================================
-- Uncomment and replace TRACK_ID with actual track ID

/*
UPDATE audio_tracks
SET 
  moderation_status = 'flagged',
  moderation_flagged = true,
  flag_reasons = ARRAY['Manual flag for testing'],
  moderation_confidence = 0.85
WHERE id = 'REPLACE_WITH_ACTUAL_TRACK_ID'
RETURNING id, title, moderation_status;
*/


-- ============================================
-- 🔧 ALTERNATIVE: Flag by title
-- ============================================
/*
UPDATE audio_tracks
SET 
  moderation_status = 'flagged',
  moderation_flagged = true,
  flag_reasons = ARRAY['Manual flag for testing'],
  moderation_confidence = 0.85
WHERE title = 'Lovely'
  AND deleted_at IS NULL
RETURNING id, title, moderation_status;
*/

