# 🔴 CRITICAL: App Stuck on Splash Screen After Login with 2FA Enabled

**Date:** Current  
**Priority:** URGENT  
**Status:** Blocking - App unusable after login

---

## 📋 Problem Summary

After entering email and password, the app gets **stuck on the splash screen** and never navigates to the 2FA verification screen. The user has 2FA enabled, so the expected flow should be:

1. User enters email + password → taps "Log In"
2. App shows splash screen briefly
3. App navigates to 2FA verification screen
4. User enters 6-digit code
5. App navigates to MainTabs

**Current behavior:** Step 2 happens, but step 3 never occurs - app stays on splash screen indefinitely.

---

## 🔍 Current Implementation

### **1. AuthScreen Login Flow (`src/screens/AuthScreen.tsx`)**

```typescript
const handleLogin = async () => {
  setIsLoading(true);
  
  try {
    // Use the new 2FA-aware login flow
    debugLog('🔐 Starting login with 2FA check...');
    const result = await loginWithTwoFactorCheck(email, password);
    
    if (result.requires2FA) {
      // 2FA is required - navigate to verification screen
      debugLog('🔐 2FA required - navigating to verification screen');
      
      // Set flag now that we know 2FA is required
      setIsChecking2FA(true);
      debugLog('🚩 2FA check flag set to true (2FA required)');
      
      // Navigate to 2FA screen
      (navigation as any).reset({
        index: 1,
        routes: [
          { name: 'Auth' },
          { 
            name: 'TwoFactorVerification', 
            params: {
              userId: result.userId,
              email: result.email || email,
              sessionToken: result.sessionToken,
            }
          }
        ],
      });
      
      return; // Exit early
    } else {
      // Login successful without 2FA
      debugLog('✅ Login successful without 2FA');
      setIsChecking2FA(false);
      // User state should already be set by onAuthStateChange
    }
  } catch (err: any) {
    setIsChecking2FA(false);
    // Error handling...
  } finally {
    setIsLoading(false);
  }
};
```

### **2. AuthContext onAuthStateChange (`src/contexts/AuthContext.tsx`)**

```typescript
const { data: { subscription }} = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('🔔 Auth state changed:', event, session?.user?.email);
    
    // Handle sign out events
    if (event === 'SIGNED_OUT' || !session) {
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setNeedsOnboarding(false);
      if (!isChecking2FARef.current) {
        setIsChecking2FA(false);
      }
      setLoading(false);
      return;
    }
    
    // ✅ For SIGNED_IN events, always set user state
    if (event === 'SIGNED_IN' && session) {
      console.log('✅ Setting user from SIGNED_IN event');
      setSession(session);
      setUser(session.user);
      await loadUserProfile(session.user.id, session);
      setLoading(false);
      return;
    }
    
    // Token refresh or other events
    setSession(session);
    if (session?.user) {
      setUser(session.user);
      await loadUserProfile(session.user.id, session);
    } else {
      setUserProfile(null);
      setNeedsOnboarding(false);
    }
    
    setLoading(false);
  }
);
```

### **3. loginWithTwoFactorCheck Flow (`src/services/twoFactorAuthService.ts`)**

```typescript
export async function loginWithTwoFactorCheck(
  email: string,
  password: string
): Promise<LoginResult> {
  // STEP 1: Login with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.session || !data.user) throw new Error('Login failed');

  // STEP 2: Check if 2FA is required
  const twoFactorResponse = await checkTwoFactorRequired(data.session, data.user.id);
  const is2FARequired = twoFactorResponse.data?.twoFactorRequired ?? false;
  
  if (is2FARequired === true) {
    // ⚠️ CRITICAL: Sign out from Supabase IMMEDIATELY
    debugLog('🚪 Signing out from Supabase IMMEDIATELY (before navigation)...');
    await supabase.auth.signOut();
    debugLog('✅ Supabase session cleared - awaiting 2FA verification');
    
    return {
      requires2FA: true,
      userId: data.user.id,
      email: data.user.email || email,
      sessionToken: finalSessionToken,
    };
  } else {
    return {
      requires2FA: false,
      session: data.session,
      user: data.user,
    };
  }
}
```

### **4. AppNavigator Logic (`App.tsx`)**

```typescript
function AppNavigator() {
  const { user, loading, needsOnboarding, isChecking2FA } = useAuth();
  
  // Show splash while loading OR while 2FA is being processed
  if (loading || isChecking2FA) {
    return <SplashScreen />;
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="TwoFactorVerification" component={TwoFactorVerificationScreen} />
          </>
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 🔄 Expected Flow (2FA Enabled)

1. **User enters email + password** → taps "Log In"
2. **`handleLogin()` called** → `setIsLoading(true)`
3. **`loginWithTwoFactorCheck()` called**:
   - Calls `supabase.auth.signInWithPassword()` → succeeds
   - `onAuthStateChange` fires with `SIGNED_IN` → sets user state
   - Calls `/api/user/2fa/check-required` → returns `twoFactorRequired: true`
   - Calls `supabase.auth.signOut()` → clears session
   - `onAuthStateChange` fires with `SIGNED_OUT` → clears user state
   - Returns `{ requires2FA: true, userId, email, sessionToken }`
4. **AuthScreen receives result**:
   - Sets `setIsChecking2FA(true)`
   - Navigates to `TwoFactorVerification` screen
5. **AppNavigator re-renders**:
   - `isChecking2FA = true` → shows `SplashScreen` ❌ **STUCK HERE**
   - Should show `TwoFactorVerification` screen instead

---

## 🐛 Root Cause Analysis

The issue is that **AppNavigator shows splash screen when `isChecking2FA` is true**, but we're setting `isChecking2FA = true` AFTER navigating to the 2FA screen. This creates a race condition:

1. Navigation to 2FA screen happens
2. `isChecking2FA` is set to `true`
3. AppNavigator re-renders and sees `isChecking2FA = true`
4. AppNavigator shows `SplashScreen` instead of the 2FA screen
5. User is stuck on splash screen

**The problem:** We're using `isChecking2FA` to control the splash screen, but we're also trying to navigate to the 2FA screen. These two things conflict.

---

## ❓ Questions for Claude

1. **How should we handle the splash screen during 2FA flow?**
   - Should we show splash screen while checking 2FA?
   - Should we show splash screen while on 2FA verification screen?
   - Or should we only show splash during initial auth state loading?

2. **What's the correct navigation flow?**
   - Should we navigate to 2FA screen BEFORE setting `isChecking2FA`?
   - Should we NOT show splash when `isChecking2FA` is true if we're already on 2FA screen?
   - Should we use a different flag to control splash vs navigation?

3. **How should AppNavigator handle the 2FA state?**
   - Should it check if we're already on 2FA screen before showing splash?
   - Should it use a different condition to show splash?
   - Should the 2FA screen be shown even when `isChecking2FA` is true?

4. **What's the correct sequence of operations?**
   - When should `isChecking2FA` be set?
   - When should navigation happen?
   - When should splash screen be shown/hidden?

---

## 🔧 What We've Tried

1. ✅ Removed blocking logic in `onAuthStateChange` - let it work normally
2. ✅ Only set `isChecking2FA` when 2FA is actually required (not before login)
3. ✅ Clear `loading` state appropriately
4. ❌ Still stuck on splash screen

---

## 📊 Current State Variables

After login with 2FA enabled:
- `loading`: `false` (cleared by onAuthStateChange after SIGNED_OUT)
- `isChecking2FA`: `true` (set in AuthScreen after receiving 2FA required result)
- `user`: `null` (cleared by onAuthStateChange after SIGNED_OUT)
- Navigation: Attempted to navigate to `TwoFactorVerification` screen
- AppNavigator: Shows `SplashScreen` because `isChecking2FA = true`

---

## 🎯 Desired Outcome

After login with 2FA enabled:
1. User sees splash screen briefly (during 2FA check)
2. App navigates to 2FA verification screen
3. User can enter 6-digit code
4. After verification, app navigates to MainTabs

**Current:** Step 1 happens, but step 2 never occurs - stuck on splash.

---

## 💡 Potential Solutions to Consider

1. **Don't show splash when navigating to 2FA screen:**
   - Check if we're navigating to 2FA screen before showing splash
   - Use navigation state to determine if splash should show

2. **Use different flags:**
   - `isChecking2FA` for internal state
   - `showSplash` for splash screen control
   - Separate concerns

3. **Navigate before setting flag:**
   - Navigate to 2FA screen first
   - Then set `isChecking2FA` flag
   - But this might cause flash of wrong screen

4. **Change AppNavigator logic:**
   - Show 2FA screen even when `isChecking2FA` is true
   - Only show splash during initial loading, not during 2FA flow

---

## 🔍 Key Code Sections

### AppNavigator Splash Logic
```typescript
// Show splash while loading OR while 2FA is being processed
if (loading || isChecking2FA) {
  return <SplashScreen />;
}
```

### AuthScreen 2FA Navigation
```typescript
if (result.requires2FA) {
  setIsChecking2FA(true);  // This causes splash to show
  navigation.reset({ ... });  // This tries to navigate to 2FA screen
}
```

**The conflict:** Setting `isChecking2FA = true` causes AppNavigator to show splash, which prevents the 2FA screen from showing.

---

Please provide a solution that:
1. ✅ Shows splash screen appropriately during auth flow
2. ✅ Navigates to 2FA screen when 2FA is required
3. ✅ Doesn't get stuck on splash screen
4. ✅ Works for both 2FA enabled and disabled users
5. ✅ Maintains smooth user experience

Thank you!

