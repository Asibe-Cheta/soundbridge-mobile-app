# 🔐 Authentication Setup for SoundBridge Mobile App

## Quick Setup Guide

To enable real authentication in your mobile app, follow these steps:

### 1. Configure Supabase Credentials

Open `apps/mobile/src/config/supabase.ts` and replace the placeholder values with your actual Supabase credentials:

```typescript
export const SUPABASE_CONFIG = {
  // Replace with your actual Supabase project URL
  url: 'https://your-actual-project-id.supabase.co',
  
  // Replace with your actual Supabase anon key
  anonKey: 'your-actual-anon-key-here',
};
```

**Where to find these values:**
- Go to your Supabase dashboard
- Navigate to Settings → API
- Copy the "Project URL" and "anon public" key

### 2. Test Authentication

Once configured, you can test the authentication:

1. **Email/Password Login**: Enter any valid credentials from your web app
2. **Google OAuth**: Tap "Continue with Google" (requires additional OAuth setup)

### 3. Authentication Features Implemented

✅ **Email/Password Authentication**
- Sign in with existing Supabase users
- Error handling and validation
- Loading states and user feedback

✅ **Google OAuth Integration**
- Google sign-in button
- OAuth flow handling

✅ **Session Management**
- Automatic session restoration
- Auth state persistence
- Secure token storage with AsyncStorage

✅ **Navigation Flow**
- Splash screen while checking auth state
- Auth screen for unauthenticated users
- Main app for authenticated users

### 4. Next Steps

After authentication is working, you can:

1. **Add Sign Up Flow**: Create a registration screen
2. **Profile Management**: Build user profile screens
3. **Data Integration**: Connect to your Supabase database
4. **Push Notifications**: Add notification handling

### 5. Troubleshooting

**If you see configuration warnings:**
- Make sure you've updated `src/config/supabase.ts` with real values
- Check that your Supabase project is active
- Verify the anon key has proper permissions

**If authentication fails:**
- Check your internet connection
- Verify Supabase project settings
- Check the console for detailed error messages

---

🎉 **You're ready to test real authentication!** Once you update the config file, your mobile app will connect to the same Supabase backend as your web app.
