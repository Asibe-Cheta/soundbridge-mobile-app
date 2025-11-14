import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export type UploadQuota = {
  tier: string;
  upload_limit: number | null;
  uploads_this_month: number;
  remaining: number | null;
  reset_date: string | null;
  is_unlimited: boolean;
  can_upload: boolean;
};

type UploadQuotaResponse = {
  success: boolean;
  quota?: UploadQuota;
  message?: string;
};

/**
 * Get upload quota for the authenticated user
 * Uses Bearer token authentication only (per web team specification)
 * 
 * @param session - Supabase session containing access token
 * @returns Upload quota information or null if failed
 */
export async function getUploadQuota(session: Session | null): Promise<UploadQuota | null> {
  if (!session?.access_token) {
    console.warn('UploadQuotaService: No session or access token');
    return null;
  }

  try {
    // Use Bearer token authentication only (endpoint now supports Bearer tokens)
    // Per web team: endpoint updated to use getSupabaseRouteClient() which supports Bearer tokens
    const response = await apiFetch<UploadQuotaResponse>('/api/upload/quota', {
      method: 'GET',
      session,
    });

    if (!response.success || !response.quota) {
      console.warn('UploadQuotaService: Invalid response', response);
      return null;
    }

    return response.quota;
  } catch (error: any) {
    // Log more details about the error
    console.warn('UploadQuotaService: failed to load quota', {
      error: error?.message,
      status: error?.status,
      url: '/api/upload/quota',
      hasSession: !!session,
      hasToken: !!session?.access_token,
    });
    
    // Handle 401 - token expired or invalid
    if (error?.status === 401) {
      console.warn('UploadQuotaService: Authentication failed - token may be expired');
    }
    
    return null;
  }
}



