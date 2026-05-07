/**
 * Type definitions for Paid Audio Content feature
 * Enables creators to sell tracks, albums, and podcasts
 */

export type ContentType = 'track' | 'album' | 'podcast';

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Content purchase record
 * Tracks user purchases of paid content
 */
export interface ContentPurchase {
  id: string;
  user_id: string;
  content_id: string;
  content_type: ContentType;
  price_paid: number;
  currency: string;
  platform_fee: number;        // 10% of price
  creator_earnings: number;     // 90% of price
  transaction_id: string;       // Stripe transaction reference
  status: PurchaseStatus;
  purchased_at: string;
  download_count: number;
}

/**
 * Priced track interface extending the base AudioTrack
 */
export interface PricedTrack {
  id: string;
  title: string;
  creator_id: string;
  is_paid: boolean;
  price?: number | null;
  currency?: string | null;
  total_sales_count?: number;
  total_revenue?: number;
  // All other audio_track fields...
  [key: string]: any;
}

/**
 * Request to set/update track pricing
 */
export interface SetPricingRequest {
  is_paid: boolean;
  price?: number;
  currency?: string;
}

/**
 * Purchase request
 */
export interface PurchaseContentRequest {
  content_id: string;
  content_type: ContentType;
  payment_method_id: string;  // Stripe payment method ID
}

/**
 * Purchase response
 */
export interface PurchaseContentResponse {
  success: boolean;
  purchase: ContentPurchase;
  message: string;
}

/**
 * User's purchased content
 */
export interface UserPurchasedContent {
  id: string;
  content_id: string;
  content_type: ContentType;
  price_paid: number;
  currency: string;
  purchased_at: string;
  download_count: number;
  content: PricedTrack;  // Full track details
  purchase?: ContentPurchase;
}

/**
 * Sales analytics for creators
 */
export interface SalesAnalytics {
  primary_currency: string;
  total_revenue: number;
  revenue_this_month: number;
  total_sales: number;
  sales_by_type: Array<{
    content_type: ContentType;
    count: number;
  }>;
  top_selling_content: Array<{
    content_id: string;
    content_type: ContentType;
    content_title: string;
    sales_count: number;
    total_revenue: number;
  }>;
  recent_sales: Array<{
    purchase_id: string;
    content_title: string;
    amount: number;
    currency: string;
    purchased_at: string;
    buyer_username?: string;
  }>;
}

/**
 * Check if user owns content
 */
export interface OwnershipCheck {
  owns: boolean;
  is_creator: boolean;
  purchase?: ContentPurchase;
}
