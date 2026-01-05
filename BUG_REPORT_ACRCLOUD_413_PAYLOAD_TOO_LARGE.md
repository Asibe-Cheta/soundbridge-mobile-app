# 🔴 CRITICAL BUG: ACRCloud API Returns 413 Payload Too Large

**Date:** January 5, 2026
**Reported by:** Mobile Team
**Severity:** Critical
**Status:** Root Cause Identified - Needs Backend Fix
**Affected Endpoint:** `POST /api/upload/fingerprint`

---

## 🐛 Problem Summary

The ACRCloud fingerprint API endpoint (`POST /api/upload/fingerprint`) is returning **HTTP 413 - Request Entity Too Large** for audio files larger than ~10 MB. This prevents the audio verification feature from working for most music tracks.

---

## 📊 Root Cause

**Base64 Encoding Size Explosion:**
- Original audio file: 13.9 MB (MP3)
- Base64 encoded: ~18.5 MB (**33% size increase**)
- Backend API Gateway/Function payload limit: Appears to be **6-10 MB**
- Result: **Request rejected before reaching ACRCloud**

**Why Base64?**
The current implementation converts the entire audio file to base64 and sends it in the JSON request body. This is inefficient for large files.

---

## 📋 Evidence

### Mobile App Console Logs

```javascript
🎵 Auto-triggering ACRCloud fingerprinting for music track
🎵 Starting ACRCloud fingerprinting...
🔍 Response status: 413
🔍 Response ok: false
🔍 Content-Type: text/plain; charset=utf-8
❌ API returned error status: 413
❌ Error response: Request Entity Too Large

FUNCTION_PAYLOAD_TOO_LARGE

lhr1::br4vn-1767621195244-c287b53e9d3e
```

### Test Details

**Test File:** "Final Gospel Prevails.mp3"
**Original File Size:** 13,986,921 bytes (13.9 MB)
**Base64 Encoded Size:** ~18.5 MB
**File Type:** audio/mpeg
**User:** bd8a455d-a54d-45c5-968d-e4cf5e8d928e

---

## 🎯 Recommended Solutions

### Solution 1: Use Multipart/Form-Data Upload (Recommended)

Instead of base64 encoding in JSON, use multipart form-data to upload the raw audio file.

**Benefits:**
- ✅ No size increase (13.9 MB stays 13.9 MB)
- ✅ More efficient
- ✅ Standard approach for file uploads
- ✅ Supports larger files

**Backend Changes Required:**

```javascript
// Current (base64 in JSON):
POST /api/upload/fingerprint
Content-Type: application/json
{
  "fileData": "data:audio/mpeg;base64,/9j/4AAQSkZJRg..." // 18.5 MB
}

// New (multipart form-data):
POST /api/upload/fingerprint
Content-Type: multipart/form-data
------WebKitFormBoundary...
Content-Disposition: form-data; name="audioFile"; filename="track.mp3"
Content-Type: audio/mpeg

[binary audio data] // 13.9 MB
------WebKitFormBoundary...
Content-Disposition: form-data; name="artistName"

John Doe
------WebKitFormBoundary...
```

**Mobile Changes Required:**

```typescript
const fingerprintAudio = async (file: File) => {
  const formData = new FormData();
  formData.append('audioFile', file);
  if (artistName) {
    formData.append('artistName', artistName);
  }

  const response = await fetch('https://www.soundbridge.live/api/upload/fingerprint', {
    method: 'POST',
    headers: {
      'Authorization': session ? `Bearer ${session.access_token}` : '',
      // Don't set Content-Type - browser will set it with boundary
    },
    body: formData
  });

  // ... handle response
};
```

---

### Solution 2: Increase API Gateway Payload Limit

**Not Recommended** because:
- ❌ Wasteful to allow 20+ MB base64 payloads
- ❌ Still inefficient (33% overhead)
- ❌ Won't scale for larger files
- ❌ Higher bandwidth costs

**If you must:**
- Increase API Gateway payload limit to 30 MB
- Increase Function payload limit to 30 MB
- Update backend configuration

---

### Solution 3: Audio Sampling/Compression (Alternative)

Send only a **30-second sample** of the audio file instead of the entire file.

**Benefits:**
- ✅ Significantly smaller payload (~1-2 MB)
- ✅ ACRCloud only needs 10-15 seconds to fingerprint
- ✅ Works with current base64 approach

**Backend Changes:**

```javascript
// Extract first 30 seconds of audio
// Convert to base64
// Send to ACRCloud
```

**Mobile Changes:**

```typescript
// Use a library to extract first 30 seconds
// Then base64 encode and send
```

**Trade-offs:**
- ⚠️ More complex implementation
- ⚠️ Requires audio processing library
- ⚠️ Still uses base64 (inefficient)

---

## 🚀 Recommended Implementation Plan

### Phase 1: Quick Fix (Today)
1. Update backend endpoint to accept `multipart/form-data`
2. Parse file from form data instead of base64 JSON
3. Pass raw audio file to ACRCloud
4. Keep backward compatibility with base64 format (for now)

### Phase 2: Mobile Update (Tomorrow)
1. Update mobile app to send `multipart/form-data` instead of base64 JSON
2. Test with large audio files (10-20 MB)
3. Verify fingerprinting works end-to-end

### Phase 3: Cleanup (Next Week)
1. Remove base64 support from backend (breaking change)
2. Update documentation
3. Monitor for issues

---

## 🔧 Backend Code Example

### Current Implementation (Base64)

```javascript
// api/upload/fingerprint.js
export default async function handler(req, res) {
  const { fileData, artistName } = req.body;

  // fileData is base64: "data:audio/mpeg;base64,/9j/4AAQ..."
  // This is TOO LARGE (18.5 MB for 13.9 MB file)

  const buffer = Buffer.from(fileData.split(',')[1], 'base64');

  // Send to ACRCloud...
}
```

### New Implementation (Multipart)

```javascript
// api/upload/fingerprint.js
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser
  },
};

export default async function handler(req, res) {
  const form = formidable({
    maxFileSize: 20 * 1024 * 1024, // 20 MB limit
    keepExtensions: true,
  });

  const [fields, files] = await form.parse(req);

  const audioFile = files.audioFile[0]; // File object
  const artistName = fields.artistName?.[0];

  // audioFile.filepath points to the uploaded file (13.9 MB, no overhead)

  // Read file and send to ACRCloud
  const buffer = await fs.promises.readFile(audioFile.filepath);

  // ... ACRCloud API call

  // Clean up temp file
  await fs.promises.unlink(audioFile.filepath);
}
```

---

## 📱 Mobile Code Example

### Current Implementation (Base64)

```typescript
// UploadScreen.tsx
const fingerprintAudio = async (file: File) => {
  // Convert to base64 (13.9 MB → 18.5 MB)
  const base64Data = await fileToBase64(file);

  const response = await fetch('https://www.soundbridge.live/api/upload/fingerprint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.access_token}` : '',
    },
    body: JSON.stringify({
      fileData: base64Data, // TOO LARGE
      artistName: formData.artistName || undefined,
    }),
  });

  // Result: 413 Payload Too Large
};
```

### New Implementation (Multipart)

```typescript
// UploadScreen.tsx
const fingerprintAudio = async (file: File) => {
  const formData = new FormData();

  // Add the file (13.9 MB, no encoding overhead)
  formData.append('audioFile', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  // Add optional artist name
  if (formData.artistName) {
    formData.append('artistName', formData.artistName);
  }

  const response = await fetch('https://www.soundbridge.live/api/upload/fingerprint', {
    method: 'POST',
    headers: {
      'Authorization': session ? `Bearer ${session.access_token}` : '',
      // Don't set Content-Type - FormData will set it automatically
    },
    body: formData,
  });

  // Result: Success (file is only 13.9 MB)

  const data = await response.json();
  // ... handle response
};
```

---

## ✅ Verification After Fix

Once the multipart implementation is deployed:

1. **Test Small Files** (< 5 MB)
   - Verify fingerprinting works
   - Verify match detection works
   - Verify ISRC verification works

2. **Test Medium Files** (5-15 MB)
   - Verify no 413 errors
   - Verify fingerprinting completes successfully
   - Verify performance is acceptable

3. **Test Large Files** (15-20 MB)
   - Verify API accepts the file
   - Verify ACRCloud processes it
   - Verify response is returned correctly

4. **Test Edge Cases**
   - Very large files (> 20 MB) - should return clear error
   - Invalid file types - should return validation error
   - Corrupted files - should handle gracefully

---

## 🚨 Impact

### Critical Issues

- ✅ Audio verification feature completely non-functional for files > 10 MB
- ✅ Most professionally produced music tracks are 10-20 MB (3-5 minute songs)
- ✅ Users cannot upload high-quality music with ACRCloud verification
- ✅ Fallback works (upload can proceed), but defeats the purpose of ACRCloud

### Affected Users

- **High-quality music uploads**: Most affected (320kbps MP3 = ~3 MB/minute)
- **Short demos/snippets**: May still work if < 10 MB
- **Lossless formats** (FLAC, WAV): Completely broken (files are 50-100+ MB)

---

## 📞 Contact

**Mobile Team:** Justice Asibe
**Backend Team:** [Please assign]
**Priority:** Critical

---

## 🔗 Related Files

### Mobile App
- [UploadScreen.tsx:400-463](src/screens/UploadScreen.tsx#L400-L463) - ACRCloud fingerprinting implementation

### Backend
- API endpoint: `/api/upload/fingerprint`
- Needs to support `multipart/form-data`

### Documentation
- [MOBILE_TEAM_ACRCLOUD_HYBRID_PROTECTION.md](MOBILE_TEAM_ACRCLOUD_HYBRID_PROTECTION.md) - Needs update to reflect multipart approach

---

**This is a critical architectural issue that requires backend changes before the feature can work properly!**
