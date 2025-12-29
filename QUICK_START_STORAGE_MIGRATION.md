# Quick Start: Storage-Based Tier Migration

**For:** Developers implementing or testing the storage migration
**Time to read:** 5 minutes

---

## 🚀 What Changed (TL;DR)

**OLD:** Premium = 7 uploads/month → Users locked out after Day 1
**NEW:** Premium = 2GB storage (~200 tracks) → Upload whenever you want

---

## ⚡ Quick Implementation Guide

### 1. **Database Migration (MUST RUN FIRST)**

```sql
-- Add columns
ALTER TABLE audio_tracks ADD COLUMN file_size BIGINT DEFAULT 0;
ALTER TABLE audio_tracks ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index
CREATE INDEX idx_audio_tracks_storage
ON audio_tracks(user_id, file_size)
WHERE deleted_at IS NULL;

-- Backfill (requires storage provider integration)
-- Update file_size from actual file metadata
```

### 2. **Test Storage Calculations**

```typescript
import { calculateStorageUsage, getStorageQuota } from '../services/StorageQuotaService';

// Test it works
const usage = await calculateStorageUsage(userId);
console.log('Total storage:', formatBytes(usage));

const quota = await getStorageQuota(userId, 'premium');
console.log('Quota:', quota);
// Should return: { storage_limit: 2GB, storage_used: X, can_upload: true/false }
```

### 3. **Add StorageManagementScreen to Navigation**

```typescript
// In App.tsx or your main Stack.Navigator
<Stack.Screen
  name="StorageManagement"
  component={StorageManagementScreen}
  options={{ headerShown: false }}
/>
```

### 4. **Test Upload Flow**

- Upload a file
- Verify `file_size` is saved to database
- Check storage quota updates
- Try uploading when at limit
- Should be blocked with clear message

---

## 📊 New Tier Limits

| Tier | Storage | Uploads | Price |
|------|---------|---------|-------|
| Free | 150MB | 3 total | £0 |
| Premium | 2GB | Unlimited* | £6.99/mo |
| Unlimited | 10GB | Unlimited | £12.99/mo |

*Premium uploads unlimited but limited by 2GB storage capacity

---

## 🎨 How to Use Components

### StorageIndicator (Full)
```typescript
import StorageIndicator from '../components/StorageIndicator';

{quota?.storage && (
  <StorageIndicator storageQuota={quota.storage} />
)}
```

### StorageIndicator (Compact)
```typescript
{quota?.storage && (
  <StorageIndicator
    storageQuota={quota.storage}
    compact={true}
  />
)}
```

### StorageManagementScreen
```typescript
// Navigate from anywhere
navigation.navigate('StorageManagement');
```

---

## 🐛 Debugging Common Issues

### Issue: Storage always shows 0 bytes
**Fix:** Run database migration, backfill `file_size`

### Issue: Storage not updating after upload
**Fix:** Make sure upload handler saves `file_size`
```typescript
await supabase.from('audio_tracks').insert({
  // ... other fields
  file_size: actualFileSize, // REQUIRED!
});

// Then invalidate cache
invalidateStorageCache();
invalidateQuotaCache();
```

### Issue: Storage not freeing after delete
**Fix:** Use soft delete (set `deleted_at`, don't physically remove)
```typescript
await supabase
  .from('audio_tracks')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', trackId);

invalidateStorageCache(); // Important!
```

### Issue: Can't navigate to StorageManagement
**Fix:** Add route to navigation stack (see step 3 above)

---

## 🧪 Testing Checklist (5 minutes)

```
[ ] Database migration run successfully
[ ] Upload a test file → file_size saved
[ ] Check quota → shows correct storage used
[ ] Upload until at limit → blocked correctly
[ ] Delete a file → storage freed immediately
[ ] Navigate to StorageManagement → works
[ ] Upgrade prompt shows at 80% usage
[ ] Warning messages show correctly
[ ] Colors change (green → orange → red)
[ ] UploadLimitCard shows storage info
[ ] UpgradeScreen shows updated tiers
```

---

## 📞 Need Help?

**Documentation:**
- [STORAGE_MIGRATION_MOBILE_COMPLETE.md](STORAGE_MIGRATION_MOBILE_COMPLETE.md) - Full guide
- [STORAGE_BASED_TIER_MIGRATION.md](STORAGE_BASED_TIER_MIGRATION.md) - Original plan

**Key Files:**
- `src/services/StorageQuotaService.ts` - Core logic
- `src/components/StorageIndicator.tsx` - UI component
- `src/screens/StorageManagementScreen.tsx` - File management

**Quick Functions:**
```typescript
// Calculate storage
const bytes = await calculateStorageUsage(userId);

// Check if can upload
const result = await checkStorageQuota(userId, tier, fileSize);

// Format bytes
const readable = formatBytes(1536); // "1.5 KB"

// Get warnings
const level = getStorageWarningLevel(85); // "warning"
const message = getStorageWarningMessage(quota);
```

---

## ✅ Ready to Deploy?

Before deploying to production:

1. ✅ Database migration tested in staging
2. ✅ All tests passing
3. ✅ Storage calculations accurate
4. ✅ Upload/delete flows working
5. ✅ Support team briefed
6. ✅ User communication prepared
7. ✅ Rollback plan ready

**Good luck! 🚀**
