import { supabase } from '../lib/supabase';

// Shared resolver for the two mobile-side spots that look a profile up by
// username from a deep link: the @username direct profile link and the
// /{username}/home fan landing page. Falls back to username_history when
// the current username doesn't match, so a link/QR code printed before a
// rename keeps resolving to the same profile instead of silently landing
// on Feed. The /tip/{username} link and /join?ref= referral code are NOT
// covered here — /tip/ isn't parsed as a deep link on mobile at all today
// (it's a web-only, no-app-required flow), and the referral code is
// resolved later, server-side, by the record_referral_signup RPC — both
// need their own fix on their own side, not this resolver.
export async function resolveProfileIdByUsername(username: string): Promise<string | null> {
  const normalized = username.toLowerCase().trim();
  if (!normalized) return null;

  const { data: current } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', normalized)
    .maybeSingle();
  if (current?.id) return current.id;

  const { data: historical } = await supabase
    .from('username_history')
    .select('user_id')
    .ilike('old_username', normalized)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return historical?.user_id ?? null;
}
