import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

interface Notification {
  id: string;
  user_id: string;
  type:
    | 'moderation'
    | 'tip'
    | 'message'
    | 'event'
    | 'event_reminder'
    | 'collaboration_request'
    | 'collaboration_accepted'
    | 'collaboration_declined'
    | 'collaboration_confirmed'
    | 'track_approved'
    | 'track_featured'
    | 'withdrawal'
    | 'creator_post'
    | 'live_session'
    | 'new_follower'
    | 'content_purchase'
    | 'reaction'
    | 'like'
    | 'comment'
    | 'comment_reply'
    | 'post_reaction'
    | 'connection_request'
    | 'connection_accepted'
    | string;
  title: string;
  body: string;
  data: {
    trackId?: string;
    eventId?: string;
    conversationId?: string;
    creatorId?: string;
    sessionId?: string;
    tipId?: string;
    withdrawalId?: string;
    requestId?: string;
    postId?: string;
    followerId?: string;
    purchaseId?: string;
    action?: string;
    deepLink?: string;
    url?: string;
    [key: string]: any;
  };
  read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'moderation'>('all');

  useEffect(() => {
    loadNotifications();
    setupRealtimeSubscription();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error loading notifications:', error);
        Alert.alert('Error', 'Failed to load notifications');
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('❌ Exception loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload);
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📝 Notification updated:', payload);
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === payload.new.id ? (payload.new as Notification) : notif
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return;
      }

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('❌ Exception marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('❌ Error marking all as read:', error);
        Alert.alert('Error', 'Failed to mark all as read');
        return;
      }

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('❌ Exception marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error deleting notification:', error);
        return;
      }

      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (error) {
      console.error('❌ Exception deleting notification:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    console.log('🔔 Notification tapped:', notification.type, notification.data);

    // Navigate based on notification type and data
    const { type, data } = notification;

    switch (type) {
      // Event notifications
      case 'event':
      case 'event_reminder':
        if (data?.eventId) {
          navigation.navigate('EventDetails' as never, { eventId: data.eventId } as never);
        }
        break;

      // Message notifications
      case 'message':
        if (data?.conversationId) {
          navigation.navigate('Chat' as never, { conversationId: data.conversationId } as never);
        } else {
          navigation.navigate('Messages' as never);
        }
        break;

      // Track/content notifications
      case 'moderation':
      case 'track_approved':
      case 'track_featured':
      case 'content_purchase':
        if (data?.trackId) {
          navigation.navigate('TrackDetails' as never, { trackId: data.trackId } as never);
        }
        break;

      // Tip/wallet notifications
      case 'tip':
      case 'withdrawal':
        navigation.navigate('Wallet' as never, { tab: 'tips' } as never);
        break;

      // Collaboration notifications
      case 'collaboration_request':
      case 'collaboration_accepted':
      case 'collaboration_declined':
      case 'collaboration_confirmed':
        navigation.navigate('CollaborationRequests' as never);
        break;

      // Social notifications — navigate to the post
      case 'reaction':
      case 'like':
      case 'post_reaction':
      case 'comment':
      case 'comment_reply':
        if (data?.postId) {
          navigation.navigate('PostDetail' as never, { postId: data.postId } as never);
        }
        break;

      // Connection / follow notifications
      case 'connection_request':
      case 'connection_accepted':
      case 'new_follower':
        if (data?.followerId) {
          navigation.navigate('CreatorProfile' as never, { creatorId: data.followerId } as never);
        } else if (data?.creatorId) {
          navigation.navigate('CreatorProfile' as never, { creatorId: data.creatorId } as never);
        } else if (data?.requesterId) {
          navigation.navigate('CreatorProfile' as never, { creatorId: data.requesterId } as never);
        }
        break;

      // Creator/profile notifications
      case 'creator_post':
        if (data?.creatorId) {
          navigation.navigate('CreatorProfile' as never, { creatorId: data.creatorId } as never);
        }
        break;

      // Live session notifications
      case 'live_session':
        if (data?.sessionId) {
          navigation.navigate('LiveSessionRoom' as never, { sessionId: data.sessionId } as never);
        } else {
          navigation.navigate('LiveSessions' as never);
        }
        break;

      // Default: try to use trackId or eventId if present
      default:
        if (data?.trackId) {
          navigation.navigate('TrackDetails' as never, { trackId: data.trackId } as never);
        } else if (data?.eventId) {
          navigation.navigate('EventDetails' as never, { eventId: data.eventId } as never);
        }
        break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'moderation':
        return 'shield-checkmark';
      case 'tip':
        return 'cash';
      case 'message':
        return 'chatbubble';
      case 'event':
      case 'event_reminder':
        return 'calendar';
      case 'collaboration_request':
        return 'people';
      case 'collaboration_accepted':
      case 'collaboration_confirmed':
        return 'checkmark-circle';
      case 'collaboration_declined':
        return 'close-circle';
      case 'track_approved':
        return 'checkmark-done';
      case 'track_featured':
        return 'star';
      case 'withdrawal':
        return 'wallet';
      case 'creator_post':
        return 'megaphone';
      case 'live_session':
        return 'radio';
      case 'new_follower':
      case 'connection_request':
      case 'connection_accepted':
        return 'person-add';
      case 'content_purchase':
        return 'cart';
      case 'reaction':
      case 'like':
      case 'post_reaction':
        return 'heart';
      case 'comment':
      case 'comment_reply':
        return 'chatbubble-ellipses';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'moderation':
        return '#3B82F6';
      case 'tip':
      case 'content_purchase':
        return '#10B981';
      case 'message':
        return '#8B5CF6';
      case 'event':
      case 'event_reminder':
        return '#F59E0B';
      case 'collaboration_request':
      case 'new_follower':
      case 'connection_request':
      case 'connection_accepted':
        return '#EC4899';
      case 'reaction':
      case 'like':
      case 'post_reaction':
        return '#EF4444';
      case 'comment':
      case 'comment_reply':
        return '#8B5CF6';
      case 'collaboration_accepted':
      case 'collaboration_confirmed':
      case 'track_approved':
        return '#10B981';
      case 'collaboration_declined':
        return '#EF4444';
      case 'track_featured':
        return '#F59E0B';
      case 'withdrawal':
        return '#6366F1';
      case 'creator_post':
        return '#F97316';
      case 'live_session':
        return '#EF4444';
      default:
        return theme.colors.primary;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now.getTime() - notifTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifTime.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'moderation') return notif.type === 'moderation';
    return true;
  });

  const unreadCount = notifications.filter((notif) => !notif.read).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        {
          backgroundColor: item.read ? theme.colors.surface : theme.colors.surface + 'EE',
          borderColor: item.read ? theme.colors.border : theme.colors.primary + '40',
          borderLeftColor: item.read ? theme.colors.border : getNotificationColor(item.type),
        },
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type) + '20' },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type) as any}
            size={20}
            color={getNotificationColor(item.type)}
          />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
          </View>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatTimeAgo(item.created_at)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert('Delete Notification', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item.id) },
            ]);
          }}
        >
          <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar
            barStyle={theme.isDark ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading notifications...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.backgroundGradient.start,
          theme.colors.backgroundGradient.middle,
          theme.colors.backgroundGradient.end,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
              <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'all' && { backgroundColor: theme.colors.primary + '20' },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === 'all' ? theme.colors.primary : theme.colors.textSecondary },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'unread' && { backgroundColor: theme.colors.primary + '20' },
            ]}
            onPress={() => setFilter('unread')}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === 'unread' ? theme.colors.primary : theme.colors.textSecondary },
              ]}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'moderation' && { backgroundColor: theme.colors.primary + '20' },
            ]}
            onPress={() => setFilter('moderation')}
          >
            <Text
              style={[
                styles.filterTabText,
                {
                  color: filter === 'moderation' ? theme.colors.primary : theme.colors.textSecondary,
                },
              ]}
            >
              Moderation
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                No notifications
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                {filter === 'unread'
                  ? "You're all caught up!"
                  : filter === 'moderation'
                  ? 'No moderation notifications yet'
                  : "You'll see notifications here"}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Typography.body.fontFamily,
    marginTop: 16,
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    flex: 1,
    marginLeft: 16,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filterTabText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  notificationCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  body: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  timestamp: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
    marginTop: 8,
    textAlign: 'center',
  },
});

