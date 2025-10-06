// src/services/DeepLinkingService.ts
// Deep linking service for handling navigation from notifications

import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, NotificationData } from './NotificationService';

export interface DeepLinkData {
  screen: string;
  params?: Record<string, any>;
  tab?: string;
}

class DeepLinkingService {
  private navigationRef: NavigationContainerRef<any> | null = null;
  private isReady = false;
  private pendingUrl: string | null = null;

  // ===== INITIALIZATION =====

  initialize(navigationRef: NavigationContainerRef<any>) {
    this.navigationRef = navigationRef;
    console.log('🔗 Deep linking service initialized');

    // Handle initial URL (app opened from link)
    this.handleInitialUrl();

    // Listen for incoming URLs (app already running)
    const subscription = Linking.addEventListener('url', this.handleIncomingUrl.bind(this));

    return () => {
      subscription?.remove();
    };
  }

  setNavigationReady() {
    this.isReady = true;
    
    // Process any pending navigation
    if (this.pendingUrl) {
      this.processUrl(this.pendingUrl);
      this.pendingUrl = null;
    }

    // Check for pending notification deep links
    this.checkPendingNotificationDeepLink();
  }

  // ===== URL HANDLING =====

  private async handleInitialUrl() {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('🔗 Initial URL:', url);
        if (this.isReady) {
          this.processUrl(url);
        } else {
          this.pendingUrl = url;
        }
      }
    } catch (error) {
      console.error('❌ Error handling initial URL:', error);
    }
  }

  private handleIncomingUrl(event: { url: string }) {
    console.log('🔗 Incoming URL:', event.url);
    if (this.isReady) {
      this.processUrl(event.url);
    } else {
      this.pendingUrl = event.url;
    }
  }

  private async checkPendingNotificationDeepLink() {
    try {
      const pendingData = await notificationService.getPendingDeepLink();
      if (pendingData) {
        console.log('🔗 Processing pending notification deep link:', pendingData);
        this.handleNotificationDeepLink(pendingData);
      }
    } catch (error) {
      console.error('❌ Error checking pending notification deep link:', error);
    }
  }

  // ===== URL PROCESSING =====

  private processUrl(url: string) {
    try {
      const deepLinkData = this.parseUrl(url);
      if (deepLinkData) {
        this.navigate(deepLinkData);
      }
    } catch (error) {
      console.error('❌ Error processing URL:', error);
    }
  }

  private parseUrl(url: string): DeepLinkData | null {
    try {
      // Handle different URL schemes
      // soundbridge://collaboration/requests/123
      // https://soundbridge.app/collaboration/requests/123
      
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length === 0) {
        return { screen: 'Home' };
      }

      const [section, ...rest] = pathSegments;

      switch (section) {
        case 'collaboration':
          return this.parseCollaborationUrl(rest, urlObj.searchParams);
        
        case 'profile':
          return this.parseProfileUrl(rest, urlObj.searchParams);
        
        case 'track':
          return this.parseTrackUrl(rest, urlObj.searchParams);
        
        case 'event':
          return this.parseEventUrl(rest, urlObj.searchParams);
        
        default:
          console.log('⚠️ Unknown deep link section:', section);
          return { screen: 'Home' };
      }
    } catch (error) {
      console.error('❌ Error parsing URL:', error);
      return null;
    }
  }

  private parseCollaborationUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [action, id] = pathSegments;

    switch (action) {
      case 'requests':
        if (id) {
          // Navigate to specific request
          return {
            screen: 'CollaborationRequests',
            params: { requestId: id, tab: 'received' }
          };
        } else {
          // Navigate to requests inbox
          return {
            screen: 'CollaborationRequests',
            params: { tab: searchParams.get('tab') || 'received' }
          };
        }

      case 'calendar':
        return {
          screen: 'AvailabilityCalendar',
          params: { creatorId: id }
        };

      case 'request':
        // Navigate to send request form
        return {
          screen: 'CreatorProfile',
          params: { 
            creatorId: id,
            showCollabModal: true,
            availabilitySlotId: searchParams.get('slotId')
          }
        };

      default:
        return { screen: 'CollaborationRequests' };
    }
  }

  private parseProfileUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [creatorId] = pathSegments;
    
    return {
      screen: 'CreatorProfile',
      params: { 
        creatorId,
        showCollabModal: searchParams.get('collab') === 'true'
      }
    };
  }

  private parseTrackUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [trackId] = pathSegments;
    
    return {
      screen: 'TrackDetails',
      params: { trackId }
    };
  }

  private parseEventUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [eventId] = pathSegments;
    
    return {
      screen: 'EventDetails',
      params: { eventId }
    };
  }

  // ===== NOTIFICATION DEEP LINKING =====

  handleNotificationDeepLink(data: NotificationData) {
    try {
      console.log('🔗 Handling notification deep link:', data);

      let deepLinkData: DeepLinkData;

      switch (data.type) {
        case 'collaboration.request.received':
          deepLinkData = {
            screen: 'CollaborationRequests',
            params: { 
              tab: 'received',
              requestId: data.requestId,
              highlightRequest: true
            }
          };
          break;

        case 'collaboration.request.accepted':
        case 'collaboration.request.declined':
          deepLinkData = {
            screen: 'CollaborationRequests',
            params: { 
              tab: 'sent',
              requestId: data.requestId,
              highlightRequest: true
            }
          };
          break;

        default:
          console.log('⚠️ Unknown notification type:', data.type);
          deepLinkData = { screen: 'CollaborationRequests' };
      }

      this.navigate(deepLinkData);
    } catch (error) {
      console.error('❌ Error handling notification deep link:', error);
    }
  }

  // ===== NAVIGATION =====

  private navigate(deepLinkData: DeepLinkData) {
    if (!this.navigationRef || !this.isReady) {
      console.log('⚠️ Navigation not ready, storing deep link for later');
      this.storePendingNavigation(deepLinkData);
      return;
    }

    try {
      console.log('🔗 Navigating to:', deepLinkData);

      // Handle tab navigation first if needed
      if (deepLinkData.tab) {
        this.navigationRef.navigate('MainTabs', { 
          screen: deepLinkData.tab,
          initial: false 
        });
      }

      // Navigate to the specific screen
      this.navigationRef.navigate(deepLinkData.screen as never, deepLinkData.params as never);

      // Mark notification as read if it was from a notification
      if (deepLinkData.params?.requestId) {
        notificationService.markNotificationAsRead(deepLinkData.params.requestId);
        notificationService.updateBadgeCount();
      }
    } catch (error) {
      console.error('❌ Error navigating:', error);
    }
  }

  private async storePendingNavigation(deepLinkData: DeepLinkData) {
    try {
      await AsyncStorage.setItem('pendingNavigation', JSON.stringify(deepLinkData));
    } catch (error) {
      console.error('❌ Error storing pending navigation:', error);
    }
  }

  async processPendingNavigation() {
    try {
      const stored = await AsyncStorage.getItem('pendingNavigation');
      if (stored) {
        const deepLinkData = JSON.parse(stored);
        await AsyncStorage.removeItem('pendingNavigation');
        this.navigate(deepLinkData);
      }
    } catch (error) {
      console.error('❌ Error processing pending navigation:', error);
    }
  }

  // ===== URL GENERATION =====

  generateCollaborationRequestUrl(requestId: string): string {
    return `soundbridge://collaboration/requests/${requestId}`;
  }

  generateCollaborationCalendarUrl(creatorId: string): string {
    return `soundbridge://collaboration/calendar/${creatorId}`;
  }

  generateProfileUrl(creatorId: string, showCollab = false): string {
    const baseUrl = `soundbridge://profile/${creatorId}`;
    return showCollab ? `${baseUrl}?collab=true` : baseUrl;
  }

  generateTrackUrl(trackId: string): string {
    return `soundbridge://track/${trackId}`;
  }

  generateEventUrl(eventId: string): string {
    return `soundbridge://event/${eventId}`;
  }

  // ===== SHARING =====

  async shareCollaborationRequest(requestId: string, subject: string): Promise<void> {
    try {
      const url = this.generateCollaborationRequestUrl(requestId);
      const message = `Check out this collaboration request: "${subject}"`;
      
      await Linking.openURL(`https://soundbridge.app/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error('❌ Error sharing collaboration request:', error);
    }
  }

  async shareProfile(creatorId: string, creatorName: string): Promise<void> {
    try {
      const url = this.generateProfileUrl(creatorId);
      const message = `Check out ${creatorName}'s profile on SoundBridge`;
      
      await Linking.openURL(`https://soundbridge.app/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error('❌ Error sharing profile:', error);
    }
  }

  // ===== UTILITY =====

  canOpenUrl(url: string): Promise<boolean> {
    return Linking.canOpenURL(url);
  }

  openExternalUrl(url: string): Promise<void> {
    return Linking.openURL(url);
  }

  // ===== GETTERS =====

  get isNavigationReady(): boolean {
    return this.isReady && this.navigationRef !== null;
  }
}

// Export singleton instance
export const deepLinkingService = new DeepLinkingService();
