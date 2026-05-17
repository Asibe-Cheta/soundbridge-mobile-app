# Password Reset Implementation - Web Team Response

**Date:** January 13, 2026  
**Responder:** Web Team  
**Status:** ✅ Complete Analysis & Solution Provided

---

## 🔍 Web App Implementation Details

### 1. Password Reset Request Code

**File:** `apps/web/app/(auth)/reset-password/page.tsx` (Line 23-25)

```typescript
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`,
});
```

**Key Points:**
- Uses **dynamic origin** (`window.location.origin`) instead of hardcoded URL
- In production: `redirectTo: 'https://www.soundbridge.live/update-password'`
- **Same URL as mobile app**, but there's a critical difference in the email flow

---

## ⚠️ CRITICAL DIFFERENCE: Custom Email System

### The Problem

The web app uses a **custom SendGrid email system** via Supabase Auth Hooks, which constructs reset URLs differently than Supabase's default email template.

### Web App Flow (Working)

1. **User requests reset** → `resetPasswordForEmail()` called with `redirectTo: 'https://www.soundbridge.live/update-password'`
2. **Supabase triggers Auth Hook** → Sends webhook to `/api/auth/send-email`
3. **Custom SendGrid email sent** → URL constructed as:
   ```
   https://www.soundbridge.live/auth/callback?token_hash={hash}&type=recovery&next=/update-password
   ```
4. **User clicks link** → Goes to `/auth/callback` route
5. **Callback route verifies token** → Uses `verifyOtp()` with `token_hash`
6. **Redirects to `/update-password`** → User can now update password

### Mobile App Flow (Broken)

1. **User requests reset** → `resetPasswordForEmail()` called with `redirectTo: 'https://www.soundbridge.live/update-password'`
2. **Supabase sends default email** → Uses Supabase's default email template
3. **Email link format** → Likely different format (possibly direct to `/update-password` without going through callback)
4. **User clicks link** → Goes directly to `/update-password` without token verification
5. **Update password page checks session** → No valid session (token wasn't verified)
6. **Error: "Invalid or expired reset link"**

---

## 🔧 The Solution

### Option 1: Use Same RedirectTo (Recommended)

**Update mobile app to match web app exactly:**

```typescript
const resetPassword = async (email: string) => {
  setLoading(true);
  setError(null);

  try {
    console.log('📧 Requesting password reset for:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.soundbridge.live/update-password',  // ✅ Same as web
    });

    if (error) {
      const friendlyError = mapAuthError(error.message);
      console.error('❌ Password reset request error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
      return { success: false, error: { message: friendlyError } };
    }

    console.log('✅ Password reset email sent');
    setLoading(false);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
    const friendlyError = mapAuthError(errorMessage);
    console.error('❌ Unexpected error:', friendlyError);
    setError(friendlyError);
    setLoading(false);
    return { success: false, error: { message: friendlyError } };
  }
};
```

**But this alone won't fix it!** The issue is that Supabase's default email template might construct URLs differently.

### Option 2: Configure Supabase to Use Custom Email Hook (Best Solution)

**The web app uses a custom email hook that constructs proper URLs. Mobile app emails should use the same system.**

**Supabase Dashboard Configuration:**

1. Go to **Supabase Dashboard → Authentication → Settings → Auth Hooks**
2. Ensure this hook is configured:
   - **Hook URL:** `https://www.soundbridge.live/api/auth/send-email`
   - **Events:** ✅ Password Recovery
   - **HTTP Method:** `POST`
   - **Headers:** 
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer {SUPABASE_AUTH_HOOK_SECRET}"
     }
     ```

**This ensures both web and mobile use the same email template and URL format.**

### Option 3: Update Mobile App to Handle Direct Token Links

If Supabase's default email sends links in a different format, the mobile app could handle them, but this is **NOT recommended** because:
- It creates inconsistency between web and mobile
- The web app's callback route is the proper way to verify tokens
- It's more secure to go through the callback route

---

## 📋 Expected URL Format

### Working URL (from web app via SendGrid):

```
https://www.soundbridge.live/auth/callback?token_hash={hash}&type=recovery&next=/update-password
```

**Flow:**
1. `/auth/callback` verifies the token using `verifyOtp()`
2. Creates a session
3. Redirects to `/update-password`
4. `/update-password` checks for valid session
5. User can update password

### Broken URL (likely from mobile app via default template):

```
https://www.soundbridge.live/update-password?token={token}&type=recovery
```

**Problem:**
- Goes directly to `/update-password` without token verification
- No session is created
- `/update-password` checks for session → fails → shows "Invalid or expired reset link"

---

## 🔍 How to Verify the Issue

### Test 1: Compare Email Links

1. Request password reset from **web app**
2. Check email → Copy the reset link
3. Request password reset from **mobile app** (same email)
4. Check email → Copy the reset link
5. **Compare the URLs:**
   - ✅ Working: `https://www.soundbridge.live/auth/callback?token_hash=...&type=recovery&next=/update-password`
   - ❌ Broken: `https://www.soundbridge.live/update-password?token=...&type=recovery`

### Test 2: Check Supabase Auth Hook Configuration

1. Go to **Supabase Dashboard → Authentication → Settings → Auth Hooks**
2. Verify the hook is configured for **Password Recovery**
3. Check if the hook URL is: `https://www.soundbridge.live/api/auth/send-email`
4. If not configured, **this is the root cause**

---

## ✅ Recommended Fix

### Step 1: Verify Supabase Auth Hook Configuration

**Supabase Dashboard → Authentication → Settings → Auth Hooks**

Ensure this hook exists:
- **Hook URL:** `https://www.soundbridge.live/api/auth/send-email`
- **Events:** ✅ Password Recovery
- **HTTP Method:** `POST`

### Step 2: Update Mobile App Code (Optional - for consistency)

The mobile app code is already correct, but for consistency, you can use:

```typescript
const resetPassword = async (email: string) => {
  setLoading(true);
  setError(null);

  try {
    console.log('📧 Requesting password reset for:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.soundbridge.live/update-password',
    });

    if (error) {
      const friendlyError = mapAuthError(error.message);
      console.error('❌ Password reset request error:', friendlyError);
      setError(friendlyError);
      setLoading(false);
      return { success: false, error: { message: friendlyError } };
    }

    console.log('✅ Password reset email sent');
    setLoading(false);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
    const friendlyError = mapAuthError(errorMessage);
    console.error('❌ Unexpected error:', friendlyError);
    setError(friendlyError);
    setLoading(false);
    return { success: false, error: { message: friendlyError } };
  }
};
```

### Step 3: Test End-to-End

1. Request password reset from mobile app
2. Check email → Verify URL format matches web app format
3. Click link → Should go through `/auth/callback` first
4. Should redirect to `/update-password` with valid session
5. User can update password successfully

---

## 📝 Code References

### Web App Files:

1. **Password Reset Request:**
   ```23:25:apps/web/app/(auth)/reset-password/page.tsx
   const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/update-password`,
   });
   ```

2. **Custom Email Hook:**
   ```76:90:apps/web/app/api/auth/send-email/route.ts
   } else if (emailActionType === 'recovery' || type === 'recovery') {
     templateId = SENDGRID_RESET_TEMPLATE_ID;
     
     // Build proper reset URL with token
     let resetUrl;
     if (email_data.token && email_data.token_hash) {
       // Use Supabase's built-in reset URL structure
       resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/auth/callback?token_hash=${email_data.token_hash}&type=recovery&next=/update-password`;
     } else if (email_data.redirect_to) {
       // Fallback to redirect_to if available
       resetUrl = email_data.redirect_to;
     } else {
       // Last resort - build a basic reset URL
       resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/update-password?token=${email_data.token || 'unknown'}`;
     }
   ```

3. **Callback Route (Token Verification):**
   ```383:398:apps/web/app/auth/callback/route.ts
   } else if (type === 'recovery') {
     // Handle password reset
     const { data, error } = await supabase.auth.verifyOtp({
       token_hash: tokenHash!,
       type: 'recovery'
     });

     if (error) {
       console.error('Password reset error:', error);
       return NextResponse.redirect(new URL(`/reset-password?error=reset_failed&message=${encodeURIComponent(error.message)}`, request.url));
     }

     if (data.user) {
       console.log('Password reset token verified for user:', data.user.email);
       // Redirect to password update page
       return NextResponse.redirect(new URL('/update-password', request.url));
     }
   ```

4. **Update Password Page (Session Check):**
   ```25:46:apps/web/app/update-password/page.tsx
   useEffect(() => {
     // Check if user has a valid session (they should be signed in via password reset link)
     const checkSession = async () => {
       try {
         const supabase = createBrowserClient();
         
         // Use getSession() which is faster than getUser() since it doesn't make a network request
         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
         
         if (sessionError || !session) {
           setError('Invalid or expired reset link. Please request a new password reset.');
           setIsValidSession(false);
         } else {
           setIsValidSession(true);
         }
       } catch (err) {
         console.error('Session check error:', err);
         setError('Unable to verify session. Please try again.');
         setIsValidSession(false);
       } finally {
         setCheckingSession(false);
       }
     };
   ```

---

## 🎯 Root Cause Summary

**The issue is NOT the `redirectTo` URL** (both use the same URL).

**The issue IS:**
1. **Web app** uses custom SendGrid email hook → URLs go through `/auth/callback` → Session created → Works ✅
2. **Mobile app** uses Supabase default email template → URLs might go directly to `/update-password` → No session → Fails ❌

**Solution:** Ensure Supabase Auth Hook is configured for Password Recovery events so both web and mobile use the same email system.

---

## ✅ Action Items for Mobile Team

1. ✅ **Verify Supabase Auth Hook Configuration** (Most Important!)
   - Go to Supabase Dashboard → Authentication → Settings → Auth Hooks
   - Ensure hook URL: `https://www.soundbridge.live/api/auth/send-email`
   - Ensure "Password Recovery" event is enabled

2. ✅ **Test password reset from mobile app**
   - Request reset
   - Check email link format
   - Verify it matches web app format: `/auth/callback?token_hash=...&type=recovery&next=/update-password`

3. ✅ **If hook is not configured:**
   - Configure it in Supabase Dashboard
   - This will make mobile app emails use the same system as web app
   - Both will then work correctly

4. ✅ **Mobile app code is already correct** - no changes needed to the `resetPasswordForEmail()` call

---

## 📞 Next Steps

1. **Mobile team:** Check Supabase Dashboard → Authentication → Settings → Auth Hooks
2. **If hook is missing:** Configure it with the URL above
3. **Test:** Request password reset from mobile app and verify email link format
4. **If still broken:** Share the exact email link URL format you're receiving

---

**Status:** ✅ Analysis Complete - Awaiting Supabase Configuration Verification  
**Last Updated:** January 13, 2026  
**Web Team Contact:** Ready to assist with Supabase configuration if needed
