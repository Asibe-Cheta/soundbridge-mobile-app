# 🌐 Web Feature Request: Post Detail Navigation for Redrops

**Date:** January 2, 2026
**Priority:** 🟡 **MEDIUM** (UX Enhancement)
**Requested By:** Mobile Team
**For:** Web Application Team

---

## 📋 Feature Summary

Implement clickable navigation for embedded redropped posts, allowing users to navigate through chains of redrops by clicking on the embedded post cards. This matches Twitter's (X) behavior and has been successfully implemented in the mobile app.

**User Story:**
> As a user viewing a redrop, I want to click on the embedded original post to view it in full detail, and if that post is also a redrop, I want to be able to continue clicking through the chain of redrops.

---

## 🎯 Current Behavior vs Expected Behavior

### Current Behavior (Web)
```
User views a redrop post:
┌─────────────────────────────┐
│ 🔁 REDROPPED                │
│ Alice • 1h ago              │
│                             │
│ This is amazing! 🔥         │ ← Alice's comment
│                             │
│ ┌─────────────────────────┐ │
│ │ Bob • 5h ago            │ │
│ │ Original post content   │ │ ← NOT CLICKABLE ❌
│ └─────────────────────────┘ │
└─────────────────────────────┘

Problem: User CANNOT click the embedded card to see Bob's original post
```

### Expected Behavior (Like Twitter/Mobile App)
```
User views a redrop post:
┌─────────────────────────────┐
│ 🔁 REDROPPED                │
│ Alice • 1h ago              │
│                             │
│ This is amazing! 🔥         │ ← Alice's comment
│                             │
│ ┌─────────────────────────┐ │
│ │ Bob • 5h ago            │ │
│ │ Original post content   │ │ ← CLICKABLE ✅
│ └─────────────────────────┘ │
└─────────────────────────────┘

Action: User clicks embedded card
        ↓
Opens Bob's post in post detail view:
┌─────────────────────────────┐
│ ← Back         Post          │
│                             │
│ Bob • 5h ago                │
│ Original post content       │
│                             │
│ 👍 💬 🔁 ➤                  │
└─────────────────────────────┘
```

---

## 🔍 Example: Twitter's Behavior

### Example 1: Simple Redrop Chain
```
1. User sees Alice's redrop → Clicks embedded post
2. Opens Bob's post → If Bob also redropped, can click embedded post
3. Opens Charlie's original post → End of chain
```

### Example 2: Redrop of a Redrop (Nested)
```
Post D (original)
  ↑ redropped by
Post C (redrop + comment)
  ↑ redropped by
Post B (redrop + comment)
  ↑ redropped by
Post A (redrop)

User viewing Post A can:
- Click Post B's card → Opens Post B detail
- Then click Post C's card → Opens Post C detail
- Then click Post D's card → Opens Post D detail
```

---

## 💻 Technical Implementation (Web)

### 1. Component Changes Required

#### **File:** `app/components/RepostedPostCard.tsx` (or equivalent)

**Current Structure:**
```tsx
export function RepostedPostCard({ post }: { post: Post }) {
  return (
    <div className="reposted-post-card">
      {/* Post content - NOT clickable */}
      <div className="author">{post.author.name}</div>
      <div className="content">{post.content}</div>
    </div>
  );
}
```

**Updated Structure:**
```tsx
'use client';

import { useRouter } from 'next/navigation';

interface RepostedPostCardProps {
  post: Post;
  onPostClick?: (postId: string) => void;
}

export function RepostedPostCard({ post, onPostClick }: RepostedPostCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onPostClick) {
      onPostClick(post.id);
    } else {
      // Default behavior: navigate to post detail
      router.push(`/posts/${post.id}`);
    }
  };

  return (
    <div
      className="reposted-post-card cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Post content */}
      <div className="author">{post.author.name}</div>
      <div className="content">{post.content}</div>

      {/* Visual indicator that it's clickable (optional) */}
      <div className="sr-only">Click to view original post</div>
    </div>
  );
}
```

**Key Changes:**
- ✅ Add `cursor-pointer` class for visual feedback
- ✅ Add `hover:bg-gray-50` for hover state
- ✅ Use `router.push()` to navigate to post detail
- ✅ Add keyboard accessibility (`onKeyPress`)
- ✅ Add ARIA attributes for screen readers

---

### 2. Post Detail Page/Route

#### **File:** `app/posts/[id]/page.tsx` (or equivalent)

**Create or update post detail page:**

```tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PostCard from '@/components/PostCard';
import { getPostById } from '@/services/api/posts';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPostById(postId);
      setPost(data);
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setError('Post not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error || 'Post not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with back button */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4 z-10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Post</h1>
      </div>

      {/* Post content */}
      <div className="pt-4">
        <PostCard
          post={post}
          // PostCard will handle nested redrop navigation internally
        />

        {/* Comments section (placeholder) */}
        <div className="mt-8 p-8 text-center text-gray-500">
          <p>Comments will appear here</p>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. API Service Method

#### **File:** `services/api/posts.ts` (or equivalent)

**Add method to fetch single post:**

```typescript
/**
 * Fetch a single post by ID
 * @param postId - The ID of the post to fetch
 * @returns Post data with nested reposted_from data
 */
export async function getPostById(postId: string): Promise<Post> {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.statusText}`);
    }

    const data = await response.json();
    return data.post || data; // Handle different response formats
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
}
```

---

### 4. Backend API Endpoint (If Not Exists)

#### **File:** `app/api/posts/[id]/route.ts`

**Create GET endpoint for single post:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;

    // Fetch post from database
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!user_id (
          id,
          username,
          display_name,
          avatar_url,
          role
        ),
        attachments:post_attachments (*),
        reactions:post_reactions (
          reaction_type,
          user_id
        )
      `)
      .eq('id', postId)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // If this is a repost, fetch the original post recursively
    if (post.reposted_from_id) {
      const { data: originalPost } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!user_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          ),
          attachments:post_attachments (*)
        `)
        .eq('id', post.reposted_from_id)
        .single();

      post.reposted_from = originalPost;
    }

    // Transform and return
    return NextResponse.json({
      success: true,
      post: transformPost(post),
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function transformPost(post: any) {
  // Transform database format to API format
  return {
    id: post.id,
    author: {
      id: post.author.id,
      name: post.author.display_name,
      username: post.author.username,
      avatar_url: post.author.avatar_url,
    },
    content: post.content || '',
    created_at: post.created_at,
    attachments: post.attachments || [],
    reactions: calculateReactions(post.reactions),
    reposted_from_id: post.reposted_from_id,
    reposted_from: post.reposted_from ? transformPost(post.reposted_from) : undefined,
    // ... other fields
  };
}
```

---

## 🎨 UI/UX Considerations

### Visual Feedback
```css
/* Add to your CSS/Tailwind config */

/* Embedded post card hover state */
.reposted-post-card {
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.reposted-post-card:hover {
  background-color: rgba(0, 0, 0, 0.02); /* Light theme */
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Dark theme */
.dark .reposted-post-card:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

/* Active/pressed state */
.reposted-post-card:active {
  transform: translateY(0);
}
```

### Accessibility
- ✅ Add `cursor: pointer` to indicate clickability
- ✅ Add `role="button"` for screen readers
- ✅ Support keyboard navigation (Enter/Space to activate)
- ✅ Add ARIA labels ("Click to view original post")
- ✅ Ensure sufficient color contrast for hover states
- ✅ Add focus indicators for keyboard users

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] **Click embedded post card** → Navigates to post detail page
- [ ] **Back button** → Returns to previous page
- [ ] **Nested redrops** → Can click through multiple levels
- [ ] **Direct URL access** → `/posts/{id}` works when accessed directly
- [ ] **404 handling** → Shows error for non-existent posts
- [ ] **Loading states** → Shows spinner while fetching

### User Flow Testing
- [ ] **Feed → Post Detail** → Click redrop card in feed
- [ ] **Post Detail → Nested Post** → Click embedded card in detail view
- [ ] **Chain Navigation** → Navigate through 3+ levels of redrops
- [ ] **Browser Back Button** → Works correctly through navigation chain

### Edge Cases
- [ ] **Original post deleted** → Shows error or placeholder
- [ ] **Private/restricted posts** → Shows appropriate error
- [ ] **Very long redrop chains** → Handles gracefully
- [ ] **Circular references** → Shouldn't happen, but handle if it does

### Performance
- [ ] **Fast navigation** → Post detail loads in <500ms
- [ ] **Cached data** → Subsequent visits load instantly
- [ ] **Image loading** → Progressive image loading
- [ ] **Mobile responsive** → Works on all screen sizes

---

## 📱 Mobile App Implementation (Reference)

The mobile app has successfully implemented this feature. Here's what was done:

### Files Modified (Mobile)
1. **PostCard.tsx** - Added navigation hook and click handler
2. **RepostedPostCard.tsx** - Made entire card tappable
3. **PostDetailScreen.tsx** - Created new screen for post detail
4. **FeedScreen.tsx** - Added handlePostPress navigation
5. **App.tsx** - Registered PostDetail route
6. **feedService.ts** - Added getPostById method

### Key Implementation Details (Mobile)
```typescript
// PostCard.tsx - Navigation logic
const navigation = useNavigation();

<RepostedPostCard
  post={post.reposted_from!}
  onPress={() => {
    if (post.reposted_from_id) {
      navigation.navigate('PostDetail', { postId: post.reposted_from_id });
    }
  }}
/>
```

**Result:** Users can tap through infinite chains of redrops, exactly like Twitter! ✅

---

## 🌟 Benefits

### User Experience
- ✅ **Matches Twitter behavior** - Users already know how this works
- ✅ **Better content discovery** - Easy to trace back to original posts
- ✅ **Improved engagement** - Users can explore content more deeply
- ✅ **Clearer context** - Understand full conversation chain

### Technical
- ✅ **Simple implementation** - Minimal code changes required
- ✅ **Reusable API** - `/api/posts/{id}` can be used elsewhere
- ✅ **No database changes** - Uses existing data structure
- ✅ **Progressive enhancement** - Works without JavaScript (if using server components)

---

## 🚀 Implementation Plan

### Phase 1: Core Functionality (Week 1)
1. ✅ Create/update `/api/posts/[id]` endpoint
2. ✅ Create `getPostById` service method
3. ✅ Make `RepostedPostCard` clickable
4. ✅ Create `PostDetailPage` component

### Phase 2: Polish & Testing (Week 2)
1. ✅ Add hover states and visual feedback
2. ✅ Implement loading states
3. ✅ Add error handling
4. ✅ Test keyboard accessibility

### Phase 3: Optimization (Week 3)
1. ✅ Add route caching
2. ✅ Optimize API queries
3. ✅ Add analytics tracking
4. ✅ Performance testing

---

## 📊 Success Metrics

### Track These Metrics
- **Click-through rate** on embedded posts (target: >15%)
- **Average navigation depth** (how many levels users navigate)
- **Time spent on post detail pages**
- **Bounce rate** from post detail pages
- **User engagement** with redropped content

---

## 🔗 Related Documentation

- **Mobile Implementation:** See mobile app source code for reference
- **API Documentation:** `/api/posts/{id}` endpoint spec
- **Design System:** Use existing post card components
- **Accessibility Guidelines:** WCAG 2.1 Level AA compliance

---

## ❓ FAQ

### Q: Should we open post detail in a modal or new page?
**A:** New page (like Twitter). This allows:
- Shareable URLs (`/posts/{id}`)
- Browser back button works naturally
- Better SEO
- Cleaner navigation history

### Q: What if the original post is deleted?
**A:** Show a placeholder card:
```tsx
<div className="reposted-post-card deleted">
  <p>This post is no longer available</p>
</div>
```

### Q: Should embedded cards be clickable in the post detail view?
**A:** Yes! Users should be able to navigate through infinite chains of redrops.

### Q: What about performance with deep redrop chains?
**A:** Lazy load nested posts. Only fetch `reposted_from` data when the card is clicked, not on initial page load.

### Q: Should we prevent infinite loops?
**A:** Database structure prevents this (a post can't redrop itself), but add safeguard:
```typescript
const MAX_DEPTH = 10; // Prevent traversing more than 10 levels
```

---

## 📞 Contact

**Questions?** Contact the Mobile Team:
- Mobile implementation reference code available
- Can provide additional details or screenshots
- Happy to pair program or code review

---

## ✅ Acceptance Criteria

Before marking as complete, verify:

- [ ] Users can click embedded redrop cards from feed
- [ ] Clicking navigates to `/posts/{id}` page
- [ ] Post detail page shows full post with all interactions
- [ ] If post is a redrop, embedded card is also clickable
- [ ] Can navigate through 3+ levels of redrops
- [ ] Back button returns to previous page correctly
- [ ] Works on desktop and mobile browsers
- [ ] Keyboard accessible (Tab + Enter)
- [ ] Screen reader announces clickable elements
- [ ] Loading states show while fetching
- [ ] Error states show for missing posts
- [ ] Hover states provide visual feedback
- [ ] URLs are shareable (`/posts/{id}`)
- [ ] Performance is <500ms for navigation

---

**Document Version:** 1.0
**Created:** January 2, 2026
**Author:** Mobile Development Team
**Status:** 📋 Ready for Web Team Implementation
**Type:** Feature Request - UX Enhancement
