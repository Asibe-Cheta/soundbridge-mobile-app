/**
 * Early adopter utility functions.
 * Aligned with web team spec in MOBILE_TEAM_EARLY_ADOPTER_PREMIUM_EXPIRY_RESPONSE.MD
 */

/** Handle legacy tier values ('pro' → 'premium', 'enterprise' → 'unlimited'). */
export function normalizeTier(tier: string | null | undefined): string {
  const t = (tier ?? 'free').toLowerCase();
  if (t === 'pro') return 'premium';
  if (t === 'enterprise') return 'unlimited';
  return t;
}

interface GrantProfile {
  subscription_period_end?: string | null;
  subscription_renewal_date?: string | null;
}

/**
 * Returns the end of the early-adopter grant as a Date.
 * Falls back to subscription_renewal_date if subscription_period_end is null.
 */
export function grantEnd(profile: GrantProfile): Date | null {
  const raw = profile.subscription_period_end ?? profile.subscription_renewal_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

interface EarlyAdopterProfile extends GrantProfile {
  early_adopter?: boolean | null;
  subscription_tier?: string | null;
}

/**
 * Returns true while the early-adopter FREE GRANT is still active.
 * Use this for upload limits, badge display, and feature gating.
 *
 * Grant is active when:
 *   - early_adopter === true
 *   - subscription_tier is premium or unlimited (as granted)
 *   - grant end date is in the future (or no end date set yet)
 */
export function hasActiveEarlyAdopterGrant(profile: EarlyAdopterProfile | null | undefined): boolean {
  if (!profile?.early_adopter) return false;
  const tier = normalizeTier(profile.subscription_tier);
  if (tier !== 'premium' && tier !== 'unlimited') return false;
  const end = grantEnd(profile);
  // No end date means grant is still being set up — treat as active
  return !end || end > new Date();
}

/**
 * Returns true when an early adopter's grant has expired and they
 * have not yet converted to a paid subscription.
 * This is the gate condition for EarlyAdopterConversionModal.
 */
export function isExpiredEarlyAdopter(profile: EarlyAdopterProfile | null | undefined): boolean {
  if (!profile?.early_adopter) return false;
  const tier = normalizeTier(profile.subscription_tier);
  if (tier !== 'free') return false; // still on grant or already paying
  const end = grantEnd(profile);
  if (!end) return false; // no grant end date set
  return end < new Date();
}
