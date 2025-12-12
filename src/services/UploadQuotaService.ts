import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import RevenueCatService from './RevenueCatService';

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
 * Uses RevenueCat as source of truth for Pro status, falls back to backend
 *
 * @param session - Supabase session containing access token
 * @returns Upload quota information or null if failed
 */
export async function getUploadQuota(session: Session | null): Promise<UploadQuota | null> {
  if (!session?.access_token) {
    console.warn('UploadQuotaService: No session or access token');
    return null;
  }

  let backendQuota: UploadQuota | null = null;

  try {
    // First, try to get quota from backend
    console.log('🔍 UploadQuotaService: Fetching quota from backend...');
    const response = await apiFetch<UploadQuotaResponse>('/api/upload/quota', {
      method: 'GET',
      session,
    });

    if (response.success && response.quota) {
      backendQuota = response.quota;
      console.log('📊 Backend quota:', {
        tier: backendQuota.tier,
        limit: backendQuota.upload_limit,
        used: backendQuota.uploads_this_month,
      });
    }
  } catch (error: any) {
    console.warn('UploadQuotaService: Backend quota fetch failed', {
      error: error?.message,
      status: error?.status,
    });
  }

  // Check RevenueCat for tier status (source of truth)
  try {
    console.log('🔍 UploadQuotaService: Checking RevenueCat for tier status...');

    if (RevenueCatService.isReady()) {
      const customerInfo = await RevenueCatService.getCustomerInfo();

      if (customerInfo) {
        const tier = RevenueCatService.getUserTier(customerInfo);
        console.log('🎯 RevenueCat tier:', tier);

        if (tier === 'unlimited') {
          // Unlimited tier: no limits
          console.log('✅ Using Unlimited quota from RevenueCat (overriding backend)');
          return {
            tier: 'unlimited',
            upload_limit: null,
            uploads_this_month: backendQuota?.uploads_this_month ?? 0,
            remaining: null,
            reset_date: null,
            is_unlimited: true,
            can_upload: true,
          };
        } else if (tier === 'premium') {
          // Premium tier: 7 uploads per month (resets on renewal date)
          console.log('✅ Using Premium quota from RevenueCat (overriding backend)');
          
          // Note: Reset date should come from backend (subscription renewal date)
          // For now, use backend's reset_date if available
          const resetDate = backendQuota?.reset_date || null;
          const uploadsUsed = backendQuota?.uploads_this_month ?? 0;
          const limit = 7;

          return {
            tier: 'premium',
            upload_limit: limit,
            uploads_this_month: uploadsUsed,
            remaining: limit - uploadsUsed,
            reset_date: resetDate,
            is_unlimited: false,
            can_upload: uploadsUsed < limit,
          };
        }
      }
    } else {
      console.warn('⚠️ RevenueCat not ready, using backend quota');
    }
  } catch (error) {
    console.error('❌ RevenueCat check failed:', error);
  }

  // Fall back to backend quota if available
  if (backendQuota) {
    console.log('📋 Using backend quota');
    return backendQuota;
  }

  // Last resort: return Free tier defaults (3 lifetime uploads)
  console.warn('⚠️ No quota available from backend or RevenueCat, using Free tier defaults');
  return {
    tier: 'free',
    upload_limit: 3,
    uploads_this_month: 0,
    remaining: 3,
    reset_date: null, // Lifetime limit, no reset
    is_unlimited: false,
    can_upload: true,
  };
}



