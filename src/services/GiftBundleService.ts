/**
 * Gift Bundle — a fan-side, non-refundable, non-withdrawable prepaid credit balance,
 * spent on tips to any artist (GIFT_BUNDLE.MD, Item 36). Deliberately separate from
 * WalletService, which is the creator's withdrawable earnings ledger — opposite
 * direction of money flow. Backend: see WEB_TEAM_GIFT_BUNDLE.MD.
 */
import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

export interface GiftBundleBalance {
  balance: number; // major units (dollars)
  currency: string;
}

export interface CreateGiftBundleCreditResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  customer_id?: string;
  ephemeral_key_secret?: string;
}

export interface ConfirmGiftBundleCreditResponse {
  success: boolean;
  newBalance: number; // major units
  message?: string;
}

class GiftBundleService {
  async getBalance(session: Session | null): Promise<GiftBundleBalance> {
    try {
      return await apiFetch<GiftBundleBalance>('/api/gift-bundle/balance', { session, method: 'GET' });
    } catch {
      // Fails closed to 0 — a balance screen/modal shouldn't break if this errors.
      return { balance: 0, currency: 'USD' };
    }
  }

  async createCredit(session: Session | null, amount: number, currency = 'USD'): Promise<CreateGiftBundleCreditResponse> {
    if (!session?.access_token) throw new Error('You must be signed in to credit your Gift Bundle.');
    return apiFetch<CreateGiftBundleCreditResponse>('/api/payments/create-gift-bundle-credit', {
      method: 'POST',
      session,
      body: JSON.stringify({ amount, currency }),
    });
  }

  async confirmCredit(session: Session | null, paymentIntentId: string): Promise<ConfirmGiftBundleCreditResponse> {
    if (!session?.access_token) throw new Error('You must be signed in to confirm this.');
    return apiFetch<ConfirmGiftBundleCreditResponse>('/api/payments/confirm-gift-bundle-credit', {
      method: 'POST',
      session,
      body: JSON.stringify({ paymentIntentId }),
    });
  }

  /** For the "gentle check-in" safeguard — how many times has this user credited their
   * Gift Bundle in the last `days` days. Direct Supabase read (RLS: own rows only),
   * same pattern as other lightweight read-only lookups in this codebase. */
  async getRecentCreditCount(userId: string, days = 7): Promise<number> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('gift_bundle_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'credit')
        .gte('created_at', since);
      return count ?? 0;
    } catch {
      return 0;
    }
  }
}

export const giftBundleService = new GiftBundleService();
