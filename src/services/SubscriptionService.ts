import { Session } from '@supabase/supabase-js';

const API_BASE_URL = __DEV__ ? 'http://192.168.1.122:3000' : 'https://soundbridge.live';

export interface SubscriptionStatus {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  stripe_subscription_id?: string;
  trial_end?: string;
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
   */
  async getSubscriptionStatus(session: Session): Promise<SubscriptionStatus> {
    try {
      console.log('📊 Fetching subscription status...');
      const data = await this.makeRequest('/api/user/subscription-status', session);
      console.log('✅ Subscription status loaded:', data);
      
      // Transform API response to match our interface
      return {
        tier: data.subscription.plan.toLowerCase(), // "Pro" -> "pro"
        status: data.subscription.status,
        current_period_start: data.subscription.currentPeriod.start,
        current_period_end: data.subscription.currentPeriod.end,
        cancel_at_period_end: data.subscription.cancelAtPeriodEnd || false,
        amount: this.extractPriceAmount(data.subscription.price),
        currency: this.extractPriceCurrency(data.subscription.price),
        billing_cycle: data.subscription.billingCycle,
        stripe_subscription_id: data.subscription.stripeSubscriptionId,
        trial_end: data.subscription.trialEnd,
      };
    } catch (error) {
      console.error('❌ Error fetching subscription status:', error);
      throw error;
    }
  }

  /**
   * Get user's usage statistics
   */
  async getUsageStatistics(session: Session): Promise<UsageStatistics> {
    try {
      console.log('📈 Fetching usage statistics...');
      const data = await this.makeRequest('/api/user/usage-statistics', session);
      console.log('✅ Usage statistics loaded:', data);
      
      return {
        uploads_used: data.usage.uploads.used,
        uploads_limit: data.usage.uploads.limit, // -1 for unlimited
        storage_used: data.usage.storage.used,
        storage_limit: data.usage.storage.limit,
        bandwidth_used: data.usage.bandwidth.used,
        bandwidth_limit: data.usage.bandwidth.limit,
        period_start: data.lastUpdated,
        period_end: data.lastUpdated, // Will be calculated based on billing cycle
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
      case 'pro': return 'Pro Plan';
      case 'enterprise': return 'Enterprise Plan';
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
      case 'past_due': return 'Past Due';
      case 'trialing': return 'Trial';
      case 'incomplete': return 'Incomplete';
      default: return 'Unknown';
    }
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return '#10B981'; // Green
      case 'trialing': return '#3B82F6'; // Blue
      case 'cancelled': return '#6B7280'; // Gray
      case 'past_due': return '#F59E0B'; // Yellow
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
      case 'pro':
        return billingCycle === 'yearly' ? '$99.99/year' : '$9.99/month';
      case 'enterprise':
        return billingCycle === 'yearly' ? '$499.99/year' : '$49.99/month';
      default:
        return '$0.00';
    }
  }

  /**
   * Get plan features
   */
  getPlanFeatures(plan: string): string[] {
    switch (plan.toLowerCase()) {
      case 'pro':
        return [
          '10 uploads per month',
          '2GB storage',
          'Priority processing (1-2 min)',
          'Advanced analytics',
          'Revenue sharing (95%)',
          'HD audio quality',
          'Direct fan messaging'
        ];
      case 'enterprise':
        return [
          'Unlimited uploads',
          '10GB storage',
          'Instant processing (< 1 min)',
          'AI-powered protection',
          'White-label platform',
          'Advanced analytics',
          'Revenue sharing (95%)',
          'HD audio quality',
          'Direct fan messaging'
        ];
      default:
        return [
          '3 uploads per month',
          '0.5GB storage',
          'Basic features',
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

export const subscriptionService = new SubscriptionService();
