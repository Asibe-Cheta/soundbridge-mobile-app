# 🚨 URGENT: Missing Posts Investigation

**To:** Web App Team  
**From:** Mobile App Team  
**Date:** December 22, 2025  
**Priority:** CRITICAL  
**Subject:** All feed posts have disappeared - Data loss or visibility issue

---

## 🔴 **CRITICAL ISSUE**

**All feed posts have disappeared from the mobile app.** Users previously created real posts, but they are no longer showing in the feed.

### **Observed Behavior:**
- Mobile app is successfully calling `/api/posts/feed?page=1&limit=10`
- API returns `200 OK` status
- API returns `0 posts` in the response
- Terminal logs show: `📡 API Response: 200` followed by `💾 Cached 0 posts (page 1)`

### **What This Means:**
The API endpoint is working, but it's returning an empty array. This suggests:
1. Posts were soft-deleted (set `deleted_at`), OR
2. Posts visibility was changed from `'public'` to `'connections'`, OR
3. RLS policies were changed and are now blocking access, OR
4. The API endpoint logic was modified and is incorrectly filtering posts

---

## 🔍 **Immediate Investigation Needed**

### **1. Check if posts still exist in the database:**
```sql
SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_posts,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted_posts
FROM posts;
```

**Expected:** Posts should exist with `deleted_at = NULL`

---

### **2. Check post visibility settings:**
```sql
SELECT 
  visibility,
  COUNT(*) as count
FROM posts
WHERE deleted_at IS NULL
GROUP BY visibility;
```

**Expected:** Posts should have `visibility = 'public'` so all users can see them

---

### **3. Check recent posts:**
```sql
SELECT 
  id,
  LEFT(content, 100) as content_preview,
  visibility,
  post_type,
  created_at,
  deleted_at
FROM posts
ORDER BY created_at DESC
LIMIT 20;
```

**Expected:** Recent posts should have `deleted_at = NULL` and `visibility = 'public'`

---

### **4. Check RLS policies:**
```sql
SELECT 
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'posts';
```

**Expected:** RLS policy should allow viewing public posts:
```sql
-- Users can view posts from connections or public posts
CREATE POLICY "Users can view connection posts"
ON posts FOR SELECT
USING (
  visibility = 'public' OR
  user_id IN (
    SELECT connected_user_id FROM connections WHERE user_id = auth.uid()
    UNION
    SELECT user_id FROM connections WHERE connected_user_id = auth.uid()
  )
);
```

---

### **5. Check the Feed API endpoint logic:**
File: Likely in `pages/api/posts/feed.ts` or similar

**Please verify:**
- Does the endpoint properly filter posts with `deleted_at IS NULL`?
- Does it properly return public posts?
- Was any logic recently changed that might affect post visibility?
- Are there any additional filters being applied?

---

## 📋 **Action Items**

### **For Web Team (URGENT):**

- [ ] **Run diagnostic queries** (provided in `URGENT_MISSING_POSTS_INVESTIGATION.sql`)
- [ ] **Verify posts exist** in the database and are not soft-deleted
- [ ] **Check post visibility** - Are posts set to 'public' or 'connections'?
- [ ] **Verify RLS policies** - Are they correctly allowing public post access?
- [ ] **Review Feed API endpoint** - Any recent changes to `/api/posts/feed`?
- [ ] **Check database triggers** - Is anything automatically soft-deleting posts?
- [ ] **Review audit logs** - Were posts deleted or modified recently?

### **Temporary Fix (if needed):**

If posts were accidentally set to `visibility = 'connections'`:
```sql
UPDATE posts 
SET visibility = 'public' 
WHERE deleted_at IS NULL 
  AND visibility = 'connections';
```

If posts were accidentally soft-deleted:
```sql
UPDATE posts 
SET deleted_at = NULL 
WHERE deleted_at IS NOT NULL;
```

---

## 🎯 **User Impact**

- **All mobile users** cannot see any feed posts
- Users think their posts were deleted
- No engagement (reactions, comments) possible
- Major impact on user experience and trust

---

## 📞 **Contact**

This is blocking production use. Please investigate immediately and respond with:
1. What happened to the posts?
2. Why is the API returning 0 posts?
3. What was changed recently that might have caused this?
4. When can this be fixed?

**We have 5 active users who created posts:**
- asibecheta2@gmail.com (a39e95f8-2433-4064-bacb-3006fbec304c)
- bervicweb@gmail.com (c9119aff-cfdf-4fbc-9d7d-6178f1f02bba)
- bervicdigital@gmail.com (295cb70d-5a5a-47fc-ba7e-c6dc8c4512ce)
- bervicgroup@gmail.com (fdbf70f0-ceda-45f4-bb31-156f69e5fc12)
- asibejustice@gmail.com (812c973d-c345-4ce4-9aeb-1ea74e6008f7)

Please check if posts from these users still exist in the database.

---

Thank you for your immediate attention to this critical issue.

