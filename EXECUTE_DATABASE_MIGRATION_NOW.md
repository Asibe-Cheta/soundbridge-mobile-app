# 🚀 Execute Database Migration - Step-by-Step Guide

**Time Required:** 5-10 minutes
**Impact:** Required for storage-based tier system to work
**Risk Level:** Low (migration has safety checks)

---

## ✅ Pre-Migration Checklist

Before you begin:
- [ ] You have access to Supabase Dashboard
- [ ] You can access SQL Editor in Supabase
- [ ] You have reviewed [DATABASE_MIGRATION_STORAGE.sql](DATABASE_MIGRATION_STORAGE.sql)
- [ ] **Recommended:** Backup your database (optional but good practice)

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Navigate to your Supabase Dashboard: https://app.supabase.com
2. Select your SoundBridge project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

---

### Step 2: Copy Migration Script

1. Open [`DATABASE_MIGRATION_STORAGE.sql`](DATABASE_MIGRATION_STORAGE.sql) in your code editor
2. Select all content (Cmd+A / Ctrl+A)
3. Copy (Cmd+C / Ctrl+C)

**Or use this command in terminal:**
```bash
cat DATABASE_MIGRATION_STORAGE.sql | pbcopy
```

---

### Step 3: Paste and Execute

1. Paste the migration script into the Supabase SQL Editor
2. Review the script (it has safety checks for existing columns)
3. Click **"Run"** button (or press Cmd+Enter / Ctrl+Enter)

---

### Step 4: Verify Success

You should see messages like:

```
NOTICE: Added file_size column to audio_tracks
NOTICE: Column deleted_at already exists (confirmed)
NOTICE: Created index idx_audio_tracks_storage
```

**If you see errors:**
- Read the error message carefully
- Check if column already exists (this is fine!)
- The script is designed to be safe to run multiple times

---

### Step 5: Run Verification Queries

The migration script includes verification queries at the end. You should see results showing:

#### **Columns Verification:**
```
column_name | data_type                | is_nullable | column_default
------------|--------------------------|-------------|---------------
file_size   | bigint                   | YES         | 0
deleted_at  | timestamp with time zone | YES         | NULL
```

#### **Index Verification:**
```
indexname                  | indexdef
---------------------------|--------------------------------------------------
idx_audio_tracks_storage   | CREATE INDEX idx_audio_tracks_storage ON...
```

#### **Tracks Needing Backfill:**
```
total_tracks | needs_backfill | has_file_size
-------------|----------------|---------------
1234         | 1234           | 0
```

This shows how many tracks need file_size backfilled (likely all of them initially).

---

## 🎯 What Just Happened?

The migration script:

1. ✅ Added `file_size` column to `audio_tracks` table (BIGINT, default 0)
2. ✅ Verified `deleted_at` column exists (should already exist from previous work)
3. ✅ Created performance index: `idx_audio_tracks_storage`
   - Speeds up storage calculations
   - Filters out deleted tracks automatically
4. ✅ Provided verification queries to confirm success

---

## ⏭️ Next Steps

### Immediate (Required):
Choose a backfill method from [`BACKFILL_FILE_SIZES.md`](BACKFILL_FILE_SIZES.md):

#### **Option 1: Supabase Storage Metadata** (Recommended)
If you're using Supabase Storage, this is the easiest method:

```sql
UPDATE audio_tracks at
SET file_size = (
    SELECT COALESCE((metadata->>'size')::BIGINT, 10485760)
    FROM storage.objects so
    WHERE so.name = at.file_url
    OR so.name LIKE '%' || at.file_url || '%'
)
WHERE (at.file_size IS NULL OR at.file_size = 0)
AND at.deleted_at IS NULL;
```

Run this in SQL Editor, then verify:
```sql
SELECT COUNT(*) FILTER (WHERE file_size > 0) as backfilled
FROM audio_tracks
WHERE deleted_at IS NULL;
```

#### **Option 2: Node.js Script** (Most Accurate)
See [`BACKFILL_FILE_SIZES.md`](BACKFILL_FILE_SIZES.md) Section "Option 2" for the script.

#### **Option 3: Default 10MB Estimate** (Quick Fallback)
```sql
UPDATE audio_tracks
SET file_size = 10485760  -- 10MB default
WHERE (file_size IS NULL OR file_size = 0)
AND deleted_at IS NULL;
```

⚠️ **Warning:** This is inaccurate but fast. Only use if Options 1-2 unavailable.

---

### After Backfill:
- [ ] Test storage quota in the app
- [ ] Upload a new file → verify `file_size` saved
- [ ] Delete a file → verify storage freed
- [ ] Check StorageIndicator displays correctly
- [ ] Verify upgrade prompts show at 80%+ usage

---

## 🐛 Troubleshooting

### Error: "column 'file_size' already exists"
**Solution:** This is fine! The script checks for existence. It means you've run it before or the column was already added. Continue to next step.

### Error: "index 'idx_audio_tracks_storage' already exists"
**Solution:** This is fine! The index was already created. Continue to next step.

### Error: "permission denied for table audio_tracks"
**Solution:** You need admin/owner permissions on the database. Contact your database administrator.

### Error: Database connection timeout
**Solution:**
1. Check your internet connection
2. Verify Supabase project is running
3. Try again in a few minutes

### Backfill takes too long
**Solution:**
- For large databases (>10,000 tracks), backfill in batches
- Use Option 2 (Node.js script) with rate limiting
- Run during off-peak hours

---

## ✅ Migration Complete!

Once you see success messages and verification queries return expected results, you're done!

**What you've enabled:**
- ✅ Storage-based tier system
- ✅ Real-time storage quota calculations
- ✅ Upload blocking when storage full
- ✅ File management to free up space
- ✅ Better user retention (no more 29-day lockout!)

---

## 📊 Monitor After Deployment

### Day 1:
- Check error logs for storage calculation errors
- Monitor upload success rates
- Watch for user feedback about storage

### Week 1:
- Track storage-based upgrade conversions
- Monitor support tickets (should decrease)
- Verify storage calculations accurate

### Month 1:
- Measure retention improvement
- Track free→premium conversions
- Measure premium→unlimited conversions
- Calculate ROI on development time

---

## 🎉 Congratulations!

The database is now ready for the storage-based tier system. Users can upload whenever they want (within storage limits), solving the retention problem!

**Next:** Test the app and celebrate! 🚀

---

## 📞 Need Help?

- **Quick Start:** [QUICK_START_STORAGE_MIGRATION.md](QUICK_START_STORAGE_MIGRATION.md)
- **Deployment:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Backfill Guide:** [BACKFILL_FILE_SIZES.md](BACKFILL_FILE_SIZES.md)
- **Technical Details:** [STORAGE_TIER_IMPLEMENTATION_COMPLETE.md](STORAGE_TIER_IMPLEMENTATION_COMPLETE.md)

**Ready to execute?** Open Supabase SQL Editor and paste `DATABASE_MIGRATION_STORAGE.sql`!
