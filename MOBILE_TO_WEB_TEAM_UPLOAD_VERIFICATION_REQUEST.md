# Mobile Team Request: Upload Verification & Rights Attestation Implementation

**From:** Mobile Development Team
**To:** Web Development Team
**Date:** January 1, 2026
**Priority:** High
**Subject:** Request for Upload Verification Implementation Details

---

## Background

The mobile app currently allows users to upload tracks without explicit copyright/rights verification checkboxes or attestations. We understand that the web app has implemented checks, verification steps, and mandatory checkboxes that users must tick to attest their rights to content before uploading.

We need to implement the same verification flow on the mobile app to ensure consistency across platforms and proper legal protection.

---

## What We Need From You

Please provide detailed information about your upload verification implementation:

### 1. **Verification Steps & Flow**

**Questions:**
- What is the complete step-by-step flow when a user uploads content on the web app?
- At what point in the upload process do the verification checkboxes appear?
  - Before file selection?
  - After file selection but before upload starts?
  - During upload progress?
  - After upload completes?
- Are the checks shown as a modal, inline form, or separate screen?
- Can users save drafts and complete verification later, or is it all-or-nothing?

**Please provide:**
- Screenshots or screen recordings of the upload flow
- Flowchart or sequence diagram (if available)
- Links to the web app screens we can test ourselves

---

### 2. **Checkbox Text & Legal Wording**

**Questions:**
- What exact text appears for each checkbox?
- How many checkboxes are there total?
- Which checkboxes are mandatory vs. optional?
- Is there a "Select All" option?
- Are there any links to Terms of Service, Copyright Policy, or other legal documents within the checkboxes?

**Please provide:**
- Exact copy/paste of all checkbox text
- Any tooltip or help text that explains each checkbox
- Links to referenced legal documents
- Any character limits on the text (for mobile screen sizing)

**Example format we need:**
```
☐ I confirm that I own the copyright to this recording or have obtained proper licenses/permissions to upload it.

☐ I certify that this content does not infringe on any third-party intellectual property rights, including but not limited to copyrights, trademarks, or patents.

☐ I understand that uploading copyrighted material without permission may result in account suspension and legal action.

☐ [Optional] I grant SoundBridge a non-exclusive license to stream and distribute this content on the platform.
```

---

### 3. **Validation & Error Handling**

**Questions:**
- What happens if a user tries to upload without checking all mandatory boxes?
  - Error message shown?
  - Upload button disabled?
  - Inline validation warnings?
- What's the exact error message text?
- Can users bypass the verification (e.g., close modal and try again)?
- Is there a "Learn More" or "Why do I need this?" link?

**Please provide:**
- All error messages (exact wording)
- Validation logic (which combinations are valid/invalid)
- Screenshots of error states
- Any grace period or warning system before enforcement

---

### 4. **Database Schema & Backend**

**Questions:**
- Where is the verification/attestation data stored?
  - In the `tracks` table as boolean columns?
  - In a separate `upload_attestations` table?
  - In metadata JSON field?
- What fields are stored?
  - Timestamp of attestation?
  - IP address?
  - User agent?
  - Which specific checkboxes were checked?
- Is there an audit trail?
- Do you store the version of the terms they agreed to?

**Please provide:**
- Database schema (table structure, column names, data types)
- SQL migration file (if available)
- API endpoint details:
  - Endpoint URL (e.g., `POST /api/tracks/upload`)
  - Request payload structure
  - Response format
  - Required headers
- Any backend validation rules

**Example structure we need:**
```typescript
// Request payload
{
  "track_file": File,
  "title": "My Track",
  "attestations": {
    "owns_copyright": true,
    "no_infringement": true,
    "understands_consequences": true,
    "grants_license": false,
    "agreed_at": "2026-01-01T12:00:00Z",
    "terms_version": "v1.2.0"
  }
}

// Database schema
tracks table:
- id
- user_id
- title
- file_url
- copyright_attested (boolean)
- attestation_timestamp (timestamp)
- attestation_ip (inet)

upload_attestations table:
- id
- track_id
- user_id
- owns_copyright (boolean)
- no_infringement (boolean)
- understands_consequences (boolean)
- grants_license (boolean)
- ip_address (inet)
- user_agent (text)
- agreed_at (timestamp)
- terms_version (varchar)
```

---

### 5. **UI/UX Design**

**Questions:**
- What's the visual design of the verification UI?
- Colors, fonts, spacing used?
- Is there a "scary warning" style (red, bold) or friendly/informative style?
- How does it look on mobile-responsive web (if you have that)?
- Any animations or transitions?

**Please provide:**
- Figma/design files (if available)
- Screenshots of the verification UI (desktop and mobile-responsive if available)
- CSS/styling code snippets (if helpful)
- Accessibility considerations (ARIA labels, screen reader text, keyboard navigation)

---

### 6. **Edge Cases & Special Scenarios**

**Questions:**
- What happens if the upload fails after verification is completed?
  - Do users need to re-verify?
  - Is verification cached/remembered?
- Can users edit uploaded tracks and change verification status?
- What happens if a user has multiple uploads in progress?
- Any special handling for:
  - Collaborations (multiple copyright holders)?
  - Covers/remixes (derivative works)?
  - Public domain content?
  - Creative Commons licensed content?

**Please provide:**
- Documentation of edge case handling
- Any special user flows for these scenarios

---

### 7. **Analytics & Monitoring**

**Questions:**
- Do you track verification metrics?
  - % of users who complete verification vs. abandon?
  - Time spent on verification screen?
  - Most common checkbox left unchecked?
- Are there admin tools to review attestations?
- Any fraud detection or abuse prevention?

**Please provide:**
- List of tracked events/metrics
- Admin panel screenshots (if applicable)
- Any fraud prevention logic

---

### 8. **Code References**

**Questions:**
- Where in your codebase is this implemented?
- Which files/components handle verification?
- Are there reusable components we can reference?

**Please provide:**
- File paths to relevant code:
  - Upload form component
  - Verification checkbox component
  - API service functions
  - Validation logic
- Code snippets for key logic (especially validation)
- GitHub/GitLab commit or PR that implemented this feature

**Example:**
```
web-app/
  src/
    components/
      UploadModal.tsx (lines 120-250)
      CopyrightVerification.tsx (full component)
    services/
      uploadService.ts (lines 45-89)
    utils/
      validators.ts (checkCopyrightAttestation function)
```

---

### 9. **Testing**

**Questions:**
- How do you test this feature?
- Any unit tests or integration tests we can reference?
- Test accounts or mock data we can use?

**Please provide:**
- Test cases (if documented)
- Test account credentials (for us to try the web flow)
- Mock API responses
- Edge case test scenarios

---

### 10. **Legal & Compliance**

**Questions:**
- Was this reviewed by legal counsel?
- Are there any jurisdiction-specific requirements (UK vs. Nigeria)?
- GDPR/data privacy considerations for storing attestation data?
- Any planned changes or updates to the verification flow?

**Please provide:**
- Legal approval documentation (if shareable)
- Any compliance requirements we should know about
- Planned updates or version 2 features

---

## How We'll Use This Information

Once we receive your implementation details, we will:

1. **Replicate the verification flow** in React Native for iOS and Android
2. **Use the same database schema** to ensure backend compatibility
3. **Match the checkbox text exactly** for consistency
4. **Implement identical validation logic** to prevent discrepancies
5. **Maintain the same legal protections** across both platforms

---

## Delivery Format

Please provide information in any of these formats:
- ✅ Written documentation (Markdown, Google Docs, Notion)
- ✅ Loom video walkthrough of the upload flow
- ✅ Screenshots with annotations
- ✅ Code snippets (GitHub Gist, pastebin, or inline)
- ✅ Figma/design files
- ✅ Zoom/Teams call to walk us through (we can record)

**Preferred:** A combination of written documentation + screenshots + code references

---

## Timeline

**Requested delivery:** Within 3-5 business days
**Our implementation target:** 1-2 weeks after receiving details

If you need more time or have questions, please let us know ASAP.

---

## Questions for Us?

If you need any clarification about what we're asking for, or if there's anything we can help with on our end, please reach out:

- **Mobile Team Lead:** Justice
- **Mobile Dev Questions:** Contact via [your preferred channel]
- **This Document:** [Link to this file in shared repo]

---

## Appendix: Mobile App Context

For your reference, here's how our current upload flow works (so you can compare):

### Current Mobile Upload Flow (No Verification)

1. User taps "Upload" button on Profile tab
2. File picker opens (select audio file from device)
3. User fills in metadata form:
   - Track title (required)
   - Genre (required, dropdown)
   - Cover art (optional, image picker)
   - Description (optional, text area)
4. User taps "Upload" button
5. File uploads to Supabase storage
6. Track record created in database
7. Success message shown

**Missing:** Copyright verification, rights attestation, checkboxes

### What We Need to Add

- Verification step (checkboxes) between step 3 and step 4
- Database fields to store attestation
- Validation to block upload if checkboxes not checked
- Error handling for failed verification
- UI design for verification screen/modal

---

## Summary Checklist

Please provide the following (check off as you send):

- [ ] Step-by-step upload flow description
- [ ] Screenshots of verification UI (desktop + mobile-responsive if available)
- [ ] Exact checkbox text and legal wording
- [ ] Database schema and column names
- [ ] API endpoint documentation (request/response format)
- [ ] Error messages and validation logic
- [ ] Code file references (paths and line numbers)
- [ ] Edge case handling documentation
- [ ] Test account credentials (for us to try it)
- [ ] Any legal/compliance documentation

---

**Thank you for your help! We're excited to bring this important feature to the mobile app and ensure consistency across platforms.**

---

**Document Version:** 1.0
**Created:** January 1, 2026
**Author:** Mobile Development Team
**For:** Web Development Team
