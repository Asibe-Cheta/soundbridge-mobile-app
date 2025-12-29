import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import RevenueCatService from './RevenueCatService';
import { config } from '../config/environment';
import {
  getStorageQuotaCached,
  StorageQuota,
  StorageTier,
  invalidateStorageCache,
} from './StorageQuotaService';

export type UploadQuota = {
  tier: string;
  upload_limit: number | null;
  uploads_this_month: number;
  remaining: number | null;
  reset_date: string | null;
  is_unlimited: boolean;
  can_upload: boolean;
  // Storage-based quota (new)
  storage?: StorageQuota;
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
 * Also invalidates storage cache
 */
export function invalidateQuotaCache(): void {
  quotaCache = null;
  invalidateStorageCache(); // Also invalidate storage cache
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
  console.log('🔍 User ID:', userId);
  console.log('🔍 bypassRevenueCat:', config.bypassRevenueCat);
  console.log('🔍 developmentTier:', config.developmentTier);
  let backendQuota: UploadQuota | null = null;

  // Development bypass: Use hardcoded tier
  if (config.bypassRevenueCat && config.developmentTier) {
    console.log('🔧 DEVELOPMENT MODE: Using hardcoded tier for upload quota');
    console.log(`🔧 Hardcoded tier: ${config.developmentTier.toUpperCase()}`);

    const tier = config.developmentTier;
    const tierForStorage: StorageTier = tier === 'unlimited' ? 'unlimited' : tier === 'premium' ? 'premium' : 'free';
    const storageQuota = await getStorageQuotaCached(userId, tierForStorage, forceRefresh);

    const quota: UploadQuota = {
      tier,
      upload_limit: tier === 'free' ? 3 : null,
      uploads_this_month: 0,
      remaining: tier === 'free' ? 3 : null,
      reset_date: null,
      is_unlimited: tier === 'unlimited',
      can_upload: storageQuota.can_upload,
      storage: storageQuota,
    };

    setCachedQuota(userId, quota);
    return quota;
  }

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
    console.log('🎯 RevenueCat entitlements:', Object.keys(customerInfo.entitlements.active));

    if (tier === 'unlimited') {
      // Unlimited tier: storage-based only (10GB)
      const storageQuota = await getStorageQuotaCached(userId, 'unlimited', forceRefresh);
      const quota: UploadQuota = {
        tier: 'unlimited',
        upload_limit: null,
        uploads_this_month: backendQuota?.uploads_this_month ?? 0,
        remaining: null,
        reset_date: null,
        is_unlimited: true,
        can_upload: storageQuota.can_upload, // Storage-based check
        storage: storageQuota,
      };
      setCachedQuota(userId, quota);
      return quota;
    } else if (tier === 'premium') {
      // Premium tier: storage-based (2GB), unlimited uploads
      const storageQuota = await getStorageQuotaCached(userId, 'premium', forceRefresh);
      const uploadsUsed = backendQuota?.uploads_this_month ?? 0;

      const quota: UploadQuota = {
        tier: 'premium',
        upload_limit: null, // Changed from 7 to null (unlimited uploads, storage-limited)
        uploads_this_month: uploadsUsed,
        remaining: null, // No longer count-based
        reset_date: backendQuota?.reset_date || null,
        is_unlimited: false,
        can_upload: storageQuota.can_upload, // Storage-based check
        storage: storageQuota,
      };
      setCachedQuota(userId, quota);
      return quota;
    }
  }

  // Fall back to backend quota if available
  if (backendQuota) {
    console.log('📋 Using backend quota');
    console.log('📋 Backend tier (raw):', backendQuota.tier);

    // Normalize legacy tier names
    const normalizedTier =
      backendQuota.tier === 'pro' ? 'premium' :
      backendQuota.tier === 'enterprise' ? 'unlimited' :
      backendQuota.tier;

    console.log('📋 Backend tier (normalized):', normalizedTier);
    console.log('📋 Backend upload_limit:', backendQuota.upload_limit);

    // Add storage quota based on normalized tier
    const tierForStorage: StorageTier =
      normalizedTier === 'unlimited' ? 'unlimited' :
      normalizedTier === 'premium' ? 'premium' : 'free';

    const storageQuota = await getStorageQuotaCached(userId, tierForStorage, forceRefresh);

    const quotaWithStorage: UploadQuota = {
      ...backendQuota,
      tier: normalizedTier, // Use normalized tier instead of raw backend tier
      can_upload: storageQuota.can_upload, // Override with storage-based check
      storage: storageQuota,
    };

    setCachedQuota(userId, quotaWithStorage);
    return quotaWithStorage;
  }

  // Last resort: return Free tier defaults
  console.warn('⚠️ No quota available, using Free tier defaults');
  console.warn('⚠️ Backend quota was:', backendQuota);
  console.warn('⚠️ RevenueCat result was:', revenueCatResult.status);
  const storageQuota = await getStorageQuotaCached(userId, 'free', forceRefresh);

  const defaultQuota: UploadQuota = {
    tier: 'free',
    upload_limit: 3, // Free tier: 3 uploads lifetime
    uploads_this_month: 0,
    remaining: 3,
    reset_date: null,
    is_unlimited: false,
    can_upload: storageQuota.can_upload && storageQuota.storage_used < 3, // Storage + count check
    storage: storageQuota,
  };
  setCachedQuota(userId, defaultQuota);
  return defaultQuota;
}
