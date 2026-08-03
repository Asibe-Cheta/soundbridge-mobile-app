/**
 * Additive role helpers.
 *
 * `profiles.role` stays a single legacy value ('creator' | 'listener') and is
 * never reassigned by the creator-upgrade flow — an Audio Lover who becomes a
 * creator keeps role = 'listener' forever, so every existing Audio-Lover-gated
 * check (tipping, referral, engagement UI) keeps working untouched.
 *
 * Creator access is additive: `is_creator` is a separate flag that can be true
 * alongside any role. Use isCreator() everywhere a screen needs to know "does
 * this user have creator access" instead of comparing role directly.
 */

export interface RoleFlags {
  role?: string | null;
  is_creator?: boolean | null;
}

export function isCreator(profile?: RoleFlags | null): boolean {
  if (!profile) return false;
  return profile.is_creator === true || profile.role === 'creator';
}

export function isAudioLover(profile?: RoleFlags | null): boolean {
  return profile?.role === 'listener';
}
