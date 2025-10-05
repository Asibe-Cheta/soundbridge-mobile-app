# 🔧 **URGENT: Add These URLs to Supabase Redirect URLs**

## **Go to Supabase Dashboard → Authentication → URL Configuration**

### **Click "Add URL" and add these:**

```
https://www.soundbridge.live/auth/mobile-callback
https://soundbridge.live/auth/mobile-callback
```

## **Why This is Critical:**

Even though the mobile app is sending the correct URL, Supabase might be rejecting it because it's not in the whitelist of allowed redirect URLs.

## **Current Status:**

- ✅ Mobile app is correctly sending mobile-callback URL (confirmed in console logs)
- ❌ Supabase is still generating emails with old callback URL
- ❓ Mobile-callback URLs might not be whitelisted in Supabase

## **Test After Adding URLs:**

1. Add the URLs above to Supabase
2. Try signing up with a NEW email address
3. Check if the new email contains the mobile-callback URL
4. If still showing old URL, we'll need to investigate further

**The mobile app is working correctly - this is a Supabase configuration issue.**
