# Backend Feature Request: Allow Multiple Redrops of Same Post

**Date:** January 1, 2026
**Priority:** High
**Requested By:** Mobile Team
**For:** Web/Backend Team

---

## Issue

Currently, the backend prevents users from redropping the same post multiple times:

```
POST /api/posts/{postId}/repost
Response: 409 Conflict
{
  "success": false,
  "error": "You have already reposted this post",
  "repost_post_id": "0aa20786-7889-4723-8bca-6691415748d3"
}
```

## Current Backend Behavior

1. User redrops a post → Creates repost record
2. User tries to redrop same post again → **409 Conflict error**
3. User must first unrepost, then repost again

## Requested Behavior

Users should be able to redrop the same post **multiple times**, similar to how:
- Twitter allows retweeting the same tweet multiple times
- Instagram allows sharing the same post to stories multiple times
- LinkedIn allows resharing the same post multiple times

## Use Cases

1. **Timely Content**: User wants to redrop an important announcement at different times
2. **Audience Reach**: User wants to share content when different followers are active
3. **Platform Consistency**: Mobile and web should both allow this behavior
4. **User Expectation**: Standard social media behavior

## Technical Impact

### Backend Changes Needed

**Option 1: Remove Duplicate Check (Recommended)**
```javascript
// Current code (in /api/posts/[id]/repost endpoint)
// Check if user already reposted
const existing = await checkExistingRepost(userId, postId);
if (existing) {
  return res.status(409).json({
    success: false,
    error: 'You have already reposted this post',
    repost_post_id: existing.id
  });
}

// Proposed change: Remove this check entirely
// Allow users to create multiple reposts of the same post
```

**Option 2: Add `allow_duplicate_reposts` Flag**
```javascript
// Add configuration option
const ALLOW_DUPLICATE_REPOSTS = true; // or from env config

if (!ALLOW_DUPLICATE_REPOSTS) {
  const existing = await checkExistingRepost(userId, postId);
  if (existing) {
    return res.status(409).json({ ... });
  }
}
```

### Database Schema Impact

**No schema changes needed.** The `posts` table already supports multiple reposts:
- Each redrop is a separate post with `reposted_from_id`
- No unique constraint preventing duplicate reposts
- Each redrop gets its own ID, timestamp, and engagement metrics

### API Changes

**POST /api/posts/{postId}/repost**
- Remove 409 Conflict response for duplicate reposts
- Always create new repost record (if user hasn't exceeded rate limits)

**GET /api/posts/feed**
- No changes needed
- Multiple redrops from same user will appear as separate posts (as intended)

### Mobile App Impact

**No mobile changes needed.** The mobile app is already designed to handle multiple redrops:
- RepostModal allows users to redrop at any time
- Feed displays each redrop as a separate post
- User can have multiple redrop posts in their profile

## Edge Cases to Consider

### 1. Rate Limiting
**Question:** Should we limit how often a user can redrop the same post?

**Recommendation:**
- Allow unlimited redrops (like Twitter)
- OR implement rate limit: Max 5 redrops per post per day
- OR implement time gap: Min 1 hour between redrops of same post

### 2. User Profile Display
**Question:** Should user's profile show all their redrops or deduplicate?

**Current Behavior:** Shows all reposts as separate posts (correct)

**Recommendation:** Keep current behavior - each redrop is a distinct post

### 3. Notifications
**Question:** Should original author get notified for each redrop?

**Recommendation:**
- First redrop → Send notification
- Subsequent redrops from same user → Group/batch notifications or skip

### 4. Analytics
**Question:** How to count redrop stats?

**Recommendation:**
- `shares_count` = Total unique users who reposted (not total reposts)
- `total_reposts` = Total repost records (including duplicates)
- Track both metrics

## Implementation Priority

**Recommendation: HIGH**

This is a user-facing limitation that:
1. Creates confusion ("Why can't I redrop this again?")
2. Doesn't match standard social media behavior
3. Limits content distribution
4. Requires no complex technical changes

## Testing Checklist

After implementing:
- [ ] User can redrop same post multiple times
- [ ] Each redrop appears as separate post in feed
- [ ] Each redrop appears in user's profile
- [ ] Unrepost works correctly (removes the specific redrop)
- [ ] Original author receives appropriate notifications
- [ ] `shares_count` increments correctly
- [ ] No performance issues with users who redrop same post many times

## Alternative: Keep Current Behavior

If the backend team decides to **keep the duplicate check**, please document this as intended behavior and we'll update the mobile UI to:
1. Show clearer messaging: "You've already redropped this"
2. Highlight the existing redrop in user's profile
3. Add "View my redrop" button to navigate to their existing redrop

However, we **strongly recommend allowing multiple redrops** for better UX.

---

## Response Needed

Please confirm:
1. ✅ Will you remove the duplicate redrop check?
2. ⏱️ If yes, what's the timeline for implementation?
3. 📋 If no, what's the reasoning?

---

**Document Version:** 1.0
**Created:** January 1, 2026
**Author:** Mobile Development Team
**Status:** ⏳ Awaiting Backend Team Response
