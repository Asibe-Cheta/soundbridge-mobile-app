# 2FA Login Issues - Mobile Team Needs Help

**Date:** 2025-11-23  
**Priority:** URGENT  
**Status:** Blocking user login

## Summary

The mobile app is experiencing critical issues with the 2FA login flow. Users with 2FA enabled cannot successfully log in due to:

1. **Navigation/State Issue:** User briefly sees the app home screen before being redirected to 2FA screen
2. **Code Validation Issue:** Correct 6-digit codes are being rejected with "Invalid Code" error

## Current Implementation

### Login Flow
1. User enters email/password
2. Mobile app calls `supabase.auth.signInWithPassword()` ✅
3. Mobile app calls `/api/user/2fa/check-required` with `userId` in body ✅
4. Backend responds with `twoFactorRequired: true` and `sessionToken` ✅
5. Mobile app signs out from Supabase immediately ✅
6. Mobile app navigates to `TwoFactorVerificationScreen` with `userId`, `email`, `sessionToken` ✅
7. User enters 6-digit code from authenticator app
8. Mobile app calls `/api/user/2fa/verify-code` with:
   - `userId`
   - `sessionToken` (as Bearer token)
   - `code`
   - `trustDevice: false`

### API Endpoints Used

**POST `/api/user/2fa/check-required`**
- Body: `{ userId: string }`
- Headers: `Authorization: Bearer <supabase_access_token>`
- Response: 
  ```json
  {
    "success": true,
    "data": {
      "twoFactorRequired": true,
      "sessionToken": "...",
      "expiresIn": 300,
      "message": "Please verify your identity with a 2FA code",
      "method": "totp"
    }
  }
  ```

**POST `/api/user/2fa/verify-code`**
- Body: `{ userId: string, sessionToken: string, code: string, trustDevice: boolean }`
- Headers: `Authorization: Bearer <sessionToken>`
- Expected Response:
  ```json
  {
    "success": true,
    "accessToken": "...",
    "refreshToken": "..."
  }
  ```

## Issue #1: Navigation/State Problem

### Symptoms
- User logs in with email/password
- App shows home screen (MainTabs) for 3-5 seconds
- App then redirects to 2FA verification screen
- This creates a jarring user experience

### Root Cause
The `onAuthStateChange` listener in `AuthContext` fires **immediately** when Supabase login succeeds, setting the user state **before** we can check if 2FA is required. This causes `AppNavigator` to show `MainTabs` because `user !== null`.

Even though we:
1. Set `twoFactorPending = true` flag
2. Sign out from Supabase immediately
3. Navigate to 2FA screen

The `onAuthStateChange` event has already fired and set the user state, causing the flash.

### Current Code Flow
```typescript
// In AuthScreen.tsx
1. Set twoFactorPending = true (BEFORE login)
2. Call loginWithTwoFactorCheck()

// In twoFactorAuthService.ts
3. Supabase login succeeds → onAuthStateChange fires → user state is set ❌
4. Check 2FA required → returns true
5. Sign out from Supabase IMMEDIATELY (await supabase.auth.signOut())
6. Return result with requires2FA: true

// In AuthScreen.tsx
7. Receive result.requires2FA === true
8. Navigate using reset() to TwoFactorVerification screen
```

### Actual Logs
```
[00:06:34] LOG: 🚩 2FA pending flag set to true (before login)
[00:06:34] LOG: 🔐 Starting login with 2FA check...
[00:06:37] LOG: ✅ Step 1 complete: Supabase login successful
[00:06:38] LOG: 🔐 2FA IS REQUIRED - User must verify
[00:06:38] LOG: 🚪 Signing out from Supabase IMMEDIATELY (before navigation)...
[00:06:39] LOG: ✅ Supabase session cleared - awaiting 2FA verification
[00:06:39] LOG: 🚩 2FA pending flag set to true
[00:06:39] LOG: 📤 Navigating to TwoFactorVerification with: {...}
```

**Problem:** The `onAuthStateChange` event fires between step 3 and step 5, setting user state before we can block it.

### Questions for Web Team
1. **Is there a way to prevent Supabase from firing `onAuthStateChange` until after we check 2FA?**
2. **Should we use a different authentication flow that doesn't create a session until 2FA is verified?**
3. **Can we check 2FA status BEFORE calling `signInWithPassword`?** (e.g., using a separate endpoint that doesn't require authentication)

## Issue #2: Verify Button Not Working

### Symptoms
- User enters 6-digit code from Google Authenticator ✅
- No validation error appears ✅
- User clicks "Verify" button
- **NOTHING HAPPENS** - No logs, no API call, no response, no error
- Button appears to be clickable (not disabled)

### Current Implementation
```typescript
// Verify button onPress handler
onPress={() => {
  console.log('🔘 Verify button pressed!', {...});
  handleVerify();
}}

// handleVerify function
const handleVerify = async () => {
  if (isLoading || lockoutTime) {
    console.log('⚠️ Verify blocked: isLoading=', isLoading, 'lockoutTime=', lockoutTime);
    return;
  }
  // ... validation and API call
}
```

### Debug Logs (MISSING)
**We are NOT seeing any logs when the verify button is clicked:**
- No "🔘 Verify button pressed!" log
- No "🔐 handleVerify called" log
- No "⚠️ Verify blocked" log
- No API call logs
- No error logs

This suggests:
1. The `onPress` handler is not being called at all
2. OR the button is somehow disabled/blocked
3. OR there's a React Native event handling issue

### Questions for Web Team
1. **Is the `/api/user/2fa/verify-code` endpoint working correctly?** 
   - Can you test it with our sessionToken and a valid code?
   - Are there any known issues with this endpoint?
   - Does it require any special headers or request format?

2. **What is the exact format expected for the `code` parameter?** 
   - Should it be a string of 6 digits? (e.g., "123456")
   - Any leading zeros? (e.g., "012345")
   - Any whitespace allowed?

3. **Are there any timing requirements?** 
   - Should codes be submitted immediately when entered?
   - Is there a minimum time between attempts?

4. **What error responses should we expect from `/api/user/2fa/verify-code`?**
   - Invalid code format?
   - Expired code?
   - Rate limiting?
   - Session token expired?

5. **Can you provide example request/response for a successful verification?**
   ```json
   // Request
   POST /api/user/2fa/verify-code
   Authorization: Bearer <sessionToken>
   {
     "userId": "...",
     "sessionToken": "...",
     "code": "123456",
     "trustDevice": false
   }
   
   // Response (what we should expect)
   {
     "success": true,
     "accessToken": "...",
     "refreshToken": "..."
   }
   ```

## Test Data

**User ID:** `bd8a455d-a54d-45c5-968d-e4cf5e8d928e`  
**Email:** `asibechetachukwu@gmail.com`  
**2FA Status:** Enabled (TOTP)

**Session Token from check-required (latest):**
```
04d2e35e37e73d8b8b40cec3eba0ec1aeaa121c39da2b931c01fb7ae8286e1d6
```

## Latest Test Results

**Test Time:** 2024-12-19 00:06

### Login Flow Logs
```
[00:06:34] LOG: 🔐 Starting login with 2FA check...
[00:06:34] LOG: 🔐 Step 1: Attempting Supabase login...
[00:06:37] LOG: ✅ Step 1 complete: Supabase login successful
[00:06:38] LOG: 🔐 2FA IS REQUIRED - User must verify
[00:06:38] LOG: 🚪 Signing out from Supabase IMMEDIATELY (before navigation)...
[00:06:39] LOG: ✅ Supabase session cleared - awaiting 2FA verification
[00:06:39] LOG: 🚩 2FA pending flag set to true
[00:06:39] LOG: 📤 Navigating to TwoFactorVerification with: {...}
```

**Observation:** Navigation happens, but user sees home screen for 3-5 seconds first.

### Verify Button Issue
- **No logs** when verify button is clicked
- Button appears enabled (not grayed out)
- No network requests in debug panel
- No errors in console

**This is the most critical issue - users cannot complete 2FA verification.**

## Requested Help

1. **Clarify the correct flow** - Should we sign out before or after 2FA check?
2. **Verify the code format** - What exact format does the API expect?
3. **Check API responses** - Are we handling the responses correctly?
4. **Test with our user** - Can you verify the sessionToken and code verification works on your end?

## Mobile Team Contact

If you need more information or want to test together, please let us know. We can provide:
- Full request/response logs
- Network traces
- Screen recordings
- Access to test account

Thank you!

