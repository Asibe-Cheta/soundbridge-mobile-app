# ✅ RLS Policy Fix - Ready to Apply

## Summary

The web team has confirmed the code is correct (using service role client). The issue is that the RLS policy needs to be refreshed after the database migration. They've provided a SQL migration to fix it.

## Action Required

### Run This SQL Migration

**Go to Supabase Dashboard → SQL Editor → Run this:**

```sql
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
```

**Or use the file:** `RLS_POLICY_MIGRATION.sql`

## What This Does

- Drops the old RLS policy (if it exists)
- Creates a new policy that explicitly allows `service_role` full access (INSERT, SELECT, UPDATE, DELETE)
- Ensures RLS is enabled on the table

## Why This Is Needed

After adding the `email` and `password_hash` columns to the table, the RLS policy may need to be refreshed to recognize the new structure. The service role client should bypass RLS, but the policy needs to be correctly configured.

## Expected Result

After running the migration:
1. ✅ `/api/auth/login-initiate` will successfully create verification sessions
2. ✅ No more "row violates row-level security policy" errors
3. ✅ Mobile app can proceed with 2FA flow
4. ✅ No brief app flash (secure login flow working)

## Status

- ✅ Database migration (email/password columns) - Completed
- ✅ Mobile app code - Ready
- ✅ Backend code - Verified correct (using service role)
- ⏳ **RLS policy migration - Needs to be run** ← YOU ARE HERE
- ⏳ Ready for testing after RLS migration

## Next Steps

1. Run the SQL migration above
2. Test login with 2FA enabled
3. Verify no errors and smooth flow

