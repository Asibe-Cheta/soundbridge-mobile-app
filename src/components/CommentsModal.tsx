import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  reactions_count?: {
    support: number;
    love: number;
    fire: number;
    congrats: number;
  };
  user_reaction?: 'support' | 'love' | 'fire' | 'congrats' | null;
  replies?: Comment[];
}

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

const REACTION_EMOJIS = {
  support: '👍',
  love: '❤️',
  fire: '🔥',
  congrats: '👏',
};

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  postId,
  onClose,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      // TODO: Fetch comments from API
      // const response = await feedService.getComments(postId);
      // setComments(response);
      
      // Mock data for now
      setComments([]);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // TODO: Submit comment to API
      // const newComment = await feedService.addComment({
      //   postId,
      //   content: commentText,
      //   parentCommentId: replyingTo?.id || null,
      // });

      // Add to local state
      // setComments([newComment, ...comments]);
      
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactToComment = async (
    commentId: string,
    reactionType: 'support' | 'love' | 'fire' | 'congrats'
  ) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // TODO: React to comment via API
      // await feedService.reactToComment(commentId, reactionType);
      
      // Update local state optimistically
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment.id === commentId) {
            const isRemoving = comment.user_reaction === reactionType;
            return {
              ...comment,
              user_reaction: isRemoving ? null : reactionType,
              reactions_count: {
                ...comment.reactions_count,
                [reactionType]: isRemoving
                  ? (comment.reactions_count?.[reactionType] || 1) - 1
                  : (comment.reactions_count?.[reactionType] || 0) + 1,
              },
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Error reacting to comment:', error);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const renderComment = ({ item, isReply = false }: { item: Comment; isReply?: boolean }) => {
    const totalReactions = item.reactions_count
      ? Object.values(item.reactions_count).reduce((sum, count) => sum + count, 0)
      : 0;

    return (
      <View style={styles.commentContainer}>
        {/* Reply Connector Line */}
        {isReply && (
          <View style={[styles.replyConnector, { backgroundColor: theme.colors.border }]} />
        )}

        <View style={[styles.commentContent, isReply && styles.replyContent]}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarContainer}>
            {item.user.avatar_url ? (
              <Image
                source={{ uri: item.user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.border }]}>
                <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>

          {/* Comment Body */}
          <View style={styles.commentBody}>
            {/* Header */}
            <View style={styles.commentHeader}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {item.user.display_name}
              </Text>
              <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                • {formatTimeAgo(item.created_at)}
              </Text>
            </View>

            {/* Text */}
            <Text style={[styles.commentText, { color: theme.colors.text }]}>
              {item.content}
            </Text>

            {/* Actions */}
            <View style={styles.commentActions}>
              {/* Like */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReactToComment(item.id, 'support')}
              >
                <Text style={styles.actionEmoji}>
                  {item.user_reaction ? REACTION_EMOJIS[item.user_reaction] : '👍'}
                </Text>
                {totalReactions > 0 && (
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: item.user_reaction ? '#DC2626' : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {totalReactions}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Reply */}
              {!isReply && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleReply(item)}
                >
                  <Ionicons
                    name="arrow-undo-outline"
                    size={14}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
                    Reply
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Replies */}
            {item.replies && item.replies.length > 0 && (
              <View style={styles.repliesContainer}>
                {item.replies.map((reply) => (
                  <View key={reply.id}>
                    {renderComment({ item: reply, isReply: true })}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Comments</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No comments yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Be the first to comment!
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={({ item }) => renderComment({ item })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Section */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {replyingTo && (
            <View style={[styles.replyingToBar, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.replyingToText, { color: theme.colors.textSecondary }]}>
                Replying to {replyingTo.user.display_name}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
            {user?.avatar_url && (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.inputAvatar}
              />
            )}
            
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
              placeholderTextColor={theme.colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              style={[
                styles.sendButton,
                {
                  backgroundColor: commentText.trim() ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={commentText.trim() ? '#FFFFFF' : theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  commentContainer: {
    position: 'relative',
  },
  replyConnector: {
    position: 'absolute',
    left: 64,
    top: 0,
    width: 2,
    height: '100%',
  },
  commentContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyContent: {
    paddingLeft: 48,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionEmoji: {
    fontSize: 14,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyingToText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

