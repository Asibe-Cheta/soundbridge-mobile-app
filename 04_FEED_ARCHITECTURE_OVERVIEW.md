# Feed System Architecture - Complete Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FeedScreen                          │
│  (Main orchestrator - handles UI, navigation, actions)     │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
┌───────▼──────┐  ┌────▼──────────────┐
│   useFeed    │  │   ToastContext    │
│   (Hook)     │  │   (Global state)  │
└───────┬──────┘  └───────────────────┘
        │
┌───────▼────────────────────────────────┐
│         FeedService                    │
│  (API calls + Supabase fallback)      │
└───────┬────────────────────────────────┘
        │
    ┌───┴────┐
    │        │
┌───▼───┐  ┌▼────────────┐
│  API  │  │  Supabase   │
│  REST │  │  (Fallback) │
└───────┘  └─────────────┘
```

---

## Data Flow

### 1. **Feed Loading (Initial + Refresh)**

```
User opens app
     │
     ├──> useFeed loads cached data (INSTANT)
     │    └──> Display cached posts immediately
     │
     ├──> Auth check (user + session)
     │
     ├──> Call feedService.getFeedPosts()
     │    │
     │    ├──> Try API: GET /api/posts/feed
     │    │    │
     │    │    ├──> Success (posts > 0) → Return posts
     │    │    │
     │    │    └──> Success (posts = 0) → FALLBACK to Supabase
     │    │         │
     │    │         └──> Direct Supabase queries:
     │    │              1. Query posts table
     │    │              2. Query profiles table (authors)
     │    │              3. Query post_attachments (images/audio)
     │    │              4. Query post_reactions (counts + user reaction)
     │    │              5. Query post_comments (counts)
     │    │              6. Query reposted posts + authors
     │    │              7. Merge data in JS → Return posts
     │    │
     │    └──> Error (404, network, etc.) → FALLBACK to Supabase
     │
     └──> Update cache with fresh data
          └──> Display posts
```

### 2. **Repost Flow**

```
User taps "Repost" button
     │
     ├──> PostCard: handleRepostPress()
     │    └──> Show RepostModal
     │
User selects option (Quick / With Comment / Undo)
     │
     ├──> PostCard calls: onRepost(post, withComment, comment)
     │
     └──> FeedScreen: handleRepost()
          │
          ├──> Check: post.user_reposted?
          │    │
          │    ├──> YES → Call feedService.unrepost()
          │    │    │     POST /api/posts/:id/repost (DELETE)
          │    │    └──> showToast('Repost removed')
          │    │
          │    └──> NO → Call feedService.repost()
          │         │     POST /api/posts/:id/repost
          │         │     Body: { with_comment, comment? }
          │         └──> showToast('Your post was sent')
          │
          └──> Call refresh()
               └──> Feed reloads with updated data
```

### 3. **Reaction Flow (Optimistic)**

```
User long-presses "Like" button
     │
     ├──> PostCard: Long-press timer (500ms)
     │    └──> Show ReactionPicker
     │
User selects reaction (e.g., Fire 🔥)
     │
     ├──> PostCard: handleReactionSelect('fire')
     │
     └──> PostCard calls: onReactionPress('fire')
          │
          └──> FeedScreen: handleReactionPress(postId, 'fire')
               │
               └──> useFeed: addReaction(postId, 'fire')
                    │
                    ├──> OPTIMISTIC UPDATE (UI updates immediately)
                    │    └──> Update reactions_count + user_reaction in state
                    │
                    ├──> Call feedService.addReaction()
                    │    └──> POST /api/posts/:id/reactions
                    │
                    ├──> Success → Update cache
                    │
                    └──> Error → REVERT optimistic update
```

---

## Key Services

### 1. **FeedService** (`src/services/api/feedService.ts`)

**Purpose:** Central API client for all feed-related operations

**Methods:**
- `getFeedPosts(page, limit)` - Fetch paginated posts
- `createPost(data)` - Create new post
- `updatePost(id, data)` - Update post
- `deletePost(id)` - Soft delete post
- `uploadImage(uri, postId?)` - Upload image attachment
- `uploadAudio(uri, postId?)` - Upload audio attachment
- `addReaction(postId, type)` - Add reaction
- `removeReaction(postId)` - Remove reaction
- `repost(postId, withComment, comment)` - Create repost
- `unrepost(postId)` - Remove repost
- `getComments(postId, page, limit)` - Get comments
- `addComment(postId, content, parentId?)` - Add comment
- `likeComment(commentId)` - Like comment
- `unlikeComment(commentId)` - Unlike comment

**Fallback Logic:**
```typescript
try {
  // Try API endpoint
  const response = await apiFetch('/api/posts/feed');
  if (response.posts.length === 0) {
    // Empty response → fallback
    return this.getFeedPostsFromSupabase(page, limit, session);
  }
  return { posts: response.posts, hasMore: response.pagination.has_more };
} catch (error) {
  if (error.status === 404) {
    // API not available → fallback
    return this.getFeedPostsFromSupabase(page, limit, session);
  }
  throw error;
}
```

### 2. **useFeed Hook** (`src/hooks/useFeed.ts`)

**Purpose:** React hook for feed state management

**State:**
- `posts: Post[]` - Array of posts
- `loading: boolean` - Initial load state
- `refreshing: boolean` - Pull-to-refresh state
- `hasMore: boolean` - More pages available
- `page: number` - Current page number
- `error: string | null` - Error message

**Methods:**
- `refresh()` - Refresh feed (force reload)
- `loadMore()` - Load next page
- `addReaction(postId, type)` - Add/toggle reaction (optimistic)
- `removeReaction(postId)` - Remove reaction (optimistic)
- `deletePost(postId)` - Delete post (optimistic)

**Cache Strategy:**
```typescript
// On mount: Load cache immediately (instant display)
const cached = await feedCacheService.getCachedFeed();
if (cached) {
  setPosts(cached.posts); // Instant!
}

// Then: Fetch fresh data in background
loadPosts(1, true); // Silent refresh
```

### 3. **FeedCacheService** (`src/services/feedCacheService.ts`)

**Purpose:** AsyncStorage-based caching for instant feed loading

**Methods:**
- `getCachedFeed()` - Get cached posts
- `saveFeedCache(posts, page, hasMore)` - Save full feed
- `appendToCache(posts, page, hasMore)` - Append new page
- `updatePostInCache(postId, updates)` - Update specific post
- `prependPostToCache(post)` - Add to top (new post)
- `removePostFromCache(postId)` - Remove specific post

**Cache Format:**
```json
{
  "posts": [...],
  "hasMore": true,
  "page": 1,
  "timestamp": 1703280000000
}
```

### 4. **SocialService** (`src/services/api/socialService.ts`)

**Purpose:** Social interactions (bookmarks, follows, etc.)

**Methods:**
- `toggleBookmark(request)` - Add/remove bookmark
- `getBookmarks(userId, type, limit, offset)` - Get user's bookmarks
- `followUser(userId)` - Follow user
- `unfollowUser(userId)` - Unfollow user

**RLS Fallback:**
```typescript
try {
  const response = await apiFetch('/api/social/bookmark', { method: 'POST' });
  return { data: response, error: null };
} catch (error) {
  // RLS error (400, 401, 405) → Fallback to Supabase
  if (error.status === 400 || error.status === 401 || error.status === 405) {
    return await this.toggleBookmarkSupabase(request, session);
  }
  throw error;
}
```

---

## Component Hierarchy

```
FeedScreen
│
├── LinearGradient (background)
├── SafeAreaView
│   └── FlatList
│       ├── ListHeaderComponent
│       │   ├── CreatePostPrompt
│       │   └── LiveAudioBanner
│       │
│       ├── renderItem (PostCard for each post)
│       │   ├── PostCard
│       │   │   ├── Header
│       │   │   │   ├── Avatar (TouchableOpacity → onAuthorPress)
│       │   │   │   ├── Author Info (TouchableOpacity → onAuthorPress)
│       │   │   │   ├── PostSaveButton
│       │   │   │   └── More Button
│       │   │   │
│       │   │   ├── Repost Indicator (if isRepost)
│       │   │   │
│       │   │   ├── Content Section
│       │   │   │   └── Text (post.content)
│       │   │   │
│       │   │   ├── RepostedPostCard (if isRepost)
│       │   │   │   └── Original post display
│       │   │   │
│       │   │   ├── Media Section (image/audio)
│       │   │   │
│       │   │   ├── Engagement Section
│       │   │   │   ├── Like Button (Pressable with long-press)
│       │   │   │   ├── Comment Button
│       │   │   │   ├── Repost Button
│       │   │   │   └── Share Button
│       │   │   │
│       │   │   └── Modals
│       │   │       ├── ReactionPicker
│       │   │       ├── CommentsModal
│       │   │       ├── RepostModal
│       │   │       ├── PostActionsModal
│       │   │       ├── FullScreenImageModal
│       │   │       ├── BlockUserModal
│       │   │       └── ReportContentModal
│       │   │
│       │   └── [Multiple PostCards rendered by FlatList]
│       │
│       └── ListFooterComponent (loading/end indicator)
│
├── CreatePostModal
└── CommentsModal (selected post)
```

---

## Data Models

### Post Type
```typescript
interface Post {
  id: string;
  author: PostAuthor;
  content: string;                           // max 500 chars
  post_type: PostType;                       // 'update' | 'opportunity' | etc.
  visibility: PostVisibility;                // 'public' | 'connections'
  image_url?: string;
  audio_url?: string;
  event_id?: string;
  reactions_count: {
    support: number;                         // 👍
    love: number;                            // ❤️
    fire: number;                            // 🔥
    congrats: number;                        // 👏
  };
  comments_count: number;
  shares_count?: number;
  user_reaction?: 'support' | 'love' | 'fire' | 'congrats' | null;
  user_reposted?: boolean;                   // ⚠️ NEW: true if user reposted
  user_repost_id?: string;                   // ⚠️ NEW: ID for DELETE
  reposted_from_id?: string;                 // ⚠️ UUID of original post
  reposted_from?: Post;                      // ⚠️ Embedded original post
  created_at: string;
  updated_at: string;
}
```

### PostAuthor Type
```typescript
interface PostAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  headline?: string;
  role?: string;
}
```

---

## Database Schema (Relevant Tables)

### posts
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,                   -- max 500 chars
  post_type VARCHAR(50) NOT NULL,
  visibility VARCHAR(20) NOT NULL,
  event_id UUID REFERENCES events(id),
  reposted_from_id UUID REFERENCES posts(id),  -- ⚠️ For reposts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                        -- Soft delete
);
```

### post_attachments
```sql
CREATE TABLE post_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id),
  attachment_type VARCHAR(20) NOT NULL,     -- 'image' | 'audio'
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### post_reactions
```sql
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  reaction_type VARCHAR(20) NOT NULL,       -- 'support' | 'love' | 'fire' | 'congrats'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)                  -- One reaction per user per post
);
```

### post_comments
```sql
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### bookmarks
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content_type VARCHAR(20) NOT NULL,        -- 'post' | 'event' | 'track'
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);
```

---

## API Endpoints

### Feed
- `GET /api/posts/feed?page=1&limit=10` - Get feed posts
- `POST /api/posts` - Create post
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post (soft delete)
- `POST /api/posts/upload-image` - Upload image
- `POST /api/posts/upload-audio` - Upload audio

### Reactions
- `POST /api/posts/:id/reactions` - Add reaction
- `DELETE /api/posts/:id/reactions` - Remove reaction

### Reposts
- `POST /api/posts/:id/repost` - Create repost
- `DELETE /api/posts/:id/repost` - Remove repost

### Comments
- `GET /api/posts/:id/comments?page=1&limit=20` - Get comments
- `POST /api/posts/:id/comments` - Add comment
- `POST /api/comments/:id/like` - Like comment
- `DELETE /api/comments/:id/like` - Unlike comment

### Social
- `POST /api/social/bookmark` - Toggle bookmark
- `GET /api/social/bookmarks` - Get user's bookmarks

---

## Environment Variables

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API
EXPO_PUBLIC_API_URL=https://www.soundbridge.live

# Environment
EXPO_PUBLIC_APP_ENV=production
```

---

## Performance Optimizations

1. **Instant Cache Loading**
   - Cached data loaded before API call
   - Fresh data fetched in background
   - Result: Instagram-like instant feed

2. **Optimistic Updates**
   - Reactions update UI immediately
   - Reverts on API error
   - Result: Instant feedback

3. **FlatList Optimization**
   - `removeClippedSubviews={true}`
   - `windowSize={10}`
   - `maxToRenderPerBatch={10}`
   - Result: Smooth scrolling

4. **React.memo on PostCard**
   - Custom comparison function
   - Only re-renders on specific prop changes
   - Result: Reduced unnecessary renders

5. **Supabase Fallback**
   - Separate queries (no joins)
   - Merge in JavaScript
   - Result: Avoid RLS issues

---

## Testing Checklist

### Feed Loading
- [ ] Opens instantly with cached data
- [ ] Refreshes with fresh data in background
- [ ] Pull-to-refresh works
- [ ] Infinite scroll loads more posts
- [ ] Empty state shows when no posts
- [ ] Error state shows on failure

### Reactions
- [ ] Tap for quick "Like"
- [ ] Long-press shows reaction picker
- [ ] Reaction updates immediately
- [ ] Button shows selected reaction
- [ ] Toggling removes reaction

### Reposts
- [ ] Quick repost creates repost without comment
- [ ] Repost with comment shows input
- [ ] Repost appears at top of feed
- [ ] "REPOSTED" indicator shows
- [ ] Original post displays in bordered card
- [ ] Tap original post navigates to post detail
- [ ] Tap author navigates to profile
- [ ] Repost button shows green when reposted
- [ ] Un-repost removes from feed

### Comments
- [ ] Tap "Comment" opens modal
- [ ] Comments load correctly
- [ ] Add comment works
- [ ] Replies show with indent
- [ ] Visual line connectors display
- [ ] Like comment works

### Navigation
- [ ] Tap post opens detail (placeholder)
- [ ] Tap author opens profile
- [ ] Tap avatar opens profile
- [ ] Navigation from embedded repost works

### Bookmarks
- [ ] Save button toggles state
- [ ] Bookmark persists across sessions
- [ ] Fallback to Supabase on RLS error

---

*This architecture document covers the complete feed system as of commit `a5380a4` (Dec 21, 2025)*

