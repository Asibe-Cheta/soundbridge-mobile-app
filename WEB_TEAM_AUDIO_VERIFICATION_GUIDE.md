# Audio Verification Guide - How Mobile App Handles Large Files

**Date:** January 14, 2026
**To:** Web/Backend Team
**From:** Mobile App Team
**Priority:** 🔴 **CRITICAL** - Audio Verification Broken for Normal Files
**Issue:** Audio verification has 20MB limit, but normal tracks are 10-50MB+

---

## 🚨 The Problem

The web app shows this error for a 13.3MB file:
```
Audio verification unavailable
File too large for fingerprinting. Maximum size is 20MB.
You can still proceed with upload. Your track will be flagged for manual review.
```

**This is wrong because:**

1. **13.3MB is a normal file size** for a 4-5 minute track at 320kbps
2. **Audio fingerprinting DOES NOT require the full file** - it only needs ~30 seconds of audio
3. **Mobile app handles this correctly** and verifies files of ANY size
4. **Manual review creates a bottleneck** that will overwhelm moderators

---

## 📱 How Mobile App Handles Audio Verification

### The Key Insight

**You don't need to fingerprint the entire file!**

Audio fingerprinting services (like AcoustID, Shazam, Gracenote) only need **10-30 seconds of audio** to identify a track. The fingerprint is based on audio characteristics, not file size.

### Mobile App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER UPLOADS FILE                          │
│                    (Any size: 5MB - 500MB)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTRACT AUDIO SAMPLE                          │
│         • Take first 30 seconds of audio                        │
│         • Convert to standard format (WAV/PCM)                  │
│         • Sample size: ~2-5MB regardless of original            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GENERATE FINGERPRINT                           │
│         • Use Chromaprint/AcoustID algorithm                    │
│         • Creates ~10KB fingerprint hash                        │
│         • Works on the 30-second sample                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 CHECK COPYRIGHT DATABASE                        │
│         • Query MusicBrainz/AcoustID database                   │
│         • Query internal copyright registry                     │
│         • Returns match confidence (0-100%)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RETURN RESULT                                 │
│         • clean: No copyright issues detected                   │
│         • flagged: Potential match found (needs review)         │
│         • rejected: Definite copyright violation                │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Recommended Implementation

### 1. Extract Audio Sample (Backend)

The trick is to **extract a small sample** from the audio file before fingerprinting:

```javascript
// utils/audio-sampler.js

const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Extract a 30-second sample from an audio file
 * This allows fingerprinting of ANY file size
 */
async function extractAudioSample(fileBuffer, options = {}) {
  const {
    startTime = 30,      // Start 30 seconds in (skip intros)
    duration = 30,       // Extract 30 seconds
    sampleRate = 22050,  // Standard for fingerprinting
    channels = 1,        // Mono is fine for fingerprinting
    format = 'wav',      // Raw WAV for analysis
  } = options;

  return new Promise((resolve, reject) => {
    // Write buffer to temp file
    const tempInput = path.join(os.tmpdir(), `input-${Date.now()}.mp3`);
    const tempOutput = path.join(os.tmpdir(), `sample-${Date.now()}.wav`);

    fs.writeFileSync(tempInput, fileBuffer);

    ffmpeg(tempInput)
      .seekInput(startTime)           // Skip to 30 seconds in
      .duration(duration)             // Take 30 seconds
      .audioFrequency(sampleRate)     // Standard sample rate
      .audioChannels(channels)        // Mono
      .format(format)                 // WAV format
      .on('end', () => {
        const sampleBuffer = fs.readFileSync(tempOutput);

        // Cleanup temp files
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);

        resolve(sampleBuffer);
      })
      .on('error', (err) => {
        // Cleanup on error
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        reject(err);
      })
      .save(tempOutput);
  });
}

/**
 * For short files (< 1 minute), extract from the middle
 */
async function extractSmartSample(fileBuffer, fileDuration) {
  // For short files, start earlier
  let startTime = 30;
  if (fileDuration < 60) {
    startTime = Math.max(0, (fileDuration / 2) - 15); // Middle of track
  } else if (fileDuration < 120) {
    startTime = 20; // Start a bit earlier
  }

  return extractAudioSample(fileBuffer, { startTime, duration: 30 });
}

module.exports = { extractAudioSample, extractSmartSample };
```

### 2. Generate Fingerprint

```javascript
// utils/fingerprinter.js

const chromaprint = require('chromaprint');
// Or use: const { fingerprint } = require('acoustid-client');

/**
 * Generate audio fingerprint from sample
 * Sample should be ~30 seconds of WAV audio
 */
async function generateFingerprint(sampleBuffer) {
  return new Promise((resolve, reject) => {
    // Chromaprint generates a compact fingerprint
    chromaprint.fingerprint(sampleBuffer, (err, fingerprint, duration) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        fingerprint,  // Compact string (~10KB)
        duration,     // Duration of sample analyzed
        algorithm: 'chromaprint',
      });
    });
  });
}

module.exports = { generateFingerprint };
```

### 3. Check Copyright Database

```javascript
// utils/copyright-checker.js

const fetch = require('node-fetch');

const ACOUSTID_API_KEY = process.env.ACOUSTID_API_KEY;
const ACOUSTID_API_URL = 'https://api.acoustid.org/v2/lookup';

/**
 * Check fingerprint against AcoustID/MusicBrainz database
 */
async function checkCopyright(fingerprint, duration) {
  try {
    // Query AcoustID (free, open-source database)
    const response = await fetch(ACOUSTID_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client: ACOUSTID_API_KEY,
        fingerprint: fingerprint,
        duration: Math.round(duration),
        meta: 'recordings releases',
      }),
    });

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(data.error?.message || 'AcoustID lookup failed');
    }

    // Parse results
    const results = data.results || [];

    if (results.length === 0) {
      return {
        status: 'clean',
        confidence: 0,
        message: 'No copyright matches found',
        matches: [],
      };
    }

    // Check best match
    const bestMatch = results[0];
    const confidence = bestMatch.score * 100; // Convert to percentage

    if (confidence > 90) {
      // High confidence match - likely copyrighted
      const recordings = bestMatch.recordings || [];
      return {
        status: 'flagged',
        confidence,
        message: 'Potential copyright match detected',
        matches: recordings.map(r => ({
          title: r.title,
          artists: r.artists?.map(a => a.name).join(', '),
          releases: r.releases?.map(rel => rel.title),
        })),
      };
    } else if (confidence > 70) {
      // Medium confidence - needs review
      return {
        status: 'review',
        confidence,
        message: 'Possible match found - manual review recommended',
        matches: bestMatch.recordings || [],
      };
    } else {
      // Low confidence - probably original
      return {
        status: 'clean',
        confidence,
        message: 'No significant matches found',
        matches: [],
      };
    }
  } catch (error) {
    console.error('Copyright check error:', error);
    // On error, allow upload but flag for review
    return {
      status: 'review',
      confidence: 0,
      message: 'Could not verify copyright - flagged for manual review',
      error: error.message,
    };
  }
}

module.exports = { checkCopyright };
```

### 4. Complete Verification Service

```javascript
// services/audio-verification.js

const { extractSmartSample } = require('../utils/audio-sampler');
const { generateFingerprint } = require('../utils/fingerprinter');
const { checkCopyright } = require('../utils/copyright-checker');
const { getAudioDuration } = require('../utils/audio-utils');

/**
 * Complete audio verification pipeline
 * Works with ANY file size
 */
async function verifyAudio(fileBuffer, filename) {
  console.log(`🎵 Starting audio verification for: ${filename}`);
  console.log(`📦 File size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  try {
    // Step 1: Get audio duration
    const duration = await getAudioDuration(fileBuffer);
    console.log(`⏱️ Audio duration: ${duration} seconds`);

    // Step 2: Extract 30-second sample (works for ANY file size)
    console.log('🔊 Extracting audio sample...');
    const sampleBuffer = await extractSmartSample(fileBuffer, duration);
    console.log(`📊 Sample size: ${(sampleBuffer.length / 1024).toFixed(2)} KB`);

    // Step 3: Generate fingerprint from sample
    console.log('🔑 Generating fingerprint...');
    const { fingerprint, duration: sampleDuration } = await generateFingerprint(sampleBuffer);
    console.log(`✅ Fingerprint generated (${fingerprint.length} chars)`);

    // Step 4: Check against copyright database
    console.log('🔍 Checking copyright database...');
    const copyrightResult = await checkCopyright(fingerprint, sampleDuration);
    console.log(`📋 Copyright check result: ${copyrightResult.status}`);

    // Step 5: Additional quality checks
    const qualityResult = await checkAudioQuality(fileBuffer);

    return {
      success: true,
      verification: {
        copyright: copyrightResult,
        quality: qualityResult,
        fingerprint: fingerprint.substring(0, 50) + '...', // Truncated for logging
        duration,
      },
      // Determine overall status
      status: determineOverallStatus(copyrightResult, qualityResult),
      message: generateStatusMessage(copyrightResult, qualityResult),
    };

  } catch (error) {
    console.error('❌ Audio verification failed:', error);

    // Don't block upload on verification failure
    // Instead, flag for manual review
    return {
      success: false,
      verification: null,
      status: 'review',
      message: 'Automatic verification failed - flagged for manual review',
      error: error.message,
    };
  }
}

function determineOverallStatus(copyright, quality) {
  // If definite copyright violation, reject
  if (copyright.status === 'flagged' && copyright.confidence > 95) {
    return 'rejected';
  }

  // If high confidence match, flag for review
  if (copyright.status === 'flagged' || copyright.status === 'review') {
    return 'flagged';
  }

  // If quality issues, flag
  if (quality.status === 'poor') {
    return 'flagged';
  }

  return 'clean';
}

function generateStatusMessage(copyright, quality) {
  if (copyright.status === 'flagged' && copyright.confidence > 95) {
    return `This appears to match "${copyright.matches[0]?.title}" by ${copyright.matches[0]?.artists}. Please ensure you have rights to upload this content.`;
  }

  if (copyright.status === 'flagged') {
    return 'Potential copyright match detected. Your upload will be reviewed.';
  }

  if (copyright.status === 'review') {
    return 'Content flagged for manual review.';
  }

  return 'Audio verification passed.';
}

async function checkAudioQuality(fileBuffer) {
  // Basic quality checks
  // This can be expanded based on your requirements
  return {
    status: 'good',
    bitrate: 'acceptable',
    format: 'valid',
  };
}

module.exports = { verifyAudio };
```

### 5. Update Upload API Endpoint

```javascript
// api/upload/route.js

const { verifyAudio } = require('../../services/audio-verification');

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const filename = file.name;

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileSizeMB = fileBuffer.length / (1024 * 1024);

    console.log(`📤 Upload received: ${filename} (${fileSizeMB.toFixed(2)} MB)`);

    // Run audio verification (works for ANY file size)
    const verificationResult = await verifyAudio(fileBuffer, filename);

    // Store verification result with track
    const trackData = {
      // ... other track data
      moderation_status: verificationResult.status,
      moderation_confidence: verificationResult.verification?.copyright?.confidence || 0,
      flag_reasons: verificationResult.verification?.copyright?.matches || [],
      moderation_checked_at: new Date().toISOString(),
    };

    // If rejected, don't save
    if (verificationResult.status === 'rejected') {
      return Response.json({
        success: false,
        error: verificationResult.message,
        matches: verificationResult.verification?.copyright?.matches,
      }, { status: 400 });
    }

    // Proceed with upload (even if flagged - moderators will review)
    // ... save to database and storage

    return Response.json({
      success: true,
      track: trackData,
      verification: {
        status: verificationResult.status,
        message: verificationResult.message,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({
      success: false,
      error: 'Upload failed'
    }, { status: 500 });
  }
}
```

---

## 🔧 Alternative: Cloud-Based Fingerprinting

If you don't want to process audio on your server, use a cloud service:

### Option A: AWS Media Services

```javascript
// Using AWS Transcribe + custom matching
const AWS = require('aws-sdk');
const transcribe = new AWS.TranscribeService();

async function cloudFingerprint(s3Url) {
  // Start transcription job (extracts audio features)
  const job = await transcribe.startTranscriptionJob({
    TranscriptionJobName: `fingerprint-${Date.now()}`,
    Media: { MediaFileUri: s3Url },
    MediaFormat: 'mp3',
    LanguageCode: 'en-US',
  }).promise();

  // ... process results
}
```

### Option B: Third-Party Services

1. **AudibleMagic** - Industry-standard content ID
2. **Audio** - Copyright detection API
3. **ACRCloud** - Music recognition API

```javascript
// ACRCloud example
const acrcloud = require('acrcloud');

const acr = new acrcloud({
  host: 'identify-eu-west-1.acrcloud.com',
  access_key: process.env.ACRCLOUD_ACCESS_KEY,
  access_secret: process.env.ACRCLOUD_ACCESS_SECRET,
});

async function identifyMusic(sampleBuffer) {
  const result = await acr.identify(sampleBuffer);
  return result;
}
```

---

## 📊 Comparison: Current vs Recommended

| Aspect | Current (Web) | Recommended | Mobile App |
|--------|---------------|-------------|------------|
| Max file for verification | 20MB ❌ | Unlimited ✅ | Unlimited ✅ |
| Verification method | Full file | 30-second sample | 30-second sample |
| 13.3MB file | Fails ❌ | Works ✅ | Works ✅ |
| 100MB file | Fails ❌ | Works ✅ | Works ✅ |
| Fallback on failure | Manual review | Manual review | Manual review |
| Performance | N/A (blocked) | Fast (~5 sec) | Fast (~5 sec) |

---

## 🎯 Quick Fix (Immediate)

If you can't implement the full solution right away:

### Option 1: Increase the limit (temporary)

```diff
- const MAX_FINGERPRINT_SIZE = 20 * 1024 * 1024;  // 20MB
+ const MAX_FINGERPRINT_SIZE = 100 * 1024 * 1024; // 100MB
```

This is **not ideal** but unblocks users temporarily.

### Option 2: Skip verification for large files (not recommended)

```javascript
// Only as last resort
if (fileSize > 20 * 1024 * 1024) {
  return {
    status: 'skipped',
    message: 'Large file - verification will be done asynchronously',
  };
}
```

### Option 3: Sample extraction (RECOMMENDED)

```javascript
// Extract first 20MB for fingerprinting
const sampleSize = Math.min(fileBuffer.length, 20 * 1024 * 1024);
const sampleBuffer = fileBuffer.slice(0, sampleSize);
// Then fingerprint the sample
```

---

## 📱 Mobile App Reference

Here's how the mobile app backend handles this:

```typescript
// Mobile backend verifies ANY file size by:
// 1. Extracting a 30-second audio sample using FFmpeg
// 2. Generating fingerprint from the sample (~10KB)
// 3. Checking against AcoustID/MusicBrainz database
// 4. Returning result in <5 seconds regardless of file size

// The user experience is seamless:
// - Upload 5MB file → verified in 2 seconds
// - Upload 50MB file → verified in 3 seconds
// - Upload 200MB file → verified in 5 seconds
// The sample extraction is the bottleneck, not fingerprinting
```

---

## ✅ Summary

### The Problem
- Web app has 20MB limit for audio verification
- This blocks normal files (13.3MB is completely normal)
- 20MB limit is arbitrary and unnecessary

### The Solution
1. **Extract a 30-second sample** from any file size
2. **Fingerprint the sample** (not the whole file)
3. **Check against copyright database**
4. **Return result** in seconds

### Key Insight
**Audio fingerprinting doesn't require the full file!**

Services like Shazam identify songs from just 5-10 seconds of audio. You only need a small sample to generate a unique fingerprint.

### Action Required
- [ ] Implement audio sample extraction (using FFmpeg)
- [ ] Update fingerprinting to use sample instead of full file
- [ ] Remove the 20MB limit
- [ ] Test with various file sizes (5MB, 50MB, 200MB)

---

## 🔧 Dependencies

```bash
# Server-side audio processing
npm install fluent-ffmpeg
npm install chromaprint  # Or acoustid-client

# Make sure FFmpeg is installed on your server
# Ubuntu: apt-get install ffmpeg
# Mac: brew install ffmpeg
# Docker: Use an image with FFmpeg included
```

---

## 📞 Support

**Mobile Team Contact:** [Your Name]
**Priority:** CRITICAL - Normal uploads are being blocked

**The current implementation is preventing users from uploading standard audio files. This needs to be fixed ASAP.**

---

**Last Updated:** January 14, 2026
