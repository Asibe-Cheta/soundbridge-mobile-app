import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';

/**
 * Storage-Based Tier System
 * Replaces monthly upload count limits with storage-based limits
 */

// Storage limits in bytes
export const STORAGE_LIMITS = {
  free: 30 * 1024 * 1024,       // 30MB
  premium: 2 * 1024 * 1024 * 1024,  // 2GB
  unlimited: 10 * 1024 * 1024 * 1024, // 10GB
} as const;

// Human-readable storage limits
export const STORAGE_LIMITS_FORMATTED = {
  free: '30MB',
  premium: '2GB',
  unlimited: '10GB',
} as const;

// Approximate track counts (assuming 10MB per track average)
export const APPROXIMATE_TRACK_COUNTS = {
  free: '~3 tracks',
  premium: '~200 tracks',
  unlimited: '~1000 tracks',
} as const;

export type StorageTier = 'free' | 'premium' | 'unlimited';

export interface StorageQuota {
  tier: StorageTier;
  storage_limit: number; // in bytes
  storage_used: number; // in bytes
  storage_available: number; // in bytes
  storage_percent_used: number; // 0-100
  can_upload: boolean;
  storage_limit_formatted: string;
  storage_used_formatted: string;
  storage_available_formatted: string;
  approximate_tracks: string;
  is_unlimited_tier: boolean;
  // Grace period fields
  in_grace_period?: boolean;
  grace_period_ends?: string | null;
  grace_days_remaining?: number;
  storage_status?: 'active_subscription' | 'grace_period' | 'grace_expired';
}

export interface StorageCheckResult {
  can_upload: boolean;
  reason?: string;
  storage_quota: StorageQuota;
  file_size_formatted?: string;
}

/**
 * Format bytes to human-readable format
 * Examples: 1024 -> "1 KB", 1536 -> "1.5 KB", 1048576 -> "1 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  // Remove unnecessary decimals (1.00 MB -> 1 MB)
  return `${size % 1 === 0 ? size.toFixed(0) : size} ${sizes[i]}`;
}

/**
 * Parse file size from human-readable format to bytes
 * Examples: "10 MB" -> 10485760, "1.5 GB" -> 1610612736
 */
export function parseBytes(sizeStr: string): number {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeStr.trim().match(/^(\d+\.?\d*)\s*([A-Z]+)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  return Math.floor(value * (units[unit] || 1));
}

/**
 * Get storage limit in bytes for a given tier
 */
export function getStorageLimit(tier: StorageTier): number {
  return STORAGE_LIMITS[tier] || STORAGE_LIMITS.free;
}

/**
 * Get grace period status for a user
 * Returns null if no grace period, otherwise returns grace period info
 */
export async function getGracePeriodStatus(userId: string): Promise<{
  in_grace_period: boolean;
  grace_period_ends: string | null;
  grace_days_remaining: number;
  storage_status: 'active_subscription' | 'grace_period' | 'grace_expired';
  storage_at_downgrade: number | null;
} | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('grace_period_ends, downgraded_at, storage_at_downgrade')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.warn('⚠️ Could not fetch grace period status:', error);
      return null;
    }

    // No grace period active
    if (!profile.grace_period_ends) {
      return {
        in_grace_period: false,
        grace_period_ends: null,
        grace_days_remaining: 0,
        storage_status: 'active_subscription',
        storage_at_downgrade: null,
      };
    }

    const now = new Date();
    const graceEnd = new Date(profile.grace_period_ends);
    const daysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Grace period active
    if (now < graceEnd) {
      return {
        in_grace_period: true,
        grace_period_ends: profile.grace_period_ends,
        grace_days_remaining: daysRemaining,
        storage_status: 'grace_period',
        storage_at_downgrade: profile.storage_at_downgrade,
      };
    }

    // Grace period expired
    return {
      in_grace_period: false,
      grace_period_ends: profile.grace_period_ends,
      grace_days_remaining: 0,
      storage_status: 'grace_expired',
      storage_at_downgrade: profile.storage_at_downgrade,
    };
  } catch (error) {
    console.error('❌ Exception checking grace period status:', error);
    return null;
  }
}

/**
 * Calculate user's current storage usage
 * Queries all audio_tracks where deleted_at IS NULL and sums file_size
 */
export async function calculateStorageUsage(userId: string): Promise<number> {
  try {
    console.log('📊 Calculating storage usage for user:', userId);

    // Query all tracks for this user that aren't deleted
    const { data, error } = await supabase
      .from('audio_tracks')
      .select('file_size')
      .eq('creator_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Error calculating storage usage:', error);
      // Return 0 on error to prevent blocking uploads due to calculation failure
      return 0;
    }

    if (!data || data.length === 0) {
      console.log('✅ No tracks found, storage usage: 0');
      return 0;
    }

    // Sum all file sizes (handle null/undefined values)
    const totalBytes = data.reduce((sum, track) => {
      const fileSize = track.file_size || 0;
      return sum + fileSize;
    }, 0);

    console.log(`✅ Storage usage calculated: ${formatBytes(totalBytes)} (${data.length} tracks)`);
    return totalBytes;

  } catch (error) {
    console.error('❌ Exception calculating storage usage:', error);
    return 0;
  }
}

/**
 * Get storage quota for user based on their tier
 * Includes grace period information if applicable
 */
export async function getStorageQuota(
  userId: string,
  tier: StorageTier
): Promise<StorageQuota> {
  // Development bypass: Override tier if bypassRevenueCat is enabled
  let effectiveTier = tier;
  if (config.bypassRevenueCat && config.developmentTier) {
    effectiveTier = config.developmentTier as StorageTier;
    console.log(`🔧 STORAGE: Overriding tier ${tier} → ${effectiveTier} (development mode)`);
  }

  const storageLimit = getStorageLimit(effectiveTier);
  const storageUsed = await calculateStorageUsage(userId);
  const storageAvailable = Math.max(0, storageLimit - storageUsed);
  const storagePercentUsed = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  // Check grace period status
  const gracePeriodStatus = await getGracePeriodStatus(userId);

  // Can upload if:
  // 1. Storage available > 0 (under limit)
  // 2. NOT in grace period (even if under limit during grace, can't upload)
  const canUpload = storageAvailable > 0 &&
    (!gracePeriodStatus || gracePeriodStatus.storage_status === 'active_subscription');

  return {
    tier: effectiveTier,
    storage_limit: storageLimit,
    storage_used: storageUsed,
    storage_available: storageAvailable,
    storage_percent_used: Math.min(100, storagePercentUsed),
    can_upload: canUpload,
    storage_limit_formatted: STORAGE_LIMITS_FORMATTED[effectiveTier],
    storage_used_formatted: formatBytes(storageUsed),
    storage_available_formatted: formatBytes(storageAvailable),
    approximate_tracks: APPROXIMATE_TRACK_COUNTS[effectiveTier],
    is_unlimited_tier: effectiveTier === 'unlimited',
    // Grace period info
    in_grace_period: gracePeriodStatus?.in_grace_period || false,
    grace_period_ends: gracePeriodStatus?.grace_period_ends || null,
    grace_days_remaining: gracePeriodStatus?.grace_days_remaining || 0,
    storage_status: gracePeriodStatus?.storage_status || 'active_subscription',
  };
}

/**
 * Check if user can upload a file of given size
 * Returns detailed result with quota information
 */
export async function checkStorageQuota(
  userId: string,
  tier: StorageTier,
  fileSize: number
): Promise<StorageCheckResult> {
  const quota = await getStorageQuota(userId, tier);

  // Check if file would exceed storage limit
  const wouldExceed = (quota.storage_used + fileSize) > quota.storage_limit;

  if (wouldExceed) {
    return {
      can_upload: false,
      reason: `Storage limit exceeded. This file (${formatBytes(fileSize)}) would put you at ${formatBytes(quota.storage_used + fileSize)}, exceeding your ${quota.storage_limit_formatted} limit.`,
      storage_quota: quota,
      file_size_formatted: formatBytes(fileSize),
    };
  }

  return {
    can_upload: true,
    storage_quota: quota,
    file_size_formatted: formatBytes(fileSize),
  };
}

/**
 * Get storage warning level based on percentage used
 * Returns: 'safe' (< 80%), 'warning' (80-90%), 'critical' (> 90%)
 */
export function getStorageWarningLevel(percentUsed: number): 'safe' | 'warning' | 'critical' {
  if (percentUsed >= 90) return 'critical';
  if (percentUsed >= 80) return 'warning';
  return 'safe';
}

/**
 * Get storage warning message based on usage level
 */
export function getStorageWarningMessage(quota: StorageQuota): string | null {
  const level = getStorageWarningLevel(quota.storage_percent_used);

  if (level === 'critical') {
    return `Almost out of storage! You've used ${quota.storage_used_formatted} of ${quota.storage_limit_formatted}. Delete old files or upgrade.`;
  }

  if (level === 'warning') {
    return `Running low on storage. You've used ${quota.storage_used_formatted} of ${quota.storage_limit_formatted}. Consider managing your files.`;
  }

  return null;
}

/**
 * Get upgrade suggestion based on current tier and storage usage
 */
export function getUpgradeSuggestion(quota: StorageQuota): string | null {
  if (quota.tier === 'unlimited') {
    // Already on highest tier, no upgrade suggestion
    return null;
  }

  if (quota.tier === 'free' && quota.storage_percent_used >= 80) {
    return 'Upgrade to Premium for 2GB storage (66× more!) for just £6.99/month!';
  }

  if (quota.tier === 'premium' && quota.storage_percent_used >= 80) {
    return 'Upgrade to Unlimited for 10GB storage (~1000 tracks) for just £12.99/month!';
  }

  return null;
}

/**
 * Cache storage quota to reduce database queries
 * Cache duration: 2 minutes
 */
const STORAGE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

interface StorageCache {
  quota: StorageQuota;
  timestamp: number;
  userId: string;
}

let storageCache: StorageCache | null = null;

/**
 * Get cached storage quota if available and valid
 */
export function getCachedStorageQuota(userId: string): StorageQuota | null {
  if (!storageCache || storageCache.userId !== userId) {
    return null;
  }

  const now = Date.now();
  const age = now - storageCache.timestamp;

  if (age < STORAGE_CACHE_DURATION) {
    console.log(`⚡ Using cached storage quota (${Math.round(age / 1000)}s old)`);
    return storageCache.quota;
  }

  // Cache expired
  storageCache = null;
  return null;
}

/**
 * Save storage quota to cache
 */
export function setCachedStorageQuota(userId: string, quota: StorageQuota): void {
  storageCache = {
    quota,
    timestamp: Date.now(),
    userId,
  };
}

/**
 * Invalidate storage cache (call after uploading or deleting a track)
 */
export function invalidateStorageCache(): void {
  storageCache = null;
  console.log('🗑️ Storage quota cache invalidated');
}

/**
 * Get storage quota with caching
 */
export async function getStorageQuotaCached(
  userId: string,
  tier: StorageTier,
  forceRefresh: boolean = false
): Promise<StorageQuota> {
  if (!forceRefresh) {
    const cached = getCachedStorageQuota(userId);
    if (cached && cached.tier === tier) {
      return cached;
    }
  }

  console.log('🔍 Fetching fresh storage quota...');
  const quota = await getStorageQuota(userId, tier);
  setCachedStorageQuota(userId, quota);
  return quota;
}
