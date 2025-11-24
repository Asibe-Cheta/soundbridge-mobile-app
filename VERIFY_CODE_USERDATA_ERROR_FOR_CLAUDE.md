# 🔴 Verify-Code Endpoint Error - "userData is not defined"

## Problem Summary

The `/api/user/2fa/verify-code` endpoint is returning a 500 error with:
```
"error": "userData is not defined",
"code": "INTERNAL_ERROR"
```

## Success So Far

✅ **Login-initiate endpoint works:**
- Returns `verificationSessionId` correctly
- No RLS errors
- Mobile app navigates to 2FA screen successfully

❌ **Verify-code endpoint fails:**
- Error: "userData is not defined"
- Status: 500
- Code: "INTERNAL_ERROR"

## Request Details

**Endpoint:** `POST /api/user/2fa/verify-code`

**Request Body:**
```json
{
  "verificationSessionId": "a772658b-41fb-4d3b-b...",
  "code": "867369"
}
```

**Response:**
```json
{
  "success": false,
  "error": "userData is not defined",
  "code": "INTERNAL_ERROR"
}
```

## Root Cause Analysis

The error "userData is not defined" suggests:

1. **Variable name mismatch** - The code is trying to use `userData` but it's not defined
2. **Missing data extraction** - The code might be trying to access `userData` from a response/query that doesn't exist
3. **Code not updated** - The verify-code endpoint might not have been updated to work with `verificationSessionId` instead of `sessionToken`

## Expected Flow

When using `verificationSessionId`:

1. Backend receives `verificationSessionId` and `code`
2. Backend looks up the verification session from database using `verificationSessionId`
3. Backend extracts user data from the session (user_id, email, password_hash)
4. Backend verifies the TOTP code
5. Backend decrypts password_hash and re-authenticates user
6. Backend returns access/refresh tokens

## What `userData` Should Be

Based on the `login-initiate` flow, the `two_factor_verification_sessions` table contains:
- `id` (UUID) - the `verificationSessionId`
- `user_id` (UUID) - the user's ID
- `email` (string) - the user's email
- `password_hash` (encrypted string) - the encrypted password for re-authentication
- `expires_at` (timestamp) - when the session expires
- `verified` (boolean) - whether the session has been verified

**`userData` should be extracted from the verification session lookup**, containing:
```typescript
{
  userId: session.user_id,
  email: session.email,
  passwordHash: session.password_hash
}
```

## Questions for Claude

1. **Why is `userData` undefined?** The backend code is trying to use `userData` but it's not being set. Is it:
   - The session lookup failing/returning null?
   - The code that extracts `userData` from the session missing?
   - The variable name wrong (should it be something else)?

2. **What's the correct implementation?** The endpoint should:
   - Look up verification session by `verificationSessionId`:
     ```typescript
     const { data: session, error } = await supabaseAdmin
       .from('two_factor_verification_sessions')
       .select('user_id, email, password_hash, expires_at, verified')
       .eq('id', verificationSessionId)
       .single();
     ```
   - Extract user data:
     ```typescript
     const userData = {
       userId: session.user_id,
       email: session.email,
       passwordHash: session.password_hash
     };
     ```
   - Verify TOTP code using `userData.userId`
   - Decrypt `userData.passwordHash` and re-authenticate
   - Return tokens

3. **Is the endpoint updated for `verificationSessionId`?** The old endpoint expected `sessionToken`, but now we're sending `verificationSessionId`. Has the endpoint been updated to:
   - Accept `verificationSessionId` in the request body (instead of `sessionToken`)?
   - Look up the session using `verificationSessionId`?
   - Extract `userData` from the session?

## Current Implementation (What We Think)

The backend probably has code like:

```typescript
// Somewhere in verify-code route
const userData = ...; // ← This is undefined
// Then tries to use userData
```

But `userData` is never defined or the code that should define it isn't running.

## What Needs to Happen

The `/api/user/2fa/verify-code` endpoint needs to:

1. **Look up verification session:**
   ```typescript
   const { data: session, error: sessionError } = await supabaseAdmin
     .from('two_factor_verification_sessions')
     .select('user_id, email, password_hash, expires_at, verified')
     .eq('id', verificationSessionId)
     .single();
   ```

2. **Extract user data:**
   ```typescript
   const userId = session.user_id;
   const email = session.email;
   const passwordHash = session.password_hash;
   ```

3. **Verify code and authenticate:**
   ```typescript
   // Verify TOTP code
   // Decrypt password_hash
   // Re-authenticate user
   // Return tokens
   ```

## Request

Please provide:
1. **What `userData` should be** - Where it should come from
2. **The correct code** - How to implement the verify-code endpoint with `verificationSessionId`
3. **Any missing steps** - What might be missing in the current implementation

Thank you!

