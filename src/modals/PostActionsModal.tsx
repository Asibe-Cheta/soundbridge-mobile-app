import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';

interface PostActionsModalProps {
  visible: boolean;
  post: Post | null;
  isSaved?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onReport?: () => void;
}

export default function PostActionsModal({
  visible,
  post,
  isSaved = false,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onSave,
  onUnsave,
  onReport,
}: PostActionsModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  if (!post) return null;

  const isOwnPost = post.author.id === user?.id;

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
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View
            style={[
              styles.content,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Post Options</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Share */}
              <TouchableOpacity
                style={[styles.actionItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  onShare?.();
                  onClose();
                }}
              >
                <Ionicons name="share-outline" size={24} color={theme.colors.text} />
                <Text style={[styles.actionText, { color: theme.colors.text }]}>Share</Text>
              </TouchableOpacity>

              {/* Save/Unsave */}
              {isSaved ? (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    onUnsave?.();
                    onClose();
                  }}
                >
                  <Ionicons name="bookmark" size={24} color={theme.colors.primary} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Unsave</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    onSave?.();
                    onClose();
                  }}
                >
                  <Ionicons name="bookmark-outline" size={24} color={theme.colors.text} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Save</Text>
                </TouchableOpacity>
              )}

              {/* Edit (only for own posts) */}
              {isOwnPost && onEdit && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => {
                    onEdit();
                    onClose();
                  }}
                >
                  <Ionicons name="pencil-outline" size={24} color={theme.colors.text} />
                  <Text style={[styles.actionText, { color: theme.colors.text }]}>Edit</Text>
                </TouchableOpacity>
              )}

              {/* Delete (only for own posts) */}
              {isOwnPost && onDelete && (
                <TouchableOpacity
                  style={[styles.actionItem, { borderBottomColor: theme.colors.border }]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
              )}

              {/* Report (only for others' posts) */}
              {!isOwnPost && onReport && (
                <TouchableOpacity
                  style={[styles.actionItem]}
                  onPress={() => {
                    onReport();
                    onClose();
                  }}
                >
                  <Ionicons name="flag-outline" size={24} color={theme.colors.error} />
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>Report</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    paddingVertical: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '400',
  },
});

