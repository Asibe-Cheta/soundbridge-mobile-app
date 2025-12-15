/**
 * SubscriptionStatusService
 * 
 * Per WEBHOOK_CONFIGURATION_COMPLETE_GUIDE.md, this service queries the profiles table
 * directly to check subscription status. The webhook handler updates the profiles table
 * when subscriptions change (from either RevenueCat or Stripe).
 * 
 * This is the recommended approach as it ensures consistency across all platforms.
 */

import { supabase } from '../lib/supabase';

export interface SubscriptionStatus {
  tier: 'free' | 'premium' | 'unlimited';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  renewalDate: string | null;
}

export class SubscriptionStatusService {
  /**
   * Get current user's subscription status from profiles table
   * Per WEBHOOK_CONFIGURATION_COMPLETE_GUIDE.md recommendation
   * 
   * @param userId - Supabase user ID
   * @returns Subscription status or null if user not found
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
    try {
      console.log('📊 Checking subscription status for user:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_renewal_date')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching subscription status:', error);
        return null;
      }

      if (!profile) {
        console.warn('⚠️ Profile not found for user:', userId);
        return null;
      }

      // Normalize tier values (handle legacy 'pro' tier as 'premium')
      let tier: 'free' | 'premium' | 'unlimited' = 'free';
      const rawTier = profile.subscription_tier?.toLowerCase() || 'free';
      
      if (rawTier === 'premium' || rawTier === 'pro') {
        tier = 'premium';
      } else if (rawTier === 'unlimited') {
        tier = 'unlimited';
      }

      const status: 'active' | 'cancelled' | 'expired' | 'past_due' = 
        (profile.subscription_status?.toLowerCase() as any) || 'active';

      const subscriptionStatus: SubscriptionStatus = {
        tier,
        status,
        renewalDate: profile.subscription_renewal_date || null,
      };

      console.log('✅ Subscription status:', subscriptionStatus);
      return subscriptionStatus;
    } catch (error) {
      console.error('❌ Exception getting subscription status:', error);
      return null;
    }
  }

  /**
   * Check if user has active paid subscription
   * 
   * @param userId - Supabase user ID
   * @returns true if user has active premium or unlimited subscription
   */
  static async hasActivePaidSubscription(userId: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    
    if (!status) return false;

    // Must have paid tier AND active status
    const hasPaidTier = status.tier === 'premium' || status.tier === 'unlimited';
    const isActive = status.status === 'active';

    return hasPaidTier && isActive;
  }

  /**
   * Check if subscription has expired
   * 
   * @param userId - Supabase user ID
   * @returns true if subscription is expired or past renewal date
   */
  static async isSubscriptionExpired(userId: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    
    if (!status) return true; // No subscription = expired

    // Check status
    if (status.status === 'expired') {
      return true;
    }

    // Check renewal date
    if (status.renewalDate) {
      const renewalDate = new Date(status.renewalDate);
      const now = new Date();
      return renewalDate < now;
    }

    // If no renewal date and not active, consider expired
    return status.status !== 'active';
  }

  /**
   * Get subscription tier (convenience method)
   * 
   * @param userId - Supabase user ID
   * @returns 'free' | 'premium' | 'unlimited'
   */
  static async getTier(userId: string): Promise<'free' | 'premium' | 'unlimited'> {
    const status = await this.getSubscriptionStatus(userId);
    return status?.tier || 'free';
  }
}

