import { config } from '../config/environment';
import { apiFetch } from '../lib/apiClient';
import type { Session } from '@supabase/supabase-js';

export type RatingSummary = {
  average: number;
  count: number;
};

export type RatingContext = {
  type: 'event' | 'service' | 'collab';
  id: string;
};

export type SubmitRatingPayload = {
  ratedUserId: string;
  rating: number;
  comment?: string;
  context?: RatingContext;
};

class RatingsService {
  private baseUrl = `${config.apiUrl}/ratings`;

  async getSummary(userId: string): Promise<RatingSummary> {
    const response = await apiFetch<RatingSummary>(`${this.baseUrl}/${userId}/summary`);
    return {
      average: response.average || 0,
      count: response.count || 0,
    };
  }

  async submitRating(session: Session, payload: SubmitRatingPayload) {
    return apiFetch<{ success: boolean; message?: string }>(`${this.baseUrl}`, {
      method: 'POST',
      session,
      body: payload,
    });
  }
}

export const ratingsService = new RatingsService();
