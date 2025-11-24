# 🔴 Supabase RLS Service Role Issue - Question for Claude

## Problem Summary

We're getting an RLS policy violation error when trying to insert into `two_factor_verification_sessions` table, **even though we're using the service role client correctly**.

## Error Details

```
Error Code: 42501
Error Message: "new row violates row-level security policy for table \"two_factor_verification_sessions\""
```

## What We've Verified

### ✅ RLS Policy is Correct

```sql
-- Policy exists and is correct
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'two_factor_verification_sessions';

-- Result:
{
  "policyname": "Service role only for verification sessions",
  "roles": "{service_role}",
  "Command": "ALL",
  "USING Clause": "true",
  "WITH CHECK Clause": "true"
}
```

- ✅ Policy targets `service_role`
- ✅ Allows ALL operations (INSERT, SELECT, UPDATE, DELETE)
- ✅ `USING (true)` and `WITH CHECK (true)` (unrestricted)
- ✅ RLS is enabled on the table

### ✅ Service Role Client is Created Correctly

**Backend logs show:**

```
🔍 Service Role Client Verification:
  - supabaseAdmin exists: true ✅
  - SUPABASE_SERVICE_ROLE_KEY exists: true ✅
  - SUPABASE_SERVICE_ROLE_KEY length: 219 ✅
  - SUPABASE_SERVICE_ROLE_KEY starts with: eyJhbGciOi ✅ (JWT format)
  - SUPABASE_URL exists: true ✅
  - Client type check: object ✅
  - usingServiceRole: true ✅
```

### ✅ Environment Variable is Set

- `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Value is correct (219 characters, JWT format)
- Matches Supabase Dashboard → Settings → API → Service Role Key

### ✅ Code is Using Service Role Client

**Backend code (`/api/auth/login-initiate/route.ts`):**

```typescript
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey, // ← Using service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Inside POST handler
const supabaseAdmin = getSupabaseAdmin();

// Using supabaseAdmin for insert
const { data: session, error: sessionError } = await supabaseAdmin
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

## The Mystery

**Everything is correct, but the insert still fails with RLS error.**

- ✅ RLS policy allows `service_role` full access
- ✅ Service role key is correct and accessible
- ✅ Client is created with service role key
- ✅ Insert uses the service role client
- ❌ **But Supabase still enforces RLS and blocks the insert**

## What We've Tried

1. ✅ Verified RLS policy exists and is correct
2. ✅ Verified service role key is set
3. ✅ Verified client is created with service role key
4. ✅ Verified insert uses service role client
5. ✅ Moved client creation to function-level (serverless best practice)
6. ✅ Added comprehensive debug logging

## Questions for Claude

1. **Why is Supabase enforcing RLS when using service role client?** The service role should bypass RLS entirely, or at least the policy should allow it.

2. **Is there a specific way to configure the Supabase client to ensure it's recognized as service role?** Do we need to:
   - Set explicit headers (`apikey`, `Authorization`)?
   - Use a different client creation pattern?
   - Configure additional options?

3. **Could this be a Supabase JS library version issue?** Are there known issues with service role authentication in certain versions?

4. **Is there a way to verify the client is actually using service role?** Can we check the client's internal state or make a test query?

5. **Should we use direct PostgreSQL connection instead?** Would `pg` library bypass RLS entirely?

6. **Are there any Supabase-specific gotchas with RLS and service role in serverless environments?** Could Next.js/Vercel be interfering?

## Current Implementation

**Supabase Client Creation:**

```typescript
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

**Insert Operation:**

```typescript
const supabaseAdmin = getSupabaseAdmin();

const { data: session, error: sessionError } = await supabaseAdmin
  .from('two_factor_verification_sessions')
  .insert({
    id: verificationSessionId,
    user_id: authData.user.id,
    email: email,
    password_hash: encryptedPassword,
    expires_at: expiresAt.toISOString(),
    verified: false,
  });

if (sessionError) {
  // Error: 42501 - RLS policy violation
  throw new Error('Failed to create verification session');
}
```

## Environment

- **Platform:** Next.js on Vercel (serverless)
- **Supabase:** Cloud hosted
- **Table:** `two_factor_verification_sessions` (public schema)
- **RLS:** Enabled with policy for `service_role`

## Expected Behavior

When using service role client:
- ✅ Should bypass RLS OR
- ✅ Should match the policy that allows `service_role` full access

## Actual Behavior

- ❌ RLS is still enforced
- ❌ Insert is blocked with policy violation error
- ❌ Even though policy explicitly allows `service_role`

## Request

Please provide:
1. **Why this is happening** - What's causing Supabase to still enforce RLS?
2. **The correct fix** - How to ensure service role client bypasses RLS
3. **Verification steps** - How to confirm the client is using service role
4. **Alternative approaches** - If Supabase client doesn't work, what are the options?

Thank you!

