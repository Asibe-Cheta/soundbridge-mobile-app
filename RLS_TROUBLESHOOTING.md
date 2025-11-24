# 🔍 RLS Policy Troubleshooting Guide

## Issue

Still getting RLS policy error after running migration. Let's verify and fix.

## Step 1: Verify Current State

**Run this in Supabase SQL Editor:**

```sql
-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'two_factor_verification_sessions';

-- List all policies
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'two_factor_verification_sessions';
```

**Or use:** `VERIFY_RLS_POLICY.sql`

## Step 2: Check What You See

### If No Policy Exists:
The migration didn't run. Re-run the migration.

### If Policy Exists But Wrong:
The policy might be incorrect. See Step 3.

### If Multiple Policies Exist:
There might be conflicting policies. See Step 4.

## Step 3: Force Recreate Policy

**Run this to completely reset the policy:**

```sql
-- Drop ALL existing policies
DROP POLICY IF EXISTS "Service role only for verification sessions" ON two_factor_verification_sessions;
DROP POLICY IF EXISTS "Allow service role to insert verification sessions" ON two_factor_verification_sessions;
DROP POLICY IF EXISTS "Allow users to insert their own verification sessions" ON two_factor_verification_sessions;

-- Disable RLS temporarily
ALTER TABLE two_factor_verification_sessions DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Create the correct policy
CREATE POLICY "Service role only for verification sessions"
  ON two_factor_verification_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify it was created
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'two_factor_verification_sessions';
```

## Step 4: Alternative - Disable RLS (Temporary)

**If the policy still doesn't work, you can temporarily disable RLS:**

```sql
-- ⚠️ TEMPORARY: Disable RLS (less secure, but will work)
ALTER TABLE two_factor_verification_sessions DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** This is less secure. Only use for testing. Re-enable RLS after fixing the policy.

## Step 5: Verify Service Role Key

The backend needs `SUPABASE_SERVICE_ROLE_KEY` environment variable set in Vercel.

**Check with web team:**
1. Is `SUPABASE_SERVICE_ROLE_KEY` set in Vercel environment variables?
2. Does it match the service role key in Supabase Dashboard → Settings → API?

## Step 6: Test Direct Insert

**Test if service role can insert (run in Supabase SQL Editor as service role):**

```sql
-- This should work if service role has access
INSERT INTO two_factor_verification_sessions (
  id,
  user_id,
  email,
  password_hash,
  expires_at,
  verified
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid, -- Test user ID
  'test@example.com',
  'test_hash',
  NOW() + INTERVAL '5 minutes',
  false
);

-- If this fails, RLS is blocking even service role
-- If this succeeds, the issue is in the backend code
```

## Common Issues

### Issue 1: Policy Not Applied
**Solution:** Re-run the migration SQL.

### Issue 2: Wrong Role
**Solution:** Ensure policy targets `service_role`, not `authenticated`.

### Issue 3: Multiple Conflicting Policies
**Solution:** Drop all policies and recreate just one.

### Issue 4: Backend Not Using Service Role
**Solution:** Verify backend code uses `SUPABASE_SERVICE_ROLE_KEY`.

## Next Steps

1. Run verification SQL to see current state
2. Share results with web team
3. Try force recreate policy (Step 3)
4. If still failing, check backend environment variables

