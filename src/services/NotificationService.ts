// src/services/NotificationService.ts
// Comprehensive push notification service

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================
// TYPES & INTERFACES
// ============================================

export type NotificationType = 
  | 'event'
  | 'tip'
  | 'message'
  | 'collaboration_request'
  | 'collaboration_accepted'
  | 'collaboration_declined'
  | 'collaboration_confirmed'
  | 'event_reminder'
  | 'withdrawal'
  | 'track_approved'
  | 'track_featured'
  | 'creator_post'
  | 'live_session'
  | 'moderation';

export interface NotificationData {
  type: NotificationType;
  deepLink?: string;
  
  // Entity references
  entityId?: string;
  entityType?: string;
  
  // Type-specific data
  eventId?: string;
  trackId?: string;
  creatorId?: string;
  conversationId?: string;
  tipId?: string;
  requestId?: string;
  withdrawalId?: string;
  sessionId?: string;
  
  // Additional context
  amount?: number;
  currency?: string;
  username?: string;
  title?: string;
  body?: string;
  [key: string]: any;
}

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  deviceName?: string;
}

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  notificationStartHour: number;
  notificationEndHour: number;
  timezone: string;
  
  // Type toggles
  eventNotificationsEnabled: boolean;
  messageNotificationsEnabled: boolean;
  tipNotificationsEnabled: boolean;
  collaborationNotificationsEnabled: boolean;
  walletNotificationsEnabled: boolean;
  
  // Targeting preferences
  preferredEventGenres: string[];
  locationState: string;
  locationCountry: string;
}

export interface UserLocation {
  state: string;
  country: string;
  source: 'gps' | 'onboarding';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================
// NOTIFICATION SERVICE CLASS
// ============================================

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private preferences: NotificationPreferences | null = null;
  private userLocation: UserLocation | null = null;

  // ===== INITIALIZATION =====

  async initialize(): Promise<boolean> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.log('⏸️ Notification service initialization already in progress');
      return false;
    }

    // Prevent re-initialization if already initialized
    if (this.hasInitialized) {
      console.log('✅ Notification service already initialized');
      return true;
    }

    try {
      this.isInitializing = true;
      console.log('🔔 Initializing notification service...');

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        this.isInitializing = false;
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
      const projectId = '96a15afd-b1fd-4031-a790-2701fa0bffdf'; // From app.json
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

      this.expoPushToken = tokenData.data;
      console.log('✅ Push token obtained:', this.expoPushToken);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // Initialize location and timezone
      await this.initializeLocationAndTimezone();

      // Load preferences
      await this.loadPreferences();

      // Register token with backend
      await this.registerPushToken();

      console.log('✅ Notification service initialized successfully');
      this.hasInitialized = true;
      this.isInitializing = false;
      return true;
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
      this.isInitializing = false;
      return false;
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    const channels = [
      {
        id: 'default',
        name: 'General Notifications',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'events',
        name: 'Event Notifications',
        description: 'Notifications about nearby events',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'tips',
        name: 'Tips & Payments',
        description: 'Notifications about tips and payments you receive',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      },
      {
        id: 'messages',
        name: 'Messages',
        description: 'New message notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'collaboration',
        name: 'Collaboration Requests',
        description: 'Notifications for collaboration requests and responses',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      {
        id: 'moderation',
        name: 'Content Moderation',
        description: 'Notifications about your content moderation status',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }

    console.log('✅ Android notification channels created');
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
    
    // Mark as read
    await this.markNotificationAsRead(response.notification.request.identifier);
    
    // Handle deep linking
    await this.handleDeepLink(data);
  }

  // ===== PUSH TOKEN REGISTRATION FOR MODERATION =====

  /**
   * Register push token and save to profiles table for moderation notifications
   * Call this after user login or when notification permissions are granted
   */
  async registerPushTokenForModeration(): Promise<boolean> {
    try {
      // Check if we have a push token
      if (!this.expoPushToken) {
        console.log('⚠️ No push token available. Initialize notification service first.');
        return false;
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Error getting user for push token registration:', authError);
        return false;
      }

      // Save push token to profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ expo_push_token: this.expoPushToken })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error saving push token to profile:', updateError);
        return false;
      }

      console.log('✅ Push token registered for moderation notifications:', this.expoPushToken);
      return true;
    } catch (error) {
      console.error('❌ Error in registerPushTokenForModeration:', error);
      return false;
    }
  }

  // ===== LOCATION & TIMEZONE =====

  private async initializeLocationAndTimezone(): Promise<void> {
    try {
      // Get timezone
      const timezone = Localization.timezone || 'UTC';
      console.log('🌍 User timezone:', timezone);

      // Try to get GPS location
      const location = await this.requestLocationPermission();
      if (location) {
        this.userLocation = location;
        console.log('📍 User location:', location);
        
        // Update backend
        await this.updateLocationOnBackend(location);
      } else {
        // Fallback to onboarding location
        await this.loadLocationFromBackend();
      }
    } catch (error) {
      console.error('❌ Error initializing location/timezone:', error);
    }
  }

  // Rate limiting for geocoding
  private lastGeocodeAttempt: number = 0;
  private geocodeRateLimitMs: number = 60000; // 1 minute between attempts
  private geocodeRateLimited: boolean = false;

  async requestLocationPermission(): Promise<UserLocation | null> {
    try {
      // Check rate limit
      const now = Date.now();
      if (this.geocodeRateLimited) {
        const timeSinceLastAttempt = now - this.lastGeocodeAttempt;
        if (timeSinceLastAttempt < this.geocodeRateLimitMs) {
          console.log('⏸️ Geocoding rate limited, skipping request');
          return null;
        }
        // Reset rate limit flag after cooldown period
        this.geocodeRateLimited = false;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('⚠️ Location permission denied, using onboarding location');
        return null;
      }

      this.lastGeocodeAttempt = now;

      const location = await Location.getCurrentPositionAsync({});
      
      // Check if we have cached location data to avoid geocoding
      const cachedLocationKey = `location_${location.coords.latitude.toFixed(2)}_${location.coords.longitude.toFixed(2)}`;
      const cachedLocation = await AsyncStorage.getItem(cachedLocationKey);
      
      if (cachedLocation) {
        const parsed = JSON.parse(cachedLocation);
        return {
          state: parsed.state || 'Unknown',
          country: parsed.country || 'Unknown',
          source: 'gps',
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        };
      }

      // Only attempt geocoding if not rate limited
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          const result = {
            state: place.region || place.city || 'Unknown',
            country: place.country || 'Unknown',
            source: 'gps',
            coordinates: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
          };

          // Cache the result
          await AsyncStorage.setItem(cachedLocationKey, JSON.stringify({
            state: result.state,
            country: result.country,
          }));

          return result;
        }
      } catch (geocodeError: any) {
        // Check if it's a rate limit error
        if (geocodeError?.message?.includes('rate limit') || geocodeError?.message?.includes('too many requests')) {
          console.warn('⚠️ Geocoding rate limit exceeded, will retry after cooldown');
          this.geocodeRateLimited = true;
          this.lastGeocodeAttempt = now;
          // Don't log as error, just return null
          return null;
        }
        // For other errors, log but don't set rate limit
        console.warn('⚠️ Geocoding failed (non-rate-limit error):', geocodeError?.message);
      }

      return null;
    } catch (error: any) {
      // Only log non-rate-limit errors
      if (!error?.message?.includes('rate limit') && !error?.message?.includes('too many requests')) {
        console.error('❌ Error getting GPS location:', error);
      } else {
        console.warn('⚠️ Geocoding rate limited, skipping');
        this.geocodeRateLimited = true;
        this.lastGeocodeAttempt = Date.now();
      }
      return null;
    }
  }

  private async updateLocationOnBackend(location: UserLocation): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('https://www.soundbridge.live/api/user/location', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationState: location.state,
          locationCountry: location.country,
          source: location.source,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update location on backend');
      } else {
        console.log('✅ Location updated on backend');
      }
    } catch (error) {
      console.error('❌ Error updating location:', error);
    }
  }

  private async loadLocationFromBackend(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('https://www.soundbridge.live/api/user/notification-preferences', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.userLocation = {
          state: data.locationState || 'Unknown',
          country: data.locationCountry || 'Unknown',
          source: 'onboarding',
        };
        console.log('✅ Loaded location from backend:', this.userLocation);
      }
    } catch (error) {
      console.error('❌ Error loading location from backend:', error);
    }
  }

  // ===== PREFERENCES MANAGEMENT =====

  private async loadPreferences(): Promise<void> {
    try {
      // Try to load from backend first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Load default preferences
        this.preferences = this.getDefaultPreferences();
        return;
      }

      const response = await fetch('https://www.soundbridge.live/api/user/notification-preferences', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        this.preferences = await response.json();
        console.log('✅ Preferences loaded from backend');
      } else {
        this.preferences = this.getDefaultPreferences();
      }

      // Cache locally
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
      
      // Try to load from cache
      const cached = await AsyncStorage.getItem('notificationPreferences');
      if (cached) {
        this.preferences = JSON.parse(cached);
      } else {
        this.preferences = this.getDefaultPreferences();
      }
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      notificationsEnabled: true,
      notificationStartHour: 8,
      notificationEndHour: 22,
      timezone: Localization.timezone || 'UTC',
      eventNotificationsEnabled: true,
      messageNotificationsEnabled: true,
      tipNotificationsEnabled: true,
      collaborationNotificationsEnabled: true,
      walletNotificationsEnabled: true,
      preferredEventGenres: [],
      locationState: 'Unknown',
      locationCountry: 'Unknown',
    };
  }

  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const newPreferences = { ...this.preferences, ...updates } as NotificationPreferences;
      
      // Update backend
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch('https://www.soundbridge.live/api/user/notification-preferences', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          console.error('Failed to update preferences on backend');
          return false;
        }
      }

      // Update local
      this.preferences = newPreferences;
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
      
      console.log('✅ Preferences updated');
      return true;
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
      return false;
    }
  }

  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  // ===== PUSH TOKEN MANAGEMENT =====

  private async registerPushToken(): Promise<void> {
    if (!this.expoPushToken) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const tokenData = {
        pushToken: this.expoPushToken,
        platform: Platform.OS,
        deviceId: Device.osInternalBuildId || 'unknown',
        deviceName: Device.deviceName || 'Unknown Device',
      };

      const response = await fetch('https://www.soundbridge.live/api/user/push-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });

      if (!response.ok) {
        console.error('❌ Failed to register push token');
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
    // Mark token as inactive on backend
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch('https://www.soundbridge.live/api/user/push-token', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('✅ Push token unregistered');
    } catch (error) {
      console.error('❌ Error unregistering push token:', error);
    }
  }

  // ===== DEEP LINKING =====

  private async handleDeepLink(data: NotificationData): Promise<void> {
    try {
      console.log('🔗 Handling deep link:', data);

      // Store deep link data for navigation
      await AsyncStorage.setItem('pendingDeepLink', JSON.stringify(data));

      // Try to open deep link directly if provided
      if (data.deepLink) {
        const supported = await Linking.canOpenURL(data.deepLink);
        if (supported) {
          await Linking.openURL(data.deepLink);
        }
      }
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

  generateDeepLink(type: NotificationType, entityId: string): string {
    const baseUrl = 'soundbridge://';
    
    switch (type) {
      case 'event':
      case 'event_reminder':
        return `${baseUrl}event/${entityId}`;
      
      case 'tip':
        return `${baseUrl}wallet/tips`;
      
      case 'message':
        return `${baseUrl}messages/${entityId}`;
      
      case 'collaboration_request':
      case 'collaboration_accepted':
      case 'collaboration_declined':
      case 'collaboration_confirmed':
        return `${baseUrl}collaboration/${entityId}`;
      
      case 'track_approved':
      case 'track_featured':
        return `${baseUrl}track/${entityId}`;
      
      case 'withdrawal':
        return `${baseUrl}wallet/withdrawal/${entityId}`;
      
      case 'creator_post':
        return `${baseUrl}creator/${entityId}`;
      
      case 'live_session':
        return `${baseUrl}live/${entityId}`;
      
      default:
        return baseUrl;
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

      // Keep only last 100 notifications
      const trimmed = notifications.slice(0, 100);
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
      // Update local storage
      const stored = await AsyncStorage.getItem('storedNotifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        const updated = notifications.map((n: any) => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        await AsyncStorage.setItem('storedNotifications', JSON.stringify(updated));
      }

      // Update backend
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`https://www.soundbridge.live/api/user/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }

      // Update badge
      await this.updateBadgeCount();
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      // Update local storage
      const stored = await AsyncStorage.getItem('storedNotifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        const updated = notifications.map((n: any) => ({ ...n, read: true }));
        await AsyncStorage.setItem('storedNotifications', JSON.stringify(updated));
      }

      // Update backend
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('https://www.soundbridge.live/api/user/notifications/read-all', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }

      // Clear badge
      await this.clearBadge();
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
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

  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // ===== LOCAL NOTIFICATIONS (FOR TESTING) =====

  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    scheduledDate?: Date
  ): Promise<string | null> {
    try {
      const channel = this.getChannelForType(data.type);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId: channel }),
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

  private getChannelForType(type: NotificationType): string {
    if (type.includes('event')) return 'events';
    if (type === 'tip') return 'tips';
    if (type === 'message') return 'messages';
    if (type.includes('collaboration')) return 'collaboration';
    if (type === 'moderation') return 'moderation';
    return 'default';
  }

  async cancelLocalNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ Local notification cancelled:', notificationId);
    } catch (error) {
      console.error('❌ Error cancelling local notification:', error);
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

  get location(): UserLocation | null {
    return this.userLocation;
  }

  get timezone(): string {
    return Localization.timezone || 'UTC';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

