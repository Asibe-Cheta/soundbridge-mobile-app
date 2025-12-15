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

// Cache configuration
const QUOTA_CACHE_KEY = 'upload_quota_cache';
const QUOTA_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

interface QuotaCache {
  quota: UploadQuota;
  timestamp: number;
  userId: string;
}

// In-memory cache
let quotaCache: QuotaCache | null = null;

/**
 * Get cached quota if available and valid
 */
function getCachedQuota(userId: string): UploadQuota | null {
  if (!quotaCache || quotaCache.userId !== userId) {
    return null;
  }

  const now = Date.now();
  const age = now - quotaCache.timestamp;

  if (age < QUOTA_CACHE_DURATION) {
    console.log(`⚡ Using cached quota (${Math.round(age / 1000)}s old)`);
    return quotaCache.quota;
  }

  // Cache expired
  quotaCache = null;
  return null;
}

/**
 * Save quota to cache
 */
function setCachedQuota(userId: string, quota: UploadQuota): void {
  quotaCache = {
    quota,
    timestamp: Date.now(),
    userId,
  };
}

/**
 * Invalidate quota cache (call after uploading a track)
 */
export function invalidateQuotaCache(): void {
  quotaCache = null;
  console.log('🗑️ Upload quota cache invalidated');
}

/**
 * Get upload quota for the authenticated user
 * Uses RevenueCat as source of truth for Pro status, falls back to backend
 * Includes 2-minute caching to reduce API calls
 *
 * @param session - Supabase session containing access token
 * @param forceRefresh - Skip cache and force fresh API call
 * @returns Upload quota information or null if failed
 */
export async function getUploadQuota(
  session: Session | null,
  forceRefresh: boolean = false
): Promise<UploadQuota | null> {
  if (!session?.access_token) {
    console.warn('UploadQuotaService: No session or access token');
    return null;
  }

  const userId = session.user?.id;
  if (!userId) {
    console.warn('UploadQuotaService: No user ID in session');
    return null;
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCachedQuota(userId);
    if (cached) {
      return cached;
    }
  }

  console.log('🔍 UploadQuotaService: Fetching fresh quota...');
  let backendQuota: UploadQuota | null = null;

  // Run backend API call and RevenueCat check in parallel
  const [backendResult, revenueCatResult] = await Promise.allSettled([
    // Backend API call
    (async () => {
      try {
        const response = await apiFetch<UploadQuotaResponse>('/api/upload/quota', {
          method: 'GET',
          session,
        });

        if (response.success && response.quota) {
          console.log('📊 Backend quota:', {
            tier: response.quota.tier,
            limit: response.quota.upload_limit,
            used: response.quota.uploads_this_month,
          });
          return response.quota;
        }
        return null;
      } catch (error: any) {
        console.warn('UploadQuotaService: Backend quota fetch failed', {
          error: error?.message,
          status: error?.status,
        });
        return null;
      }
    })(),

    // RevenueCat check
    (async () => {
      try {
        if (RevenueCatService.isReady()) {
          const customerInfo = await RevenueCatService.getCustomerInfo();
          if (customerInfo) {
            return {
              tier: RevenueCatService.getUserTier(customerInfo),
              customerInfo,
            };
          }
        }
        return null;
      } catch (error) {
        console.error('❌ RevenueCat check failed:', error);
        return null;
      }
    })(),
  ]);

  // Extract backend quota if available
  if (backendResult.status === 'fulfilled' && backendResult.value) {
    backendQuota = backendResult.value;
  }

  // Check RevenueCat result for tier override
  if (revenueCatResult.status === 'fulfilled' && revenueCatResult.value) {
    const { tier, customerInfo } = revenueCatResult.value;
    console.log('🎯 RevenueCat tier:', tier);

    if (tier === 'unlimited') {
      // Unlimited tier: no limits
      const quota: UploadQuota = {
        tier: 'unlimited',
        upload_limit: null,
        uploads_this_month: backendQuota?.uploads_this_month ?? 0,
        remaining: null,
        reset_date: null,
        is_unlimited: true,
        can_upload: true,
      };
      setCachedQuota(userId, quota);
      return quota;
    } else if (tier === 'premium') {
      // Premium tier: 7 uploads per month
      const uploadsUsed = backendQuota?.uploads_this_month ?? 0;
      const limit = 7;
      const quota: UploadQuota = {
        tier: 'premium',
        upload_limit: limit,
        uploads_this_month: uploadsUsed,
        remaining: limit - uploadsUsed,
        reset_date: backendQuota?.reset_date || null,
        is_unlimited: false,
        can_upload: uploadsUsed < limit,
      };
      setCachedQuota(userId, quota);
      return quota;
    }
  }

  // Fall back to backend quota if available
  if (backendQuota) {
    console.log('📋 Using backend quota');
    setCachedQuota(userId, backendQuota);
    return backendQuota;
  }

  // Last resort: return Free tier defaults
  console.warn('⚠️ No quota available, using Free tier defaults');
  const defaultQuota: UploadQuota = {
    tier: 'free',
    upload_limit: 3,
    uploads_this_month: 0,
    remaining: 3,
    reset_date: null,
    is_unlimited: false,
    can_upload: true,
  };
  setCachedQuota(userId, defaultQuota);
  return defaultQuota;
}
