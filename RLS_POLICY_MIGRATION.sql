-- Fix RLS Policy for two_factor_verification_sessions table
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role only for verification sessions" ON two_factor_verification_sessions;

-- Recreate policy to explicitly allow service role full access
CREATE POLICY "Service role only for verification sessions"
  ON two_factor_verification_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

