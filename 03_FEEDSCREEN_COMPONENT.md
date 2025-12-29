# FeedScreen Component - Complete Documentation

## File Location
`src/screens/FeedScreen.tsx`

---

## Overview

`FeedScreen` is the main feed view that orchestrates the entire feed experience. It manages:
- Feed data fetching and caching
- Pull-to-refresh and infinite scroll
- Post interactions (reactions, comments, reposts, saves)
- Navigation to profiles and post details
- Custom toast notifications
- Modals for creating/editing posts

---

## Component Architecture

### Dependencies
```typescript
import { useFeed } from '../hooks/useFeed';           // Feed state management
import { useToast } from '../contexts/ToastContext';   // Toast notifications
import { feedService } from '../services/api/feedService';
import { socialService } from '../services/api/socialService';
import { deepLinkingService } from '../services/DeepLinkingService';
import { imageSaveService } from '../services/ImageSaveService';
```

### Key Hooks
```typescript
const { user } = useAuth();
const { showToast } = useToast();
const {
  posts,           // Array of posts
  loading,         // Initial load state
  refreshing,      // Pull-to-refresh state
  hasMore,         // More posts available
  error,           // Error message
  refresh,         // Refresh feed
  loadMore,        // Load next page
  addReaction,     // Add/remove reaction
  deletePost,      // Delete post
} = useFeed();
```

---

## State Management

```typescript
// Modals
const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
const [editingPost, setEditingPost] = useState<Post | null>(null);

// Bookmark status
const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
```

---

## Critical Handler: handleRepost

```typescript
const handleRepost = async (post: Post, withComment?: boolean, comment?: string) => {
  try {
    // Check if user has already reposted (toggle behavior)
    if (post.user_reposted) {
      // Un-repost
      console.log('🗑️ Un-reposting post:', post.id);
      await feedService.unrepost(post.reposted_from_id || post.id);
      
      // Refresh feed to show updated state
      console.log('🔄 Refreshing feed after unrepost...');
      await refresh();
      
      showToast('Repost removed successfully', 'success');
    } else {
      // Determine if this is a quick repost or repost with comment
      console.log('📤 Reposting post:', post.id, 'with comment:', withComment);
      const result = await feedService.repost(
        post.reposted_from_id || post.id, // Repost from original if already a repost
        withComment || false,
        comment
      );
      
      console.log('✅ Repost created:', result);
      
      // Refresh feed to show new repost at top
      console.log('🔄 Refreshing feed after repost...');
      await refresh();
      
      showToast('Your post was sent', 'success');
    }
  } catch (error: any) {
    console.error('❌ Failed to repost/unrepost:', error);
    showToast(
      error.message || 'Failed to complete action. Please try again.',
      'error'
    );
  }
};
```

**⚠️ Key Points:**
1. Uses `refresh()` (not `loadFeed()`) - from `useFeed` hook
2. Checks `post.user_reposted` to determine toggle behavior
3. Uses `post.reposted_from_id` to repost the original (not a repost of a repost)
4. Shows custom toast instead of `Alert.alert`
5. Refreshes feed after action to show updated state

---

## Navigation Handlers

### Author Profile Navigation
```typescript
const handleAuthorPress = (authorId: string) => {
  console.log('👤 Navigating to author profile:', authorId);
  navigation.navigate('CreatorProfile' as never, { creatorId: authorId } as never);
};
```

### Post Detail Navigation (Placeholder)
```typescript
const handlePostPress = (postId: string) => {
  // TODO: Navigate to post details in future phase
  console.log('Post pressed:', postId);
};
```

---

## Bookmark Management

```typescript
// Load bookmark status for all posts
useEffect(() => {
  if (user?.id && posts.length > 0) {
    const loadBookmarkStatus = async () => {
      try {
        const postIds = posts.map((p) => p.id);
        const { data: bookmarks, error } = await socialService.getBookmarks(user.id, 'post', 100, 0);
        
        if (!error && bookmarks) {
          const bookmarkedPostIds = new Set(
            bookmarks
              .filter((b) => postIds.includes(b.content_id))
              .map((b) => b.content_id)
          );
          setSavedPosts(bookmarkedPostIds);
        }
      } catch (error) {
        console.error('Failed to load bookmark status:', error);
      }
    };

    loadBookmarkStatus();
  }
}, [posts.length, user?.id]);

// Toggle bookmark
const handleSavePost = async (postId: string) => {
  try {
    const { data, error } = await socialService.toggleBookmark({
      content_id: postId,
      content_type: 'post',
    });

    if (error) {
      throw error;
    }

    // If data is returned, bookmark was added; if null, it was removed
    if (data) {
      setSavedPosts((prev) => new Set(prev).add(postId));
    } else {
      setSavedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  } catch (error) {
    console.error('Failed to save post:', error);
    Alert.alert('Error', 'Failed to save post. Please try again.');
  }
};
```

---

## FlatList Configuration

```typescript
<FlatList
  data={posts}
  renderItem={({ item }) => (
    <PostCard
      key={item.id}
      post={item}
      onPress={() => handlePostPress(item.id)}
      onReactionPress={(reactionType) => handleReactionPress(item.id, reactionType)}
      onCommentPress={() => handleCommentPress(item.id)}
      onEdit={handleEditPost}
      onDelete={handleDeletePost}
      onShare={handleSharePost}
      onSave={handleSavePost}
      onUnsave={handleUnsavePost}
      onSaveImage={handleSaveImage}
      onAuthorPress={handleAuthorPress}
      onRepost={handleRepost}
      onBlocked={async () => {
        // Refresh feed to remove blocked user's posts
        await refresh();
      }}
      onReported={async () => {
        // Optionally refresh feed or show success message
        console.log('Report submitted successfully');
      }}
      isSaved={savedPosts.has(item.id)}
    />
  )}
  keyExtractor={(item) => item.id}
  
  // Performance optimization
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={5}
  windowSize={10}
  
  // Refresh control
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  }
  
  // Infinite scroll
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  
  // Header
  ListHeaderComponent={
    <>
      <CreatePostPrompt onPress={handleCreatePost} />
      <LiveAudioBanner />
    </>
  }
  
  // Footer
  ListFooterComponent={
    loading && posts.length > 0 ? (
      <View style={styles.loadMoreContainer}>
        <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>
          Loading more...
        </Text>
      </View>
    ) : !hasMore && posts.length > 0 ? (
      <View style={styles.loadMoreContainer}>
        <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>
          End of feed
        </Text>
      </View>
    ) : null
  }
  
  // Empty state
  ListEmptyComponent={
    loading && posts.length === 0 ? (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading feed...
        </Text>
      </View>
    ) : error && posts.length === 0 ? (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      </View>
    ) : null
  }
/>
```

---

## Modals

### Create/Edit Post Modal
```typescript
<CreatePostModal
  visible={isCreateModalVisible}
  onClose={() => {
    handleCloseModal();
    setEditingPost(null);
  }}
  onSubmit={async (data) => {
    if (editingPost) {
      // Update existing post
      try {
        await feedService.updatePost(editingPost.id, data);
        await refresh();
        setEditingPost(null);
        setIsCreateModalVisible(false);
      } catch (error) {
        console.error('Failed to update post:', error);
        Alert.alert('Error', 'Failed to update post. Please try again.');
      }
    } else {
      // Create new post
      await handleSubmitPost(data);
    }
  }}
  editingPost={editingPost}
/>
```

### Comments Modal
```typescript
{selectedPostForComments && (
  <CommentsModal
    visible={!!selectedPostForComments}
    post={selectedPostForComments}
    onClose={() => setSelectedPostForComments(null)}
    onViewFullPost={(postId) => {
      setSelectedPostForComments(null);
      handlePostPress(postId);
    }}
  />
)}
```

---

## Toast Integration

```typescript
// Import
import { useToast } from '../contexts/ToastContext';

// Hook
const { showToast } = useToast();

// Usage
showToast('Your post was sent', 'success');
showToast('Failed to complete action', 'error');
showToast('Warning message', 'warning');
showToast('Info message', 'info');
```

**⚠️ Important:** Always use `showToast` instead of `Alert.alert` for user feedback!

---

## Background Gradient

```typescript
<View style={styles.container}>
  {/* Main Background Gradient */}
  <LinearGradient
    colors={[
      theme.colors.backgroundGradient.start,
      theme.colors.backgroundGradient.middle,
      theme.colors.backgroundGradient.end,
    ]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    locations={[0, 0.5, 1]}
    style={styles.mainGradient}
  />

  <SafeAreaView style={styles.safeArea} edges={['bottom']}>
    {/* Content */}
  </SafeAreaView>
</View>
```

---

## Styling

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for mini player
  },
  loadMoreContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
});
```

---

## Performance Tips

1. **FlatList Optimization:**
   - `removeClippedSubviews={true}` - Unmounts off-screen views
   - `maxToRenderPerBatch={10}` - Render 10 items per batch
   - `windowSize={10}` - Render 10 screens worth of content

2. **Cache Strategy:**
   - Feed loads cached data instantly on mount
   - Fresh data fetched in background (silent refresh)
   - Cache updated after every API call

3. **Bookmark Loading:**
   - Only loads when `posts.length` changes (not on every render)
   - Uses `Set` for O(1) lookup

4. **Optimistic Updates:**
   - Reactions update UI immediately (handled in `useFeed`)
   - Deletes remove from UI before API call
   - Reverts on error

---

## Error Handling

```typescript
try {
  // API call
  await feedService.repost(postId);
  await refresh();
  showToast('Success', 'success');
} catch (error: any) {
  console.error('❌ Failed:', error);
  showToast(
    error.message || 'Failed to complete action. Please try again.',
    'error'
  );
}
```

**Pattern:**
1. Try API call
2. Refresh feed on success
3. Show success toast
4. Catch error
5. Log error
6. Show error toast with fallback message

---

## Common Issues & Solutions

### Issue: Posts not refreshing after repost
**Solution:** Call `await refresh()` after `feedService.repost()`

### Issue: Using `loadFeed()` instead of `refresh()`
**Solution:** `useFeed` hook provides `refresh()`, not `loadFeed()`

### Issue: Alert.alert instead of toast
**Solution:** Use `showToast()` from `useToast` hook

### Issue: Repost button not showing green when reposted
**Solution:** Ensure `post.user_reposted` is set in feed data

### Issue: Clicking repost on a repost creates a repost of a repost
**Solution:** Always use `post.reposted_from_id || post.id` to repost the original

---

## Related Files

- `src/hooks/useFeed.ts` - Feed state management hook
- `src/services/api/feedService.ts` - Feed API service
- `src/services/feedCacheService.ts` - Feed caching logic
- `src/contexts/ToastContext.tsx` - Toast provider
- `src/components/PostCard.tsx` - Individual post component

---

*This screen is production-ready as of commit `a5380a4` (Dec 21, 2025)*

