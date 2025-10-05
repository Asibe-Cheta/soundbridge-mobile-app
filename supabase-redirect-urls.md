# Supabase Redirect URLs Configuration

## URLs to Add to Supabase Dashboard

Go to **Authentication > URL Configuration** in your Supabase Dashboard and add these URLs:

### Required URLs for Mobile App:
```
https://www.soundbridge.live/auth/mobile-callback
https://soundbridge.live/auth/mobile-callback
```

### Development URLs (for testing):
```
exp://192.168.1.122:8081/--/auth/mobile-callback
exp://localhost:8081/--/auth/mobile-callback
```

### Existing URLs (keep these):
```
https://www.soundbridge.live/auth/callback
https://soundbridge.live/auth/callback
https://www.soundbridge.live/login
https://soundbridge.live/login
https://www.soundbridge.live/signup
https://soundbridge.live/signup
```

## How It Works Now:

1. **Mobile app sign-up** → sends email with `https://www.soundbridge.live/auth/callback` link
2. **User clicks link on mobile** → web app detects mobile device
3. **Web app redirects** → automatically redirects to `/auth/mobile-callback`
4. **Mobile-callback page** → handles verification and opens mobile app
5. **Fallback** → if app not installed, shows success page

## Test Steps:

1. Add the URLs above to Supabase
2. Restart the mobile app server
3. Try signing up with a new email
4. Click the verification link on mobile
5. Should now redirect to mobile-callback page and open your app!
