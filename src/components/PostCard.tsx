import React, { memo, useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import * as Haptics from 'expo-haptics';
import PostActionsModal from '../modals/PostActionsModal';
import FullScreenImageModal from '../modals/FullScreenImageModal';
import BlockUserModal from '../modals/BlockUserModal';
import ReportContentModal from '../modals/ReportContentModal';
import PostAudioPlayer from './PostAudioPlayer';
import PostSaveButton from './PostSaveButton';
import { ReactionPicker } from './ReactionPicker';
import { CommentsModal } from './CommentsModal';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onReactionPress?: (reactionType: 'support' | 'love' | 'fire' | 'congrats') => void;
  onCommentPress?: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onSave?: (postId: string) => void;
  onUnsave?: (postId: string) => void;
  onSaveImage?: (imageUrl: string) => void;
  onBlocked?: () => void;
  onReported?: () => void;
  onAuthorPress?: (authorId: string) => void;
  isSaved?: boolean;
}

const REACTION_TYPES = {
  support: {
    id: 'support' as const,
    emoji: '👍',
    label: 'Like',
    color: '#DC2626',
  },
  love: {
    id: 'love' as const,
    emoji: '❤️',
    label: 'Love',
    color: '#EC4899',
  },
  fire: {
    id: 'fire' as const,
    emoji: '🔥',
    label: 'Fire',
    color: '#F5A623',
  },
  congrats: {
    id: 'congrats' as const,
    emoji: '👏',
    label: 'Congrats',
    color: '#7B68EE',
  },
} as const;

const PostCard = memo(function PostCard({
  post,
  onPress,
  onReactionPress,
  onCommentPress,
  onEdit,
  onDelete,
  onShare,
  onSave,
  onUnsave,
  onSaveImage,
  onBlocked,
  onReported,
  onAuthorPress,
  isSaved = false,
}: PostCardProps) {
  const { theme } = useTheme();
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleReactionPress = (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReactionPress?.(reactionType);
  };

  // Long-press detection for Support button
  const handleSupportPressIn = () => {
    longPressTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowReactionPicker(true);
    }, 500); // 500ms hold
  };

  const handleSupportPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Quick Support reaction (single tap)
  const handleQuickSupport = () => {
    if (!showReactionPicker) {
      handleReactionPress('support');
    }
  };

  // Handle reaction selection from picker
  const handleReactionSelect = (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    setShowReactionPicker(false);
    handleReactionPress(reactionType);
  };

  // Get current reaction display
  const getCurrentReaction = () => {
    if (post.user_reaction) {
      return REACTION_TYPES[post.user_reaction];
    }
    return { emoji: '👍', label: 'Like', color: theme.colors.textSecondary };
  };

  // Calculate total reactions
  const totalReactions = 
    post.reactions_count.support +
    post.reactions_count.love +
    post.reactions_count.fire +
    post.reactions_count.congrats;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Header Section */}
      <View style={styles.header}>
        {/* Avatar */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAuthorPress?.(post.author.id);
          }}
        >
          <View
            style={[
              styles.avatar,
              { borderColor: theme.colors.border },
            ]}
          >
            {post.author.avatar_url ? (
              <Image
                source={{ uri: post.author.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Author Info */}
        <TouchableOpacity
          style={styles.authorInfo}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAuthorPress?.(post.author.id);
          }}
        >
          <Text style={[styles.authorName, { color: theme.colors.text }]}>
            {post.author.display_name}
          </Text>
          {post.author.headline && (
            <Text style={[styles.authorHeadline, { color: theme.colors.textSecondary }]}>
              {post.author.headline}
            </Text>
          )}
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatTimeAgo(post.created_at)}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <PostSaveButton 
          postId={post.id} 
          initialIsSaved={isSaved}
          size={22}
        />

        {/* More Options Button */}
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowActionsModal(true);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text
          style={[styles.postContent, { color: theme.colors.text }]}
          numberOfLines={8}
        >
          {post.content}
        </Text>
        {post.content.length > 200 && (
          <TouchableOpacity>
            <Text style={[styles.seeMore, { color: theme.colors.primary }]}>
              See more
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media Section */}
      {post.image_url && (
        <View style={styles.mediaSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFullScreenImage(true);
            }}
          >
            <Image
              source={{ uri: post.image_url }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      )}

      {post.audio_url && (
        <PostAudioPlayer
          audioUrl={post.audio_url}
          title="Audio Preview"
        />
      )}

      {/* Engagement Section - LinkedIn Style */}
      <View
        style={[
          styles.engagementSection,
          { borderTopColor: theme.colors.border },
        ]}
      >
        {/* Interaction Buttons Row */}
        <View style={styles.interactionButtonsRow}>
          {/* Like Button with Long-Press */}
          <Pressable
            style={[
              styles.interactionButton,
              post.user_reaction && {
                backgroundColor: theme.isDark 
                  ? 'rgba(220, 38, 38, 0.15)' 
                  : 'rgba(220, 38, 38, 0.08)',
              },
            ]}
            onPressIn={handleSupportPressIn}
            onPressOut={handleSupportPressOut}
            onPress={handleQuickSupport}
          >
            <Text style={styles.interactionIcon}>
              {getCurrentReaction().emoji}
            </Text>
            <Text
              style={[
                styles.interactionLabel,
                {
                  color: post.user_reaction ? '#DC2626' : theme.colors.textSecondary,
                  fontWeight: post.user_reaction ? '600' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {getCurrentReaction().label}
            </Text>
          </Pressable>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCommentsModal(true);
            }}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={18} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.interactionLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              Comment
            </Text>
          </TouchableOpacity>

          {/* Repost Button */}
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Implement repost functionality
            }}
          >
            <Ionicons 
              name="repeat-outline" 
              size={18} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.interactionLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              Repost
            </Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare?.(post);
            }}
          >
            <Ionicons 
              name="arrow-redo-outline" 
              size={18} 
              color={theme.colors.textSecondary} 
            />
            <Text style={[styles.interactionLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              Share
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Line */}
        {(totalReactions > 0 || post.comments_count > 0) && (
          <TouchableOpacity 
            style={styles.summaryLine}
            onPress={() => {
              if (post.comments_count > 0) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCommentsModal(true);
              }
            }}
            activeOpacity={post.comments_count > 0 ? 0.7 : 1}
          >
            {totalReactions > 0 && (
              <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                {post.user_reaction 
                  ? `You and ${totalReactions - 1} other${totalReactions - 1 !== 1 ? 's' : ''} reacted`
                  : `${totalReactions} reaction${totalReactions !== 1 ? 's' : ''}`
                }
              </Text>
            )}
            {totalReactions > 0 && post.comments_count > 0 && (
              <Text style={[styles.summaryDot, { color: theme.colors.textSecondary }]}> • </Text>
            )}
            {post.comments_count > 0 && (
              <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Reaction Picker Modal */}
      <ReactionPicker
        visible={showReactionPicker}
        onSelect={handleReactionSelect}
        onDismiss={() => setShowReactionPicker(false)}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        postId={post.id}
        onClose={() => setShowCommentsModal(false)}
      />

      {/* Post Actions Modal */}
      <PostActionsModal
        visible={showActionsModal}
        post={post}
        isSaved={isSaved}
        onClose={() => setShowActionsModal(false)}
        onEdit={() => onEdit?.(post)}
        onDelete={() => onDelete?.(post.id)}
        onShare={() => onShare?.(post)}
        onSave={() => onSave?.(post.id)}
        onUnsave={() => onUnsave?.(post.id)}
        onSaveImage={post.image_url && onSaveImage ? () => {
          console.log('📸 PostCard: Calling onSaveImage with URL:', post.image_url);
          onSaveImage(post.image_url!);
        } : undefined}
        onReport={() => {
          setShowActionsModal(false);
          setShowReportModal(true);
        }}
        onBlocked={() => {
          setShowActionsModal(false);
          setShowBlockModal(true);
        }}
      />

      {/* Full Screen Image Modal */}
      {post.image_url && (
        <FullScreenImageModal
          visible={showFullScreenImage}
          imageUrl={post.image_url}
          onClose={() => setShowFullScreenImage(false)}
        />
      )}

      {/* Block User Modal */}
      <BlockUserModal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        userId={post.author.id}
        userName={post.author.display_name || post.author.username || 'User'}
        userAvatar={post.author.avatar_url}
        isCurrentlyBlocked={false}
        onBlocked={() => {
          onBlocked?.();
          setShowBlockModal(false);
        }}
      />

      {/* Report Content Modal */}
      <ReportContentModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post.id}
        contentTitle={post.content || 'Post'}
        onReported={() => {
          onReported?.();
          setShowReportModal(false);
        }}
      />
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
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

export default PostCard;

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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  authorHeadline: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
  },
  moreButton: {
    padding: 8,
  },
  contentSection: {
    marginBottom: 14,
  },
  postContent: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  seeMore: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  mediaSection: {
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 300,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  engagementSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  interactionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
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
  interactionIcon: {
    fontSize: 18,
  },
  interactionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '400',
  },
  summaryDot: {
    fontSize: 13,
    fontWeight: '400',
  },
});

