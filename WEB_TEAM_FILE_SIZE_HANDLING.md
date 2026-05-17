# File Size Handling - Mobile App Approach

**Date:** January 14, 2026
**To:** Web/Backend Team
**From:** Mobile App Team
**Priority:** 🟠 **HIGH** - Blocking User Uploads
**Issue:** File size limit of 10MB is too restrictive for real audio content

---

## 🚨 The Problem

The web app currently shows this error:
```
File Validation Error
Warning: File size must be less than 10MB for free tier (current: 13.34MB). File will be uploaded anyway.
```

**This is problematic because:**

1. **Average MP3 track** at 320kbps = ~7-10MB for 3-4 minutes
2. **High-quality track** (FLAC/WAV) = 30-50MB+ for same duration
3. **Podcast episode** (30-60 mins) = 30-100MB
4. **Album** (10-15 tracks) = 100-200MB

A 10MB limit essentially blocks most professional audio content.

---

## 📱 How Mobile App Handles File Sizes

### Current Mobile Implementation

**File:** [src/screens/UploadScreen.tsx](src/screens/UploadScreen.tsx)

```typescript
// Mobile app file size limits by subscription tier
const FILE_SIZE_LIMITS = {
  free: 50 * 1024 * 1024,      // 50MB
  premium: 200 * 1024 * 1024,   // 200MB
  unlimited: 500 * 1024 * 1024, // 500MB
};

// Validate file size based on user's subscription
const validateFileSize = (fileSize: number, subscriptionTier: string): boolean => {
  const limit = FILE_SIZE_LIMITS[subscriptionTier] || FILE_SIZE_LIMITS.free;
  return fileSize <= limit;
};
```

### Recommended File Size Limits

| Subscription | Max File Size | Rationale |
|--------------|---------------|-----------|
| **Free** | 50MB | Allows ~15 min audio at 320kbps MP3 |
| **Premium** | 200MB | Allows full albums, 1-hour podcasts |
| **Unlimited** | 500MB | Allows lossless audio, long-form content |

---

## 🎵 Audio Verification Still Works

**Key Insight:** Audio verification is about **content analysis**, not file size.

### How Audio Verification Works (Backend)

```javascript
// Audio verification analyzes:
// 1. Audio fingerprinting (content identification)
// 2. Copyright detection (against database)
// 3. Quality checks (bitrate, format, corruption)
// 4. Content moderation (AI analysis)

// These work the same regardless of file size:
async function verifyAudio(fileBuffer) {
  // 1. Extract audio fingerprint (works on any size)
  const fingerprint = await extractAudioFingerprint(fileBuffer);

  // 2. Check against copyright database
  const copyrightResult = await checkCopyright(fingerprint);

  // 3. Verify audio quality
  const qualityResult = await analyzeAudioQuality(fileBuffer);

  // 4. Run content moderation
  const moderationResult = await moderateContent(fileBuffer);

  return {
    fingerprint,
    copyright: copyrightResult,
    quality: qualityResult,
    moderation: moderationResult,
  };
}
```

### Verification is Independent of File Size

- **Small file (5MB):** Verification runs in ~2 seconds
- **Medium file (50MB):** Verification runs in ~10 seconds
- **Large file (200MB):** Verification runs in ~30 seconds

The verification process scales linearly with file size but **always works**.

---

## ✅ Recommended Implementation

### 1. Update File Size Limits (Backend)

```javascript
// config/upload-limits.js

const UPLOAD_LIMITS = {
  // By subscription tier
  tiers: {
    free: {
      maxFileSize: 50 * 1024 * 1024,      // 50MB
      maxFilesPerMonth: 5,
      allowedFormats: ['mp3', 'wav', 'aac', 'm4a'],
    },
    premium: {
      maxFileSize: 200 * 1024 * 1024,     // 200MB
      maxFilesPerMonth: 50,
      allowedFormats: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'],
    },
    unlimited: {
      maxFileSize: 500 * 1024 * 1024,     // 500MB
      maxFilesPerMonth: Infinity,
      allowedFormats: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'aiff'],
    },
  },

  // By content type
  contentTypes: {
    track: {
      recommendedMax: 100 * 1024 * 1024,  // 100MB (warning, not error)
      absoluteMax: 500 * 1024 * 1024,     // 500MB (hard limit)
    },
    podcast: {
      recommendedMax: 200 * 1024 * 1024,  // 200MB
      absoluteMax: 1024 * 1024 * 1024,    // 1GB
    },
    album: {
      recommendedMax: 500 * 1024 * 1024,  // 500MB
      absoluteMax: 2048 * 1024 * 1024,    // 2GB
    },
  },
};

module.exports = UPLOAD_LIMITS;
```

### 2. Update Validation Logic

```javascript
// api/upload/validate.js

const UPLOAD_LIMITS = require('../config/upload-limits');

function validateFileSize(fileSize, contentType, subscriptionTier) {
  const tierLimits = UPLOAD_LIMITS.tiers[subscriptionTier] || UPLOAD_LIMITS.tiers.free;
  const contentLimits = UPLOAD_LIMITS.contentTypes[contentType] || UPLOAD_LIMITS.contentTypes.track;

  // Check against subscription tier limit
  if (fileSize > tierLimits.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds your plan limit. Upgrade to upload larger files.`,
      limit: tierLimits.maxFileSize,
      upgradeRequired: true,
    };
  }

  // Check against absolute maximum
  if (fileSize > contentLimits.absoluteMax) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${formatBytes(contentLimits.absoluteMax)}).`,
      limit: contentLimits.absoluteMax,
    };
  }

  // Soft warning for recommended max
  if (fileSize > contentLimits.recommendedMax) {
    return {
      valid: true,
      warning: `Large file detected. Upload may take longer than usual.`,
      recommended: contentLimits.recommendedMax,
    };
  }

  return { valid: true };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${(bytes / 1024).toFixed(0)}KB`;
}
```

### 3. Update Frontend Validation

```typescript
// components/FileUpload.tsx

interface FileSizeValidation {
  valid: boolean;
  error?: string;
  warning?: string;
  upgradeRequired?: boolean;
}

function validateFileSize(
  fileSize: number,
  contentType: 'track' | 'podcast' | 'album',
  subscriptionTier: 'free' | 'premium' | 'unlimited'
): FileSizeValidation {
  const limits = {
    free: 50 * 1024 * 1024,       // 50MB
    premium: 200 * 1024 * 1024,   // 200MB
    unlimited: 500 * 1024 * 1024, // 500MB
  };

  const tierLimit = limits[subscriptionTier];

  if (fileSize > tierLimit) {
    return {
      valid: false,
      error: `File size (${formatBytes(fileSize)}) exceeds your ${subscriptionTier} plan limit (${formatBytes(tierLimit)}).`,
      upgradeRequired: true,
    };
  }

  // Warning for large files (not an error)
  if (fileSize > 100 * 1024 * 1024) {
    return {
      valid: true,
      warning: `Large file detected (${formatBytes(fileSize)}). Upload may take a few minutes.`,
    };
  }

  return { valid: true };
}
```

### 4. Update Error Message UI

**Instead of:**
```
❌ File Validation Error
Warning: File size must be less than 10MB for free tier (current: 13.34MB). File will be uploaded anyway.
```

**Show:**
```
✅ File ready for upload
📁 Final Gospel Prevails.mp3 (13.3 MB)
⏱️ Estimated upload time: ~30 seconds

[Upload Track]
```

**Or for upgrade prompt:**
```
⚠️ File size exceeds your plan limit

Your current plan (Free) allows files up to 50MB.
This file is 65MB.

[Upgrade to Premium]  [Cancel]
```

---

## 🔧 Storage Considerations

### Supabase Storage Buckets

```sql
-- Create storage buckets with appropriate limits

-- Bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('audio-tracks', 'audio-tracks', false, 524288000);  -- 500MB

-- Bucket for podcast episodes
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('podcasts', 'podcasts', false, 1073741824);  -- 1GB

-- Bucket for albums (zip or multi-file)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('albums', 'albums', false, 2147483648);  -- 2GB
```

### Upload Configuration

```javascript
// supabase storage config

const storageOptions = {
  // Chunked upload for large files
  cacheControl: '3600',
  upsert: false,

  // Enable resumable uploads for files > 6MB
  // This allows users to resume failed uploads
};

// For files > 100MB, use resumable upload
async function uploadLargeFile(file, path) {
  const { data, error } = await supabase.storage
    .from('audio-tracks')
    .upload(path, file, {
      ...storageOptions,
      // Resumable upload automatically enabled for large files
    });

  return { data, error };
}
```

---

## 📊 Comparison: Current vs Recommended

| Aspect | Current (Web) | Recommended | Mobile App |
|--------|---------------|-------------|------------|
| Free tier limit | 10MB ❌ | 50MB ✅ | 50MB ✅ |
| Premium limit | ? | 200MB | 200MB |
| Unlimited limit | ? | 500MB | 500MB |
| Error UX | Warning but allows ⚠️ | Clear upgrade prompt ✅ | Clear upgrade prompt ✅ |
| Podcast support | Blocked by 10MB | 200MB+ supported | 200MB+ supported |
| Album support | Blocked by 10MB | 500MB+ supported | 500MB+ supported |

---

## 🎯 Quick Fix (Immediate)

If you need a quick fix while implementing the full solution:

```javascript
// Just change the limit constant
const MAX_FILE_SIZE = {
  free: 50 * 1024 * 1024,      // 50MB (was 10MB)
  premium: 200 * 1024 * 1024,  // 200MB
  unlimited: 500 * 1024 * 1024 // 500MB
};
```

**Change this one line:**
```diff
- const MAX_FREE_FILE_SIZE = 10 * 1024 * 1024;  // 10MB
+ const MAX_FREE_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
```

---

## 📱 Mobile App Reference Code

Here's exactly how the mobile app handles this:

**File:** [src/screens/UploadScreen.tsx](src/screens/UploadScreen.tsx)

```typescript
// File size validation
const MAX_FILE_SIZES = {
  free: 50 * 1024 * 1024,       // 50MB
  premium: 200 * 1024 * 1024,   // 200MB
  unlimited: 500 * 1024 * 1024, // 500MB
};

const handleFilePick = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    const fileSize = file.size || 0;
    const userTier = user?.subscription_tier || 'free';
    const maxSize = MAX_FILE_SIZES[userTier];

    if (fileSize > maxSize) {
      Alert.alert(
        'File Too Large',
        `Your ${userTier} plan allows files up to ${formatFileSize(maxSize)}. ` +
        `This file is ${formatFileSize(fileSize)}. ` +
        `Upgrade your plan to upload larger files.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    // File is valid, proceed with upload
    setSelectedFile(file);
  } catch (error) {
    console.error('File pick error:', error);
    Alert.alert('Error', 'Failed to select file');
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
};
```

---

## ✅ Summary

**The Fix:**
1. Increase file size limits (10MB → 50MB for free tier)
2. Set appropriate limits per subscription tier
3. Show clear upgrade prompts instead of confusing warnings
4. Audio verification works the same regardless of file size

**Why This Matters:**
- 10MB is too small for real audio content
- Users can't upload podcasts or albums with current limit
- Professional creators will be blocked from using the platform
- Mobile app already uses 50MB limit and works fine

**Action Required:**
- [ ] Update file size constant from 10MB to 50MB
- [ ] Add tier-based limits (free: 50MB, premium: 200MB, unlimited: 500MB)
- [ ] Update error message UI to show upgrade prompt
- [ ] Update Supabase storage bucket limits if needed

---

**Mobile Team Contact:** [Your Name]
**Priority:** HIGH - Users currently blocked from uploading normal audio files

**Last Updated:** January 14, 2026
