# Android AdMob Setup Guide

## 🤖 Quick Setup for Android Platform

### Step 1: Verify Dependencies

**File:** `android/app/build.gradle`

The `react-native-google-mobile-ads` package should have automatically added the dependency. Verify it exists:

```gradle
dependencies {
  // ... other dependencies
  implementation 'com.google.android.gms:play-services-ads:22.0.0'
}
```

If not present, add it manually.

### Step 2: Configure AndroidManifest.xml

**File:** `android/app/src/main/AndroidManifest.xml`

Add inside the `<application>` tag (before `<activity>`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  
  <application
    ...existing attributes...>
    
    <!-- Google AdMob App ID -->
    <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-XXXXXXXXXXXX~YYYYYYYYYY"/>
    
    <!-- ... rest of your existing configuration ... -->
    <activity>
      ...
    </activity>
    
  </application>
  
</manifest>
```

**Important:** Replace `ca-app-pub-XXXXXXXXXXXX~YYYYYYYYYY` with your actual AdMob Android App ID.

### Step 3: Get Your Android AdMob IDs

1. Go to [AdMob Console](https://apps.admob.com/)
2. Click "Apps" → "Add App"
3. Select "Android"
4. Enter package name: `com.soundbridge.mobile` (or your actual package name)
5. Enter app name: "SoundBridge"
6. Get your App ID (format: `ca-app-pub-XXXXXXXXXXXX~YYYYYYYYYY`)
7. Create Ad Units:
   - Banner Ad Unit → Get ID
   - Interstitial Ad Unit → Get ID

### Step 4: Update Ad Unit IDs in Code

**File:** `src/services/AdService.ts`

Replace test IDs with your production IDs:
```typescript
{
  id: 'banner-home',
  type: 'banner',
  network: 'admob',
  unitId: Platform.select({
    ios: 'ca-app-pub-XXXXXXXXXXXX/YYYYYYYYYY', // iOS Banner ID
    android: 'ca-app-pub-XXXXXXXXXXXX/YYYYYYYYYY', // Android Banner ID
  }),
  enabled: true,
},
{
  id: 'interstitial-tracks',
  type: 'interstitial',
  network: 'admob',
  unitId: Platform.select({
    ios: 'ca-app-pub-XXXXXXXXXXXX/ZZZZZZZZZZ', // iOS Interstitial ID
    android: 'ca-app-pub-XXXXXXXXXXXX/ZZZZZZZZZZ', // Android Interstitial ID
  }),
  enabled: true,
}
```

### Step 5: Test on Android Device

```bash
# Run on Android
npm run android
# or
npx expo run:android
```

### Step 6: ProGuard Configuration (If Using ProGuard)

**File:** `android/app/proguard-rules.pro`

Add these rules:
```proguard
# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**
```

### Troubleshooting

**Issue:** Ads not showing
- ✅ Verify App ID in AndroidManifest.xml is correct
- ✅ Check that Ad Unit IDs are correct
- ✅ Test with test IDs first before production IDs
- ✅ Check Logcat for AdMob errors: `adb logcat | grep -i "ad"`
- ✅ Ensure app has internet permission (should be added automatically)

**Issue:** Build errors
- Clean build: `cd android && ./gradlew clean && cd ..`
- Rebuild: `cd android && ./gradlew assembleDebug && cd ..`
- Check Gradle sync in Android Studio

**Issue:** App ID not found error
- Double-check the App ID format in AndroidManifest.xml
- Ensure you're using the App ID (with ~), not an Ad Unit ID (with /)
- Format: `ca-app-pub-XXXXXXXXXXXX~YYYYYYYYYY` (note the ~ tilde)

### Internet Permission

The internet permission should already exist in your AndroidManifest.xml. If not, add:

```xml
<manifest>
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  
  <application>
    ...
  </application>
</manifest>
```

### Testing with Test Ads

For testing, you can use Google's test Ad Unit IDs:

```typescript
// Test IDs (safe to use during development)
const testAdUnits = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    appId: 'ca-app-pub-3940256099942544~3347511713'
  }
};
```

**Important:** Replace with production IDs before releasing to Play Store!

---

✅ **Android Setup Complete!**

### Next Steps:
1. Test ads on Android device/emulator
2. Verify impression tracking in web analytics
3. Test with different user tiers (free/pro/enterprise)
4. Submit for internal testing
5. Deploy to Play Store (after replacing test IDs)

