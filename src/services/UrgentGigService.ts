// src/services/UrgentGigService.ts
// C1 — Urgent gig lifecycle: create, respond, select, complete.
// All new endpoints return { success: boolean, data: T }.

import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';
import type { UrgentGig, GigResponse } from '../types/urgent-gig.types';

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface CreateUrgentGigRequest {
  skill_required: string;
  date_needed: string;           // ISO datetime
  payment_amount: number;
  location_lat: number;
  location_lng: number;
  // Optional
  genre?: string[];
  duration_hours?: number;
  location_address?: string;
  location_radius_km?: number;
  payment_currency?: string;
  description?: string;
  title?: string;
}

export interface CreateUrgentGigResult {
  gig_id: string;
  stripe_client_secret: string;
  estimated_matches: number;
  customer_id?: string;
  ephemeral_key_secret?: string;
}

export interface SelectProviderResult {
  project_id: string;
}

export interface CompleteGigResult {
  released_amount: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class UrgentGigService {
  /**
   * POST /api/gigs/urgent
   * Creates an urgent gig and returns a Stripe PaymentIntent client secret.
   * Mobile must present the Payment Sheet before the gig goes live.
   */
  async createUrgentGig(data: CreateUrgentGigRequest): Promise<CreateUrgentGigResult> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<CreateUrgentGigResult>>(
      '/api/gigs/urgent',
      {
        method: 'POST',
        body: JSON.stringify(data),
        session,
      }
    );
    return result.data;
  }

  /**
   * GET /api/gigs/urgent/:id
   * Full gig details for the requester or a notified provider.
   * Includes distance_km when the authenticated user is a provider.
   */
  async getGigDetails(gigId: string): Promise<UrgentGig> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<UrgentGig>>(
      `/api/gigs/urgent/${gigId}`,
      { session }
    );
    return result.data;
  }

  /**
   * GET /api/gigs/urgent/:id/responses
   * Requester-only: list of accepted/pending/declined responses with provider profiles.
   */
  async getGigResponses(gigId: string): Promise<GigResponse[]> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<GigResponse[]>>(
      `/api/gigs/urgent/${gigId}/responses`,
      { session }
    );
    return result.data ?? [];
  }

  /**
   * POST /api/gigs/:id/respond
   * Provider: accept or decline a gig.
   */
  async respondToGig(
    gigId: string,
    action: 'accept' | 'decline',
    message?: string
  ): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    await apiFetch('/api/gigs/:id/respond'.replace(':id', gigId), {
      method: 'POST',
      body: JSON.stringify({ action, ...(message ? { message } : {}) }),
      session,
    });
  }

  /**
   * POST /api/gigs/:id/select
   * Requester: select a provider by their response_id.
   * Returns { project_id } — use for agreement/chat/completion flow.
   */
  async selectProvider(gigId: string, responseId: string): Promise<SelectProviderResult> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<SelectProviderResult>>(
      `/api/gigs/${gigId}/select`,
      {
        method: 'POST',
        body: JSON.stringify({ response_id: responseId }),
        session,
      }
    );
    return result.data;
  }

  /**
   * POST /api/gigs/:id/complete
   * Either party: mark gig complete.
   * Backend captures PaymentIntent, transfers to provider, credits wallet.
   */
  async markComplete(gigId: string): Promise<CompleteGigResult> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<CompleteGigResult>>(
      `/api/gigs/${gigId}/complete`,
      {
        method: 'POST',
        session,
      }
    );
    return result.data;
  }

  /**
   * Called immediately after a successful Payment Sheet.
   * POST /api/gigs/:id/confirm-payment
   * Backend verifies the PaymentIntent with Stripe, advances payment_status to
   * 'escrowed', sets urgent_status to 'searching', and sends push notifications
   * to matched providers. Belt-and-suspenders alongside the Stripe webhook.
   */
  async confirmPayment(gigId: string): Promise<UrgentGig> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<UrgentGig>>(
      `/api/gigs/${gigId}/confirm-payment`,
      { method: 'POST', session }
    );
    return result.data;
  }

  /**
   * GET /api/gigs/my
   * Current user's posted urgent gigs.
   */
  async getMyGigs(): Promise<UrgentGig[]> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<UrgentGig[]>>(
      '/api/gigs/my',
      { session }
    );
    return result.data ?? [];
  }

  /**
   * GET /api/gigs/available
   * Gigs matched to the current provider by skill/location/availability.
   */
  async getAvailableGigs(): Promise<UrgentGig[]> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const result = await apiFetch<ApiResponse<UrgentGig[]>>(
      '/api/gigs/available',
      { session }
    );
    return result.data ?? [];
  }
}

export const urgentGigService = new UrgentGigService();
