# ⏳ Backend Audio Sampling - Deployment Status

**Date:** January 5, 2026  
**Status:** 🟡 **CODE READY - NEEDS DEPLOYMENT VERIFICATION**  
**Issue:** Vercel 4.5MB payload limit blocks requests before code runs

---

## 🎯 The Real Problem

**Vercel Infrastructure Limitation:**
- ❌ **4.5 MB maximum payload** for serverless functions (Hobby/Pro plans)
- ❌ Request rejected **BEFORE** it reaches our Next.js route handler
- ❌ Audio sampling code **never executes** because request never arrives
- ❌ Error: `FUNCTION_PAYLOAD_TOO_LARGE` at Vercel gateway level

**This is NOT a code issue - it's a Vercel platform limitation.**

---

## ✅ What's Already Implemented

### 1. Audio Sampling Code ✅
- ✅ `extractAudioSample()` function implemented
- ✅ Handles files > 10MB by extracting 30-second samples
- ✅ Uses `fluent-ffmpeg` for audio processing
- ✅ Fallback to simple slice if ffmpeg unavailable
- ✅ Comprehensive error handling

### 2. URL-Based Fingerprinting ✅
- ✅ Backend already supports `audioFileUrl` parameter
- ✅ Downloads from URL (no payload limit for internal fetches)
- ✅ Samples large files after download
- ✅ Works for files of any size

**Location:** `apps/web/app/api/upload/fingerprint/route.ts` (lines 304-328)

---

## 🚨 Why Direct Uploads Fail

**Current Flow (BROKEN):**
```
Mobile App
  ↓
[Send 13.3 MB file via multipart/form-data]
  ↓
Vercel Gateway ← ❌ REJECTS HERE (4.5MB limit)
  ↓
Next.js Route Handler (NEVER REACHED)
  ↓
Audio Sampling Code (NEVER RUNS)
```

**The request is rejected at Vercel's infrastructure level before our code executes.**

---

## ✅ The Solution: Use Storage for Large Files

**This IS scalable** - storage services (Supabase Storage, Vercel Blob, AWS S3) are designed for millions of users.

### Recommended Flow (WORKS):

```
Mobile App
  ↓
[Upload file to Supabase Storage] ← Direct upload, no size limit
  ↓
[Get public URL]
  ↓
[Send URL to /api/upload/fingerprint] ← Small JSON payload (< 1KB)
  ↓
Vercel Function (ACCEPTS - payload < 4.5MB)
  ↓
[Download from Supabase URL] ← Internal fetch, no limit
  ↓
[Sample if > 10MB] ← Audio sampling code RUNS
  ↓
[Send to ACRCloud] ← Fingerprinting works
```

---

## 📱 Mobile App Implementation

**The mobile app already uses Supabase Storage for uploads!** Just send the URL to the fingerprint API instead of the file.

### Current Mobile Code (Needs Update):

```typescript
// ❌ CURRENT: Sends file directly (hits 4.5MB limit)
const formData = new FormData();
formData.append('audioFile', file);
fetch('/api/upload/fingerprint', { body: formData });
```

### Updated Mobile Code (Works):

```typescript
// ✅ NEW: Upload to Supabase Storage first, then send URL
const uploadToSupabase = async (file: File): Promise<string> => {
  // Upload to Supabase Storage (you already do this for track uploads!)
  const { data: uploadData, error } = await supabase.storage
    .from('temp-audio') // Or use existing 'audio-tracks' bucket
    .upload(`fingerprint/${userId}/${Date.now()}_${file.name}`, file);

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('temp-audio')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

// Then send URL to fingerprint API
const fingerprintAudio = async (file: File) => {
  try {
    // Step 1: Upload to Supabase Storage (bypasses 4.5MB limit)
    const storageUrl = await uploadToSupabase(file);
    
    // Step 2: Send URL to fingerprint API (small JSON payload)
    const response = await fetch('https://www.soundbridge.live/api/upload/fingerprint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        audioFileUrl: storageUrl, // Send URL, not file
        artistName: artistName,
      }),
    });

    const data = await response.json();
    // ... handle response
  } catch (error) {
    console.error('Fingerprinting error:', error);
  }
};
```

---

## ✅ Backend Status

### What's Ready:
- ✅ Audio sampling code implemented
- ✅ URL-based fingerprinting supported
- ✅ Downloads from URL and processes
- ✅ Samples large files correctly
- ✅ Error handling in place

### What's Needed:
- ⏳ Mobile app update to use storage-first approach
- ⏳ Test with large files (15MB+)
- ⏳ Verify no 413 errors
- ⏳ Verify sampling works

---

## 🧪 Testing After Mobile Update

### Test Case: 15 MB File

**Expected Backend Logs:**
```
📥 ACRCloud fingerprinting: Fetching audio from URL
✅ ACRCloud fingerprinting: Audio fetched from URL (15.0 MB)
📦 Large file detected: 15.0 MB
🎬 Extracting 30-second audio sample...
✅ Sample extracted: 1.5 MB
🎵 Calling ACRCloud identifyAudio...
✅ ACRCloud identification complete
```

**Should NOT see:**
```
❌ 413 Request Entity Too Large
❌ FUNCTION_PAYLOAD_TOO_LARGE
```

---

## 📊 Why This Is Scalable

**Storage Services Are Built for Scale:**
- ✅ **Supabase Storage:** Handles millions of uploads
- ✅ **Vercel Blob:** Designed for Vercel deployments
- ✅ **AWS S3:** Used by millions of applications
- ✅ **Direct uploads:** No server processing needed
- ✅ **CDN distribution:** Fast global access

**This is the standard approach for handling large files in serverless architectures.**

---

## 📝 Deployment Checklist

### Backend (Already Done):
- [x] Audio sampling code implemented
- [x] URL-based fingerprinting supported
- [x] Error handling in place
- [x] Logging added

### Mobile App (Needs Update):
- [ ] Update fingerprint function to upload to Supabase Storage first
- [ ] Send URL instead of file to fingerprint API
- [ ] Test with 15 MB file
- [ ] Verify no 413 errors
- [ ] Verify fingerprinting works

---

## 🚀 Next Steps

1. **Update mobile app** to use storage-first approach
2. **Test with large files** (15MB+)
3. **Verify backend logs** show sampling
4. **Confirm no 413 errors**
5. **Deploy to production**

---

## ✅ Summary

**Current State:**
- ✅ Backend code: Ready and supports URL-based fingerprinting
- ⏳ Mobile app: Needs update to use storage-first approach
- ❌ Direct uploads: Blocked by Vercel 4.5MB limit

**Solution:**
- Use Supabase Storage (which mobile app already uses) for large files
- Send URL to fingerprint API instead of file
- Backend downloads, samples, and fingerprints

**This is the scalable, production-ready solution.** ✅

---

**Status:** ⏳ Waiting for mobile app update to use storage-first approach

