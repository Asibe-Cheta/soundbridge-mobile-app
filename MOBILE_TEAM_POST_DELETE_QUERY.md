# Mobile Team Query: Post Deletion API

**Date:** November 2025  
**Priority:** High  
**Status:** Awaiting Response

---

## 📋 Issue Summary

The mobile app is experiencing errors when attempting to delete posts. We need clarification on the correct API endpoint and request format for post deletion.

---

## 🔍 Current Implementation

### Current API Call
```typescript
// Current implementation in feedService.ts
async deletePost(postId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  await apiFetch(
    `/api/posts/${postId}`,
    {
      method: 'DELETE',
      session,
    }
  );
}
```

### Expected Behavior (from previous documentation)
- **Endpoint:** `DELETE /api/posts/[id]`
- **Method:** `DELETE`
- **Behavior:** Soft delete (sets `deleted_at` timestamp)
- **Authorization:** Only post author can delete

---

## ❓ Questions for Web App Team

1. **Is `DELETE /api/posts/[id]` the correct endpoint?**
   - If not, what is the correct endpoint?

2. **What is the expected request format?**
   - Should we send any body parameters?
   - Are there any required headers beyond authentication?

3. **What is the expected response format?**
   - What status code should we expect (200, 204, etc.)?
   - What should the response body contain (if any)?

4. **Is soft delete confirmed?**
   - Does the endpoint set `deleted_at` timestamp?
   - Should deleted posts be filtered out of feed queries automatically?

5. **Error handling:**
   - What error codes/messages should we expect for:
     - Unauthorized (not the post author)
     - Post not found
     - Other errors

---

## 🐛 Error Details

**Error Message:**
```
Failed to delete post: ReferenceError: Property 'setPosts' doesn't exist
```

**Note:** This appears to be a client-side error in our code, but we want to ensure we're using the correct API endpoint before fixing the client-side issue.

---

## 📝 Additional Context

- We're using Supabase for authentication
- We're using the `apiFetch` helper which handles Bearer token authentication
- The mobile app implements optimistic UI updates (removes post from UI immediately, then calls API)

---

## ✅ Next Steps

Once we receive confirmation on the API endpoint and format, we will:
1. Update the `deletePost` function in `feedService.ts`
2. Fix any client-side errors
3. Test the deletion flow end-to-end

---

**Thank you for your assistance!**

