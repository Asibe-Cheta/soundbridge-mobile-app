// "Suggested by Bridge" collaborator matching for Premium/Unlimited
// (tier build-out Phase 4 item 2). Selection is rule-based (complementary
// role, overlapping genre, same country) using only columns already on
// `profiles` — not a real matching model. Bridge's contribution is a short,
// AI-generated one-line explanation per suggestion, written using only
// data already visible on both profiles (role, genre, location/country,
// display name) — never anything private.
//
// Completely separate from the Advisor's own analyses/chats usage system
// (AICareerAdvisorScreen.tsx's TIER_LIMITS) — this file doesn't import or
// call into it, by design, so collab-suggestion explanation calls never
// count against a user's Advisor quota.
//
// Daily cap: a new AI call only happens for a pair that's never been shown
// before (the explanation is cached on the row once generated, see the
// migration). Once the cap is hit for the day, any further new pairs fall
// back to a generic, non-AI explanation rather than blocking the
// suggestion or throwing an error.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const DAILY_EXPLANATION_CAP = 5;

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface SuggestedCollaborator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  genre: string | null;
  location: string | null;
  explanation: string;
}

interface CandidateRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  genre: string | null;
  location: string | null;
  country: string | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getDailyCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(`bridge_collab_explain_count_${today()}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function incrementDailyCount(): Promise<void> {
  try {
    const count = await getDailyCount();
    await AsyncStorage.setItem(`bridge_collab_explain_count_${today()}`, String(count + 1));
  } catch {}
}

function genericExplanation(current: { genre?: string | null }, candidate: CandidateRow): string {
  if (candidate.genre && current.genre && candidate.genre === current.genre) {
    return `You're both into ${candidate.genre} — worth a look.`;
  }
  if (candidate.role) {
    return `A ${candidate.role} active on SoundBridge — could be a good fit.`;
  }
  return 'Suggested based on your profile.';
}

async function generateExplanation(
  current: { display_name?: string | null; role?: string | null; genre?: string | null; location?: string | null },
  candidate: CandidateRow
): Promise<string> {
  if (!GEMINI_API_KEY) return genericExplanation(current, candidate);

  const dailyCount = await getDailyCount();
  if (dailyCount >= DAILY_EXPLANATION_CAP) return genericExplanation(current, candidate);

  try {
    const prompt = `Two music creators on SoundBridge might collaborate. Write ONE short, friendly sentence (under 20 words) explaining why, using only the facts given. Do not invent anything not listed here.

Creator A: role=${current.role ?? 'unknown'}, genre=${current.genre ?? 'unknown'}, location=${current.location ?? 'unknown'}
Creator B: name=${candidate.display_name ?? candidate.username}, role=${candidate.role ?? 'unknown'}, genre=${candidate.genre ?? 'unknown'}, location=${candidate.location ?? 'unknown'}

Reply with only the sentence, no quotes, no preamble.`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!res.ok) return genericExplanation(current, candidate);

    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return genericExplanation(current, candidate);

    await incrementDailyCount();
    return text;
  } catch {
    return genericExplanation(current, candidate);
  }
}

/**
 * Up to `limit` suggested collaborators for `userId`, excluding themselves,
 * anyone already dismissed, and reusing a cached explanation where one
 * already exists for that pair. Returns [] on any error — callers should
 * treat an empty result as "nothing to show," not a failure state.
 *
 * Fetches the caller's own role/genre/location/country directly rather
 * than trusting the caller to pass them — AuthContext's UserProfile type
 * doesn't carry these fields the way the raw profiles table does (it has
 * `genres: string[]`, not `genre: string`, and no `role`/`location` at
 * all), so re-querying here avoids a field-name mismatch.
 */
export async function getSuggestedCollaborators(
  userId: string,
  limit = 3
): Promise<SuggestedCollaborator[]> {
  try {
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('role, genre, location, country, display_name')
      .eq('id', userId)
      .single();
    const currentUserProfile = ownProfile ?? {};

    const { data: dismissedRows } = await supabase
      .from('bridge_collab_suggestions')
      .select('suggested_user_id')
      .eq('user_id', userId)
      .eq('dismissed', true);
    const dismissedIds = new Set((dismissedRows ?? []).map((r: any) => r.suggested_user_id));

    const { data: candidates, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, role, genre, location, country')
      .eq('role', 'creator')
      .neq('id', userId)
      .limit(50);

    if (error || !candidates) return [];

    const scored = (candidates as CandidateRow[])
      .filter((c) => !dismissedIds.has(c.id))
      .map((c) => {
        let score = 0;
        if (currentUserProfile.genre && c.genre === currentUserProfile.genre) score += 2;
        if (currentUserProfile.country && c.country === currentUserProfile.country) score += 1;
        return { candidate: c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.candidate);

    const { data: existingRows } = await supabase
      .from('bridge_collab_suggestions')
      .select('suggested_user_id, explanation')
      .eq('user_id', userId)
      .in('suggested_user_id', scored.map((c) => c.id));
    const explanationByUser = new Map<string, string>(
      (existingRows ?? []).filter((r: any) => r.explanation).map((r: any) => [r.suggested_user_id, r.explanation])
    );

    const results: SuggestedCollaborator[] = [];
    for (const candidate of scored) {
      let explanation = explanationByUser.get(candidate.id);
      if (!explanation) {
        explanation = await generateExplanation(currentUserProfile, candidate);
        // Upsert so the explanation is cached for next time, and the pair
        // is logged as shown even if the user never dismisses it.
        await supabase
          .from('bridge_collab_suggestions')
          .upsert(
            { user_id: userId, suggested_user_id: candidate.id, explanation },
            { onConflict: 'user_id,suggested_user_id', ignoreDuplicates: false }
          );
      }
      results.push({
        id: candidate.id,
        username: candidate.username,
        display_name: candidate.display_name,
        avatar_url: candidate.avatar_url,
        role: candidate.role,
        genre: candidate.genre,
        location: candidate.location,
        explanation,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function dismissSuggestion(userId: string, suggestedUserId: string): Promise<void> {
  try {
    await supabase
      .from('bridge_collab_suggestions')
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('suggested_user_id', suggestedUserId);
  } catch {}
}
