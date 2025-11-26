-- Check RLS Policies Only
-- Run this to see what policies exist

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'two_factor_verification_sessions';

-- 2. List ALL policies on the table (this is the important one)
SELECT 
  policyname,
  roles,
  cmd as "Command",
  CASE 
    WHEN qual IS NULL THEN 'No USING clause' 
    ELSE qual::text 
  END as "USING Clause",
  CASE 
    WHEN with_check IS NULL THEN 'No WITH CHECK clause' 
    ELSE with_check::text 
  END as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'two_factor_verification_sessions';

