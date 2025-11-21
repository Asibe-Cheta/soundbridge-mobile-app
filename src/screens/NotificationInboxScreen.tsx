import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { notificationService, NotificationData, NotificationType } from '../services/NotificationService';

interface StoredNotification {
  id: string;
  title: string;
  body: string;
  data: NotificationData;
  receivedAt: string;
  read: boolean;
}

export default function NotificationInboxScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const stored = await notificationService.getStoredNotifications();
      setNotifications(stored);
      
      const unread = stored.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: StoredNotification) => {
    // Mark as read
    if (!notification.read) {
      await notificationService.markNotificationAsRead(notification.id);
      await loadNotifications();
    }

    // Navigate based on notification type
    handleDeepLinkNavigation(notification.data);
  };

  const handleDeepLinkNavigation = (data: NotificationData) => {
    const nav = navigation as any;

    switch (data.type) {
      case 'event':
      case 'event_reminder':
        if (data.eventId) {
          nav.navigate('EventDetails', { eventId: data.eventId });
        }
        break;

      case 'tip':
        nav.navigate('Wallet');
        break;

      case 'message':
        if (data.conversationId) {
          nav.navigate('Messages', { conversationId: data.conversationId });
        }
        break;

      case 'collaboration_request':
      case 'collaboration_accepted':
      case 'collaboration_declined':
      case 'collaboration_confirmed':
        if (data.requestId) {
          // Navigate to collaboration details or calendar
          nav.navigate('Calendar');
        }
        break;

      case 'track_approved':
      case 'track_featured':
        if (data.trackId) {
          nav.navigate('TrackDetails', { trackId: data.trackId });
        }
        break;

      case 'withdrawal':
        nav.navigate('Wallet');
        break;

      case 'creator_post':
        if (data.creatorId) {
          nav.navigate('CreatorProfile', { creatorId: data.creatorId });
        }
        break;

      case 'live_session':
        // Future: navigate to live session
        Alert.alert('Coming Soon', 'Live sessions will be available soon!');
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  const handleMarkAllRead = async () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            await notificationService.markAllAsRead();
            await loadNotifications();
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'event':
      case 'event_reminder':
        return 'calendar';
      case 'tip':
        return 'cash';
      case 'message':
        return 'chatbubbles';
      case 'collaboration_request':
      case 'collaboration_accepted':
      case 'collaboration_declined':
      case 'collaboration_confirmed':
        return 'people';
      case 'track_approved':
      case 'track_featured':
        return 'musical-note';
      case 'withdrawal':
        return 'wallet';
      case 'creator_post':
        return 'person-circle';
      case 'live_session':
        return 'radio';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'event':
      case 'event_reminder':
        return '#4ECDC4';
      case 'tip':
        return '#FFD700';
      case 'message':
        return '#4A90E2';
      case 'collaboration_request':
      case 'collaboration_accepted':
      case 'collaboration_declined':
      case 'collaboration_confirmed':
        return '#9B59B6';
      case 'track_approved':
      case 'track_featured':
        return '#FF6B6B';
      case 'withdrawal':
        return '#2ECC71';
      case 'creator_post':
        return '#E67E22';
      case 'live_session':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: StoredNotification }) => {
    const icon = getNotificationIcon(item.data.type);
    const color = getNotificationColor(item.data.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          !item.read && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.notificationBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
            {formatTime(item.receivedAt)}
          </Text>
        </View>

        {!item.read && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Notifications</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} style={styles.headerButton} />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: '#FF6B6B' }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {notifications.length > 0 && unreadCount > 0 && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleMarkAllRead}
          >
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all</Text>
          </TouchableOpacity>
        )}
        {(notifications.length === 0 || unreadCount === 0) && (
          <View style={styles.headerButton} />
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
    minWidth: 60,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

