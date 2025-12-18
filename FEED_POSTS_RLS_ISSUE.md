# Feed Posts Not Showing - RLS Investigation

**Date:** December 18, 2025  
**Status:** 🔍 **INVESTIGATING**  
**Related To:** `user_roles` RLS infinite recursion fix

---

## 🔍 **Problem**

After fixing the `audio_tracks` RLS circular dependency, audio tracks now work correctly. However, **feed posts are not showing** in the mobile app's Feed screen.

### **Symptoms**
- ✅ User can create new posts (post creation works)
- ❌ Posts don't appear in the feed after creation
- ❌ Existing posts don't show in the feed
- ✅ Other features work (playlists, albums, creators, events)

### **What Works**
- Post creation
- Image/audio upload for posts
- Reactions (if posts were visible)
- Comments (if posts were visible)

### **What Doesn't Work**
- Feed query returning posts
- Viewing any posts in feed

---

## 🤔 **Hypothesis**

The `posts` table might have similar RLS policy issues as `audio_tracks` had. The fix applied to `audio_tracks` and `user_roles` might not have addressed the `posts` table.

### **Possible RLS Policy Issue**

**If `posts` table has a policy like this:**
```sql
CREATE POLICY "view_posts" ON posts FOR SELECT
USING (
  user_id = auth.uid() OR
  visibility = 'public' OR
  -- PROBLEM: This might reference user_roles
  (
    SELECT role FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  ) IS NOT NULL
);
```

This would create a similar circular dependency if `user_roles` policies reference posts.

---

## 🔍 **Diagnostic Steps**

### **Step 1: Check Current RLS Policies on Posts Table**

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'posts';
```

Look for:
- Policies that reference `user_roles` table
- Policies with subqueries to other tables
- Policies added/modified on Dec 17-18, 2025

### **Step 2: Test Direct Query**

```sql
-- Try to query posts as current user
SELECT id, content, user_id, created_at 
FROM posts 
WHERE deleted_at IS NULL 
AND visibility = 'public'
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected result:**
- ✅ Should return posts (if they exist)
- ❌ If no posts returned or error, RLS policy issue confirmed

### **Step 3: Check for Errors**

```sql
-- Check recent errors in logs
-- Look for error code 42P17 (infinite recursion)
```

### **Step 4: Temporarily Disable RLS (TESTING ONLY)**

```sql
-- WARNING: Only for testing! Re-enable after test!
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- Try query again
SELECT * FROM posts WHERE deleted_at IS NULL LIMIT 10;

-- Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

If posts show up with RLS disabled, the policy is the issue.

---

## 🛠️ **Potential Fix**

### **Option 1: Simplify Posts Policy (Recommended)**

```sql
-- Drop existing complex policy
DROP POLICY IF EXISTS "view_posts_with_admin_check" ON posts;

-- Create simple policy without circular dependency
CREATE POLICY "view_posts_simple" ON posts FOR SELECT
USING (
  -- User can see their own posts
  user_id = auth.uid() 
  OR 
  -- Public posts visible to authenticated users
  (visibility = 'public' AND auth.role() = 'authenticated')
  OR
  -- Admins can see all posts (use JWT claim, not table lookup)
  (auth.jwt()->>'role' IN ('admin', 'moderator'))
);
```

### **Option 2: Use SECURITY DEFINER Function (Same as Audio Tracks Fix)**

```sql
-- Reuse the is_admin_user() function created for audio_tracks
CREATE POLICY "view_posts_with_admin_function" ON posts FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  visibility = 'public' 
  OR 
  is_admin_user()  -- Uses the safe function
);
```

---

## 📋 **Verification After Fix**

### **SQL Tests**

```sql
-- Test 1: Query public posts
SELECT COUNT(*) FROM posts 
WHERE deleted_at IS NULL 
AND visibility = 'public';
-- Should return count > 0 if posts exist

-- Test 2: Query user's own posts
SELECT COUNT(*) FROM posts 
WHERE user_id = auth.uid();
-- Should return user's post count

-- Test 3: Check specific post
SELECT * FROM posts 
WHERE id = 'REPLACE_WITH_NEWLY_CREATED_POST_ID';
-- Should return the post
```

### **Mobile App Tests**

1. ✅ Open Feed screen → Should see posts
2. ✅ Pull to refresh → Should reload posts
3. ✅ Create new post → Should appear in feed immediately
4. ✅ Scroll down → Should load more posts
5. ✅ React to post → Should update reaction count
6. ✅ Comment on post → Should open comments modal

---

## 📊 **Related Tables to Check**

While fixing `posts`, also check these related tables for similar RLS issues:

```sql
-- Check RLS policies on related tables
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN (
  'posts',
  'post_reactions',
  'post_comments',
  'post_attachments'
)
ORDER BY tablename, policyname;
```

---

## 🚨 **If Posts Still Don't Show After RLS Fix**

### **Alternative Issues to Check**

1. **API Endpoint Issue**
   - Check if `/api/posts/feed` endpoint is returning empty array
   - Check endpoint logs for errors

2. **Frontend Cache Issue**
   - Clear app cache: Settings → Clear Cache
   - Restart expo server: `npx expo start --clear`

3. **Data Issue**
   - Verify posts actually exist in database:
     ```sql
     SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL;
     ```

4. **Realtime Subscription Issue**
   - Check if Supabase Realtime is enabled for `posts` table
   - Verify realtime subscription in mobile app

---

## 📞 **Information Needed from Web Team**

1. **RLS Policies:**
   - Share all RLS policies on `posts` table
   - Share all RLS policies on `post_reactions`, `post_comments`
   - Were any policies added/modified on Dec 17-18?

2. **Recent Changes:**
   - Any changes to posts table schema?
   - Any changes to posts API endpoints?
   - Any changes to feed endpoint logic?

3. **Test Data:**
   - Do posts exist in the database?
   - Run: `SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL;`
   - Share the count

4. **API Endpoint:**
   - Is `/api/posts/feed` working?
   - What does it return for an authenticated user?
   - Any errors in API logs?

---

## 🎯 **Action Items**

### **For Web Team**
1. [ ] Check RLS policies on `posts` table (Step 1 above)
2. [ ] Test direct query (Step 2 above)
3. [ ] If RLS issue found, apply fix (Option 1 or 2 above)
4. [ ] Verify with SQL tests
5. [ ] Notify mobile team when fixed

### **For Mobile Team**
1. [ ] Share console logs from Feed screen
2. [ ] Try pull-to-refresh on Feed screen
3. [ ] Note exact error messages
4. [ ] Wait for web team's RLS fix
5. [ ] Test after fix is deployed

---

## 📝 **Timeline**

| Time | Event | Status |
|------|-------|--------|
| Dec 18 AM | `audio_tracks` RLS issue discovered | ✅ Fixed |
| Dec 18 PM | `audio_tracks` RLS fix deployed | ✅ Verified |
| Dec 18 PM | Feed posts not showing | 🔍 Investigating |
| Dec 18 PM | Hypothesis: `posts` RLS issue | ⏳ Pending verification |

---

**Status:** 🔍 **NEEDS WEB TEAM INVESTIGATION**  
**Priority:** 🟡 **MEDIUM** (users can't see posts, but can create them)  
**ETA:** ~10-15 minutes to diagnose and fix (if RLS issue)

---

**Next Step:** Web team runs diagnostic queries and shares results.


