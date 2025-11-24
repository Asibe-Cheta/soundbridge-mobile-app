# ✅ RLS Solution - Disable RLS for Verification Sessions

## Problem Identified by Claude

The RLS policy was checking for `service_role` role, but Supabase's service role client doesn't actually set the PostgreSQL role to `service_role` in a way that the policy can check. This creates a circular dependency where:
- Policy expects `service_role` role
- Service role client doesn't set that role
- RLS blocks the insert

## Solution: Disable RLS (Recommended)

**Why this is safe:**
1. ✅ **Backend-only table** - Never accessed from frontend/client
2. ✅ **API routes handle security** - All access goes through authenticated API routes
3. ✅ **Temporary data** - Sessions expire in 5 minutes
4. ✅ **No direct user access** - Users should never query this table directly

## SQL Migration

Run this in Supabase SQL Editor:

```sql
-- Disable RLS on verification sessions table
ALTER TABLE two_factor_verification_sessions DISABLE ROW LEVEL SECURITY;

-- Drop the existing policy (no longer needed)
DROP POLICY IF EXISTS "Service role only for verification sessions" 
ON two_factor_verification_sessions;
```

**Or use:** `DISABLE_RLS_FOR_VERIFICATION_SESSIONS.sql`

## Why This Works

- **No RLS = No policy checks** - Service role client can insert directly
- **Backend security** - API routes still require authentication
- **Simpler** - No complex policy logic needed
- **Appropriate** - This table should be backend-only anyway

## Alternative Solution (If You Want to Keep RLS)

If you prefer to keep RLS enabled, use a SECURITY DEFINER function:

```sql
CREATE OR REPLACE FUNCTION create_verification_session(
  p_session_id UUID,
  p_user_id UUID,
  p_email TEXT,
  p_password_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO two_factor_verification_sessions (
    id, user_id, email, password_hash, expires_at, verified
  ) VALUES (
    p_session_id, p_user_id, p_email, p_password_hash, p_expires_at, false
  );
  RETURN p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_verification_session TO service_role, postgres;
```

Then backend calls:
```typescript
await supabaseAdmin.rpc('create_verification_session', { ... });
```

## Recommendation

**Use Option 1 (disable RLS)** - It's simpler and more appropriate for this use case.

## Status

- ✅ Solution identified by Claude
- ⏳ **SQL migration needs to be run** ← YOU ARE HERE
- ⏳ Ready for testing after migration

