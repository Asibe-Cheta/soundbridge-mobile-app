export interface EventMatchEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
  venue?: string | null;
  category?: string | null;
  image_url?: string | null;
  ticket_price?: number | null;
  tickets_available?: number | null;
  country?: string | null;
  creator_id?: string | null;
}

export interface EventMatchScore {
  id: string;
  user_id: string;
  event_id: string;
  match_score: number;
  match_reasons: Record<string, unknown> | null;
  personalised_reason: string | null;
  indicator_shown: boolean;
  indicator_dismissed: boolean;
  calculated_at: string;
  expires_at: string;
  events?: EventMatchEvent | EventMatchEvent[] | null;
}

export const HIGH_CONFIDENCE_MATCH_THRESHOLD = 75;

export function getMatchEvent(row: EventMatchScore): EventMatchEvent | null {
  const raw = row.events;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}
