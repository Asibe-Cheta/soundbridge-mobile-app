# Follow-Up Questions for Web App Team: Moderation System

**Date:** December 22, 2024  
**From:** Mobile Team  
**Re:** Clarifications on Moderation System Implementation

---

## 📋 **FOLLOW-UP QUESTIONS**

Thank you for the comprehensive response in `MOBILE_TEAM_PENDING_CHECK_EXPLANATION.md`! We have a few clarifications before implementing Phase 2 (Playability Blocking):

---

### **1. ⚠️ CRITICAL: Should "Pending Check" Tracks Be Playable?**

**Current Behavior in Mobile App:**
- Tracks with `moderation_status = 'pending_check'` are **fully playable**
- Users can play, like, share, and add to playlists
- No restrictions on these tracks

**Your Documentation Says:**

| Status | Playable? |
|--------|-----------|
| `pending_check` | ✅ YES |
| `checking` | ✅ YES |

**Our Concern:**
- Is it safe to let users play tracks that haven't been checked yet?
- What if the track contains inappropriate content?
- Should we at least show a warning message?

**Questions:**
1. ✅ **Confirm:** Tracks with `pending_check` and `checking` status SHOULD be playable?
2. ✅ **Philosophy:** You mentioned "innocent until proven guilty" - confirm this is the design philosophy?
3. ✅ **Risk:** What's the risk window? (Time between upload and AI check completing)
4. ✅ **User Safety:** Should we show any disclaimer like "This track is pending moderation review"?

---

### **2. 🔗 Admin Moderation Panel - Access Instructions**

**What We Know:**
- URL: `/admin/moderation`
- Full URL: `https://www.soundbridge.live/admin/moderation`

**What We Need:**

#### **A. Access Credentials**
- Do we (mobile team) have admin access?
- If not, can you grant temporary access for testing?
- Username/password or SSO login?

#### **B. Admin Panel Features**
Please provide screenshots or detailed description:
- What does the moderation dashboard look like?
- How do we approve a track?
- How do we reject a track?
- Can we manually trigger a recheck?
- Can we see the AI transcription and flag reasons?

#### **C. Direct Links**
Please provide exact URLs for:
- Main moderation dashboard: `https://www.soundbridge.live/admin/moderation`
- Copyright review: `https://www.soundbridge.live/admin/copyright`
- Verification panel: `https://www.soundbridge.live/admin/verification`
- Any other relevant admin panels?

#### **D. Workflow Example**
Can you provide step-by-step instructions:
1. Navigate to `/admin/moderation`
2. Find flagged track (e.g., "Lovely" by Asibe Cheta)
3. Review AI analysis and transcription
4. Click "Approve" or "Reject"
5. (Optional) Add admin notes

---

### **3. 🐛 Tracks Stuck in "Pending Check" for Extended Time**

**Issue Observed:**
- Track: **"Healing in you"** by Asibe Cheta
- Status: `pending_check`
- Play Count: **85 plays**
- Problem: Track has been live for a while but never moved to `clean` or `approved`

**Similar Tracks:**
- "Lovely" - `pending_check` - 0 plays (recently uploaded, okay)
- "Healing" - `pending_check` - unknown duration

**Questions:**
1. ✅ **Is cron job running?** Can you check Vercel cron job status?
2. ✅ **Why is "Healing in you" stuck?** 85 plays suggests it's been live for hours/days
3. ✅ **Can you manually trigger check?** For these specific tracks?
4. ✅ **How to fix?** Should we report stuck tracks? Is there a webhook or fallback?

**Proposed Solution:**
- Can you run the moderation check manually on these tracks?
- Track IDs (if needed):
  - "Lovely" - (provide if needed)
  - "Healing in you" - (provide if needed)
  - "Healing" - (provide if needed)

---

### **4. 🔔 Mobile App UX for Pending Tracks**

**Current Implementation:**
```typescript
// ModerationBadge.tsx - Line 36
if (!isOwner) return null; // Don't show badge to non-owners
```

**Scenario:**
- **Track Owner (Asibe Cheta):** Sees "⏳ Pending Check" badge ✅
- **Other Users:** See the track normally, no badge ✅

**Questions:**
1. ✅ **Confirm:** This is the correct UX?
2. ✅ **Should we inform other users?** "This track is pending review" somewhere in UI?
3. ✅ **Playback warning?** Should we show a toast/alert before playing pending tracks?
4. ✅ **Track detail screen?** Should pending status be visible to all users there?

**Proposed UX Enhancement:**
```typescript
// Option A: Show subtle indicator to all users
<View style={styles.trackCard}>
  <Text>{track.title}</Text>
  {track.moderation_status === 'pending_check' && (
    <Text style={styles.smallNote}>Pending moderation review</Text>
  )}
</View>

// Option B: Keep current behavior (only show to owner)
// Current implementation
```

**Which approach do you recommend?**

---

### **5. 📊 Admin Dashboard Access Request**

To properly test the moderation workflow, we need:

**Access Needed:**
- [ ] Admin account credentials for `https://www.soundbridge.live/admin`
- [ ] Permission to approve/reject test tracks
- [ ] Permission to view moderation logs
- [ ] Permission to manually trigger rechecks

**Testing Scenarios We Want to Run:**
1. Upload a test track with clean content → Verify it becomes `clean`
2. Upload a test track with flagged keywords → Verify it becomes `flagged`
3. Manually reject a track → Test appeal workflow
4. Manually approve a flagged track → Test notification system
5. Check transcription accuracy → Verify Whisper AI integration

**Can you provide:**
- Temporary admin account (or add our main account to admin role)
- Documentation on admin panel usage
- Video walkthrough (if available)

---

### **6. 🚨 Edge Cases & Error Handling**

**Questions:**

#### **A. What if AI check fails?**
- Track stays in `pending_check` forever?
- Is there a timeout (e.g., after 24 hours, auto-approve)?
- Should mobile app handle this?

#### **B. What if audio file is corrupted?**
- Does it get flagged or rejected?
- Should we validate audio before upload?

#### **C. What if transcription fails?**
- Track still gets checked?
- Manual admin review required?

#### **D. What if user deletes track while it's "checking"?**
- Race condition handling?
- Does cron job handle deleted tracks gracefully?

---

### **7. 📱 Mobile App Implementation Plan - Approval Needed**

Based on your checklist, here's our plan. Please approve/modify:

#### **Phase 2: Playability Blocking (This Week)**
```typescript
// Block playback for flagged/rejected/appealed tracks
const unplayableStatuses = ['flagged', 'rejected', 'appealed'];

const handleTrackPress = (track: AudioTrack) => {
  // ⚠️ QUESTION: Should we block pending_check tracks too?
  if (unplayableStatuses.includes(track.moderation_status)) {
    Alert.alert('Track Unavailable', getErrorMessage(track.moderation_status));
    return;
  }
  playTrack(track);
};
```

**Questions:**
- ✅ Confirm this approach?
- ✅ Should `pending_check` be in unplayableStatuses? (We assume NO based on your docs)
- ✅ Error messages correct?

#### **Phase 3: Filter Tracks in Discover (Already Done)**
```typescript
// Current implementation
.in('moderation_status', ['pending_check', 'checking', 'clean', 'approved'])
```
**Question:** ✅ Confirm this is correct?

#### **Phase 4: Appeal Workflow (Next Week)**
- Add "Appeal Decision" button for rejected tracks
- Create appeal form (20-500 chars)
- Submit via `POST /api/tracks/{trackId}/appeal`
- Show appeal status badge

**Questions:**
- ✅ Confirm API endpoint exists?
- ✅ Request payload format?
- ✅ Response format?

---

### **8. 🔧 Immediate Action Items for Web Team**

Please help us with:

1. **Grant Admin Access**
   - Add our account(s) to admin role
   - Provide login instructions

2. **Check Stuck Tracks**
   - Investigate why "Healing in you" (85 plays) is still `pending_check`
   - Manually trigger check if needed
   - Verify cron job is running

3. **Provide Admin Panel Guide**
   - Screenshots of moderation dashboard
   - Step-by-step approval/rejection workflow
   - How to view AI analysis details

4. **Confirm Playability Rules**
   - Explicitly confirm `pending_check` tracks should be playable
   - Confirm no warning/disclaimer needed

---

## 📋 **SUMMARY OF REQUESTS**

| Request | Priority | Needed Before Implementation |
|---------|----------|------------------------------|
| Confirm pending_check tracks are playable | 🔴 HIGH | ✅ YES |
| Admin panel access credentials | 🔴 HIGH | ✅ YES |
| Admin panel walkthrough/docs | 🟡 MEDIUM | ✅ YES |
| Fix stuck tracks ("Healing in you") | 🟡 MEDIUM | ⚠️ Optional |
| Appeal API endpoint details | 🟢 LOW | ⚠️ For Phase 4 |
| Edge case handling guidance | 🟢 LOW | ⚠️ Optional |

---

## 🎯 **DECISION POINTS**

Before we implement Phase 2, please confirm:

- [ ] ✅ **Confirm:** `pending_check` tracks SHOULD be playable (no blocking)
- [ ] ✅ **Confirm:** Only `flagged`, `rejected`, `appealed` should be blocked
- [ ] ✅ **Provide:** Admin panel access for testing
- [ ] ✅ **Investigate:** Why "Healing in you" is stuck in `pending_check`
- [ ] ✅ **Guide:** Admin panel usage instructions

---

## 📞 **NEXT STEPS**

**Mobile Team Will:**
1. ⏸️ Wait for your response on playability confirmation
2. ⏸️ Wait for admin panel access
3. 🚀 Implement Phase 2 (playability blocking) after confirmation
4. ✅ Test with admin panel
5. 🚀 Proceed to Phase 4 (appeal workflow)

**Web Team Please:**
1. ✅ Confirm playability rules
2. ✅ Grant admin access
3. ✅ Check stuck tracks
4. ✅ Provide admin panel guide

---

**Thank you for your continued support!** 🙏

Looking forward to your response so we can safely implement the playability blocking logic.

**Mobile Team**  
December 22, 2024

