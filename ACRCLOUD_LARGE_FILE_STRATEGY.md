# ACRCloud Large File Strategy (> 20 MB)

**Date:** January 5, 2026
**Issue:** How to handle audio files larger than 20 MB for ACRCloud fingerprinting
**Status:** Strategy Document

---

## 📊 Current Situation

### Backend Limits
- **ACRCloud API endpoint limit:** 20 MB (multipart/form-data)
- **Files that exceed this:**
  - Long music tracks (> 6-7 minutes at 320kbps MP3)
  - High-quality formats (FLAC, WAV, ALAC)
  - Podcasts (30-60+ minutes)
  - DJ mixes, live recordings
  - Full albums (if uploaded as single file)

### Current Behavior
- **Podcasts:** ✅ Already excluded (only `contentType === 'music'` is fingerprinted)
- **Music > 20 MB:** ❌ Will fail with file size error

---

## 🎯 Recommended Solutions

### Solution 1: Skip ACRCloud for Large Files (Simplest - Recommended)

**Approach:** If file > 20 MB, skip fingerprinting and allow upload with manual review flag.

**Rationale:**
- Most professionally produced music tracks are 3-5 minutes (10-15 MB at 320kbps)
- Files > 20 MB are often:
  - DJ mixes, live recordings, extended versions (likely original)
  - Lossless formats (audiophile uploads, likely owned by user)
  - Less likely to be copyright infringement
- Manual review can catch edge cases

**Implementation:**

```typescript
const fingerprintAudio = async (file: { uri: string; name: string; type: string; size?: number }) => {
  setAcrcloudStatus('checking');
  setAcrcloudError(null);

  try {
    // Check file size first
    const fileSize = file.size || 0;
    const MAX_FINGERPRINT_SIZE = 20 * 1024 * 1024; // 20 MB

    if (fileSize > MAX_FINGERPRINT_SIZE) {
      console.log(`⚠️ File too large for fingerprinting: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

      // Skip fingerprinting for large files
      setAcrcloudStatus('error');
      setAcrcloudError(`File size (${fileSizeMB} MB) exceeds limit. Will be reviewed manually.`);
      setAcrcloudData({
        requiresManualReview: true,
        skipReason: 'FILE_TOO_LARGE'
      });

      // Message will display inline in existing error UI (no popup)
      return;
    }

    // Continue with normal fingerprinting...
  } catch (error: any) {
    // Error handling...
  }
};
```

**Pros:**
- ✅ Simple to implement
- ✅ No audio processing needed
- ✅ Works immediately
- ✅ Graceful fallback

**Cons:**
- ❌ Large files won't be fingerprinted
- ❌ Manual review workload increases slightly

---

### Solution 2: Extract Audio Sample (Advanced)

**Approach:** Extract first 30 seconds of audio and send only that to ACRCloud.

**Rationale:**
- ACRCloud only needs 10-15 seconds to identify a track
- Sending a sample drastically reduces payload size
- Works for files of any size

**Implementation Complexity:**
- Requires audio processing library (e.g., `expo-av`, `react-native-audio-toolkit`, or `ffmpeg`)
- More complex to implement
- Potential for errors in audio extraction

**Example (Conceptual):**

```typescript
// Using expo-av or similar library
const extractAudioSample = async (fileUri: string): Promise<Blob> => {
  // Load audio
  const audio = await Audio.Sound.createAsync({ uri: fileUri });

  // Extract first 30 seconds
  // This requires native audio processing capabilities
  const sample = await audio.extractSegment(0, 30000); // 0-30 seconds

  return sample;
};

const fingerprintAudio = async (file: { uri: string; name: string; type: string; size?: number }) => {
  // If file > 20 MB, extract sample
  if (file.size && file.size > 20 * 1024 * 1024) {
    const sample = await extractAudioSample(file.uri);
    // Send sample to ACRCloud...
  } else {
    // Send full file...
  }
};
```

**Pros:**
- ✅ Fingerprints all files regardless of size
- ✅ More comprehensive protection

**Cons:**
- ❌ Complex implementation
- ❌ Requires audio processing library
- ❌ Potential performance issues on mobile
- ❌ More points of failure

---

### Solution 3: Backend Audio Sampling (Best Long-Term)

**Approach:** Backend extracts audio sample before sending to ACRCloud.

**How It Works:**
1. Mobile sends full file to backend (using chunked upload if needed)
2. Backend extracts 30-second sample using ffmpeg
3. Backend sends sample to ACRCloud
4. Backend returns fingerprint result

**Pros:**
- ✅ No mobile audio processing needed
- ✅ Works for any file size
- ✅ Centralized processing (easier to debug/optimize)
- ✅ Can use powerful server-side tools (ffmpeg)

**Cons:**
- ❌ Requires backend changes
- ❌ More complex architecture
- ❌ Higher backend processing load

**Backend Implementation (Pseudocode):**

```javascript
// Backend: /api/upload/fingerprint
export async function POST(request) {
  const formData = await request.formData();
  const audioFile = formData.get('audioFile');

  const fileSize = audioFile.size;
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

  let audioBuffer;

  if (fileSize > MAX_SIZE) {
    // Extract 30-second sample using ffmpeg
    audioBuffer = await extractAudioSample(audioFile, 30); // 30 seconds
  } else {
    // Use full file
    audioBuffer = await audioFile.arrayBuffer();
  }

  // Send to ACRCloud
  const acrcloudResult = await identifyAudio(audioBuffer);

  return Response.json(acrcloudResult);
}
```

---

## 📱 Content Type Strategy

### Current Filtering (Already Implemented)

```typescript
// Only fingerprint music tracks
if (formData.contentType === 'music') {
  await fingerprintAudio(audioFileData);
}
```

**What's Excluded:**
- ✅ Podcasts (contentType === 'podcast')
- ✅ Other audio types

**What's Included:**
- 🎵 Music tracks
- 🎵 Albums (if uploaded as individual tracks)

---

## 🎯 Recommended Implementation Plan

### Phase 1: Immediate Fix (Today)

**Implement Solution 1: Skip Large Files**

1. Add file size check before fingerprinting
2. Skip fingerprinting if file > 20 MB
3. Flag for manual review
4. Show inline message (no popup - better UX)

**Changes Required:**
- Update `fingerprintAudio` function in UploadScreen.tsx
- Add file size validation
- Set error state (displays inline message in existing error UI)

**Time Estimate:** 30 minutes

---

### Phase 2: Enhanced Solution (Future)

**Implement Solution 3: Backend Audio Sampling**

1. Update backend to extract audio samples
2. Use ffmpeg for reliable audio processing
3. Support files of any size
4. More comprehensive copyright protection

**Changes Required:**
- Backend: Add ffmpeg audio sampling
- Backend: Handle large file uploads (chunked if needed)
- Mobile: No changes needed (already sends full file)

**Time Estimate:** 4-6 hours

---

## 📊 File Size Distribution Analysis

### Expected File Sizes by Type

| Type | Duration | Format | Typical Size | Exceeds 20 MB? |
|------|----------|--------|--------------|----------------|
| Music Track | 3-5 min | MP3 320kbps | 10-15 MB | ❌ No |
| Music Track | 3-5 min | FLAC | 30-50 MB | ✅ Yes |
| Music Track | 3-5 min | WAV | 50-80 MB | ✅ Yes |
| DJ Mix | 60 min | MP3 320kbps | 140 MB | ✅ Yes |
| Podcast | 30-60 min | MP3 128kbps | 30-60 MB | ✅ Yes (excluded) |
| Album (single file) | 40-60 min | MP3 320kbps | 100-150 MB | ✅ Yes |

### Impact Assessment

**Files that will skip fingerprinting (Solution 1):**
- Lossless audio formats (FLAC, WAV, ALAC)
- Very long tracks (> 6-7 minutes)
- DJ mixes, live recordings

**Reasoning:**
- These are less likely to be copyright infringement
- Users uploading lossless formats are typically serious musicians
- Long tracks are often original productions

---

## 💡 User Experience Considerations

### Message for Large Files (Inline Display)

**Actual Implementation (No Popup):**

The error message displays inline in the existing ACRCloud error UI:

```
⚠️ Audio verification unavailable

File size (45.2 MB) exceeds limit. Will be reviewed manually.

Fingerprinting failed. You can still proceed with upload.
Your track will be flagged for manual review.
```

**Why No Popup Alert?**
- ✅ Better UX - no interruption
- ✅ Consistent with other ACRCloud states
- ✅ User can read and continue naturally
- ✅ Less disruptive to upload flow

---

## 🔧 Implementation: Solution 1 (Recommended)

### Code Changes Required

**File:** `src/screens/UploadScreen.tsx`

**Location:** Beginning of `fingerprintAudio` function

```typescript
const fingerprintAudio = async (file: { uri: string; name: string; type: string; size?: number }) => {
  setAcrcloudStatus('checking');
  setAcrcloudError(null);

  try {
    console.log('🎵 Starting ACRCloud fingerprinting...');
    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'unknown'
    });

    // Check file size limit
    const MAX_FINGERPRINT_SIZE = 20 * 1024 * 1024; // 20 MB

    if (file.size && file.size > MAX_FINGERPRINT_SIZE) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      console.log(`⚠️ File too large for fingerprinting: ${fileSizeMB} MB (limit: 20 MB)`);

      // Set error state
      setAcrcloudStatus('error');
      setAcrcloudError(`File too large for automatic verification (${fileSizeMB} MB)`);
      setAcrcloudData({
        requiresManualReview: true,
        skipReason: 'FILE_TOO_LARGE',
        fileSize: file.size
      });

      // Message displays inline in existing error UI (no popup needed)
      return; // Skip fingerprinting
    }

    // Continue with normal fingerprinting for files ≤ 20 MB...
    const uploadFormData = new FormData();
    // ... rest of existing code
```

---

## ✅ Testing Checklist

After implementing Solution 1:

- [ ] Test with 15 MB file (should fingerprint)
- [ ] Test with 25 MB file (should skip, show message)
- [ ] Test with 50 MB file (should skip, show message)
- [ ] Test with podcast (should skip, different reason)
- [ ] Verify upload still proceeds after skipping fingerprinting
- [ ] Verify manual review flag is set
- [ ] Verify user message is clear and helpful

---

## 🚀 Deployment Strategy

### Phase 1 (Immediate - Solution 1)
1. Add file size check to mobile app
2. Skip fingerprinting for files > 20 MB
3. Flag for manual review
4. Deploy and monitor

### Phase 2 (Future - Solution 3)
1. Backend implements audio sampling (ffmpeg)
2. Backend handles large files
3. Mobile app automatically benefits (no changes needed)
4. Remove file size limit from mobile app

---

## 📞 Recommendation

**Implement Solution 1 immediately** because:
- ✅ Simple and quick (30 minutes)
- ✅ Solves the immediate problem
- ✅ Graceful user experience
- ✅ Can be enhanced later with Solution 3

**Plan Solution 3 for the future** to:
- ✅ Provide comprehensive protection for all files
- ✅ Better copyright detection coverage
- ✅ More professional solution

---

**Next Step:** Implement file size check in `fingerprintAudio` function.
