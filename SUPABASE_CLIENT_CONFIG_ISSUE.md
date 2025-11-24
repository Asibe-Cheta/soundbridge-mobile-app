# 🔴 Supabase Client Configuration Issue - Service Role Not Bypassing RLS

## Problem Summary

The service role client is being created correctly:
- ✅ Service role key exists and is correct (219 chars, JWT format)
- ✅ Client is created as object
- ✅ `usingServiceRole: true` is confirmed
- ❌ **But insert still fails with RLS error `42501`**

## Root Cause

The Supabase client might not be properly configured to use the service role key, or the Supabase JS library version might have an issue with service role authentication.

## Solutions to Try

### Solution 1: Explicit Auth Header Configuration

**Update the client creation to explicitly set auth headers:**

```typescript
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  
  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'apikey': serviceRoleKey, // Explicitly set API key header
        'Authorization': `Bearer ${serviceRoleKey}`, // Explicitly set Bearer token
      },
    },
  });
}
```

### Solution 2: Use Supabase Admin Client Pattern

**Try using the admin client pattern explicitly:**

```typescript
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Create client with explicit service role configuration
  const client = createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      flowType: 'pkce', // Try explicit flow type
    },
    db: {
      schema: 'public',
    },
  });
  
  // Verify client has service role
  console.log('🔍 Client auth config:', {
    url: client.supabaseUrl,
    hasAuth: !!client.auth,
    keyLength: serviceRoleKey?.length,
  });
  
  return client;
}
```

### Solution 3: Check Supabase JS Version

**Verify the Supabase JS library version supports service role correctly:**

```bash
# In web app directory
npm list @supabase/supabase-js
```

**If version is old, update:**

```bash
npm install @supabase/supabase-js@latest
```

### Solution 4: Direct PostgreSQL Connection (Last Resort)

**If Supabase client still doesn't work, use direct PostgreSQL connection:**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Direct PostgreSQL connection string
  ssl: { rejectUnauthorized: false },
});

// Then use pool.query() instead of supabase client
await pool.query(
  'INSERT INTO two_factor_verification_sessions (id, user_id, email, password_hash, expires_at, verified) VALUES ($1, $2, $3, $4, $5, $6)',
  [verificationSessionId, userId, email, passwordHash, expiresAt, false]
);
```

**⚠️ Note:** This bypasses Supabase entirely and uses direct PostgreSQL, which will bypass RLS.

### Solution 5: Verify Service Role Key Format

**Check if the service role key needs to be decoded or used differently:**

```typescript
// Add this debug check
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('🔍 Service Role Key Analysis:');
console.log('  - Full key:', serviceRoleKey);
console.log('  - Is JWT:', serviceRoleKey?.startsWith('eyJ'));
console.log('  - Key parts:', serviceRoleKey?.split('.').length || 0);

// Try creating client with explicit key
const client = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test if client can access auth
console.log('🔍 Client auth test:', {
  hasAuth: !!client.auth,
  authMethods: Object.keys(client.auth || {}),
});
```

## Most Likely Fix

**Try Solution 1 first** - explicitly setting the `apikey` and `Authorization` headers in the global config. This ensures the Supabase client knows it's using service role.

## Debug Steps

1. **Add this before the insert:**

```typescript
// Verify client is actually using service role
const { data: { user } } = await supabaseAdmin.auth.getUser();
console.log('🔍 Current auth user:', user?.id || 'No user (service role)');

// Try a simple query first
const { data: testData, error: testError } = await supabaseAdmin
  .from('two_factor_verification_sessions')
  .select('id')
  .limit(1);
  
console.log('🔍 Test query result:', {
  hasData: !!testData,
  error: testError?.message,
  errorCode: testError?.code,
});
```

2. **If test query also fails with RLS**, the client is definitely not recognized as service role.

3. **If test query succeeds but insert fails**, there might be a specific issue with the insert operation.

## Expected Fix

After applying Solution 1 (explicit headers), the insert should work because:
- ✅ Headers explicitly tell Supabase this is service role
- ✅ Bypasses RLS when service role is used
- ✅ Matches Supabase documentation for service role usage

## Status

- ✅ Service role key: Correct
- ✅ Client creation: Correct
- ❌ **Client configuration: Needs explicit headers** ← LIKELY ISSUE
- ⏳ Ready for testing after header fix

---

**The client is created but not recognized as service role. Explicit headers should fix it.**

