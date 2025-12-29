# 🎯 Run Accurate File Size Backfill

**Purpose:** Replace the default 10MB file sizes with actual file sizes from your storage provider.

**Time:** 5-10 minutes (depending on number of files)

---

## 📋 Prerequisites

1. ✅ Node.js installed on your computer
2. ✅ Access to your Supabase project settings
3. ✅ Terminal/command line access

---

## 🚀 Step-by-Step Instructions

### Step 1: Install Required Package

Open terminal in the project directory and run:

```bash
npm install @supabase/supabase-js
```

---

### Step 2: Get Your Supabase Credentials

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your SoundBridge project
3. Click **Settings** (gear icon in sidebar)
4. Click **API** section
5. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role** key (under "Project API keys" - this is the SECRET key, not anon key)

⚠️ **Important:** The `service_role` key is sensitive! Don't commit it to git.

---

### Step 3: Update the Script Configuration

Open `backfill-accurate-file-sizes.js` in your code editor.

Find these lines at the top:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY';
const STORAGE_BUCKET = 'audio-files';
```

Replace with your actual values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your service_role key
const STORAGE_BUCKET = 'audio-files'; // Verify this is your bucket name
```

**To verify your bucket name:**
- Go to Supabase Dashboard → Storage
- Look for the bucket containing your audio files
- Common names: `audio-files`, `tracks`, `uploads`, etc.

---

### Step 4: Run the Script

In your terminal, run:

```bash
node backfill-accurate-file-sizes.js
```

---

## 📊 What to Expect

The script will:

1. **Fetch tracks** that need backfilling (file_size = 0 or NULL)
2. **Process in batches** of 10 files at a time
3. **Try 3 methods** to get file size (in order):
   - Method 1: Supabase Storage metadata
   - Method 2: HTTP HEAD request to file URL
   - Method 3: Fallback to 10MB default (if both fail)
4. **Update database** with actual file sizes
5. **Show progress** for each file
6. **Display summary** at the end

**Example Output:**

```
🚀 Starting accurate file size backfill...

📊 Fetching tracks from database...
📦 Found 8 tracks needing file size backfill

📦 Processing batch 1 (8 tracks)...
  🔍 Processing: "My sunshine" (my-sunshine.mp3)
    ✅ Found in storage: 4.2 MB
  🔍 Processing: "What a wonderful world" (wonderful-world.mp3)
    ✅ Found in storage: 5.8 MB
  🔍 Processing: "I believe" (i-believe.mp3)
    ✅ Found via HTTP: 3.9 MB
  ...

==========================================================
📊 BACKFILL SUMMARY
==========================================================
✅ Successfully updated: 8 tracks
❌ Errors: 0 tracks
📦 Total processed: 8 tracks

🔍 Running verification query...

📈 VERIFICATION RESULTS:
  Total tracks: 8
  Tracks with file_size: 8
  Total storage: 37.5 MB
  Average per track: 4.69 MB

✅ Backfill complete!
```

---

## ✅ Verification

After the script completes, verify in Supabase SQL Editor:

```sql
SELECT
    title,
    ROUND(file_size / 1024.0 / 1024.0, 2) as size_mb,
    created_at
FROM audio_tracks
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

You should now see **different file sizes** instead of all 10MB!

---

## 🐛 Troubleshooting

### Error: "Cannot find module @supabase/supabase-js"
**Solution:** Run `npm install @supabase/supabase-js` first

### Error: "Please update SUPABASE_URL"
**Solution:** You forgot to update the configuration in the script (Step 3)

### Error: "Invalid API key"
**Solution:**
- Make sure you're using the `service_role` key, not the `anon` key
- The service_role key is longer and starts with `eyJ...`
- Copy it from Supabase Dashboard → Settings → API

### Files showing "Using default: 10 MB"
**Possible causes:**
- Storage bucket name is wrong (update `STORAGE_BUCKET` variable)
- Files not in Supabase Storage (stored elsewhere?)
- File URLs don't match storage paths

**To debug:**
1. Check your storage bucket name in Supabase Dashboard
2. Verify files exist in that bucket
3. Check if file URLs in database match storage paths

---

## 🔒 Security Notes

- ✅ Never commit `service_role` key to git
- ✅ Add this script to `.gitignore` if you paste credentials in it
- ✅ Use environment variables in production:
  ```javascript
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  ```

---

## 🎯 After Running

Once the script completes successfully:

1. ✅ Check your mobile app - StorageManagementScreen should show accurate sizes
2. ✅ Storage calculations will now be precise
3. ✅ Users will see real storage usage
4. ✅ Upload limits will be enforced accurately

**Reload your app** and check the StorageManagementScreen - you should see different file sizes now! 🎉

---

## 📞 Need Help?

If you encounter issues:

1. Check the error message in terminal
2. Verify your Supabase credentials
3. Confirm your storage bucket name
4. Make sure files exist in storage
5. Check file URLs in database match storage paths

**Common issue:** If all files still show 10MB after running the script, your storage bucket name or file paths might be incorrect. Double-check the `STORAGE_BUCKET` variable and verify files exist in that bucket.
