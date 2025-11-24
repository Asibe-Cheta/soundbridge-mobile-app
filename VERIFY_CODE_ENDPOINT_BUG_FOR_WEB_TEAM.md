# 🐛 Verify-Code Endpoint Bug - "userData is not defined"

## Summary

The `/api/user/2fa/verify-code` endpoint is returning a 500 error:
```
"error": "userData is not defined",
"code": "INTERNAL_ERROR"
```

## Current Status

✅ **Login-initiate endpoint works:**
- Returns `verificationSessionId` correctly
- No RLS errors
- Mobile app navigates to 2FA screen successfully

❌ **Verify-code endpoint fails:**
- Error: "userData is not defined"
- Status: 500
- Code: "INTERNAL_ERROR"

## Request Format (What Mobile App Sends)

**Endpoint:** `POST /api/user/2fa/verify-code`

**Request Body:**
```json
{
  "verificationSessionId": "a772658b-41fb-4d3b-b...",
  "code": "867369"
}
```

**Note:** The mobile app now sends `verificationSessionId` (not `sessionToken`) as part of the secure login-initiate flow.

## Root Cause

The backend code is trying to use a variable called `userData` that is not defined. This likely means:

1. **The endpoint wasn't updated** to work with `verificationSessionId` from the new login-initiate flow
2. **The session lookup code is missing** - The code should look up the verification session and extract user data
3. **The extraction step is missing** - After looking up the session, `userData` should be extracted from it

## Expected Implementation

The `/api/user/2fa/verify-code` endpoint should:

### Step 1: Look Up Verification Session

```typescript
// In /api/user/2fa/verify-code/route.ts
const { verificationSessionId, code } = await request.json();

// Create service role client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Look up the verification session
const { data: session, error: sessionError } = await supabaseAdmin
  .from('two_factor_verification_sessions')
  .select('user_id, email, password_hash, expires_at, verified')
  .eq('id', verificationSessionId)
  .single();

if (sessionError || !session) {
  return NextResponse.json({
    success: false,
    error: 'Invalid or expired verification session',
    code: 'SESSION_INVALID'
  }, { status: 400 });
}

// Check if session is expired
if (new Date(session.expires_at) < new Date()) {
  return NextResponse.json({
    success: false,
    error: 'Verification session expired',
    code: 'SESSION_EXPIRED'
  }, { status: 400 });
}
```

### Step 2: Extract User Data

```typescript
// Extract userData from the session
const userData = {
  userId: session.user_id,
  email: session.email,
  passwordHash: session.password_hash
};

// Now userData is defined and can be used
```

### Step 3: Verify TOTP Code

```typescript
// Get user's 2FA secret from database
const { data: twoFactorData } = await supabaseAdmin
  .from('two_factor_secrets')
  .select('encrypted_secret')
  .eq('user_id', userData.userId)
  .single();

// Decrypt and verify TOTP code
// ... (your existing TOTP verification logic)
```

### Step 4: Re-authenticate and Return Tokens

```typescript
// Decrypt password_hash
const decryptedPassword = decryptPassword(userData.passwordHash);

// Re-authenticate user
const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
  email: userData.email,
  password: decryptedPassword,
});

if (authError || !authData.session) {
  return NextResponse.json({
    success: false,
    error: 'Authentication failed',
    code: 'AUTH_FAILED'
  }, { status: 401 });
}

// Return tokens
return NextResponse.json({
  success: true,
  data: {
    verified: true,
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
    userId: userData.userId,
    email: userData.email,
    message: 'Verification successful'
  }
});
```

## What to Check

**In `/api/user/2fa/verify-code/route.ts`:**

1. ✅ Does it accept `verificationSessionId` in the request body?
2. ✅ Does it look up the verification session from `two_factor_verification_sessions` table?
3. ✅ Does it extract `userData` from the session (user_id, email, password_hash)?
4. ✅ Does it use `userData` to verify the TOTP code and authenticate?

## Most Likely Issue

The endpoint probably has code like:
```typescript
// Somewhere in the code
const userData = ...; // ← This is undefined or missing
// Then tries to use userData.userId, userData.email, etc.
```

But the code that should define `userData` from the verification session lookup is missing.

## Quick Fix

**Add this right after parsing the request body:**

```typescript
const { verificationSessionId, code } = await request.json();

// ADD THIS: Look up verification session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: session, error: sessionError } = await supabaseAdmin
  .from('two_factor_verification_sessions')
  .select('user_id, email, password_hash, expires_at, verified')
  .eq('id', verificationSessionId)
  .single();

if (sessionError || !session) {
  return NextResponse.json({
    success: false,
    error: 'Invalid or expired verification session',
    code: 'SESSION_INVALID'
  }, { status: 400 });
}

// ADD THIS: Extract userData
const userData = {
  userId: session.user_id,
  email: session.email,
  passwordHash: session.password_hash
};

// Now userData is defined and can be used in the rest of the code
```

## Database Schema Reference

The `two_factor_verification_sessions` table has:
- `id` (UUID) - the `verificationSessionId`
- `user_id` (UUID) - the user's ID
- `email` (string) - the user's email
- `password_hash` (encrypted string) - encrypted password for re-authentication
- `expires_at` (timestamp) - when the session expires
- `verified` (boolean) - whether the session has been verified

## Expected Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.abc123def456...",
    "userId": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
    "email": "user@example.com",
    "message": "Verification successful"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid verification code",
  "code": "INVALID_CODE",
  "attemptsRemaining": 2
}
```

---

**The fix is to look up the verification session and extract `userData` from it before using it in the verification logic.**

