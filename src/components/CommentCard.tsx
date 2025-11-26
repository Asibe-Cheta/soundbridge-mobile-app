import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Comment } from '../types/feed.types';
import { getRelativeTime } from '../utils/collaborationUtils';
import * as Haptics from 'expo-haptics';

interface CommentCardProps {
  comment: Comment;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  onViewReplies?: (commentId: string) => void;
  showReplies?: boolean;
  replies?: Comment[];
  isNested?: boolean;
}

export default function CommentCard({
  comment,
  onLike,
  onReply,
  onViewReplies,
  showReplies = false,
  replies = [],
  isNested = false,
}: CommentCardProps) {
  const { theme } = useTheme();

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

  return (
    <View style={[styles.container, isNested && styles.nestedContainer]}>
      <View style={styles.comment}>
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: theme.colors.border }]}>
          {comment.user.avatar_url ? (
            <Image source={{ uri: comment.user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
          )}
        </View>

        {/* Comment Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {comment.user.display_name}
            </Text>
            {/* Verified badge could go here if needed */}
          </View>

          {/* Comment Text */}
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {comment.content}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.likeButton,
                comment.user_liked && {
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                },
              ]}
              onPress={handleLike}
            >
              <Ionicons
                name={comment.user_liked ? 'heart' : 'heart-outline'}
                size={14}
                color={comment.user_liked ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.likeCount,
                  {
                    color: comment.user_liked
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {comment.likes_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReply}>
              <Text style={[styles.replyText, { color: theme.colors.textSecondary }]}>
                Reply
              </Text>
            </TouchableOpacity>

            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {getRelativeTime(comment.created_at)}
            </Text>
          </View>

          {/* View Replies Button */}
          {comment.replies_count > 0 && !showReplies && (
            <TouchableOpacity style={styles.viewRepliesButton} onPress={handleViewReplies}>
              <Ionicons name="arrow-forward" size={12} color={theme.colors.primary} />
              <Text style={[styles.viewRepliesText, { color: theme.colors.primary }]}>
                {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Nested Replies */}
      {showReplies && replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onLike={onLike}
              onReply={onReply}
              isNested={true}
            />
          ))}
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
    marginLeft: 46,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
    marginTop: 8,
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  text: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 46,
    paddingVertical: 6,
  },
  viewRepliesText: {
    fontSize: 13,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
  },
});

