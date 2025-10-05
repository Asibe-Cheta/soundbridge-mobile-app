# Supabase Auth Hook Configuration

## 🚨 **CRITICAL: Configure Supabase to Use Custom Auth Hook**

The reason you're not receiving signup emails is that Supabase is using its default email system instead of our custom SendGrid integration.

## **Step 1: Configure Auth Hook in Supabase Dashboard**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your SoundBridge project

2. **Navigate to Authentication Settings**
   - Go to: **Authentication** → **Settings** → **Auth Hooks**

3. **Add Custom Auth Hook**
   - **Hook URL**: `https://soundbridge.live/api/auth/send-email`
   - **Events**: Select both:
     - ✅ **Sign Up**
     - ✅ **Password Recovery**
   - **HTTP Method**: `POST`
   - **Headers**: 
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer YOUR_SECRET_HOOK_TOKEN"
     }
     ```
   - **Secret Token**: Generate a secure random token (keep this secret!)

## **Step 2: Update Environment Variables**

Add this to your `.env.local` file:

```bash
# Supabase Auth Hook Secret (for security)
SUPABASE_AUTH_HOOK_SECRET=your_generated_secret_token_here
```

## **Step 3: Update Auth Hook Security**

Update `app/api/auth/send-email/route.ts` to verify the secret token:

```typescript
// Add at the top of the POST function
const AUTH_HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify the auth hook secret for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${AUTH_HOOK_SECRET}`;
    
    if (authHeader !== expectedToken) {
      console.error('Unauthorized auth hook request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of the existing code
  }
}
```

## **Step 4: Test the Configuration**

1. **Test the auth hook directly**:
   - Visit: `https://soundbridge.live/api/auth/send-email` (should show health check)
   - Use the test page: `https://soundbridge.live/test-signup-flow`

2. **Test actual signup**:
   - Try signing up with a new email address
   - Check if the email is sent via our SendGrid integration

## **Alternative: Manual Email Sending (Temporary Fix)**

If you can't configure the auth hook immediately, we can modify the signup flow to manually send emails:

```typescript
// In app/(auth)/signup/page.tsx - after successful signup
if (data?.user && !data.session) {
  // Email confirmation required - manually send email
  try {
    await fetch('/api/auth/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'signup',
        user: { email: formData.email, id: data.user.id },
        email_data: {
          email_action_type: 'signup',
          token: 'manual-token', // This would need proper token generation
          token_hash: 'manual-hash',
          redirect_to: `${window.location.origin}/auth/callback?next=/`
        }
      })
    });
  } catch (error) {
    console.error('Failed to send signup email:', error);
  }
}
```

## **Step 5: Verify Email Templates**

Make sure your SendGrid templates are properly configured:

1. **Signup Template**: `SENDGRID_SIGNUP_TEMPLATE_ID`
2. **Reset Template**: `SENDGRID_RESET_TEMPLATE_ID`
3. **Template Variables**:
   - `{{user_name}}`
   - `{{confirmation_url}}` (for signup)
   - `{{reset_url}}` (for password reset)
   - `{{email}}`

## **Step 6: Test Complete Flow**

1. **Signup Test**:
   - Create new account
   - Check email inbox
   - Click confirmation link
   - Verify redirect to homepage with onboarding

2. **Password Reset Test**:
   - Go to reset password page
   - Enter email address
   - Check email inbox
   - Click reset link

## **Troubleshooting**

### If emails still don't arrive:

1. **Check Supabase Logs**:
   - Go to: **Logs** → **Auth**
   - Look for auth hook call logs

2. **Check SendGrid Logs**:
   - Go to: **Activity** → **Email Activity**
   - Look for sent/delivered emails

3. **Check Server Logs**:
   - Look at your application logs for auth hook requests

4. **Verify Environment Variables**:
   ```bash
   # Required variables
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_SIGNUP_TEMPLATE_ID=your_signup_template_id
   SENDGRID_RESET_TEMPLATE_ID=your_reset_template_id
   SENDGRID_FROM_EMAIL=contact@soundbridge.live
   SUPABASE_AUTH_HOOK_SECRET=your_secret_token
   ```

## **Security Notes**

- The auth hook secret prevents unauthorized access to your email endpoint
- Keep the secret token secure and don't commit it to version control
- Use HTTPS for your auth hook URL in production
- Monitor auth hook requests for suspicious activity

---

**Status**: ⚠️ **REQUIRES SUPABASE DASHBOARD CONFIGURATION**

The email system is ready, but Supabase needs to be configured to use our custom auth hook instead of its default email system.

