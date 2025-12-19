# Mobile Team Response: `reposted_from` Object Requirements

**Date:** December 20, 2025  
**From:** Mobile Team  
**To:** Web Team  
**Re:** `/api/posts/feed` endpoint enhancement

---

## Response to Web Team Questions

### 1. **Do you need the full nested `reposted_from` object, or is `reposted_from_id` sufficient?**

✅ **We need the full nested `reposted_from` object (Option 2)**.

**Reason:**  
We've implemented Twitter-style quote reposts where the original post is displayed in a bordered card below the user's comment. This requires displaying the original post's complete data without additional API calls.

**Visual Example:**
```
┌─────────────────────────────────────┐
│ Justice Asibe                       │
│ @JusticeAsi92856 · 2h ago          │
│                                     │
│ I agree  ← User's comment          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Jake @TBRaysCentral · 5h ago   │ │ ← Original post
│ │                                 │ │   needs full data
│ │ Anderson Brito has some special │ │
│ │ stuff. Fastball can reach...    │ │
│ │                                 │ │
│ │ [Baseball video]                │ │
│ │                                 │ │
│ │ 70 reactions · 7 comments       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

If we only had `reposted_from_id`, we'd need to make N additional API calls to fetch each original post, which would:
- ❌ Degrade user experience (slower loading)
- ❌ Increase server load (N+1 query problem)
- ❌ Complicate mobile app caching logic

---

### 2. **What fields do you need in the `reposted_from` object?**

**Required Fields:**

```typescript
interface RepostedFrom {
  // Post data
  id: string;
  content: string;
  created_at: string;
  visibility: 'public' | 'connections' | 'private';
  
  // Author data (nested)
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  
  // Media/Attachments
  image_url?: string | null;      // Primary image
  audio_url?: string | null;      // Primary audio
  media_urls?: string[];          // All media attachments
  attachments?: PostAttachment[]; // Structured attachments
  
  // Engagement stats (optional but nice to have)
  reactions_count?: {
    support: number;
    love: number;
    fire: number;
    congrats: number;
  };
  comments_count?: number;
  shares_count?: number;
}
```

**Field Priority:**

| Priority | Field | Reason |
|----------|-------|--------|
| **Critical** | `id` | Navigation to original post |
| **Critical** | `content` | Display original post text |
| **Critical** | `created_at` | Show timestamp |
| **Critical** | `author.id` | Author identification |
| **Critical** | `author.display_name` | Display author name |
| **Critical** | `author.username` | Display @username |
| **High** | `author.avatar_url` | Display author avatar |
| **High** | `image_url` / `media_urls` | Display media preview |
| **Medium** | `reactions_count` | Show engagement stats |
| **Medium** | `comments_count` | Show comment count |
| **Low** | `visibility` | Future filtering logic |
| **Low** | `shares_count` | Additional context |

---

### 3. **Should this be opt-in via query parameter, or always included?**

✅ **Always include it (no query parameter needed)**.

**Reasoning:**

1. **Simplicity:** Mobile app doesn't need to track which query to use
2. **Consistency:** All reposts always have complete data
3. **Performance:** Reposts are relatively rare, so performance impact is minimal
4. **Developer Experience:** One consistent response format
5. **Future-proof:** No need to update mobile app if we add more repost features

**Performance Consideration:**
- Most posts are NOT reposts (maybe 10-20% of feed)
- For non-reposts, `reposted_from` is just `null`
- Only reposts trigger the additional join
- This is acceptable overhead for better UX

**If Performance Becomes an Issue:**
We can revisit the query parameter approach later, but we recommend starting with always-included to validate the feature first.

---

## Complete TypeScript Interface

Here's what we expect in the mobile app:

```typescript
interface Post {
  // Standard post fields
  id: string;
  user_id: string;
  content: string;
  visibility: 'public' | 'connections' | 'private';
  post_type: string;
  created_at: string;
  updated_at: string;
  
  // Author
  author: PostAuthor;
  
  // Engagement
  reactions_count: {
    support: number;
    love: number;
    fire: number;
    congrats: number;
  };
  comments_count: number;
  shares_count: number;
  
  // User interaction
  user_reaction: 'support' | 'love' | 'fire' | 'congrats' | null;
  user_reposted: boolean;
  user_repost_id: string | null;
  
  // Repost data (NEW - what we need)
  reposted_from_id: string | null;  // ✅ ADD THIS
  reposted_from: {                  // ✅ ADD THIS
    id: string;
    content: string;
    created_at: string;
    visibility: string;
    author: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
    image_url?: string | null;
    audio_url?: string | null;
    media_urls?: string[];
    reactions_count?: {
      support: number;
      love: number;
      fire: number;
      congrats: number;
    };
    comments_count?: number;
    shares_count?: number;
  } | null;
  
  // Media
  image_url?: string | null;
  audio_url?: string | null;
  media_urls?: string[];
  attachments?: PostAttachment[];
}
```

---

## Example Response We Need

**Scenario: User "Justice Asibe" reposts a post from "Jake"**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "repost-abc123",
        "user_id": "user-justice",
        "content": "I agree",
        "visibility": "public",
        "post_type": "update",
        "created_at": "2025-12-20T22:31:00Z",
        "updated_at": "2025-12-20T22:31:00Z",
        
        "author": {
          "id": "user-justice",
          "username": "JusticeAsi92856",
          "display_name": "Justice Asibe",
          "avatar_url": "https://..."
        },
        
        "reactions_count": { "support": 5, "love": 2, "fire": 0, "congrats": 0 },
        "comments_count": 1,
        "shares_count": 0,
        
        "user_reaction": null,
        "user_reposted": false,
        "user_repost_id": null,
        
        "reposted_from_id": "original-xyz789",
        "reposted_from": {
          "id": "original-xyz789",
          "content": "Anderson Brito has some special stuff. Fastball can reach triple digits. Breaking ball gets some nice depth on it. He's got a changeup as well.\n\nHe had 65 strikeouts in 49.1 innings in high A last season at 21 years old.",
          "created_at": "2025-12-19T17:00:00Z",
          "visibility": "public",
          
          "author": {
            "id": "user-jake",
            "username": "TBRaysCentral",
            "display_name": "Jake",
            "avatar_url": "https://..."
          },
          
          "media_urls": ["https://.../baseball-video.mp4"],
          "image_url": null,
          "audio_url": null,
          
          "reactions_count": { "support": 70, "love": 15, "fire": 8, "congrats": 5 },
          "comments_count": 7,
          "shares_count": 9
        }
      },
      
      // ... more posts
    ],
    
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_posts": 150,
      "has_more": true
    }
  }
}
```

---

## Mobile App Implementation Status

We've already implemented the UI components that depend on this data:

### ✅ **Components Created:**
1. **`RepostedPostCard`** (`src/components/RepostedPostCard.tsx`)
   - Displays the original post in a bordered card
   - Shows author avatar, name, timestamp
   - Displays content (truncated to 4 lines)
   - Shows media preview
   - Shows engagement stats
   - Tappable to view full original post

2. **`PostCard` Updates** (`src/components/PostCard.tsx`)
   - Checks for `post.reposted_from_id`
   - Displays user's comment at top
   - Renders `RepostedPostCard` below with `post.reposted_from` data

### 🎨 **Current Behavior:**
- If `reposted_from` is included → displays Twitter-style quote repost ✅
- If `reposted_from` is missing → will show user's comment only (incomplete UX) ❌

### 🚀 **Ready to Use:**
As soon as you add `reposted_from` to the API response, the mobile app will automatically start displaying quote reposts correctly. No mobile app changes needed!

---

## Testing Requirements

Once implemented, we'll test:

1. **Repost display:**
   - User's comment shows at top
   - Original post in bordered card below
   - Author avatar and name correct
   - Media preview displays
   - Stats show correctly

2. **Performance:**
   - Feed loads within 1-2 seconds
   - No noticeable delay from nested join
   - Pagination still works correctly

3. **Edge cases:**
   - Repost of a repost (should show original, not intermediate)
   - Deleted original post (handle gracefully)
   - Private original post (handle permissions)

---

## Additional Considerations

### **Repost of a Repost:**
If someone reposts a repost, `reposted_from` should always point to the **original post**, not the intermediate repost.

**Example:**
```
Original Post by Jake
  → Reposted by Alice (reposted_from = Jake's post)
    → Reposted by Bob (reposted_from = Jake's post, NOT Alice's repost)
```

This is already handled in your backend SQL (`REPOST_ENHANCEMENT_TICKETS_FOR_WEB_TEAM.md` - Ticket #1).

### **Deleted Original Posts:**
If the original post is deleted:
```json
{
  "reposted_from_id": "deleted-post-id",
  "reposted_from": null  // Or return a placeholder object
}
```

Mobile app will handle this gracefully by showing:
- User's comment only
- "Original post unavailable" message

### **Private Original Posts:**
If the original post is private and current user doesn't have access:
```json
{
  "reposted_from_id": "private-post-id",
  "reposted_from": null  // Or return limited data
}
```

Mobile app will show same behavior as deleted posts.

---

## Summary

### **Our Requirements:**
| Question | Answer |
|----------|--------|
| Need full object or ID only? | ✅ **Full nested object** |
| What fields? | See "Required Fields" section above |
| Query parameter or always included? | ✅ **Always included** |
| Estimated impact on mobile? | 🚀 **Immediate visual improvement** |

### **Implementation Priority:**
🔥 **HIGH** - This is blocking the Twitter-style repost display feature

### **Mobile App Readiness:**
✅ **100% Ready** - UI components already built and waiting for data

### **Estimated Timeline:**
Once you implement this, we can test and merge to production within 24 hours.

---

## Questions for Web Team?

None at this time. Your proposed implementation (Option 2) matches our needs perfectly. 

Please proceed with adding the nested `reposted_from` object to the `/api/posts/feed` endpoint.

---

**Status:** ✅ **Requirements Confirmed - Ready for Implementation**

**Next Step:** Web team implements nested `reposted_from` object in feed endpoint

**ETA Request:** 2-3 hours (as estimated by web team)

