# Password Reset Hook Not Triggering - Issue Analysis

**Date:** January 13, 2026
**Status:** 🔴 HOOK ENABLED BUT NOT BEING USED

---

## Problem Identified

The Supabase Auth Hook is **ENABLED** but password reset emails are still using Supabase's default template instead of the custom SendGrid hook.

### Evidence from Email:

**Email Link URL:**
```
https://aunxdbqukbxyyiusaeqi.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=https://www.soundbridge.live/update-password
```

**Expected URL (from custom hook):**
```
https://www.soundbridge.live/auth/callback?token_hash=...&type=recovery&next=/update-password
```

**Analysis:**
- ❌ Email uses Supabase domain (`aunxdbqukbxyyiusaeqi.supabase.co`)
- ❌ Email uses Supabase's default verification endpoint (`/auth/v1/verify`)
- ❌ Not going through custom SendGrid template
- ✅ Hook is enabled in dashboard
- ✅ Hook URL is correct: `https://soundbridge.live/api/auth/send-email`

---

## Root Cause

The "Send Email hook" in Supabase Auth Hooks has **two modes**:

1. **Legacy Mode (Beta):** Hook receives webhook when email needs to be sent, but hook must handle ALL email sending
2. **Template Override Mode:** Hook only receives notification, Supabase still sends default emails

Based on the email URL, it appears the hook is in "notification mode" rather than "full control mode".

---

## Solution Options

### Option 1: Verify Hook Secret and Endpoint Response

The hook might be failing silently. Check:

1. **Hook secret** must match what your API expects
2. **API endpoint** must be accessible from Supabase's servers
3. **API endpoint** must return proper response format

**Test the endpoint:**

```bash
# Test if the endpoint is accessible
curl -X POST https://soundbridge.live/api/auth/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_HOOK_SECRET" \
  -d '{
    "type": "recovery",
    "email": "test@example.com",
    "token_hash": "test_token",
    "redirect_to": "https://www.soundbridge.live/update-password"
  }'
```

**Expected Response:**
```json
{
  "success": true
}
```

If the endpoint returns an error or doesn't respond, Supabase falls back to default emails.

---

### Option 2: Check Supabase Email Templates

Instead of using Auth Hooks, configure the **Email Templates** directly:

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. Find **"Reset Password"** template
3. Check if it's using the default template or a custom one
4. If using default, update it to use your custom URL format

**Custom Reset Password Template:**

```html
<h2>Reset Your Password</h2>

<p>You requested to reset your password for your SoundBridge account.</p>

<p>Click the button below to create a new password:</p>

<a href="https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password">
  Reset My Password
</a>

<p>If the button doesn't work, copy and paste this link into your browser:</p>

<p>https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password</p>
```

---

### Option 3: Verify Web App API Endpoint

The hook endpoint might not be handling the webhook correctly. Let's verify:

**Check Web App API File:**
`apps/web/app/api/auth/send-email/route.ts`

**Key Requirements:**
1. Must accept POST requests
2. Must verify Authorization header (hook secret)
3. Must handle `type: 'recovery'` events
4. Must construct proper URL with `token_hash`
5. Must send email via SendGrid
6. Must return `{ success: true }` or similar

**Debug the endpoint:**

Add logging to see if the hook is being called:

```typescript
// apps/web/app/api/auth/send-email/route.ts
export async function POST(request: Request) {
  console.log('🔔 Auth Hook Received');
  console.log('Headers:', Object.fromEntries(request.headers.entries()));

  const body = await request.json();
  console.log('Body:', body);

  // Verify hook secret
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.SUPABASE_AUTH_HOOK_SECRET;

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedSecret) {
    console.error('❌ Invalid hook secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // ... rest of handler
}
```

Then check the web app logs to see if the hook is being called when password reset is requested.

---

### Option 4: Contact Web Team to Verify Deployment

The web team's custom email hook might not be deployed correctly. Ask them to verify:

1. **Is the endpoint deployed?** `https://soundbridge.live/api/auth/send-email`
2. **Is it accessible from external servers?** (Supabase needs to reach it)
3. **Is the hook secret correct?** Must match what's in Supabase Dashboard
4. **Are there any errors in the logs?** Check for failed webhook calls
5. **Is SendGrid configured?** The endpoint needs SendGrid credentials to send emails

---

## Immediate Next Steps

### Step 1: Test the Hook Endpoint Manually

Use curl or Postman to test if the endpoint is working:

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

**Expected Result:**
- HTTP 200 OK
- JSON response with success
- Email sent to your inbox with custom URL format

**If it fails:**
- Check the error message
- Verify the endpoint exists
- Check if CORS is blocking the request
- Verify the hook secret matches

---

### Step 2: Check Supabase Logs

1. Go to **Supabase Dashboard → Settings → API**
2. Look for **Webhooks** or **Logs** section
3. Check if there are any failed webhook attempts
4. Look for error messages related to the auth hook

---

### Step 3: Ask Web Team to Verify

**Questions for Web Team:**

1. Is `https://soundbridge.live/api/auth/send-email` deployed and working?
2. Can you test the endpoint manually and confirm it sends emails?
3. Are there any errors in your logs when password reset is triggered?
4. Is the hook secret in your environment variables matching the one in Supabase?
5. Is SendGrid configured with proper API key and templates?

---

## Alternative Solution: Use Supabase Email Templates

If the custom hook is too complex, you can achieve the same result by customizing Supabase's built-in email templates:

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. Select **"Reset Password"** template
3. Update the URL in the template to:
   ```
   https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
   ```
4. Save the template

This way, emails will use your custom URL format without needing the webhook.

---

## Summary

**Current State:**
- ✅ Auth Hook is enabled
- ✅ Hook URL is configured
- ❌ Hook is not being triggered (emails still use Supabase default)
- ❌ Password reset shows "Invalid Link"

**Likely Causes:**
1. Hook endpoint is not accessible from Supabase servers
2. Hook endpoint is returning an error (Supabase falls back to default)
3. Hook secret doesn't match
4. Hook endpoint is not deployed
5. SendGrid is not configured on the endpoint

**Next Actions:**
1. Test the hook endpoint manually
2. Check Supabase logs for webhook failures
3. Ask web team to verify endpoint deployment
4. Consider using Supabase Email Templates as alternative

---

**Status:** Awaiting endpoint verification and testing
**Priority:** 🔴 HIGH
**Blocker:** Hook endpoint may not be working correctly
