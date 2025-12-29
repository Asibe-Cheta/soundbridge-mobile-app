# 🐛 Debug: Tier Mismatch Issue

**Problem:** Upload screen shows "Premium Tier" with "30MB storage" instead of "2GB storage"

**Screenshot analysis:**
- Card header: "Premium Tier" ✅
- Storage display: "30MB storage · ~3 tracks" ❌ (should be 2GB)
- Upload text: "Unlimited uploads*" ✅
- Storage used: 27.86 MB / 30MB (93% used) ❌
- Upgrade prompt: "Upgrade to Premium for 2GB storage (66× more!)" ❌ (already Premium!)

---

## 🔍 Root Cause Analysis

The issue is that:
1. ✅ Tier detection shows "Premium"
2. ❌ Storage quota shows Free tier limits (30MB)

This suggests **TWO POSSIBLE CAUSES:**

### **Option A: Development Bypass Issue**
The `bypassRevenueCat` setting is correctly setting `tier: 'premium'`, but when calling `getStorageQuotaCached()`, it's still calculating storage based on actual database data (which might be free tier).

### **Option B: User Profile Database Issue**
The user's `subscription_tier` in the database is set to `free`, and the storage calculation is reading from there instead of using the development bypass tier.

---

## ✅ Fix Applied

Added development bypass check to `UploadQuotaService.ts`:

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

This ensures that when `bypassRevenueCat: true` and `developmentTier: 'premium'` are set:
- The tier is set to `'premium'`
- Storage quota is calculated for Premium tier (2GB)

---

## 🧪 Testing Instructions

### **Step 1: Clear the app cache**
Force-quit and restart the app to clear the in-memory quota cache.

### **Step 2: Check the console logs**
When you open the Upload screen, you should see:
```
🔧 DEVELOPMENT MODE: Using hardcoded tier for upload quota
🔧 Hardcoded tier: PREMIUM
🔍 Fetching fresh storage quota...
```

### **Step 3: Verify the display**
The Upload screen should now show:
- ✅ "Premium Tier"
- ✅ "2GB storage · ~200 tracks"
- ✅ "Unlimited uploads*"
- ✅ Storage used: "27.86 MB / 2GB (1% used)"
- ✅ No upgrade prompt (already on Premium)

---

## 📊 Expected Behavior After Fix

| Element | Before (Bug) | After (Fixed) |
|---------|--------------|---------------|
| Tier Label | "Premium Tier" ✅ | "Premium Tier" ✅ |
| Storage Limit | "30MB storage" ❌ | "2GB storage" ✅ |
| Tracks Count | "~3 tracks" ❌ | "~200 tracks" ✅ |
| Progress Bar | 93% (red) ❌ | 1% (green) ✅ |
| Upgrade Prompt | Shows ❌ | Hidden ✅ |
| Storage Display | "27.86 MB / 30MB" ❌ | "27.86 MB / 2GB" ✅ |

---

## 🔍 Alternative: Update Database User Profile

If you want the Premium tier to work **without** the development bypass, you need to update your user profile in the database:

```sql
-- Option 1: Update your user's subscription_tier to premium
UPDATE user_profiles
SET subscription_tier = 'premium'
WHERE id = 'your-user-id-here';

-- Option 2: Give yourself Premium via RevenueCat test purchase
-- Use RevenueCat's Sandbox environment to test a real purchase flow
```

---

## 🚀 Recommended Solution

**For Development/Testing:**
Keep the bypass enabled and use the fix applied above:
```typescript
// src/config/environment.ts
bypassRevenueCat: true,
developmentTier: 'premium',
```

**For Production:**
```typescript
// src/config/environment.ts
bypassRevenueCat: false,
// developmentTier not used in production
```

Users will get their tier from actual RevenueCat subscriptions.

---

## ✅ Status

**Fix Applied:** ✅ [UploadQuotaService.ts:120-142](src/services/UploadQuotaService.ts#L120-L142)

**Next Step:** Restart the app and check if the issue is resolved.

If the issue persists:
1. Clear app cache (force quit + relaunch)
2. Check console logs for "DEVELOPMENT MODE" messages
3. Verify `config.bypassRevenueCat` and `config.developmentTier` are set correctly
4. Check if storage cache is also being bypassed correctly
