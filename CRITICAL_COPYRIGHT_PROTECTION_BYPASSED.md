# 🚨 CRITICAL: Copyright Protection Bypassed for Large Files

**Date:** January 5, 2026
**Severity:** 🔴 **CRITICAL SECURITY ISSUE**
**Impact:** Copyright infringement risk, legal liability, platform abuse

---

## ⚠️ THE PROBLEM

**Large audio files (> 10 MB) are NOT being fingerprinted at all**, which means:

- ❌ Released songs on Spotify/Apple Music can be uploaded without detection
- ❌ No ISRC verification required
- ❌ Users can falsely claim copyrighted music as "original"
- ❌ Platform is vulnerable to copyright infringement lawsuits
- ❌ Artists can upload others' full albums/songs without consequences

---

## 🔍 What's Actually Happening

### Current Backend Behavior (DANGEROUS)

```typescript
// Backend code (CURRENT - BROKEN):
if (fileSize > 10 * 1024 * 1024) {
  // ❌ REJECT WITHOUT FINGERPRINTING
  return {
    success: false,
    matchFound: false,  // ⚠️ FALSE NEGATIVE - We don't actually know!
    error: "Audio file too large (max 10MB)",
    requiresManualReview: true
  };
}

// ❌ ACRCloud.identifyAudio() is NEVER CALLED for large files
```

### What This Means

A user can:
1. Download a full album from Spotify (each track 15-30 MB in high quality)
2. Upload each track to SoundBridge
3. **Backend says: "matchFound: false"** (without even checking!)
4. Mobile app shows: "Original music confirmed" ✅
5. User proceeds to upload **without ISRC verification**
6. **Copyrighted music is now on the platform illegally**

---

## 📊 Real Example from Today

### What Happened

**File:** "Final Gospel Prevails.mp3" (13.3 MB)
**Status:** Released on all major streaming platforms
**ISRC:** Exists (should be detected)

**Backend Response:**
```json
{
  "success": false,
  "matchFound": false,  // ⚠️ DANGEROUS FALSE NEGATIVE
  "error": "Audio file too large (max 10MB)",
  "errorCode": "INVALID_FILE",
  "requiresManualReview": true
}
```

**What the Backend Did:**
1. ✅ Received storage URL
2. ✅ Downloaded 13.3 MB file
3. ❌ Checked size: 13.3 MB > 10 MB
4. ❌ **Immediately rejected WITHOUT calling ACRCloud**
5. ❌ Returned `matchFound: false` (false negative!)

**What the Backend Should Have Done:**
1. ✅ Received storage URL
2. ✅ Downloaded 13.3 MB file
3. ✅ Detected: 13.3 MB > 10 MB
4. ✅ **Extracted 30-second audio sample (1.5 MB)**
5. ✅ **Sent sample to ACRCloud**
6. ✅ **Returned: `matchFound: true` with ISRC**
7. ✅ **Required ISRC verification**

---

## 🎯 Why This is Critical

### Legal Risk

**Without proper fingerprinting:**
- Platform can be sued for hosting copyrighted music without licenses
- DMCA takedown requests will increase
- Major labels (Universal, Sony, Warner) can take legal action
- Platform reputation damage

### Business Risk

**Copyright holders can:**
- Issue cease and desist letters
- Demand takedown of all content
- Sue for statutory damages ($750-$30,000 per work)
- Request platform removal from app stores

### User Trust Risk

**Legitimate users affected:**
- Manual review delays for ALL large files (even originals)
- Poor user experience for high-quality uploads
- Platform appears unprofessional

---

## 📈 Scale of the Problem

### File Sizes in Music Industry

| Format | Typical Size | Currently Detected? |
|--------|--------------|---------------------|
| MP3 128kbps (3 min) | ~3 MB | ✅ YES |
| MP3 320kbps (3 min) | ~7 MB | ✅ YES |
| MP3 320kbps (5 min) | ~12 MB | ❌ **NO** |
| WAV/FLAC (3 min) | ~30 MB | ❌ **NO** |
| Full albums | 50-500 MB | ❌ **NO** |
| Podcasts (30 min) | ~20-40 MB | ❌ **NO** |

**Conclusion:** A significant portion of uploads are NOT being fingerprinted.

---

## 🔧 The Fix (Backend Team)

### Step 1: Remove the Rejection

**File:** `apps/web/app/api/upload/fingerprint/route.ts`

**Find and REMOVE:**
```typescript
// ❌ DELETE THIS ENTIRE BLOCK
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

### Step 2: Implement Audio Sampling

**Add this logic INSTEAD:**

```typescript
// ✅ ADD THIS LOGIC
const MAX_ACRCLOUD_SIZE = 10 * 1024 * 1024; // ACRCloud limit

let audioToFingerprint = fileBuffer;

// For large files, extract 30-second sample
if (fileSize > MAX_ACRCLOUD_SIZE) {
  console.log(`📦 Large file detected: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log('🎬 Extracting 30-second audio sample for fingerprinting...');

  try {
    // Extract 30-second sample using ffmpeg
    audioToFingerprint = await extractAudioSample(fileBuffer);

    console.log(`✅ Sample extracted: ${(audioToFingerprint.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (error) {
    console.error('❌ Failed to extract audio sample:', error);
    // Fall back to rejecting ONLY if sampling fails
    return NextResponse.json({
      success: false,
      matchFound: false,
      error: 'Failed to process large audio file',
      errorCode: 'SAMPLING_ERROR',
      requiresManualReview: true,
    });
  }
}

// Continue with ACRCloud fingerprinting
console.log('🎵 Calling ACRCloud with audio data...');
const result = await identifyAudio(audioToFingerprint, artistName);
```

### Step 3: Implement extractAudioSample()

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function extractAudioSample(audioBuffer: Buffer): Promise<Buffer> {
  const tempInputPath = join(tmpdir(), `input_${Date.now()}.mp3`);
  const tempOutputPath = join(tmpdir(), `output_${Date.now()}.mp3`);

  try {
    // Write buffer to temp file
    await writeFile(tempInputPath, audioBuffer);

    // Extract 30 seconds from the middle of the track
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .setStartTime(30) // Skip first 30 seconds (often has intro)
        .setDuration(30)  // Extract 30 seconds
        .audioBitrate('128k') // Reduce bitrate to save size
        .output(tempOutputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Read the sample back
    const sampleBuffer = await readFile(tempOutputPath);

    // Cleanup temp files
    await unlink(tempInputPath).catch(() => {});
    await unlink(tempOutputPath).catch(() => {});

    return sampleBuffer;
  } catch (error) {
    // Cleanup on error
    await unlink(tempInputPath).catch(() => {});
    await unlink(tempOutputPath).catch(() => {});
    throw error;
  }
}
```

---

## 🧪 Testing the Fix

### Test Case 1: Released Song (High Quality)

```bash
# Test with a 15 MB released track
curl -X POST https://www.soundbridge.live/api/upload/fingerprint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "audioFileUrl": "https://storage.url/released_track_15mb.mp3",
    "artistName": "Known Artist"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "matchFound": true,  // ✅ MUST be true for released songs
  "detectedTitle": "Song Title",
  "detectedArtist": "Artist Name",
  "detectedISRC": "USUM71234567",
  "confidence": 95
}
```

**Current (BROKEN) Result:**
```json
{
  "success": false,
  "matchFound": false,  // ❌ FALSE NEGATIVE
  "error": "Audio file too large (max 10MB)"
}
```

### Test Case 2: Original Music (High Quality)

```bash
# Test with a 15 MB original track (not released)
curl -X POST https://www.soundbridge.live/api/upload/fingerprint \
  -H "Content-Type: application/json" \
  -d '{
    "audioFileUrl": "https://storage.url/original_track_15mb.mp3"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "matchFound": false,  // ✅ Correct - not in ACRCloud database
  "message": "No match found - appears to be original music"
}
```

---

## 📋 Deployment Checklist

### Critical Steps (DO IMMEDIATELY)

- [ ] **Remove 10 MB file size rejection** from fingerprint API
- [ ] **Implement audio sampling** for large files
- [ ] **Install ffmpeg** in production environment
- [ ] **Test with released song > 10 MB** (must detect match)
- [ ] **Test with original song > 10 MB** (must return no match)
- [ ] **Deploy to production ASAP**
- [ ] **Verify no copyright protection gaps**

### Verification Steps

- [ ] Upload a known released track (15 MB) → Should detect match
- [ ] Verify ISRC is returned in response
- [ ] Verify mobile app requires ISRC verification
- [ ] Upload an original track (15 MB) → Should return no match
- [ ] Verify mobile app shows "original music" confirmation
- [ ] Check backend logs show audio sampling for large files

---

## ⏰ Timeline

**Recommended Action:** 🚨 **DEPLOY FIX WITHIN 24 HOURS**

**Reasoning:**
- Critical copyright protection gap
- Legal liability risk
- Platform can be exploited immediately
- Fix is straightforward (audio sampling)

---

## 📞 Communication

### Message to Backend Team

> **URGENT: Critical copyright protection issue**
>
> The 10 MB file size check is creating a copyright protection gap. Large files (> 10 MB) are being rejected WITHOUT fingerprinting, which means:
>
> - Released songs can be uploaded as "original"
> - No ISRC verification is enforced
> - Platform is vulnerable to copyright infringement
>
> **Example:** Today we tested with "Final Gospel Prevails.mp3" (13.3 MB, released on all stores). Backend returned `matchFound: false` without even calling ACRCloud.
>
> **Required Fix:**
> 1. Remove the 10 MB rejection in `/api/upload/fingerprint/route.ts`
> 2. Implement audio sampling for files > 10 MB
> 3. Send 30-second sample to ACRCloud instead of full file
> 4. Return actual fingerprint results
>
> **This is a critical security issue that needs immediate attention.**
>
> See: `CRITICAL_COPYRIGHT_PROTECTION_BYPASSED.md` for full details.

---

## ✅ Summary

**Current State:**
- 🔴 Files > 10 MB: NOT fingerprinted (copyright protection bypassed)
- 🟢 Files < 10 MB: Fingerprinted correctly

**Impact:**
- High-quality music uploads (WAV, FLAC, 320kbps MP3) skip copyright checks
- Released songs can be uploaded without ISRC verification
- Legal liability for platform

**Fix:**
- Remove 10 MB rejection
- Implement audio sampling
- Fingerprint ALL files regardless of size

**Urgency:** 🚨 CRITICAL - Deploy within 24 hours

---

**This is not just a technical issue - it's a legal liability that needs immediate attention.**
