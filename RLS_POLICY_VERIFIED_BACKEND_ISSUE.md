# ✅ RLS Policy Verified - Backend Issue

## Summary

The RLS policy is **correctly configured** in Supabase. The issue must be in the backend code or configuration.

## Verification Results

✅ **RLS Policy Status:**
- Policy exists: `"Service role only for verification sessions"`
- Target role: `service_role` ✅
- Command: `ALL` (INSERT, SELECT, UPDATE, DELETE) ✅
- USING clause: `true` ✅
- WITH CHECK clause: `true` ✅
- RLS enabled: `true` ✅

## Root Cause Analysis

Since the RLS policy is correct, the error "new row violates row-level security policy" means:

1. **The backend is NOT using the service role client** for the insert operation, OR
2. **The service role key is incorrect/missing** in Vercel environment variables, OR
3. **The backend is using a different Supabase client** that doesn't have service role permissions

## Backend Investigation Needed

### 1. Verify Service Role Client Usage

**Check `/api/auth/login-initiate/route.ts`:**

```typescript
// Should be using service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Verify this is used
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Should use supabaseAdmin for the insert
const { data: session, error: sessionError } = await supabaseAdmin
  .from('two_factor_verification_sessions')
  .insert({ ... });
```

### 2. Verify Environment Variable

**In Vercel Dashboard:**
- Check that `SUPABASE_SERVICE_ROLE_KEY` exists
- Verify it matches the service role key from Supabase Dashboard → Settings → API
- Ensure it's set for the correct environment (Production)

### 3. Add Debug Logging

**Add this to the backend route to verify:**

```typescript
// Before the insert
console.log('🔍 Using service role client:', !!supabaseAdmin);
console.log('🔍 Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('🔍 Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

// After the insert
if (sessionError) {
  console.error('❌ Insert error:', sessionError);
  console.error('❌ Error code:', sessionError.code);
  console.error('❌ Error message:', sessionError.message);
  console.error('❌ Error details:', sessionError.details);
}
```

### 4. Test Direct Insert

**Create a test endpoint to verify service role works:**

```typescript
// Test endpoint: /api/test/service-role-insert
export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    const { data, error } = await supabaseAdmin
      .from('two_factor_verification_sessions')
      .insert({
        id: crypto.randomUUID(),
        user_id: '00000000-0000-0000-0000-000000000000'::uuid,
        email: 'test@example.com',
        password_hash: 'test',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        verified: false,
      });
    
    if (error) {
      return Response.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details 
      }, { status: 500 });
    }
    
    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}
```

## Possible Issues

### Issue 1: Wrong Client Used
**Symptom:** Using regular Supabase client instead of service role client
**Fix:** Ensure `supabaseAdmin` (with service role key) is used for inserts

### Issue 2: Environment Variable Not Set
**Symptom:** `SUPABASE_SERVICE_ROLE_KEY` is undefined or incorrect
**Fix:** Set correct value in Vercel environment variables

### Issue 3: Client Created Incorrectly
**Symptom:** Service role client created but not used
**Fix:** Verify the insert uses `supabaseAdmin`, not a different client

### Issue 4: Cached Client
**Symptom:** Old client instance cached
**Fix:** Ensure new client is created for each request

## Expected Fix

Once the backend is verified to use the service role client correctly, the insert should work because:

✅ RLS policy allows `service_role` full access
✅ Policy has `USING (true)` and `WITH CHECK (true)` (unrestricted)
✅ Service role bypasses RLS when policy exists

## Status

- ✅ Database RLS policy: **Correctly configured**
- ✅ Table structure: **Correct**
- ⏳ **Backend code/configuration: Needs verification** ← CURRENT ISSUE

## Next Steps

1. Verify backend uses service role client for insert
2. Verify environment variable is set correctly
3. Add debug logging to see what's happening
4. Test with direct insert endpoint
5. Fix backend code if needed

---

**The RLS policy is correct. The issue is in the backend implementation.**

