# Mobile Team Guide: ACRCloud Hybrid Audio Protection System

**Date:** January 4, 2026  
**Feature:** ACRCloud Audio Fingerprinting + ISRC Verification  
**Status:** Ready for Implementation  
**Priority:** High

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Implementation Flow](#implementation-flow)
6. [UI/UX Requirements](#uiux-requirements)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)
9. [Integration with Existing Features](#integration-with-existing-features)
10. [Testing Checklist](#testing-checklist)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The ACRCloud Hybrid Audio Protection System automatically fingerprints uploaded audio tracks to detect if they exist on streaming platforms. This prevents unauthorized uploads of copyrighted content and ensures proper ownership verification.

### Key Features

- **Automatic Audio Fingerprinting**: All music uploads are automatically checked via ACRCloud
- **ISRC Verification**: Matched tracks require ISRC code verification (via MusicBrainz)
- **Artist Name Matching**: Fuzzy matching prevents impersonation
- **Original Music Support**: Unreleased/original tracks can be uploaded without ISRC
- **Graceful Fallback**: System continues to work even if ACRCloud API fails
- **Rate Limiting & Caching**: Prevents API quota exhaustion

### Benefits

- ✅ Prevents unauthorized uploads of copyrighted music
- ✅ Automatically detects released vs. unreleased tracks
- ✅ Seamless user experience for original music
- ✅ Comprehensive ownership verification for covers/releases
- ✅ Reduces manual review workload

---

## 🔄 How It Works

### Upload Flow

```
1. User selects audio file
   ↓
2. System automatically calls ACRCloud fingerprinting API
   ↓
3. ACRCloud Response:
   
   IF Match Found:
   → Display detected track info (title, artist, album)
   → Require ISRC code verification
   → Perform fuzzy artist name matching
   → IF artist matches AND ISRC valid → Allow upload
   → IF artist doesn't match → Reject with clear message
   
   IF No Match:
   → Display "Appears to be original/unreleased music"
   → Require user confirmation checkbox
   → Allow upload without ISRC
   
   IF API Error/Timeout:
   → Fallback to manual selection
   → Flag for admin review
   → Allow upload to proceed
```

### Integration with Existing ISRC Verification

This system **extends** the existing cover song ISRC verification:
- **Before**: Users manually marked tracks as "cover songs" and provided ISRC
- **Now**: System automatically detects if a track is released and requires ISRC verification
- **Both methods work**: Users can still manually mark covers, or system auto-detects

---

## 🌐 API Endpoints

### 1. Fingerprint Audio File

**Endpoint:** `POST /api/upload/fingerprint`

**Purpose:** Fingerprint uploaded audio file via ACRCloud

**Authentication:** Required (Bearer token or session cookie)

**Request Body:**
```json
{
  "fileData": "data:audio/mpeg;base64,/9j/4AAQSkZJRg...", // Base64 encoded audio file
  "artistName": "John Doe" // Optional: For fuzzy matching
}
```

**Response - Match Found:**
```json
{
  "success": true,
  "matchFound": true,
  "requiresISRC": true,
  "detectedArtist": "Taylor Swift",
  "detectedTitle": "Shake It Off",
  "detectedAlbum": "1989",
  "detectedISRC": "USRC11405281",
  "detectedLabel": "Big Machine Records",
  "artistMatch": {
    "match": false,
    "confidence": 45.2
  },
  "artistMatchConfidence": 45.2,
  "detectedISRCVerified": true,
  "detectedISRCRecording": {
    "title": "Shake It Off",
    "artist-credit": [
      {
        "name": "Taylor Swift"
      }
    ]
  }
}
```

**Response - No Match:**
```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```

**Real-World Example - No Match (Original Music):**
```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```
This response is returned when ACRCloud finds no matches, indicating the track is likely original/unreleased music.

**Response - Error/Timeout:**
```json
{
  "success": false,
  "matchFound": false,
  "error": "ACRCloud request timeout. Please try again.",
  "errorCode": "TIMEOUT",
  "requiresManualReview": true
}
```

**Real-World Example - Quota Exceeded:**
```json
{
  "success": false,
  "matchFound": false,
  "error": "ACRCloud quota exceeded. Please try again later.",
  "errorCode": "QUOTA_EXCEEDED",
  "requiresManualReview": true
}
```

**Real-World Example - API Error:**
```json
{
  "success": false,
  "matchFound": false,
  "error": "ACRCloud API error: 500 Internal Server Error",
  "errorCode": "API_ERROR",
  "requiresManualReview": true
}
```

**Error Codes:**
- `QUOTA_EXCEEDED`: ACRCloud API quota exceeded (100 requests/day on free tier)
- `TIMEOUT`: Request timed out (10 seconds)
- `API_ERROR`: ACRCloud API error
- `INVALID_FILE`: Invalid audio file format/size

**Status Codes:**
- `200`: Success
- `400`: Bad request (missing file data)
- `401`: Unauthorized
- `500`: Internal server error

---

### 2. Verify ISRC Code (Existing Endpoint)

**Endpoint:** `POST /api/upload/verify-isrc`

**Purpose:** Verify ISRC code via MusicBrainz (already implemented)

**Note:** This endpoint works the same as before. The fingerprint endpoint may pre-fill ISRC codes detected by ACRCloud.

---

### 3. Upload Track (Existing Endpoint - Enhanced)

**Endpoint:** `POST /api/upload` (or your existing upload endpoint)

**Changes:** Now accepts `acrcloudData` in request body:

```json
{
  "title": "My Song",
  "artistName": "John Doe",
  "acrcloudData": {
    "matchFound": true,
    "detectedArtist": "Taylor Swift",
    "detectedTitle": "Shake It Off",
    "detectedISRC": "USRC11405281",
    "artistMatch": {
      "match": false,
      "confidence": 45.2
    },
    "detectedISRCVerified": true
  },
  // ... other upload fields
}
```

**Note:** The backend automatically stores ACRCloud data in the database.

---

## 🗄️ Database Schema

### New Fields in `audio_tracks` Table

```sql
-- ACRCloud Fingerprinting Fields
acrcloud_checked BOOLEAN DEFAULT FALSE,
acrcloud_match_found BOOLEAN NULL,
acrcloud_detected_artist TEXT NULL,
acrcloud_detected_title TEXT NULL,
acrcloud_detected_isrc VARCHAR(12) NULL,
acrcloud_detected_album TEXT NULL,
acrcloud_detected_label TEXT NULL,
acrcloud_checked_at TIMESTAMPTZ NULL,
acrcloud_response_data JSONB NULL,

-- Ownership Verification Fields
is_released BOOLEAN DEFAULT FALSE,
release_status VARCHAR(50) DEFAULT 'pending_review' 
  CHECK (release_status IN ('released_verified', 'unreleased_original', 'pending_review', 'cover', 'rejected')),
ownership_verified BOOLEAN DEFAULT FALSE,
ownership_verified_at TIMESTAMPTZ NULL,
artist_name_match BOOLEAN NULL,
artist_name_match_confidence DECIMAL(5,2) NULL
```

### Release Status Values

- `released_verified`: Released track with verified ownership (artist match + ISRC)
- `unreleased_original`: Unreleased/original track (no ACRCloud match)
- `pending_review`: Needs admin review (API error, artist mismatch, etc.)
- `cover`: Cover song (user manually marked or system detected)
- `rejected`: Upload rejected (ownership verification failed)

---

## 📱 Implementation Flow

### Step 1: User Selects Audio File

```typescript
// When user selects audio file in upload form
const handleFileSelect = async (file: File) => {
  // Store file
  setAudioFile(file);
  
  // Automatically trigger fingerprinting (for music tracks only)
  if (contentType === 'music') {
    await fingerprintAudio(file);
  }
};
```

### Step 2: Call Fingerprint API

```typescript
const fingerprintAudio = async (file: File) => {
  setAcrcloudStatus('checking');
  
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    // Call fingerprint API
    const response = await fetch('/api/upload/fingerprint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` // or use session
      },
      body: JSON.stringify({
        fileData: base64Data,
        artistName: artistName || undefined
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // Handle error
      handleAcrcloudError(data);
      return;
    }
    
    if (data.matchFound) {
      // Match found - require ISRC
      handleMatchFound(data);
    } else {
      // No match - original music
      handleNoMatch(data);
    }
  } catch (error) {
    handleAcrcloudError({ error: error.message });
  }
};

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
```

### Step 3: Handle Match Found

```typescript
const handleMatchFound = (data: AcrcloudMatchResult) => {
  setAcrcloudStatus('match');
  setAcrcloudData(data);
  
  // Pre-fill ISRC if detected
  if (data.detectedISRC && !isrcCode) {
    setIsrcCode(data.detectedISRC);
    
    // Auto-verify if ISRC was verified by API
    if (data.detectedISRCVerified) {
      setIsrcVerificationStatus('success');
      setIsrcVerificationData(data.detectedISRCRecording);
    }
  }
  
  // Auto-check "cover song" if match found
  setIsCover(true);
  
  // Show UI with detected track info
  showMatchFoundUI(data);
};
```

### Step 4: Handle No Match

```typescript
const handleNoMatch = (data: AcrcloudNoMatchResult) => {
  setAcrcloudStatus('no_match');
  setAcrcloudData(data);
  
  // Show confirmation checkbox for original music
  showOriginalMusicConfirmationUI();
};
```

### Step 5: Handle Errors

```typescript
const handleAcrcloudError = (error: any) => {
  setAcrcloudStatus('error');
  setAcrcloudError(error.error || 'Fingerprinting failed');
  
  // Allow upload to proceed but flag for review
  setAcrcloudData({ requiresManualReview: true });
  
  // Show error UI with fallback option
  showErrorUI(error);
};
```

### Step 6: Upload with ACRCloud Data

```typescript
const handleUpload = async () => {
  const uploadData = {
    title: title,
    artistName: artistName,
    // ... other fields
    
    // Include ACRCloud data
    acrcloudData: acrcloudData || null,
    
    // ISRC data (if cover song or match found)
    isCover: isCover || (acrcloudStatus === 'match'),
    isrcCode: isrcCode || null
  };
  
  // Call your existing upload API
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(uploadData)
  });
  
  // Handle response...
};
```

---

## 🎨 UI/UX Requirements

### Visual Reference

**Note:** The web app implementation serves as the visual reference. The mobile team should review the web upload page (`/upload`) to see the actual UI implementation. The states below describe what information to display and how to structure it.

### 1. Loading State (Checking)

**Display When:** `acrcloudStatus === 'checking'`

**UI Elements:**
- Loading spinner (blue/primary color)
- Text: "Verifying audio content..."
- Subtitle: "Checking if this track exists on streaming platforms"

**API Status:** Request in progress to `/api/upload/fingerprint`

**Example:**
```
[Spinner Icon] Verifying audio content...
              Checking if this track exists on streaming platforms
```

### 2. Match Found State

**Display When:** `acrcloudStatus === 'match'` and `acrcloudData.matchFound === true`

**UI Elements:**
- Warning/Alert icon (yellow/orange color scheme)
- Heading: "This song appears to be a released track"
- Detected Information (display from API response):
  - Title: `acrcloudData.detectedTitle`
  - Artist: `acrcloudData.detectedArtist`
  - Album: `acrcloudData.detectedAlbum` (if available)
  - Label: `acrcloudData.detectedLabel` (if available)
- Message: "To upload this track, please provide a valid ISRC code for verification."
- ISRC Input Field: Pre-filled with `acrcloudData.detectedISRC` (if available)
- ISRC Verification Status: Show loading/success/error states (uses existing ISRC verification UI)

**Real API Response Example:**
```json
{
  "success": true,
  "matchFound": true,
  "detectedArtist": "Taylor Swift",
  "detectedTitle": "Shake It Off",
  "detectedAlbum": "1989",
  "detectedISRC": "USRC11405281",
  "detectedLabel": "Big Machine Records",
  "artistMatch": {
    "match": false,
    "confidence": 45.2
  }
}
```

**UI Layout:**
```
⚠️ This song appears to be a released track

Title: Shake It Off
Artist: Taylor Swift
Album: 1989

To upload this track, please provide a valid ISRC code for verification.

ISRC Code: [USRC11405281]  ← Pre-filled
Status: [Verifying...] or [✅ Verified]
```

**Special Case - Artist Mismatch:**
When `acrcloudData.artistMatch.match === false`:

**Display:**
- Error/Warning icon (red/orange color)
- Message: `"⚠️ Artist name mismatch. This track belongs to "${acrcloudData.detectedArtist}". Please verify ownership with ISRC."`
- Block upload until user confirms or provides valid ISRC

### 3. No Match State

**Display When:** `acrcloudStatus === 'no_match'` and `acrcloudData.matchFound === false`

**UI Elements:**
- Success/Checkmark icon (green color scheme)
- Heading: "This appears to be original/unreleased music"
- Message: "No match found in music databases. You can proceed with upload."
- Checkbox: "I confirm this is my original/unreleased music and I own all rights to it"
- Upload button enabled only when checkbox is checked

**Real API Response Example:**
```json
{
  "success": true,
  "matchFound": false,
  "requiresISRC": false,
  "isUnreleased": true
}
```

**UI Layout:**
```
✅ This appears to be original/unreleased music

No match found in music databases. You can proceed with upload.

☐ I confirm this is my original/unreleased music and I own all rights to it

[Continue Upload] (disabled until checked)
```

### 4. Error State

**Display When:** `acrcloudStatus === 'error'`

**UI Elements:**
- Warning/Info icon (gray/yellow color)
- Heading: "Audio verification unavailable"
- Error message: Display `acrcloudError` value
- Message: "Fingerprinting failed. You can still proceed with upload. Your track will be flagged for manual review."
- Upload button enabled (allows upload to proceed)

**Real API Response Example:**
```json
{
  "success": false,
  "matchFound": false,
  "error": "ACRCloud request timeout. Please try again.",
  "errorCode": "TIMEOUT",
  "requiresManualReview": true
}
```

**UI Layout:**
```
⚠️ Audio verification unavailable

ACRCloud request timeout. Please try again.

Fingerprinting failed. You can still proceed with upload. Your track will be flagged for manual review.

[Continue Upload]
```

### Visual Guidelines

- **Loading State**: Use your app's standard loading spinner with informative text
- **Match Found**: Yellow/orange alert box (warning style) with detected track information
- **No Match**: Green success box with confirmation checkbox (similar to terms & conditions UI)
- **Error State**: Gray/warning box with error message and fallback option
- **Artist Mismatch**: Red error box with clear explanation and blocked upload state

### Integration with Existing UI

The ACRCloud verification UI should be placed:
- **Location**: After the audio file selection, before or within the "Basic Information" section
- **For Music Tracks Only**: Only show for `contentType === 'music'`
- **Non-Blocking**: User can fill other form fields while fingerprinting is in progress
- **ISRC Field Integration**: When match found, the ISRC input field (existing cover song UI) should be displayed and pre-filled

---

## ⚠️ Error Handling

### Error Scenarios

#### 1. ACRCloud Quota Exceeded

```typescript
if (error.errorCode === 'QUOTA_EXCEEDED') {
  // Show message: "Daily limit reached. Please try again tomorrow."
  // Allow upload with manual review flag
  setAcrcloudData({ requiresManualReview: true, quotaExceeded: true });
}
```

#### 2. API Timeout

```typescript
if (error.errorCode === 'TIMEOUT') {
  // Show message: "Verification timed out. You can still proceed."
  // Allow upload with manual review flag
  setAcrcloudData({ requiresManualReview: true, timeout: true });
}
```

#### 3. Artist Name Mismatch

```typescript
if (data.artistMatch && !data.artistMatch.match) {
  // Reject upload with clear message
  showError('This track belongs to "${data.detectedArtist}". Please verify ownership.');
  // Block upload until user confirms or provides ISRC
}
```

#### 4. Network Error

```typescript
catch (error) {
  // Network or other errors
  setAcrcloudStatus('error');
  setAcrcloudError('Network error. Please check your connection.');
  // Allow upload with manual review flag
  setAcrcloudData({ requiresManualReview: true });
}
```

---

## 💻 Code Examples

### TypeScript Interfaces

```typescript
interface AcrcloudMatchResult {
  success: boolean;
  matchFound: true;
  requiresISRC: true;
  detectedArtist: string;
  detectedTitle: string;
  detectedAlbum?: string;
  detectedLabel?: string;
  detectedISRC?: string;
  artistMatch: {
    match: boolean;
    confidence: number;
  };
  artistMatchConfidence: number;
  detectedISRCVerified?: boolean;
  detectedISRCRecording?: any;
}

interface AcrcloudNoMatchResult {
  success: boolean;
  matchFound: false;
  requiresISRC: false;
  isUnreleased: true;
}

interface AcrcloudErrorResult {
  success: false;
  matchFound: false;
  error: string;
  errorCode: 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'API_ERROR' | 'INVALID_FILE';
  requiresManualReview: true;
}

type AcrcloudResult = AcrcloudMatchResult | AcrcloudNoMatchResult | AcrcloudErrorResult;

type AcrcloudStatus = 'idle' | 'checking' | 'match' | 'no_match' | 'error';
```

### State Management

```typescript
const [acrcloudStatus, setAcrcloudStatus] = useState<AcrcloudStatus>('idle');
const [acrcloudData, setAcrcloudData] = useState<AcrcloudResult | null>(null);
const [acrcloudError, setAcrcloudError] = useState<string | null>(null);
const [isOriginalConfirmed, setIsOriginalConfirmed] = useState(false);
```

### Validation Logic

```typescript
const validateUpload = (): string | null => {
  // ... other validations
  
  // ACRCloud validation
  if (acrcloudStatus === 'checking') {
    return 'Please wait for audio verification to complete';
  }
  
  if (acrcloudStatus === 'match') {
    // Match found - require ISRC verification
    if (!isrcCode || isrcCode.trim() === '') {
      return 'ISRC code is required. This track appears to be a released song.';
    }
    
    if (isrcVerificationStatus !== 'success') {
      return 'ISRC code must be verified before uploading';
    }
    
    // Check artist name match
    if (acrcloudData?.matchFound && 
        acrcloudData.artistMatch && 
        !acrcloudData.artistMatch.match) {
      return `This track belongs to "${acrcloudData.detectedArtist}". If this is you, ensure your profile name matches.`;
    }
  }
  
  if (acrcloudStatus === 'no_match' && !isOriginalConfirmed) {
    return 'Please confirm this is your original/unreleased music';
  }
  
  return null; // Validation passed
};
```

---

## 🔗 Integration with Existing Features

### Integration with ISRC Verification

The ACRCloud system **extends** your existing ISRC verification:

1. **Automatic Detection**: System auto-detects released tracks and requires ISRC
2. **Pre-fill ISRC**: If ACRCloud detects an ISRC, it's pre-filled in the form
3. **Manual Override**: Users can still manually mark tracks as "cover songs"
4. **Same Verification**: Uses the same `/api/upload/verify-isrc` endpoint

### Integration with Upload Flow

```typescript
// Your existing upload flow
const uploadTrack = async (trackData: TrackUploadData) => {
  // ... existing validation
  
  // Add ACRCloud data to upload request
  const uploadPayload = {
    ...trackData,
    acrcloudData: acrcloudData || null,
    isCover: isCover || (acrcloudStatus === 'match'),
    isrcCode: (isCover || acrcloudStatus === 'match') ? isrcCode : undefined
  };
  
  // Call upload API
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: JSON.stringify(uploadPayload)
  });
  
  // ... handle response
};
```

---

## ✅ Testing Checklist

### Test Cases

#### 1. Upload Released Track (Should Match)

- [ ] Upload a popular song (e.g., "Shape of You" by Ed Sheeran)
- [ ] Verify ACRCloud detects the track
- [ ] Verify ISRC field is pre-filled (if available)
- [ ] Verify artist name matching works
- [ ] Verify upload is blocked until ISRC is verified
- [ ] Verify upload succeeds after ISRC verification

#### 2. Upload Original Track (Should Not Match)

- [ ] Upload an unreleased demo track
- [ ] Verify ACRCloud returns "no match"
- [ ] Verify "original music" confirmation appears
- [ ] Verify upload succeeds after confirmation checkbox is checked

#### 3. Artist Name Mismatch

- [ ] Upload a track that belongs to another artist
- [ ] Verify artist mismatch warning appears
- [ ] Verify upload is blocked
- [ ] Verify clear error message is shown

#### 4. ACRCloud API Error

- [ ] Simulate API timeout (or wait for quota)
- [ ] Verify error state is shown
- [ ] Verify upload can still proceed
- [ ] Verify track is flagged for manual review

#### 5. Network Error

- [ ] Disable network during fingerprinting
- [ ] Verify error handling works
- [ ] Verify graceful fallback

#### 6. Integration with Manual Cover Song

- [ ] Manually mark track as "cover song"
- [ ] Verify ACRCloud still runs (but doesn't override manual selection)
- [ ] Verify both systems work together

#### 7. Pre-filled ISRC Verification

- [ ] Upload track where ACRCloud detects ISRC
- [ ] Verify ISRC is pre-filled
- [ ] Verify ISRC is auto-verified if API verified it
- [ ] Verify user can edit/change ISRC if needed

---

## 🐛 Troubleshooting

### Issue: "ACRCloud credentials not configured"

**Solution:**
- Verify environment variables are set correctly
- Check that `ACRCLOUD_ENABLED=true` in backend
- Ensure API keys are correct

### Issue: Fingerprinting always fails

**Possible Causes:**
- ACRCloud quota exceeded (100 requests/day on free tier)
- Network connectivity issues
- Invalid audio file format
- Backend API errors

**Solution:**
- Check ACRCloud dashboard for quota usage
- Verify audio file is valid format (MP3, WAV, M4A, etc.)
- Check backend logs for errors
- System should fallback gracefully

### Issue: ISRC not pre-filled

**Possible Causes:**
- ACRCloud didn't detect ISRC for the track
- ISRC field not in ACRCloud database
- API response parsing issue

**Solution:**
- This is normal - not all tracks have ISRC in ACRCloud
- User can manually enter ISRC
- System will verify via MusicBrainz

### Issue: Artist matching too strict/loose

**Current Threshold:** 85% similarity (configurable in backend)

**Solution:**
- If too strict: Backend can lower threshold
- If too loose: Backend can raise threshold
- Manual review handles edge cases

---

## 📊 API Rate Limits

### ACRCloud Free Tier

- **100 identification requests per day**
- Resets every 24 hours
- Upgrade to paid plan for more requests

### Best Practices

1. **Cache Results**: Backend caches fingerprinting results (by file hash)
2. **Only Fingerprint Music**: Don't fingerprint podcasts/other audio
3. **Handle Quota Gracefully**: Show clear message if quota exceeded
4. **Monitor Usage**: Check ACRCloud dashboard regularly

---

## 📝 Notes for Mobile Team

### Important Points

1. **Automatic Triggering**: Fingerprinting should trigger automatically when user selects audio file (for music tracks only)

2. **Non-Blocking**: Fingerprinting should not block the upload form - user can fill other fields while checking

3. **Graceful Degradation**: System must work even if ACRCloud is unavailable

4. **User Experience**: 
   - Show loading state during fingerprinting
   - Provide clear, actionable messages
   - Don't overwhelm users with technical details

5. **Privacy**: Explain to users why fingerprinting is needed (copyright protection)

6. **Performance**: 
   - Fingerprinting can take 5-10 seconds
   - Consider showing progress indicator
   - Don't block UI thread

### Backend Support

The backend team has already implemented:
- ✅ ACRCloud API integration
- ✅ Fingerprinting endpoint (`/api/upload/fingerprint`)
- ✅ Database schema updates
- ✅ Upload endpoint enhancements
- ✅ Caching and rate limiting
- ✅ Error handling

**Mobile team needs to:**
- ✅ Integrate fingerprinting API call
- ✅ Handle ACRCloud responses
- ✅ Update UI to show verification states
- ✅ Integrate with existing ISRC verification
- ✅ Update upload flow to include ACRCloud data

---

## 🚀 Getting Started

### Step 1: Review Existing Code

- Review existing ISRC verification implementation
- Understand upload flow and state management
- Check API authentication method (Bearer token or session)

### Step 2: Add State Management

Add ACRCloud state variables to your upload component:

```typescript
const [acrcloudStatus, setAcrcloudStatus] = useState<AcrcloudStatus>('idle');
const [acrcloudData, setAcrcloudData] = useState<AcrcloudResult | null>(null);
const [acrcloudError, setAcrcloudError] = useState<string | null>(null);
const [isOriginalConfirmed, setIsOriginalConfirmed] = useState(false);
```

### Step 3: Implement Fingerprinting Function

Implement the `fingerprintAudio` function (see Code Examples section).

### Step 4: Update UI Components

Add UI components for each ACRCloud state (loading, match, no match, error).

### Step 5: Update Validation

Add ACRCloud validation to your upload validation logic.

### Step 6: Update Upload Flow

Include `acrcloudData` in upload request payload.

### Step 7: Test Thoroughly

Follow the Testing Checklist to ensure everything works correctly.

---

## 📞 Support

If you encounter issues or need clarification:

1. Check this document first
2. Review backend API responses in browser dev tools
3. Check backend logs for errors
4. Contact backend team if API issues persist
5. Check ACRCloud dashboard for quota/usage issues

---

## 🔄 Updates and Changes

**Last Updated:** January 4, 2026

**Changelog:**
- Initial implementation guide created
- Integration with existing ISRC verification documented
- Error handling and fallback scenarios documented
- Testing checklist provided

---

**Mobile Team Contact:** [Your contact information]  
**Backend Team Contact:** [Backend team contact]  
**Documentation:** This document

---

**Ready to implement! Good luck! 🚀**

