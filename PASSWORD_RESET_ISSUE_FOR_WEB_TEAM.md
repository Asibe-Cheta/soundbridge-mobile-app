# Password Reset Issue - Mobile to Web Redirect

**Date:** January 13, 2026
**Reporter:** Mobile Team
**Priority:** 🔴 HIGH - Broken user flow
**Status:** Needs Web Team Investigation

---

## The Problem

When users request password reset from the **mobile app**:
1. ✅ User enters email on mobile app
2. ✅ Mobile app sends reset email via Supabase
3. ✅ Email arrives in inbox
4. ✅ User clicks reset link in email
5. ❌ **Web app shows "Invalid Link" or "Expired Link"**

When users request password reset from the **web app**:
1. ✅ User enters email on web app
2. ✅ Web app sends reset email via Supabase
3. ✅ Email arrives in inbox
4. ✅ User clicks reset link in email
5. ✅ **Web app correctly accepts link and allows password reset**

---

## Current Mobile App Implementation

**File:** `src/contexts/AuthContext.tsx` (line 536-538)

```typescript
const resetPassword = async (email: string) => {
  setLoading(true);
  setError(null);

  try {
    console.log('📧 Requesting password reset for:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.soundbridge.live/update-password',  // ← Current redirect
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

---

## What We Need From Web Team

### 1. Check Your Current Implementation

Please share:
- **What `redirectTo` URL you use** when calling `supabase.auth.resetPasswordForEmail()` from the web app
- **Any additional parameters** you pass to `resetPasswordForEmail()`
- **Any Supabase configuration** (email templates, redirect URLs, etc.) that we might be missing

### 2. Possible Causes

The issue could be:

**A. Different `redirectTo` URLs:**
```typescript
// Mobile (current)
redirectTo: 'https://www.soundbridge.live/update-password'

// Web (what you're using?)
redirectTo: 'https://www.soundbridge.live/reset-password'  // Different path?
redirectTo: 'https://www.soundbridge.live/auth/reset'       // Different structure?
```

**B. Missing Query Parameters:**
```typescript
// Mobile (current)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://www.soundbridge.live/update-password',
});

// Web (what you might have?)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://www.soundbridge.live/update-password',
  options: {
    emailRedirectTo: 'https://www.soundbridge.live/update-password',
    // OR other options?
  }
});
```

**C. Supabase Dashboard Configuration:**
- Check: **Supabase Dashboard → Authentication → URL Configuration**
- Are there specific redirect URLs whitelisted?
- Does the mobile app's redirect URL need to be added?
- Screenshot needed of current configuration

**D. Email Template Differences:**
- Check: **Supabase Dashboard → Authentication → Email Templates**
- Is there a custom password reset template?
- Does it construct the link differently?
- Screenshot or code needed

---

## What We Need You To Send Us

Please provide the following:

### 1. Your Web App Code

**File path needed:** Where your password reset is implemented

**Code we need:**
```typescript
// Your password reset function - EXACT code
const handlePasswordReset = async (email: string) => {
  // What do you have here?
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: '???',  // ← What's this value?
    // Any other options?
  });
};
```

### 2. Supabase Configuration

**Screenshots needed:**
1. **Supabase Dashboard → Authentication → URL Configuration**
   - Show all redirect URLs
   - Show site URL
   - Show any wildcard patterns

2. **Supabase Dashboard → Authentication → Email Templates**
   - Show password reset template
   - If custom template, share the HTML/code

### 3. Expected URL Format

When you click the reset link from your web app, what does the URL look like?

**Example formats:**
```
Option A:
https://www.soundbridge.live/update-password?token=XXX&type=recovery

Option B:
https://www.soundbridge.live/update-password#access_token=XXX&type=recovery

Option C:
https://www.soundbridge.live/reset-password?code=XXX

Option D:
Something else?
```

Please tell us:
- ✅ Exact URL format when it works (from web app)
- ❌ What error message you see when it fails (from mobile app)

---

## Testing Instructions

To help us debug, please test this:

### Test 1: Mobile App Reset Link
1. Open mobile app (iOS or Android)
2. Tap "Forgot Password"
3. Enter your test email
4. Check email inbox
5. Copy the reset link from the email
6. **Paste it here** (with sensitive tokens redacted)
7. Try clicking it and screenshot the error

### Test 2: Web App Reset Link
1. Open web app (soundbridge.live)
2. Click "Forgot Password"
3. Enter same test email
4. Check email inbox
5. Copy the reset link from the email
6. **Paste it here** (with sensitive tokens redacted)
7. Confirm it works

### Compare
- Are the links different?
- Do they have different query parameters?
- Do they point to different paths?

---

## Important Notes

⚠️ **Do NOT check files in your codebase** - they might be outdated
✅ **Check the ACTUAL running code** - use console.log or debugger
✅ **Check Supabase Dashboard** - configuration might differ from code

### Why This Matters:
- Files can be old commits that don't match production
- Configuration in Supabase Dashboard overrides code
- Environment variables might differ between dev/prod

### How to Check Running Code:
```typescript
// Add this to your web app password reset function
const handlePasswordReset = async (email: string) => {
  console.log('🔍 WEB APP - Calling resetPasswordForEmail with:');
  console.log('   Email:', email);
  console.log('   RedirectTo:', 'YOUR_ACTUAL_VALUE_HERE');
  console.log('   Full Options:', {
    redirectTo: 'YOUR_ACTUAL_VALUE_HERE',
    // ... any other options
  });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'YOUR_ACTUAL_VALUE_HERE',
  });

  console.log('✅ Result:', { error });
};
```

Then:
1. Run the web app in dev mode
2. Open browser console
3. Trigger password reset
4. Copy/paste the console logs and send to us

---

## Expected Resolution

Once we have your implementation details, we'll:

1. ✅ Update mobile app to match your exact configuration
2. ✅ Ensure both mobile and web use same redirect URL
3. ✅ Test end-to-end flow
4. ✅ Document the correct implementation for future reference

---

## Timeline

**Urgency:** HIGH - Users cannot reset passwords from mobile app

**Expected Response Time:** 24-48 hours

**What we need:**
- Your web app password reset code (actual running code, not files)
- Supabase dashboard screenshots (URL config + email templates)
- Example reset link URLs (working from web, broken from mobile)
- Console logs from your password reset function

---

## Contact

**Mobile Team:** Ready to update our implementation once we know the correct configuration

**Questions?** Ask us anything about the mobile implementation or this issue

---

## Quick Checklist for Web Team

- [ ] Check your `resetPasswordForEmail()` call - what's the exact `redirectTo` value?
- [ ] Check Supabase Dashboard → Authentication → URL Configuration
- [ ] Check Supabase Dashboard → Authentication → Email Templates
- [ ] Add console.log to your reset function and share the output
- [ ] Test password reset from web app and copy the email link URL
- [ ] Compare web app link vs mobile app link - are they different?
- [ ] Share screenshots of Supabase configuration
- [ ] Share exact code (not file contents, actual running code with console.logs)

---

**Status:** Awaiting web team investigation
**Last Updated:** January 13, 2026
**Mobile App Version:** Ready to update once we have correct configuration
