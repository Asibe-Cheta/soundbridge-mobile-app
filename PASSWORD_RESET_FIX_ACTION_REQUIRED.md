# Password Reset Fix - Action Required

**Date:** January 13, 2026
**Priority:** 🔴 HIGH
**Status:** Awaiting Supabase Configuration Verification

---

## ✅ Root Cause Identified

The web team has identified the issue:

- **Web app works** because it uses a custom SendGrid email hook (configured in Supabase Auth Hooks)
- **Mobile app fails** because it may be using Supabase's default email template instead
- **Mobile app code is correct** - no code changes needed

---

## ✅ Configuration Status - VERIFIED

### Supabase Auth Hook Configuration ✅

**Status:** Hook is **ENABLED** and configured correctly!

**Verified Configuration:**
- ✅ Hook is ENABLED (green toggle)
- ✅ Hook Type: HTTPS
- ✅ Hook URL: `https://soundbridge.live/api/auth/send-email`
- ✅ Secret: Configured (base64 encoded with `v1,whsec_` prefix)

**Important Note:** The Supabase "Send Email hook" triggers for **ALL** email events by default when enabled, including:
- ✅ Password Recovery (password reset)
- ✅ Email Confirmation (signup)
- ✅ Magic Link
- ✅ Email Change

**There is no separate toggle for individual events** - when the hook is enabled, it handles all email types.

---

## 🧪 Next Step: Test Password Reset

Since the hook is already configured correctly, the password reset should now work. Let's test it!

### Test 1: Request Password Reset from Mobile App
1. Open mobile app
2. Go to "Forgot Password"
3. Enter test email
4. Check email inbox
5. **Verify the email link format** should be:
   ```
   https://www.soundbridge.live/auth/callback?token_hash=...&type=recovery&next=/update-password
   ```
   NOT:
   ```
   https://www.soundbridge.live/update-password?token=...&type=recovery
   ```

### Test 2: Click the Reset Link
1. Click the password reset link from mobile app email
2. Should redirect through `/auth/callback` first (may be quick)
3. Should end up on `/update-password` page
4. Should NOT show "Invalid or expired reset link"
5. Should be able to update password successfully

---

## 📊 Expected URL Flow

### ✅ Correct Flow (after configuration):
```
Email link → /auth/callback?token_hash=...&type=recovery&next=/update-password
           ↓
    Verify token with verifyOtp()
           ↓
    Create valid session
           ↓
    Redirect to /update-password
           ↓
    User can update password ✅
```

### ❌ Current Broken Flow (before configuration):
```
Email link → /update-password?token=...&type=recovery
           ↓
    No token verification
           ↓
    No session created
           ↓
    Check for session fails
           ↓
    Show "Invalid or expired reset link" ❌
```

---

## 📝 Web Team Code References

The web team confirmed their implementation:

**Password Reset Request:**
```typescript
// apps/web/app/(auth)/reset-password/page.tsx
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`,
});
```

**Custom Email Hook URL Construction:**
```typescript
// apps/web/app/api/auth/send-email/route.ts
resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?token_hash=${email_data.token_hash}&type=recovery&next=/update-password`;
```

**Token Verification:**
```typescript
// apps/web/app/auth/callback/route.ts
const { data, error } = await supabase.auth.verifyOtp({
  token_hash: tokenHash!,
  type: 'recovery'
});
```

---

## ✅ Mobile App Code (Already Correct)

```typescript
// src/contexts/AuthContext.tsx (lines 536-538)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://www.soundbridge.live/update-password',
});
```

**No changes needed to mobile app code.**

---

## 🎯 Summary

**Issue:** Mobile app password reset emails use wrong template
**Cause:** Supabase Auth Hook not configured for Password Recovery events
**Fix:** Enable "Password Recovery" event in Supabase Auth Hooks configuration
**Code Changes:** None required
**Testing:** Request reset from mobile → verify email link format → test flow

---

## 📞 Contact

**Web Team:** Provided comprehensive analysis in [WEB_TEAM_PASSWORD_RESET_RESPONSE.md](WEB_TEAM_PASSWORD_RESET_RESPONSE.md)
**Mobile Team:** Ready to test after configuration is verified

---

**Next Step:** Backend/DevOps team to verify Supabase Auth Hook configuration and enable Password Recovery event.
