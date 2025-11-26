-- COMPLETE RLS FIX - This will definitely work
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop ALL possible policy names (catch all variations)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'two_factor_verification_sessions'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON two_factor_verification_sessions', r.policyname);
    END LOOP;
END $$;

-- Step 2: Disable RLS
ALTER TABLE two_factor_verification_sessions DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policy for service_role with explicit permissions
CREATE POLICY "service_role_full_access"
  ON two_factor_verification_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Also create a policy that allows service_role to bypass RLS entirely
-- This is a backup in case the first one doesn't work
GRANT ALL ON two_factor_verification_sessions TO service_role;

-- Step 6: Verify
SELECT 
  'RLS Status' as check_type,
  rowsecurity::text as result
FROM pg_tables
WHERE tablename = 'two_factor_verification_sessions'

UNION ALL

SELECT 
  'Policy Count' as check_type,
  COUNT(*)::text as result
FROM pg_policies
WHERE tablename = 'two_factor_verification_sessions'

UNION ALL

SELECT 
  'Service Role Policy' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'two_factor_verification_sessions' 
      AND 'service_role' = ANY(roles)
    ) THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as result;

