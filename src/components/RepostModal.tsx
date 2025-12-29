import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import * as Haptics from 'expo-haptics';

interface RepostModalProps {
  visible: boolean;
  post: Post;
  onClose: () => void;
  onQuickRepost: () => void;
  onRepostWithComment: (comment: string) => void;
  onUnrepost: () => void;
  isReposting: boolean;
  isReposted: boolean;
}

export const RepostModal: React.FC<RepostModalProps> = ({
  visible,
  post,
  onClose,
  onQuickRepost,
  onRepostWithComment,
  onUnrepost,
  isReposting,
  isReposted,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleQuickRepost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQuickRepost();
  };

  const handleRepostWithComment = () => {
    if (comment.trim().length === 0) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRepostWithComment(comment.trim());
  };

  const handleClose = () => {
    setComment('');
    setShowCommentInput(false);
    onClose();
  };

  const charCount = comment.length;
  const charLimit = 500;
  const isOverLimit = charCount > charLimit;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      transparent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.card,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {showCommentInput ? 'Redrop with your thoughts' : isReposted ? 'Undo Redrop' : 'Redrop'}
              </Text>
              <View style={styles.placeholder} />
            </View>

            {!showCommentInput ? (
              /* Repost Options */
              <View style={styles.optionsContainer}>
                {isReposted ? (
                  /* Undo Repost Option */
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: theme.colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onUnrepost();
                    }}
                    disabled={isReposting}
                  >
                    <View style={styles.optionIcon}>
                      <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionTitle, { color: '#EF4444' }]}>
                        Undo Redrop
                      </Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                        Remove your redrop from your feed
                      </Text>
                    </View>
                    {isReposting && <ActivityIndicator size="small" color="#EF4444" />}
                  </TouchableOpacity>
                ) : (
                  <>
                    {/* Quick Repost */}
                    <TouchableOpacity
                      style={[styles.option, { borderBottomColor: theme.colors.border }]}
                      onPress={handleQuickRepost}
                      disabled={isReposting}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons name="repeat-outline" size={24} color={theme.colors.text} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                          Redrop
                        </Text>
                        <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                          Share instantly to your feed
                        </Text>
                      </View>
                      {isReposting && <ActivityIndicator size="small" color={theme.colors.primary} />}
                    </TouchableOpacity>

                    {/* Repost with Comment */}
                    <TouchableOpacity
                      style={styles.option}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowCommentInput(true);
                      }}
                      disabled={isReposting}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons name="pencil-outline" size={24} color={theme.colors.text} />
                      </View>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                          Redrop with your thoughts
                        </Text>
                        <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                          Add a comment to this redrop
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              /* Comment Input */
              <ScrollView style={styles.commentContainer} keyboardShouldPersistTaps="handled">
                {/* User Input */}
                <View style={styles.inputSection}>
                  {user?.avatar_url && (
                    <Image
                      source={{ uri: user.avatar_url }}
                      style={styles.userAvatar}
                    />
                  )}
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { color: theme.colors.text, borderColor: theme.colors.border },
                      ]}
                      placeholder="Add your thoughts..."
                      placeholderTextColor={theme.colors.textSecondary}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      maxLength={500}
                      autoFocus
                    />
                    <View style={styles.charCount}>
                      <Text
                        style={[
                          styles.charCountText,
                          {
                            color: isOverLimit ? '#EF4444' : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {charCount}/{charLimit}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Original Post Preview */}
                <View
                  style={[
                    styles.originalPostPreview,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.repostIndicator}>
                    <Ionicons name="repeat" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
                      Redropping
                    </Text>
                  </View>

                  <View style={styles.originalPostHeader}>
                    {post.author.avatar_url && (
                      <Image
                        source={{ uri: post.author.avatar_url }}
                        style={styles.originalAuthorAvatar}
                      />
                    )}
                    <View>
                      <Text style={[styles.originalAuthorName, { color: theme.colors.text }]}>
                        {post.author.display_name}
                      </Text>
                      {post.author.headline && (
                        <Text
                          style={[styles.originalAuthorHeadline, { color: theme.colors.textSecondary }]}
                        >
                          {post.author.headline}
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text
                    style={[styles.originalPostContent, { color: theme.colors.text }]}
                    numberOfLines={3}
                  >
                    {post.content}
                  </Text>
                </View>

                {/* Repost Button */}
                <TouchableOpacity
                  style={[
                    styles.repostButton,
                    {
                      backgroundColor:
                        comment.trim() && !isOverLimit
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={handleRepostWithComment}
                  disabled={!comment.trim() || isOverLimit || isReposting}
                >
                  {isReposting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="repeat" size={20} color="#FFFFFF" />
                      <Text style={styles.repostButtonText}>Redrop</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
  },
  commentContainer: {
    maxHeight: 500,
  },
  inputSection: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    fontSize: 15,
    minHeight: 80,
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  charCountText: {
    fontSize: 12,
  },
  originalPostPreview: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  repostText: {
    fontSize: 12,
    fontWeight: '500',
  },
  originalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  originalAuthorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  originalAuthorHeadline: {
    fontSize: 12,
  },
  originalPostContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  repostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  repostButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

