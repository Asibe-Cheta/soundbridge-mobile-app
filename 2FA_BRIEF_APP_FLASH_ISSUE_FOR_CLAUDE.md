# 🔴 2FA Brief App Flash Issue - Question for Claude

## Problem Summary

After entering email/password on the login screen, the app **briefly shows the main app (MainTabs)** before navigating to the 2FA screen. This is a poor user experience - users shouldn't see the app content before completing 2FA verification.

## Current Flow (The Problem)

```
1. User enters email + password
   ↓
2. loginWithTwoFactorCheck() calls signInWithPassword()
   ↓
3. Supabase signs in → Session created
   ↓
4. onAuthStateChange fires → SIGNED_IN event
   ↓
5. AuthContext sets user state → user becomes true
   ↓
6. AppNavigator sees user=true → Shows MainTabs briefly ⚠️
   ↓
7. loginWithTwoFactorCheck() checks 2FA requirement
   ↓
8. If 2FA required → Signs out from Supabase
   ↓
9. user becomes false → AppNavigator shows Auth screen
   ↓
10. Navigate to TwoFactorVerification screen
```

**The issue:** Steps 4-6 happen before step 7, causing the brief flash of MainTabs.

## Current Implementation

### loginWithTwoFactorCheck() Flow

```typescript
// src/services/twoFactorAuthService.ts
export async function loginWithTwoFactorCheck(
  email: string,
  password: string
): Promise<LoginResult> {
  // STEP 1: Login with Supabase FIRST
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  // This triggers onAuthStateChange → user becomes true → AppNavigator shows MainTabs
  
  // STEP 2: Check if 2FA is required (AFTER signing in)
  const twoFactorResponse = await checkTwoFactorRequired(data.session, data.user.id);
  
  if (twoFactorResponse.data?.twoFactorRequired) {
    // STEP 3: Sign out to prevent access
    await supabase.auth.signOut();
    // Now user becomes false → AppNavigator shows Auth screen
    
    return {
      requires2FA: true,
      userId: data.user.id,
      email: data.user.email || email,
      sessionToken: twoFactorResponse.data?.sessionToken,
    };
  }
  
  // If no 2FA, return session
  return {
    requires2FA: false,
    session: data.session,
    user: data.user,
  };
}
```

### AppNavigator Logic

```typescript
// App.tsx
function AppNavigator() {
  const { user, loading, needsOnboarding } = useAuth();
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          // Auth flow
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="TwoFactorVerification" component={TwoFactorVerificationScreen} />
          </>
        ) : needsOnboarding ? (
          // Onboarding
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // Main app - THIS SHOWS BRIEFLY WHEN user becomes true
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Root Cause

The problem is that we **sign in first, then check 2FA**. This means:
1. `signInWithPassword()` creates a session
2. `onAuthStateChange` fires immediately with `SIGNED_IN` event
3. `AuthContext` sets `user` state to `true`
4. `AppNavigator` sees `user=true` and renders `MainTabs`
5. **THEN** we check 2FA and sign out
6. `user` becomes `false` and we navigate to 2FA screen

The brief flash happens between steps 4 and 5.

## Proposed Solution (From Previous Claude Response)

Claude previously suggested checking 2FA **BEFORE** signing in, using a new endpoint:

```typescript
// Check 2FA requirement by email (without signing in)
const checkResponse = await fetch(`${API_BASE_URL}/api/user/2fa/check-required-by-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});

const is2FARequired = checkResponse.data?.twoFactorRequired ?? false;

if (is2FARequired) {
  // Don't sign in yet - just return that 2FA is needed
  // Create a temporary session token for 2FA verification
  const tempSessionToken = await createTempSessionToken(email, password);
  
  return {
    requires2FA: true,
    userId: checkData.data.userId,
    email: email,
    verificationSessionId: tempSessionToken,
  };
}

// If 2FA not required, proceed with normal login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

## Questions for Claude

1. **Does the backend have a `/api/user/2fa/check-required-by-email` endpoint?** This endpoint would check if 2FA is enabled for a user by email, without requiring authentication.

2. **If not, can we create one?** The endpoint would:
   - Accept `{ email }` in the request body
   - Query the database to check if `two_factor_enabled` is true for that email
   - Return `{ success: true, data: { twoFactorRequired: boolean, userId: string } }`
   - **NOT require authentication** (since we're checking before login)

3. **Alternative: Can we prevent the flash without a new endpoint?** For example:
   - Use a flag like `isChecking2FA` to prevent `AppNavigator` from showing MainTabs during the check?
   - Delay the `onAuthStateChange` handler until after 2FA check completes?
   - Use a different navigation approach?

4. **What's the best approach?** Should we:
   - **Option A:** Create the new endpoint and check 2FA before signing in (cleanest, but requires backend work)
   - **Option B:** Use a flag to prevent MainTabs from showing during 2FA check (quick fix, but still signs in first)
   - **Option C:** Something else?

## Current Backend Endpoints

We currently have:
- `POST /api/user/2fa/check-required` - Requires authentication (needs session token)
- `POST /api/user/2fa/verify-code` - Requires sessionToken (from check-required)
- `POST /api/user/2fa/verify-backup-code` - Requires sessionToken

We need:
- `POST /api/user/2fa/check-required-by-email` - **No authentication required** (checks before login)

## Expected New Flow (If We Have the Endpoint)

```
1. User enters email + password
   ↓
2. Check 2FA requirement by email (no sign in yet)
   ↓
3a. If 2FA required:
    ├─ Don't sign in
    ├─ Create temporary session token
    ├─ Navigate to 2FA screen (user is still false)
    ├─ User enters code
    ├─ Verify code → Get tokens
    ├─ Set session → SIGNED_IN event
    ├─ User becomes true
    └─ Navigate to MainTabs ✅
   
3b. If 2FA not required:
    ├─ Sign in normally
    ├─ SIGNED_IN event
    ├─ User becomes true
    └─ Navigate to MainTabs ✅
```

## Implementation Details Needed

If we go with Option A (new endpoint), we need:

1. **Backend endpoint specification:**
   ```typescript
   POST /api/user/2fa/check-required-by-email
   Body: { email: string }
   Response: {
     success: true,
     data: {
       twoFactorRequired: boolean,
       userId: string
     }
   }
   ```

2. **Temporary session token creation:**
   - How do we create a temporary session for 2FA verification?
   - Should we validate email/password first?
   - Or just create a session token based on email?

3. **Security considerations:**
   - Should we rate limit this endpoint?
   - Should we validate email format?
   - Should we check if user exists before revealing 2FA status?

## Current Workaround (If No New Endpoint)

If we can't create the new endpoint, we could:

1. Set `isChecking2FA(true)` **before** calling `loginWithTwoFactorCheck()`
2. In `AppNavigator`, check `isChecking2FA` and show a loading screen instead of MainTabs
3. Only show MainTabs if `user=true` AND `!isChecking2FA`

But this still signs in first, which is not ideal.

## Request

Please provide:
1. Whether the backend can support a `/api/user/2fa/check-required-by-email` endpoint
2. If yes, the exact endpoint specification and implementation details
3. If no, the best alternative approach to prevent the brief flash
4. Any security considerations we should be aware of

Thank you!

