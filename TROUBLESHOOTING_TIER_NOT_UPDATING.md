# 🔧 Troubleshooting: Tier Still Showing Free

**Issue:** After applying the bypass fix, screens still show Free tier (30MB) instead of Premium tier (2GB).

---

## 🔍 Root Cause: Cache Not Cleared

The fix is in place, but the app is using cached values from before the fix was applied. There are **three layers of caching**:

1. **In-memory quota cache** (2-minute TTL)
2. **In-memory storage cache** (2-minute TTL)
3. **React component state** (persists until unmount)

---

## ✅ Solution: Force Full Reload

### **Option 1: Reload JavaScript Bundle (Recommended)**

**In Expo Go:**
1. Shake your device (or press `Cmd+D` on iOS simulator / `Cmd+M` on Android emulator)
2. Tap **"Reload"** to reload the JavaScript bundle
3. Navigate to Upload screen
4. Verify it now shows "2GB storage"

**OR** in the Metro bundler terminal:
- Press `r` to reload the app

### **Option 2: Complete App Restart**

1. **Force-quit the app** (swipe up from app switcher)
2. **Stop Metro bundler** (Ctrl+C in terminal)
3. **Clear cache and restart:**
   ```bash
   npm start -- --clear
   ```
4. **Reopen the app** in Expo Go
5. Navigate to Upload screen

### **Option 3: Clear All Caches (Nuclear Option)**

```bash
# Stop Metro bundler first (Ctrl+C)

# Clear all caches
npx expo start --clear

# Or manually clear everything
rm -rf node_modules/.cache
rm -rf .expo
watchman watch-del-all
npm start
```

---

## 🔍 Verify the Fix is Working

After reloading, check the **Metro bundler console logs**. You should see:

```
LOG  🔍 UploadQuotaService: Fetching fresh quota...
LOG  🔧 DEVELOPMENT MODE: Using hardcoded tier for upload quota
LOG  🔧 Hardcoded tier: PREMIUM
LOG  📊 Calculating storage usage for user: xxx
LOG  ✅ Storage usage calculated: 27.86 MB (9 tracks)
LOG  🔧 STORAGE: Overriding tier free → premium (development mode)
```

**Key indicators the fix is working:**
- ✅ "DEVELOPMENT MODE: Using hardcoded tier for upload quota"
- ✅ "Hardcoded tier: PREMIUM"
- ✅ "Overriding tier free → premium"

If you **DON'T see these logs**, the code changes didn't reload properly.

---

## 🐛 If Still Not Working

### **Check 1: Verify TypeScript Compilation**

Run this in your terminal:
```bash
npx tsc --noEmit
```

If there are TypeScript errors, fix them first.

### **Check 2: Verify Files Were Saved**

Check that the changes are actually in the files:

```bash
# Should show the import on line 3-4
grep -n "config.*environment" src/services/StorageQuotaService.ts

# Should show the bypass logic around lines 150-154
grep -A5 "Development bypass" src/services/StorageQuotaService.ts

# Should show the bypass logic around lines 120-140
grep -A5 "Development bypass" src/services/UploadQuotaService.ts
```

### **Check 3: Verify Environment is Development**

Add this temporary debug line to see which environment is active:

```typescript
// Temporarily add to UploadQuotaService.ts line 122
console.log('🔍 Current environment:', ENV);
console.log('🔍 bypassRevenueCat:', config.bypassRevenueCat);
console.log('🔍 developmentTier:', config.developmentTier);
```

### **Check 4: Hard-code Bypass for Testing**

If it's still not working, temporarily hard-code the bypass to test:

```typescript
// In StorageQuotaService.ts, line 150-154, temporarily change:
if (config.bypassRevenueCat && config.developmentTier) {
// TO:
if (true) { // TEMPORARY DEBUG
  const effectiveTier = 'premium' as StorageTier; // TEMPORARY DEBUG
```

If this works, the issue is with the config import or environment detection.

---

## 📱 Expected Screens After Fix

### **Upload Screen:**
```
┌─────────────────────────────────┐
│ ☁️ Premium Tier                 │
│                                 │
│ 2GB storage · ~200 tracks       │
│ Unlimited uploads*              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ☁️ Storage                      │
│ ~3 tracks                  Manage│
│                                 │
│ 27.86 MB   │  1.93 GB  │  2GB   │
│   Used     │ Available │ Total  │
│                                 │
│ ▓▓░░░░░░░░░░░░░░░░░░░░░░  1%   │
│                                 │
│ [No upgrade prompt shown]       │
└─────────────────────────────────┘
```

### **Discover Screen:**
```
┌─────────────────────────────────┐
│ 🎵 Upload Your Music            │
│                                 │
│ Free: 30MB • Premium: 2GB •     │
│ Unlimited: 10GB                 │
│                                 │
│ [Shows current tier status]     │
└─────────────────────────────────┘
```

---

## 🎯 Quick Checklist

Before asking for more help, verify:

- [ ] Stopped Metro bundler (Ctrl+C)
- [ ] Started with clear cache: `npx expo start --clear`
- [ ] Reopened app in Expo Go
- [ ] Checked Metro console logs for bypass messages
- [ ] Files actually saved with changes
- [ ] TypeScript compiled without errors

---

## 💡 Why This Happens

The issue occurs because:

1. **Before fix:** App loaded and cached quota showing Free tier (30MB)
2. **After fix:** Code changed, but cached values still in memory
3. **Metro bundler:** Only reloads changed files, not all caches
4. **Solution:** Force full reload to clear all caches and re-initialize

---

## 📞 Still Not Working?

If you've tried all the above and it's still showing 30MB:

1. **Share Metro console logs** - Copy all logs from startup to Upload screen load
2. **Verify changes exist** - Run the grep commands above and share output
3. **Check imports** - Make sure no circular dependency issues

The fix IS in the code, it's just a matter of getting the app to use the new code instead of cached values.
