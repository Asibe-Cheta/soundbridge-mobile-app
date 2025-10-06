// src/services/NotificationService.ts
// Push notification service for collaboration requests

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { collaborationUtils } from '../utils/collaborationUtils';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'collaboration.request.received' | 'collaboration.request.accepted' | 'collaboration.request.declined';
  requestId: string;
  requesterName?: string;
  creatorName?: string;
  subject?: string;
  proposedDate?: string;
}

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  // ===== INITIALIZATION =====

  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 Initializing notification service...');

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permissions denied');
        return false;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || 'your-expo-project-id',
      });

      this.expoPushToken = tokenData.data;
      console.log('✅ Push token obtained:', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('collaboration', {
          name: 'Collaboration Requests',
          description: 'Notifications for collaboration requests and responses',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
        });
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // Register token with backend
      await this.registerPushToken();

      console.log('✅ Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      return false;
    }
  }

  private setupNotificationListeners() {
    // Handle notification received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification response (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  private async handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data as NotificationData;
    
    // Update badge count
    const currentBadge = await Notifications.getBadgeCountAsync();
    await Notifications.setBadgeCountAsync(currentBadge + 1);

    // Store notification for later retrieval
    await this.storeNotification(notification);
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data as NotificationData;
    
    // Handle deep linking based on notification type
    await this.handleDeepLink(data);
  }

  // ===== PUSH TOKEN MANAGEMENT =====

  private async registerPushToken(): Promise<void> {
    if (!this.expoPushToken) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tokenData: PushNotificationToken = {
        token: this.expoPushToken,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: Device.osInternalBuildId || 'unknown',
      };

      // Store token in user profile or separate table
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: tokenData.token,
          platform: tokenData.platform,
          device_id: tokenData.deviceId,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('❌ Error registering push token:', error);
      } else {
        console.log('✅ Push token registered successfully');
      }
    } catch (error) {
      console.error('❌ Error registering push token:', error);
    }
  }

  async updatePushToken(): Promise<void> {
    await this.registerPushToken();
  }

  async unregisterPushToken(): Promise<void> {
    if (!this.expoPushToken) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('push_token', this.expoPushToken);

      if (error) {
        console.error('❌ Error unregistering push token:', error);
      } else {
        console.log('✅ Push token unregistered successfully');
      }
    } catch (error) {
      console.error('❌ Error unregistering push token:', error);
    }
  }

  // ===== NOTIFICATION SENDING =====

  async sendCollaborationRequestNotification(
    recipientUserId: string,
    requesterName: string,
    subject: string,
    requestId: string,
    proposedDate: string
  ): Promise<boolean> {
    try {
      console.log('📤 Sending collaboration request notification...');

      const notificationData: NotificationData = {
        type: 'collaboration.request.received',
        requestId,
        requesterName,
        subject,
        proposedDate,
      };

      const title = collaborationUtils.generateNotificationTitle(
        'collaboration.request.received',
        requesterName
      );

      const body = `${requesterName} wants to collaborate: "${subject}"`;

      // Send via backend API (which will handle the actual push)
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          recipientUserId,
          title,
          body,
          data: notificationData,
          channelId: 'collaboration',
        },
      });

      if (error) {
        console.error('❌ Error sending notification:', error);
        return false;
      }

      console.log('✅ Collaboration request notification sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending collaboration request notification:', error);
      return false;
    }
  }

  async sendCollaborationResponseNotification(
    recipientUserId: string,
    creatorName: string,
    response: 'accepted' | 'declined',
    subject: string,
    requestId: string
  ): Promise<boolean> {
    try {
      console.log('📤 Sending collaboration response notification...');

      const notificationData: NotificationData = {
        type: response === 'accepted' ? 'collaboration.request.accepted' : 'collaboration.request.declined',
        requestId,
        creatorName,
        subject,
      };

      const title = collaborationUtils.generateNotificationTitle(
        response === 'accepted' ? 'collaboration.request.accepted' : 'collaboration.request.declined',
        creatorName
      );

      const body = response === 'accepted' 
        ? `${creatorName} accepted your collaboration request!`
        : `${creatorName} declined your collaboration request`;

      // Send via backend API
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          recipientUserId,
          title,
          body,
          data: notificationData,
          channelId: 'collaboration',
        },
      });

      if (error) {
        console.error('❌ Error sending notification:', error);
        return false;
      }

      console.log('✅ Collaboration response notification sent');
      return true;
    } catch (error) {
      console.error('❌ Error sending collaboration response notification:', error);
      return false;
    }
  }

  // ===== LOCAL NOTIFICATIONS =====

  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    scheduledDate?: Date
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: scheduledDate ? { date: scheduledDate } : null,
      });

      console.log('✅ Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      return null;
    }
  }

  async cancelLocalNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ Local notification cancelled:', notificationId);
    } catch (error) {
      console.error('❌ Error cancelling local notification:', error);
    }
  }

  // ===== DEEP LINKING =====

  private async handleDeepLink(data: NotificationData): Promise<void> {
    try {
      console.log('🔗 Handling deep link:', data);

      // Store deep link data for navigation
      await AsyncStorage.setItem('pendingDeepLink', JSON.stringify(data));

      // The actual navigation will be handled by the app's navigation system
      // when it detects the stored deep link data
    } catch (error) {
      console.error('❌ Error handling deep link:', error);
    }
  }

  async getPendingDeepLink(): Promise<NotificationData | null> {
    try {
      const data = await AsyncStorage.getItem('pendingDeepLink');
      if (data) {
        await AsyncStorage.removeItem('pendingDeepLink');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting pending deep link:', error);
      return null;
    }
  }

  // ===== NOTIFICATION STORAGE =====

  private async storeNotification(notification: Notifications.Notification): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('storedNotifications');
      const notifications = stored ? JSON.parse(stored) : [];
      
      notifications.unshift({
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        receivedAt: new Date().toISOString(),
        read: false,
      });

      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);
      await AsyncStorage.setItem('storedNotifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('❌ Error storing notification:', error);
    }
  }

  async getStoredNotifications(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('storedNotifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting stored notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('storedNotifications');
      if (!stored) return;

      const notifications = JSON.parse(stored);
      const updated = notifications.map((n: any) => 
        n.id === notificationId ? { ...n, read: true } : n
      );

      await AsyncStorage.setItem('storedNotifications', JSON.stringify(updated));
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  // ===== BADGE MANAGEMENT =====

  async updateBadgeCount(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('❌ Error updating badge count:', error);
    }
  }

  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('❌ Error clearing badge:', error);
    }
  }

  // ===== CLEANUP =====

  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // ===== GETTERS =====

  get pushToken(): string | null {
    return this.expoPushToken;
  }

  get isInitialized(): boolean {
    return this.expoPushToken !== null;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();