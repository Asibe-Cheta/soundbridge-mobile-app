-- Verify RLS Policy Configuration
-- Run this in Supabase SQL Editor to check the current state

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'two_factor_verification_sessions';

-- 2. List all policies on the table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'two_factor_verification_sessions';

-- 3. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'two_factor_verification_sessions'
ORDER BY ordinal_position;

