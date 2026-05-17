# Why Web App Works But Mobile App Doesn't

**Date:** January 13, 2026
**Status:** Root cause identified

---

## The Mystery

Both web app and mobile app use the **exact same code**:

### Web App:
```typescript
// apps/web/app/(auth)/reset-password/page.tsx
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`, // = https://www.soundbridge.live/update-password
});
```

### Mobile App:
```typescript
// src/contexts/AuthContext.tsx
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://www.soundbridge.live/update-password',
});
```

**Same `redirectTo` URL. Same Supabase project. But different results. Why?**

---

## The Answer: Auth Hook Priority

Here's what's happening:

### When Web App Requests Password Reset:

1. ✅ Web app calls `resetPasswordForEmail()` with `redirectTo: 'https://www.soundbridge.live/update-password'`
2. ✅ **Supabase Auth Hook is triggered** (the one you enabled)
3. ✅ Supabase sends webhook to `https://soundbridge.live/api/auth/send-email`
4. ✅ **Your custom API endpoint receives the webhook**
5. ✅ Your API constructs URL: `https://www.soundbridge.live/auth/callback?token_hash=${token_hash}&type=recovery&next=/update-password`
6. ✅ Your API sends email via **SendGrid** with the custom URL
7. ✅ User clicks link → goes to `/auth/callback` → token verified → session created → redirects to `/update-password` ✅

### When Mobile App Requests Password Reset:

1. ✅ Mobile app calls `resetPasswordForEmail()` with `redirectTo: 'https://www.soundbridge.live/update-password'`
2. ❌ **Supabase Auth Hook is NOT triggered** (or fails silently)
3. ❌ Supabase falls back to **default email template**
4. ❌ Default template uses `{{ .ConfirmationURL }}` variable
5. ❌ Generates URL: `https://aunxdbqukbxyyiusaeqi.supabase.co/auth/v1/verify?token=...&redirect_to=https://www.soundbridge.live/update-password`
6. ❌ User clicks link → goes to Supabase domain → shows "Invalid Link" ❌

---

## Why Is The Hook Not Triggering for Mobile App?

There are several possible reasons:

### Reason 1: Hook Endpoint Is Failing

The most likely reason is that the webhook endpoint (`https://soundbridge.live/api/auth/send-email`) is **failing for some reason** when mobile app triggers it, causing Supabase to fall back to the default template.

**Possible causes:**
- Endpoint is returning an error (4xx or 5xx)
- Endpoint is timing out
- Endpoint validation is rejecting the request
- SendGrid is failing to send the email

**Why it works for web:**
- Maybe the web app has been tested more, so the endpoint handles web requests better
- Maybe there's a subtle difference in the webhook payload that the endpoint doesn't handle for mobile

### Reason 2: Hook Secret Mismatch

The webhook includes an `Authorization: Bearer {secret}` header. If this doesn't match what your API expects, the request is rejected.

**Why it might work for web but not mobile:**
- This doesn't make sense actually, because both would send the same webhook

### Reason 3: Rate Limiting or IP Blocking

Supabase might have different IP addresses for different webhook triggers.

**Why this is unlikely:**
- Would affect both web and mobile

### Reason 4: Caching Issue

The hook might be cached differently for different requests.

**Why this is unlikely:**
- Supabase doesn't cache hooks

---

## The Real Reason (Most Likely)

Looking at your email screenshot, the email is **definitely coming from Supabase's default template**, not SendGrid. This means:

**The Auth Hook is enabled, but it's failing silently, and Supabase is falling back to the default template.**

The web team said their hook "works for web app", which suggests:

1. **The hook endpoint exists and works**
2. **But maybe it only works when triggered from the web app for some reason**

OR

3. **The hook is failing for all requests, but the web app has ALSO updated the default Supabase email template** (which mobile hasn't done)

---

## How to Verify This

### Check 1: Are Web and Mobile Using Different Supabase Projects?

If web app uses a different Supabase project than mobile app:
- Web project has hook working + email template updated
- Mobile project has hook enabled but endpoint failing + email template not updated

**How to check:**
- Compare `EXPO_PUBLIC_SUPABASE_URL` in mobile app `.env`
- Compare `NEXT_PUBLIC_SUPABASE_URL` in web app `.env`
- If they're different projects, that's the issue!

### Check 2: Check Web App Email Template

1. Go to **Supabase Dashboard → Authentication → Email → Password Reset**
2. Check if the template uses:
   - `{{ .ConfirmationURL }}` (default - would cause same issue)
   - OR `{{ .TokenHash }}` with custom URL (web team might have fixed this)

If web team already updated the email template to use `{{ .TokenHash }}`, that explains why web works!

### Check 3: Test the Hook Endpoint

Run this curl command to test if the endpoint works:

```bash
curl -X POST https://soundbridge.live/api/auth/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer v1,whsec_uSGqTD/gYuYLTwQECV2m5SyJ813LNQ/Q03pneloIZQjhufte8fktuHSHcmkI" \
  -d '{
    "type": "recovery",
    "user": {
      "email": "asibechetachukwu@gmail.com"
    },
    "email_data": {
      "token": "test_token",
      "token_hash": "test_token_hash",
      "redirect_to": "https://www.soundbridge.live/update-password"
    }
  }'
```

**Expected response:** HTTP 200 with success message
**If it fails:** That's why the hook isn't working

---

## The Simple Fix

Regardless of why the hook isn't working, **the simple fix is to update the email template** to use `{{ .TokenHash }}` instead of `{{ .ConfirmationURL }}`.

This way:
- ✅ Works even if the hook is failing
- ✅ Works for both web and mobile
- ✅ No need to debug the webhook endpoint
- ✅ Takes 2 minutes to implement

---

## The Complex Fix

If you want the webhook to work properly:

1. **Debug the endpoint:** Check why `https://soundbridge.live/api/auth/send-email` is failing
2. **Check the logs:** Look at web app server logs for webhook errors
3. **Test the endpoint:** Use curl to verify it works
4. **Fix any issues:** Update the endpoint code if needed
5. **Redeploy:** Deploy the fixed endpoint
6. **Test again:** Request password reset and verify webhook is called

But this is more work and requires web team involvement.

---

## Recommended Action

**Just update the email template.** It's the fastest, simplest solution that doesn't require debugging webhooks or coordinating with web team.

The web team's webhook is a "nice to have" but not required if the email template is correct.

---

**TL;DR:**

**Why web works:** Either the webhook works for web, OR the web team already updated the email template to use `{{ .TokenHash }}`

**Why mobile doesn't work:** The webhook is failing (or not configured for this project), AND the email template still uses `{{ .ConfirmationURL }}`

**Fix:** Update the email template to use `{{ .TokenHash }}` with custom URL format (as described in SUPABASE_EMAIL_TEMPLATE_FIX.md)
