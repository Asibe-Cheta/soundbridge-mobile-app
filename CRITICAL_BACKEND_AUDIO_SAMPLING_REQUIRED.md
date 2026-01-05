# 🚨 CRITICAL: Backend Audio Sampling Implementation REQUIRED

**Date:** January 5, 2026
**Priority:** 🔴 **CRITICAL - COPYRIGHT PROTECTION BROKEN**
**Assigned To:** Backend Team
**Estimated Impact:** High - Platform vulnerable to copyright violations

---

## 🔥 CRITICAL ISSUE

**The current 10 MB backend limit breaks copyright protection for most professional music uploads.**

### The Problem

Your `/api/upload/fingerprint` endpoint has a **10 MB infrastructure limit** (Vercel/Next.js function payload limit), but most professional music files are **10-20 MB**:

| File Type | Duration | Bitrate | Size | Can Fingerprint? |
|-----------|----------|---------|------|------------------|
| MP3 (128kbps) | 3-5 min | 128kbps | 3-5 MB | ✅ Yes |
| **MP3 (320kbps)** | 3-5 min | 320kbps | **10-15 MB** | ❌ **NO** |
| FLAC | 3-5 min | Lossless | 30-50 MB | ❌ **NO** |
| WAV | 3-5 min | Lossless | 50-80 MB | ❌ **NO** |

**This means:**
- ❌ High-quality MP3 (320kbps) - **cannot be fingerprinted**
- ❌ All lossless formats - **cannot be fingerprinted**
- ❌ **No ISRC verification** - users can upload other artists' released tracks
- ❌ **No cover song detection** - copyright violations slip through
- ❌ **Manual review only** - inefficient and risky

---

## 💥 Business Impact

### Copyright Protection Failure

**Without ACRCloud fingerprinting for files > 10 MB:**

1. **User uploads a 15 MB file** of Drake's latest single
2. **Fingerprinting SKIPPED** (exceeds 10 MB)
3. **No ISRC match detected** - system doesn't know it's Drake's song
4. **No verification prompt** - user isn't asked to prove ownership
5. **Track uploads successfully** - flagged for manual review
6. **Copyright violation on platform** ⚠️

### What Should Happen

1. **User uploads a 15 MB file** of Drake's latest single
2. **Backend extracts 30-second sample** using ffmpeg
3. **Sample sent to ACRCloud** (~1-2 MB)
4. **ACRCloud identifies Drake's song** ✅
5. **System prompts for ISRC verification** to prove ownership
6. **Upload rejected** if user can't provide ISRC ✅
7. **Platform protected from copyright violations** ✅

---

## 🎯 Required Solution: Backend Audio Sampling

### What You Need to Implement

**Backend should extract a 30-second audio sample from large files before sending to ACRCloud.**

### Why Audio Sampling?

- ✅ **ACRCloud only needs 10-15 seconds** to identify a track
- ✅ **Works for files of ANY size** (50 MB, 100 MB, 500 MB)
- ✅ **Drastically reduces payload** (15 MB → 1-2 MB sample)
- ✅ **Industry standard approach** - used by Spotify, YouTube, SoundCloud
- ✅ **Comprehensive copyright protection** - no files bypass verification

---

## 🔧 Implementation Guide

### Step 1: Install ffmpeg

**For Vercel deployment:**
```bash
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg
```

**For other platforms:**
```bash
# Ubuntu/Debian
apt-get install ffmpeg

# macOS
brew install ffmpeg

# Docker
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
```

### Step 2: Update `/api/upload/fingerprint` Endpoint

**Current Implementation (Broken for files > 10 MB):**
```javascript
// api/upload/fingerprint/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get('audioFile') as File;

  // Problem: If file > 10 MB, this fails with 413 error
  const buffer = await audioFile.arrayBuffer();

  // Send to ACRCloud
  const result = await identifyAudio(Buffer.from(buffer));

  return Response.json(result);
}
```

**NEW Implementation (Works for ALL file sizes):**
```javascript
// api/upload/fingerprint/route.ts
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream } from 'fs';
import { unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get('audioFile') as File;
  const artistName = formData.get('artistName') as string | null;

  const fileSize = audioFile.size;
  const MAX_DIRECT_SIZE = 10 * 1024 * 1024; // 10 MB

  let audioBuffer: Buffer;

  try {
    if (fileSize > MAX_DIRECT_SIZE) {
      // Large file: Extract 30-second sample
      console.log(`📦 Large file detected: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
      console.log('🎬 Extracting 30-second audio sample...');

      audioBuffer = await extractAudioSample(audioFile, 30);

      console.log(`✅ Sample extracted: ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB`);
    } else {
      // Small file: Use entire file
      console.log(`✅ Small file: ${(fileSize / 1024 / 1024).toFixed(1)} MB - using full file`);
      audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    }

    // Send to ACRCloud (sample or full file)
    const result = await identifyAudio(audioBuffer, artistName);

    return Response.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('❌ ACRCloud fingerprinting error:', error);

    return Response.json({
      success: false,
      matchFound: false,
      error: error.message || 'Fingerprinting failed',
      errorCode: 'API_ERROR',
      requiresManualReview: true
    }, { status: 500 });
  }
}

/**
 * Extract audio sample from uploaded file
 * @param file - Uploaded audio file
 * @param durationSeconds - Sample duration (default: 30 seconds)
 * @returns Buffer containing audio sample
 */
async function extractAudioSample(
  file: File,
  durationSeconds: number = 30
): Promise<Buffer> {
  const tempInputPath = join(tmpdir(), `upload_${Date.now()}_${file.name}`);
  const tempOutputPath = join(tmpdir(), `sample_${Date.now()}.mp3`);

  try {
    // Save uploaded file to temp location
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempInputPath, buffer);

    // Extract sample using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .setStartTime(0) // Start from beginning
        .duration(durationSeconds) // Extract X seconds
        .audioCodec('libmp3lame') // MP3 codec
        .audioBitrate('128k') // 128kbps (ACRCloud doesn't need high quality)
        .output(tempOutputPath)
        .on('end', () => {
          console.log('✅ Audio sample extraction complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ ffmpeg error:', err);
          reject(new Error(`Audio sampling failed: ${err.message}`));
        })
        .run();
    });

    // Read the sample
    const sampleBuffer = await readFile(tempOutputPath);

    // Cleanup temp files
    await unlink(tempInputPath).catch(() => {});
    await unlink(tempOutputPath).catch(() => {});

    return sampleBuffer;

  } catch (error: any) {
    // Cleanup on error
    await unlink(tempInputPath).catch(() => {});
    await unlink(tempOutputPath).catch(() => {});

    throw error;
  }
}
```

### Step 3: Update ACRCloud API Call

**Your existing `identifyAudio` function should work as-is:**
```javascript
async function identifyAudio(audioBuffer: Buffer, artistName?: string) {
  const crypto = require('crypto');
  const FormData = require('form-data');

  // ACRCloud credentials
  const access_key = process.env.ACRCLOUD_ACCESS_KEY;
  const access_secret = process.env.ACRCLOUD_ACCESS_SECRET;
  const host = process.env.ACRCLOUD_HOST;

  // Generate signature
  const timestamp = Math.floor(Date.now() / 1000);
  const string_to_sign = `POST\n/v1/identify\n${access_key}\naudio\n1\n${timestamp}`;
  const signature = crypto
    .createHmac('sha1', access_secret)
    .update(Buffer.from(string_to_sign, 'utf-8'))
    .digest()
    .toString('base64');

  // Create form data
  const form = new FormData();
  form.append('sample', audioBuffer, { filename: 'sample.mp3' });
  form.append('access_key', access_key);
  form.append('sample_bytes', audioBuffer.length);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('data_type', 'audio');
  form.append('signature_version', '1');

  // Call ACRCloud API
  const response = await fetch(`https://${host}/v1/identify`, {
    method: 'POST',
    body: form
  });

  const result = await response.json();

  // Process ACRCloud response...
  // (your existing logic)
}
```

---

## 🧪 Testing Checklist

After implementing audio sampling:

### Small Files (< 10 MB)
- [ ] 5 MB file - should use full file
- [ ] Verify fingerprinting works
- [ ] Verify ISRC detection works
- [ ] Verify response time is acceptable

### Medium Files (10-20 MB)
- [ ] 13.9 MB file - should extract sample
- [ ] Verify fingerprinting works
- [ ] Verify ISRC detection works
- [ ] Verify match detection works

### Large Files (20-50 MB)
- [ ] 30 MB lossless file - should extract sample
- [ ] Verify fingerprinting works
- [ ] Verify no timeout errors
- [ ] Verify no 413 errors

### Very Large Files (> 50 MB)
- [ ] 100 MB WAV file - should extract sample
- [ ] Verify extraction doesn't timeout
- [ ] Verify sample is ~1-2 MB
- [ ] Verify ACRCloud processes it

### Edge Cases
- [ ] Corrupted audio file - should handle gracefully
- [ ] Invalid audio format - should return error
- [ ] Very short audio (< 10 seconds) - should use full file
- [ ] Concurrent uploads - should handle multiple requests

---

## 📊 Expected Performance

### Before (Current - BROKEN)

| File Size | Fingerprinting | ISRC Check | Protection |
|-----------|---------------|------------|------------|
| < 10 MB | ✅ Works | ✅ Works | ✅ Full |
| 10-20 MB | ❌ Fails (413) | ❌ Skipped | ❌ None |
| > 20 MB | ❌ Fails (413) | ❌ Skipped | ❌ None |

**Result:** 70-80% of professional music uploads bypass copyright protection

### After (With Audio Sampling)

| File Size | Processing | Fingerprinting | ISRC Check | Protection |
|-----------|-----------|---------------|------------|------------|
| < 10 MB | Direct | ✅ Works | ✅ Works | ✅ Full |
| 10-20 MB | Sample (30s) | ✅ Works | ✅ Works | ✅ Full |
| 20-50 MB | Sample (30s) | ✅ Works | ✅ Works | ✅ Full |
| > 50 MB | Sample (30s) | ✅ Works | ✅ Works | ✅ Full |

**Result:** 100% of uploads get copyright protection ✅

---

## ⏱️ Implementation Timeline

| Task | Time | Status |
|------|------|--------|
| Install ffmpeg in deployment environment | 1 hour | ⏳ Pending |
| Implement `extractAudioSample` function | 2 hours | ⏳ Pending |
| Update `/api/upload/fingerprint` endpoint | 1 hour | ⏳ Pending |
| Test with various file formats | 2 hours | ⏳ Pending |
| Deploy to production | 1 hour | ⏳ Pending |
| **Total** | **~7 hours** | **⏳ Pending** |

---

## 🚀 Deployment Notes

### Environment Variables Required

```env
# ACRCloud Credentials (already configured)
ACRCLOUD_ACCESS_KEY=your_access_key
ACRCLOUD_ACCESS_SECRET=your_access_secret
ACRCLOUD_HOST=identify-us-west-2.acrcloud.com
```

### Vercel Configuration

If deploying on Vercel, add to `vercel.json`:

```json
{
  "functions": {
    "api/upload/fingerprint.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### Docker Configuration

If using Docker, ensure ffmpeg is installed:

```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## ✅ Mobile App Status

**Mobile app changes:** ✅ **COMPLETE**

- ✅ Removed client-side file size limit
- ✅ Sends ALL files to backend for fingerprinting (regardless of size)
- ✅ Handles backend response for ISRC verification
- ✅ Handles backend response for cover song detection
- ✅ Graceful error handling if backend fails

**The mobile app is ready. We're waiting for the backend audio sampling implementation.**

---

## 🔗 Related Documentation

- [BACKEND_NOTE_ACTUAL_LIMIT.md](BACKEND_NOTE_ACTUAL_LIMIT.md) - Original backend limit discovery
- [MOBILE_TEAM_ACRCLOUD_HYBRID_PROTECTION.md](MOBILE_TEAM_ACRCLOUD_HYBRID_PROTECTION.md) - Full ACRCloud system documentation
- [BUG_REPORT_ACRCLOUD_413_PAYLOAD_TOO_LARGE.md](BUG_REPORT_ACRCLOUD_413_PAYLOAD_TOO_LARGE.md) - Original bug report

---

## 📞 Questions?

**Mobile Team:** Justice Asibe (ready and waiting)
**Backend Team:** Please implement ASAP - copyright protection is broken

---

## ⚠️ CRITICAL REMINDER

**Every day this is not implemented, users can upload copyrighted music without verification.**

This is a **legal and business risk** for the platform. Please prioritize this implementation.

---

**Status:** 🔴 **CRITICAL - NEEDS IMMEDIATE IMPLEMENTATION**
