import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerifiedAvatar from './VerifiedAvatar';
import { useTheme } from '../contexts/ThemeContext';
import { Comment } from '../types/feed.types';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  postAuthorId?: string;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  onViewReplies?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onPressAuthor?: (userId: string) => void;
  showReplies?: boolean;
  replies?: Comment[];
  loadingReplies?: boolean;
  expandedReplies?: Set<string>;
  repliesMap?: Record<string, Comment[]>;
  loadingRepliesSet?: Set<string>;
  isNested?: boolean;
  depth?: number;
}

export default function CommentCard({
  comment,
  currentUserId,
  postAuthorId,
  onLike,
  onReply,
  onViewReplies,
  onDelete,
  onPressAuthor,
  showReplies = false,
  replies = [],
  loadingReplies = false,
  expandedReplies,
  repliesMap,
  loadingRepliesSet,
  isNested = false,
  depth = 0,
}: CommentCardProps) {
  const { theme } = useTheme();

  const canDelete = !!(
    currentUserId &&
    (comment.user?.id === currentUserId || postAuthorId === currentUserId)
  );

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.(comment.id);
  };

  const handleReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReply?.(comment.id);
  };

  const handleViewReplies = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewReplies?.(comment.id);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(comment.id) },
      ]
    );
  };

  const avatarSize = isNested ? 28 : 36;

  return (
    <View style={[styles.container, isNested && styles.nestedContainer]}>
      <View style={styles.comment}>
        {/* Avatar */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => comment.user?.id && onPressAuthor?.(comment.user.id)}
          disabled={!comment.user?.id || !onPressAuthor}
        >
          <VerifiedAvatar
            avatarUrl={comment.user?.avatar_url}
            isVerified={comment.user?.is_verified}
            size={avatarSize}
            marginRight={10}
            fallbackIconSize={isNested ? 14 : 18}
          />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => comment.user?.id && onPressAuthor?.(comment.user.id)}
              disabled={!comment.user?.id || !onPressAuthor}
            >
              <Text style={[styles.name, { color: theme.colors.text }]}>
                {comment.user?.display_name ?? comment.user?.username ?? 'User'}
              </Text>
            </TouchableOpacity>
          </View>

          {comment.content.length > 0 && (
            <Text style={[styles.text, { color: theme.colors.text }]}>{comment.content}</Text>
          )}

          {comment.image_url && (
            <Image source={{ uri: comment.image_url }} style={styles.commentImage} resizeMode="cover" />
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.likeButton, comment.user_liked && { backgroundColor: 'rgba(236,72,153,0.1)' }]}
              onPress={handleLike}
            >
              <Ionicons
                name={comment.user_liked ? 'heart' : 'heart-outline'}
                size={13}
                color={comment.user_liked ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[styles.likeCount, { color: comment.user_liked ? theme.colors.primary : theme.colors.textSecondary }]}>
                {comment.likes_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReply}>
              <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>Reply</Text>
            </TouchableOpacity>

            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {getRelativeTime(comment.created_at)}
            </Text>

            {canDelete && (
              <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={13} color="rgba(239,68,68,0.6)" />
              </TouchableOpacity>
            )}
          </View>

          {/* View replies button */}
          {comment.replies_count > 0 && !showReplies && (
            <TouchableOpacity style={styles.viewRepliesButton} onPress={handleViewReplies}>
              {loadingReplies ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 4 }} />
              ) : (
                <Ionicons name="chatbubble-outline" size={12} color={theme.colors.primary} />
              )}
              <Text style={[styles.viewRepliesText, { color: theme.colors.primary }]}>
                {loadingReplies ? 'Loading...' : `${comment.replies_count} ${comment.replies_count === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Collapse replies */}
          {showReplies && comment.replies_count > 0 && (
            <TouchableOpacity style={styles.viewRepliesButton} onPress={handleViewReplies}>
              <Ionicons name="chevron-up" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.viewRepliesText, { color: theme.colors.textSecondary }]}>Hide replies</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Nested replies */}
      {showReplies && (
        <View style={styles.repliesContainer}>
          {replies.map((reply) => {
            const replyShowReplies = expandedReplies?.has(reply.id) ?? false;
            const replyReplies = repliesMap?.[reply.id] ?? [];
            const replyLoadingReplies = loadingRepliesSet?.has(reply.id) ?? false;
            return (
              <CommentCard
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                postAuthorId={postAuthorId}
                onLike={onLike}
                onReply={onReply}
                onViewReplies={onViewReplies}
                onDelete={onDelete}
                onPressAuthor={onPressAuthor}
                showReplies={replyShowReplies}
                replies={replyReplies}
                loadingReplies={replyLoadingReplies}
                expandedReplies={expandedReplies}
                repliesMap={repliesMap}
                loadingRepliesSet={loadingRepliesSet}
                isNested={true}
                depth={depth + 1}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  nestedContainer: {
    marginLeft: 40,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  commentImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteBtn: {
    paddingLeft: 4,
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingVertical: 4,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 4,
  },
});
