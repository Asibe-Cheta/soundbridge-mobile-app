import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types/feed.types';
import { useComments } from '../hooks/useComments';
import CommentCard from '../components/CommentCard';
import * as Haptics from 'expo-haptics';

interface CommentsModalProps {
  visible: boolean;
  post: Post;
  onClose: () => void;
  onViewFullPost?: (postId: string) => void;
}

export default function CommentsModal({
  visible,
  post,
  onClose,
  onViewFullPost,
}: CommentsModalProps) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const {
    comments,
    loading,
    hasMore,
    error,
    addComment: addCommentAPI,
    likeComment,
    loadMore,
  } = useComments(post.id);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewComment('');
    setReplyingTo(null);
    onClose();
  };

  const handleSend = async () => {
    if (!newComment.trim() || isPosting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPosting(true);

    try {
      await addCommentAPI(newComment.trim(), replyingTo || undefined);
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await likeComment(commentId);
    } catch (err) {
      console.error('Failed to like comment:', err);
    }
  };

  const handleReply = (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      setReplyingTo(commentId);
      // TODO: Focus input
    }
  };

  const handleViewReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const getRepliesForComment = (commentId: string) => {
    // TODO: Implement nested replies API call in future phase
    // For now, return empty array as replies are handled at comment level
    return [];
  };

  const canSend = newComment.trim().length > 0 && !isPosting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Comments ({comments.length})
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Ionicons name="filter-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          <View
            style={[
              styles.postPreview,
              {
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.previewContent}>
              {post.author.avatar_url ? (
                <Image source={{ uri: post.author.avatar_url }} style={styles.previewAvatar} />
              ) : (
                <View style={[styles.previewAvatar, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                </View>
              )}
              <View style={styles.previewText}>
                <Text style={[styles.previewAuthor, { color: theme.colors.text }]}>
                  {post.author.display_name}
                </Text>
                <Text
                  style={[styles.previewContentText, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {post.content}
                </Text>
                <TouchableOpacity onPress={() => onViewFullPost?.(post.id)}>
                  <Text style={[styles.viewFullPost, { color: theme.colors.primary }]}>
                    View full post
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Comments List */}
          <FlatList
            data={comments.filter((item) => item && item.id)}
            keyExtractor={(item, index) => item?.id || `comment-${index}`}
            renderItem={({ item }) => {
              if (!item || !item.id) return null;
              return (
                <CommentCard
                  comment={item}
                  onLike={handleLike}
                  onReply={handleReply}
                  onViewReplies={handleViewReplies}
                  showReplies={expandedReplies.has(item.id)}
                  replies={getRepliesForComment(item.id)}
                />
              );
            }}
            contentContainerStyle={styles.commentsList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Loading comments...
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  disabled={loading}
                >
                  <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                    {loading ? 'Loading...' : 'Load more comments'}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />

          {/* Comment Input */}
          <View
            style={[
              styles.inputSection,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.inputContainer}>
              {userProfile?.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.inputAvatar} />
              ) : (
                <View style={[styles.inputAvatar, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                </View>
              )}
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder={replyingTo ? 'Replying to @username...' : 'Add a comment...'}
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: canSend ? theme.colors.primary : theme.colors.surface,
                  },
                ]}
                onPress={handleSend}
                disabled={!canSend}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={canSend ? (theme.isDark ? '#FFFFFF' : '#FFFFFF') : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  commentsList: {
    padding: 16,
    flexGrow: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  sortButton: {
    padding: 8,
  },
  postPreview: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  previewContent: {
    flexDirection: 'row',
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewText: {
    flex: 1,
  },
  previewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewContentText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  viewFullPost: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  inputSection: {
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '400',
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

