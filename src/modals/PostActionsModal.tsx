import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import BlockUserModal from './BlockUserModal';
import ReportContentModal from './ReportContentModal';

interface PostActionsModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onSaveImage?: (imageUrl: string) => void;
  onBlocked?: () => void;
  onReported?: () => void;
}

export default function PostActionsModal({
  visible,
  onClose,
  post,
  onEdit,
  onDelete,
  onShare,
  onSaveImage,
  onBlocked,
  onReported,
}: PostActionsModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const isOwnPost = user?.id === post.author.id;

  const handleBlock = () => {
    setShowBlockModal(true);
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleEdit = () => {
    onEdit?.(post);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(post.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleShare = () => {
    onShare?.(post);
    onClose();
  };

  const handleSaveImage = () => {
    if (post.image_url) {
      onSaveImage?.(post.image_url);
      onClose();
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showBlockModal && !showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.handle} />
            <ScrollView style={styles.scrollView}>
              {/* Share */}
              {onShare && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleShare}
                >
                  <Ionicons name="share-outline" size={24} color={theme.colors.text} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Share</Text>
                </TouchableOpacity>
              )}

              {/* Save Image */}
              {onSaveImage && post.image_url && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleSaveImage}
                >
                  <Ionicons name="download-outline" size={24} color={theme.colors.text} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Save Image</Text>
                </TouchableOpacity>
              )}

              {/* Edit (own posts only) */}
              {isOwnPost && onEdit && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleEdit}
                >
                  <Ionicons name="create-outline" size={24} color={theme.colors.text} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Edit</Text>
                </TouchableOpacity>
              )}

              {/* Delete (own posts only) */}
              {isOwnPost && onDelete && (
                <TouchableOpacity
                  style={[styles.actionItem, styles.destructiveAction]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={24} color={theme.colors.error || '#DC2626'} />
                  <Text style={[styles.actionText, { color: theme.colors.error || '#DC2626' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              )}

              {/* Block User (not own posts) */}
              {!isOwnPost && (
                <TouchableOpacity
                  style={[styles.actionItem, styles.destructiveAction]}
                  onPress={handleBlock}
                >
                  <Ionicons name="shield-outline" size={24} color={theme.colors.error || '#DC2626'} />
                  <Text style={[styles.actionText, { color: theme.colors.error || '#DC2626' }]}>
                    Block User
                  </Text>
                </TouchableOpacity>
              )}

              {/* Report (not own posts) */}
              {!isOwnPost && (
                <TouchableOpacity
                  style={[styles.actionItem, styles.destructiveAction]}
                  onPress={handleReport}
                >
                  <Ionicons name="flag-outline" size={24} color={theme.colors.error || '#DC2626'} />
                  <Text style={[styles.actionText, { color: theme.colors.error || '#DC2626' }]}>
                    Report
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Block User Modal */}
      <BlockUserModal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        userId={post.author.id}
        userName={post.author.display_name}
        userAvatar={post.author.avatar_url}
        isCurrentlyBlocked={isBlocked}
        onBlocked={() => {
          setIsBlocked(true);
          onBlocked?.();
          setShowBlockModal(false);
        }}
        onUnblocked={() => {
          setIsBlocked(false);
          onBlocked?.();
          setShowBlockModal(false);
        }}
      />

      {/* Report Modal */}
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
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  scrollView: {
    maxHeight: 400,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  destructiveAction: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 8,
    paddingTop: 20,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '400',
  },
});

