# Supabase Email Template Fix for Password Reset

**Date:** January 13, 2026
**Status:** 🔴 IMMEDIATE FIX REQUIRED
**Issue:** Email template uses wrong URL variable

---

## Problem Identified

The current email template uses:
```html
<a href="{{ .ConfirmationURL }}" class="reset-button">
```

This generates Supabase's default URL:
```
https://aunxdbqukbxyyiusaeqi.supabase.co/auth/v1/verify?token=...
```

We need it to generate your custom URL:
```
https://www.soundbridge.live/auth/callback?token_hash=...&type=recovery&next=/update-password
```

---

## Solution: Update Email Template

### Step 1: Go to Email Template Editor

You're already there in the screenshot:
**Supabase Dashboard → Authentication → Email → Reset Password Template**

### Step 2: Replace These Two Lines

**Find this (appears twice in the template):**
```html
<a href="{{ .ConfirmationURL }}" class="reset-button">
```

**Replace with:**
```html
<a href="https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password" class="reset-button">
```

**Find this:**
```html
<div class="reset-url">
    {{ .ConfirmationURL }}
</div>
```

**Replace with:**
```html
<div class="reset-url">
    https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
</div>
```

---

## Complete Fixed Template

Here's the complete template with the fixes applied:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your SoundBridge Password</title>
    <style>
        /* Your existing CSS stays the same */
        body, table, td, p, h1, h2, h3 {
            margin: 0;
            padding: 0;
            border: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #ffffff;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%);
            min-height: 100vh;
            margin: 0;
            padding: 0;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .header {
            background: linear-gradient(45deg, #DC2626, #EC4899);
            padding: 40px 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
        }

        .content {
            padding: 40px 30px;
            text-align: center;
        }

        .security-notice {
            background: rgba(255, 165, 0, 0.1);
            border: 1px solid rgba(255, 165, 0, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: left;
        }

        .security-notice h3 {
            color: #F59E0B;
            font-size: 16px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }

        .security-notice p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin: 0;
        }

        .reset-message {
            font-size: 16px;
            color: #ffffff;
            margin-bottom: 30px;
            line-height: 1.7;
        }

        .reset-button {
            display: inline-block;
            background: linear-gradient(45deg, #DC2626, #EC4899);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3);
            transition: transform 0.2s ease;
        }

        .reset-button:hover {
            transform: translateY(-2px);
        }

        .reset-url {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
        }

        .warning-box {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }

        .warning-box h3 {
            color: #EF4444;
            font-size: 16px;
            margin-bottom: 10px;
        }

        .warning-box p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin-bottom: 8px;
        }

        .info-box {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }

        .info-box h3 {
            color: #3B82F6;
            font-size: 16px;
            margin-bottom: 10px;
        }

        .info-box p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin-bottom: 8px;
        }

        .footer {
            background: rgba(255, 255, 255, 0.03);
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 10px;
        }

        .footer a {
            color: #EC4899;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .support-links {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .support-links a {
            display: inline-block;
            margin: 0 10px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
        }

        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }

            .header {
                padding: 30px 20px;
            }

            .header h1 {
                font-size: 24px;
            }

            .content {
                padding: 30px 20px;
            }

            .reset-button {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Reset Your Password</h1>
            <p>Secure your SoundBridge account</p>
        </div>

        <div class="content">
            <div class="security-notice">
                <h3>🔒 Security Alert</h3>
                <p>We received a request to reset the password for your SoundBridge account.</p>
            </div>

            <div class="reset-message">
                <p>Hi {{ .Email }},</p>
                <p>You requested to reset your password for your SoundBridge account. Click the button below to create a new password:</p>
            </div>

            <a href="https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password" class="reset-button">
                Reset My Password
            </a>

            <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:
            </p>

            <div class="reset-url">
                https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
            </div>

            <div class="warning-box">
                <h3>⚠️ Important Security Information</h3>
                <p>• This password reset link will expire in 1 hour for security reasons</p>
                <p>• Only use this link if you requested a password reset</p>
                <p>• Never share this link with anyone else</p>
                <p>• SoundBridge will never ask for your password via email</p>
            </div>

            <div class="info-box">
                <h3>ℹ️ Didn't request this reset?</h3>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
                <p>However, if you're concerned about unauthorized access to your account, please contact our support team immediately.</p>
            </div>

            <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-top: 30px;">
                For security tips and account protection advice, visit our <a href="https://soundbridge.live/security" style="color: #EC4899;">Security Center</a>.
            </p>
        </div>

        <div class="footer">
            <p>© 2024 SoundBridge. Connecting creators across UK & Nigeria.</p>
            <p>
                <a href="https://soundbridge.live/help">Help Center</a> •
                <a href="https://soundbridge.live/privacy">Privacy Policy</a> •
                <a href="https://soundbridge.live/security">Security Center</a>
            </p>

            <div class="support-links">
                <p style="margin-bottom: 10px;">Need help? Contact us:</p>
                <a href="mailto:contact@soundbridge.live">Email Support</a>
                <a href="https://soundbridge.live/help">Help Center</a>
                <a href="https://soundbridge.live/contact">Contact Us</a>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## Key Changes Made

### Change 1: Reset Button Link
**Before:**
```html
<a href="{{ .ConfirmationURL }}" class="reset-button">
```

**After:**
```html
<a href="https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password" class="reset-button">
```

### Change 2: Reset URL Display
**Before:**
```html
<div class="reset-url">
    {{ .ConfirmationURL }}
</div>
```

**After:**
```html
<div class="reset-url">
    https://www.soundbridge.live/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
</div>
```

---

## How to Apply the Fix

### Step 1: Copy the Fixed Template
Copy the entire fixed template above (from `<!DOCTYPE html>` to `</html>`)

### Step 2: Paste in Supabase Dashboard
1. You're already in the right place (Authentication → Email → Password Reset template)
2. Select all the current HTML in the template editor
3. Delete it
4. Paste the fixed template
5. Click "Save changes" button (bottom right)

### Step 3: Test Password Reset
1. Open mobile app
2. Go to "Forgot Password"
3. Enter your email
4. Check inbox for new email
5. Verify the link now shows:
   ```
   https://www.soundbridge.live/auth/callback?token_hash=...&type=recovery&next=/update-password
   ```
6. Click the link
7. Should redirect to `/update-password` page
8. Should be able to reset password successfully ✅

---

## Why This Fix Works

**The Problem:**
- `{{ .ConfirmationURL }}` is Supabase's auto-generated URL
- It always points to Supabase's domain and default verification endpoint
- This bypasses your custom `/auth/callback` route

**The Solution:**
- `{{ .TokenHash }}` gives you just the token
- You construct the full URL yourself
- Points to your custom domain and `/auth/callback` route
- Your route verifies the token and creates a session
- Then redirects to `/update-password` with valid session ✅

---

## Alternative: Use SendGrid Hook (More Complex)

The Auth Hook you enabled earlier (`https://soundbridge.live/api/auth/send-email`) was supposed to handle this, but it's not being triggered. That's a more complex issue requiring web team involvement.

**For immediate fix:** Update the email template as described above. This is simpler and achieves the same result.

---

**Status:** Ready to apply fix
**Location:** Supabase Dashboard → Authentication → Email → Password Reset template
**Action:** Replace `{{ .ConfirmationURL }}` with custom URL using `{{ .TokenHash }}`
**Expected Result:** Password reset will work for both mobile and web apps
