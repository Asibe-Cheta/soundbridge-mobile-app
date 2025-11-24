# 🚨 CRITICAL: Supabase `setSession()` Hanging in React Native

## Problem Summary

The `supabase.auth.setSession()` method is **hanging indefinitely** (timing out after 10 seconds) when called after successful 2FA verification in a React Native mobile app. The function never resolves or rejects, preventing the user from being logged in.

## Environment Details

- **Platform:** React Native (Expo)
- **Supabase SDK:** `@supabase/supabase-js` (latest version)
- **Storage:** `@react-native-async-storage/async-storage`
- **OS:** iOS (testing on physical device)
- **Supabase URL:** `https://aunxdbqukbxyyiusaeqi.supabase.co`

## Current Implementation

### Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://aunxdbqukbxyyiusaeqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### The Problematic Code

```typescript
// src/services/twoFactorAuthService.ts
async function setSupabaseSessionFromTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  debugLog('🔧🔧🔧 setSupabaseSessionFromTokens CALLED - START 🔧🔧🔧');
  debugLog('🔧 supabase exists:', !!supabase);
  debugLog('🔧 supabase.auth exists:', !!supabase?.auth);
  debugLog('🔧 supabase.auth.setSession exists:', typeof supabase?.auth?.setSession === 'function');
  
  try {
    debugLog('🔧 About to call supabase.auth.setSession...');
    
    // ⚠️ THIS CALL HANGS AND NEVER RESOLVES
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    // ⚠️ THIS LINE IS NEVER REACHED
    debugLog('🔧 setSession promise resolved');
    
    if (error) {
      throw error;
    }
    
    if (data?.session) {
      debugLog('✅ Supabase session established');
    }
  } catch (error) {
    debugError('❌ Error setting Supabase session:', error);
    throw error;
  }
}
```

## Observed Behavior

### What Works ✅
1. **Supabase client initialization:** ✅ Client is created successfully
2. **Auth methods exist:** ✅ `supabase.auth.setSession` is a function
3. **Token format:** ✅ Tokens are valid JWT strings (871 chars access, 12 chars refresh)
4. **API verification:** ✅ 2FA verification succeeds, tokens are received
5. **Function entry:** ✅ Function is called and reaches the `setSession` call

### What Fails ❌
1. **`setSession()` call:** ❌ Hangs indefinitely, never resolves or rejects
2. **Timeout:** ❌ Times out after 10 seconds with custom timeout wrapper
3. **No error:** ❌ No error is thrown, promise just never resolves
4. **No response:** ❌ No data or error returned

## Logs from Actual Test

```
[21:52:40] LOG: 🔧🔧🔧 setSupabaseSessionFromTokens CALLED - START 🔧🔧🔧
[21:52:40] LOG: 🔧 Function entry point reached
[21:52:40] LOG: 🔑 Access token (first 50 chars): eyJhbGciOiJIUzI1NiIsImtpZCI6Im9yZXp2SVFOaVlBOXlBSE...
[21:52:40] LOG: 🔑 Refresh token (first 20 chars): rmpshaqgmyb6...
[21:52:40] LOG: 🔧 Checking supabase client...
[21:52:40] LOG: 🔧 supabase exists: true
[21:52:40] LOG: 🔧 supabase.auth exists: true
[21:52:40] LOG: 🔧 supabase.auth.setSession exists: true
[21:52:40] LOG: 🔧 About to call supabase.auth.setSession...
[21:52:40] LOG: 🔧 Token lengths: { accessTokenLength: 871, refreshTokenLength: 12 }
[21:52:40] LOG: 🔧 setSession promise created, awaiting...
[21:52:50] ERROR: ❌ Failed to set Supabase session: {}
[21:52:50] ERROR: ❌ Error details: {
  "message": "setSession timeout after 10 seconds",
  "name": "Error"
}
```

**Key observation:** The promise is created, but `await` never resolves. No error is thrown by Supabase itself.

## What We've Tried

1. ✅ **Verified client setup:** Supabase client is correctly initialized
2. ✅ **Verified tokens:** Tokens are valid JWT format from backend
3. ✅ **Added timeout wrapper:** Confirmed the promise never resolves
4. ✅ **Checked function existence:** `setSession` is definitely a function
5. ✅ **Added extensive logging:** Confirmed execution reaches the `await` line
6. ❌ **Tried without timeout:** Still hangs indefinitely
7. ❌ **Tried with error handling:** No error is thrown

## Token Details

**Access Token (JWT decoded):**
```json
{
  "iss": "https://aunxdbqukbxyyiusaeqi.supabase.co/auth/v1",
  "sub": "bd8a455d-a54d-45c5-968d-e4cf5e8d928e",
  "aud": "authenticated",
  "exp": 1763938360,
  "iat": 1763934760,
  "email": "asibechetachukwu@gmail.com",
  "role": "authenticated",
  "aal": "aal1",
  "amr": [{"method": "otp", "timestamp": 1763934760}],
  "session_id": "5018bd0f-1209-4e44-8ec3-79e579d97033",
  "is_anonymous": false
}
```

**Refresh Token:** `rmpshaqgmyb6` (12 characters)

## Questions for Help

1. **Is `setSession()` known to hang in React Native?** Are there any React Native-specific issues with this method?

2. **Should we use a different method?** Is there an alternative way to set the session in React Native (e.g., manually writing to AsyncStorage, using a different Supabase method)?

3. **Are there required Supabase client options?** Are we missing any required configuration options for React Native that would make `setSession()` work?

4. **Is there a network issue?** Does `setSession()` make a network call that might be failing silently? Should we check network connectivity?

5. **Token format issue?** Are the tokens in the correct format? The refresh token is only 12 characters - is that normal?

6. **AsyncStorage issue?** Could there be an issue with AsyncStorage that's causing the hang? Should we try a different storage mechanism?

7. **Timing issue?** Should we wait before calling `setSession()`? Is there a required delay after receiving tokens?

8. **Client state issue?** Could the Supabase client be in a bad state after a previous `signOut()` call? Should we recreate the client?

9. **Known workarounds?** Are there any known workarounds or alternative implementations for setting sessions in React Native after 2FA?

10. **Version compatibility?** Are there specific versions of `@supabase/supabase-js` or `@react-native-async-storage/async-storage` that are known to work better together?

## Alternative Approaches We're Considering

1. **Manual AsyncStorage write:** Manually write tokens to AsyncStorage in the format Supabase expects
2. **Recreate client:** Create a new Supabase client instance after setting session
3. **Use `signInWithPassword` with tokens:** Try using tokens in a different auth method
4. **Direct API call:** Make a direct HTTP call to Supabase auth endpoint to set session

## Additional Context

- This happens **after** successful 2FA verification
- The user was previously signed out with `supabase.auth.signOut()` before 2FA check
- The tokens are received from our backend API (`/api/user/2fa/verify-code`)
- The same tokens work fine in the web app (using the same Supabase instance)
- This is blocking the entire 2FA login flow

## Request for Help

We need guidance on:
1. Why `setSession()` is hanging in React Native
2. The correct way to set a session from tokens in React Native
3. Any known issues or workarounds for this specific scenario

Any help, documentation links, or code examples would be greatly appreciated!

---

**Generated:** 2025-01-XX  
**Priority:** 🚨 CRITICAL - Blocking 2FA login flow  
**Status:** Awaiting solution

