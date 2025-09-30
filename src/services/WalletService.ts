import { Session } from '@supabase/supabase-js';
import { currencyService } from './CurrencyService';

const API_BASE_URL = 'https://soundbridge.live';

export interface WalletBalance {
  balance: number;
  currency: string;
  hasWallet: boolean;
}

export interface WalletTransaction {
  id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'tip_received' | 'tip_sent' | 'payout' | 'refund';
  amount: number;
  currency: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface TransactionsResponse {
  transactions: WalletTransaction[];
  limit: number;
  offset: number;
  count: number;
}

export interface WithdrawalMethod {
  id: string;
  method_type: 'bank_transfer' | 'paypal' | 'crypto' | 'prepaid_card';
  method_name: string;
  country?: string;
  currency?: string;
  banking_system?: string;
  is_verified: boolean;
  is_default: boolean;
  encrypted_details?: any;
  created_at: string;
  updated_at?: string;
}

export interface Country {
  country_code: string;
  country_name: string;
  currency: string;
  banking_system: string;
}

export interface CountryBankingInfo {
  country_code: string;
  country_name: string;
  currency: string;
  banking_system: string;
  required_fields: Record<string, {
    required: boolean;
    label: string;
    placeholder?: string;
  }>;
  field_validation: Record<string, string>;
}

export interface CountriesResponse {
  countries: Country[];
  count: number;
}

export interface CountryInfoResponse {
  country: CountryBankingInfo;
  success: boolean;
}

export interface WithdrawalRequest {
  amount: number;
  currency: string;
  withdrawal_method_id: string;
  description?: string;
}

export interface WithdrawalResponse {
  success: boolean;
  transactionId: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface StripeConnectResponse {
  success: boolean;
  accountId: string;
  onboardingUrl: string;
  country: string;
  currency: string;
  message?: string;
  error?: string;
}

export interface CountryDetectionResponse {
  country_code: string;
  country_name: string;
  currency: string;
  supported_by_stripe: boolean;
}

class WalletService {
  private getAuthHeaders(session: Session) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'X-Auth-Token': session.access_token,
      'X-Authorization': `Bearer ${session.access_token}`,
      'X-Supabase-Token': session.access_token,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    session: Session, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(session),
        ...options.headers,
      },
    };

    console.log(`🔗 WalletService: ${options.method || 'GET'} ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ WalletService: Request timeout after 10s for ${url}`);
        controller.abort();
      }, 10000); // 10 second timeout (reduced from 30s)
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log(`📡 WalletService Response (${response.status}):`, responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error(`❌ WalletService Error for ${url}:`, error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection and try again.');
        }
        if (error.message.includes('Network request failed')) {
          throw new Error('Network error. Please check your internet connection.');
        }
        if (error.message.includes('HTTP 401')) {
          throw new Error('Authentication failed. Please log in again.');
        }
        if (error.message.includes('HTTP 404')) {
          throw new Error('Service not found. Please try again later.');
        }
        if (error.message.includes('HTTP 500')) {
          throw new Error('Server error. Please try again later.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Reset bank account - clears Stripe Connect setup
   */
  async resetBankAccount(session: Session): Promise<ApiResponse> {
    return this.makeRequest('/bank-account/reset', session, {
      method: 'POST',
    });
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(session: Session, currency: string = 'USD'): Promise<WalletBalance> {
    return this.makeRequest(`/wallet/balance?currency=${currency}`, session);
  }

  /**
   * Get wallet balance with graceful error handling (doesn't throw)
   */
  async getWalletBalanceSafe(session: Session, currency: string = 'USD'): Promise<WalletBalance | null> {
    try {
      return await this.getWalletBalance(session, currency);
    } catch (error) {
      console.log('🔇 WalletService: Suppressing wallet balance error (safe mode)');
      return null;
    }
  }

  /**
   * Get wallet transactions with pagination
   */
  async getWalletTransactions(
    session: Session, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<TransactionsResponse> {
    return this.makeRequest(`/wallet/transactions?limit=${limit}&offset=${offset}`, session);
  }

  /**
   * Get wallet transactions with graceful error handling (doesn't throw)
   */
  async getWalletTransactionsSafe(
    session: Session, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<TransactionsResponse> {
    try {
      return await this.getWalletTransactions(session, limit, offset);
    } catch (error) {
      console.log('🔇 WalletService: Suppressing wallet transactions error (safe mode)');
      return { transactions: [], limit, offset, count: 0 };
    }
  }

  /**
   * Submit withdrawal request
   */
  async submitWithdrawal(
    session: Session, 
    withdrawalData: WithdrawalRequest
  ): Promise<WithdrawalResponse> {
    return this.makeRequest('/wallet/withdraw', session, {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
    });
  }

  /**
   * Get available withdrawal methods
   */
  async getWithdrawalMethods(session: Session): Promise<{ methods: WithdrawalMethod[]; count: number }> {
    return this.makeRequest('/wallet/withdrawal-methods', session);
  }

  /**
   * Add new withdrawal method
   */
  async addWithdrawalMethod(
    session: Session, 
    methodData: {
      method_type: 'bank_transfer' | 'paypal' | 'crypto' | 'prepaid_card';
      method_name: string;
      bank_details?: {
        account_holder_name: string;
        bank_name: string;
        account_number: string;
        routing_number: string;
        account_type: 'checking' | 'savings';
        currency: string;
      };
      paypal_email?: string;
      crypto_address?: {
        address: string;
        currency: string;
        network: string;
      };
      card_details?: {
        card_number: string;
        expiry_month: string;
        expiry_year: string;
        cvv: string;
        cardholder_name: string;
      };
    }
  ): Promise<ApiResponse<WithdrawalMethod>> {
    return this.makeRequest('/wallet/withdrawal-methods', session, {
      method: 'POST',
      body: JSON.stringify(methodData),
    });
  }

  /**
   * Update withdrawal method
   */
  async updateWithdrawalMethod(
    session: Session, 
    methodId: string, 
    methodData: Partial<WithdrawalMethod>
  ): Promise<ApiResponse<WithdrawalMethod>> {
    return this.makeRequest(`/wallet/withdrawal-methods/${methodId}`, session, {
      method: 'PUT',
      body: JSON.stringify(methodData),
    });
  }

  /**
   * Delete withdrawal method
   */
  async deleteWithdrawalMethod(session: Session, methodId: string): Promise<ApiResponse> {
    return this.makeRequest(`/wallet/withdrawal-methods/${methodId}`, session, {
      method: 'DELETE',
    });
  }

  /**
   * Get supported countries for banking
   */
  async getSupportedCountries(session: Session): Promise<CountriesResponse> {
    return this.makeRequest('/banking/countries', session);
  }

  /**
   * Get country-specific banking information
   */
  async getCountryBankingInfo(session: Session, countryCode: string): Promise<CountryInfoResponse> {
    return this.makeRequest(`/banking/country/${countryCode}`, session);
  }

  /**
   * Get supported countries with graceful error handling (doesn't throw)
   */
  async getSupportedCountriesSafe(session: Session): Promise<CountriesResponse> {
    try {
      return await this.getSupportedCountries(session);
    } catch (error) {
      console.log('🔇 WalletService: Suppressing countries error (safe mode)');
      return { countries: [], count: 0 };
    }
  }

  /**
   * Get country banking info with graceful error handling (doesn't throw)
   */
  async getCountryBankingInfoSafe(session: Session, countryCode: string): Promise<CountryBankingInfo | null> {
    try {
      const result = await this.getCountryBankingInfo(session, countryCode);
      return result.success ? result.country : null;
    } catch (error) {
      console.log('🔇 WalletService: Suppressing country info error (safe mode)');
      return null;
    }
  }

  /**
   * Create country-aware Stripe Connect account
   */
  async createStripeConnectAccount(session: Session, country?: string): Promise<StripeConnectResponse> {
    const requestBody: any = {};
    if (country) {
      requestBody.country = country;
    }

    return this.makeRequest('/stripe/connect/create-account', session, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Detect user's country for Stripe Connect
   */
  async detectCountryForStripe(session: Session): Promise<CountryDetectionResponse> {
    return this.makeRequest('/stripe/detect-country', session);
  }

  /**
   * Process withdrawal with enhanced status tracking
   */
  async processWithdrawal(
    session: Session,
    transactionId: string,
    withdrawalMethodId: string
  ): Promise<ApiResponse<{ transferId: string; message: string }>> {
    return this.makeRequest('/wallet/process-withdrawal', session, {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: transactionId,
        withdrawal_method_id: withdrawalMethodId,
      }),
    });
  }

  /**
   * Get transaction type display name
   */
  getTransactionTypeDisplay(type: string): string {
    switch (type) {
      case 'tip_received': return 'Tip Received';
      case 'tip_sent': return 'Tip Sent';
      case 'withdrawal': return 'Withdrawal';
      case 'deposit': return 'Deposit';
      case 'payout': return 'Payout';
      case 'refund': return 'Refund';
      default: return 'Transaction';
    }
  }

  /**
   * Get transaction icon name for Ionicons
   */
  getTransactionIcon(type: string): string {
    switch (type) {
      case 'tip_received': return 'trending-up';
      case 'tip_sent': return 'trending-down';
      case 'withdrawal': return 'arrow-up-circle';
      case 'deposit': return 'arrow-down-circle';
      case 'payout': return 'card';
      case 'refund': return 'refresh-circle';
      default: return 'wallet';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      case 'cancelled': return '#6B7280';
      default: return '#6B7280';
    }
  }

  /**
   * Format currency amount using CurrencyService
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    return currencyService.formatAmount(amount, currency);
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
}

export const walletService = new WalletService();
