import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { blockService } from '../services/api/blockService';
import type { BlockStatus } from '../types/block.types';

interface BlockUserModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userAvatar?: string;
  isCurrentlyBlocked: boolean;
  onBlocked?: () => void;
  onUnblocked?: () => void;
}

const MAX_REASON_LENGTH = 500;

export default function BlockUserModal({
  visible,
  onClose,
  userId,
  userName,
  userAvatar,
  isCurrentlyBlocked,
  onBlocked,
  onUnblocked,
}: BlockUserModalProps) {
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlock = async () => {
    setLoading(true);
    setError(null);

    try {
      await blockService.blockUser(userId, reason.trim() || undefined);
      onBlocked?.();
      onClose();
      setReason('');
      Alert.alert('Success', `You have blocked ${userName}`);
    } catch (err: any) {
      setError(err.message || 'Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    setLoading(true);
    setError(null);

    try {
      await blockService.unblockUser(userId);
      onUnblocked?.();
      onClose();
      Alert.alert('Success', `You have unblocked ${userName}`);
    } catch (err: any) {
      setError(err.message || 'Failed to unblock user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  const reasonLength = reason.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
      transparent={false}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
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
          <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {isCurrentlyBlocked ? 'Unblock User' : 'Block User'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Info */}
          <View style={styles.userInfoSection}>
            <View style={[styles.avatarContainer, { borderColor: theme.colors.border }]}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
              )}
            </View>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{userName}</Text>
          </View>

          {/* Explanation */}
          <View style={styles.explanationSection}>
            {isCurrentlyBlocked ? (
              <Text style={[styles.explanationText, { color: theme.colors.textSecondary }]}>
                Unblocking this user will restore their ability to see your posts and message you.
                You can block them again at any time.
              </Text>
            ) : (
              <>
                <Text style={[styles.explanationTitle, { color: theme.colors.text }]}>
                  What happens when you block someone:
                </Text>
                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
                    <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
                      You won't see their posts or content
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
                    <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
                      They won't be able to message you
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
                    <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
                      They won't be able to see your posts
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
                    <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
                      You can unblock them anytime
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Reason Input (only for blocking) */}
          {!isCurrentlyBlocked && (
            <View style={styles.reasonSection}>
              <Text style={[styles.reasonLabel, { color: theme.colors.text }]}>
                Reason (optional)
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Why are you blocking this user? (for your reference only)"
                placeholderTextColor={theme.colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={MAX_REASON_LENGTH}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text
                style={[
                  styles.characterCount,
                  {
                    color:
                      reasonLength > MAX_REASON_LENGTH * 0.9
                        ? theme.colors.warning || '#FF6B6B'
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {reasonLength}/{MAX_REASON_LENGTH}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error || '#FF6B6B'} />
              <Text style={[styles.errorText, { color: theme.colors.error || '#FF6B6B' }]}>
                {error}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              {
                backgroundColor: isCurrentlyBlocked
                  ? theme.colors.primary
                  : theme.colors.error || '#DC2626',
              },
            ]}
            onPress={isCurrentlyBlocked ? handleUnblock : handleBlock}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>
                {isCurrentlyBlocked ? 'Unblock' : 'Block'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
  explanationSection: {
    marginBottom: 24,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  reasonInput: {
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 4,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

