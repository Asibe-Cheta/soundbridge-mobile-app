import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export type TipPaymentMethod = 'card' | 'apple_pay' | 'google_pay';

export interface CreateTipRequest {
  creatorId: string;
  amount: number;
  currency: string;
  message?: string;
  isAnonymous?: boolean;
  userTier?: string;
  paymentMethod?: TipPaymentMethod;
  trackId?: string;
  /** Video live stream this tip was sent during (optional, additive — see MOBILE_TEAM_LIVE_STREAMING.MD).
   * Backend validates it belongs to the creator and is currently active; if not, it silently
   * tips without the live-stream tag rather than failing, so safe to always include while live. */
  liveStreamId?: string;
}

export interface CreateTipResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  tipId: string;
  platformFee: number;
  creatorEarnings: number;
  message?: string;
  customer_id?: string;
  ephemeral_key_secret?: string;
}

export interface ConfirmTipResponse {
  success: boolean;
  message?: string;
}

export async function createTip(
  session: Session | null,
  payload: CreateTipRequest
): Promise<CreateTipResponse> {
  if (!session?.access_token) {
    throw new Error('You must be signed in to send a tip.');
  }

  return apiFetch<CreateTipResponse>('/api/payments/create-tip', {
    method: 'POST',
    session,
    body: JSON.stringify(payload),
  });
}

export async function confirmTip(
  session: Session | null,
  paymentIntentId: string
): Promise<ConfirmTipResponse> {
  if (!session?.access_token) {
    throw new Error('You must be signed in to confirm a tip.');
  }

  return apiFetch<ConfirmTipResponse>('/api/payments/confirm-tip', {
    method: 'POST',
    session,
    body: JSON.stringify({ paymentIntentId }),
  });
}

