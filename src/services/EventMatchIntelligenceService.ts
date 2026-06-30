import { supabase } from '../lib/supabase';
import {
  EventMatchScore,
  HIGH_CONFIDENCE_MATCH_THRESHOLD,
  getMatchEvent,
} from '../types/eventMatch.types';

const MATCH_SELECT = `
  id,
  user_id,
  event_id,
  match_score,
  match_reasons,
  personalised_reason,
  indicator_shown,
  indicator_dismissed,
  calculated_at,
  expires_at,
  events (
    id,
    title,
    description,
    event_date,
    location,
    venue,
    category,
    image_url,
    ticket_price,
    tickets_available,
    country,
    creator_id
  )
`;

class EventMatchIntelligenceService {
  async fetchHighConfidenceMatches(userId: string): Promise<EventMatchScore[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('event_match_scores')
        .select(MATCH_SELECT)
        .eq('user_id', userId)
        .gte('match_score', HIGH_CONFIDENCE_MATCH_THRESHOLD)
        .eq('indicator_dismissed', false)
        .gt('expires_at', now)
        .order('match_score', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[EventMatchIntelligence] event_match_scores table not ready');
          return [];
        }
        console.warn('[EventMatchIntelligence] fetch failed:', error.message);
        return [];
      }

      return (data ?? []).filter(row => !!getMatchEvent(row as EventMatchScore));
    } catch (err) {
      console.warn('[EventMatchIntelligence] fetch error:', err);
      return [];
    }
  }

  hasUnseenIndicator(matches: EventMatchScore[]): boolean {
    return matches.some(m => !m.indicator_shown && !m.indicator_dismissed);
  }

  buildEventIdMap(matches: EventMatchScore[]): Map<string, EventMatchScore> {
    const map = new Map<string, EventMatchScore>();
    for (const match of matches) {
      map.set(match.event_id, match);
    }
    return map;
  }

  async markMatchesViewed(userId: string, matchIds: string[]): Promise<void> {
    if (!matchIds.length) return;
    try {
      const { error } = await supabase
        .from('event_match_scores')
        .update({ indicator_shown: true })
        .eq('user_id', userId)
        .in('id', matchIds);

      if (error) {
        console.warn('[EventMatchIntelligence] markMatchesViewed failed:', error.message);
      }
    } catch (err) {
      console.warn('[EventMatchIntelligence] markMatchesViewed error:', err);
    }
  }
}

export const eventMatchIntelligenceService = new EventMatchIntelligenceService();
