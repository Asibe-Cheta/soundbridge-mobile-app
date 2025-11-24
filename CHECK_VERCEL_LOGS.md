# 🔍 Check Vercel Logs - Debug Information Needed

## Issue

The RLS error persists after the backend fix. We need to see the debug logs to diagnose.

## Action Required

**Check Vercel Function Logs for `/api/auth/login-initiate`:**

1. Go to Vercel Dashboard → Your Project → Functions
2. Find the `/api/auth/login-initiate` function
3. Check the logs for the request that failed (around 03:24:15)
4. Look for the `🔍 Service Role Client Verification:` section

## What to Look For

The debug logs should show:

```
🔍 Service Role Client Verification:
  - supabaseAdmin exists: [true/false]
  - SUPABASE_SERVICE_ROLE_KEY exists: [true/false]
  - SUPABASE_SERVICE_ROLE_KEY length: [number]
  - SUPABASE_SERVICE_ROLE_KEY starts with: [first 10 chars]
  - SUPABASE_URL exists: [true/false]
  - Client type check: [object/undefined]
```

## Possible Scenarios

### Scenario 1: Service Role Key Not Found
**If logs show:**
```
SUPABASE_SERVICE_ROLE_KEY exists: false
```

**Fix:** Environment variable not set or not accessible in the function

### Scenario 2: Client Not Created
**If logs show:**
```
supabaseAdmin exists: false
```

**Fix:** Client creation is failing

### Scenario 3: Wrong Client Used
**If logs show everything is correct but RLS error persists:**

The insert might still be using a different client. Check the actual insert code.

## Alternative: Test Endpoint

If logs are hard to access, create a test endpoint:

```typescript
// /api/test/service-role-insert
export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('🔍 Test - Service Role Key:');
  console.log('  - Exists:', !!serviceRoleKey);
  console.log('  - Length:', serviceRoleKey?.length || 0);
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey!
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
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json({ 
      success: false, 
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
```

**Test:** `GET https://www.soundbridge.live/api/test/service-role-insert`

This will tell us if the service role client can insert at all.

## Next Steps

1. **Check Vercel logs** for the debug output
2. **Share the logs** with the web team
3. **Or create test endpoint** to isolate the issue
4. **Verify** the service role key is accessible in the function

---

**The RLS policy is correct. We need to see what the backend is actually doing.**

