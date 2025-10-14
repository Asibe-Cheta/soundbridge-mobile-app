# iOS AdMob Setup Guide

## 📱 Quick Setup for iOS Platform

### Step 1: Install iOS Dependencies
```bash
cd ios
pod install
cd ..
```

### Step 2: Modify AppDelegate.mm

**File:** `ios/soundbridgemobile/AppDelegate.mm`

Add at the top (with other imports):
```objective-c
#import <GoogleMobileAds/GoogleMobileAds.h>
```

Add inside `application:didFinishLaunchingWithOptions:` method (before return statement):
```objective-c
- (BOOL)application:(UIApplication *)application 
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  
  // Initialize Google Mobile Ads SDK
  [[GADMobileAds sharedInstance] startWithCompletionHandler:nil];
  
  // ... existing code ...
  return YES;
}
```

### Step 3: Configure Info.plist

**File:** `ios/soundbridgemobile/Info.plist`

Add before the closing `</dict>` tag:

```xml
<!-- Google AdMob App ID -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXX~YYYYYYYYYY</string>

<!-- iOS 14+ App Tracking Transparency -->
<key>NSUserTrackingUsageDescription</key>
<string>This identifier will be used to deliver personalized ads to you.</string>

<!-- SKAdNetwork IDs for AdMob -->
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>4fzdc2evr5.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>4pfyvq9l8r.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>2fnua5tdw4.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>ydx93a7ass.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>5a6flpkh64.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>p78axxw29g.skadnetwork</string>
  </dict>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>v72qych5uu.skadnetwork</string>
  </dict>
</array>
```

### Step 4: Get Your iOS AdMob IDs

1. Go to [AdMob Console](https://apps.admob.com/)
2. Click "Apps" → "Add App"
3. Select "iOS"
4. Enter app name: "SoundBridge"
5. Get your App ID (format: `ca-app-pub-XXXXXXXXXXXX~YYYYYYYYYY`)
6. Create Ad Units:
   - Banner Ad Unit → Get ID
   - Interstitial Ad Unit → Get ID

### Step 5: Update Ad Unit IDs in Code

**File:** `src/services/AdService.ts`

Replace test IDs with your production IDs:
```typescript
{
  id: 'banner-home',
  type: 'banner',
  network: 'admob',
  unitId: 'ca-app-pub-XXXXXXXXXXXX/YYYYYYYYYY', // Your iOS Banner ID
  enabled: true,
},
{
  id: 'interstitial-tracks',
  type: 'interstitial',
  network: 'admob',
  unitId: 'ca-app-pub-XXXXXXXXXXXX/ZZZZZZZZZZ', // Your iOS Interstitial ID
  enabled: true,
}
```

### Step 6: Test on iOS Device

```bash
# Run on iOS
npm run ios
# or
npx expo run:ios
```

### Troubleshooting

**Issue:** Ads not showing
- ✅ Verify App ID in Info.plist is correct
- ✅ Ensure AdMob SDK is initialized in AppDelegate
- ✅ Check that Ad Unit IDs are correct
- ✅ Test with test IDs first before production IDs
- ✅ Check console logs for AdMob errors

**Issue:** Build errors
- Run `cd ios && pod install && cd ..`
- Clean build: `cd ios && xcodebuild clean && cd ..`
- Delete `ios/Pods` and reinstall

---

✅ **iOS Setup Complete!**

