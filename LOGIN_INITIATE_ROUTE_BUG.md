# 🐛 Login-Initiate Route Bug - Specific Issue

## Summary

The `SUPABASE_SERVICE_ROLE_KEY` is correctly set in Vercel (web app works for other operations). The RLS policy is correct. **The issue is specifically in the `/api/auth/login-initiate` route** - it's likely not using the service role client for the insert operation.

## Root Cause

The route probably has one of these issues:

1. **Using wrong client for insert** - Creating `supabaseAdmin` but using a different client for the insert
2. **Client scope issue** - Service role client created but not accessible where insert happens
3. **Code path bug** - Insert happening through a different code path that uses regular client

## What to Check in `/api/auth/login-initiate/route.ts`

### Issue 1: Wrong Client Used

**Look for this pattern (WRONG):**

```typescript
// Creates service role client
const supabaseAdmin = createClient(..., SUPABASE_SERVICE_ROLE_KEY);

// But then uses a different client for insert
const { data, error } = await supabase  // ← WRONG! Using regular client
  .from('two_factor_verification_sessions')
  .insert({ ... });
```

**Should be:**

```typescript
const supabaseAdmin = createClient(..., SUPABASE_SERVICE_ROLE_KEY);

// Use supabaseAdmin for insert
const { data, error } = await supabaseAdmin  // ← CORRECT
  .from('two_factor_verification_sessions')
  .insert({ ... });
```

### Issue 2: Client Not in Scope

**Look for this pattern (WRONG):**

```typescript
async function createVerificationSession(...) {
  // Function creates its own client (might be regular client)
  const supabase = createClient(...); // ← Might not be service role
  return await supabase.from('...').insert(...);
}

// In route handler
const supabaseAdmin = createClient(..., SUPABASE_SERVICE_ROLE_KEY);
const session = await createVerificationSession(...); // ← Uses wrong client
```

**Should be:**

```typescript
async function createVerificationSession(supabaseClient, ...) {
  // Pass service role client as parameter
  return await supabaseClient.from('...').insert(...);
}

// In route handler
const supabaseAdmin = createClient(..., SUPABASE_SERVICE_ROLE_KEY);
const session = await createVerificationSession(supabaseAdmin, ...); // ← Pass service role client
```

### Issue 3: Helper Function Using Wrong Client

**Check if there's a helper function that creates its own client:**

```typescript
// Helper function (might be in a separate file)
export async function insertVerificationSession(data) {
  const supabase = getSupabaseClient(); // ← Might return regular client
  return await supabase.from('two_factor_verification_sessions').insert(data);
}
```

## Specific Code to Check

**In `/api/auth/login-initiate/route.ts`, find the insert operation:**

```typescript
// Around line 220 (based on web team's earlier message)
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

**Verify:**
1. ✅ `supabaseAdmin` is defined using `SUPABASE_SERVICE_ROLE_KEY`
2. ✅ The insert uses `supabaseAdmin` (not `supabase` or another client)
3. ✅ No helper functions are called that might use a different client

## Quick Fix Test

**Add this debug logging right before the insert:**

```typescript
// Before insert
console.log('🔍 Client type check:');
console.log('  - Using supabaseAdmin:', supabaseAdmin !== undefined);
console.log('  - Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('  - Client auth type:', supabaseAdmin?.auth ? 'has auth' : 'no auth');

// The insert
const { data: session, error: sessionError } = await supabaseAdmin
  .from('two_factor_verification_sessions')
  .insert({ ... });

// After insert
if (sessionError) {
  console.error('❌ Insert failed:');
  console.error('  - Error code:', sessionError.code);
  console.error('  - Error message:', sessionError.message);
  console.error('  - Error details:', sessionError.details);
  console.error('  - Error hint:', sessionError.hint);
}
```

## Most Likely Issue

Given that:
- ✅ Service role key exists and works for other operations
- ✅ RLS policy is correct
- ✅ Error is specifically "row violates row-level security policy"

**The most likely issue is:** The insert is using a regular Supabase client instead of the service role client, OR the `supabaseAdmin` client is being created incorrectly.

## Expected Fix

The web team should:
1. Verify the insert uses `supabaseAdmin` (service role client)
2. Check if any helper functions are involved that might use a different client
3. Add debug logging to see what client is actually being used
4. Ensure the service role client is passed correctly if using helper functions

---

**The service role key is fine. The route code needs to be fixed to use it correctly for the insert.**

