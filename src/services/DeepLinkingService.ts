// src/services/DeepLinkingService.ts
// Deep linking service for handling navigation from notifications

import { Linking, Share } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, NotificationData } from './NotificationService';
import { supabase } from '../lib/supabase';

export interface DeepLinkData {
  screen: string;
  params?: Record<string, any>;
  tab?: string;
}

const DEFERRED_ARTIST_LINK_KEY = 'deferredArtistLink';

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

  private async processUrl(url: string) {
    try {
      const deepLinkData = await this.parseUrl(url);
      if (deepLinkData) {
        this.navigate(deepLinkData);
      }
    } catch (error) {
      console.error('❌ Error processing URL:', error);
    }
  }

  private async parseUrl(url: string): Promise<DeepLinkData | null> {
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

      // Handle @username profile links e.g. soundbridge.live/@asibe_cheta
      if (section.startsWith('@')) {
        const username = section.slice(1);
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
          if (data?.id) {
            return { screen: 'CreatorProfile', params: { creatorId: data.id } };
          }
        } catch (_) {}
        return { screen: 'Home' };
      }

      // Handle soundbridge.live/[username]/home universal links from fan landing page
      if (pathSegments.length === 2 && rest[0] === 'home') {
        const username = section;
        await this.saveDeferredArtistLink(username);
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
          if (data?.id) {
            return { screen: 'CreatorProfile', params: { creatorId: data.id, fromFanLanding: true } };
          }
        } catch (_) {}
        return { screen: 'Home' };
      }

      switch (section) {
        case 'collaboration':
          return this.parseCollaborationUrl(rest, urlObj.searchParams);

        case 'profile':
          return this.parseProfileUrl(rest, urlObj.searchParams);

        case 'track':
          return this.parseTrackUrl(rest, urlObj.searchParams);

        case 'album':
          return this.parseAlbumUrl(rest, urlObj.searchParams);

        case 'playlist':
          return this.parsePlaylistUrl(rest, urlObj.searchParams);

        case 'event':
          return this.parseEventUrl(rest, urlObj.searchParams);

        case 'post':
          return this.parsePostUrl(rest, urlObj.searchParams);

        case 'opportunity':
          return this.parseOpportunityUrl(rest, urlObj.searchParams);

        case 'messages':
          return this.parseMessagesUrl(rest, urlObj.searchParams);

        case 'wallet':
          return this.parseWalletUrl(rest, urlObj.searchParams);

        case 'live':
          return this.parseLiveSessionUrl(rest, urlObj.searchParams);

        case 'creator':
          return this.parseCreatorUrl(rest, urlObj.searchParams);

        case 'artist':
          return await this.parseArtistUrl(rest);

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

  private parseAlbumUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [albumId] = pathSegments;

    return {
      screen: 'AlbumDetails',
      params: { albumId }
    };
  }

  private parsePlaylistUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [playlistId] = pathSegments;

    return {
      screen: 'PlaylistDetails',
      params: { playlistId }
    };
  }

  private parseEventUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [eventId] = pathSegments;
    
    return {
      screen: 'EventDetails',
      params: { eventId }
    };
  }

  private parsePostUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [postId] = pathSegments;
    
    return {
      screen: 'Feed',
      params: { 
        postId,
        highlightPost: true 
      }
    };
  }

  private parseOpportunityUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [opportunityId] = pathSegments;

    return {
      screen: 'Network',
      params: {
        tab: 'opportunities',
        opportunityId
      }
    };
  }

  private parseMessagesUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [conversationIdOrUserId] = pathSegments;

    if (conversationIdOrUserId) {
      return {
        screen: 'Chat',
        params: {
          conversationId: conversationIdOrUserId,
          recipientId: searchParams.get('recipientId') || undefined,
        }
      };
    }

    return { screen: 'Messages' };
  }

  private parseWalletUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [section, id] = pathSegments;

    switch (section) {
      case 'tips':
        return {
          screen: 'Wallet',
          params: { tab: 'tips', tipId: id }
        };

      case 'withdrawal':
        return {
          screen: 'Wallet',
          params: { tab: 'withdrawals', withdrawalId: id }
        };

      case 'transactions':
        return {
          screen: 'Wallet',
          params: { tab: 'transactions' }
        };

      default:
        return { screen: 'Wallet' };
    }
  }

  private parseLiveSessionUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [sessionId] = pathSegments;

    if (sessionId) {
      return {
        screen: 'LiveSessionRoom',
        params: { sessionId }
      };
    }

    return { screen: 'LiveSessions' };
  }

  private parseCreatorUrl(pathSegments: string[], searchParams: URLSearchParams): DeepLinkData {
    const [creatorId] = pathSegments;

    return {
      screen: 'CreatorProfile',
      params: { creatorId }
    };
  }

  private async parseArtistUrl(pathSegments: string[]): Promise<DeepLinkData> {
    const [username] = pathSegments;
    if (!username) return { screen: 'Home' };

    // Store as deferred link so onboarding can pick it up if user isn't onboarded yet
    await this.saveDeferredArtistLink(username);

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
      if (data?.id) {
        return { screen: 'CreatorProfile', params: { creatorId: data.id, fromFanLanding: true } };
      }
    } catch (_) {}
    return { screen: 'Home' };
  }

  // ===== DEFERRED ARTIST LINK (fan landing page) =====

  async saveDeferredArtistLink(username: string): Promise<void> {
    try {
      await AsyncStorage.setItem(DEFERRED_ARTIST_LINK_KEY, username);
    } catch (_) {}
  }

  async consumeDeferredArtistLink(): Promise<string | null> {
    try {
      const username = await AsyncStorage.getItem(DEFERRED_ARTIST_LINK_KEY);
      if (username) {
        await AsyncStorage.removeItem(DEFERRED_ARTIST_LINK_KEY);
      }
      return username;
    } catch (_) {
      return null;
    }
  }

  // ===== NOTIFICATION DEEP LINKING =====

  handleNotificationDeepLink(data: NotificationData) {
    try {
      console.log('🔗 Handling notification deep link:', data);

      let deepLinkData: DeepLinkData;

      switch (data.type) {
        // ===== EVENT NOTIFICATIONS =====
        case 'event':
        case 'event_reminder':
        case 'event_2_weeks':
        case 'event_1_week':
        case 'event_24_hours':
        case 'event_day':
          deepLinkData = {
            screen: 'EventDetails',
            params: {
              eventId: data.eventId || data.entityId,
            }
          };
          break;

        // ===== MESSAGE NOTIFICATIONS =====
        case 'message':
          deepLinkData = {
            screen: 'Conversation',
            params: {
              recipientId: data.senderId,
              conversationId: data.conversationId,
            }
          };
          break;

        // ===== TIP NOTIFICATIONS =====
        case 'tip':
          deepLinkData = {
            screen: 'Wallet',
            params: {
              tab: 'tips',
              tipId: data.tipId || data.entityId,
            }
          };
          break;

        // ===== TRACK NOTIFICATIONS =====
        case 'track_approved':
        case 'track_featured':
        case 'moderation':
          deepLinkData = {
            screen: 'TrackDetails',
            params: {
              trackId: data.trackId || data.entityId,
            }
          };
          break;

        // ===== LIVE SESSION NOTIFICATIONS =====
        case 'live_session':
          deepLinkData = {
            screen: 'LiveSessionRoom',
            params: {
              sessionId: data.sessionId || data.entityId,
            }
          };
          break;

        // ===== WITHDRAWAL NOTIFICATIONS =====
        case 'withdrawal':
          deepLinkData = {
            screen: 'Wallet',
            params: {
              tab: 'withdrawals',
              withdrawalId: data.withdrawalId || data.entityId,
            }
          };
          break;

        // ===== COLLABORATION NOTIFICATIONS =====
        case 'collaboration_request':
        case 'collaboration.request.received':
          deepLinkData = {
            screen: 'CollaborationRequests',
            params: {
              tab: 'received',
              requestId: data.requestId || data.entityId,
              highlightRequest: true
            }
          };
          break;

        case 'collaboration_accepted':
        case 'collaboration_declined':
        case 'collaboration_confirmed':
        case 'collaboration.request.accepted':
        case 'collaboration.request.declined':
          deepLinkData = {
            screen: 'CollaborationRequests',
            params: {
              tab: 'sent',
              requestId: data.requestId || data.entityId,
              highlightRequest: true
            }
          };
          break;

        // ===== CREATOR POST NOTIFICATIONS =====
        case 'creator_post':
          if (data.entityId) {
            deepLinkData = {
              screen: 'Feed',
              params: {
                postId: data.entityId,
                highlightPost: true,
              },
            };
          } else {
            deepLinkData = { screen: 'Feed' };
          }
          break;

        // ===== CONNECTION REQUEST NOTIFICATIONS =====
        case 'connection_request':
          deepLinkData = {
            screen: 'Network',
            params: {
              tab: 'invitations',
            },
          };
          break;

        // ===== OPPORTUNITY NOTIFICATIONS =====
        case 'opportunity_interest':
          deepLinkData = {
            screen: 'OpportunityInterestList',
            params: {
              opportunityId: data.opportunityId || data.entityId,
              opportunityTitle: data.opportunityTitle || '',
            },
          };
          break;

        case 'opportunity_agreement_received':
          deepLinkData = {
            screen: 'OpportunityProject',
            params: {
              projectId: data.projectId || data.entityId,
            },
          };
          break;

        // ===== NUDGE NOTIFICATIONS =====
        case 'nudge':
          deepLinkData = {
            screen: (data as any).screen || 'Home',
            params: (data as any).screenParams,
          };
          break;

        default:
          console.log('⚠️ Unknown notification type:', data.type, '- navigating to Home');
          deepLinkData = { screen: 'Home' };
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

  generateMessageUrl(conversationId: string, recipientId?: string): string {
    const base = `soundbridge://messages/${conversationId}`;
    return recipientId ? `${base}?recipientId=${recipientId}` : base;
  }

  generateWalletUrl(section?: 'tips' | 'withdrawals' | 'transactions', id?: string): string {
    if (section && id) {
      return `soundbridge://wallet/${section}/${id}`;
    } else if (section) {
      return `soundbridge://wallet/${section}`;
    }
    return 'soundbridge://wallet';
  }

  generateLiveSessionUrl(sessionId: string): string {
    return `soundbridge://live/${sessionId}`;
  }

  generatePostLink(postId: string): string {
    return `https://soundbridge.live/post/${postId}`;
  }

  generateProfileLink(username: string): string {
    return `https://soundbridge.live/@${username}`;
  }

  generateArtistLandingLink(username: string): string {
    return `https://soundbridge.live/${username}/home`;
  }

  generateArtistDeepLink(username: string): string {
    return `soundbridge://artist/${username}`;
  }

  generateOpportunityLink(opportunityId: string): string {
    return `https://soundbridge.live/opportunity/${opportunityId}`;
  }

  generateTrackLink(trackId: string): string {
    return `https://soundbridge.live/track/${trackId}`;
  }

  generateAlbumLink(albumId: string): string {
    return `https://soundbridge.live/album/${albumId}`;
  }

  generatePlaylistLink(playlistId: string): string {
    return `https://soundbridge.live/playlist/${playlistId}`;
  }

  generateEventLink(eventId: string): string {
    return `https://soundbridge.live/event/${eventId}`;
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
      // Look up username so we can share the clean /@username URL
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', creatorId)
        .single();
      const link = data?.username
        ? this.generateProfileLink(data.username)
        : `https://soundbridge.live/profile/${creatorId}`;
      await Share.share({
        message: `Check out ${creatorName} on SoundBridge:\n${link}`,
      });
    } catch (error) {
      console.error('❌ Error sharing profile:', error);
    }
  }

  /**
   * Share post externally using React Native Share
   */
  async sharePost(postId: string, postTitle?: string): Promise<void> {
    const link = this.generatePostLink(postId);
    
    try {
      await Share.share({
        message: postTitle
          ? `Check out this post on SoundBridge: ${postTitle}\n${link}`
          : `Check out this post on SoundBridge:\n${link}`,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  }

  async shareTrack(trackId: string, title: string, artistName?: string): Promise<void> {
    const link = this.generateTrackLink(trackId);
    try {
      const byLine = artistName ? ` by ${artistName}` : '';
      await Share.share({
        message: `Check out "${title}"${byLine} on SoundBridge!\n${link}`,
      });
    } catch (error) {
      console.error('Error sharing track:', error);
    }
  }

  async shareEvent(eventId: string, title: string, venueName?: string): Promise<void> {
    const link = this.generateEventLink(eventId);
    try {
      const venueText = venueName ? ` at ${venueName}` : '';
      await Share.share({
        message: `Check out "${title}"${venueText} on SoundBridge!\n${link}`,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  }

  /**
   * Handle post deep link
   */
  async handlePostLink(postId: string): Promise<void> {
    try {
      this.navigate({
        screen: 'Feed',
        params: {
          postId,
          highlightPost: true,
        },
      });
    } catch (error) {
      console.error('Error handling post link:', error);
      this.navigate({ screen: 'Feed' });
    }
  }

  /**
   * Handle profile deep link by username
   */
  async handleProfileLink(username: string): Promise<void> {
    try {
      this.navigate({
        screen: 'Profile',
        params: { username },
      });
    } catch (error) {
      console.error('Error handling profile link:', error);
      this.navigate({ screen: 'Discover' });
    }
  }

  /**
   * Handle opportunity deep link
   */
  async handleOpportunityLink(opportunityId: string): Promise<void> {
    try {
      this.navigate({
        screen: 'Network',
        params: {
          tab: 'opportunities',
          opportunityId,
        },
      });
    } catch (error) {
      console.error('Error handling opportunity link:', error);
      this.navigate({
        screen: 'Network',
        params: { tab: 'opportunities' },
      });
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
