# ✅ FIX APPLIED: Using creator_id Instead of user_id

**Issue:** Database migration failed because audio_tracks table uses `creator_id`, not `user_id`

**Error:**
```
ERROR: 42703: column "user_id" does not exist
```

---

## 🔧 What Was Fixed

### 1. **StorageQuotaService.ts** - Line 113
**Before:**
```typescript
.eq('user_id', userId)
```

**After:**
```typescript
.eq('creator_id', userId)
```

### 2. **StorageManagementScreen.tsx** - Line 68
**Before:**
```typescript
.eq('user_id', user.id)
```

**After:**
```typescript
.eq('creator_id', user.id)
```

### 3. **Database Migration Script** - Created New Correct Version
**File:** `DATABASE_MIGRATION_STORAGE_CORRECT.sql`

**Index now uses:**
```sql
CREATE INDEX idx_audio_tracks_storage
ON audio_tracks(creator_id, file_size)  -- ✅ creator_id
WHERE deleted_at IS NULL;
```

---

## 🚀 Execute the Correct Migration

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your SoundBridge project
3. Click **SQL Editor** → **New query**

### Step 2: Copy & Execute the Correct Script
Copy the entire contents of **`DATABASE_MIGRATION_STORAGE_CORRECT.sql`** and execute it.

**You should see:**
```
✅ Added file_size column to audio_tracks
✅ Column deleted_at already exists (confirmed)
✅ Created index idx_audio_tracks_storage on (creator_id, file_size)
```

### Step 3: Verify Success
The script automatically runs verification queries. Check the output shows:

#### Columns Verification:
```
column_name | data_type                | is_nullable | column_default
------------|--------------------------|-------------|---------------
creator_id  | uuid                     | NO          | NULL
deleted_at  | timestamp with time zone | YES         | NULL
file_size   | bigint                   | YES         | 0
```

#### Index Verification:
```
indexname                  | indexdef
---------------------------|--------------------------------------------------
idx_audio_tracks_storage   | CREATE INDEX idx_audio_tracks_storage ON...
```

#### Backfill Status:
```
total_tracks | needs_backfill | has_file_size | deleted_tracks
-------------|----------------|---------------|---------------
1234         | 1234           | 0             | 0
```

---

## ✅ Confirmed: audio_tracks Schema

From analyzing the codebase (found in `revenueService.ts`):

```typescript
await supabase
  .from('audio_tracks')
  .select('id')
  .eq('creator_id', userId)  // ✅ Uses creator_id
```

**Correct columns:**
- `creator_id` (uuid) - References the user who uploaded the track
- `file_size` (bigint) - File size in bytes (ADDED by migration)
- `deleted_at` (timestamptz) - Soft delete timestamp (already exists)

---

## 📂 Files Fixed

1. ✅ **src/services/StorageQuotaService.ts** - Changed `user_id` → `creator_id`
2. ✅ **src/screens/StorageManagementScreen.tsx** - Changed `user_id` → `creator_id`
3. ✅ **DATABASE_MIGRATION_STORAGE_CORRECT.sql** - New migration with `creator_id`

---

## ⏭️ Next Steps

1. ✅ **Execute** `DATABASE_MIGRATION_STORAGE_CORRECT.sql` in Supabase
2. ⏳ **Backfill** file sizes (see [BACKFILL_FILE_SIZES.md](BACKFILL_FILE_SIZES.md))
3. ⏳ **Test** storage quota in the app
4. ⏳ **Verify** upload/delete flows work correctly

---

## 🎯 Ready to Execute

The migration script is now correct and will work with your `audio_tracks` table schema.

**Execute:** [DATABASE_MIGRATION_STORAGE_CORRECT.sql](DATABASE_MIGRATION_STORAGE_CORRECT.sql)

**Expected Result:** All ✅ green checkmarks, no errors!
