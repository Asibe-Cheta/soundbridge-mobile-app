# Mobile Team - Feed Synchronization Request

**To:** Web App Team  
**From:** Mobile App Team  
**Date:** November 2025  
**Priority:** High  
**Subject:** Feed Post Synchronization Between Web and Mobile Apps

---

## 🎯 **Issue Summary**

We are experiencing two critical issues with the feed functionality:

1. **Feed Synchronization**: Posts created on the web app do not appear on the mobile app feed, and vice versa.
2. **Image Upload Error**: When posting from the mobile app with an image, we receive the error: `FeedService.uploadImage: Error: No file provided`

---

## 🔍 **Current Implementation**

### **Mobile App Feed Fetching:**
- **Primary Method**: API endpoint `/api/posts/feed?page={page}&limit={limit}`
- **Fallback Method**: Direct Supabase query (implemented as fallback when API returns 404)
- **Real-time Updates**: Using Supabase realtime subscriptions

### **Mobile App Post Creation:**
- **Endpoint**: `POST /api/posts`
- **Image Upload**: `POST /api/posts/upload-image`
- **Audio Upload**: `POST /api/posts/upload-audio`

---

## ❓ **Questions & Information Needed**

### **1. Feed API Endpoint (`/api/posts/feed`)**

**Question**: What is the exact structure and behavior of the `/api/posts/feed` endpoint?

**We need to confirm:**
- ✅ Does this endpoint exist and is it currently active?
- ✅ What query parameters does it accept? (We're using `page` and `limit`)
- ✅ What is the response format? (We expect: `{ posts: Post[], pagination: { page, limit, total, has_more } }`)
- ✅ Does it filter posts by visibility? (public, connections, etc.)
- ✅ Does it include soft-deleted posts? (We filter out posts where `deleted_at IS NOT NULL`)
- ✅ Does it respect user authentication and show only posts the user should see?
- ✅ Does it include posts from all users or only followed users?

**Current Behavior:**
- When the endpoint returns 404, we fall back to Supabase query
- Our Supabase fallback currently only shows `visibility = 'public'` posts
- We filter out soft-deleted posts (`deleted_at IS NULL`)

---

### **2. Post Creation API (`POST /api/posts`)**

**Question**: What is the exact request/response format for creating posts?

**We need to confirm:**
- ✅ Request body format:
  ```typescript
  {
    content: string; // max 500 chars
    post_type: 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
    visibility: 'public' | 'connections';
    image_url?: string; // URL returned from upload-image endpoint
    audio_url?: string; // URL returned from upload-audio endpoint
    event_id?: string; // Optional event reference
  }
  ```
- ✅ Response format: `{ post: Post }` or just `Post`?
- ✅ Does it validate content length, file sizes, etc.?
- ✅ What happens if `image_url` or `audio_url` is provided but invalid?

---

### **3. Image Upload API (`POST /api/posts/upload-image`)**

**Question**: What is the exact format expected for image uploads?

**We need to confirm:**
- ✅ Does this endpoint exist and is it currently active?
- ✅ What is the expected FormData field name? (We're using `'image'`)
- ✅ What file formats are supported? (JPEG, PNG, etc.)
- ✅ What is the maximum file size? (We're validating 3MB on mobile)
- ✅ What is the response format? (We expect: `{ url: string }` or `{ image_url: string }`)
- ✅ Does it require authentication via `Authorization: Bearer {token}` header?
- ✅ Should we set `Content-Type` header or let the browser/fetch set it automatically?

**Current Implementation:**
```typescript
const formData = new FormData();
formData.append('image', {
  uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
  name: filename,
  type: 'image/jpeg' | 'image/png',
} as any);

fetch(`${API_BASE_URL}/api/posts/upload-image`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: formData,
});
```

**Error We're Getting:**
- `Error: No file provided` - This suggests the backend isn't receiving the file properly
- The error occurs even when `uri` is a valid file path

---

### **4. Audio Upload API (`POST /api/posts/upload-audio`)**

**Question**: What is the exact format expected for audio uploads?

**We need to confirm:**
- ✅ Does this endpoint exist and is it currently active?
- ✅ What is the expected FormData field name? (We're using `'audio'`)
- ✅ What file formats are supported? (MP3, WAV, etc.)
- ✅ What is the maximum file size? (We're validating 10MB on mobile)
- ✅ What is the maximum duration? (We understand it should be 60 seconds max)
- ✅ What is the response format? (We expect: `{ url: string }` or `{ audio_url: string }`)

---

### **5. Database Schema - Posts Table**

**Question**: Can you confirm the exact schema of the `posts` table?

**We need to confirm:**
- ✅ Column names and types (especially: `id`, `user_id`, `content`, `post_type`, `visibility`, `image_url`, `audio_url`, `event_id`, `created_at`, `updated_at`, `deleted_at`)
- ✅ Foreign key relationships:
  - `user_id` → `profiles.id`
  - `event_id` → `events.id` (if applicable)
- ✅ Indexes on frequently queried columns
- ✅ Row Level Security (RLS) policies:
  - Can users read all public posts?
  - Can users only update/delete their own posts?
  - Are soft-deleted posts (`deleted_at IS NOT NULL`) filtered by RLS?

---

### **6. Post Reactions & Comments**

**Question**: What are the table structures for reactions and comments?

**We need to confirm:**
- ✅ `post_reactions` table structure:
  - Columns: `id`, `post_id`, `user_id`, `reaction_type` ('support' | 'love' | 'fire' | 'congrats'), `created_at`?
  - Can a user have multiple reactions to the same post, or is it one reaction per user?
- ✅ `post_comments` table structure:
  - Columns: `id`, `post_id`, `user_id`, `content`, `parent_comment_id` (for threading), `created_at`?
- ✅ How are reaction counts aggregated? (Database triggers, application logic, etc.)

---

### **7. Real-time Synchronization**

**Question**: How should we handle real-time updates?

**We need to confirm:**
- ✅ Are Supabase realtime subscriptions enabled for the `posts` table?
- ✅ What events should we listen to? (`INSERT`, `UPDATE`, `DELETE`?)
- ✅ Should we use Supabase realtime or a different mechanism (WebSockets, polling, etc.)?
- ✅ How quickly should new posts appear after creation? (Immediate, or is there a delay?)

---

## 🛠️ **What We've Implemented (Mobile Side)**

### **Feed Fetching:**
1. ✅ Primary: API endpoint `/api/posts/feed`
2. ✅ Fallback: Direct Supabase query when API returns 404
3. ✅ Filters: Only non-deleted posts (`deleted_at IS NULL`)
4. ✅ Visibility: Currently only showing `public` posts in fallback
5. ✅ Pagination: Supports page-based pagination
6. ✅ Reactions: Fetches reaction counts and user's current reaction
7. ✅ Comments: Fetches comment counts

### **Post Creation:**
1. ✅ Form validation (content length, file sizes)
2. ✅ Image picker integration
3. ✅ Audio picker integration
4. ✅ API call to create post
5. ✅ Optimistic UI updates
6. ✅ Error handling

### **Post Management:**
1. ✅ Edit posts (PATCH `/api/posts/{postId}`)
2. ✅ Delete posts (soft delete via PATCH with `deleted_at`)
3. ✅ Share posts (deep linking)
4. ✅ Save/bookmark posts
5. ✅ Add/remove reactions

---

## 🎯 **Expected Behavior**

### **Feed Synchronization:**
- ✅ Posts created on web app should appear on mobile app feed immediately (or after refresh)
- ✅ Posts created on mobile app should appear on web app feed immediately (or after refresh)
- ✅ Both apps should show the same posts in the same order (or similar personalized order)
- ✅ Soft-deleted posts should not appear in either app

### **Image Upload:**
- ✅ User selects image from gallery
- ✅ Image is uploaded to server
- ✅ Server returns image URL
- ✅ Post is created with image URL
- ✅ Image displays correctly in feed

---

## 📋 **Action Items**

### **For Web Team:**
1. **Confirm API Endpoints:**
   - [ ] Verify `/api/posts/feed` exists and is working
   - [ ] Verify `/api/posts` (POST) exists and is working
   - [ ] Verify `/api/posts/upload-image` exists and is working
   - [ ] Verify `/api/posts/upload-audio` exists and is working

2. **Provide API Documentation:**
   - [ ] Request/response formats for all endpoints
   - [ ] Authentication requirements
   - [ ] Error codes and messages
   - [ ] File upload specifications (FormData format, field names, etc.)

3. **Confirm Database Schema:**
   - [ ] Share `posts` table schema
   - [ ] Share `post_reactions` table schema
   - [ ] Share `post_comments` table schema
   - [ ] Confirm RLS policies

4. **Test Synchronization:**
   - [ ] Create a post on web app, verify it appears on mobile
   - [ ] Create a post on mobile app, verify it appears on web
   - [ ] Test image upload from mobile app
   - [ ] Test audio upload from mobile app

### **For Mobile Team:**
1. **Fix Image Upload:**
   - [x] Improve FormData handling for React Native
   - [x] Add better error messages
   - [ ] Test with actual backend once endpoint is confirmed

2. **Improve Feed Sync:**
   - [x] Add Supabase fallback
   - [ ] Add real-time subscriptions
   - [ ] Test with web app posts

---

## 🔗 **Related Files**

- Mobile Feed Service: `src/services/api/feedService.ts`
- Mobile Feed Hook: `src/hooks/useFeed.ts`
- Mobile Feed Screen: `src/screens/FeedScreen.tsx`
- Mobile Create Post Modal: `src/components/CreatePostModal.tsx`

---

## 📞 **Contact**

If you need any clarification or have questions, please reach out to the mobile team.

**Thank you for your assistance in ensuring seamless feed synchronization between web and mobile platforms!**

