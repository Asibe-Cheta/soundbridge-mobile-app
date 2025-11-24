# 🔴 RLS Policy Issue - Backend Fix Required

## Problem

The `/api/auth/login-initiate` endpoint is failing with:

```
"error": "Failed to create verification session",
"code": "SESSION_CREATION_FAILED",
"details": "new row violates row-level security policy for table \"two_factor_verification_sessions\""
```

## Root Cause

The backend is trying to insert a row into `two_factor_verification_sessions` table, but **Supabase Row Level Security (RLS) is blocking the insert**.

## Solution

The web team needs to update the RLS policy for `two_factor_verification_sessions` table to allow inserts. There are two approaches:

### Option 1: Use Service Role (Recommended)

The backend should use the **service role key** (which bypasses RLS) when inserting verification sessions:

```typescript
// In login-initiate route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS
);

// Then use supabaseAdmin for inserts
await supabaseAdmin
  .from('two_factor_verification_sessions')
  .insert({
    id: verificationSessionId,
    user_id: authData.user.id,
    email: email,
    password_hash: encryptedPassword,
    expires_at: expiresAt.toISOString(),
    verified: false,
  });
```

### Option 2: Update RLS Policy

If using a regular Supabase client, create/update the RLS policy:

```sql
-- Allow service role to insert (if using service role client)
CREATE POLICY "Allow service role to insert verification sessions"
ON two_factor_verification_sessions
FOR INSERT
TO service_role
WITH CHECK (true);

-- OR allow authenticated users to insert their own sessions
CREATE POLICY "Allow users to insert their own verification sessions"
ON two_factor_verification_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

**Note:** Option 1 is recommended because:
- The backend is creating sessions on behalf of users (not users themselves)
- Service role bypasses RLS entirely
- More secure and simpler

## Current Error Details

- **Endpoint:** `POST /api/auth/login-initiate`
- **Error Code:** `SESSION_CREATION_FAILED`
- **Error Message:** "Failed to create verification session"
- **Details:** "new row violates row-level security policy for table \"two_factor_verification_sessions\""
- **Status Code:** 500

## Expected Fix

The web team should:

1. **Check if they're using service role key** in the login-initiate route
2. **If not, switch to service role client** for database operations
3. **If using regular client, update RLS policy** as shown above

## Testing After Fix

Once fixed, the login flow should:
1. ✅ Call `/api/auth/login-initiate` successfully
2. ✅ Create verification session in database
3. ✅ Return `verificationSessionId` to mobile app
4. ✅ Navigate to 2FA screen without flash

## Status

- ✅ Database migration completed
- ✅ Mobile app ready
- ⏳ **Backend RLS policy needs to be fixed** ← CURRENT ISSUE
- ⏳ Ready for testing after RLS fix

