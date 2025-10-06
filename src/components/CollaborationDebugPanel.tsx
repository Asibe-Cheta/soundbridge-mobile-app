// src/components/CollaborationDebugPanel.tsx
// Debug panel for testing collaboration features

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { notificationService } from '../services/NotificationService';
import { deepLinkingService } from '../services/DeepLinkingService';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function CollaborationDebugPanel({ visible, onClose }: DebugPanelProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    availability, 
    requests, 
    error, 
    hasPendingActions,
    syncPendingActions,
    refreshAvailability 
  } = useCollaboration();

  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadDebugInfo();
      loadStoredNotifications();
    }
  }, [visible]);

  const loadDebugInfo = async () => {
    try {
      const info = {
        user: {
          id: user?.id,
          display_name: user?.display_name,
          onboarding_completed: user?.onboarding_completed,
        },
        collaboration: {
          availabilityCount: availability.length,
          requestsCount: requests.length,
          hasError: !!error,
          errorMessage: error,
          hasPendingActions,
        },
        notifications: {
          isInitialized: notificationService.isInitialized,
          pushToken: notificationService.pushToken,
        },
        deepLinking: {
          isNavigationReady: deepLinkingService.isNavigationReady,
        },
        cache: await getCacheInfo(),
      };
      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error);
    }
  };

  const getCacheInfo = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const collaborationKeys = keys.filter(key => 
        key.includes('collab_') || key.includes('pending_') || key.includes('stored')
      );
      
      const cacheEntries = await AsyncStorage.multiGet(collaborationKeys);
      const cacheInfo = cacheEntries.reduce((acc, [key, value]) => {
        try {
          const parsed = JSON.parse(value || '{}');
          acc[key] = {
            size: value?.length || 0,
            hasData: !!value,
            isExpired: parsed.expiresAt ? Date.now() > parsed.expiresAt : false,
          };
        } catch {
          acc[key] = { size: value?.length || 0, hasData: !!value, parseError: true };
        }
        return acc;
      }, {} as any);

      return {
        totalKeys: collaborationKeys.length,
        entries: cacheInfo,
      };
    } catch (error) {
      return { error: error.message };
    }
  };

  const loadStoredNotifications = async () => {
    try {
      const stored = await notificationService.getStoredNotifications();
      setNotifications(stored);
    } catch (error) {
      console.error('Error loading stored notifications:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const success = await notificationService.scheduleLocalNotification(
        'Test Collaboration Request',
        'This is a test notification for collaboration features',
        {
          type: 'collaboration.request.received',
          requestId: 'test-123',
          requesterName: 'Test User',
          subject: 'Test Collaboration',
        }
      );

      if (success) {
        Alert.alert('Success', 'Test notification scheduled');
      } else {
        Alert.alert('Error', 'Failed to schedule notification');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleTestDeepLink = async () => {
    try {
      const testUrl = 'soundbridge://collaboration/requests/test-123';
      const canOpen = await deepLinkingService.canOpenUrl(testUrl);
      
      if (canOpen) {
        await deepLinkingService.openExternalUrl(testUrl);
        Alert.alert('Success', 'Deep link opened');
      } else {
        Alert.alert('Info', 'Deep link cannot be opened (this is normal in development)');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const collaborationKeys = keys.filter(key => 
        key.includes('collab_') || key.includes('pending_') || key.includes('stored')
      );
      
      await AsyncStorage.multiRemove(collaborationKeys);
      await loadDebugInfo();
      Alert.alert('Success', `Cleared ${collaborationKeys.length} cache entries`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSyncPendingActions = async () => {
    try {
      await syncPendingActions();
      await loadDebugInfo();
      Alert.alert('Success', 'Pending actions synced');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRefreshData = async () => {
    try {
      await refreshAvailability();
      await loadDebugInfo();
      Alert.alert('Success', 'Data refreshed');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderSection = (title: string, data: any) => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      <ScrollView style={styles.sectionContent} nestedScrollEnabled>
        <Text style={[styles.jsonText, { color: theme.colors.textSecondary }]}>
          {JSON.stringify(data, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );

  const renderActionButton = (title: string, onPress: () => void, color = theme.colors.primary) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color + '20', borderColor: color }]}
      onPress={onPress}
    >
      <Text style={[styles.actionButtonText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Collaboration Debug Panel
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {renderActionButton('Test Notification', handleTestNotification)}
              {renderActionButton('Test Deep Link', handleTestDeepLink)}
              {renderActionButton('Clear Cache', handleClearCache, '#EF4444')}
              {renderActionButton('Sync Pending', handleSyncPendingActions, '#10B981')}
              {renderActionButton('Refresh Data', handleRefreshData, '#F59E0B')}
            </View>
          </View>

          {/* Notifications Toggle */}
          <View style={[styles.toggleSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              Show Stored Notifications ({notifications.length})
            </Text>
            <Switch
              value={showNotifications}
              onValueChange={setShowNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
              thumbColor={showNotifications ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>

          {/* Stored Notifications */}
          {showNotifications && notifications.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Stored Notifications
              </Text>
              {notifications.map((notification, index) => (
                <View key={index} style={[styles.notificationItem, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notificationBody, { color: theme.colors.textSecondary }]}>
                    {notification.body}
                  </Text>
                  <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
                    {new Date(notification.receivedAt).toLocaleString()}
                  </Text>
                  {!notification.read && (
                    <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Debug Sections */}
          {renderSection('User Info', debugInfo.user)}
          {renderSection('Collaboration State', debugInfo.collaboration)}
          {renderSection('Notification Service', debugInfo.notifications)}
          {renderSection('Deep Linking', debugInfo.deepLinking)}
          {renderSection('Cache Info', debugInfo.cache)}
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  actionsSection: {
    marginVertical: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionContent: {
    maxHeight: 200,
    padding: 12,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  notificationItem: {
    padding: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 12,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
