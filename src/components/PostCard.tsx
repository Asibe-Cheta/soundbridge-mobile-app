import React, { memo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import * as Haptics from 'expo-haptics';
import PostActionsModal from '../modals/PostActionsModal';

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
  isSaved?: boolean;
}

const REACTION_ICONS = {
  support: 'hand-left',
  love: 'heart',
  fire: 'flame',
  congrats: 'trophy',
} as const;

const REACTION_EMOJIS = {
  support: '👏',
  love: '❤️',
  fire: '🔥',
  congrats: '🎉',
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
  isSaved = false,
}: PostCardProps) {
  const { theme } = useTheme();
  const [showActionsModal, setShowActionsModal] = useState(false);

  const handleReactionPress = (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReactionPress?.(reactionType);
  };

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

        {/* Author Info */}
        <View style={styles.authorInfo}>
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
        </View>

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
          <Image
            source={{ uri: post.image_url }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        </View>
      )}

      {post.audio_url && (
        <View
          style={[
            styles.audioPreview,
            {
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              borderColor: 'rgba(124, 58, 237, 0.2)',
            },
          ]}
        >
          <Ionicons name="musical-notes" size={24} color="#7C3AED" />
          <View style={styles.audioInfo}>
            <Text style={[styles.audioTitle, { color: theme.colors.text }]}>
              Audio Preview
            </Text>
            <Text style={[styles.audioDuration, { color: theme.colors.textSecondary }]}>
              0:30
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="play-circle" size={32} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Engagement Section */}
      <View
        style={[
          styles.engagementSection,
          { borderTopColor: theme.colors.border },
        ]}
      >
        {/* Reactions Row */}
        <View style={styles.reactionsRow}>
          {(['support', 'love', 'fire', 'congrats'] as const).map((reactionType) => {
            const count = post.reactions_count[reactionType];
            const isActive = post.user_reaction === reactionType;

            return (
              <TouchableOpacity
                key={reactionType}
                style={[
                  styles.reactionButton,
                  isActive && {
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  },
                ]}
                onPress={() => handleReactionPress(reactionType)}
              >
                <Text style={styles.reactionEmoji}>
                  {REACTION_EMOJIS[reactionType]}
                </Text>
                <Text
                  style={[
                    styles.reactionCount,
                    {
                      color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comments Row */}
        <TouchableOpacity
          style={styles.commentsRow}
          onPress={onCommentPress}
        >
          <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[styles.commentCount, { color: theme.colors.textSecondary }]}>
            {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#CCCCCC',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  audioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  audioDuration: {
    fontSize: 12,
    fontWeight: '400',
  },
  engagementSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  commentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCount: {
    fontSize: 14,
    fontWeight: '400',
  },
});

