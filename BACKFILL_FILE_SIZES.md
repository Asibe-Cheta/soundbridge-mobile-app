# Backfill File Sizes for Existing Uploads

**Purpose:** Populate `file_size` column for existing `audio_tracks` records
**Status:** Required before storage quota system works correctly
**Estimated Time:** Varies (depends on number of tracks and storage provider)

---

## ⚠️ Why This Is Critical

Without file sizes, storage calculations will show **0 bytes used** for all existing uploads!

```sql
-- Current state (probably):
SELECT COUNT(*) FROM audio_tracks WHERE file_size = 0 OR file_size IS NULL;
-- Result: Many tracks with missing file_size
```

---

## 🎯 Options for Backfilling

### **Option 1: Supabase Storage Metadata (Recommended)**

If your audio files are stored in Supabase Storage, you can query the metadata:

```sql
-- Update file_size from Supabase Storage metadata
UPDATE audio_tracks at
SET file_size = (
    SELECT COALESCE((metadata->>'size')::BIGINT, 0)
    FROM storage.objects so
    WHERE so.bucket_id = 'audio-files'  -- Your bucket name
    AND (
        so.name = at.file_url
        OR so.name LIKE '%' || at.file_url
        OR at.file_url LIKE '%' || so.name
    )
)
WHERE at.file_size IS NULL OR at.file_size = 0;

-- Verify
SELECT
    COUNT(*) as updated,
    SUM(file_size) / 1024.0 / 1024.0 / 1024.0 as total_gb
FROM audio_tracks
WHERE file_size > 0;
```

**Pros:** Fast, accurate, runs in database
**Cons:** Requires matching file URLs with storage objects

---

### **Option 2: Node.js Script (Most Accurate)**

If file URLs are external or don't match storage objects, use a script:

```javascript
// backfill-file-sizes.js
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key!
);

async function backfillFileSizes() {
  console.log('🔄 Starting file size backfill...');

  // Get all tracks with missing file_size
  const { data: tracks, error } = await supabase
    .from('audio_tracks')
    .select('id, file_url, title')
    .or('file_size.is.null,file_size.eq.0')
    .is('deleted_at', null)
    .limit(1000); // Process in batches

  if (error) {
    console.error('❌ Error fetching tracks:', error);
    return;
  }

  console.log(`📊 Found ${tracks.length} tracks to backfill`);

  let updated = 0;
  let failed = 0;

  for (const track of tracks) {
    try {
      // Option A: HEAD request to get Content-Length
      const response = await axios.head(track.file_url, {
        timeout: 5000,
      });

      const fileSize = parseInt(response.headers['content-length'], 10);

      if (fileSize > 0) {
        // Update database
        const { error: updateError } = await supabase
          .from('audio_tracks')
          .update({ file_size: fileSize })
          .eq('id', track.id);

        if (updateError) {
          console.error(`❌ Failed to update ${track.title}:`, updateError);
          failed++;
        } else {
          console.log(`✅ Updated ${track.title}: ${formatBytes(fileSize)}`);
          updated++;
        }
      } else {
        console.warn(`⚠️ Invalid size for ${track.title}`);
        failed++;
      }

      // Rate limiting (avoid overwhelming server)
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error fetching size for ${track.title}:`, error.message);
      failed++;
    }
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

backfillFileSizes();
```

**Usage:**
```bash
npm install @supabase/supabase-js axios
SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key node backfill-file-sizes.js
```

**Pros:** Accurate, fetches actual file sizes
**Cons:** Slow (makes HTTP requests), requires running script

---

### **Option 3: Estimated Default Size (Quick Fallback)**

If you need to launch quickly and refine later:

```sql
-- Set a reasonable default (e.g., 10MB per track)
UPDATE audio_tracks
SET file_size = 10485760  -- 10MB
WHERE (file_size IS NULL OR file_size = 0)
AND deleted_at IS NULL;

-- Verify
SELECT
    COUNT(*) as tracks,
    SUM(file_size) / 1024.0 / 1024.0 as total_mb
FROM audio_tracks
WHERE deleted_at IS NULL;
```

**Pros:** Instant, unblocks development
**Cons:** Inaccurate, will show wrong storage usage

**⚠️ Use this only for:**
- Development/testing environments
- Temporary unblocking (refine later with actual sizes)
- Very low priority if accurate storage isn't critical yet

---

## 🧪 Testing After Backfill

```sql
-- 1. Check how many tracks have file_size now
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE file_size > 0) as with_size,
    COUNT(*) FILTER (WHERE file_size = 0 OR file_size IS NULL) as without_size
FROM audio_tracks
WHERE deleted_at IS NULL;

-- 2. Check storage distribution by user
SELECT
    user_id,
    COUNT(*) as tracks,
    SUM(file_size) / 1024.0 / 1024.0 as total_mb
FROM audio_tracks
WHERE deleted_at IS NULL
GROUP BY user_id
ORDER BY total_mb DESC
LIMIT 10;

-- 3. Test storage quota calculation (manual)
-- Replace 'user-id-here' with actual user ID
SELECT
    COUNT(*) as track_count,
    SUM(file_size) as total_bytes,
    SUM(file_size) / 1024.0 / 1024.0 as total_mb,
    SUM(file_size) / 1024.0 / 1024.0 / 1024.0 as total_gb
FROM audio_tracks
WHERE user_id = 'user-id-here'
AND deleted_at IS NULL;
```

---

## 🎯 Recommended Approach

**For Production:**
1. Try **Option 1** (Supabase Storage metadata) first
2. If URLs don't match, use **Option 2** (Node.js script)
3. Run in batches to avoid timeouts
4. Verify results with test queries

**For Development/Testing:**
1. Use **Option 3** (default size) to unblock immediately
2. Refine with accurate sizes later
3. Mark this as technical debt to address

---

## 📊 Expected Results

After backfill, you should see:

```sql
-- Before backfill:
file_size = 0 for most/all tracks

-- After backfill:
file_size > 0 for all tracks

-- Storage quota now works:
Free users: 0-150MB used
Premium users: Varies up to 2GB
Unlimited users: Varies up to 10GB
```

---

## 🚨 Common Issues

### Issue: File URLs don't match storage objects
**Fix:** Update the SQL join condition to match your URL pattern

### Issue: External URLs (not Supabase Storage)
**Fix:** Must use Option 2 (script) to fetch sizes via HTTP

### Issue: Script times out
**Fix:** Process in smaller batches (e.g., 100 tracks at a time)

### Issue: Some file URLs are invalid/broken
**Fix:** Skip those tracks, or set default size for missing files

---

## ✅ Verification Checklist

After backfilling:

- [ ] Most tracks have `file_size > 0`
- [ ] Storage totals look reasonable (not all 10MB exactly)
- [ ] Mobile app shows correct storage usage
- [ ] Storage warnings trigger correctly
- [ ] Upload blocking works when at limit
- [ ] Delete functionality frees space

---

## 💡 Pro Tip

If you have a mix of old uploads (unknown sizes) and new uploads (known sizes), you can:

1. Set old uploads to estimated default (10MB)
2. Ensure new uploads save accurate `file_size`
3. Gradually replace old estimates as users re-upload

This gets you 80% accuracy immediately, improving over time!

---

**Choose your option and run it! The storage quota system needs this data to work correctly.** 🚀
