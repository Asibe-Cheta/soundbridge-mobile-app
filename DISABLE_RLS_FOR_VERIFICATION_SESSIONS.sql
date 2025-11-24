-- Disable RLS on two_factor_verification_sessions table
-- This is safe because:
-- 1. Table is backend-only (never accessed from frontend)
-- 2. API routes handle all security
-- 3. Temporary data (expires in 5 minutes)
-- 4. Users should never query it directly

-- Disable RLS
ALTER TABLE two_factor_verification_sessions DISABLE ROW LEVEL SECURITY;

-- Drop the existing policy (no longer needed)
DROP POLICY IF EXISTS "Service role only for verification sessions" 
ON two_factor_verification_sessions;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'two_factor_verification_sessions';

-- Should show: RLS Enabled = false

