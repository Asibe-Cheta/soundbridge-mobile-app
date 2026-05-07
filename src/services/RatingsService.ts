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
  private basePath = '/api/ratings';

  async getSummary(userId: string): Promise<RatingSummary> {
    const response = await apiFetch<RatingSummary>(`${this.basePath}/${userId}/summary`);
    return {
      average: response.average || 0,
      count: response.count || 0,
    };
  }

  async submitRating(session: Session, payload: SubmitRatingPayload) {
    const body: Record<string, unknown> = {
      rated_user_id: payload.ratedUserId,
      rating: payload.rating,
      comment: payload.comment,
    };

    if (payload.context?.type) {
      body.context_type = payload.context.type;
    }
    if (payload.context?.id) {
      body.context_id = payload.context.id;
    }

    return apiFetch<{ success: boolean; message?: string }>(`${this.basePath}`, {
      method: 'POST',
      session,
      body: JSON.stringify(body),
    });
  }
}

export const ratingsService = new RatingsService();
