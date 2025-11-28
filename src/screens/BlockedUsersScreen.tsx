import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { blockService } from '../services/api/blockService';
import BlockUserModal from '../modals/BlockUserModal';
import type { BlockedUser } from '../types/block.types';
import BackButton from '../components/BackButton';

export default function BlockedUsersScreen() {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await blockService.getBlockedUsers('blocked', session);
      setBlockedUsers(response.data);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
  };

  const handleUnblock = async (userId: string) => {
    try {
      await blockService.unblockUser(userId, session);
      await loadBlockedUsers();
      Alert.alert('Success', 'User unblocked');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to unblock user');
    }
  };

  const handleUnblockPress = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.blocked.display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: () => handleUnblock(user.blocked.id),
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View
      style={[
        styles.userItem,
        {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.userInfo}>
        {item.blocked.avatar_url ? (
          <Image source={{ uri: item.blocked.avatar_url }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.defaultAvatar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {item.blocked.display_name}
          </Text>
          <Text style={[styles.username, { color: theme.colors.textSecondary }]}>
            @{item.blocked.username}
          </Text>
          {item.reason && (
            <Text style={[styles.reason, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              Reason: {item.reason}
            </Text>
          )}
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
            Blocked {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, { borderColor: theme.colors.primary }]}
        onPress={() => handleUnblockPress(item)}
      >
        <Text style={[styles.unblockButtonText, { color: theme.colors.primary }]}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && blockedUsers.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <BackButton style={styles.headerButton} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Blocked Users</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading blocked users...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <BackButton style={styles.headerButton} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            You haven't blocked anyone
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Blocked users won't be able to see your posts or message you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/* Block Modal (for re-blocking if needed) */}
      {selectedUser && (
        <BlockUserModal
          visible={showBlockModal}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.blocked.id}
          userName={selectedUser.blocked.display_name}
          userAvatar={selectedUser.blocked.avatar_url}
          isCurrentlyBlocked={true}
          onBlocked={async () => {
            await loadBlockedUsers();
            setShowBlockModal(false);
            setSelectedUser(null);
          }}
          onUnblocked={async () => {
            await loadBlockedUsers();
            setShowBlockModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </SafeAreaView>
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

