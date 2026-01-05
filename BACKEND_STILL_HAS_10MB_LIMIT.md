# 🚨 Backend Still Has 10 MB File Size Check

**Date:** January 5, 2026
**Status:** ❌ **BLOCKING ISSUE**
**Issue:** Backend API rejects files > 10 MB even with storage-first approach

---

## 🎯 Problem Summary

The **mobile app storage-first implementation is working perfectly**, but the **backend still has a 10 MB file size check** that rejects large files.

---

## ✅ What's Working (Mobile App)

The storage-first approach on the mobile side works perfectly:

```
Mobile Console Logs:
📤 Uploading to Supabase Storage for fingerprinting...
✅ File uploaded to storage: https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/audio-tracks/temp/fingerprint_...mp3
📤 Sending URL to fingerprint API...
🔍 Response status: 200
🔍 Response ok: true
```

**Mobile app successfully:**
- ✅ Uploaded 13.3 MB file to Supabase Storage
- ✅ Got public URL
- ✅ Sent URL to backend API (no 413 error!)
- ✅ Small JSON payload bypassed Vercel 4.5 MB limit

---

## ❌ What's NOT Working (Backend)

The backend receives the URL successfully but then rejects the file:

```json
{
  "success": false,
  "matchFound": false,
  "error": "Audio file too large (max 10MB)",
  "errorCode": "INVALID_FILE",
  "requiresManualReview": true
}
```

**The backend is:**
1. ✅ Receiving the storage URL (no 413 error)
2. ✅ Downloading the file from Supabase Storage
3. ❌ Checking file size and rejecting if > 10 MB
4. ❌ **NOT using audio sampling** to extract 30-second sample

---

## 🔧 What Backend Needs to Fix

### Option 1: Remove the 10 MB Check (If Audio Sampling is Ready)

**If the audio sampling code is deployed**, simply remove this check:

**File:** `apps/web/app/api/upload/fingerprint/route.ts`

**Find and REMOVE this code:**
```typescript
// ❌ REMOVE THIS CHECK
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

if (fileSize > MAX_FILE_SIZE) {
  return NextResponse.json({
    success: false,
    matchFound: false,
    error: 'Audio file too large (max 10MB)',
    errorCode: 'INVALID_FILE',
    requiresManualReview: true,
  });
}
```

**Replace with:**
```typescript
// ✅ No file size limit - use audio sampling for large files
const MAX_ACRCLOUD_SIZE = 10 * 1024 * 1024; // 10 MB ACRCloud limit

let audioBuffer = fileBuffer; // Start with full file

// If file is larger than ACRCloud limit, extract 30-second sample
if (fileSize > MAX_ACRCLOUD_SIZE) {
  console.log(`📦 Large file detected: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log('🎬 Extracting 30-second audio sample...');

  audioBuffer = await extractAudioSample(fileBuffer);

  console.log(`✅ Sample extracted: ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB`);
}

// Send to ACRCloud (either full file or sample)
const result = await identifyAudio(audioBuffer, artistName);
```

---

### Option 2: Verify Audio Sampling is Deployed

**Check if the `extractAudioSample()` function exists in production:**

```bash
# Check production backend code
grep -n "extractAudioSample" apps/web/app/api/upload/fingerprint/route.ts
```

**If it doesn't exist, you need to:**
1. Implement the audio sampling function (see `CRITICAL_BACKEND_AUDIO_SAMPLING_REQUIRED.md`)
2. Deploy to production
3. Test with large files

---

## 📊 Current Flow (What's Happening)

```
Mobile App
  ↓
[Upload 13.3 MB file to Supabase Storage] ✅ SUCCESS
  ↓
[Get URL: https://...supabase.co/.../temp/fingerprint_...mp3] ✅ SUCCESS
  ↓
[Send URL to /api/upload/fingerprint] ✅ SUCCESS (no 413!)
  ↓
Backend API
  ↓
[Download file from URL] ✅ SUCCESS (13.3 MB downloaded)
  ↓
[Check file size] ❌ FAIL: File is 13.3 MB (> 10 MB limit)
  ↓
[Return error: "Audio file too large (max 10MB)"] ❌ USER SEES ERROR
```

---

## 📊 Expected Flow (What Should Happen)

```
Mobile App
  ↓
[Upload 13.3 MB file to Supabase Storage] ✅
  ↓
[Get URL] ✅
  ↓
[Send URL to /api/upload/fingerprint] ✅
  ↓
Backend API
  ↓
[Download file from URL] ✅
  ↓
[Check file size: 13.3 MB > 10 MB] ✅
  ↓
[Extract 30-second audio sample using ffmpeg] ✅ NEW STEP
  ↓
[Sample size: 1.5 MB] ✅
  ↓
[Send sample to ACRCloud] ✅
  ↓
[Return fingerprint result] ✅
```

---

## 🧪 How to Test Backend Fix

### Test 1: Verify No File Size Rejection

```bash
# Upload a 13 MB file
curl -X POST https://www.soundbridge.live/api/upload/fingerprint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "audioFileUrl": "https://aunxdbqukbxyyiusaeqi.supabase.co/storage/v1/object/public/audio-tracks/temp/fingerprint_test_13mb.mp3",
    "artistName": "Test Artist"
  }'
```

**Should NOT see:**
```json
{
  "error": "Audio file too large (max 10MB)"
}
```

**Should see:**
```json
{
  "success": true,
  "matchFound": true/false,
  // ... fingerprint data
}
```

### Test 2: Verify Audio Sampling Works

**Backend logs should show:**
```
📥 Fetching audio from URL
✅ Audio fetched: 13.3 MB
📦 Large file detected: 13.3 MB
🎬 Extracting 30-second audio sample...
✅ Sample extracted: 1.5 MB
🎵 Sending sample to ACRCloud...
✅ ACRCloud response received
```

---

## 📝 Backend Fix Checklist

- [ ] **Find the 10 MB file size check** in `/api/upload/fingerprint/route.ts`
- [ ] **Verify `extractAudioSample()` function exists** in the code
- [ ] **Remove or modify the rejection logic** to use sampling instead
- [ ] **Test locally** with a 15 MB file
- [ ] **Deploy to production**
- [ ] **Test in production** with mobile app
- [ ] **Verify no "Audio file too large" errors**
- [ ] **Verify audio sampling logs appear**
- [ ] **Notify mobile team when fixed**

---

## 🎯 What to Look For in Backend Code

**Find this pattern (likely around line 200-250):**

```typescript
// ❌ THIS IS THE PROBLEM
if (fileSize > MAX_FILE_SIZE) {
  return NextResponse.json({
    success: false,
    matchFound: false,
    error: 'Audio file too large (max 10MB)',
    errorCode: 'INVALID_FILE',
    requiresManualReview: true,
  });
}
```

**Change to:**

```typescript
// ✅ THIS IS THE FIX
let audioToFingerprint = fileBuffer;

if (fileSize > MAX_ACRCLOUD_SIZE) {
  // Extract 30-second sample for large files
  audioToFingerprint = await extractAudioSample(fileBuffer);
}

// Continue with fingerprinting using audioToFingerprint
```

---

## ✅ Summary

**Mobile app: ✅ READY**
- Storage-first approach working
- No 413 errors
- Successfully sending URLs to backend

**Backend: ❌ NEEDS FIX**
- Still has 10 MB file size check
- Rejecting files instead of sampling them
- Audio sampling code may not be deployed or not being used

**Fix required:**
1. Remove/modify the 10 MB rejection check
2. Use audio sampling for files > 10 MB
3. Deploy to production
4. Test with mobile app

---

**Status:** ⏳ Waiting for backend to remove 10 MB file size check and use audio sampling

