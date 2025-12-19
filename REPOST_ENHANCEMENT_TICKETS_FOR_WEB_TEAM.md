# Repost Feature Enhancement Tickets for Web Team

## Date: December 19, 2025
## From: Mobile Team
## Priority: Medium (Post-MVP Enhancements)

---

## Overview

The mobile app has successfully implemented repost functionality based on current backend capabilities. However, there are several enhancements that would improve the user experience but require backend/API changes.

**Current Status:** ✅ Repost feature working, matches web app behavior  
**These Tickets:** 🎯 Optional enhancements to improve UX

---

## Ticket 1: Add DELETE Endpoint for Un-Reposting (Toggle Behavior)

### Priority: High
### Estimated Effort: Medium (4-6 hours)
### Dependencies: None

### Problem

Currently, users cannot "un-repost" a post. Once they repost, it's permanent. This differs from other toggleable actions like reactions and bookmarks.

**Current Behavior:**
- User reposts → New post created
- User reposts again → Another new post created (duplicate)
- User cannot undo repost

**Expected Behavior:**
- User reposts → New post created
- User taps repost again → Repost removed (toggle off)
- Similar to reactions/bookmarks toggle behavior

---

### Solution

#### Option A: Track Reposts in Separate Table (Recommended)

Create a `post_reposts` table to track repost relationships independently:

```sql
CREATE TABLE post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repost_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One repost per user per post
  UNIQUE(post_id, user_id),
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (repost_post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_reposts_post_id ON post_reposts(post_id);
CREATE INDEX idx_post_reposts_user_id ON post_reposts(user_id);
CREATE INDEX idx_post_reposts_repost_post_id ON post_reposts(repost_post_id);
```

**Benefits:**
- ✅ Can track which repost post belongs to which user
- ✅ Can easily check if user already reposted
- ✅ Can delete repost when user un-reposts
- ✅ Maintains relationship between original and repost posts

---

#### Option B: Use Existing Structure (Simpler)

Allow users to delete their own repost posts using existing post deletion:

```typescript
// User "un-reposts" by deleting their repost post
DELETE /api/posts/{repostPostId}
```

**Benefits:**
- ✅ No database changes needed
- ✅ Uses existing deletion logic

**Drawbacks:**
- ❌ Requires mobile app to track which posts are user's reposts
- ❌ Less intuitive UX (deleting vs un-reposting)

---

### Required API Changes (Option A)

#### 1. DELETE Endpoint

```typescript
DELETE /api/posts/[id]/repost
Authorization: Required

Response (200 OK):
{
  "success": true,
  "data": {
    "repost_post_id": "uuid",  // ID of deleted repost post
    "updated_shares_count": 14
  }
}

Response (404 Not Found):
{
  "success": false,
  "error": "Repost not found"
}
```

**Logic:**
1. Check if user has reposted this post (`SELECT * FROM post_reposts WHERE post_id = ? AND user_id = ?`)
2. If found:
   - Delete repost post (`DELETE FROM posts WHERE id = repost_post_id`)
   - Delete repost record (`DELETE FROM post_reposts WHERE id = ?`)
   - Decrement `shares_count` on original post
   - Return success
3. If not found: Return 404

---

#### 2. Modify POST Endpoint (Check for Existing Repost)

```typescript
POST /api/posts/[id]/repost
Authorization: Required
Body: { "with_comment": boolean, "comment"?: string }

// NEW: Check if user already reposted
const existingRepost = await db.query(
  'SELECT * FROM post_reposts WHERE post_id = $1 AND user_id = $2',
  [postId, userId]
);

if (existingRepost) {
  return {
    success: false,
    error: "You have already reposted this post",
    repost_post_id: existingRepost.repost_post_id
  };
}

// Continue with repost creation...
```

---

### Database Migration

**File:** `supabase/migrations/20251220000000_add_post_reposts_table.sql`

```sql
-- Create post_reposts table
CREATE TABLE post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repost_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX idx_post_reposts_post_id ON post_reposts(post_id);
CREATE INDEX idx_post_reposts_user_id ON post_reposts(user_id);
CREATE INDEX idx_post_reposts_repost_post_id ON post_reposts(repost_post_id);

-- RLS Policies
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;

-- Users can view all reposts
CREATE POLICY "post_reposts_select_policy" ON post_reposts
  FOR SELECT USING (true);

-- Users can create their own reposts
CREATE POLICY "post_reposts_insert_policy" ON post_reposts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reposts
CREATE POLICY "post_reposts_delete_policy" ON post_reposts
  FOR DELETE USING (auth.uid() = user_id);

-- Backfill existing reposts
INSERT INTO post_reposts (post_id, user_id, repost_post_id)
SELECT 
  reposted_from_id as post_id,
  user_id,
  id as repost_post_id
FROM posts
WHERE reposted_from_id IS NOT NULL;
```

---

### Testing Checklist

- [ ] POST repost → Creates repost + record in post_reposts
- [ ] POST repost again → Returns error "already reposted"
- [ ] DELETE repost → Removes repost post + record
- [ ] DELETE repost (not reposted) → Returns 404
- [ ] DELETE repost → Decrements shares_count correctly
- [ ] Repost deleted → Record removed from post_reposts
- [ ] Original post deleted → Cascade deletes reposts
- [ ] RLS policies working correctly

---

### Acceptance Criteria

- ✅ Users can un-repost by calling DELETE endpoint
- ✅ POST endpoint prevents duplicate reposts
- ✅ Repost button shows correct state (reposted vs not reposted)
- ✅ shares_count accurately reflects total reposts
- ✅ Deleting original post cascades to reposts
- ✅ All existing reposts migrated to new table

---

## Ticket 2: Add `user_reposted` Field to Post API Responses

### Priority: High
### Estimated Effort: Small (2-3 hours)
### Dependencies: Ticket 1 (post_reposts table)

### Problem

Mobile app cannot display "Reposted" state on repost button because API doesn't indicate whether current user has reposted.

**Current Behavior:**
- Repost button always shows default state
- Users don't know if they've already reposted
- Can accidentally repost multiple times

**Expected Behavior:**
- Repost button shows "Reposted" state if user has reposted
- Button is highlighted/colored when active
- Users can see at a glance which posts they've reposted

---

### Solution

Add `user_reposted` field to Post responses, similar to `user_reaction`:

```typescript
interface Post {
  // ... existing fields
  shares_count: number;
  user_reposted: boolean;  // NEW: true if current user has reposted
  user_repost_id?: string; // NEW (optional): ID of user's repost post
}
```

---

### Required API Changes

#### Update Post Query (Feed, Detail, etc.)

```sql
SELECT 
  posts.*,
  -- ... other fields
  (
    SELECT COUNT(*)::int
    FROM post_reposts
    WHERE post_reposts.post_id = posts.id
  ) as shares_count,
  
  -- NEW: Check if current user has reposted
  EXISTS(
    SELECT 1
    FROM post_reposts
    WHERE post_reposts.post_id = posts.id
      AND post_reposts.user_id = $currentUserId
  ) as user_reposted,
  
  -- NEW (optional): Get user's repost post ID
  (
    SELECT repost_post_id
    FROM post_reposts
    WHERE post_reposts.post_id = posts.id
      AND post_reposts.user_id = $currentUserId
    LIMIT 1
  ) as user_repost_id

FROM posts
WHERE ...
```

---

### Example API Response

**Before:**
```json
{
  "id": "post-123",
  "content": "My new track!",
  "shares_count": 5,
  "user_reaction": "fire"
}
```

**After:**
```json
{
  "id": "post-123",
  "content": "My new track!",
  "shares_count": 5,
  "user_reaction": "fire",
  "user_reposted": true,
  "user_repost_id": "post-456"
}
```

---

### Mobile App Usage

```typescript
// Repost button state
const repostButton = {
  icon: post.user_reposted ? "repeat" : "repeat-outline",
  label: post.user_reposted ? "Reposted" : "Repost",
  color: post.user_reposted ? "#DC2626" : "gray",
  backgroundColor: post.user_reposted ? "rgba(220, 38, 38, 0.1)" : "transparent",
};

// Button behavior
const handleRepostPress = () => {
  if (post.user_reposted) {
    // DELETE repost
    deleteRepost(post.id);
  } else {
    // POST repost
    createRepost(post.id);
  }
};
```

---

### Affected Endpoints

Update these endpoints to include `user_reposted` field:

- ✅ `GET /api/posts/feed`
- ✅ `GET /api/posts/[id]`
- ✅ `GET /api/users/[id]/posts`
- ✅ `POST /api/posts/[id]/repost` (return updated post with user_reposted)
- ✅ `DELETE /api/posts/[id]/repost` (return updated post with user_reposted)

---

### Testing Checklist

- [ ] Feed shows user_reposted correctly
- [ ] Post detail shows user_reposted correctly
- [ ] After reposting, user_reposted becomes true
- [ ] After un-reposting, user_reposted becomes false
- [ ] user_repost_id matches actual repost post ID
- [ ] Performance: Query is efficient (indexed)

---

### Acceptance Criteria

- ✅ All post responses include `user_reposted` boolean
- ✅ `user_reposted` is true if current user has reposted
- ✅ Optional `user_repost_id` included if reposted
- ✅ Query performance is acceptable (< 100ms)
- ✅ Mobile app can display correct button state

---

## Ticket 3: Send Notifications When Posts Are Reposted

### Priority: Medium
### Estimated Effort: Small (2-3 hours)
### Dependencies: None

### Problem

Original post authors are not notified when someone reposts their content, unlike reactions which do send notifications.

**Current Behavior:**
- User reposts post → No notification sent
- Original author doesn't know their content was reposted
- Missed engagement opportunity

**Expected Behavior:**
- User reposts post → Notification sent to original author
- Similar to reaction notifications
- Format: "[User] reposted your post"

---

### Solution

Add notification logic to repost endpoint, similar to reaction notifications:

```typescript
// In POST /api/posts/[id]/repost route

// After creating repost...

// Send notification to original author (if not own post)
if (originalPost.user_id !== currentUser.id) {
  await sendNotification({
    recipient_id: originalPost.user_id,
    sender_id: currentUser.id,
    type: 'repost',
    post_id: originalPost.id,
    repost_id: newRepostPost.id,
    message: `${currentUser.display_name} reposted your post`,
  });
  
  // Optional: Send push notification
  await sendPushNotification({
    user_id: originalPost.user_id,
    title: 'New Repost',
    body: `${currentUser.display_name} reposted your post`,
    data: {
      type: 'repost',
      post_id: originalPost.id,
      repost_id: newRepostPost.id,
    },
  });
}
```

---

### Database Schema (If not exists)

```sql
-- notifications table (may already exist)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  repost_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

---

### Notification Types

Add `'repost'` to notification types enum:

```typescript
export type NotificationType =
  | 'event'
  | 'tip'
  | 'message'
  | 'collaboration_request'
  | 'track_approved'
  | 'creator_post'
  | 'repost';  // NEW
```

---

### Example Notification

```json
{
  "id": "notif-123",
  "recipient_id": "user-original-author",
  "sender_id": "user-reposter",
  "type": "repost",
  "post_id": "post-123",
  "repost_id": "post-456",
  "message": "Jane Smith reposted your post",
  "read": false,
  "created_at": "2025-12-19T21:00:00Z",
  "sender": {
    "display_name": "Jane Smith",
    "avatar_url": "https://..."
  }
}
```

---

### Mobile App Behavior

When notification received:
1. Show in-app notification
2. Send push notification (if enabled)
3. Tapping notification → Opens original post
4. Show repost indicator on post

---

### Testing Checklist

- [ ] Repost sends notification to original author
- [ ] No notification sent when reposting own post
- [ ] Notification includes correct sender info
- [ ] Notification includes post and repost IDs
- [ ] Tapping notification navigates correctly
- [ ] Push notification sent (if user opted in)
- [ ] Notification marked as read when viewed

---

### Acceptance Criteria

- ✅ Reposting sends notification to original author
- ✅ Notification includes sender details and post info
- ✅ No notification sent for own posts
- ✅ Push notification sent (if enabled)
- ✅ Notification deep links to post correctly
- ✅ Similar to existing reaction notifications

---

## Ticket 4: Add Backend Validation for Repost Restrictions (Optional)

### Priority: Low
### Estimated Effort: Small (1-2 hours)
### Dependencies: None

### Problem

Currently, any authenticated user can repost any post without restrictions:
- Users can repost their own posts
- Users can repost reposts (chain reposting)
- Private posts can be reposted

**This may or may not be desired behavior.** Clarify requirements before implementing.

---

### Solution Options

#### Option A: Prevent Reposting Own Posts

```typescript
// In POST /api/posts/[id]/repost

if (originalPost.user_id === currentUser.id) {
  return {
    success: false,
    error: "You cannot repost your own posts"
  };
}
```

---

#### Option B: Prevent Chain Reposting

```typescript
// Prevent reposting reposts (only allow reposting originals)

if (originalPost.reposted_from_id) {
  return {
    success: false,
    error: "You can only repost original posts, not reposts",
    original_post_id: originalPost.reposted_from_id
  };
}
```

---

#### Option C: Restrict Private Post Reposts

```typescript
// Only allow reposting public posts

if (originalPost.visibility === 'connections' && !isConnection) {
  return {
    success: false,
    error: "You can only repost public posts"
  };
}
```

---

### Questions for Product/UX

1. **Should users be able to repost their own posts?**
   - Use case: Resharing old content
   - Twitter: Allowed (called "quote tweet")
   - LinkedIn: Allowed

2. **Should users be able to repost reposts?**
   - Use case: Amplifying someone's repost
   - Twitter: Allowed (retweet of retweet)
   - LinkedIn: Allowed

3. **Should private posts be repostable?**
   - Current: Repost inherits visibility (becomes private)
   - Alternative: Only public posts can be reposted

---

### Recommendation

**For MVP:** Keep current behavior (no restrictions)  
**For Future:** Add based on user feedback and product decisions

---

### Testing Checklist (If Implemented)

- [ ] Own posts cannot be reposted (if restricted)
- [ ] Reposts cannot be reposted (if restricted)
- [ ] Private posts cannot be reposted (if restricted)
- [ ] Error messages are user-friendly
- [ ] Mobile app handles errors gracefully

---

## Implementation Priority

### High Priority (Do First)
1. **Ticket 1:** Delete endpoint for toggle behavior
2. **Ticket 2:** Add user_reposted field

### Medium Priority (Next Sprint)
3. **Ticket 3:** Notification on repost

### Low Priority (Future/Optional)
4. **Ticket 4:** Backend restrictions (decide requirements first)

---

## Mobile Team Actions (No Backend Required)

While waiting for backend changes, mobile team can implement:

### UI-Level Restrictions (Optional)
- Show "You've already reposted this" message
- Disable repost button for own posts (UI-only)
- Show different icon for already-reposted posts

These are **cosmetic only** - backend would still allow actions if called directly.

---

## Summary

### Backend Enhancements Needed:
1. ✅ DELETE /api/posts/[id]/repost endpoint
2. ✅ post_reposts tracking table
3. ✅ user_reposted field in API responses
4. ✅ Notification on repost
5. ⚠️ (Optional) Backend restrictions

### Benefits:
- Better UX (toggle behavior like reactions)
- Clearer state (users know if they've reposted)
- Engagement notifications
- Prevent duplicate reposts

### Estimated Total Effort: 8-11 hours
- Ticket 1: 4-6 hours
- Ticket 2: 2-3 hours
- Ticket 3: 2-3 hours
- Ticket 4: 1-2 hours (optional)

---

## Questions or Clarifications?

Please review these tickets and let us know:
1. Which tickets to prioritize
2. Any changes to requirements
3. Timeline for implementation
4. Product decisions on restrictions (Ticket 4)

---

**Mobile team is ready to integrate once backend changes are deployed!** 🚀

