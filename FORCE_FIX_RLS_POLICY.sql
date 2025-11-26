-- FORCE FIX RLS Policy - Run this in Supabase SQL Editor
-- This will completely reset and fix the RLS policy

-- Step 1: Drop ALL existing policies (in case there are multiple)
DROP POLICY IF EXISTS "Service role only for verification sessions" ON two_factor_verification_sessions;
DROP POLICY IF EXISTS "Allow service role to insert verification sessions" ON two_factor_verification_sessions;
DROP POLICY IF EXISTS "Allow users to insert their own verification sessions" ON two_factor_verification_sessions;
DROP POLICY IF EXISTS "service_role_policy" ON two_factor_verification_sessions;
DROP POLICY IF EXISTS "Enable insert for service role" ON two_factor_verification_sessions;

-- Step 2: Disable RLS temporarily
ALTER TABLE two_factor_verification_sessions DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create the correct policy with explicit service_role access
CREATE POLICY "Service role only for verification sessions"
  ON two_factor_verification_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Verify the policy was created
SELECT 
  policyname,
  roles,
  cmd,
  CASE WHEN qual IS NULL THEN 'No USING clause' ELSE 'Has USING clause' END as using_clause,
  CASE WHEN with_check IS NULL THEN 'No WITH CHECK clause' ELSE 'Has WITH CHECK clause' END as with_check_clause
FROM pg_policies
WHERE tablename = 'two_factor_verification_sessions';

-- Step 6: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'two_factor_verification_sessions';

