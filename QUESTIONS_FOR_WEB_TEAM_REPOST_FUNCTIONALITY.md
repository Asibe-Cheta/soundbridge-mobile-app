# Questions for Web Team: Repost Functionality

## Date: December 19, 2025
## From: Mobile Team
## Topic: Implementing Repost Feature in Mobile App

---

## Overview

We're implementing the LinkedIn-style post interactions in the mobile app and need clarification on how the **Repost** feature works in the web app.

---

## Critical Questions

### 1. Database Schema for Reposts

**Q: How are reposts stored in the database?**

Is there a separate `reposts` table? Or is it a field on the `posts` table?

**Expected Schema (Please Confirm):**
```sql
-- Option A: Separate table
CREATE TABLE post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One repost per user per post
  UNIQUE(post_id, user_id)
);

-- Option B: Field on posts table?
-- Or some other structure?
```

**Please provide:**
- Table name
- Field names
- Relationships
- Unique constraints
- Any business logic rules

---

### 2. API Endpoint for Reposting

**Q: What is the API endpoint for creating a repost?**

**Expected:**
```
POST /api/posts/[postId]/repost
```

**Please provide:**
- Exact endpoint URL
- HTTP method (POST? PUT?)
- Request body format (if any)
- Response format
- Error codes and messages

**Example Response Format Needed:**
```json
{
  "success": true,
  "data": {
    "repost": {
      "id": "...",
      "post_id": "...",
      "user_id": "...",
      "created_at": "..."
    },
    "repost_count": 15
  }
}
```

---

### 3. Removing a Repost (Toggle Behavior)

**Q: Can users un-repost? If yes, what's the endpoint?**

**Expected:**
```
DELETE /api/posts/[postId]/repost
```

**Please confirm:**
- Is repost a toggle (like reactions)?
- Or is it permanent (can't undo)?
- If toggle, what's the delete endpoint?

---

### 4. Displaying Reposted Posts

**Q: How should reposted posts appear in the feed?**

**Visual Questions:**
1. Do reposted posts show in the feed?
2. If yes, how are they visually distinguished from original posts?
3. Is there a "Reposted by [User]" header?
4. Does the original post data remain, or is there a new post record?

**Example Visual Layout:**
```
┌─────────────────────────────────────────┐
│ 🔁 Reposted by Jane Smith               │  ← New header?
├─────────────────────────────────────────┤
│ 👤 John Doe (Original Author)           │
│    Music Producer                       │
│    2h ago                               │
│                                         │
│ Just dropped my new track! 🎵          │
│                                         │
│ 👍 Like  💬 Comment  🔁 Repost  ↗ Share│
│                                         │
│ 15 reactions  •  8 comments  •  3 reposts
└─────────────────────────────────────────┘
```

**Or is it just a separate record?**

---

### 5. Repost Count Display

**Q: How is repost count fetched and displayed?**

**In `post` object, is there:**
```typescript
interface Post {
  // ... existing fields
  reposts_count: number;  // Total reposts?
  user_reposted: boolean; // Did current user repost?
  
  // Or different structure?
}
```

**Please provide:**
- Field name for repost count
- Field name for user's repost status
- How it's included in feed/post responses

---

### 6. Who Can Repost?

**Q: Are there any restrictions on reposting?**

- Can users repost their own posts?
- Can users repost reposts (chain reposting)?
- Are private posts repostable?
- Any user role restrictions?

---

### 7. Notifications

**Q: Are notifications sent when someone reposts?**

- Does the original author get notified?
- What notification type/channel?
- Any push notification integration?

**Expected Notification:**
```
"[User] reposted your post"
```

---

### 8. Analytics/Tracking

**Q: Are reposts tracked separately in analytics?**

- Does reposting count as an "engagement"?
- Is there a repost_events table?
- Any analytics fields to update?

---

### 9. Feed Query Changes

**Q: How does reposting affect feed queries?**

**Questions:**
1. When fetching feed posts, are reposts included automatically?
2. Is there a flag to include/exclude reposts?
3. How is the query structured?

**Example Query Needed:**
```sql
-- How to fetch feed with reposts?
SELECT 
  posts.*,
  reposts.user_id as reposted_by,
  reposts.created_at as reposted_at
FROM posts
LEFT JOIN post_reposts reposts ON ...
WHERE ...
ORDER BY ...
```

**Or is it handled differently in the API?**

---

### 10. Repost Button State

**Q: How is the repost button state managed?**

**Visual States:**
1. **Default (Not Reposted):** Gray icon, "Repost" label
2. **User Reposted:** Green icon? "Reposted" label?
3. **Loading:** Spinner?

**Please provide:**
- Active state styling
- Icon changes
- Label changes
- Any color scheme

---

## Current Mobile Implementation (Needs Completion)

### PostCard.tsx - Repost Button (Placeholder)

```typescript
{/* Repost Button */}
<TouchableOpacity
  style={styles.interactionButton}
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement repost functionality
  }}
>
  <Ionicons 
    name="repeat-outline" 
    size={18} 
    color={theme.colors.textSecondary} 
  />
  <Text style={[styles.interactionLabel, { color: theme.colors.textSecondary }]}>
    Repost
  </Text>
</TouchableOpacity>
```

**What we need to add:**
1. API call to repost endpoint
2. Optimistic UI update
3. Button state management (reposted vs not reposted)
4. Repost count display in summary line
5. Visual indicator for reposted posts in feed

---

## Summary of Information Needed

**Database:**
- [ ] Reposts table schema (or field structure)
- [ ] Unique constraints and indexes

**API Endpoints:**
- [ ] POST endpoint for creating repost
- [ ] DELETE endpoint for removing repost (if applicable)
- [ ] Request/response formats

**Business Logic:**
- [ ] Can users un-repost? (toggle behavior)
- [ ] Who can repost? (permissions)
- [ ] Can repost own posts?
- [ ] Can repost reposts?

**UI/UX:**
- [ ] How reposts appear in feed (visual layout)
- [ ] Repost button states (default, active, loading)
- [ ] Colors and styling for repost indicator
- [ ] "Reposted by" header design

**Data Structure:**
- [ ] Post object fields for reposts (`reposts_count`, `user_reposted`, etc.)
- [ ] How reposts are included in feed responses

**Notifications:**
- [ ] Notification sent on repost?
- [ ] Notification type/format

---

## Requested Deliverables

1. **SQL Schema** for reposts (complete CREATE TABLE statement)
2. **API Documentation** for repost endpoints (with examples)
3. **Post Type Definition** with repost fields (TypeScript interface)
4. **Visual Mockup** or screenshot of how reposts appear in web app feed
5. **Business Rules** document for repost feature

---

## Timeline

We'd like to implement repost functionality in the mobile app within the next sprint. Any documentation or examples from the web app would be extremely helpful.

---

## Contact

**Mobile Team Lead:** [Your Name]  
**Slack Channel:** #mobile-development  
**Priority:** High (blocking repost feature)

---

## Notes

- LinkedIn-style reactions are already implemented ✅
- Comments modal is implemented ✅
- Bookmark/save feature is implemented ✅
- Just need repost functionality to complete post interactions

---

**Thank you! Looking forward to your response.** 🙏

