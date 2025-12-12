import { Session } from '@supabase/supabase-js';

const API_BASE_URL = __DEV__ ? 'http://192.168.1.122:3000' : 'https://soundbridge.live';

export interface SubscriptionStatus {
  tier: 'free' | 'premium' | 'unlimited';
  status: 'active' | 'cancelled' | 'past_due' | 'expired' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  stripe_subscription_id?: string;
  subscription_start_date?: string; // For 7-day guarantee calculation
  subscription_renewal_date?: string;
  subscription_ends_at?: string;
  money_back_guarantee_eligible?: boolean;
  money_back_guarantee_end_date?: string;
  refund_count?: number;
  features?: {
    unlimitedUploads: boolean;
    unlimitedSearches: boolean;
    unlimitedMessages: boolean;
    advancedAnalytics: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    revenueSharing: boolean;
    whiteLabel: boolean;
  };
  limits?: {
    uploads: {
      used: number;
      limit: number;
      remaining: number;
      is_unlimited: boolean;
      period: 'monthly' | 'lifetime';
    };
    searches: {
      used: number;
      limit: number;
      remaining: number;
      is_unlimited: boolean;
    };
    messages: {
      used: number;
      limit: number;
      remaining: number;
      is_unlimited: boolean;
    };
  };
  moneyBackGuarantee?: {
    eligible: boolean;
    withinWindow: boolean;
    daysRemaining: number;
  };
}

export interface UsageStatistics {
  uploads_used: number;
  uploads_limit: number;
  storage_used: number; // in MB
  storage_limit: number; // in MB
  bandwidth_used: number; // in MB
  bandwidth_limit: number; // in MB
  period_start: string;
  period_end: string;
  music_uploads?: number;
  podcast_uploads?: number;
  event_uploads?: number;
  total_storage_used?: number; // in bytes
  total_plays?: number;
  total_followers?: number;
  last_upload_at?: string;
  formatted_storage?: string;
  formatted_plays?: string;
  formatted_followers?: string;
}

export interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoice_url?: string;
  payment_method?: string;
}

export interface UsageLimits {
  uploads: {
    used: number;
    limit: number;
    remaining: number;
    is_unlimited: boolean;
    period: 'monthly' | 'lifetime';
  };
  messages: {
    used: number;
    limit: number;
    remaining: number;
    is_unlimited: boolean;
  };
  searches: {
    used: number;
    limit: number;
    remaining: number;
    is_unlimited: boolean;
  };
  storage: {
    used: number; // in bytes
    limit: number; // in bytes
    remaining: number; // in bytes
    is_unlimited: boolean;
  };
}

export interface RevenueData {
  total_earnings: number;
  pending_earnings: number;
  last_payout: number;
  last_payout_date: string;
  next_payout_date: string;
  currency: string;
  total_tips: number;
  total_subscriptions: number;
  total_purchases: number;
}

class SubscriptionService {
  private getAuthHeaders(session: Session) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'x-authorization': session.access_token,
      'x-auth-token': session.access_token,
      'x-supabase-token': session.access_token,
    };
  }

  private async makeRequest(url: string, session: Session, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(session),
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        if (response.status === 404) {
          throw new Error('Service not found. Please try again later.');
        }
        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * Get user's current subscription status
   * Updated to use new endpoint: /api/subscription/status
   * Response structure: { success: true, data: { subscription: {...}, usage: {...}, limits: {...}, features: {...} } }
   */
  async getSubscriptionStatus(session: Session): Promise<SubscriptionStatus> {
    try {
      console.log('📊 Fetching subscription status...');
      const response = await this.makeRequest('/api/subscription/status', session);
      console.log('✅ Subscription status response:', response);
      
      // Defensive: Use optional chaining - subscription might be null for free users
      const data = response?.data || {};
      const subscription = data?.subscription || null;
      
      // If no subscription, return free tier default
      if (!subscription) {
        console.log('ℹ️ No subscription found, returning free tier');
        return {
          tier: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: false,
          amount: 0,
          currency: 'GBP',
          billing_cycle: 'monthly',
        };
      }
      
      // Transform API response to match our interface
      return {
        tier: subscription.tier || 'free',
        status: subscription.status || 'active',
        current_period_start: subscription.subscription_start_date || subscription.current_period_start || new Date().toISOString(),
        current_period_end: subscription.subscription_renewal_date || subscription.subscription_ends_at || subscription.current_period_end || new Date().toISOString(),
        subscription_ends_at: subscription.subscription_ends_at,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        amount: subscription.amount || 0,
        currency: subscription.currency || 'GBP',
        billing_cycle: subscription.billing_cycle || 'monthly',
        stripe_subscription_id: subscription.stripe_subscription_id,
        subscription_start_date: subscription.subscription_start_date,
        subscription_renewal_date: subscription.subscription_renewal_date,
        money_back_guarantee_eligible: subscription.money_back_guarantee_eligible,
        money_back_guarantee_end_date: subscription.money_back_guarantee_end_date,
        refund_count: subscription.refund_count,
        features: data.features,
        limits: data.limits,
        moneyBackGuarantee: data.moneyBackGuarantee,
      };
    } catch (error) {
      console.error('❌ Error fetching subscription status:', error);
      throw error;
    }
  }

  /**
   * Get user's usage limits (uploads, messages, searches, storage)
   * Endpoint: GET /api/user/usage-limits
   * Response structure: { success: true, data: { uploads: {...}, messages: {...}, searches: {...}, storage: {...} } }
   */
  async getUsageLimits(session: Session): Promise<UsageLimits> {
    try {
      console.log('📊 Fetching usage limits...');
      const response = await this.makeRequest('/api/user/usage-limits', session);
      console.log('✅ Usage limits response:', response);

      const data = response?.data || {};

      return {
        uploads: {
          used: data.uploads?.used || 0,
          limit: data.uploads?.limit || 0,
          remaining: data.uploads?.remaining || 0,
          is_unlimited: data.uploads?.is_unlimited || false,
          period: data.uploads?.period || 'monthly',
        },
        messages: {
          used: data.messages?.used || 0,
          limit: data.messages?.limit || 0,
          remaining: data.messages?.remaining || 0,
          is_unlimited: data.messages?.is_unlimited || false,
        },
        searches: {
          used: data.searches?.used || 0,
          limit: data.searches?.limit || 0,
          remaining: data.searches?.remaining || 0,
          is_unlimited: data.searches?.is_unlimited || false,
        },
        storage: {
          used: data.storage?.used || 0,
          limit: data.storage?.limit || 0,
          remaining: data.storage?.remaining || 0,
          is_unlimited: data.storage?.is_unlimited || false,
        },
      };
    } catch (error) {
      console.error('❌ Error fetching usage limits:', error);
      throw error;
    }
  }

  /**
   * Check if user can send a message (based on tier limits)
   * Returns { canSend: boolean, reason?: string, usageLimits?: UsageLimits }
   */
  async canSendMessage(session: Session): Promise<{ canSend: boolean; reason?: string; usageLimits?: UsageLimits }> {
    try {
      const limits = await this.getUsageLimits(session);

      // Premium/Unlimited users have unlimited messages
      if (limits.messages.is_unlimited) {
        return { canSend: true, usageLimits: limits };
      }

      // Free users: Check if they have messages remaining
      if (limits.messages.remaining > 0) {
        return { canSend: true, usageLimits: limits };
      }

      return {
        canSend: false,
        reason: `You've reached your message limit (${limits.messages.limit} per month). Upgrade to Premium for unlimited messaging.`,
        usageLimits: limits,
      };
    } catch (error) {
      console.error('❌ Error checking message limits:', error);
      // On error, allow sending (fail open)
      return { canSend: true };
    }
  }

  /**
   * Check if user can perform a professional search (based on tier limits)
   * Note: Backend enforces this automatically with 429 errors
   * Returns { canSearch: boolean, reason?: string, usageLimits?: UsageLimits }
   */
  async canPerformSearch(session: Session): Promise<{ canSearch: boolean; reason?: string; usageLimits?: UsageLimits }> {
    try {
      const limits = await this.getUsageLimits(session);

      // Premium/Unlimited users have unlimited searches
      if (limits.searches.is_unlimited) {
        return { canSearch: true, usageLimits: limits };
      }

      // Free users: Check if they have searches remaining
      if (limits.searches.remaining > 0) {
        return { canSearch: true, usageLimits: limits };
      }

      return {
        canSearch: false,
        reason: `You've reached your search limit (${limits.searches.limit} per month). Upgrade to Premium for unlimited searches.`,
        usageLimits: limits,
      };
    } catch (error) {
      console.error('❌ Error checking search limits:', error);
      // On error, allow searching (fail open)
      return { canSearch: true };
    }
  }

  /**
   * Get user's usage statistics
   * Updated to handle new response structure from /api/subscription/status
   * Usage data is now included in subscription status response
   */
  async getUsageStatistics(session: Session): Promise<UsageStatistics> {
    try {
      console.log('📈 Fetching usage statistics...');
      
      // Try to get usage from subscription status first (new structure)
      try {
        const subscriptionStatus = await this.getSubscriptionStatus(session);
        if (subscriptionStatus.limits) {
          const limits = subscriptionStatus.limits;
          const usage = subscriptionStatus.limits.uploads;
          
          return {
            uploads_used: usage.used || 0,
            uploads_limit: usage.limit || 0,
            storage_used: 0, // Will be populated from usage endpoint if needed
            storage_limit: 0,
            bandwidth_used: 0,
            bandwidth_limit: 0,
            period_start: new Date().toISOString(),
            period_end: subscriptionStatus.current_period_end || new Date().toISOString(),
          };
        }
      } catch (e) {
        console.log('⚠️ Could not get usage from subscription status, trying dedicated endpoint');
      }
      
      // Fallback to dedicated usage endpoint
      const data = await this.makeRequest('/api/user/usage-statistics', session);
      console.log('✅ Usage statistics loaded:', data);
      
      // Handle both old and new response structures
      const usage = data?.usage || data;
      
      return {
        uploads_used: usage?.uploads?.used || usage?.uploads_used || 0,
        uploads_limit: usage?.uploads?.limit || usage?.uploads_limit || 0, // -1 for unlimited
        storage_used: usage?.storage?.used || usage?.storage_used || 0,
        storage_limit: usage?.storage?.limit || usage?.storage_limit || 0,
        bandwidth_used: usage?.bandwidth?.used || usage?.bandwidth_used || 0,
        bandwidth_limit: usage?.bandwidth?.limit || usage?.bandwidth_limit || 0,
        period_start: usage?.period_start || data?.lastUpdated || new Date().toISOString(),
        period_end: usage?.period_end || data?.lastUpdated || new Date().toISOString(),
        music_uploads: usage?.music_uploads,
        podcast_uploads: usage?.podcast_uploads,
        event_uploads: usage?.event_uploads,
        total_storage_used: usage?.total_storage_used,
        total_plays: usage?.total_plays,
        total_followers: usage?.total_followers,
        last_upload_at: usage?.last_upload_at,
        formatted_storage: usage?.formatted_storage,
        formatted_plays: usage?.formatted_plays,
        formatted_followers: usage?.formatted_followers,
      };
    } catch (error) {
      console.error('❌ Error fetching usage statistics:', error);
      throw error;
    }
  }

  /**
   * Get revenue data for creators
   */
  async getRevenueData(session: Session): Promise<RevenueData> {
    try {
      console.log('💰 Fetching revenue data...');
      const data = await this.makeRequest('/api/revenue/summary', session);
      console.log('✅ Revenue data loaded:', data);
      
      return {
        total_earnings: data.revenue.totalEarnings,
        pending_earnings: data.revenue.pendingEarnings,
        last_payout: data.revenue.lastPayout?.amount || 0,
        last_payout_date: data.revenue.lastPayout?.date || '',
        next_payout_date: data.revenue.nextPayout?.date || '',
        currency: data.revenue.currency,
        total_tips: data.revenue.totalTips || 0,
        total_subscriptions: data.revenue.totalSubscriptions || 0,
        total_purchases: data.revenue.totalPurchases || 0,
      };
    } catch (error) {
      console.error('❌ Error fetching revenue data:', error);
      throw error;
    }
  }

  /**
   * Request a payout
   */
  async requestPayout(session: Session, amount?: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('💸 Requesting payout...');
      const data = await this.makeRequest('/api/revenue/request-payout', session, {
        method: 'POST',
        body: JSON.stringify({ 
          amount,
          notes: 'Mobile app payout request' 
        }),
      });
      console.log('✅ Payout requested:', data);
      return { success: data.success, message: data.message || 'Payout requested successfully' };
    } catch (error) {
      console.error('❌ Error requesting payout:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(session: Session): Promise<{ success: boolean; message: string }> {
    try {
      console.log('❌ Cancelling subscription...');
      const data = await this.makeRequest('/api/user/cancel-subscription', session, {
        method: 'POST',
      });
      console.log('✅ Subscription cancelled:', data);
      return data;
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Safe version of getSubscriptionStatus that returns null on error
   */
  async getSubscriptionStatusSafe(session: Session): Promise<SubscriptionStatus | null> {
    try {
      return await this.getSubscriptionStatus(session);
    } catch (error) {
      console.warn('⚠️ Failed to load subscription status, using fallback');
      return null;
    }
  }

  /**
   * Safe version of getUsageStatistics that returns null on error
   */
  async getUsageStatisticsSafe(session: Session): Promise<UsageStatistics | null> {
    try {
      return await this.getUsageStatistics(session);
    } catch (error) {
      console.warn('⚠️ Failed to load usage statistics, using fallback');
      return null;
    }
  }

  /**
   * Safe version of getBillingHistory that returns empty array on error
   */
  async getBillingHistorySafe(session: Session, limit: number = 10): Promise<BillingHistoryItem[]> {
    try {
      return await this.getBillingHistory(session, limit);
    } catch (error) {
      console.warn('⚠️ Failed to load billing history, using fallback');
      return [];
    }
  }

  /**
   * Safe version of getRevenueData that returns null on error
   */
  async getRevenueDataSafe(session: Session): Promise<RevenueData | null> {
    try {
      return await this.getRevenueData(session);
    } catch (error) {
      console.warn('⚠️ Failed to load revenue data, using fallback');
      return null;
    }
  }

  /**
   * Format subscription tier for display
   */
  formatTier(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'free': return 'Free Plan';
      case 'premium': return 'Premium';
      case 'unlimited': return 'Unlimited';
      // Legacy support
      case 'pro': return 'Premium';
      case 'enterprise': return 'Unlimited';
      default: return 'Unknown Plan';
    }
  }

  /**
   * Format subscription status for display
   */
  formatStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'Active';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      case 'past_due': return 'Past Due';
      case 'trialing': return 'Trial';
      case 'incomplete': return 'Incomplete';
      default: return 'Unknown';
    }
  }

  /**
   * Check if user has Premium access
   * IMPORTANT: Premium access requires both tier === 'premium' AND status === 'active'
   */
  hasPremiumAccess(subscription: SubscriptionStatus | null): boolean {
    if (!subscription) return false;
    return subscription.tier === 'premium' && subscription.status === 'active';
  }

  /**
   * Check if user has Unlimited access
   * IMPORTANT: Unlimited access requires both tier === 'unlimited' AND status === 'active'
   */
  hasUnlimitedAccess(subscription: SubscriptionStatus | null): boolean {
    if (!subscription) return false;
    return subscription.tier === 'unlimited' && subscription.status === 'active';
  }

  /**
   * Check if user has any paid tier (Premium or Unlimited)
   */
  hasPaidAccess(subscription: SubscriptionStatus | null): boolean {
    if (!subscription) return false;
    return (subscription.tier === 'premium' || subscription.tier === 'unlimited') && subscription.status === 'active';
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use hasPremiumAccess() or hasPaidAccess() instead
   */
  hasProAccess(subscription: SubscriptionStatus | null): boolean {
    return this.hasPaidAccess(subscription);
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return '#10B981'; // Green
      case 'trialing': return '#3B82F6'; // Blue
      case 'cancelled': return '#6B7280'; // Gray
      case 'expired': return '#6B7280'; // Gray
      case 'past_due': return '#F59E0B'; // Yellow/Orange
      case 'incomplete': return '#EF4444'; // Red
      default: return '#6B7280';
    }
  }

  /**
   * Format storage size
   */
  formatStorage(sizeInMB: number): string {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB} MB`;
  }

  /**
   * Calculate usage percentage
   */
  calculateUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  }

  /**
   * Format usage limit (handle unlimited)
   */
  formatUsageLimit(limit: number): string {
    if (limit === -1) return 'Unlimited';
    return limit.toString();
  }

  /**
   * Get plan pricing information
   */
  getPlanPrice(plan: string, billingCycle: string): string {
    switch (plan.toLowerCase()) {
      case 'premium':
        return billingCycle === 'yearly' ? '£69.99/year' : '£6.99/month';
      case 'unlimited':
        return billingCycle === 'yearly' ? '£129.99/year' : '£12.99/month';
      // Legacy support
      case 'pro':
        return billingCycle === 'yearly' ? '£69.99/year' : '£6.99/month';
      default:
        return '£0.00';
    }
  }

  /**
   * Get plan features
   */
  getPlanFeatures(plan: string): string[] {
    switch (plan.toLowerCase()) {
      case 'premium':
        return [
          '7 uploads per month (resets on renewal)',
          'Pro badge on profile',
          'Custom profile URL',
          'Featured on Discover 1x/month',
          'Advanced analytics',
          'Priority in feed',
          '60-second audio previews',
          'AI collaboration matching',
          'Priority support'
        ];
      case 'unlimited':
        return [
          'UNLIMITED track uploads',
          'Unlimited badge on profile',
          'Featured on Discover 2x/month',
          'Top priority in feed',
          'All Premium features',
          'Social media post generator',
          'Custom promo codes',
          'Email list export',
          'Highest priority support'
        ];
      // Legacy support
      case 'pro':
        return this.getPlanFeatures('premium');
      case 'enterprise':
        return this.getPlanFeatures('unlimited');
      default:
        return [
          '3 track uploads (lifetime)',
          'Basic profile & networking',
          'Receive tips (keep 95%)',
          'Create & sell event tickets',
          'Basic analytics',
          'Community support'
        ];
    }
  }

  /**
   * Extract price amount from price string (e.g., "$9.99/month" -> 9.99)
   */
  private extractPriceAmount(priceString: string): number {
    const match = priceString.match(/\$?(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Extract currency from price string (e.g., "$9.99/month" -> "USD")
   */
  private extractPriceCurrency(priceString: string): string {
    if (priceString.includes('$')) return 'USD';
    if (priceString.includes('£')) return 'GBP';
    if (priceString.includes('€')) return 'EUR';
    return 'USD'; // Default
  }
}

const subscriptionService = new SubscriptionService();

export default subscriptionService;
export { subscriptionService };
