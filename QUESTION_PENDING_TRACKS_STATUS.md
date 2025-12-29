# Question for Web App Team: "Pending Check" Track Status

**Date:** December 22, 2024  
**From:** Mobile Team  
**Priority:** Medium

---

## Issue Observed

In the mobile app's Discover screen, some tracks are displaying a **"Pending Check" indicator** (with an hourglass icon ⏳).

### Examples of Tracks with "Pending Check":
- "Lovely" by Asibe Cheta - 0 plays - **Pending Check**
- "Healing in you" by Asibe Cheta - 85 plays - **Pending Check**
- "Healing" by Asibe Cheta - **Pending Check**

### Tracks WITHOUT "Pending Check":
- "What a wonderful world(1)" by Bervick - 2 plays - **No pending indicator**

---

## Questions for Web Team

### 1. **What does "Pending Check" (`pending_check` status) mean?**
   - Is this content moderation review?
   - Is it automatic AI checking or manual admin review?
   - What triggers a track to be in `pending_check` vs `checking` vs `clean`?

### 2. **Workflow Questions**
   - What moves a track from `pending_check` → `checking` → `clean`/`approved`?
   - Is this handled by the admin dashboard at `/admin/moderation`?
   - Is there an automated AI moderation service running?
   - How long does the review typically take?

### 3. **Admin Dashboard Context**
   You mentioned these admin URLs exist:
   - `/admin/dashboard`
   - `/admin/copyright`
   - `/admin/verification`
   - `/admin/moderation`
   
   Which admin panel handles the "pending check" approval workflow?

### 4. **Should "Pending Check" tracks be shown in Discover?**
   - Should pending tracks be visible to all users in the public Discover screen?
   - Should they only be visible to the track owner?
   - Should they be filtered out entirely until approved?

### 5. **What should the mobile app display?**
   Current behavior:
   - We show a "Pending Check" badge with an hourglass icon
   - The track is still playable
   - It appears in "Recent Music" and other sections
   
   **Questions:**
   - Is this the correct UX?
   - Should pending tracks be playable?
   - Should there be different messaging for different pending reasons (copyright vs. content moderation)?

### 6. **API Response - What field should we check?**
   When we fetch tracks from `/api/tracks` or `/api/posts/feed`, what field indicates pending status?
   
   Example response structure needed:
   ```json
   {
     "id": "track-id",
     "title": "Track Title",
     "status": "pending" | "approved" | "rejected",
     "verification_status": "pending" | "verified",
     "moderation_status": "pending" | "approved" | "flagged",
     // Which field should we check?
   }
   ```

### 7. **Approval Workflow**
   - Who approves these tracks? (Admin only? Automated?)
   - What triggers the "pending" state?
   - What happens after approval/rejection?

---

## Current Mobile App Implementation

**UPDATE:** I found the implementation! Here's what we're currently doing:

### Database Field
We're using `moderation_status` field from the `tracks` table with these possible values:
- `pending_check` → Shows "⏳ Pending Check" (gray badge)
- `checking` → Shows "🔍 Checking..." (blue badge)
- `clean` → Shows "✓ Verified" (green badge)
- `flagged` → Shows "⚠️ Under Review" (orange badge)
- `approved` → Shows "✓ Approved" (green badge)
- `rejected` → Shows "✗ Not Approved" (red badge)
- `appealed` → Shows "📬 Appeal Pending" (orange badge)

### Current Filtering
We fetch tracks with:
```typescript
.in('moderation_status', ['pending_check', 'checking', 'clean', 'approved'])
```

### ModerationBadge Behavior
The badge:
- ✅ **Only shows to track owners** (`isOwner` check)
- ✅ Hides for "clean" tracks with low confidence
- ✅ Shows confidence percentage when relevant

### Why You're Seeing "Pending Check"
You're seeing these badges because:
1. You're the owner of those tracks (Asibe Cheta)
2. The tracks are in `pending_check` status
3. The badge correctly shows only to you, not to other users

---

## Action Items for Web Team

Please provide:
1. ✅ Database schema for track status/verification fields
2. ✅ API response structure showing all relevant status fields
3. ✅ Business logic for when tracks should be "pending"
4. ✅ UX guidelines for displaying pending tracks in mobile app
5. ✅ Confirmation of which admin panel handles approvals

---

## Mobile Team Context

We're displaying tracks in:
- Discover Screen → Trending This Week
- Discover Screen → Recent Music
- Discover Screen → Featured Albums
- Search Results
- Artist Profiles

We need to know how to handle "pending" tracks in each of these contexts.

---

**Thank you!**  
Mobile Team

