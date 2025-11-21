/**
 * Live Tipping Service
 * Handles Stripe payment processing for live session tips
 */

import { supabase } from '../lib/supabase';
import { dbHelpers } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface LiveTipPaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

export interface LiveTipParams {
  sessionId: string;
  creatorId: string;
  amount: number;
  message?: string;
}

export const LiveTippingService = {
  /**
   * Create a payment intent for a live tip
   */
  async createPaymentIntent(params: LiveTipParams): Promise<LiveTipPaymentIntent> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('User not authenticated');
      }

      console.log('💳 Creating payment intent for live tip:', params);

      const response = await fetch(`${API_URL}/tips/create-live-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const data = await response.json();
      console.log('✅ Payment intent created:', data.paymentIntentId);

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        amount: data.amount,
      };
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  },

  /**
   * Confirm a tip payment (after Stripe confirmation)
   */
  async confirmTipPayment(
    paymentIntentId: string,
    sessionId: string,
    creatorId: string,
    amount: number,
    message?: string
  ): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      if (!token || !user) {
        throw new Error('User not authenticated');
      }

      console.log('✅ Confirming tip payment:', paymentIntentId);

      // Record the tip in database
      const result = await dbHelpers.sendLiveTip(
        sessionId,
        user.id,
        creatorId,
        amount,
        message,
        paymentIntentId
      );

      if (!result.success) {
        throw new Error('Failed to record tip in database');
      }

      console.log('✅ Tip payment confirmed and recorded');
      return result.data;
    } catch (error) {
      console.error('❌ Error confirming tip payment:', error);
      throw error;
    }
  },

  /**
   * Process a complete live tip (create payment intent + confirm)
   * For now, we'll use a simplified flow without actual Stripe processing
   */
  async sendLiveTip(params: LiveTipParams): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        throw new Error('User not authenticated');
      }

      // For MVP: Skip Stripe payment processing and directly record tip
      // TODO: Integrate with Stripe when payment processing is ready
      console.log('💰 Processing live tip (MVP - no payment):', params);

      const result = await dbHelpers.sendLiveTip(
        params.sessionId,
        user.id,
        params.creatorId,
        params.amount,
        params.message,
        undefined // No payment intent ID for MVP
      );

      if (!result.success) {
        throw new Error('Failed to send tip');
      }

      console.log('✅ Live tip sent successfully');
      return result.data;
    } catch (error) {
      console.error('❌ Error sending live tip:', error);
      throw error;
    }
  },

  /**
   * Get tip statistics for a session
   */
  async getSessionTipStats(sessionId: string): Promise<{
    totalAmount: number;
    tipCount: number;
    topTippers: Array<{ userId: string; displayName: string; totalAmount: number }>;
  }> {
    try {
      const { data: tips } = await dbHelpers.getSessionTips(sessionId);

      if (!tips || tips.length === 0) {
        return {
          totalAmount: 0,
          tipCount: 0,
          topTippers: [],
        };
      }

      const totalAmount = tips.reduce((sum: number, tip: any) => sum + (tip.amount || 0), 0);
      const tipCount = tips.length;

      // Calculate top tippers
      const tipperMap = new Map<string, { displayName: string; totalAmount: number }>();
      tips.forEach((tip: any) => {
        if (tip.tipper_id) {
          const existing = tipperMap.get(tip.tipper_id);
          if (existing) {
            existing.totalAmount += tip.amount || 0;
          } else {
            tipperMap.set(tip.tipper_id, {
              displayName: tip.tipper?.display_name || 'Unknown',
              totalAmount: tip.amount || 0,
            });
          }
        }
      });

      const topTippers = Array.from(tipperMap.entries())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      return {
        totalAmount,
        tipCount,
        topTippers,
      };
    } catch (error) {
      console.error('❌ Error getting tip stats:', error);
      return {
        totalAmount: 0,
        tipCount: 0,
        topTippers: [],
      };
    }
  },
};

