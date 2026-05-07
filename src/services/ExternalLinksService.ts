/**
 * External Links Service
 * Handles all API calls for external portfolio links feature
 * Integrates with web team's API endpoints
 */

import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import {
  ExternalLink,
  AddLinkRequest,
  UpdateLinkRequest,
  TrackClickRequest,
  ExternalLinksResponse,
  ExternalLinkResponse,
} from '../types/external-links';
import { config } from '../config/environment';

const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');

/**
 * Generate a session ID for tracking
 * This should be generated once per app session and reused
 */
let sessionId: string | null = null;

export function getOrCreateSessionId(): string {
  if (!sessionId) {
    sessionId = `mobile-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
  return sessionId;
}

/**
 * Get device type (mobile or tablet)
 */
function getDeviceType(): 'mobile' | 'tablet' {
  // Simple heuristic - can be enhanced with actual device detection
  return 'mobile';
}

/**
 * Get platform (ios or android)
 */
function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

class ExternalLinksService {
  /**
   * Fetch external links for a creator
   * @param userId - Creator's user ID
   * @returns Array of external links
   */
  async getExternalLinks(userId: string): Promise<ExternalLink[]> {
    try {
      console.log(`🔗 Fetching external links for user ${userId}...`);

      const response = await fetch(
        `${API_BASE_URL}/api/profile/external-links?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch external links: ${response.status}`);
      }

      const data: ExternalLinksResponse = await response.json();

      if (data.success) {
        console.log(`✅ Fetched ${data.data.links.length} external links`);
        return data.data.links;
      } else {
        throw new Error(data.error || 'Failed to fetch external links');
      }
    } catch (error) {
      console.error('❌ Error fetching external links:', error);
      throw error;
    }
  }

  /**
   * Add a new external link
   * Requires authentication
   * @param session - User session
   * @param request - Add link request data
   * @returns Created external link
   */
  async addExternalLink(
    session: Session,
    request: AddLinkRequest
  ): Promise<ExternalLink> {
    try {
      console.log(`🔗 Adding external link: ${request.platform_type}`);
      console.log(`📍 API URL: ${API_BASE_URL}/api/profile/external-links`);
      console.log(`🔑 Token length: ${session.access_token?.length || 0}`);
      console.log(`👤 User ID: ${session.user?.id}`);

      const response = await fetch(`${API_BASE_URL}/api/profile/external-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error response: ${errorText}`);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(
          errorData.error || errorData.message || `Failed to add external link: ${response.status}`
        );
      }

      const data: ExternalLinkResponse = await response.json();

      if (data.success) {
        console.log(`✅ External link added successfully: ${data.data.link.id}`);
        return data.data.link;
      } else {
        throw new Error(data.error || 'Failed to add external link');
      }
    } catch (error) {
      console.error('❌ Error adding external link:', error);
      throw error;
    }
  }

  /**
   * Update an existing external link
   * Requires authentication
   * @param session - User session
   * @param linkId - Link ID to update
   * @param request - Update link request data
   * @returns Updated external link
   */
  async updateExternalLink(
    session: Session,
    linkId: string,
    request: UpdateLinkRequest
  ): Promise<ExternalLink> {
    try {
      console.log(`🔗 Updating external link: ${linkId}`);

      const response = await fetch(
        `${API_BASE_URL}/api/profile/external-links/${linkId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update external link: ${response.status}`
        );
      }

      const data: ExternalLinkResponse = await response.json();

      if (data.success) {
        console.log(`✅ External link updated successfully`);
        return data.data.link;
      } else {
        throw new Error(data.error || 'Failed to update external link');
      }
    } catch (error) {
      console.error('❌ Error updating external link:', error);
      throw error;
    }
  }

  /**
   * Delete an external link
   * Requires authentication
   * @param session - User session
   * @param linkId - Link ID to delete
   */
  async deleteExternalLink(session: Session, linkId: string): Promise<void> {
    try {
      console.log(`🔗 Deleting external link: ${linkId}`);

      const response = await fetch(
        `${API_BASE_URL}/api/profile/external-links/${linkId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete external link: ${response.status}`
        );
      }

      console.log(`✅ External link deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting external link:', error);
      throw error;
    }
  }

  /**
   * Track a link click
   * Fire and forget - don't block user if tracking fails
   * @param linkId - Link ID that was clicked
   */
  async trackLinkClick(linkId: string): Promise<void> {
    try {
      const trackData: TrackClickRequest = {
        linkId,
        sessionId: getOrCreateSessionId(),
        deviceType: getDeviceType(),
        platform: getPlatform(),
      };

      console.log(`📊 Tracking click for link: ${linkId}`);

      // Fire and forget - don't await
      fetch(`${API_BASE_URL}/api/analytics/external-link-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackData),
      }).catch((error) => {
        // Don't throw - tracking failures shouldn't block user
        console.warn('⚠️ Failed to track click (non-blocking):', error);
      });
    } catch (error) {
      // Don't throw - tracking failures shouldn't block user
      console.warn('⚠️ Failed to track click (non-blocking):', error);
    }
  }

  /**
   * Get external links analytics for creator
   * Part of advanced analytics (Premium/Unlimited)
   * @param session - User session
   * @returns Analytics data
   */
  async getExternalLinksAnalytics(session: Session): Promise<{
    totalClicks: number;
    clicksThisMonth: number;
    topLinks: Array<{
      id: string;
      platform_type: string;
      url: string;
      click_count: number;
    }>;
  }> {
    try {
      console.log(`📊 Fetching external links analytics...`);

      const response = await fetch(
        `${API_BASE_URL}/api/analytics/advanced?period=30d`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();

      if (data.externalLinks) {
        console.log(`✅ Fetched external links analytics`);
        return data.externalLinks;
      } else {
        // Return empty data if not available
        return {
          totalClicks: 0,
          clicksThisMonth: 0,
          topLinks: [],
        };
      }
    } catch (error) {
      console.error('❌ Error fetching external links analytics:', error);
      throw error;
    }
  }
}

export const externalLinksService = new ExternalLinksService();
