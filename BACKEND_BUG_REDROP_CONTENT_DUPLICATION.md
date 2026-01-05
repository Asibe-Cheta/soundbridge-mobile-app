# 🐛 Backend Bug: Normal Redrops Copy Original Content

**Date:** January 1, 2026
**Priority:** 🔴 **HIGH** (User-Facing Issue)
**Reported By:** Mobile Team
**For:** Backend Team

---

## 🐛 Bug Description

When users create a **normal redrop** (quick redrop without comment), the backend is copying the original post's content into the new repost, instead of leaving it empty.

**Expected:** Normal redrop should have `content = null` or `content = ""`
**Actual:** Normal redrop has `content = <original post content>`

This causes duplicate content display in the feed.

---

## 📸 Screenshot Evidence

User redropped a post twice (normal redrops, no comment added):
- Both show the text: "I just released a cover (Ifunanya by prinx Emmanuel) check it out."
- This text should NOT appear in the reposter's content section
- It should ONLY appear in the embedded original post card

---

## 🔍 Root Cause

**File:** `apps/web/app/api/posts/[id]/repost/route.ts` (POST handler)

**Issue:** When `with_comment: false`, the backend is still copying the original post's `content` field into the new repost.

**Current Behavior (INCORRECT):**
```typescript
// When creating repost
const newPost = {
  user_id: user.id,
  content: originalPost.content, // ❌ WRONG - copies original content
  reposted_from_id: originalPost.id,
  // ...
}
```

**Expected Behavior (CORRECT):**
```typescript
// When creating repost
const newPost = {
  user_id: user.id,
  content: with_comment ? comment : null, // ✅ CORRECT - only set content if with_comment is true
  reposted_from_id: originalPost.id,
  // ...
}
```

---

## 📋 Request Payload Analysis

### Normal Redrop (Mobile Sends)
```json
POST /api/posts/{postId}/repost
{
  "with_comment": false
}
```

**Expected Backend Behavior:**
```typescript
const newPost = {
  user_id: user.id,
  content: null, // ✅ Should be null/empty
  reposted_from_id: postId,
  post_type: 'update',
  visibility: originalPost.visibility
}
```

### Redrop with Comment (Mobile Sends)
```json
POST /api/posts/{postId}/repost
{
  "with_comment": true,
  "comment": "This is my comment on the original post"
}
```

**Expected Backend Behavior:**
```typescript
const newPost = {
  user_id: user.id,
  content: "This is my comment on the original post", // ✅ User's comment
  reposted_from_id: postId,
  post_type: 'update',
  visibility: originalPost.visibility
}
```

---

## 🔧 Required Fix

### Location
**File:** `apps/web/app/api/posts/[id]/repost/route.ts`

### Change Required

**Before (INCORRECT):**
```typescript
// Create new post for repost
const { data: newPost, error: createError } = await supabase
  .from('posts')
  .insert({
    user_id: user.id,
    content: originalPost.content, // ❌ WRONG - always copies original content
    post_type: originalPost.post_type || 'update',
    visibility: originalPost.visibility || 'public',
    // ... other fields
  })
  .select()
  .single();
```

**After (CORRECT):**
```typescript
// Create new post for repost
const { data: newPost, error: createError } = await supabase
  .from('posts')
  .insert({
    user_id: user.id,
    content: with_comment && comment ? comment.trim() : null, // ✅ CORRECT - only set if with_comment
    post_type: originalPost.post_type || 'update',
    visibility: originalPost.visibility || 'public',
    // ... other fields
  })
  .select()
  .single();
```

**Key Change:**
```typescript
// OLD
content: originalPost.content

// NEW
content: with_comment && comment ? comment.trim() : null
```

---

## 🧪 Testing

### Test Case 1: Normal Redrop (No Comment)
**Steps:**
1. User taps redrop button on a post
2. User selects "Redrop" (quick redrop, no comment)
3. Mobile sends: `{ "with_comment": false }`

**Expected Database Record:**
```sql
SELECT content, reposted_from_id FROM posts WHERE id = '<new_repost_id>';

-- Should return:
content: null
reposted_from_id: '<original_post_id>'
```

**Expected Mobile Display:**
```
┌─────────────────────────────┐
│ 🔁 REDROPPED                │
│                             │
│ Asibe Cheta                 │
│ just now                    │
│                             │
│ ┌─────────────────────────┐ │
│ │ Ebuka    7h ago         │ │
│ │ I just released a cover │ │
│ │ (Ifunanya by prinx      │ │
│ │ Emmanuel) check it out. │ │
│ └─────────────────────────┘ │
│                             │
│ 👍 💬 🔁 ➤ 💰              │
└─────────────────────────────┘
```
**No duplicate content above the embedded card** ✅

### Test Case 2: Redrop with Comment
**Steps:**
1. User taps redrop button on a post
2. User selects "Redrop with your thoughts"
3. User writes: "This is fire! 🔥"
4. Mobile sends: `{ "with_comment": true, "comment": "This is fire! 🔥" }`

**Expected Database Record:**
```sql
SELECT content, reposted_from_id FROM posts WHERE id = '<new_repost_id>';

-- Should return:
content: 'This is fire! 🔥'
reposted_from_id: '<original_post_id>'
```

**Expected Mobile Display:**
```
┌─────────────────────────────┐
│ 🔁 REDROPPED                │
│                             │
│ Asibe Cheta                 │
│ just now                    │
│                             │
│ This is fire! 🔥            │ ← User's comment
│                             │
│ ┌─────────────────────────┐ │
│ │ Ebuka    7h ago         │ │
│ │ I just released a cover │ │
│ │ (Ifunanya by prinx      │ │
│ │ Emmanuel) check it out. │ │
│ └─────────────────────────┘ │
│                             │
│ 👍 💬 🔁 ➤ 💰              │
└─────────────────────────────┘
```
**User's comment shown, then original post** ✅

---

## 🔍 How to Verify the Bug

### Check Current Backend Behavior

**Query the database after normal redrop:**
```sql
-- Find recent reposts
SELECT id, user_id, content, reposted_from_id, created_at
FROM posts
WHERE reposted_from_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Look for:**
- `content` field should be `null` for normal redrops
- `content` field should have user's comment for redrops with thoughts

**Current Bug:**
- `content` is copying original post content even when `with_comment: false`

---

## 📊 Impact

**User Experience:**
- ❌ Confusing - users see duplicate content
- ❌ Looks like "redrop with thoughts" when it's actually a normal redrop
- ❌ Feed is cluttered with duplicate text

**Data Integrity:**
- ❌ Database stores incorrect data (content should be null for normal redrops)
- ❌ Cannot distinguish between normal redrops and redrops with comments

**Platform Consistency:**
- ❌ Doesn't match Twitter behavior (retweets don't copy content)
- ❌ Doesn't match LinkedIn behavior (reshares don't copy content)

---

## ✅ Acceptance Criteria

After fix, verify:

1. **Normal Redrop:**
   - [x] `content` field is `null` or empty string in database
   - [x] Mobile displays: "REDROPPED" + original post card only
   - [x] No duplicate content shown

2. **Redrop with Comment:**
   - [x] `content` field contains user's comment in database
   - [x] Mobile displays: "REDROPPED" + user's comment + original post card
   - [x] User's comment shown above original post

3. **Backward Compatibility:**
   - [x] Existing reposts still display correctly
   - [x] No breaking changes to API contract

---

## 🚨 Priority Justification

**Why This is HIGH Priority:**

1. **User-Facing:** Directly impacts every user who redrops
2. **Confusing UX:** Users think they're doing something wrong
3. **Data Quality:** Storing incorrect data in production database
4. **Platform Consistency:** Doesn't match standard social media behavior
5. **Easy Fix:** Single line change in backend code

**Estimated Fix Time:** 5-10 minutes
**Estimated Test Time:** 5 minutes

---

## 📝 Related Issues

- ✅ **Issue 1:** Duplicate content display (mobile fix complete)
- ✅ **Issue 2:** Multiple redrops allowed (backend fix complete)
- 🔴 **Issue 3:** Normal redrops copying content (this issue - NEEDS FIX)

---

## 🔗 References

- **Mobile Fix:** [src/components/PostCard.tsx:358](src/components/PostCard.tsx#L358) - Conditionally shows content
- **Backend File:** `apps/web/app/api/posts/[id]/repost/route.ts` - Needs fix
- **Documentation:** [REDROP_IMPLEMENTATION_COMPLETE.md](REDROP_IMPLEMENTATION_COMPLETE.md)

---

## 📞 Contact

**Reported By:** Mobile Development Team
**Date:** January 1, 2026
**Status:** 🔴 **OPEN** - Awaiting Backend Fix

---

## ✅ Verification Steps (After Fix)

1. **Deploy backend fix**
2. **Clear database:** Delete test reposts with incorrect content
3. **Test normal redrop:**
   ```
   Mobile App → Tap Redrop → Select "Redrop"
   Database → Verify content is null
   Mobile App → Verify no duplicate content shown
   ```
4. **Test redrop with comment:**
   ```
   Mobile App → Tap Redrop → Select "Redrop with your thoughts" → Write comment
   Database → Verify content has user's comment
   Mobile App → Verify comment shown above original post
   ```
5. **Update documentation** to mark as resolved

---

**Expected Resolution Time:** Within 1 day (simple one-line fix)

**Status:** ✅ **RESOLVED** - Backend Fix Deployed

---

## ✅ Resolution

**Date Fixed:** January 1, 2026
**Fixed By:** Backend Team
**Status:** ✅ **COMPLETE**

**Change Made:**
```typescript
// Fixed in apps/web/app/api/posts/[id]/repost/route.ts
content: with_comment && comment ? comment.trim() : null
```

**Result:**
- Normal redrops now have `content: null` in database ✅
- Mobile app displays clean redrops without duplicate content ✅
- Redrop with thoughts correctly shows user's comment ✅

---

**Document Version:** 2.0
**Created:** January 1, 2026
**Resolved:** January 1, 2026
**Priority:** 🔴 HIGH → ✅ RESOLVED
**Type:** Bug Fix - COMPLETE
