# Web Team: Upload Verification & Rights Attestation Implementation

**From:** Web Development Team  
**To:** Mobile Development Team  
**Date:** January 1, 2026  
**Priority:** High  
**Subject:** Upload Verification Implementation Details

---

## Executive Summary

The web app currently implements a **simple copyright attestation checkbox** that is mandatory before upload. There is also an **optional education modal** and **optional rights verification form** that provide additional information and verification, but these are not mandatory and their data is not stored in the database.

**Current Status:**
- ✅ Simple mandatory copyright checkbox implemented
- ✅ Optional education modal implemented
- ✅ Optional rights verification form implemented
- ❌ **Attestation data is NOT stored in the database**
- ❌ **No audit trail of attestations**

**Recommendation:** The mobile team should implement the simple mandatory checkbox first, then we can work together to add database storage for attestations if needed.

---

## 1. Verification Steps & Flow

### Current Upload Flow

1. **User fills in upload form** (title, artist name, genre, file, etc.)
2. **User sees copyright checkbox** (inline in the form, before upload)
3. **User must check the copyright checkbox** to enable the "Publish" button
4. **User clicks "Publish" button**
5. **Education modal appears** (optional, can be skipped if user closes it)
6. **Rights verification modal appears** (optional, triggered from education modal)
7. **Validation modal appears** (client-side validation)
8. **File upload begins** to Supabase storage
9. **Track record created** in database (via API)

### Key Points

- The copyright checkbox appears **inline in the form**, before the user clicks "Publish"
- The checkbox is **mandatory** - the "Publish" button is disabled until checked
- The education modal and rights verification form are **optional** and don't block upload
- The attestation is **NOT stored** in the database currently

### Flow Diagram

```
User fills form
    ↓
[Copyright Checkbox] ← MUST BE CHECKED
    ↓
User clicks "Publish"
    ↓
[Education Modal] ← Optional, can close
    ↓
[Rights Verification Modal] ← Optional, can cancel
    ↓
[Validation Modal] ← Client-side checks
    ↓
File Upload Starts
    ↓
Track Created in Database
```

---

## 2. Checkbox Text & Legal Wording

### Mandatory Copyright Checkbox

**Location:** Inline in the upload form, below all other fields, before the "Publish" button

**Exact Text:**
```
I confirm that I own all rights to this music and it does not infringe any 
third-party copyrights. I understand that uploading copyrighted content may 
result in account suspension or termination. Read our Copyright Policy
```

**Link:** `/copyright-policy`

**Code Location:**
- File: `apps/web/app/upload/page.tsx`
- Lines: 859-876
- State variable: `agreedToCopyright`
- Validation: Line 217 (`if (!agreedToCopyright) return 'You must agree to the copyright terms...'`)

**Visual Design:**
- Blue background box with left border (`bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500`)
- Checkbox with blue accent color
- Error message shown in red box below if not checked
- "Publish" button disabled until checked

**Error Message (if not checked):**
```
⚠️ You must agree to the copyright terms to upload content.
```

### Optional Education Modal Checkboxes

**Location:** Modal that appears after clicking "Publish" (can be closed)

**Checkbox 1:**
```
☐ I agree to the SoundBridge Terms of Service and understand that I am legally 
   responsible for the content I upload. I confirm that I have the right to 
   distribute this content and will not violate any copyright laws.
```

**Checkbox 2:**
```
☐ I have read and understood the upload guidelines above. I confirm that my 
   content meets the requirements and I understand the consequences of uploading 
   copyrighted material.
```

**Code Location:**
- File: `apps/web/src/components/upload/UploadEducationModal.tsx`
- Lines: 179-201
- Both checkboxes must be checked to enable "Continue" button
- Modal can be closed without checking (doesn't block upload)

### Optional Rights Verification Form

**Location:** Modal triggered from education modal (optional)

**Checkboxes (all optional, not validated):**
1. `☐ This is my original content` - "I wrote, composed, and recorded this track myself"
2. `☐ I own the rights to this content` - "I have the legal right to distribute this content (master recording + publishing rights)"
3. `☐ I have exclusive distribution deals` - "This content is subject to exclusive distribution agreements"
4. `☐ This content is on other platforms` - "This track is already distributed on other platforms"
   - If checked, shows platform selection (Spotify, Apple Music, YouTube Music, Amazon Music, TuneCore, CD Baby, DistroKid, SoundCloud)
5. `☐ This content contains samples` - "This track includes samples from other recordings"
   - If checked, shows: `☐ All samples are properly licensed`
   - If checked, shows optional textarea for "License Details"

**Code Location:**
- File: `apps/web/src/components/upload/RightsVerificationForm.tsx`
- Lines: 214-370
- Sends data to `/api/upload/verify-rights` endpoint (for validation, not storage)

---

## 3. Validation & Error Handling

### Mandatory Copyright Checkbox Validation

**Frontend Validation:**
```typescript
// Location: apps/web/app/upload/page.tsx, line 210-218
const validateForm = () => {
  if (!title.trim()) return 'Title is required';
  if (!uploadState.audioFile) return 'Audio file is required';
  if (!agreedToCopyright) return 'You must agree to the copyright terms to upload content';
  return null;
};
```

**Button Disabled State:**
```typescript
// Location: apps/web/app/upload/page.tsx, line 899
disabled={uploadState.isUploading || isValidating || !agreedToCopyright}
```

**Error Display:**
- If checkbox not checked and user tries to submit, `validateForm()` returns error message
- Error message shown via `alert()` (line 324)
- Red error box shown below checkbox if unchecked (lines 878-885)

**Error Message:**
```
You must agree to the copyright terms to upload content.
```

### User Behavior

- User **cannot bypass** the checkbox - "Publish" button is disabled
- User **cannot upload** without checking the box
- Error message appears if validation fails
- No "Learn More" link (copyright policy link is in the checkbox text itself)

---

## 4. Database Schema & Backend

### ⚠️ CRITICAL: No Database Storage

**Current Implementation:**
- The `agreedToCopyright` checkbox value is **NOT stored** in the database
- The `audio_tracks` table does **NOT** have a `copyright_attested` column
- There is **NO** `upload_attestations` table
- There is **NO** audit trail

**Database Schema (audio_tracks table):**
```sql
-- Current audio_tracks table (relevant columns only)
CREATE TABLE audio_tracks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    creator_id UUID REFERENCES profiles(id),
    file_url TEXT NOT NULL,
    -- ... other columns ...
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- NO copyright_attested column
    -- NO attestation_timestamp column
);
```

### API Endpoint: Upload Track

**Endpoint:** `POST /api/upload`

**Location:** `apps/web/app/api/upload/route.ts`

**Request Payload:**
```typescript
{
  title: string;
  artistName: string;
  description?: string;
  genre?: string;
  tags?: string[];
  privacy: 'public' | 'private';
  audioFileUrl: string;  // Pre-uploaded to Supabase storage
  coverArtUrl?: string;
  duration?: number;
  lyrics?: string;
  // ... other fields ...
  // NO copyright attestation fields
}
```

**Response:**
```typescript
{
  success: boolean;
  track: {
    id: string;
    title: string;
    file_url: string;
    created_at: string;
  };
}
```

**Validation:**
- The API does **NOT** check for copyright attestation
- The API does **NOT** validate that user agreed to terms
- The API only validates required fields (title, artistName, audioFileUrl)

### API Endpoint: Rights Verification (Optional)

**Endpoint:** `POST /api/upload/verify-rights`

**Location:** `apps/web/app/api/upload/verify-rights/route.ts`

**Purpose:** Validates rights information, but **does not store** it

**Request Payload:**
```typescript
{
  trackTitle: string;
  artistName: string;
  isOriginalContent: boolean;
  ownsRights: boolean;
  hasExclusiveDeals: boolean;
  isOnOtherPlatforms: boolean;
  platforms?: string[];
  hasSamples?: boolean;
  sampleInfo?: {
    isLicensed: boolean;
    licenseDetails?: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    canUpload: boolean;
    needsReview: boolean;
    violations: Array<{
      type: string;
      message: string;
      severity: 'high' | 'medium' | 'low';
    }>;
    warnings: Array<{
      type: string;
      message: string;
      severity: string;
    }>;
    recommendations: string[];
  };
}
```

**Note:** This endpoint is called by the optional Rights Verification Form, but the result is **NOT stored** in the database. It's only used for client-side validation and warnings.

---

## 5. UI/UX Design

### Mandatory Copyright Checkbox

**Visual Design:**
- **Container:** Light blue background box (`bg-blue-50 dark:bg-blue-900/20`)
- **Border:** Left border accent (`border-l-4 border-blue-500`)
- **Checkbox:** Blue accent color (`text-blue-600`)
- **Text:** Gray text (`text-gray-700 dark:text-gray-300`)
- **Link:** Blue underline (`text-blue-600 hover:text-blue-800 underline`)

**Error State:**
- **Container:** Red background box (`bg-red-50 dark:bg-red-900/20`)
- **Border:** Left border accent (`border-l-4 border-red-500`)
- **Icon:** AlertTriangle icon (`AlertTriangle`)
- **Text:** Red text (`text-red-800 dark:text-red-200`)

**Code Snippet:**
```tsx
// Copyright Agreement Section
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
    <Lock className="h-5 w-5 mr-2 text-blue-600" />
    Copyright Agreement
  </h3>
  
  <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
    <input
      type="checkbox"
      id="copyright-agreement"
      checked={agreedToCopyright}
      onChange={(e) => setAgreedToCopyright(e.target.checked)}
      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      required
    />
    <label htmlFor="copyright-agreement" className="text-sm text-gray-700 dark:text-gray-300">
      I confirm that I own all rights to this music and it does not infringe any 
      third-party copyrights. I understand that uploading copyrighted content may 
      result in account suspension or termination.{' '}
      <Link href="/copyright-policy" className="text-blue-600 hover:text-blue-800 underline">
        Read our Copyright Policy
      </Link>
    </label>
  </div>
  
  {!agreedToCopyright && (
    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
      <p className="text-sm text-red-800 dark:text-red-200">
        <AlertTriangle className="w-4 h-4 inline mr-1" />
        You must agree to the copyright terms to upload content.
      </p>
    </div>
  )}
</div>
```

**Mobile Responsive:**
- Same design on mobile
- Checkbox and text stack properly
- Error message displays below checkbox

---

## 6. Edge Cases & Special Scenarios

### Upload Fails After Checking Box

**Current Behavior:**
- If upload fails, user must check the box again (form state is reset)
- No persistent storage of attestation
- User must re-check on retry

### Editing Uploaded Tracks

**Current Behavior:**
- Users can edit track metadata (title, description, etc.)
- There is **NO** way to change or view the original attestation
- There is **NO** attestation data to view/edit

### Multiple Uploads in Progress

**Current Behavior:**
- Each upload form has its own `agreedToCopyright` state
- User must check the box for each upload separately
- No shared state or "remember my choice" feature

### Special Content Types

**Current Behavior:**
- Same checkbox for music tracks and podcast episodes
- Same checkbox text for all content types
- No special handling for collaborations, covers, or samples

---

## 7. Analytics & Monitoring

### Current Tracking

**None implemented:**
- No tracking of % users who check the box
- No tracking of users who abandon after seeing the checkbox
- No tracking of time spent on verification
- No admin tools to review attestations

---

## 8. Code References

### Main Upload Page

**File:** `apps/web/app/upload/page.tsx`

**Key Sections:**
- Copyright checkbox: Lines 852-886
- State variable: Line 59 (`const [agreedToCopyright, setAgreedToCopyright] = useState(false)`)
- Validation: Lines 210-218 (`validateForm()`)
- Button disabled: Line 899
- Error display: Lines 878-885

### Education Modal (Optional)

**File:** `apps/web/src/components/upload/UploadEducationModal.tsx`
- Full component implementation
- Checkboxes: Lines 179-201
- Modal trigger: Lines 924-931 in upload page

### Rights Verification Form (Optional)

**File:** `apps/web/src/components/upload/RightsVerificationForm.tsx`
- Full component implementation
- Form fields: Lines 212-370
- API call: Lines 51-82

### Upload API

**File:** `apps/web/app/api/upload/route.ts`
- Main upload endpoint
- Does NOT validate copyright attestation
- Does NOT store attestation data

### Rights Verification API (Optional)

**File:** `apps/web/app/api/upload/verify-rights/route.ts`
- Optional verification endpoint
- Validates but does NOT store data
- Returns warnings and violations

---

## 9. Testing

### Test Account

**Not provided** - Please use your own test account on the web app:
- URL: `https://www.soundbridge.live/upload`
- Create account and test the upload flow

### Test Scenarios

1. **Test mandatory checkbox:**
   - Try to upload without checking the box
   - Verify "Publish" button is disabled
   - Check the box and verify button is enabled

2. **Test error message:**
   - Fill in form but don't check box
   - Click "Publish" and verify error message appears

3. **Test optional modals:**
   - Click "Publish" with checkbox checked
   - Close education modal and verify upload continues
   - Complete rights verification and verify it's optional

---

## 10. Legal & Compliance

### Legal Review Status

**Unknown** - This documentation is based on code review only. Legal review status is not documented in the codebase.

### Compliance Considerations

**Current Limitations:**
- No audit trail of attestations
- No timestamp of when user agreed
- No IP address logging
- No version tracking of terms accepted
- No ability to prove user agreed if dispute arises

**Recommendation:**
- Implement database storage for attestations
- Store timestamp, IP address, user agent
- Store version of terms accepted
- Create audit trail

---

## 11. Recommended Implementation for Mobile

### Phase 1: Minimum Viable (Matches Current Web)

1. **Add mandatory copyright checkbox** to upload form
2. **Disable upload button** until checkbox is checked
3. **Show error message** if user tries to upload without checking
4. **DO NOT store attestation** in database (match current web behavior)

**Checkbox Text:**
```
I confirm that I own all rights to this music and it does not infringe any 
third-party copyrights. I understand that uploading copyrighted content may 
result in account suspension or termination.
```

**Link:** Add link to `/copyright-policy` page

### Phase 2: Enhanced (Future)

1. Add database column to `audio_tracks` table:
   ```sql
   ALTER TABLE audio_tracks 
   ADD COLUMN copyright_attested BOOLEAN DEFAULT false,
   ADD COLUMN attestation_timestamp TIMESTAMPTZ,
   ADD COLUMN attestation_ip INET,
   ADD COLUMN attestation_user_agent TEXT,
   ADD COLUMN terms_version VARCHAR(50);
   ```

2. Update API endpoint to accept and store attestation:
   ```typescript
   // POST /api/upload request
   {
     // ... existing fields ...
     copyrightAttested: boolean;
     attestationTimestamp: string;
     termsVersion: string;
   }
   ```

3. Store attestation in database when creating track

4. (Optional) Create `upload_attestations` table for detailed audit trail

---

## 12. What's Missing / What Needs to Be Built

### Current Gaps

1. ❌ **No database storage** of copyright attestation
2. ❌ **No audit trail** - cannot prove user agreed
3. ❌ **No IP address logging**
4. ❌ **No timestamp of agreement**
5. ❌ **No version tracking** of terms accepted
6. ❌ **No admin tools** to review attestations

### Recommended Next Steps

1. **Immediate (Mobile Team):**
   - Implement mandatory checkbox matching web app
   - Match validation and error handling
   - Do NOT store in database (match current web behavior)

2. **Short-term (Both Teams):**
   - Add database columns to store attestation
   - Update API to accept attestation data
   - Store attestation when creating track

3. **Long-term (Both Teams):**
   - Add audit trail table
   - Add admin tools
   - Add analytics tracking
   - Add terms version tracking

---

## 13. Summary Checklist

- [x] Step-by-step upload flow description
- [x] Exact checkbox text and legal wording
- [x] Error messages and validation logic
- [x] Code file references (paths and line numbers)
- [x] Database schema (current state - no attestation storage)
- [x] API endpoint documentation
- [x] UI/UX design details
- [x] Edge case handling documentation
- [ ] Screenshots (please test on web app)
- [ ] Test account credentials (use your own)
- [ ] Legal/compliance documentation (not in codebase)

---

## Questions & Answers

**Q: Do we need to store the attestation in the database?**  
A: Currently, the web app does NOT store it. For minimum viable implementation, match the web app. For legal protection, we recommend adding database storage in Phase 2.

**Q: Is the rights verification form mandatory?**  
A: No, it's completely optional. The only mandatory element is the simple copyright checkbox.

**Q: Can users bypass the checkbox?**  
A: No, the upload button is disabled until the checkbox is checked. The validation also prevents submission.

**Q: What happens if upload fails after checking?**  
A: User must check the box again (form state is reset). No persistent storage.

**Q: Do we need to implement the education modal?**  
A: No, it's optional. The mandatory checkbox is sufficient for Phase 1.

---

## Contact

For questions or clarifications:
- **Web Team Lead:** [Your Name]
- **Documentation:** This file in the repository
- **Web App:** https://www.soundbridge.live/upload

---

**Document Version:** 1.0  
**Created:** January 1, 2026  
**Last Updated:** January 1, 2026  
**Status:** Complete - Ready for Mobile Team Implementation

