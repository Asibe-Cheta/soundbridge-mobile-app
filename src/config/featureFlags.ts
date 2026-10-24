// Early access feature flags (Phase 3 item 2 of the Premium/Unlimited tier
// build-out). Hardcoded, not a database table — flipping a flag means
// editing this file and publishing an OTA update, not a live remote toggle.
// Chosen over a new table since OTA ships in minutes and this avoids any
// new backend/schema work for what is, today, just a handful of flags.

export type UserTier = 'free' | 'premium' | 'unlimited';

interface FeatureFlagDefinition {
  /** Minimum tier that can see this feature while it's enabled. */
  minTier: UserTier;
  /** Master switch. False hides the feature from everyone, regardless of tier. */
  enabled: boolean;
}

// Example flag, off by default — delete once a real one replaces it, or
// leave as a template for how to add the next one.
export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  example_early_access_feature: {
    minTier: 'premium',
    enabled: false,
  },
};

const TIER_RANK: Record<UserTier, number> = { free: 0, premium: 1, unlimited: 2 };

/**
 * True if `flagName` is enabled and `userTier` meets its minimum tier.
 * Unknown flag names, or a disabled flag, always return false.
 */
export function isFeatureEnabled(flagName: string, userTier: UserTier | null | undefined): boolean {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag || !flag.enabled) return false;
  const userRank = TIER_RANK[userTier ?? 'free'] ?? 0;
  return userRank >= TIER_RANK[flag.minTier];
}
