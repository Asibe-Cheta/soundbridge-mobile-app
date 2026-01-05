# 🚨 CRITICAL: ISRC Security Fixes Required for Web App

**Date:** January 5, 2026
**Severity:** 🔴 **CRITICAL SECURITY VULNERABILITY**
**Impact:** Current implementation allows easy upload of copyrighted music

---

## ⚠️ THE SECURITY VULNERABILITY

**Current behavior creates a copyright protection bypass:**

1. ❌ ACRCloud detects copyrighted song → **Auto-fills ISRC in input box**
2. ❌ ACRCloud detects copyrighted song → **Auto-checks "This is a cover song"**
3. ❌ **Shows ISRC as a "hint" or "reference"** in the UI
4. ❌ User can simply **copy the displayed ISRC** and paste it
5. ❌ System verifies ISRC → Upload succeeds ✅ **← MAJOR PROBLEM**

**Result:** Bad actors can upload ANY copyrighted music by simply copying the ISRC that the system shows them.

---

## 🎯 Root Cause: Auto-Fill & Visible ISRC

### Problem 1: Auto-Filling ISRC

**Current (BROKEN) Code:**
```typescript
// ❌ SECURITY FLAW
if (acrcloudData.detectedISRC) {
  setIsrcCode(acrcloudData.detectedISRC); // Auto-fills input
  verifyISRCCode(acrcloudData.detectedISRC); // Auto-verifies
}
```

**Why this is bad:**
- Makes it too easy to upload copyrighted music
- User doesn't need to prove they own the track
- No barrier to copyright infringement

### Problem 2: Showing ISRC as "Hint"

**Current (BROKEN) UI:**
```jsx
{/* ❌ SECURITY FLAW - Shows ISRC as "cheat sheet" */}
<div className="isrc-hint">
  <h4>Detected ISRC</h4>
  <p className="isrc-code">TCAHF2358359</p> {/* ← Visible to user */}
  <p>Please type this ISRC to verify ownership</p>
</div>
```

**Why this is bad:**
- User can see the ISRC clearly
- User can copy/paste it
- Defeats the purpose of ownership verification

### Problem 3: Auto-Checking "Cover Song"

**Current (BROKEN) Code:**
```typescript
// ❌ SECURITY FLAW
if (acrcloudData.matchFound) {
  setIsCover(true); // Auto-checks checkbox
}
```

**Why this is bad:**
- Removes user agency and conscious decision-making
- Makes it seem like the system is helping them upload copyrighted content

---

## ✅ THE SECURE SOLUTION

### Three Critical Rules:

1. **NEVER auto-fill the ISRC input** - Keep it empty
2. **NEVER show the detected ISRC** - No hints, no cheat sheets
3. **NEVER auto-check "cover song"** - User must consciously decide

### Implementation: Challenge-Response Verification

**Secure Flow:**
```
1. ACRCloud detects match → ISRC: TCAHF2358359 (stored in backend/state)
2. UI shows: "Ownership verification required" (ISRC NOT shown)
3. User types ISRC from their distributor
4. System validates: Typed ISRC === Detected ISRC
5. If match → Verify via MusicBrainz → Upload allowed ✅
6. If no match → Error: "ISRC doesn't match detected track" → Upload blocked ❌
```

---

## 🔧 Required Code Changes

### Change 1: Remove Auto-Fill Logic

**File:** Web app's upload/fingerprint handler

**REMOVE this code:**
```typescript
// ❌ DELETE THIS
const handleMatchFound = (data: AcrcloudMatchResult) => {
  setAcrcloudStatus('match');
  setAcrcloudData(data);

  // ❌ DELETE: Auto-fill ISRC
  if (data.detectedISRC && !isrcCode) {
    setIsrcCode(data.detectedISRC);
    verifyISRCCode(data.detectedISRC);
  }

  // ❌ DELETE: Auto-check cover song
  setIsCover(true);
};
```

**REPLACE with:**
```typescript
// ✅ SECURE VERSION
const handleMatchFound = (data: AcrcloudMatchResult) => {
  setAcrcloudStatus('match');
  setAcrcloudData(data);

  // DO NOT auto-fill ISRC - user must manually input it to prove ownership
  // DO NOT auto-check "cover song" - user must consciously decide
  // The detected ISRC is stored in acrcloudData but NOT shown to user
};
```

---

### Change 2: Remove ISRC "Hint" Display

**File:** Web app's ISRC verification UI component

**REMOVE this UI:**
```jsx
{/* ❌ DELETE THIS ENTIRE BLOCK */}
{acrcloudStatus === 'match' && acrcloudData?.detectedISRC && (
  <div className="detected-isrc-hint">
    <h4>Detected ISRC</h4>
    <p className="isrc-value">{acrcloudData.detectedISRC}</p>
    <p>If you own this track, please type the ISRC above</p>
  </div>
)}
```

**REPLACE with:**
```jsx
{/* ✅ SECURE VERSION - NO ISRC SHOWN */}
{acrcloudStatus === 'match' && (
  <div className="ownership-warning">
    <div className="warning-icon">🛡️</div>
    <div className="warning-content">
      <h4>Ownership Verification Required</h4>
      <p>
        To upload this track, please enter the ISRC code from your music
        distributor (DistroKid, TuneCore, CD Baby, etc.). The ISRC must
        match the detected track.
      </p>
    </div>
  </div>
)}
```

**Styling:**
```css
.ownership-warning {
  background: #FFF3E0;
  border: 1px solid #FF9800;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.warning-icon {
  font-size: 24px;
  color: #FF9800;
}

.warning-content h4 {
  color: #E65100;
  font-weight: 600;
  margin-bottom: 8px;
}

.warning-content p {
  color: #EF6C00;
  font-size: 14px;
  line-height: 1.5;
}
```

---

### Change 3: Update ISRC Section Title & Logic

**File:** Web app's ISRC section component

**CURRENT (BROKEN):**
```jsx
{/* ❌ WRONG APPROACH */}
<div className="isrc-section">
  <h3>Cover Song Verification</h3>

  <label>
    <input
      type="checkbox"
      checked={isCover}
      onChange={(e) => setIsCover(e.target.checked)}
    />
    This is a cover song
  </label>

  {isCover && (
    <input
      type="text"
      placeholder="Enter ISRC code"
      value={isrcCode}
      onChange={(e) => setIsrcCode(e.target.value)}
    />
  )}
</div>
```

**REPLACE with:**
```jsx
{/* ✅ SECURE VERSION */}
<div className="isrc-section">
  {/* Show different title based on ACRCloud status */}
  {acrcloudStatus === 'match' ? (
    <div>
      <h3>ISRC Verification Required *</h3>
      <p className="section-description">
        This track was detected as a released song. Please provide
        the ISRC code to verify ownership.
      </p>
    </div>
  ) : (
    <h3>Cover Song Verification</h3>
  )}

  {/* Only show "cover song" checkbox if ACRCloud DIDN'T detect a match */}
  {acrcloudStatus !== 'match' && (
    <label className="cover-checkbox">
      <input
        type="checkbox"
        checked={isCover}
        onChange={(e) => setIsCover(e.target.checked)}
      />
      This is a cover song
    </label>
  )}

  {/* Show ISRC input if ACRCloud match OR user checked "cover song" */}
  {(acrcloudStatus === 'match' || isCover) && (
    <div className="isrc-input-container">
      <label>ISRC Code *</label>
      <input
        type="text"
        placeholder="Type the ISRC code (e.g., GBUM71502800)"
        value={isrcCode}
        onChange={(e) => setIsrcCode(e.target.value)}
        maxLength={14}
        style={{
          borderColor:
            isrcVerificationStatus === 'error' ? 'red' :
            isrcVerificationStatus === 'success' ? 'green' :
            '#ccc'
        }}
      />
      <p className="hint-text">
        Format: XX-XXX-YY-NNNNN (12 characters, hyphens optional)
      </p>
    </div>
  )}
</div>
```

---

### Change 4: Add ISRC Match Validation & Skip MusicBrainz for ACRCloud Matches

**File:** Web app's ISRC verification function

**CRITICAL FIX:** When ACRCloud detects a match, we should **NOT** check MusicBrainz. ACRCloud is authoritative - if it detected the track, the ISRC is valid. Only use MusicBrainz for manual cover song declarations.

**ADD this validation logic:**
```typescript
// ✅ ADD THIS SECURITY CHECK
const verifyISRCCode = async (isrc: string) => {
  if (!isrc || !isrc.trim()) {
    setIsrcVerificationStatus('idle');
    return;
  }

  setIsrcVerificationStatus('loading');

  try {
    // Normalize ISRC (remove hyphens, uppercase)
    const normalizedInput = isrc.trim().replace(/-/g, '').toUpperCase();

    // 🔒 CRITICAL SECURITY CHECK
    // If ACRCloud detected a match, verify the typed ISRC matches the detected one
    if (acrcloudStatus === 'match' && acrcloudData?.detectedISRC) {
      const normalizedDetected = acrcloudData.detectedISRC
        .replace(/-/g, '')
        .toUpperCase();

      if (normalizedInput !== normalizedDetected) {
        setIsrcVerificationStatus('error');
        setIsrcVerificationError(
          'ISRC code does not match the detected track. ' +
          'Please enter the correct ISRC for this song.'
        );
        return;
      }

      // ✅ ISRC matches ACRCloud detection - verification complete!
      // No need to check MusicBrainz since ACRCloud already confirmed it's valid
      console.log('✅ ISRC verified via ACRCloud match');
      setIsrcVerificationStatus('success');
      setIsrcVerificationData({
        title: acrcloudData.detectedTitle || 'Verified Track',
        'artist-credit': acrcloudData.detectedArtist
          ? [{ name: acrcloudData.detectedArtist }]
          : []
      });
      return; // ← EXIT HERE - Don't check MusicBrainz
    }

    // For manual cover songs (no ACRCloud match), verify ISRC via MusicBrainz API
    const response = await fetch('/api/upload/verify-isrc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isrc: isrc.trim() }),
    });

    const data = await response.json();

    if (data.success && data.verified) {
      setIsrcVerificationStatus('success');
      setIsrcVerificationData(data.recording);
    } else {
      setIsrcVerificationStatus('error');
      setIsrcVerificationError(data.error || 'ISRC verification failed');
    }
  } catch (error) {
    setIsrcVerificationStatus('error');
    setIsrcVerificationError('Failed to verify ISRC. Please try again.');
  }
};
```

**Why This Change Matters:**

**Problem:** MusicBrainz database doesn't have all ISRCs, especially newer releases. This causes false negatives where legitimate owners can't upload their own music.

**Solution:**
- **ACRCloud detected match** → Trust ACRCloud, skip MusicBrainz ✅
- **Manual cover song** → Check MusicBrainz (user might be covering an older song)

**Example:**
```
Scenario 1: ACRCloud detected "The Gospel Prevails" (ISRC: TCAHF2358359)
1. User types: TCAHF2358359
2. System validates: TCAHF2358359 === TCAHF2358359 ✅
3. Verification complete! (Skip MusicBrainz)
4. No "ISRC not found in MusicBrainz" error ✅

Scenario 2: User manually marks as cover song (no ACRCloud match)
1. User types: GBUM71502800
2. System checks MusicBrainz database
3. If found → Success ✅
4. If not found → Error (expected for manual covers)
```

---

### Change 5: Fix Verification Status Styling

**File:** Web app's verification status display components

**IMPORTANT:** Ensure verification status boxes have good text contrast.

**Verification Success Box:**
```jsx
{/* ✅ Success with readable colors */}
{isrcVerificationStatus === 'success' && isrcVerificationData && (
  <div className="verification-success">
    <CheckCircleIcon /> {/* Green icon */}
    <div className="verification-content">
      <h4>Verified</h4>
      <p>
        {isrcVerificationData.title}
        {isrcVerificationData['artist-credit']?.length > 0 &&
          ` by ${isrcVerificationData['artist-credit'].map(a => a.name).join(', ')}`
        }
      </p>
    </div>
  </div>
)}
```

**Styling with Good Contrast:**
```css
.verification-success {
  background: #D1FAE5; /* Light green background */
  border: 1px solid #10B981; /* Green border */
  border-radius: 8px;
  padding: 12px;
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.verification-success h4 {
  color: #065F46; /* Dark green - readable on light green */
  font-weight: 600;
  margin-bottom: 4px;
}

.verification-success p {
  color: #047857; /* Medium green - readable on light green */
  font-size: 14px;
}

.verification-error {
  background: #FFEBEE; /* Light red background */
  border: 1px solid #DC2626; /* Red border */
  /* ... similar structure ... */
}

.verification-error h4 {
  color: #DC2626; /* Dark red - readable on light red */
}

.verification-error p {
  color: #991B1B; /* Darker red - readable on light red */
}
```

**Common Mistake to Avoid:**
```css
/* ❌ BAD: Light text on light background */
.verification-success {
  background: #D1FAE5; /* Light green */
  color: #FFFFFF; /* White text - INVISIBLE! */
}

/* ✅ GOOD: Dark text on light background */
.verification-success {
  background: #D1FAE5; /* Light green */
  color: #065F46; /* Dark green - VISIBLE! */
}
```

---

### Change 6: Update Validation Error Messages

**File:** Web app's form validation

**ENSURE these validation rules exist:**
```typescript
// ✅ VALIDATION RULES
const validateUploadForm = () => {
  const errors = [];

  // For music tracks
  if (contentType === 'music') {
    // ACRCloud validation
    if (acrcloudStatus === 'checking') {
      errors.push('Please wait for audio verification to complete');
    }

    if (acrcloudStatus === 'match') {
      // Match found - ISRC is REQUIRED
      if (!isrcCode || isrcCode.trim() === '') {
        errors.push(
          'ISRC code is required. This track appears to be a released song.'
        );
      }

      if (isrcVerificationStatus !== 'success') {
        errors.push('ISRC code must be verified before uploading');
      }
    }

    if (acrcloudStatus === 'no_match' && !isOriginalConfirmed) {
      errors.push('Please confirm this is your original/unreleased music');
    }

    // Cover song validation (manual cover marking)
    if (isCover && !isrcCode.trim()) {
      errors.push('ISRC code is required for cover songs');
    }

    if (isCover && isrcVerificationStatus !== 'success') {
      errors.push('ISRC code must be verified before uploading a cover song');
    }
  }

  return errors;
};
```

---

## 🧪 Testing the Fix

### Test Case 1: Released Song (ACRCloud Match)

**Steps:**
1. Upload a released song (e.g., "The Gospel Prevails" by Asibe Cheta)
2. Wait for ACRCloud fingerprinting

**Expected Behavior:**
- ✅ "Audio Verification" shows: "This song appears to be a released track"
- ✅ Shows: Title, Artist, Album (detected info)
- ✅ "ISRC Verification Required *" section appears
- ✅ **ISRC input is EMPTY** (not pre-filled)
- ✅ **No visible ISRC displayed anywhere** (no cheat sheet)
- ✅ Shows warning: "Please enter ISRC from your distributor"
- ✅ "Cover song" checkbox is **HIDDEN** (not relevant)

**Test typing wrong ISRC:**
1. Type incorrect ISRC: `GBUM71502800`
2. Wait for verification

**Expected:**
- ❌ Error: "ISRC code does not match the detected track"
- ❌ Upload button disabled

**Test typing correct ISRC:**
1. Type correct ISRC: `TCAHF2358359`
2. Wait for verification

**Expected:**
- ✅ Success: "Verified" with track details
- ✅ Upload button enabled

### Test Case 2: Original Music (No Match)

**Steps:**
1. Upload original/unreleased music
2. Wait for ACRCloud fingerprinting

**Expected Behavior:**
- ✅ "Audio Verification" shows: "This appears to be original/unreleased music"
- ✅ Shows checkbox: "I confirm this is my original music"
- ✅ "Cover Song Verification" section (normal title)
- ✅ Shows "This is a cover song" checkbox
- ✅ ISRC input only appears if user checks "cover song"

### Test Case 3: Manual Cover Song

**Steps:**
1. Upload original music (no ACRCloud match)
2. Check "This is a cover song"

**Expected Behavior:**
- ✅ ISRC input appears
- ✅ User can type any ISRC
- ✅ System verifies via MusicBrainz
- ✅ No "must match detected" validation (since no detection)

---

## 📊 Security Comparison

### Before (VULNERABLE):

```
User uploads copyrighted song
  ↓
ACRCloud detects: "Song Name" - ISRC: TCAHF2358359
  ↓
UI shows: "Detected ISRC: TCAHF2358359" ← ❌ VISIBLE
  ↓
ISRC input auto-filled with: TCAHF2358359 ← ❌ AUTO-FILLED
  ↓
User clicks "Verify" → Success ✅
  ↓
User uploads copyrighted music ← ❌ MAJOR PROBLEM
```

### After (SECURE):

```
User uploads copyrighted song
  ↓
ACRCloud detects: "Song Name" - ISRC: TCAHF2358359 (stored internally)
  ↓
UI shows: "Ownership verification required" ← ✅ NO ISRC SHOWN
  ↓
ISRC input is EMPTY ← ✅ USER MUST TYPE IT
  ↓
Scenario A - Legitimate Owner:
  User logs into DistroKid → Gets ISRC: TCAHF2358359
  User types: TCAHF2358359
  System validates: Typed === Detected → Success ✅
  Upload allowed ← ✅ CORRECT

Scenario B - Bad Actor:
  User doesn't have distributor access
  User guesses: GBUM71502800
  System validates: GBUM71502800 !== TCAHF2358359 → Error ❌
  Upload blocked ← ✅ CORRECT
```

---

## 🚨 Why This is Critical

### Legal Risk

**Current vulnerability allows:**
- ❌ Anyone to upload copyrighted music from Spotify/Apple Music
- ❌ No real ownership verification
- ❌ Platform liable for copyright infringement
- ❌ DMCA takedown requests
- ❌ Lawsuits from major labels

### Business Risk

**Platform reputation:**
- ❌ Seen as facilitating copyright infringement
- ❌ App store removal risk
- ❌ Loss of legitimate users' trust
- ❌ Potential shutdown by authorities

### User Trust Risk

**Current system:**
- ❌ Auto-fills everything for users
- ❌ Makes it seem like platform encourages copyright infringement
- ❌ No clear distinction between legitimate and illegitimate use

---

## 📝 Implementation Checklist

### Critical Changes (DO IMMEDIATELY):

- [ ] **Remove auto-fill logic** from handleMatchFound function
- [ ] **Remove auto-check** of "cover song" checkbox
- [ ] **Remove ISRC "hint" display** from UI
- [ ] **Add ISRC match validation** to verifyISRCCode function
- [ ] **Skip MusicBrainz for ACRCloud matches** - trust ACRCloud as authoritative
- [ ] **Fix verification status styling** - use dark text on light backgrounds
- [ ] **Update UI** to show warning instead of ISRC
- [ ] **Update section title** to "ISRC Verification Required" when match detected
- [ ] **Hide "cover song" checkbox** when ACRCloud detects match
- [ ] **Test with released songs** to verify ISRC isn't visible

### Verification Steps:

- [ ] Upload released song → Verify ISRC is NOT shown
- [ ] Upload released song → Verify ISRC input is EMPTY
- [ ] Type wrong ISRC → Verify error: "doesn't match detected track"
- [ ] Type correct ISRC → Verify success
- [ ] Upload original music → Verify normal flow works
- [ ] Check "cover song" manually → Verify ISRC input appears

### Testing with Real Songs:

- [ ] Test with "The Gospel Prevails" (ISRC: TCAHF2358359)
- [ ] Test with popular songs on Spotify
- [ ] Test with various file sizes (5MB, 15MB, 30MB)
- [ ] Verify no 413 errors (storage-first approach working)
- [ ] Verify fingerprinting works for all sizes

---

## ⏰ Urgency

**Deploy Timeline:** 🚨 **IMMEDIATE - WITHIN 24 HOURS**

**Reasoning:**
- Critical security vulnerability actively exploitable
- Legal liability risk for platform
- Simple fix (remove auto-fill, hide ISRC)
- No backend changes required (all frontend)

---

## 📞 Mobile App Status

**Mobile app has already implemented these fixes:**
- ✅ No auto-fill of ISRC
- ✅ No auto-check of "cover song"
- ✅ No visible ISRC display
- ✅ ISRC match validation implemented
- ✅ Secure challenge-response flow

**Web app must match mobile app security level.**

---

## 🎯 Expected Outcome

### After Implementation:

**Legitimate Users:**
- ✅ Can upload their own released music
- ✅ Get ISRC from their distributor (DistroKid, etc.)
- ✅ Type ISRC to verify ownership
- ✅ Upload succeeds

**Bad Actors:**
- ❌ Cannot see the ISRC
- ❌ Cannot copy/paste ISRC
- ❌ Don't have distributor access to get ISRC
- ❌ Upload blocked

**Platform:**
- ✅ Strong copyright protection
- ✅ Legal compliance
- ✅ User trust maintained
- ✅ Reduced DMCA risk

---

## 🔗 Related Documentation

- [CRITICAL_COPYRIGHT_PROTECTION_BYPASSED.md](CRITICAL_COPYRIGHT_PROTECTION_BYPASSED.md) - Explains why backend fingerprinting is critical
- [BACKEND_STILL_HAS_10MB_LIMIT.md](BACKEND_STILL_HAS_10MB_LIMIT.md) - Backend fixes for large files
- [STORAGE_FIRST_APPROACH_IMPLEMENTED.md](STORAGE_FIRST_APPROACH_IMPLEMENTED.md) - Mobile app implementation

---

## ✅ Summary

**Critical Security Fixes Required:**

1. ❌ **REMOVE:** Auto-fill ISRC input
2. ❌ **REMOVE:** Auto-check "cover song" checkbox
3. ❌ **REMOVE:** Display of detected ISRC (no cheat sheet)
4. ✅ **ADD:** ISRC match validation (typed must equal detected)
5. ✅ **ADD:** Skip MusicBrainz for ACRCloud matches (trust ACRCloud as authoritative)
6. ✅ **ADD:** Warning message (ownership verification required)
7. ✅ **ADD:** Section title change when match detected
8. ✅ **FIX:** Verification status styling (dark text on light backgrounds)

**Impact:**
- Prevents easy upload of copyrighted music
- Requires legitimate distributor access
- Maintains platform legal compliance
- Protects user trust

**Urgency:** 🚨 **CRITICAL - Deploy immediately**

---

**This is not just a UX issue - it's a legal liability that must be fixed immediately.**
