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
}

export interface CreateTipResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  tipId: string;
  platformFee: number;
  creatorEarnings: number;
  message?: string;
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

