/**
 * ContentPurchaseService
 * Handles purchasing paid audio content (tracks, albums, podcasts)
 */

import { Session } from '@supabase/supabase-js';
import type {
  ContentType,
  ContentPurchase,
  PurchaseContentRequest,
  PurchaseContentResponse,
  UserPurchasedContent,
  OwnershipCheck,
  SetPricingRequest,
  SalesAnalytics,
} from '../types/paid-content';
import { config } from '../config/environment';

const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');

class ContentPurchaseService {
  /**
   * Check if user owns content (purchased or is creator)
   */
  async checkOwnership(
    session: Session,
    contentId: string,
    contentType: ContentType
  ): Promise<OwnershipCheck> {
    try {
      // Try mobile-friendly alias endpoint first, fallback to original
      const endpoints = [
        `${API_BASE_URL}/api/purchases/check-ownership?content_id=${contentId}&content_type=${contentType}`,
        `${API_BASE_URL}/api/content/ownership?content_id=${contentId}&content_type=${contentType}`,
      ];

      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            return data.data || data as OwnershipCheck;
          }
        } catch (err) {
          lastError = err as Error;
        }
      }

      throw lastError || new Error('Failed to check ownership');
    } catch (error) {
      console.error('❌ Error checking content ownership:', error);
      throw error;
    }
  }

  /**
   * Purchase content
   */
  async purchaseContent(
    session: Session,
    request: PurchaseContentRequest
  ): Promise<PurchaseContentResponse> {
    try {
      console.log('💳 Purchasing content:', request);

      const response = await fetch(`${API_BASE_URL}/api/content/purchase`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Purchase failed');
      }

      const data = await response.json();
      console.log('✅ Purchase successful:', data);
      return data as PurchaseContentResponse;
    } catch (error) {
      console.error('❌ Error purchasing content:', error);
      throw error;
    }
  }

  /**
   * Get user's purchased content
   */
  async getUserPurchasedContent(
    session: Session
  ): Promise<UserPurchasedContent[]> {
    try {
      // Try mobile-friendly alias endpoint first, fallback to original
      const endpoints = [
        `${API_BASE_URL}/api/purchases/user`,
        `${API_BASE_URL}/api/user/purchased-content`,
      ];

      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            return this.normalizePurchasedContentList(data.data || data.purchases || []);
          }
        } catch (err) {
          lastError = err as Error;
        }
      }

      throw lastError || new Error('Failed to fetch purchased content');
    } catch (error) {
      console.error('❌ Error fetching purchased content:', error);
      throw error;
    }
  }

  /**
   * Download purchased content
   * Returns the secure download URL
   */
  async downloadContent(
    session: Session,
    contentId: string,
    contentType: ContentType
  ): Promise<string> {
    try {
      console.log(`📥 Requesting download for ${contentType}:`, contentId);

      const response = await fetch(
        `${API_BASE_URL}/api/content/${contentId}/download?content_type=${contentType}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const data = await response.json();
      console.log('✅ Download URL retrieved');
      return data.data.download_url as string;
    } catch (error) {
      console.error('❌ Error downloading content:', error);
      throw error;
    }
  }

  /**
   * Set/update track pricing (Creator only)
   */
  async setTrackPricing(
    session: Session,
    trackId: string,
    pricing: SetPricingRequest
  ): Promise<void> {
    try {
      console.log('💰 Setting track pricing:', trackId, pricing);

      const response = await fetch(
        `${API_BASE_URL}/api/audio-tracks/${trackId}/pricing`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pricing),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set pricing');
      }

      console.log('✅ Track pricing updated');
    } catch (error) {
      console.error('❌ Error setting track pricing:', error);
      throw error;
    }
  }

  /**
   * Set/update album pricing (Creator only)
   */
  async setAlbumPricing(
    session: Session,
    albumId: string,
    pricing: SetPricingRequest
  ): Promise<void> {
    try {
      console.log('💰 Setting album pricing:', albumId, pricing);

      const response = await fetch(
        `${API_BASE_URL}/api/albums/${albumId}/pricing`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pricing),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set pricing');
      }

      console.log('✅ Album pricing updated');
    } catch (error) {
      console.error('❌ Error setting album pricing:', error);
      throw error;
    }
  }

  /**
   * Set/update podcast pricing (Creator only)
   */
  async setPodcastPricing(
    session: Session,
    podcastId: string,
    pricing: SetPricingRequest
  ): Promise<void> {
    try {
      console.log('💰 Setting podcast pricing:', podcastId, pricing);

      const response = await fetch(
        `${API_BASE_URL}/api/podcasts/${podcastId}/pricing`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pricing),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set pricing');
      }

      console.log('✅ Podcast pricing updated');
    } catch (error) {
      console.error('❌ Error setting podcast pricing:', error);
      throw error;
    }
  }

  /**
   * Get creator sales analytics
   */
  async getSalesAnalytics(session: Session): Promise<SalesAnalytics> {
    try {
      // Try mobile-friendly alias endpoint first, fallback to original
      const endpoints = [
        `${API_BASE_URL}/api/sales/analytics`,
        `${API_BASE_URL}/api/creator/sales-analytics`,
      ];

      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            return this.normalizeSalesAnalytics(data.data || data);
          }
        } catch (err) {
          lastError = err as Error;
        }
      }

      throw lastError || new Error('Failed to fetch sales analytics');
    } catch (error) {
      console.error('❌ Error fetching sales analytics:', error);
      throw error;
    }
  }

  private normalizePurchasedContentList(items: any[]): UserPurchasedContent[] {
    return (items || []).map((item) => {
      const purchase = item.purchase || item;
      const content = item.content || item.track || item.audio_track || item.album || item.podcast || {};
      const contentType = purchase.content_type || item.content_type || content.content_type || content.type || 'track';
      const contentId = purchase.content_id || item.content_id || content.id || '';

      return {
        id: purchase.id || item.id || `${contentId}-${purchase.purchased_at || item.purchased_at || ''}`,
        content_id: contentId,
        content_type: contentType,
        price_paid: purchase.price_paid ?? item.price_paid ?? 0,
        currency: purchase.currency || item.currency || 'USD',
        purchased_at: purchase.purchased_at || item.purchased_at || '',
        download_count: purchase.download_count ?? item.download_count ?? 0,
        content,
        purchase: item.purchase ? purchase : undefined,
      };
    });
  }

  private normalizeSalesAnalytics(raw: any): SalesAnalytics {
    const primaryCurrency = raw.primary_currency || raw.currency || 'USD';
    const totalSales = raw.total_sales ?? raw.total_sales_count ?? 0;

    const salesByType = Array.isArray(raw.sales_by_type)
      ? raw.sales_by_type
      : [
          { content_type: 'track', count: raw.sales_by_type?.tracks ?? raw.sales_by_type?.track ?? 0 },
          { content_type: 'album', count: raw.sales_by_type?.albums ?? raw.sales_by_type?.album ?? 0 },
          { content_type: 'podcast', count: raw.sales_by_type?.podcasts ?? raw.sales_by_type?.podcast ?? 0 },
        ];

    const topSelling = (raw.top_selling_content || []).map((item: any) => ({
      content_id: item.content_id || item.id || '',
      content_type: item.content_type || item.type || 'track',
      content_title: item.content_title || item.title || '',
      sales_count: item.sales_count ?? item.count ?? 0,
      total_revenue: item.total_revenue ?? item.revenue ?? 0,
    }));

    const recentSales = (raw.recent_sales || []).map((sale: any) => ({
      purchase_id: sale.purchase_id || sale.id || '',
      content_title: sale.content_title || sale.title || '',
      amount: sale.amount ?? sale.price_paid ?? 0,
      currency: sale.currency || primaryCurrency,
      purchased_at: sale.purchased_at || sale.created_at || '',
      buyer_username: sale.buyer_username,
    }));

    return {
      primary_currency: primaryCurrency,
      total_revenue: raw.total_revenue ?? 0,
      revenue_this_month: raw.revenue_this_month ?? 0,
      total_sales: totalSales,
      sales_by_type: salesByType,
      top_selling_content: topSelling,
      recent_sales: recentSales,
    };
  }
}

export const contentPurchaseService = new ContentPurchaseService();
