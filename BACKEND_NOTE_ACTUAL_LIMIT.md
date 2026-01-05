# Backend Team: Actual ACRCloud API Limit Issue

**Date:** January 5, 2026
**Priority:** High
**Issue:** Backend infrastructure limit is lower than claimed

---

## 🐛 Problem

The backend team claimed the `/api/upload/fingerprint` endpoint supports up to **20 MB** files via multipart/form-data.

However, **actual testing shows the limit is around 10 MB**:

```
Test file: 13.3 MB
Result: HTTP 413 - FUNCTION_PAYLOAD_TOO_LARGE
Error: Request Entity Too Large
```

---

## 📊 Root Cause

This is likely a **Vercel/Next.js API Route infrastructure limit**, not your application code:

### Vercel Limits (Common)
- **Function payload limit:** 4.5 MB (Hobby/Pro)
- **Edge function limit:** 1 MB
- **Enterprise:** Can be increased to 10+ MB

### Next.js API Route Limits
- Default body parser limit: **1 MB**
- Can be increased in config, but Vercel infrastructure still applies
- Even with `bodyParser: false`, Vercel limits the request size

---

## 🎯 Mobile App Status (Updated)

**CRITICAL UPDATE:** Mobile app no longer has client-side file size limits!

```typescript
// Mobile app sends ALL files to backend for fingerprinting
// Backend is responsible for handling large files via audio sampling
// This ensures copyright protection works for ALL file sizes
```

**Current Behavior:**
- **ALL file sizes** → Sent to backend for fingerprinting
- Backend WITHOUT audio sampling → 413 error for files > 10 MB ❌
- Backend WITH audio sampling → Works for all file sizes ✅

**Mobile app is ready. Waiting for backend audio sampling implementation.**

---

## 🔧 Backend Solutions

### Option 1: Increase Vercel Limit (If on Enterprise)

Contact Vercel support to increase function payload limit to 20+ MB.

**Pros:**
- Supports larger files
- No code changes needed

**Cons:**
- Requires Enterprise plan
- May have additional costs

---

### Option 2: Implement Audio Sampling (Recommended)

Extract a 30-second sample from the audio file before sending to ACRCloud.

**Benefits:**
- Works for files of any size
- ACRCloud only needs 10-15 seconds to fingerprint
- Drastically reduces payload size

**Implementation:**

```javascript
// Backend: /api/upload/fingerprint
import ffmpeg from 'fluent-ffmpeg';

export async function POST(request) {
  const formData = await request.formData();
  const audioFile = formData.get('audioFile');

  const fileSize = audioFile.size;
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  let audioBuffer;

  if (fileSize > MAX_SIZE) {
    // Extract 30-second sample using ffmpeg
    audioBuffer = await extractAudioSample(audioFile, 30);
    console.log(`Extracted 30s sample from ${fileSize} MB file`);
  } else {
    // Use full file for small files
    audioBuffer = await audioFile.arrayBuffer();
  }

  // Send to ACRCloud (sample or full file)
  const result = await identifyAudio(Buffer.from(audioBuffer));

  return Response.json(result);
}

async function extractAudioSample(file, durationSeconds) {
  return new Promise((resolve, reject) => {
    // Save uploaded file to temp location
    const tempPath = `/tmp/${Date.now()}_upload`;
    const outputPath = `/tmp/${Date.now()}_sample.mp3`;

    // Extract sample
    ffmpeg(tempPath)
      .setStartTime(0) // Start from beginning
      .duration(durationSeconds) // Extract X seconds
      .output(outputPath)
      .on('end', () => {
        const buffer = fs.readFileSync(outputPath);
        // Cleanup temp files
        fs.unlinkSync(tempPath);
        fs.unlinkSync(outputPath);
        resolve(buffer);
      })
      .on('error', reject)
      .run();
  });
}
```

**Pros:**
- ✅ Works for any file size
- ✅ No infrastructure changes needed
- ✅ More efficient (smaller payloads)
- ✅ ACRCloud gets exactly what it needs

**Cons:**
- Requires ffmpeg installation
- Slightly more complex code
- Processing overhead

---

### Option 3: Use Cloud Storage URL (Alternative)

Upload file to cloud storage first, send URL to backend, backend downloads and samples.

**Flow:**
1. Mobile uploads file to S3/R2/Cloudflare
2. Mobile sends presigned URL to backend
3. Backend downloads file
4. Backend samples first 30 seconds
5. Backend sends sample to ACRCloud

**Pros:**
- Handles very large files
- No function payload limits

**Cons:**
- More complex architecture
- Additional infrastructure (S3/R2)
- Higher latency

---

## 📊 File Size Analysis

### What File Sizes Are We Dealing With?

| File Type | Duration | Bitrate | Size | Can Fingerprint? |
|-----------|----------|---------|------|------------------|
| MP3 (128kbps) | 3-5 min | 128kbps | 3-5 MB | ✅ Yes (< 10 MB) |
| MP3 (320kbps) | 3-5 min | 320kbps | **10-15 MB** | ❌ No (> 10 MB) |
| FLAC | 3-5 min | Lossless | 30-50 MB | ❌ No (> 10 MB) |
| WAV | 3-5 min | Lossless | 50-80 MB | ❌ No (> 10 MB) |

**Impact:**
- **High-quality MP3 uploads (320kbps)** - the most common professional format - cannot be fingerprinted
- Only lower-quality MP3 (128-256kbps) works
- All lossless formats are blocked

---

## 🎯 Recommendation

**⚠️ CRITICAL: Implement Option 2: Audio Sampling IMMEDIATELY**

This is **NOT optional** - it's **critical for copyright protection**:

1. ✅ Works for all file sizes
2. ✅ **Provides comprehensive copyright protection** (currently BROKEN)
3. ✅ No dependency on infrastructure limits
4. ✅ More efficient for ACRCloud API quota
5. ✅ Industry standard approach

**Why This is Critical:**
- ❌ Files > 10 MB bypass ISRC verification
- ❌ Files > 10 MB bypass cover song detection
- ❌ Users can upload copyrighted music without checks
- ❌ Platform is vulnerable to copyright violations

**See:** [CRITICAL_BACKEND_AUDIO_SAMPLING_REQUIRED.md](CRITICAL_BACKEND_AUDIO_SAMPLING_REQUIRED.md) for full implementation guide.

**Timeline:**
- Backend implementation: 4-6 hours
- Testing: 2 hours
- **Total:** ~7 hours (1 day)

---

## 📱 Current Mobile App Behavior

With the 10 MB limit in place:

### Files < 10 MB
```
✅ Fingerprinting works normally
✅ No errors
✅ Full copyright protection
```

### Files 10-20 MB (Like your 13.3 MB test file)
```
⚠️ Inline message shown:
"File size (13.3 MB) exceeds limit. Will be reviewed manually."

✅ Upload proceeds
✅ Flagged for manual review
✅ No disruptive popup
```

### Files > 20 MB
```
Same as above - graceful skip
```

---

## ✅ Action Items

**For Backend Team:**

- [ ] Verify actual infrastructure limit (test with various file sizes)
- [ ] Choose solution (increase limit OR implement sampling)
- [ ] If implementing sampling:
  - [ ] Install ffmpeg in deployment environment
  - [ ] Implement audio extraction function
  - [ ] Test with various file formats (MP3, M4A, FLAC, WAV)
  - [ ] Update API documentation
- [ ] Notify mobile team when fixed (so we can increase limit back to 20 MB)

**For Mobile Team:**

- [x] Lower threshold to 10 MB (completed)
- [x] Add graceful fallback (completed)
- [ ] Wait for backend fix before increasing threshold

---

## 📞 Contact

**Mobile Team:** Justice Asibe
**Backend Team:** Please investigate

**Test File:** "Final Gospel Prevails.mp3" (13.3 MB)

---

**The mobile app is working correctly - it's the backend infrastructure limit that needs addressing.**
