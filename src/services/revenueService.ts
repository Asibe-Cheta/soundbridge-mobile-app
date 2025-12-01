import { supabase } from '../lib/supabase';

export interface BankAccount {
  id: string;
  user_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_encrypted: string;
  routing_number_encrypted: string;
  account_type: 'checking' | 'savings';
  currency: string;
  verification_status: 'pending' | 'verified' | 'failed';
  is_verified: boolean;
  stripe_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccountFormData {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  currency: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  tier: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  user_id: string;
  uploads_used: number;
  uploads_limit: number;
  storage_used: number; // in MB
  storage_limit: number; // in MB
  bandwidth_used: number; // in MB
  bandwidth_limit: number; // in MB
  period_start: string;
  period_end: string;
}

export interface RevenueData {
  user_id: string;
  total_earnings: number;
  pending_earnings: number;
  last_payout: number;
  last_payout_date: string;
  next_payout_date: string;
  currency: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
  stripe_transfer_id?: string;
}

export interface BillingHistory {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoice_url?: string;
  stripe_invoice_id?: string;
}

class RevenueService {
  // Bank Account Management
  async getBankAccount(userId: string): Promise<BankAccount | null> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching bank account:', error);
      throw error;
    }
  }

  async setBankAccount(userId: string, formData: BankAccountFormData): Promise<{ success: boolean; error?: any }> {
    try {
      // In a real implementation, you would encrypt sensitive data before storing
      const bankAccountData = {
        user_id: userId,
        account_holder_name: formData.account_holder_name,
        bank_name: formData.bank_name,
        account_number_encrypted: formData.account_number, // Should be encrypted
        routing_number_encrypted: formData.routing_number, // Should be encrypted
        account_type: formData.account_type,
        currency: formData.currency,
        verification_status: 'pending',
        is_verified: false,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('bank_accounts')
        .upsert(bankAccountData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving bank account:', error);
      return { success: false, error };
    }
  }

  // Subscription Management
  async getSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found, return free tier
          return {
            id: 'free',
            user_id: userId,
            tier: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
            amount: 0,
            currency: 'USD',
            billing_cycle: 'monthly',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }

  async updateSubscription(userId: string, tier: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly'): Promise<{ success: boolean; error?: any }> {
    try {
      const amounts = {
        pro: { monthly: 9.99, yearly: 99.99 },
        enterprise: { monthly: 49.99, yearly: 499.99 }
      };

      const subscriptionData = {
        user_id: userId,
        tier,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        amount: amounts[tier][billingCycle],
        currency: 'USD',
        billing_cycle: billingCycle,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { success: false, error };
    }
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error };
    }
  }

  // Usage Statistics
  async getUsageStats(userId: string): Promise<UsageStats | null> {
    try {
      // Get current subscription to determine limits
      const subscription = await this.getSubscription(userId);
      
      const limits = {
        free: { uploads: 3, storage: 100, bandwidth: 1024 },
        pro: { uploads: 10, storage: 2048, bandwidth: 10240 },
      };

      const tierLimits = limits[subscription?.tier || 'free'];

      // Get actual usage from database
      const { data: uploads } = await supabase
        .from('audio_tracks')
        .select('id')
        .eq('creator_id', userId)
        .gte('created_at', subscription?.current_period_start || new Date().toISOString());

      // Mock storage and bandwidth usage for now
      const usageStats: UsageStats = {
        user_id: userId,
        uploads_used: uploads?.length || 0,
        uploads_limit: tierLimits.uploads,
        storage_used: Math.floor(Math.random() * tierLimits.storage * 0.8), // Mock data
        storage_limit: tierLimits.storage,
        bandwidth_used: Math.floor(Math.random() * tierLimits.bandwidth * 0.6), // Mock data
        bandwidth_limit: tierLimits.bandwidth,
        period_start: subscription?.current_period_start || new Date().toISOString(),
        period_end: subscription?.current_period_end || new Date().toISOString()
      };

      return usageStats;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }
  }

  // Revenue Management
  async getRevenueData(userId: string): Promise<RevenueData | null> {
    try {
      // Mock revenue data for now - in real implementation, this would come from payment processor
      const revenueData: RevenueData = {
        user_id: userId,
        total_earnings: Math.floor(Math.random() * 1000) + 100,
        pending_earnings: Math.floor(Math.random() * 100) + 10,
        last_payout: Math.floor(Math.random() * 200) + 50,
        last_payout_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        next_payout_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD'
      };

      return revenueData;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
  }

  async requestPayout(userId: string, amount: number): Promise<{ success: boolean; error?: any }> {
    try {
      const payoutRequest = {
        user_id: userId,
        amount,
        currency: 'USD',
        status: 'pending',
        requested_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('payout_requests')
        .insert(payoutRequest);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error requesting payout:', error);
      return { success: false, error };
    }
  }

  // Billing History
  async getBillingHistory(userId: string): Promise<BillingHistory[]> {
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return [];
    }
  }

  // Stripe Connect Integration
  async createStripeConnectAccount(userId: string): Promise<{ success: boolean; onboardingUrl?: string; error?: any }> {
    try {
      // This would integrate with your backend API that handles Stripe Connect
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return { success: true, onboardingUrl: result.onboardingUrl };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      return { success: false, error };
    }
  }
}

export const revenueService = new RevenueService();

      };



      const subscriptionData = {

        user_id: userId,

        tier,

        status: 'active',

        current_period_start: new Date().toISOString(),

        current_period_end: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),

        cancel_at_period_end: false,

        amount: amounts[tier][billingCycle],

        currency: 'USD',

        billing_cycle: billingCycle,

        is_active: true,

        updated_at: new Date().toISOString()

      };



      const { error } = await supabase

        .from('subscriptions')

        .upsert(subscriptionData, {

          onConflict: 'user_id',

          ignoreDuplicates: false

        });



      if (error) {

        throw error;

      }



      return { success: true };

    } catch (error) {

      console.error('Error updating subscription:', error);

      return { success: false, error };

    }

  }



  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: any }> {

    try {

      const { error } = await supabase

        .from('subscriptions')

        .update({ 

          cancel_at_period_end: true,

          updated_at: new Date().toISOString()

        })

        .eq('user_id', userId);



      if (error) {

        throw error;

      }



      return { success: true };

    } catch (error) {

      console.error('Error cancelling subscription:', error);

      return { success: false, error };

    }

  }



  // Usage Statistics

  async getUsageStats(userId: string): Promise<UsageStats | null> {

    try {

      // Get current subscription to determine limits

      const subscription = await this.getSubscription(userId);

      

      const limits = {

        free: { uploads: 3, storage: 100, bandwidth: 1024 },

        pro: { uploads: 10, storage: 2048, bandwidth: 10240 },

        enterprise: { uploads: -1, storage: 10240, bandwidth: 51200 } // -1 = unlimited

      };



      const tierLimits = limits[subscription?.tier || 'free'];



      // Get actual usage from database

      const { data: uploads } = await supabase

        .from('audio_tracks')

        .select('id')

        .eq('creator_id', userId)

        .gte('created_at', subscription?.current_period_start || new Date().toISOString());



      // Mock storage and bandwidth usage for now

      const usageStats: UsageStats = {

        user_id: userId,

        uploads_used: uploads?.length || 0,

        uploads_limit: tierLimits.uploads,

        storage_used: Math.floor(Math.random() * tierLimits.storage * 0.8), // Mock data

        storage_limit: tierLimits.storage,

        bandwidth_used: Math.floor(Math.random() * tierLimits.bandwidth * 0.6), // Mock data

        bandwidth_limit: tierLimits.bandwidth,

        period_start: subscription?.current_period_start || new Date().toISOString(),

        period_end: subscription?.current_period_end || new Date().toISOString()

      };



      return usageStats;

    } catch (error) {

      console.error('Error fetching usage stats:', error);

      throw error;

    }

  }



  // Revenue Management

  async getRevenueData(userId: string): Promise<RevenueData | null> {

    try {

      // Mock revenue data for now - in real implementation, this would come from payment processor

      const revenueData: RevenueData = {

        user_id: userId,

        total_earnings: Math.floor(Math.random() * 1000) + 100,

        pending_earnings: Math.floor(Math.random() * 100) + 10,

        last_payout: Math.floor(Math.random() * 200) + 50,

        last_payout_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),

        next_payout_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),

        currency: 'USD'

      };



      return revenueData;

    } catch (error) {

      console.error('Error fetching revenue data:', error);

      throw error;

    }

  }



  async requestPayout(userId: string, amount: number): Promise<{ success: boolean; error?: any }> {

    try {

      const payoutRequest = {

        user_id: userId,

        amount,

        currency: 'USD',

        status: 'pending',

        requested_at: new Date().toISOString()

      };



      const { error } = await supabase

        .from('payout_requests')

        .insert(payoutRequest);



      if (error) {

        throw error;

      }



      return { success: true };

    } catch (error) {

      console.error('Error requesting payout:', error);

      return { success: false, error };

    }

  }



  // Billing History

  async getBillingHistory(userId: string): Promise<BillingHistory[]> {

    try {

      const { data, error } = await supabase

        .from('billing_history')

        .select('*')

        .eq('user_id', userId)

        .order('date', { ascending: false })

        .limit(50);



      if (error) {

        throw error;

      }



      return data || [];

    } catch (error) {

      console.error('Error fetching billing history:', error);

      return [];

    }

  }



  // Stripe Connect Integration

  async createStripeConnectAccount(userId: string): Promise<{ success: boolean; onboardingUrl?: string; error?: any }> {

    try {

      // This would integrate with your backend API that handles Stripe Connect

      const response = await fetch('/api/stripe/connect/create-account', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({ userId })

      });



      const result = await response.json();



      if (response.ok && result.success) {

        return { success: true, onboardingUrl: result.onboardingUrl };

      } else {

        return { success: false, error: result.error };

      }

    } catch (error) {

      console.error('Error creating Stripe Connect account:', error);

      return { success: false, error };

    }

  }

}



export const revenueService = new RevenueService();



      };



      const subscriptionData = {

        user_id: userId,

        tier,

        status: 'active',

        current_period_start: new Date().toISOString(),

        current_period_end: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),

        cancel_at_period_end: false,

        amount: amounts[tier][billingCycle],

        currency: 'USD',

        billing_cycle: billingCycle,

        is_active: true,

        updated_at: new Date().toISOString()

      };



      const { error } = await supabase

        .from('subscriptions')

        .upsert(subscriptionData, {

          onConflict: 'user_id',

          ignoreDuplicates: false

        });



      if (error) {

        throw error;

      }



      return { success: true };

    } catch (error) {

      console.error('Error updating subscription:', error);

      return { success: false, error };

    }

  }



  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: any }> {

    try {

      const { error } = await supabase

        .from('subscriptions')

        .update({ 

          cancel_at_period_end: true,

          updated_at: new Date().toISOString()

        })

        .eq('user_id', userId);



      if (error) {

        throw error;

      }



      return { success: true };

    } catch (error) {

      console.error('Error cancelling subscription:', error);

      return { success: false, error };

    }

  }



  // Usage Statistics

  async getUsageStats(userId: string): Promise<UsageStats | null> {

    try {

      // Get current subscription to determine limits

      const subscription = await this.getSubscription(userId);

      

      const limits = {

        free: { uploads: 3, storage: 100, bandwidth: 1024 },

        pro: { uploads: 10, storage: 2048, bandwidth: 10240 },

        enterprise: { uploads: -1, storage: 10240, bandwidth: 51200 } // -1 = unlimited

      };



      const tierLimits = limits[subscription?.tier || 'free'];



      // Get actual usage from database

      const { data: uploads } = await supabase

        .from('audio_tracks')

        .select('id')

        .eq('creator_id', userId)

        .gte('created_at', subscription?.current_period_start || new Date().toISOString());



      // Mock storage and bandwidth usage for now

      const usageStats: UsageStats = {

        user_id: userId,

        uploads_used: uploads?.length || 0,

        uploads_limit: tierLimits.uploads,

        storage_used: Math.floor(Math.random() * tierLimits.storage * 0.8), // Mock data

        storage_limit: tierLimits.storage,

        bandwidth_used: Math.floor(Math.random() * tierLimits.bandwidth * 0.6), // Mock data

        bandwidth_limit: tierLimits.bandwidth,

        period_start: subscription?.current_period_start || new Date().toISOString(),

        period_end: subscription?.current_period_end || new Date().toISOString()

      };



      return usageStats;

    } catch (error) {

      console.error('Error fetching usage stats:', error);

      throw error;

    }

  }



  // Revenue Management

  async getRevenueData(userId: string): Promise<RevenueData | null> {

    try {

      // Mock revenue data for now - in real implementation, this would come from payment processor

      const revenueData: RevenueData = {

        user_id: userId,

        total_earnings: Math.floor(Math.random() * 1000) + 100,

        pending_earnings: Math.floor(Math.random() * 100) + 10,

        last_payout: Math.floor(Math.random() * 200) + 50,

        last_payout_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),

        next_payout_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),

        currency: 'USD'

      };



      return revenueData;

    } catch (error) {

      console.error('Error fetching revenue data:', error);

      throw error;

    }

  }



  async requestPayout(userId: string, amount: number): Promise<{ success: boolean; error?: any }> {

    try {

      const payoutRequest = {

        user_id: userId,

        amount,

        currency: 'USD',

        status: 'pending',

        requested_at: new Date().toISOString()

      };



      const { error } = await supabase

        .from('payout_requests')

        .insert(payoutRequest);



      if (error) {

        throw error;

      }



      return { success: true };

    } catch (error) {

      console.error('Error requesting payout:', error);

      return { success: false, error };

    }

  }



  // Billing History

  async getBillingHistory(userId: string): Promise<BillingHistory[]> {

    try {

      const { data, error } = await supabase

        .from('billing_history')

        .select('*')

        .eq('user_id', userId)

        .order('date', { ascending: false })

        .limit(50);



      if (error) {

        throw error;

      }



      return data || [];

    } catch (error) {

      console.error('Error fetching billing history:', error);

      return [];

    }

  }



  // Stripe Connect Integration

  async createStripeConnectAccount(userId: string): Promise<{ success: boolean; onboardingUrl?: string; error?: any }> {

    try {

      // This would integrate with your backend API that handles Stripe Connect

      const response = await fetch('/api/stripe/connect/create-account', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({ userId })

      });



      const result = await response.json();



      if (response.ok && result.success) {

        return { success: true, onboardingUrl: result.onboardingUrl };

      } else {

        return { success: false, error: result.error };

      }

    } catch (error) {

      console.error('Error creating Stripe Connect account:', error);

      return { success: false, error };

    }

  }

}



export const revenueService = new RevenueService();


