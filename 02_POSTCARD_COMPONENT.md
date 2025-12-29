# PostCard Component - Complete Documentation

## File Location
`src/components/PostCard.tsx`

---

## Overview

`PostCard` is the primary component for displaying individual posts in the feed. It handles:
- Post content display (text, images, audio)
- LinkedIn-style reactions (long-press support)
- Comments modal integration
- Repost functionality (quick repost & quote repost)
- Quote repost display (Twitter-style)
- Author navigation
- Post actions (save, share, edit, delete, report, block)

---

## Key Features

### 1. **Repost Detection & Display**
```typescript
const isRepost = post.reposted_from_id && post.reposted_from;

// Shows "REPOSTED" indicator at top
{isRepost && (
  <View style={styles.repostIndicator}>
    <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
    <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
      REPOSTED
    </Text>
  </View>
)}

// Embeds original post below (Twitter-style quote)
{isRepost && (
  <RepostedPostCard
    post={post.reposted_from!}
    onPress={() => onViewOriginalPost?.(post.reposted_from_id!)}
    onAuthorPress={(authorId) => onAuthorPress?.(authorId)}
  />
)}
```

### 2. **LinkedIn-style Reactions**
```typescript
// Long-press detection (500ms)
const handleSupportPressIn = () => {
  longPressTimer.current = setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReactionPicker(true);
  }, 500);
};

// Quick tap for default "Like" reaction
const handleQuickSupport = () => {
  if (!showReactionPicker) {
    handleReactionPress('support');
  }
};
```

### 3. **Repost Button with Toggle**
```typescript
const handleRepostPress = () => {
  if (post.user_reposted) {
    // Show unrepost option in modal
    setShowRepostModal(true);
  } else {
    // Show repost options (quick/with comment)
    setShowRepostModal(true);
  }
};

// Visual state
<TouchableOpacity
  style={[
    styles.interactionButton,
    post.user_reposted && {
      backgroundColor: theme.isDark 
        ? 'rgba(34, 197, 94, 0.15)' 
        : 'rgba(34, 197, 94, 0.08)',
    },
  ]}
  onPress={handleRepostPress}
  disabled={isReposting}
>
  <Ionicons 
    name={post.user_reposted ? "repeat" : "repeat-outline"}
    size={18} 
    color={post.user_reposted ? '#22C55E' : theme.colors.textSecondary}
  />
  <Text style={{ color: post.user_reposted ? '#22C55E' : theme.colors.textSecondary }}>
    {post.user_reposted ? 'Reposted' : 'Repost'}
  </Text>
</TouchableOpacity>
```

---

## Component Props

```typescript
interface PostCardProps {
  post: Post;                                  // Post data
  onPress?: () => void;                        // Tap on card
  onReactionPress?: (type) => void;            // Add/remove reaction
  onCommentPress?: () => void;                 // Open comments
  onEdit?: (post: Post) => void;               // Edit post
  onDelete?: (postId: string) => void;         // Delete post
  onShare?: (post: Post) => void;              // Share post
  onSave?: (postId: string) => void;           // Save post
  onUnsave?: (postId: string) => void;         // Unsave post
  onSaveImage?: (imageUrl: string) => void;    // Save image to gallery
  onBlocked?: () => void;                      // User blocked callback
  onReported?: () => void;                     // Content reported callback
  onAuthorPress?: (authorId: string) => void;  // Navigate to profile
  onRepost?: (post: Post, withComment?: boolean, comment?: string) => void; // Repost
  isSaved?: boolean;                           // Saved state
}
```

---

## Post Data Structure

```typescript
interface Post {
  id: string;
  author: PostAuthor;
  content: string;
  post_type: PostType;
  visibility: PostVisibility;
  image_url?: string;
  audio_url?: string;
  reactions_count: { support: number; love: number; fire: number; congrats: number };
  comments_count: number;
  shares_count?: number;
  user_reaction?: 'support' | 'love' | 'fire' | 'congrats' | null;
  user_reposted?: boolean;              // ⚠️ NEW: Required for toggle
  user_repost_id?: string;              // ⚠️ NEW: For DELETE endpoint
  reposted_from_id?: string;            // ⚠️ Original post ID
  reposted_from?: Post;                 // ⚠️ Embedded original post
  created_at: string;
  updated_at: string;
}
```

---

## State Management

```typescript
// Modal visibility
const [showActionsModal, setShowActionsModal] = useState(false);
const [showReactionPicker, setShowReactionPicker] = useState(false);
const [showCommentsModal, setShowCommentsModal] = useState(false);
const [showRepostModal, setShowRepostModal] = useState(false);
const [showFullScreenImage, setShowFullScreenImage] = useState(false);
const [showBlockModal, setShowBlockModal] = useState(false);
const [showReportModal, setShowReportModal] = useState(false);

// Loading state
const [isReposting, setIsReposting] = useState(false);

// Long-press timer
const longPressTimer = useRef<NodeJS.Timeout | null>(null);
```

---

## Interaction Buttons Layout

```typescript
<View style={styles.interactionButtonsRow}>
  {/* Like Button (Long-press for picker) */}
  <Pressable onPressIn={handleSupportPressIn} onPressOut={handleSupportPressOut} onPress={handleQuickSupport}>
    <Text>{getCurrentReaction().emoji}</Text>
    <Text>{getCurrentReaction().label}</Text>
  </Pressable>

  {/* Comment Button */}
  <TouchableOpacity onPress={() => setShowCommentsModal(true)}>
    <Ionicons name="chatbubble-outline" />
    <Text>Comment</Text>
  </TouchableOpacity>

  {/* Repost Button */}
  <TouchableOpacity onPress={handleRepostPress} disabled={isReposting}>
    <Ionicons name={post.user_reposted ? "repeat" : "repeat-outline"} />
    <Text>{post.user_reposted ? 'Reposted' : 'Repost'}</Text>
  </TouchableOpacity>

  {/* Share Button */}
  <TouchableOpacity onPress={() => onShare?.(post)}>
    <Ionicons name="arrow-redo-outline" />
    <Text>Share</Text>
  </TouchableOpacity>
</View>
```

---

## Modals Integration

### Reaction Picker
```typescript
<ReactionPicker
  visible={showReactionPicker}
  onSelect={handleReactionSelect}
  onDismiss={() => setShowReactionPicker(false)}
/>
```

### Comments Modal
```typescript
<CommentsModal
  visible={showCommentsModal}
  post={post}
  onClose={() => setShowCommentsModal(false)}
/>
```

### Repost Modal
```typescript
<RepostModal
  visible={showRepostModal}
  post={post}
  onClose={() => setShowRepostModal(false)}
  onQuickRepost={handleQuickRepost}
  onRepostWithComment={handleRepostWithComment}
  onUnrepost={handleUnrepost}
  isReposting={isReposting}
  isReposted={post.user_reposted || false}
/>
```

---

## Styling Highlights

```typescript
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  
  repostText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
  },
});
```

---

## Performance Optimization

```typescript
// React.memo with custom comparison
export default memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.reactions_count.support === nextProps.post.reactions_count.support &&
    prevProps.post.reactions_count.love === nextProps.post.reactions_count.love &&
    prevProps.post.reactions_count.fire === nextProps.post.reactions_count.fire &&
    prevProps.post.reactions_count.congrats === nextProps.post.reactions_count.congrats &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.user_reaction === nextProps.post.user_reaction
  );
});
```

---

## Debug Logging

```typescript
// Repost detection logging (lines 142-148)
console.log('🔍 PostCard Debug:', {
  postId: post.id,
  hasRepostedFromId: !!post.reposted_from_id,
  hasRepostedFrom: !!post.reposted_from,
  repostedFromId: post.reposted_from_id,
  content: post.content?.substring(0, 30) + '...',
});
```

---

## Usage Example

```typescript
<PostCard
  post={post}
  onPress={() => handlePostPress(post.id)}
  onReactionPress={(type) => handleReactionPress(post.id, type)}
  onCommentPress={() => handleCommentPress(post.id)}
  onAuthorPress={(authorId) => navigation.navigate('Profile', { userId: authorId })}
  onRepost={handleRepost}
  onShare={handleSharePost}
  isSaved={savedPosts.has(post.id)}
/>
```

---

## Related Components

- `RepostedPostCard` - Embedded original post display
- `ReactionPicker` - Long-press reaction selector
- `CommentsModal` - Comments and replies
- `RepostModal` - Repost options modal
- `PostSaveButton` - Bookmark button
- `PostActionsModal` - More actions menu

---

## Important Notes

1. **Haptic Feedback:** All interactions trigger appropriate haptic feedback
2. **Dark Mode:** All colors adapt to theme (theme.isDark)
3. **Optimistic Updates:** UI updates immediately, reverts on error
4. **Navigation:** Uses `onAuthorPress` and `onViewOriginalPost` props
5. **Media Handling:** Images and audio have dedicated rendering logic
6. **Accessibility:** All touchable elements have appropriate hit slops

---

*This component is production-ready as of commit `a5380a4` (Dec 21, 2025)*

