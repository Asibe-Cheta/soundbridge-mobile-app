# 🔴 BUG REPORT: API Endpoint Missing Repost Data Fields

**Date:** January 2, 2026
**Reported by:** Mobile Team
**Severity:** High
**Status:** Needs Backend Fix
**Affected Endpoint:** `GET /api/posts/user/:userId`

---

## 🐛 Problem Summary

The API endpoint `GET /api/posts/user/:userId` is NOT returning the `reposted_from_id` and `reposted_from` fields for posts, even though these fields exist in the database and are correctly returned by other endpoints like `GET /api/posts/feed`.

---

## 📊 Evidence

### Working Endpoint (Main Feed)
`GET /api/posts/feed` correctly returns repost data:

```json
{
  "id": "dcbf96bb-c4a8-4397-a9e4-206543195882",
  "content": "",
  "reposted_from_id": "0a856b74-8fed-48ab-8a1b-432429939842",
  "reposted_from": {
    "id": "0a856b74-8fed-48ab-8a1b-432429939842",
    "content": "People are not ready for SoundBridge!",
    "author": { ... }
  }
}
```

### Broken Endpoint (User Posts)
`GET /api/posts/user/:userId` is missing these fields:

```json
{
  "id": "dcbf96bb-c4a8-4397-a9e4-206543195882",
  "content": "",
  // ❌ reposted_from_id is missing or null
  // ❌ reposted_from is missing or null
}
```

### Console Log Evidence

```javascript
// Main feed (working):
feedService.ts:334 📦 Post dcbf96bb-c4a8-4397-a9e4-206543195882:
  reposted_from_id=0a856b74-8fed-48ab-8a1b-432429939842,
  has reposted_from=true

// User posts endpoint (broken):
CreatorProfileScreen.tsx:612 📝 Post 1: {
  id: 'dcbf96bb-c4a8-4397-a9e4-206543195882',
  content: '(empty)',
  contentLength: 0,
  reposted_from_id: null,  // ❌ Should be '0a856b74-8fed-48ab-8a1b-432429939842'
  reposted_from_content: undefined  // ❌ Should have content
}
```

---

## 🎯 Required Fix

### Backend API Changes Needed:

1. **Update the `/api/posts/user/:userId` endpoint** to include `reposted_from_id` in the SELECT query:
   ```sql
   SELECT
     posts.*,
     posts.reposted_from_id  -- ✅ Make sure this is included
   FROM posts
   WHERE user_id = :userId
   ```

2. **Add JOIN to fetch `reposted_from` post data** (matching the feed endpoint):
   ```sql
   SELECT
     posts.*,
     posts.reposted_from_id,
     -- Also fetch the original post if this is a repost
     original_post.id as reposted_from_id,
     original_post.content as reposted_from_content,
     original_post.user_id as reposted_from_user_id,
     -- ... other reposted_from fields
   FROM posts
   LEFT JOIN posts as original_post ON posts.reposted_from_id = original_post.id
   WHERE posts.user_id = :userId
   ```

3. **Include `reposted_from` nested object in API response** (matching feed endpoint format):
   ```typescript
   {
     id: post.id,
     content: post.content,
     reposted_from_id: post.reposted_from_id,  // ✅ Add this
     reposted_from: post.reposted_from_id ? {  // ✅ Add this
       id: original_post.id,
       content: original_post.content,
       author: {
         id: original_author.id,
         name: original_author.display_name,
         username: original_author.username,
         avatar_url: original_author.avatar_url
       }
     } : null
   }
   ```

---

## 📱 Impact on Mobile App

Until this is fixed:
- ❌ Reposted posts (redrops) appear as empty cards on creator profiles
- ❌ Users see blank post cards instead of the embedded original post content
- ❌ Quote reposts don't display correctly in the Drops tab
- ❌ Main feed works fine, but creator profile Drops tab is broken

---

## ✅ Verification Steps (After Backend Fix)

1. **Make API request to get user posts:**
   ```bash
   GET https://www.soundbridge.live/api/posts/user/bd8a455d-a54d-45c5-968d-e4cf5e8d928e?page=1&limit=10
   ```

2. **Verify response includes repost fields:**
   ```json
   {
     "posts": [
       {
         "id": "dcbf96bb-c4a8-4397-a9e4-206543195882",
         "content": "",
         "reposted_from_id": "0a856b74-8fed-48ab-8a1b-432429939842",  // ✅ Should be present
         "reposted_from": {  // ✅ Should be present
           "id": "0a856b74-8fed-48ab-8a1b-432429939842",
           "content": "People are not ready for SoundBridge!",
           "author": { ... }
         }
       }
     ]
   }
   ```

3. **Check mobile app Creator Profile Drops tab:**
   - Should show embedded RepostedPostCard for posts with `reposted_from_id`
   - Should NOT show empty cards

---

## 📝 Additional Notes

- The mobile app code is correct and already handles `reposted_from` data properly
- The issue is purely on the backend API side
- The feed endpoint (`/api/posts/feed`) already works correctly and can be used as a reference
- No changes needed on mobile app once backend is fixed

---

## 🔗 Related Endpoints

**Working correctly:**
- `GET /api/posts/feed` ✅ Returns `reposted_from_id` and `reposted_from`

**Broken:**
- `GET /api/posts/user/:userId` ❌ Missing `reposted_from_id` and `reposted_from`

---

**Please fix this API endpoint to match the feed endpoint structure!**
