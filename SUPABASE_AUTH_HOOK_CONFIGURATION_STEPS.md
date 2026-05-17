# Supabase Auth Hook Configuration Steps

**Date:** January 13, 2026
**Status:** 🔴 ACTION REQUIRED
**Current State:** Hook is DISABLED

---

## Current Status (From Screenshot)

✅ Hook endpoint configured: `https://soundbridge.live/api/auth/send-email`
✅ Hook secret configured: `****`
❌ **Hook is DISABLED** (shown in orange/yellow badge)
❓ Need to verify which events are enabled

---

## Step-by-Step Configuration

### Step 1: Click "Configure hook" Button
In your current view (Authentication > Auth Hooks), click the **"Configure hook"** button visible in the screenshot.

### Step 2: Enable Required Events
Inside the hook configuration, you should see a list of events. **Enable these events:**

**CRITICAL:**
- ✅ **Password Recovery** - This is required for password reset to work!

**Recommended (if not already enabled):**
- ✅ Email Confirmation (for signup)
- ✅ Magic Link (if using magic link authentication)
- ✅ Email Change (if users can change their email)
- ✅ Any other email-related events

### Step 3: Verify Hook Configuration

**Endpoint:**
```
https://soundbridge.live/api/auth/send-email
```

**Type:**
```
HTTPS endpoint
```

**Secret:**
```
Already configured (shown as ****)
```

**Headers:**
The secret is sent as an Authorization header automatically by Supabase:
```
Authorization: Bearer {your-secret}
```

### Step 4: Enable the Hook
After configuring the events, make sure the hook is **ENABLED** (toggle from DISABLED to ENABLED).

### Step 5: Save Configuration
Click **"Save"** or **"Update hook"** to apply the changes.

---

## Expected Result After Configuration

### Before (Current State):
```
Send Email hook: DISABLED ❌
Events: Unknown (need to check)
Password Recovery: Likely not enabled ❌
```

**Result:** Mobile app password reset uses Supabase's default email template, which constructs URLs differently, causing "Invalid Link" errors.

### After Configuration:
```
Send Email hook: ENABLED ✅
Events: Password Recovery enabled ✅
Password Recovery: Working ✅
```

**Result:** Both mobile and web apps use the same custom SendGrid email system, password reset links will be formatted as:
```
https://soundbridge.live/auth/callback?token_hash=...&type=recovery&next=/update-password
```

---

## Testing After Configuration

### Test 1: Request Password Reset from Mobile App
1. Open mobile app
2. Go to "Forgot Password"
3. Enter test email
4. Check inbox

### Test 2: Verify Email Link Format
The email should contain a link like:
```
https://soundbridge.live/auth/callback?token_hash=XXXXX&type=recovery&next=/update-password
```

NOT like:
```
https://soundbridge.live/update-password?token=XXXXX&type=recovery
```

### Test 3: Click Reset Link
1. Click the password reset link
2. Should briefly go through `/auth/callback` (may be fast)
3. Should redirect to `/update-password`
4. Should NOT show "Invalid or expired reset link" ❌
5. Should allow password update successfully ✅

---

## What This Hook Does

When a user requests password reset (from mobile or web):

1. **Supabase Auth** receives the `resetPasswordForEmail()` request
2. **Instead of using Supabase's default email template**, it triggers this hook
3. **Hook sends webhook** to `https://soundbridge.live/api/auth/send-email`
4. **Your API endpoint** receives the webhook with token data
5. **Your API** constructs the proper URL: `/auth/callback?token_hash=...&type=recovery&next=/update-password`
6. **Your API** sends email via SendGrid with the correct link format
7. **User clicks link** → goes to `/auth/callback` → token verified → session created → redirects to `/update-password` ✅

---

## Troubleshooting

### If Hook Configuration Doesn't Show Events List:
- Look for checkboxes or toggles for different event types
- If you only see "Configure hook" button, click it to see more options
- Events might be under an "Events" or "Triggers" section

### If Password Recovery Event Is Not Available:
- Update Supabase CLI to latest version
- Check Supabase dashboard version (may need to upgrade project)
- Contact Supabase support if event is missing

### If Hook Shows "DISABLED" After Saving:
- Check for any error messages
- Verify the endpoint URL is accessible from Supabase's servers
- Verify the secret is correct
- Check your API endpoint logs for incoming webhook requests

---

## Quick Visual Guide

```
Supabase Dashboard
↓
Authentication (left sidebar)
↓
Auth Hooks (left sidebar - you are here)
↓
Send Email hook (you see this)
↓
Click "Configure hook" button
↓
Enable "Password Recovery" event ✅
↓
Save configuration
↓
Toggle hook from DISABLED to ENABLED
↓
Test password reset from mobile app
```

---

## Next Steps

1. ✅ Click "Configure hook" button (visible in your screenshot)
2. ✅ Enable "Password Recovery" event
3. ✅ Enable the hook (toggle from DISABLED to ENABLED)
4. ✅ Save configuration
5. ✅ Test password reset from mobile app
6. ✅ Verify email link format
7. ✅ Confirm password reset works

---

**Status:** Ready to configure
**Location:** Supabase Dashboard → Authentication → Auth Hooks → Send Email hook → Configure hook
**Action:** Enable "Password Recovery" event and enable the hook
