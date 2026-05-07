import { Session } from '@supabase/supabase-js';
import { config } from '../config/environment';
import { supabase } from '../lib/supabase';

const API_URL = config.apiUrl.replace('/api', ''); // Remove /api suffix if present

// TypeScript Interfaces matching web implementation
export interface CreatorRevenue {
  id: string;
  user_id: string;
  total_earned: number;
  available_balance: number;
  pending_balance: number;
  lifetime_payout: number;
  this_month_earnings: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutEligibility {
  eligible: boolean;
  minimum_amount: number;
  available_balance: number;
  currency: string;
  reasons: string[];
  has_bank_account: boolean;
  bank_account_verified: boolean;
  pending_payouts_count: number;
  next_eligible_date?: string;
}

export interface PayoutRequest {
  amount: number;
  currency: string;
  notes?: string;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  method?: 'stripe' | 'fincra';
  // Legacy column name — holds the provider transfer id for both Stripe and Fincra rails.
  // For Fincra payouts this contains the Fincra transfer id returned from createFincraTransfer.
  stripe_transfer_id?: string;
  stripe_payout_id?: string;
  stripe_account_id?: string;
  failure_reason?: string;
  notes?: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutHistoryResponse {
  payouts: Payout[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * PayoutService - Integrates with web backend's Stripe Connect payout system
 *
 * Endpoints implemented by web team:
 * - GET  /api/payouts/eligibility - Check payout eligibility
 * - POST /api/payouts/request - Request a payout
 * - GET  /api/payouts/history - Get payout history
 *
 * Creator revenue balance comes from creator_revenue table populated by:
 * - Tips from LiveTippingService
 * - Event ticket sales (95% after 5% platform fee)
 * - Service provider bookings
 * - Premium content purchases
 */
class PayoutService {
  private async getFreshToken(session: Session): Promise<string> {
    try {
      const { data: { session: fresh } } = await supabase.auth.getSession();
      return fresh?.access_token ?? session.access_token;
    } catch {
      return session.access_token;
    }
  }

  /**
   * Check if user is eligible for payout and get available balance
   */
  async checkEligibility(session: Session): Promise<PayoutEligibility> {
    try {
      console.log('🔍 Checking payout eligibility...');

      const token = await this.getFreshToken(session);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/payouts/eligibility`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check payout eligibility');
      }

      const data = await response.json();
      console.log('✅ Payout eligibility:', data);

      // Handle both flat { eligible, reasons } and nested { eligibility: { eligible, reasons } }
      const e = data.eligibility ?? data;
      return {
        eligible: e.eligible ?? false,
        minimum_amount: e.minimum_amount ?? e.minimumAmount ?? 25,
        available_balance: e.available_balance ?? e.availableBalance ?? 0,
        currency: e.currency ?? 'USD',
        reasons: e.reasons ?? [],
        has_bank_account: e.has_bank_account ?? e.hasBankAccount ?? false,
        bank_account_verified: e.bank_account_verified ?? e.bankAccountVerified ?? false,
        pending_payouts_count: e.pending_payouts_count ?? e.pendingPayoutsCount ?? 0,
        next_eligible_date: e.next_eligible_date ?? e.nextEligibleDate,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      console.error('❌ Error checking payout eligibility:', error);
      throw error;
    }
  }

  /**
   * Request a payout (minimum $25.00 USD)
   */
  async requestPayout(
    session: Session,
    payoutRequest: PayoutRequest
  ): Promise<{ success: boolean; payout?: Payout; error?: string }> {
    try {
      console.log('💸 Requesting payout:', payoutRequest);

      const token = await this.getFreshToken(session);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for POST

      const response = await fetch(`${API_URL}/api/payouts/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payoutRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Payout request failed:', data.error, '| eligibility:', JSON.stringify(data.eligibility ?? null));
        return {
          success: false,
          error: data.error || 'Failed to request payout',
        };
      }

      console.log('✅ Payout requested successfully:', data.payout);
      return {
        success: true,
        payout: data.payout,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Please check your connection and try again.',
        };
      }
      console.error('❌ Error requesting payout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Get payout history with pagination
   */
  async getPayoutHistory(
    session: Session,
    page: number = 1,
    limit: number = 10
  ): Promise<PayoutHistoryResponse> {
    try {
      console.log(`📜 Fetching payout history (page ${page}, limit ${limit})...`);

      const token = await this.getFreshToken(session);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${API_URL}/api/payouts/history?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch payout history');
      }

      const data = await response.json();
      console.log(`✅ Loaded ${data.payouts.length} payouts`);

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      console.error('❌ Error fetching payout history:', error);
      throw error;
    }
  }

  /**
   * Get creator revenue balance from creator_revenue table
   * This is populated by backend when tips/tickets/etc are received
   */
  async getCreatorRevenue(session: Session): Promise<CreatorRevenue | null> {
    try {
      console.log('💰 Fetching creator revenue...');

      const token = await this.getFreshToken(session);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/revenue/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // No revenue record yet, user hasn't earned anything
          console.log('ℹ️ No revenue record found (user has no earnings yet)');
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch creator revenue');
      }

      const data = await response.json();
      console.log('✅ Creator revenue raw response:', JSON.stringify(data));

      const r = data.revenue;
      if (!r) {
        console.warn('⚠️ Creator revenue: data.revenue is null/undefined. Full response:', JSON.stringify(data));
        return null;
      }

      // API returns camelCase; map to snake_case for internal use
      return {
        id: r.id ?? '',
        user_id: r.userId ?? r.user_id ?? '',
        total_earned: parseFloat(r.totalEarned ?? r.total_earned ?? 0),
        available_balance: parseFloat(r.availableBalance ?? r.available_balance ?? r.pendingBalance ?? r.pending_balance ?? 0),
        pending_balance: parseFloat(r.pendingBalance ?? r.pending_balance ?? 0),
        lifetime_payout: parseFloat(r.totalPaidOut ?? r.lifetime_payout ?? 0),
        this_month_earnings: parseFloat(r.thisMonthEarnings ?? r.this_month_earnings ?? 0),
        currency: r.currency ?? 'USD',
        created_at: r.createdAt ?? r.created_at ?? '',
        updated_at: r.updatedAt ?? r.updated_at ?? '',
      };
    } catch (error) {
      // Handle network failures gracefully
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('⏱️ Creator revenue request timed out - will use fallback');
          return null;
        }
        if (error.message === 'Network request failed' || error.message.includes('fetch')) {
          console.warn('🌐 Creator revenue endpoint unavailable - will use fallback');
          return null;
        }
      }
      console.error('❌ Error fetching creator revenue:', error);
      return null; // Return null instead of throwing to allow graceful degradation
    }
  }

  /**
   * Format payout status for display
   */
  getStatusDisplay(status: Payout['status']): { label: string; color: string; icon: string } {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: '#F59E0B', icon: 'time' };
      case 'processing':
        return { label: 'Processing', color: '#3B82F6', icon: 'sync' };
      case 'completed':
        return { label: 'Completed', color: '#10B981', icon: 'checkmark-circle' };
      case 'failed':
        return { label: 'Failed', color: '#EF4444', icon: 'close-circle' };
      case 'cancelled':
        return { label: 'Cancelled', color: '#6B7280', icon: 'ban' };
      default:
        return { label: 'Unknown', color: '#6B7280', icon: 'help-circle' };
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Calculate estimated payout date (2-7 business days from now)
   */
  getEstimatedPayoutDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 5); // Average 5 business days
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export const payoutService = new PayoutService();
