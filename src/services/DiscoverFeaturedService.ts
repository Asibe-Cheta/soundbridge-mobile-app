// Featured-on-Discover selection for Premium/Unlimited creators (tier
// build-out Phase 3 item 3). Premium: up to 1 featured slot/month.
// Unlimited: up to 2/month. Logged in discover_featured_log (migration
// 20261025000000) so the monthly cap can be counted and rotation stays fair
// (least-recently-featured eligible creator goes first).
//
// Location-aware note: creator profiles only carry a text `location`/
// `country` field, not coordinates — there's no lat/lng to do real-distance
// filtering the way ServiceDiscoveryService does for venues. "Location-aware"
// here means: prefer an eligible creator in the viewer's own country, and
// only fall back to any country if none match. This is a lighter signal
// than true distance, documented rather than overclaimed.
//
// Fully defensive: any error (including the migration not having run yet,
// so the table doesn't exist) returns null, and the caller falls back to
// today's unmodified featured-artists behaviour exactly.

import { supabase } from '../lib/supabase';

export interface TierFeaturedCreator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  tracks_count: number;
  events_count: number;
  institution_badge: string | null;
  subscription_tier: 'premium' | 'unlimited';
}

const MONTHLY_CAP: Record<'premium' | 'unlimited', number> = {
  premium: 1,
  unlimited: 2,
};

/**
 * Picks one eligible Premium/Unlimited creator to feature this session, logs
 * the pick, and returns it shaped for FeaturedCreatorCard. Returns null on
 * any failure or if nobody is eligible — callers should treat null as "show
 * today's normal featured list, nothing else to do."
 */
export async function pickTierFeaturedCreator(
  viewerCountry: string | null | undefined
): Promise<TierFeaturedCreator | null> {
  try {
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`; // YYYY-MM-01

    const { data: candidates, error: candidatesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, followers_count, tracks_count, events_count, institution_badge, subscription_tier, country')
      .in('subscription_tier', ['premium', 'unlimited'])
      .eq('role', 'creator');

    if (candidatesError || !candidates || candidates.length === 0) return null;

    const { data: featuredThisMonth, error: logError } = await supabase
      .from('discover_featured_log')
      .select('user_id, featured_at')
      .eq('featured_month', monthStart);

    // Table may not exist yet if the migration hasn't run — treat the same
    // as "no one featured yet this month" only if it's genuinely empty data,
    // not if the query itself failed (missing table, RLS, etc.).
    if (logError) return null;

    const countByUser = new Map<string, number>();
    const lastFeaturedByUser = new Map<string, string>();
    for (const row of featuredThisMonth ?? []) {
      const r = row as { user_id: string; featured_at: string };
      countByUser.set(r.user_id, (countByUser.get(r.user_id) ?? 0) + 1);
      const prev = lastFeaturedByUser.get(r.user_id);
      if (!prev || r.featured_at > prev) lastFeaturedByUser.set(r.user_id, r.featured_at);
    }

    const eligible = (candidates as any[]).filter((c) => {
      const tier = c.subscription_tier as 'premium' | 'unlimited';
      const cap = MONTHLY_CAP[tier];
      const used = countByUser.get(c.id) ?? 0;
      return used < cap;
    });

    if (eligible.length === 0) return null;

    // Prefer same-country as the viewer; fall back to the full eligible pool
    // (today's equivalent of "nationwide") if nobody matches.
    const sameCountry = viewerCountry
      ? eligible.filter((c) => c.country && c.country === viewerCountry)
      : [];
    const pool = sameCountry.length > 0 ? sameCountry : eligible;

    // Fair rotation: least-recently-featured first (never featured = always first).
    pool.sort((a, b) => {
      const aLast = lastFeaturedByUser.get(a.id) ?? '';
      const bLast = lastFeaturedByUser.get(b.id) ?? '';
      return aLast.localeCompare(bLast);
    });

    const picked = pool[0];

    const { error: logInsertError } = await supabase.rpc('log_discover_featured', {
      p_user_id: picked.id,
    });
    if (logInsertError) return null; // don't show a pick we failed to log — would break the cap next time

    return {
      id: picked.id,
      username: picked.username,
      display_name: picked.display_name,
      avatar_url: picked.avatar_url,
      followers_count: picked.followers_count ?? 0,
      tracks_count: picked.tracks_count ?? 0,
      events_count: picked.events_count ?? 0,
      institution_badge: picked.institution_badge ?? null,
      subscription_tier: picked.subscription_tier,
    };
  } catch {
    return null;
  }
}
