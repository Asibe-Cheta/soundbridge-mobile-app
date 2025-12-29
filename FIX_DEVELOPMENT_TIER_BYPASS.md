# ✅ FIX: Development Tier Bypass for Storage System

**Date:** December 29, 2025
**Issue:** Upload and Discover screens showed Free tier (30MB) even though development config was set to Premium

---

## 🐛 Problem

When `bypassRevenueCat: true` and `developmentTier: 'premium'` were set in [environment.ts](src/config/environment.ts), the app still showed:

- ❌ Upload screen: "Premium Tier" + "30MB storage" (wrong storage limit)
- ❌ Discover screen: "Free: 30MB • Premium: 2GB • Unlimited: 10GB" (wrong current tier)
- ❌ Storage indicator: "27.86 MB / 30MB (93% used)" (free tier limits)
- ❌ Upgrade prompt: "Upgrade to Premium for 2GB..." (already should be Premium!)

**Root Cause:** The development bypass logic was only implemented in `UpgradeScreen` but missing from:
1. `UploadQuotaService` - Used by Upload screen
2. `StorageQuotaService` - Used by both Upload and Discover screens

---

## ✅ Fix Applied

### **1. UploadQuotaService.ts** (Lines 4, 120-142)

Added import:
```typescript
import { config } from '../config/environment';
```

Added bypass logic before API calls:
```typescript
// Development bypass: Use hardcoded tier
if (config.bypassRevenueCat && config.developmentTier) {
  console.log('🔧 DEVELOPMENT MODE: Using hardcoded tier for upload quota');
  console.log(`🔧 Hardcoded tier: ${config.developmentTier.toUpperCase()}`);

  const tier = config.developmentTier;
  const tierForStorage: StorageTier = tier === 'unlimited' ? 'unlimited' : tier === 'premium' ? 'premium' : 'free';
  const storageQuota = await getStorageQuotaCached(userId, tierForStorage, forceRefresh);

  const quota: UploadQuota = {
    tier,
    upload_limit: tier === 'free' ? 3 : null,
    uploads_this_month: 0,
    remaining: tier === 'free' ? 3 : null,
    reset_date: null,
    is_unlimited: tier === 'unlimited',
    can_upload: storageQuota.can_upload,
    storage: storageQuota,
  };

  setCachedQuota(userId, quota);
  return quota;
}
```

### **2. StorageQuotaService.ts** (Lines 3, 150-155)

Added import:
```typescript
import { config } from '../config/environment';
```

Added bypass logic in `getStorageQuota()`:
```typescript
// Development bypass: Override tier if bypassRevenueCat is enabled
let effectiveTier = tier;
if (config.bypassRevenueCat && config.developmentTier) {
  effectiveTier = config.developmentTier as StorageTier;
  console.log(`🔧 STORAGE: Overriding tier ${tier} → ${effectiveTier} (development mode)`);
}

const storageLimit = getStorageLimit(effectiveTier);
// ... rest of calculation uses effectiveTier
```

---

## 🎯 Expected Behavior After Fix

### **Upload Screen:**
- ✅ "Premium Tier" (correct tier label)
- ✅ "2GB storage · ~200 tracks" (correct storage limit)
- ✅ "Unlimited uploads*" (correct upload limit)
- ✅ "27.86 MB / 2GB (1% used)" (correct progress bar - green, not red)
- ✅ No upgrade prompt (already on Premium)

### **Discover Screen:**
- ✅ "Upload Your Music" card shows correct tier status
- ✅ No upgrade prompt if on Premium/Unlimited

### **Console Logs:**
When the app loads, you should see:
```
🔧 DEVELOPMENT MODE: Using hardcoded tier for upload quota
🔧 Hardcoded tier: PREMIUM
🔧 STORAGE: Overriding tier free → premium (development mode)
```

---

## 📂 Files Modified

1. ✅ **[src/services/UploadQuotaService.ts](src/services/UploadQuotaService.ts)**
   - Line 4: Added `import { config } from '../config/environment';`
   - Lines 120-142: Added development bypass logic

2. ✅ **[src/services/StorageQuotaService.ts](src/services/StorageQuotaService.ts)**
   - Line 3: Added `import { config } from '../config/environment';`
   - Lines 150-155: Added tier override logic in `getStorageQuota()`

---

## 🧪 Testing Instructions

### **Step 1: Clear App Cache**
1. Force-quit the app (swipe up to close)
2. Relaunch the app

### **Step 2: Check Upload Screen**
Navigate to Upload screen and verify:
- [ ] Card shows "Premium Tier"
- [ ] Storage shows "2GB storage · ~200 tracks"
- [ ] Progress bar shows "27.86 MB / 2GB (1% used)" in green
- [ ] No "Upgrade to Premium" button visible

### **Step 3: Check Discover Screen**
Navigate to Discover screen and verify:
- [ ] "Upload Your Music" card doesn't show upgrade prompt
- [ ] Shows correct tier status

### **Step 4: Check Console Logs**
Open Metro bundler console and look for:
```
🔧 DEVELOPMENT MODE: Using hardcoded tier for upload quota
🔧 Hardcoded tier: PREMIUM
🔧 STORAGE: Overriding tier free → premium (development mode)
```

---

## 🔧 Development Configuration

Your current settings in [src/config/environment.ts](src/config/environment.ts):

```typescript
development: {
  // ... other config
  bypassRevenueCat: true,
  developmentTier: 'premium', // 'free' | 'premium' | 'unlimited'
}
```

### **To Test Different Tiers:**

**Free Tier:**
```typescript
developmentTier: 'free',
```
Expected: 30MB storage, 3 uploads total

**Premium Tier:**
```typescript
developmentTier: 'premium',
```
Expected: 2GB storage, unlimited uploads

**Unlimited Tier:**
```typescript
developmentTier: 'unlimited',
```
Expected: 10GB storage, unlimited uploads

---

## 🚀 Production Configuration

**IMPORTANT:** For production builds, set:

```typescript
production: {
  // ... other config
  bypassRevenueCat: false,
  // developmentTier is not used in production
}
```

This ensures real users get their tier from actual RevenueCat subscriptions, not hardcoded values.

---

## 📊 How the Bypass Works

### **Flow Without Bypass (Production):**
```
User opens Upload screen
  → UploadQuotaService.getUploadQuota()
  → Calls backend API + RevenueCat in parallel
  → Returns tier from RevenueCat entitlements
  → getStorageQuotaCached(userId, tier)
  → Returns storage quota based on RevenueCat tier
```

### **Flow With Bypass (Development):**
```
User opens Upload screen
  → UploadQuotaService.getUploadQuota()
  → Checks config.bypassRevenueCat === true
  → Uses config.developmentTier ('premium')
  → getStorageQuotaCached(userId, 'premium')
  → StorageQuotaService.getStorageQuota()
  → Checks config.bypassRevenueCat === true
  → Overrides tier to config.developmentTier
  → Returns 2GB storage quota
```

---

## ✅ Status

**Fix Applied:** ✅ Complete
**Files Modified:** 2
**Ready for Testing:** ✅ Yes

**Next Steps:**
1. Restart the app
2. Test Upload screen shows Premium tier with 2GB storage
3. Test Discover screen doesn't show upgrade prompt
4. Verify console logs show bypass messages

---

**Last Updated:** December 29, 2025
**Implementation by:** Claude Code
**Status:** ✅ Ready for Testing
