# 📱 Real Device Testing Guide - Push Notifications

**Date:** December 18, 2025  
**Feature:** Content Moderation Push Notifications  
**Testing Options:** Expo Go OR TestFlight

---

## 🎯 What We Need to Test

The **only feature** that requires a real device is **push notifications**:

1. ✅ Notification delivery to device
2. ✅ Notification tapping (deep links to track)
3. ✅ Background notification handling
4. ✅ Notification sound/vibration
5. ✅ Push token registration

**Everything else** already works perfectly in Simulator! ✅

---

## 📲 Option 1: Test with Expo Go (Fastest - 2 minutes)

### **Pros:**
- ✅ Fastest method (no build needed)
- ✅ Instant updates with Fast Refresh
- ✅ Perfect for quick testing
- ✅ Free (no Apple Developer account needed)

### **Cons:**
- ⚠️ Push notifications limited in Expo Go
- ⚠️ May not reflect production behavior exactly

---

### **Step 1: Install Expo Go on Your Device**

**iOS:**
```
1. Open App Store
2. Search "Expo Go"
3. Install the app
4. Open it
```

**Android:**
```
1. Open Play Store
2. Search "Expo Go"
3. Install the app
4. Open it
```

---

### **Step 2: Connect to Same Wi-Fi**

Make sure your phone and computer are on the **same Wi-Fi network**.

---

### **Step 3: Start Expo and Scan QR Code**

On your computer:
```bash
cd C:\soundbridge-app
npx expo start
```

On your phone:
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Scan the QR code from your terminal/browser
4. App will load on your device!

---

### **Step 4: Test Push Notification Registration**

Once the app loads:

1. **Login** to your account
2. **Watch the logs** in your terminal for:
   ```
   ✅ Push token registered for moderation: ExponentPushToken[...]
   ```
3. **Check Supabase** - Go to Supabase dashboard:
   ```sql
   SELECT id, username, expo_push_token 
   FROM profiles 
   WHERE id = 'your-user-id';
   ```
   Should see your push token stored!

---

### **Step 5: Test Notification Sending (Manual)**

Since moderation happens on the backend, we'll **manually test** notification delivery:

#### **Method A: Use Expo Push Notification Tool**

1. Get your push token from terminal (or Supabase)
2. Go to: https://expo.dev/notifications
3. Enter your token
4. Set title: "Test Moderation Notification"
5. Set message: "Your track has been approved!"
6. Click "Send"
7. **Should receive notification on your device!** ✅

#### **Method B: Use Backend Notification Endpoint (if available)**

```bash
curl -X POST https://www.soundbridge.live/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "track_approved", "trackId": "some-track-id"}'
```

---

### **Step 6: Test Deep Linking**

After receiving a notification:

1. **Tap the notification**
2. App should open
3. Should navigate to TrackDetailsScreen for that track
4. **Success!** ✅

---

## 🏗️ Option 2: Test with TestFlight (Production-Like)

### **Pros:**
- ✅ Most accurate testing (like production)
- ✅ Real push notification behavior
- ✅ Can share with testers
- ✅ Background notifications work perfectly

### **Cons:**
- ⚠️ Requires Apple Developer account ($99/year)
- ⚠️ Takes 10-20 minutes to build
- ⚠️ Review process can take hours (for first build)

---

### **Step 1: Configure EAS Build**

If not already done:
```bash
cd C:\soundbridge-app
eas build:configure
```

---

### **Step 2: Build for iOS TestFlight**

```bash
eas build --platform ios --profile production
```

**What happens:**
1. Code uploaded to EAS servers
2. Build starts (takes 10-20 minutes)
3. You'll get a build URL
4. Download and submit to TestFlight

---

### **Step 3: Submit to TestFlight**

After build completes:

```bash
eas submit --platform ios
```

Or manually:
1. Download `.ipa` file from EAS dashboard
2. Open Transporter app (Mac)
3. Drag `.ipa` file to Transporter
4. Submit to App Store Connect
5. Wait for processing (1-2 hours)

---

### **Step 4: Install via TestFlight**

1. Open TestFlight app on your iPhone
2. You'll see SoundBridge app
3. Tap "Install"
4. Open the app
5. Login

---

### **Step 5: Test Full Push Notification Flow**

1. **Register token:**
   - Login to app
   - Check terminal logs for token registration
   - Verify in Supabase

2. **Trigger moderation event:**
   - Upload a track (or use existing)
   - Backend processes it
   - Moderation decision triggers notification

3. **Receive notification:**
   - Should see notification on lock screen
   - Should hear sound/vibration
   - Should work in background

4. **Test deep link:**
   - Tap notification
   - App opens to TrackDetailsScreen
   - See moderation details

---

## 🧪 Comprehensive Testing Checklist

### **Push Token Registration:**
- [ ] App registers token on login
- [ ] Token stored in `profiles.expo_push_token`
- [ ] Token visible in logs
- [ ] Token format: `ExponentPushToken[...]`

### **Notification Delivery:**
- [ ] Notification received on device
- [ ] Title and message correct
- [ ] Sound plays (if enabled)
- [ ] Badge count increases
- [ ] Works when app is closed
- [ ] Works when app is in background
- [ ] Works when app is open

### **Deep Linking:**
- [ ] Tapping notification opens app
- [ ] Navigates to TrackDetailsScreen
- [ ] Shows correct track
- [ ] Moderation details visible
- [ ] Works from cold start
- [ ] Works when app is in background

### **Notification Types:**
- [ ] Track approved notification
- [ ] Track rejected notification
- [ ] Track flagged notification
- [ ] Appeal approved notification
- [ ] Appeal rejected notification

### **Edge Cases:**
- [ ] Multiple notifications stack correctly
- [ ] Old notifications still work after app update
- [ ] Notification tapping when track deleted
- [ ] Notification tapping when logged out

---

## 📊 What to Log During Testing

### **Success Logs:**
```
✅ Push token registered: ExponentPushToken[xxxxx]
✅ Notification received
✅ Deep link handled: track-id-123
✅ Navigated to TrackDetailsScreen
```

### **Error Logs to Watch For:**
```
❌ Failed to register push token
❌ Notification not received
❌ Deep link failed
❌ Navigation error
```

---

## 🐛 Troubleshooting

### **Issue: No push token registered**

**Check:**
1. Is user logged in?
2. Is `NotificationService.registerPushTokenForModeration()` called?
3. Check logs for errors
4. Check device permissions (Settings > Notifications)

**Fix:**
```typescript
// Add logging in NotificationService.ts
console.log('🔔 Registering push token for moderation...');
```

---

### **Issue: Notification not received**

**Check:**
1. Is token correct in Supabase?
2. Is device connected to internet?
3. Are notifications enabled for app?
4. Is backend sending notification correctly?

**Test manually:**
```
Use Expo Push Notification Tool to verify token works
```

---

### **Issue: Deep link not working**

**Check:**
1. Is `trackId` in notification data?
2. Is navigation reference set up?
3. Check `App.tsx` deep link listener
4. Check `NotificationService.handleDeepLink()`

**Debug:**
```typescript
// Add logging in handleDeepLink
console.log('🔗 Deep link data:', data);
```

---

## 📱 Device Permissions Required

### **iOS:**
```
Settings > SoundBridge > Notifications
- Allow Notifications: ON
- Sounds: ON
- Badges: ON
- Lock Screen: ON
- Notification Center: ON
- Banners: ON
```

### **Android:**
```
Settings > Apps > SoundBridge > Notifications
- Show notifications: ON
- Sound: ON
- Vibrate: ON
- Notification dot: ON
```

---

## 🎯 Quick Test (5 Minutes)

**Fastest way to verify everything works:**

1. **Open Expo Go**, scan QR code
2. **Login** to app
3. **Check logs** for: `✅ Push token registered`
4. **Copy token** from logs
5. **Go to** https://expo.dev/notifications
6. **Send test notification**
7. **Should receive it!** ✅
8. **Tap notification**
9. **Should open app** (deep link may not work in Expo Go, that's OK)

**If you get notification + token registered = SUCCESS!** 🎉

---

## 📈 Expected Results

### **Expo Go Testing:**
- ✅ Token registration: Works
- ✅ Notification delivery: Works
- ⚠️ Deep linking: Limited (may not work fully)
- ⚠️ Background: Limited

### **TestFlight Testing:**
- ✅ Token registration: Works
- ✅ Notification delivery: Works
- ✅ Deep linking: Works perfectly
- ✅ Background: Works perfectly
- ✅ Production-ready: Yes

---

## 🚀 Recommendation

### **For Quick Verification:**
Use **Expo Go** (2 minutes)
- Good enough to verify token registration
- Confirms notification system works

### **For Final QA:**
Use **TestFlight** (1 hour)
- Full production behavior
- Complete deep linking
- Background notifications
- Ready for App Store

---

## 📝 Testing Notes

**What to record:**
1. Device model (e.g., iPhone 15 Pro)
2. iOS version (e.g., iOS 17.2)
3. App version/build number
4. Push token received
5. Notification delivery time
6. Deep link success/failure
7. Any errors or issues

**Share with team:**
- Screenshots of successful notifications
- Log snippets showing token registration
- Any errors encountered
- Deep link behavior

---

## ✅ Success Criteria

**Minimum (Expo Go):**
- [x] Push token registered
- [x] Token stored in database
- [x] Manual notification received

**Full (TestFlight):**
- [x] Push token registered
- [x] Backend moderation triggers notification
- [x] Notification received on device
- [x] Deep link opens correct track
- [x] Works in all app states (foreground/background/closed)

---

## 🎉 After Testing

Once testing is complete:

1. **Update PR** with test results
2. **Add screenshots** of notifications
3. **Document any issues** found
4. **Mark todo as complete**
5. **Share results** with team

---

**Ready to test!** 📱✨

**Start with Expo Go** for quick verification, then **build for TestFlight** if you need full production testing.

---

## 📞 Need Help?

**Common Questions:**

**Q: Do I need Apple Developer account?**  
A: Only for TestFlight. Expo Go works without it!

**Q: How long does TestFlight take?**  
A: Build: 10-20 min, Processing: 1-2 hours, Total: ~2 hours

**Q: Can I test on Android?**  
A: Yes! Same process, just use Android device + Expo Go

**Q: What if notifications don't work in Expo Go?**  
A: That's OK - as long as token registers, you're good. Use TestFlight for full testing.

---

**Let's get those push notifications tested!** 🚀📱

