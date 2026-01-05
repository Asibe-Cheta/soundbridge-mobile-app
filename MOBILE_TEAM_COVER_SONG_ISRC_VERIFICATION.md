# 📱 Mobile Team: Cover Song ISRC Verification Implementation Guide

**Date:** January 2, 2026  
**Feature:** Cover Song Verification with MusicBrainz ISRC Integration  
**Priority:** High  
**Status:** Backend Ready - Mobile Implementation Required

---

## 📋 Overview

This document provides complete implementation details for adding cover song ISRC (International Standard Recording Code) verification to the mobile app's audio upload flow. The backend API is fully implemented and ready to use.

### What This Feature Does

- Allows users to mark tracks as cover songs during upload
- Requires ISRC code entry for cover songs
- Verifies ISRC codes via MusicBrainz API in real-time
- Prevents upload if ISRC verification fails
- Stores verified ISRC data with track metadata

---

## 🎯 Requirements

### User Flow

1. User selects "This is a cover song" checkbox/toggle
2. ISRC input field appears (required)
3. User enters ISRC code (e.g., `GBUM71502800` or `GB-UM7-15-02800`)
4. App automatically verifies ISRC (with 500ms debounce)
5. Shows verification status (loading → success/error)
6. Upload button only enabled if:
   - Track is NOT a cover song, OR
   - Track IS a cover song AND ISRC is verified

### Validation Rules

- **ISRC Format:** `XX-XXX-YY-NNNNN` (12 characters)
  - Accepts with or without hyphens
  - Example: `GBUM71502800` or `GB-UM7-15-02800`
- **Cover songs:** MUST have verified ISRC before upload
- **Original songs:** No ISRC required

---

## 🔌 API Endpoints

### 1. Verify ISRC Code

**Endpoint:** `POST /api/upload/verify-isrc`

**Request:**
```json
{
  "isrc": "GBUM71502800"
}
```

**Response (Success):**
```json
{
  "success": true,
  "verified": true,
  "recording": {
    "id": "xxx-xxx-xxx",
    "title": "Oceans (Where Feet May Fail)",
    "artist-credit": [
      {
        "name": "Hillsong UNITED",
        "artist": {
          "name": "Hillsong UNITED"
        }
      }
    ],
    "isrcs": ["AUUS12345678"]
  },
  "cached": false
}
```

**Response (Error - Invalid Format):**
```json
{
  "success": false,
  "verified": false,
  "error": "Invalid ISRC format. Should be 12 characters (XX-XXX-YY-NNNNN)",
  "errorCode": "INVALID_FORMAT",
  "cached": false
}
```

**Response (Error - Not Found):**
```json
{
  "success": false,
  "verified": false,
  "error": "ISRC not found in MusicBrainz database. Ensure your cover is distributed first.",
  "errorCode": "NOT_FOUND",
  "cached": false
}
```

**Response (Error - Timeout):**
```json
{
  "success": false,
  "verified": false,
  "error": "Verification timeout. Please try again.",
  "errorCode": "TIMEOUT",
  "cached": false
}
```

**Response (Error - Rate Limit):**
```json
{
  "success": false,
  "verified": false,
  "error": "Too many requests. Please wait a moment and try again.",
  "errorCode": "RATE_LIMIT",
  "cached": false
}
```

### 2. Upload Track (Updated)

**Endpoint:** `POST /api/upload`

**Request (Cover Song):**
```json
{
  "title": "My Cover Song",
  "artistName": "My Name",
  "description": "Cover description",
  "genre": "Gospel",
  "tags": ["cover", "gospel"],
  "privacy": "public",
  "publishOption": "now",
  "audioFileUrl": "https://...",
  "coverArtUrl": "https://...",
  "duration": 180,
  "lyrics": "...",
  "lyricsLanguage": "en",
  "isCover": true,
  "isrcCode": "GBUM71502800",
  "audioQuality": "standard",
  "bitrate": 128,
  "sampleRate": 44100,
  "channels": 2,
  "codec": "mp3"
}
```

**Request (Original Song):**
```json
{
  "title": "My Original Song",
  "artistName": "My Name",
  // ... other fields ...
  "isCover": false,
  // isrcCode not included
}
```

**Response:** (Same as existing upload endpoint)

---

## 🗄️ Database Schema

The `audio_tracks` table now includes:

```sql
is_cover BOOLEAN DEFAULT false
isrc_code VARCHAR(12)
isrc_verified BOOLEAN DEFAULT false
isrc_verified_at TIMESTAMPTZ
```

### TypeScript Interface (Recommended)

```typescript
interface AudioTrack {
  id: string;
  title: string;
  artist_name: string;
  // ... existing fields ...
  
  // New ISRC fields
  is_cover?: boolean;
  isrc_code?: string | null;
  isrc_verified?: boolean;
  isrc_verified_at?: string | null;
}
```

---

## 📱 UI/UX Implementation

### 1. Form State Management

```typescript
// State variables needed
const [isCover, setIsCover] = useState(false);
const [isrcCode, setIsrcCode] = useState('');
const [isrcVerificationStatus, setIsrcVerificationStatus] = useState<
  'idle' | 'loading' | 'success' | 'error'
>('idle');
const [isrcVerificationError, setIsrcVerificationError] = useState<string | null>(null);
const [isrcVerificationData, setIsrcVerificationData] = useState<any>(null);
const isrcVerificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

### 2. ISRC Format Validation (Client-Side)

```typescript
function validateISRCFormat(isrc: string): { valid: boolean; normalized?: string; error?: string } {
  if (!isrc || typeof isrc !== 'string') {
    return { valid: false, error: 'ISRC code is required' };
  }

  // Remove hyphens and spaces, convert to uppercase
  const normalized = isrc.replace(/[-\s]/g, '').toUpperCase();

  // Must be exactly 12 characters
  if (normalized.length !== 12) {
    return {
      valid: false,
      error: 'Invalid ISRC format. Should be 12 characters (XX-XXX-YY-NNNNN)'
    };
  }

  // Must be alphanumeric (last 5 must be digits)
  if (!/^[A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{2}[0-9]{5}$/.test(normalized)) {
    return {
      valid: false,
      error: 'Invalid ISRC format. Should be XX-XXX-YY-NNNNN (alphanumeric, last 5 digits)'
    };
  }

  return { valid: true, normalized };
}
```

### 3. Verify ISRC Function

```typescript
const verifyISRCCode = async (isrc: string) => {
  if (!isrc || !isrc.trim()) {
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);
    return;
  }

  setIsrcVerificationStatus('loading');
  setIsrcVerificationError(null);

  try {
    const response = await fetch('https://www.soundbridge.live/api/upload/verify-isrc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isrc: isrc.trim() }),
    });

    const data = await response.json();

    if (data.success && data.verified) {
      setIsrcVerificationStatus('success');
      setIsrcVerificationError(null);
      setIsrcVerificationData(data.recording);
    } else {
      setIsrcVerificationStatus('error');
      setIsrcVerificationError(data.error || 'ISRC verification failed');
      setIsrcVerificationData(null);
    }
  } catch (error: any) {
    setIsrcVerificationStatus('error');
    setIsrcVerificationError(error.message || 'Failed to verify ISRC. Please try again.');
    setIsrcVerificationData(null);
  }
};
```

### 4. Debounced ISRC Input Handler

```typescript
const handleISRCChange = (value: string) => {
  setIsrcCode(value);
  setIsrcVerificationStatus('idle');
  setIsrcVerificationError(null);
  setIsrcVerificationData(null);

  // Clear existing timeout
  if (isrcVerificationTimeoutRef.current) {
    clearTimeout(isrcVerificationTimeoutRef.current);
  }

  // Debounce verification (500ms delay)
  if (value.trim()) {
    isrcVerificationTimeoutRef.current = setTimeout(() => {
      verifyISRCCode(value);
    }, 500);
  }
};
```

### 5. Reset ISRC When Cover Toggle is Off

```typescript
useEffect(() => {
  if (!isCover) {
    setIsrcCode('');
    setIsrcVerificationStatus('idle');
    setIsrcVerificationError(null);
    setIsrcVerificationData(null);
    if (isrcVerificationTimeoutRef.current) {
      clearTimeout(isrcVerificationTimeoutRef.current);
    }
  }
}, [isCover]);
```

### 6. Form Validation Before Upload

```typescript
const validateForm = () => {
  // ... existing validation ...
  
  // Cover song validation
  if (isCover && !isrcCode.trim()) {
    return 'ISRC code is required for cover songs';
  }
  if (isCover && isrcVerificationStatus !== 'success') {
    return 'ISRC code must be verified before uploading a cover song';
  }
  
  return null; // Form is valid
};
```

---

## 🎨 UI Components

### 1. Cover Song Toggle/Checkbox

**Location:** In the upload form, after genre/lyrics fields (music tracks only)

```typescript
<TouchableOpacity
  onPress={() => setIsCover(!isCover)}
  style={styles.checkboxContainer}
>
  <CheckBox
    value={isCover}
    onValueChange={setIsCover}
  />
  <Text style={styles.checkboxLabel}>This is a cover song</Text>
</TouchableOpacity>
```

### 2. ISRC Input Field (Conditional)

**Shows when:** `isCover === true`

```typescript
{isCover && (
  <View style={styles.isrcContainer}>
    <Text style={styles.label}>ISRC Code *</Text>
    <TextInput
      value={isrcCode}
      onChangeText={handleISRCChange}
      placeholder="GBUM71502800 or GB-UM7-15-02800"
      maxLength={14}
      style={[
        styles.input,
        isrcVerificationStatus === 'error' && styles.inputError,
        isrcVerificationStatus === 'success' && styles.inputSuccess,
      ]}
      autoCapitalize="characters"
    />
    <Text style={styles.hintText}>
      Format: XX-XXX-YY-NNNNN (12 characters, hyphens optional)
    </Text>
  </View>
)}
```

### 3. Verification Status Display

**Loading State:**
```typescript
{isrcVerificationStatus === 'loading' && (
  <View style={styles.verificationStatus}>
    <ActivityIndicator size="small" color="#007AFF" />
    <Text style={styles.verificationText}>Verifying ISRC code...</Text>
  </View>
)}
```

**Success State:**
```typescript
{isrcVerificationStatus === 'success' && isrcVerificationData && (
  <View style={styles.verificationSuccess}>
    <Icon name="check-circle" size={20} color="#34C759" />
    <View style={styles.verificationContent}>
      <Text style={styles.verificationTitle}>Verified</Text>
      <Text style={styles.verificationDetails}>
        {isrcVerificationData.title}
        {isrcVerificationData['artist-credit']?.length > 0 && 
          ` by ${isrcVerificationData['artist-credit'].map((a: any) => a.name || a.artist?.name).join(', ')}`
        }
      </Text>
    </View>
  </View>
)}
```

**Error State:**
```typescript
{isrcVerificationStatus === 'error' && isrcVerificationError && (
  <View style={styles.verificationError}>
    <Icon name="alert-circle" size={20} color="#FF3B30" />
    <View style={styles.verificationContent}>
      <Text style={styles.verificationTitle}>Verification Failed</Text>
      <Text style={styles.verificationDetails}>
        {isrcVerificationError}
      </Text>
    </View>
  </View>
)}
```

### 4. Upload Button State

```typescript
const isUploadDisabled = 
  !agreedToCopyright ||
  (isCover && isrcVerificationStatus !== 'success') ||
  // ... other validation conditions

<Button
  title="Upload Track"
  onPress={handleUpload}
  disabled={isUploadDisabled}
  style={[
    styles.uploadButton,
    isUploadDisabled && styles.uploadButtonDisabled
  ]}
/>
```

---

## 🎨 Styling Recommendations

### Colors

```typescript
const colors = {
  success: '#34C759',      // Green for verified
  error: '#FF3B30',        // Red for errors
  loading: '#007AFF',      // Blue for loading
  inputBorder: '#C7C7CC',  // Default border
  inputBorderSuccess: '#34C759',
  inputBorderError: '#FF3B30',
};
```

### Styles

```typescript
const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
  },
  isrcContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputSuccess: {
    borderColor: '#34C759',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  hintText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verificationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  verificationSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  verificationError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  verificationContent: {
    flex: 1,
    marginLeft: 8,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  verificationDetails: {
    fontSize: 12,
    color: '#8E8E93',
  },
  uploadButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
});
```

---

## 📤 Upload Request Payload

When uploading a cover song, include these fields:

```typescript
const uploadData = {
  title: title.trim(),
  artistName: artistName.trim(),
  description: description.trim(),
  genre: genre.trim(),
  tags: tags,
  privacy: privacy,
  publishOption: publishOption,
  audioFileUrl: audioFileUrl,
  coverArtUrl: coverArtUrl,
  duration: duration,
  lyrics: lyrics,
  lyricsLanguage: lyricsLanguage,
  
  // Cover song fields
  isCover: isCover,
  isrcCode: isCover ? isrcCode.trim() : undefined,
  
  // Audio quality fields
  audioQuality: audioQuality,
  bitrate: bitrate,
  sampleRate: sampleRate,
  channels: channels,
  codec: codec,
};
```

---

## ⚠️ Error Handling

### Error Messages to Display

1. **Invalid Format:**
   ```
   "Invalid ISRC format. Should be 12 characters (XX-XXX-YY-NNNNN)"
   ```

2. **Not Found:**
   ```
   "ISRC not found in MusicBrainz database. Ensure your cover is distributed first."
   ```

3. **Timeout:**
   ```
   "Verification timeout. Please try again."
   ```

4. **Rate Limit:**
   ```
   "Too many requests. Please wait a moment and try again."
   ```

5. **Network Error:**
   ```
   "Failed to verify ISRC. Please check your connection and try again."
   ```

### Handling API Errors

```typescript
try {
  const response = await fetch('https://www.soundbridge.live/api/upload/verify-isrc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isrc: isrcCode }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle response...
} catch (error) {
  // Network error or other exception
  setIsrcVerificationStatus('error');
  setIsrcVerificationError('Failed to verify ISRC. Please try again.');
}
```

---

## 🧪 Testing

### Test Cases

1. **Original Song Upload**
   - ✅ Toggle OFF → No ISRC field shown
   - ✅ Upload proceeds normally

2. **Cover Song with Valid ISRC**
   - ✅ Toggle ON → ISRC field appears
   - ✅ Enter valid ISRC → Verification succeeds
   - ✅ Upload button enabled

3. **Cover Song with Invalid Format**
   - ✅ Enter invalid ISRC → Format error shown
   - ✅ Upload button disabled

4. **Cover Song with Non-existent ISRC**
   - ✅ Enter valid format but non-existent ISRC → "Not found" error
   - ✅ Upload button disabled

5. **Cover Song - Toggle Off After Entry**
   - ✅ Enter ISRC, then toggle OFF → ISRC field clears
   - ✅ Upload proceeds as original song

### Test ISRC Codes

**Note:** Use real ISRC codes from distributed tracks for testing. Examples:
- `GBUM71502800` - Format example (verify exists)
- `USRC17607839` - Format example (verify exists)

**Important:** Test with ISRCs from tracks that are actually distributed and in MusicBrainz database.

---

## 📋 Implementation Checklist

- [ ] Add state variables for cover song and ISRC
- [ ] Add cover song toggle/checkbox to upload form
- [ ] Add ISRC input field (conditional display)
- [ ] Implement ISRC format validation
- [ ] Implement debounced ISRC verification
- [ ] Add verification status UI (loading, success, error)
- [ ] Update form validation to require verified ISRC for covers
- [ ] Update upload button to disable if cover ISRC not verified
- [ ] Include `isCover` and `isrcCode` in upload request
- [ ] Handle API errors gracefully
- [ ] Test with real ISRC codes
- [ ] Test error cases (invalid format, not found, timeout)
- [ ] Test toggle on/off behavior
- [ ] Ensure UI matches design guidelines

---

## 🔍 Backend Status

✅ **Backend is fully implemented and ready:**
- Database schema updated
- API endpoints working
- MusicBrainz integration complete
- Error handling in place
- Rate limiting implemented
- Caching implemented

**No backend changes needed** - Just use the API endpoints as documented above.

---

## 📞 Support

If you encounter any issues:

1. **API not responding:** Check network connectivity
2. **ISRC not found:** Verify ISRC code is correct and track is distributed
3. **Rate limit errors:** Wait 1 second between verification requests
4. **Format errors:** Ensure ISRC is exactly 12 characters (with or without hyphens)

---

## 📚 Additional Resources

- **MusicBrainz API Docs:** https://musicbrainz.org/doc/MusicBrainz_API
- **ISRC Format:** https://isrc.ifpi.org/en/
- **Backend Implementation:** See `COVER_SONG_ISRC_VERIFICATION_IMPLEMENTATION.md`

---

**Ready to implement!** All backend infrastructure is in place. Just build the UI and connect to the API endpoints. 🚀

