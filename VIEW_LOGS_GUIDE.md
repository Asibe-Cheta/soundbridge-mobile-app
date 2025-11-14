# 📱 How to View Logs on iOS Device (Windows PC)

## Quick Reference

### Method 1: Metro Bundler Terminal (Easiest) ✅

**Steps:**
1. Open terminal/PowerShell in project directory
2. Run: `npx expo start`
3. Connect your iOS device via USB or WiFi
4. Press `i` to open iOS simulator OR scan QR code with Expo Go app
5. **All console.log() messages will appear in the terminal**

**What you'll see:**
```
🌐 API Request: POST https://app.soundbridge.fm/api/users/xxx/creator-types
🔑 Has token: true
📦 Has session: true
📡 API Response: 200 OK
```

---

### Method 2: Expo Dev Tools (Browser)

**Steps:**
1. Run: `npx expo start`
2. Press `m` to open Metro bundler in browser
3. OR visit: `http://localhost:19002`
4. Click "Logs" tab to see all console output

**URL:** `http://localhost:19002/logs`

---

### Method 3: React Native Debugger (Advanced)

**Steps:**
1. Install React Native Debugger: https://github.com/jhen0409/react-native-debugger
2. Run: `npx expo start`
3. In your app, shake device → "Debug"
4. Open React Native Debugger app
5. View Console tab for all logs

---

### Method 4: Command Line - Device Logs

**For Physical iOS Device:**

1. **Install iOS device support tools:**
   ```powershell
   # Install iTunes (includes device support)
   # OR install Apple Mobile Device Support separately
   ```

2. **View device logs:**
   ```powershell
   # Using idevicesyslog (if installed)
   idevicesyslog
   
   # OR using adb-like tool for iOS
   # Note: iOS doesn't have direct equivalent to adb
   ```

3. **Using Xcode (if available):**
   - Open Xcode
   - Window → Devices and Simulators
   - Select your device
   - Click "Open Console" button
   - View all device logs

---

### Method 5: Expo Go App Logs

**If using Expo Go app:**

1. Open Expo Go app on your device
2. Shake device → "Show Dev Menu"
3. Tap "Debug Remote JS"
4. Open Chrome DevTools: `http://localhost:19000/debugger-ui`
5. View Console tab

---

### Method 6: React Native LogBox (Built-in)

**In your app:**
- Errors appear as red overlay automatically
- Warnings appear as yellow overlay
- Tap to dismiss or view details

**To enable more verbose logging:**
```typescript
// In your code, add:
import { LogBox } from 'react-native';

// Show all logs (including warnings)
LogBox.ignoreAllLogs(false);
```

---

## 🎯 Recommended Setup for Your Case

**Since you're on Windows PC with iOS device:**

### Option A: Metro Bundler (Easiest) ⭐
```powershell
cd C:/soundbridge-app
npx expo start
```
- All logs appear in terminal
- Press `i` for iOS simulator
- OR scan QR code with Expo Go on physical device
- **Console.log messages visible immediately**

### Option B: Expo Dev Tools (Browser)
```powershell
cd C:/soundbridge-app
npx expo start
# Press 'm' or visit http://localhost:19002
# Click "Logs" tab
```

### Option C: React Native Debugger
1. Download: https://github.com/jhen0409/react-native-debugger/releases
2. Install React Native Debugger
3. Run app with `npx expo start`
4. Shake device → "Debug"
5. Open React Native Debugger
6. View Console tab

---

## 🔍 What Logs to Look For

When testing "Become a Service Provider", look for:

```
🚀 Starting becomeServiceProvider flow...
User ID: xxx
Session exists: true
🌐 API Request: GET https://app.soundbridge.fm/api/users/xxx/creator-types
🔑 Has token: true
📦 Has session: true
📡 API Response: 200 OK
✅ becomeServiceProvider result: { success: true, creatorTypes: [...] }
```

**If error occurs:**
```
❌ Network Error: {
  message: "Network request failed",
  url: "https://app.soundbridge.fm/api/users/xxx/creator-types",
  hasToken: true,
  hasSession: true
}
```

---

## 🛠️ Troubleshooting

### Logs not showing?
1. **Check Metro bundler is running:** Terminal should show "Metro waiting on..."
2. **Check device is connected:** Should see device name in terminal
3. **Enable verbose logging:** Add `--verbose` flag:
   ```powershell
   npx expo start --verbose
   ```

### Can't see console.log?
1. **Check LogBox is enabled:** Errors/warnings should show overlay
2. **Enable remote debugging:** Shake device → "Debug"
3. **Check Metro bundler:** Should be running and connected

### Physical device not connecting?
1. **USB Connection:**
   - Connect via USB cable
   - Trust computer on device
   - Check iTunes/Apple Mobile Device Support installed

2. **WiFi Connection:**
   - Device and PC on same WiFi network
   - Run `npx expo start --tunnel` for remote access

---

## 📝 Quick Commands

```powershell
# Start Expo with verbose logging
npx expo start --verbose

# Start Expo with tunnel (for remote access)
npx expo start --tunnel

# Clear Metro cache and restart
npx expo start --clear

# View logs only (no UI)
npx expo start --no-dev
```

---

## ✅ Best Practice

**For development:**
1. Keep Metro bundler terminal open
2. Watch for console.log messages
3. Use Expo Dev Tools browser tab for detailed logs
4. Enable remote debugging for advanced debugging

**For production testing:**
1. Use device logs via Xcode (if available)
2. Or use remote logging service (Sentry, etc.)
3. Check crash reports in App Store Connect

---

**Need help?** Check Expo docs: https://docs.expo.dev/workflow/logging/

