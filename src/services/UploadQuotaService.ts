import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import RevenueCatService from './RevenueCatService';
import { config } from '../config/environment';
import { supabase } from '../lib/supabase';
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
  console.log('🔍 useProfileTier:', (config as any).useProfileTier);
  let backendQuota: UploadQuota | null = null;

  // Development bypass: Use profile tier from database or hardcoded tier
  if (config.bypassRevenueCat) {
    let tier: StorageTier = 'free';

    // Option 1: Use tier from user profile in database
    if ((config as any).useProfileTier) {
      console.log('🔧 DEVELOPMENT MODE: Fetching tier from user profile...');
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn('⚠️ Failed to fetch profile tier:', error.message);
        } else if (profile?.subscription_tier) {
          tier = profile.subscription_tier as StorageTier;
          console.log(`✅ Profile tier from database: ${tier.toUpperCase()}`);
        } else {
          console.log('⚠️ No subscription_tier in profile, defaulting to FREE');
        }
      } catch (e) {
        console.error('❌ Error fetching profile tier:', e);
      }
    }
    // Option 2: Use hardcoded development tier
    else if (config.developmentTier) {
      tier = config.developmentTier;
      console.log(`🔧 Using hardcoded tier: ${tier.toUpperCase()}`);
    }

    console.log(`🔧 DEVELOPMENT MODE: Final tier = ${tier.toUpperCase()}`);

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
  // IMPORTANT: RevenueCat is the source of truth for subscription status
  // It overrides database tier which may be stale if webhooks failed
  if (revenueCatResult.status === 'fulfilled' && revenueCatResult.value) {
    const { tier, customerInfo } = revenueCatResult.value;
    console.log('🎯 RevenueCat tier:', tier);
    console.log('🎯 RevenueCat entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('🎯 RevenueCat active subscriptions:', customerInfo.activeSubscriptions);
    console.log('🎯 RevenueCat all purchased product IDs:', customerInfo.allPurchasedProductIdentifiers);

    // Auto-sync database if RevenueCat tier differs from backend tier
    // Only sync when RevenueCat indicates a paid tier to avoid downgrading
    // users who are paid via web (Stripe) but not in RevenueCat.
    const backendTier = backendQuota?.tier?.toLowerCase();
    if (tier !== 'free' && (!backendTier || backendTier !== tier)) {
      console.log(`⚠️ Tier mismatch detected! RevenueCat: ${tier}, Database: ${backendTier}`);
      console.log('🔄 Auto-syncing database to match RevenueCat...');

      try {
        const { error: syncError } = await supabase
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (syncError) {
          console.error('❌ Failed to sync database:', syncError.message);
        } else {
          console.log(`✅ Database synced: subscription_tier = ${tier}`);
        }
      } catch (syncErr) {
        console.error('❌ Exception syncing database:', syncErr);
      }
    }

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
    } else {
      // RevenueCat says free — but check for early adopter premium grant before downgrading
      // Early adopters received 3 months free premium via manual DB grant (not RevenueCat)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, early_adopter, subscription_period_end')
          .eq('id', userId)
          .single();

        const isEarlyAdopterPremium =
          profile?.early_adopter === true &&
          (profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'unlimited') &&
          (!profile?.subscription_period_end || new Date(profile.subscription_period_end) > new Date());

        if (isEarlyAdopterPremium) {
          const grantedTier = profile.subscription_tier as StorageTier;
          console.log(`🎁 Early adopter premium grant active — honouring ${grantedTier} tier (RevenueCat override skipped)`);
          const storageQuota = await getStorageQuotaCached(userId, grantedTier, forceRefresh);
          const quota: UploadQuota = {
            tier: grantedTier,
            upload_limit: null,
            uploads_this_month: backendQuota?.uploads_this_month ?? 0,
            remaining: null,
            reset_date: profile.subscription_period_end || null,
            is_unlimited: grantedTier === 'unlimited',
            can_upload: storageQuota.can_upload,
            storage: storageQuota,
          };
          setCachedQuota(userId, quota);
          return quota;
        }
      } catch (e) {
        console.warn('⚠️ Could not check early adopter status:', e);
      }

      // Free tier from RevenueCat - subscription expired or never purchased
      console.log('🎯 RevenueCat says FREE - using free tier');
      const storageQuota = await getStorageQuotaCached(userId, 'free', forceRefresh);
      const quota: UploadQuota = {
        tier: 'free',
        upload_limit: 3,
        uploads_this_month: backendQuota?.uploads_this_month ?? 0,
        remaining: 3 - (backendQuota?.uploads_this_month ?? 0),
        reset_date: null,
        is_unlimited: false,
        can_upload: storageQuota.can_upload,
        storage: storageQuota,
      };
      setCachedQuota(userId, quota);
      return quota;
    }
  }

  // Before falling back, check if this is an early adopter with a DB-granted premium tier.
  // This covers the case where RevenueCat was unavailable (returned null) so the RC branch
  // above was never entered — the early adopter check there would have been skipped entirely.
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, early_adopter, subscription_period_end')
      .eq('id', userId)
      .single();

    const isEarlyAdopterPremium =
      profile?.early_adopter === true &&
      (profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'unlimited') &&
      (!profile?.subscription_period_end || new Date(profile.subscription_period_end) > new Date());

    if (isEarlyAdopterPremium) {
      const grantedTier = profile.subscription_tier as StorageTier;
      console.log(`🎁 Early adopter fallback — honouring ${grantedTier} tier (RC was unavailable)`);
      const storageQuota = await getStorageQuotaCached(userId, grantedTier, forceRefresh);
      const quota: UploadQuota = {
        tier: grantedTier,
        upload_limit: null,
        uploads_this_month: backendQuota?.uploads_this_month ?? 0,
        remaining: null,
        reset_date: profile.subscription_period_end || null,
        is_unlimited: grantedTier === 'unlimited',
        can_upload: storageQuota.can_upload,
        storage: storageQuota,
      };
      setCachedQuota(userId, quota);
      return quota;
    }
  } catch (e) {
    console.warn('⚠️ Could not check early adopter status (fallback):', e);
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
