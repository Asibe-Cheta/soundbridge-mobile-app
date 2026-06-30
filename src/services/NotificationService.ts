// src/services/NotificationService.ts
// Comprehensive push notification service

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { locationUpdateService } from './LocationUpdateService';
import { config } from '../config/environment';
import { isBgIsolationEnabled } from '../config/bgAudioIsolationFlags';
import { audioLog } from '../lib/audioDebugLog';

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
  | 'moderation'
  | 'new_follower'
  | 'follow'
  | 'like'
  | 'reaction'
  | 'comment'
  | 'content_purchase'
  | 'connection_request'
  | 'connection_accepted'
  | 'subscription'
  | 'system'
  | 'payout'
  | 'opportunity_interest'
  | 'opportunity_agreement_received'
  // Urgent gig types
  | 'urgent_gig'           // provider notified of a new gig match
  | 'gig_accepted'         // requester notified that a provider accepted
  | 'gig_confirmed'        // provider notified they were selected
  | 'gig_starting_soon'    // reminder for both parties 1h before
  | 'gig_expired'          // no provider found; requester refunded
  | 'gig_payment'          // creator's wallet credited after gig completion
  | 'gig_refund'           // requester refunded after dispute/cancellation
  | 'gig_rating_received'  // rating prompt after completion
  | 'opportunity'          // nearby planned opportunity matching user's skills
  | 'dispute_raised'       // other party raised a dispute
  | 'identity_verified'    // Persona KYC approved — verified professional badge granted
  | 'venue_match';         // new venue listed that matches user preferences

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
  opportunityId?: string;
  opportunityTitle?: string;
  projectId?: string;
  gigId?: string;
  gigStatus?: string;
  
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
  urgentGigNotificationsEnabled: boolean;
  urgentGigActionButtonsEnabled: boolean;

  // Social toggles (migration 20260328100000)
  commentsOnPosts: boolean;
  likesOnPosts: boolean;
  newFollowers: boolean;
  contentSales: boolean;

  // Targeting preferences
  preferredEventGenres: string[];
  locationState: string;
  locationCountry: string;

  // Event notification timing (google_calendar_nudge migration)
  preferredNotificationTimes: string[];
  eventPlanningWindow: string;
  activeEventMonths: number[];
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
  private tokenListener: any = null;
  private preferences: NotificationPreferences | null = null;
  private userLocation: UserLocation | null = null;
  private isInitializing = false;
  private hasInitialized = false;

  // Callback for navigation when notification is tapped
  private navigationCallback: ((data: NotificationData) => void) | null = null;

  /**
   * Set a callback to handle navigation when notifications are tapped.
   * Call this from App.tsx to enable direct navigation without URL scheme.
   */
  setNavigationCallback(callback: (data: NotificationData) => void): void {
    if (isBgIsolationEnabled('disableNotificationHooks')) {
      audioLog('BG_ISO_SKIP_NOTIFICATION_NAV_CB', {});
      return;
    }
    this.navigationCallback = callback;
    console.log('✅ Navigation callback registered for notification taps');
  }

  // ===== INITIALIZATION =====

  async initialize(): Promise<boolean> {
    if (isBgIsolationEnabled('disableNotificationHooks')) {
      audioLog('BG_ISO_SKIP_NOTIFICATION_INIT', {});
      return false;
    }
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
        this.isInitializing = false;
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

      // Register notification action categories (action buttons on lock screen)
      await this.registerNotificationCategories();

      // Set up notification listeners
      this.setupNotificationListeners();

      // Initialize location and timezone
      await this.initializeLocationAndTimezone();

      // Load preferences
      await this.loadPreferences();

      // Register token with backend and sync to profile
      await this.registerPushToken();
      await this.syncPushTokenToProfile();

      // Sync badge count with stored notifications
      await this.updateBadgeCount();

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
      {
        id: 'urgent_gigs',
        name: 'Urgent Gig Alerts',
        description: 'Real-time last-minute gig opportunities near you',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 150, 500],
        lightColor: '#FF4500',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      },
      {
        id: 'social',
        name: 'Social Activity',
        description: 'New followers, reactions, and comments on your posts',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      },
      {
        id: 'opportunities',
        name: 'Opportunities & Projects',
        description: 'New interest in your opportunities, project updates, and payments',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 200, 100, 200],
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }

    console.log('✅ Android notification channels created');
  }

  /**
   * Register notification action button categories.
   * These appear as action buttons on the lock screen / notification shade.
   *
   * Categories registered:
   *   • urgent_gig  → [ACCEPT] [DECLINE] [VIEW DETAILS]  (provider receives gig match)
   *   • gig_update  → [VIEW DETAILS]                     (status updates, confirmations)
   *   • dispute     → [VIEW DISPUTE]                     (dispute raised against you)
   *
   * NOTE: Action buttons only show on physical devices.
   * On iOS they appear as swipe actions; on Android as notification action buttons.
   */
  private async registerNotificationCategories(): Promise<void> {
    try {
      // urgent_gig — provider receives a gig match notification
      await Notifications.setNotificationCategoryAsync('urgent_gig', [
        {
          identifier: 'accept',
          buttonTitle: 'ACCEPT',
          options: { isDestructive: false, opensAppToForeground: false },
        },
        {
          identifier: 'decline',
          buttonTitle: 'DECLINE',
          options: { isDestructive: true, opensAppToForeground: false },
        },
        {
          identifier: 'view',
          buttonTitle: 'VIEW DETAILS',
          options: { isDestructive: false, opensAppToForeground: true },
        },
      ]);

      // gig_update — confirmations, selections, starting-soon reminders
      await Notifications.setNotificationCategoryAsync('gig_update', [
        {
          identifier: 'view',
          buttonTitle: 'VIEW GIG',
          options: { isDestructive: false, opensAppToForeground: true },
        },
      ]);

      // dispute — another party raised a dispute against you
      await Notifications.setNotificationCategoryAsync('dispute', [
        {
          identifier: 'view_dispute',
          buttonTitle: 'VIEW DISPUTE',
          options: { isDestructive: false, opensAppToForeground: true },
        },
      ]);

      // opportunity_interest — someone expressed interest in your opportunity
      await Notifications.setNotificationCategoryAsync('opportunity_interest', [
        {
          identifier: 'view_interests',
          buttonTitle: 'VIEW INTEREST',
          options: { isDestructive: false, opensAppToForeground: true },
        },
      ]);

      // project_update — project status changed (accepted, delivered, completed, payment)
      await Notifications.setNotificationCategoryAsync('project_update', [
        {
          identifier: 'view_project',
          buttonTitle: 'VIEW PROJECT',
          options: { isDestructive: false, opensAppToForeground: true },
        },
      ]);

      // payment_received — wallet credited after project completion or tip
      await Notifications.setNotificationCategoryAsync('payment_received', [
        {
          identifier: 'view_wallet',
          buttonTitle: 'VIEW WALLET',
          options: { isDestructive: false, opensAppToForeground: true },
        },
      ]);

      console.log('✅ Notification action categories registered');
    } catch (error) {
      // Categories are non-critical — don't fail initialization
      console.warn('⚠️ Failed to register notification categories:', error);
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

    // Re-register whenever the OS rotates the push token (common on Android)
    this.tokenListener = Notifications.addPushTokenListener(async ({ data: newToken }) => {
      if (newToken && newToken !== this.expoPushToken) {
        console.log('🔄 Push token rotated, re-registering:', newToken);
        this.expoPushToken = newToken;
        await this.registerPushToken();
        await this.syncPushTokenToProfile();
      }
    });
  }

  private async handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data as NotificationData;

    // Update badge count
    const currentBadge = await Notifications.getBadgeCountAsync();
    await Notifications.setBadgeCountAsync(currentBadge + 1);

    // Store notification in AsyncStorage (legacy fallback)
    await this.storeNotification(notification);

    // Persist to Supabase so it appears in the in-app Notifications screen
    await this.persistNotificationToSupabase({
      title: notification.request.content.title || '',
      body: notification.request.content.body || '',
      type: (data?.type as string) || 'system',
      data: data as unknown as Record<string, any>,
    });

    // Special handling for moderation notifications
    if (data.type === 'moderation') {
      console.log('📋 Moderation notification received:', {
        action: data.action,
        trackId: data.trackId,
      });
      // The notification will be stored and user can tap to navigate
    }
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data as NotificationData;
    const actionId = response.actionIdentifier;

    console.log('👆 Notification tapped - type:', data.type, '| action:', actionId);

    // Mark as read
    await this.markNotificationAsRead(response.notification.request.identifier);

    // Normalise IDs — backend push payloads use snake_case (gig_id, project_id),
    // while our NotificationData interface uses camelCase. Accept both.
    const gigId: string | undefined = data.gigId || data.gig_id;
    const projectId: string | undefined = data.projectId || data.project_id;

    // ── Urgent gig action buttons ──────────────────────────────────────────
    if (data.type === 'urgent_gig' && gigId) {
      if (actionId === 'accept') {
        // Provider tapped ACCEPT directly from notification — fire and forget
        console.log('⚡ Urgent gig ACCEPT action from notification, gigId:', gigId);
        await this.respondToGigFromNotification(gigId, 'accept');
        return;
      }
      if (actionId === 'decline') {
        console.log('⚡ Urgent gig DECLINE action from notification, gigId:', gigId);
        await this.respondToGigFromNotification(gigId, 'decline');
        return;
      }
      // 'view' or default tap — navigate to ProviderGigDetail
      if (this.navigationCallback) {
        this.navigationCallback({ ...data, deepLink: `soundbridge://gig/${gigId}` });
      }
      return;
    }

    // ── gig_accepted / gig_confirmed → requester or provider sees gig detail ─
    if ((data.type === 'gig_accepted' || data.type === 'gig_confirmed') && gigId) {
      if (this.navigationCallback) {
        this.navigationCallback({ ...data, deepLink: `soundbridge://gig/${gigId}` });
      }
      return;
    }

    // ── dispute_raised → navigate to dispute detail ─────────────────────────
    if (data.type === 'dispute_raised' && projectId) {
      if (this.navigationCallback) {
        this.navigationCallback({ ...data, deepLink: `soundbridge://project/${projectId}/dispute` });
      }
      return;
    }

    // ── gig_rating_received → navigate to profile ratings ──────────────────
    if (data.type === 'gig_rating_received') {
      if (this.navigationCallback) {
        this.navigationCallback({ ...data, deepLink: `soundbridge://profile` });
      }
      return;
    }

    // ── moderation (existing) ───────────────────────────────────────────────
    if (data.type === 'moderation' && data.trackId) {
      const deepLink = `soundbridge://track/${data.trackId}`;
      await this.handleDeepLink({ ...data, deepLink });
      return;
    }

    // ── Default: deep link for all other types ──────────────────────────────
    await this.handleDeepLink(data);
  }

  /**
   * Respond to an urgent gig directly from a notification action button,
   * without opening the app. Uses a raw fetch so it works even if
   * UrgentGigService isn't constructed yet.
   */
  private async respondToGigFromNotification(
    gigId: string,
    action: 'accept' | 'decline'
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`${config.apiUrl}/api/gigs/${gigId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        console.log(`✅ Gig ${action} sent from notification action`);
      } else {
        console.warn(`⚠️ Gig ${action} from notification failed:`, response.status);
      }
    } catch (error) {
      console.error(`❌ Error responding to gig from notification:`, error);
    }
  }

  // ===== PUSH TOKEN PROFILE SYNC =====

  /**
   * Writes the current push token directly to profiles.expo_push_token.
   * Called automatically during initialize() and on token rotation.
   * The backend's DB triggers read from this column for message pushes.
   */
  private async syncPushTokenToProfile(): Promise<boolean> {
    try {
      if (!this.expoPushToken) return false;

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ expo_push_token: this.expoPushToken })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error syncing push token to profile:', updateError);
        return false;
      }

      console.log('✅ Push token synced to profiles.expo_push_token');
      return true;
    } catch (error) {
      console.error('❌ Error in syncPushTokenToProfile:', error);
      return false;
    }
  }

  /** @deprecated Called automatically during initialize(). No need to call this manually. */
  async registerPushTokenForModeration(): Promise<boolean> {
    return this.syncPushTokenToProfile();
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

        // Update backend (legacy PUT endpoint)
        await this.updateLocationOnBackend(location);

        // Also send to new POST endpoint for event notifications
        await locationUpdateService.onLocationPermissionGranted();
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

      // Build payload with coordinates if available (for proximity-based event discovery)
      const payload: any = {
        locationState: location.state,
        locationCountry: location.country,
        source: location.source,
      };

      // Include coordinates for the 5-layer event discovery system
      if (location.coordinates) {
        payload.latitude = location.coordinates.latitude;
        payload.longitude = location.coordinates.longitude;
      }

      const response = await fetch(`${config.apiUrl}/user/location`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Location update failed:', response.status, errorText);
      } else {
        const result = await response.json();
        console.log('✅ Location updated on backend:', location.coordinates ? 'with coordinates' : 'without coordinates', result);
      }
    } catch (error) {
      console.error('❌ Error updating location:', error);
    }
  }

  private async loadLocationFromBackend(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Use select('*') to avoid referencing columns that may not exist
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        this.userLocation = {
          state: data.location_state || 'Unknown',
          country: data.location_country || 'Unknown',
          source: 'onboarding',
        };
        console.log('✅ Loaded location from Supabase:', this.userLocation);
      }
    } catch (error) {
      console.error('❌ Error loading location from backend:', error);
    }
  }

  // ===== LOCATION HEALTH CHECK =====

  /**
   * Check if user's location coordinates are stored on the backend.
   * Call this after location update to verify coordinates are persisted.
   */
  public async checkLocationHealth(): Promise<{ latitude: number | null; longitude: number | null; locationUpdatedAt: string | null } | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('⚠️ No session for location health check');
        return null;
      }

      const response = await fetch(`${config.apiUrl}/user/location/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📍 Location health check:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Location health check failed:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking location health:', error);
      return null;
    }
  }

  // ===== PREFERENCES MANAGEMENT =====

  /**
   * Convert DB row (snake_case) to TypeScript interface (camelCase)
   */
  private dbRowToPreferences(row: any): NotificationPreferences {
    return {
      notificationsEnabled: row.enabled ?? true,
      notificationStartHour: row.start_hour ?? 8,
      notificationEndHour: row.end_hour ?? 22,
      timezone: row.timezone ?? (Localization.getCalendars()[0]?.timeZone || 'UTC'),
      eventNotificationsEnabled: row.event_notifications_enabled ?? true,
      messageNotificationsEnabled: row.message_notifications_enabled ?? true,
      tipNotificationsEnabled: row.tip_notifications_enabled ?? true,
      collaborationNotificationsEnabled: row.collaboration_notifications_enabled ?? true,
      walletNotificationsEnabled: row.wallet_notifications_enabled ?? true,
      urgentGigNotificationsEnabled: row.urgent_gig_notifications_enabled ?? true,
      urgentGigActionButtonsEnabled: row.urgent_gig_action_buttons_enabled ?? true,
      commentsOnPosts: row.comments_on_posts ?? true,
      likesOnPosts: row.likes_on_posts ?? true,
      newFollowers: row.new_followers ?? true,
      contentSales: row.content_sales ?? true,
      preferredEventGenres: row.preferred_event_genres || row.preferred_event_categories || [],
      locationState: row.location_state || 'Unknown',
      locationCountry: row.location_country || 'Unknown',
      preferredNotificationTimes: row.preferred_notification_times?.length
        ? row.preferred_notification_times
        : ['any_time'],
      eventPlanningWindow: row.event_planning_window || 'any_time',
      activeEventMonths: row.active_event_months || [],
    };
  }

  /**
   * Build the mapping from preferences to DB columns.
   * Requires all columns from WEB_TEAM_NOTIFICATION_PREFERENCES_RECONCILIATION.md to exist.
   */
  private preferencesToDbRow(prefs: Partial<NotificationPreferences>): Record<string, any> {
    const row: Record<string, any> = {};
    if (prefs.notificationsEnabled !== undefined) row.enabled = prefs.notificationsEnabled;
    if (prefs.notificationStartHour !== undefined) row.start_hour = prefs.notificationStartHour;
    if (prefs.notificationEndHour !== undefined) row.end_hour = prefs.notificationEndHour;
    if (prefs.timezone !== undefined) row.timezone = prefs.timezone;
    if (prefs.eventNotificationsEnabled !== undefined) row.event_notifications_enabled = prefs.eventNotificationsEnabled;
    if (prefs.messageNotificationsEnabled !== undefined) row.message_notifications_enabled = prefs.messageNotificationsEnabled;
    if (prefs.tipNotificationsEnabled !== undefined) row.tip_notifications_enabled = prefs.tipNotificationsEnabled;
    if (prefs.collaborationNotificationsEnabled !== undefined) row.collaboration_notifications_enabled = prefs.collaborationNotificationsEnabled;
    if (prefs.walletNotificationsEnabled !== undefined) row.wallet_notifications_enabled = prefs.walletNotificationsEnabled;
    if (prefs.urgentGigNotificationsEnabled !== undefined) row.urgent_gig_notifications_enabled = prefs.urgentGigNotificationsEnabled;
    if (prefs.urgentGigActionButtonsEnabled !== undefined) row.urgent_gig_action_buttons_enabled = prefs.urgentGigActionButtonsEnabled;
    if (prefs.commentsOnPosts !== undefined) row.comments_on_posts = prefs.commentsOnPosts;
    if (prefs.likesOnPosts !== undefined) row.likes_on_posts = prefs.likesOnPosts;
    if (prefs.newFollowers !== undefined) row.new_followers = prefs.newFollowers;
    if (prefs.contentSales !== undefined) row.content_sales = prefs.contentSales;
    if (prefs.preferredEventGenres !== undefined) {
      row.preferred_event_genres = prefs.preferredEventGenres;
      row.preferred_event_categories = prefs.preferredEventGenres;
    }
    if (prefs.locationState !== undefined) row.location_state = prefs.locationState;
    if (prefs.locationCountry !== undefined) row.location_country = prefs.locationCountry;
    if (prefs.preferredNotificationTimes !== undefined) {
      row.preferred_notification_times = prefs.preferredNotificationTimes;
    }
    if (prefs.eventPlanningWindow !== undefined) row.event_planning_window = prefs.eventPlanningWindow;
    if (prefs.activeEventMonths !== undefined) row.active_event_months = prefs.activeEventMonths;
    row.updated_at = new Date().toISOString();
    return row;
  }

  private async loadPreferences(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        this.preferences = this.getDefaultPreferences();
        return;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Error loading notification preferences:', error.message);
        // Fall back to local cache
        const cached = await AsyncStorage.getItem('notificationPreferences');
        this.preferences = cached ? JSON.parse(cached) : this.getDefaultPreferences();
        return;
      }

      if (!data) {
        // No row yet — use defaults merged with any local cache
        console.log('ℹ️ No notification preferences row found, using defaults');
        const cached = await AsyncStorage.getItem('notificationPreferences');
        this.preferences = cached
          ? { ...this.getDefaultPreferences(), ...JSON.parse(cached) }
          : this.getDefaultPreferences();
      } else {
        this.preferences = this.dbRowToPreferences(data);
        console.log('✅ Preferences loaded from Supabase');
      }

      // Cache locally for offline access
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
      const cached = await AsyncStorage.getItem('notificationPreferences');
      this.preferences = cached ? JSON.parse(cached) : this.getDefaultPreferences();
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
      urgentGigNotificationsEnabled: true,
      urgentGigActionButtonsEnabled: true,
      commentsOnPosts: true,
      likesOnPosts: true,
      newFollowers: true,
      contentSales: true,
      preferredEventGenres: [],
      locationState: 'Unknown',
      locationCountry: 'Unknown',
      preferredNotificationTimes: ['any_time'],
      eventPlanningWindow: 'any_time',
      activeEventMonths: [],
    };
  }

  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const newPreferences = { ...this.preferences, ...updates } as NotificationPreferences;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        console.error('❌ Cannot update preferences: no authenticated user');
        return false;
      }

      const dbRow = this.preferencesToDbRow(newPreferences);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: user.id, ...dbRow },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ Failed to save preferences to Supabase:', error.message);
        console.warn('⚠️ Ensure the notification_preferences migration has been applied. See WEB_TEAM_NOTIFICATION_PREFERENCES_RECONCILIATION.md');
        // Save locally so user doesn't lose their changes
        this.preferences = newPreferences;
        await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
        return false;
      }

      // Update local state and cache
      this.preferences = newPreferences;
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));

      console.log('✅ Preferences saved to Supabase successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
      return false;
    }
  }

  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  async refreshPreferences(): Promise<NotificationPreferences | null> {
    await this.loadPreferences();
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

      const response = await fetch(`${config.apiUrl}/user/push-token`, {
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

      await fetch(`${config.apiUrl}/user/push-token`, {
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

      // Determine the deep link URL from various possible fields
      // Backend may send: url (top-level), data.deepLink, data.url, or we construct from type+id
      let deepLinkUrl = data.deepLink || data.url;

      // If no direct URL, construct from type and entity ID
      if (!deepLinkUrl) {
        if ((data.type === 'event' || data.type === 'event_reminder') && data.eventId) {
          deepLinkUrl = `soundbridge://event/${data.eventId}`;
        } else if (
          (data.type === 'track_approved' || data.type === 'track_featured' || data.type === 'moderation') &&
          data.trackId
        ) {
          deepLinkUrl = `soundbridge://track/${data.trackId}`;
        } else if (data.type === 'message' && data.conversationId) {
          deepLinkUrl = `soundbridge://messages/${data.conversationId}`;
        } else if (data.type === 'tip') {
          deepLinkUrl = `soundbridge://wallet/tips`;
        } else if (
          (data.type === 'collaboration_request' || data.type === 'collaboration_accepted' || data.type === 'collaboration_declined' || data.type === 'collaboration_confirmed') &&
          data.requestId
        ) {
          deepLinkUrl = `soundbridge://collaboration/requests/${data.requestId}`;
        } else if (data.type === 'withdrawal' && data.withdrawalId) {
          deepLinkUrl = `soundbridge://wallet/withdrawal/${data.withdrawalId}`;
        } else if (data.type === 'live_session' && data.sessionId) {
          deepLinkUrl = `soundbridge://live/${data.sessionId}`;
        // Urgent gig types — accept both camelCase (gigId) and snake_case (gig_id) from push payloads
        } else if ((data.type === 'urgent_gig' || data.type === 'gig_accepted' || data.type === 'gig_confirmed' || data.type === 'gig_starting_soon' || data.type === 'gig_expired') && (data.gigId || data.gig_id)) {
          deepLinkUrl = `soundbridge://gig/${data.gigId || data.gig_id}`;
        } else if (data.type === 'opportunity' && (data.opportunityId || data.opportunity_id)) {
          deepLinkUrl = `soundbridge://opportunity/${data.opportunityId || data.opportunity_id}`;
        } else if ((data.type === 'gig_payment' || data.type === 'gig_refund' || data.type === 'payout' || data.type === 'content_purchase') ) {
          deepLinkUrl = `soundbridge://wallet`;
        } else if (data.type === 'dispute_raised' && (data.projectId || data.project_id)) {
          deepLinkUrl = `soundbridge://project/${data.projectId || data.project_id}/dispute`;
        } else if (data.type === 'gig_rating_received') {
          deepLinkUrl = `soundbridge://profile`;
        } else if ((data.type === 'new_follower' || data.type === 'follow') && (data.followerId || data.entityId)) {
          deepLinkUrl = `soundbridge://follower/${data.followerId || data.entityId}`;
        } else if ((data.type === 'like' || data.type === 'reaction' || data.type === 'comment') && (data.postId || data.entityId)) {
          deepLinkUrl = `soundbridge://post/${data.postId || data.entityId}`;
        } else if (data.type === 'opportunity_interest' && (data.opportunityId || data.entityId)) {
          deepLinkUrl = `soundbridge://opportunity/${data.opportunityId || data.entityId}/interests`;
        } else if (data.type === 'opportunity_agreement_received' && (data.projectId || data.project_id)) {
          deepLinkUrl = `soundbridge://project/${data.projectId || data.project_id}`;
        } else if (data.type === 'subscription') {
          deepLinkUrl = `soundbridge://wallet`;
        } else if (data.type && data.entityId) {
          deepLinkUrl = this.generateDeepLink(data.type, data.entityId);
        }
      }

      console.log('🔗 Resolved deep link URL:', deepLinkUrl);

      // Store deep link data for navigation (with resolved URL)
      const dataWithUrl = { ...data, deepLink: deepLinkUrl };
      await AsyncStorage.setItem('pendingDeepLink', JSON.stringify(dataWithUrl));

      // PRIORITY 1: Use navigation callback if registered (most reliable for in-app navigation)
      if (this.navigationCallback) {
        console.log('🔗 Using navigation callback for immediate navigation');
        this.navigationCallback(dataWithUrl);
        return;
      }

      // PRIORITY 2: Try to open deep link via URL scheme
      if (deepLinkUrl) {
        const supported = await Linking.canOpenURL(deepLinkUrl);
        console.log('🔗 Deep link supported:', supported, 'URL:', deepLinkUrl);
        if (supported) {
          await Linking.openURL(deepLinkUrl);
        } else {
          console.log('⚠️ Deep link not supported, will handle via pendingDeepLink on next navigation ready');
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
        return `${baseUrl}collaboration/requests/${entityId}`;
      
      case 'track_approved':
      case 'track_featured':
      case 'moderation':
        return `${baseUrl}track/${entityId}`;

      case 'withdrawal':
        return `${baseUrl}wallet/withdrawal/${entityId}`;
      
      case 'creator_post':
        return `${baseUrl}creator/${entityId}`;
      
      case 'live_session':
        return `${baseUrl}live/${entityId}`;

      case 'urgent_gig':
      case 'gig_accepted':
      case 'gig_confirmed':
      case 'gig_starting_soon':
      case 'gig_expired':
        return `${baseUrl}gig/${entityId}`;

      case 'opportunity':
        return `${baseUrl}opportunity/${entityId}`;

      case 'dispute_raised':
        return `${baseUrl}project/${entityId}/dispute`;

      case 'gig_rating_received':
        return `${baseUrl}profile`;

      case 'new_follower':
      case 'follow':
        return `${baseUrl}follower/${entityId}`;

      case 'like':
      case 'reaction':
      case 'comment':
        return `${baseUrl}post/${entityId}`;

      case 'opportunity_interest':
        return `${baseUrl}opportunity/${entityId}/interests`;

      case 'opportunity_agreement_received':
        return `${baseUrl}project/${entityId}`;

      case 'gig_payment':
      case 'gig_refund':
      case 'payout':
      case 'content_purchase':
      case 'subscription':
        return `${baseUrl}wallet`;

      default:
        return baseUrl;
    }
  }

  // ===== NOTIFICATION STORAGE =====

  /**
   * Persist a notification to the Supabase notifications table
   * so it appears in the in-app Notifications screen and bell badge count.
   */
  private async persistNotificationToSupabase(notification: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Guard against unknown types — the DB notifications_type_check constraint only
      // allows values matching NotificationType. Unknown types (e.g. from new backend
      // notification kinds not yet in the union) fall back to 'system' so we never
      // hit a constraint violation.
      const ALLOWED_TYPES = new Set<string>([
        'event','tip','message','collaboration_request','collaboration_accepted',
        'collaboration_declined','collaboration_confirmed','event_reminder','withdrawal',
        'track_approved','track_featured','creator_post','live_session','moderation',
        'new_follower','follow','like','reaction','comment','content_purchase',
        'connection_request','connection_accepted','subscription','system','payout',
        'opportunity_interest','opportunity_agreement_received','urgent_gig','gig_accepted',
        'gig_confirmed','gig_starting_soon','gig_expired','gig_payment','gig_refund',
        'gig_rating_received','opportunity','dispute_raised','identity_verified','venue_match',
        'community_update',
      ]);
      const safeType = ALLOWED_TYPES.has(notification.type) ? notification.type : 'system';

      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: safeType,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        read: false,
      });

      if (error) {
        console.error('❌ Error persisting notification to Supabase:', error);
      } else {
        console.log('✅ Notification persisted to Supabase');
      }
    } catch (error) {
      console.error('❌ Error persisting notification to Supabase:', error);
    }
  }

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

      // Update Supabase notifications table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('id', notificationId);
      }

      // Update backend REST API
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${config.apiUrl}/user/notifications/${notificationId}/read`, {
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

      // Update Supabase notifications table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
      }

      // Update backend REST API
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${config.apiUrl}/user/notifications/read-all`, {
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
    if (type === 'urgent_gig' || type === 'gig_accepted' || type === 'gig_confirmed' || type === 'gig_starting_soon') return 'urgent_gigs';
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
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    if (this.tokenListener) {
      Notifications.removeNotificationSubscription(this.tokenListener);
      this.tokenListener = null;
    }
    // Reset so initialize() runs fully on next login
    this.hasInitialized = false;
    this.expoPushToken = null;
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

