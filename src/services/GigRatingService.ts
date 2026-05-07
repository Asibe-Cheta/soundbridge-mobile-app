import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';
import { GigRating, ProjectRatings, UserRatingSummary } from '../types/gig-rating.types';

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// All new gig endpoints return { success: boolean, data: T }
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

class GigRatingService {
  /**
   * Submit a rating for the other party after a completed project.
   * POST /api/gig-ratings
   * Returns 409 if already rated for this project.
   */
  async submitRating(
    projectId: string,
    ratingData: {
      ratee_id: string;
      overall_rating: number;
      professionalism_rating: number;
      punctuality_rating: number;
      quality_rating?: number;
      payment_promptness_rating?: number;
      review_text?: string;
    }
  ): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    await apiFetch('/api/gig-ratings', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, ...ratingData }),
      session,
    });
  }

  /**
   * Get ratings for a project.
   * GET /api/gig-ratings/project/:projectId
   * Returns both ratings if both parties have submitted; otherwise has_rated + my_rating only.
   */
  async getProjectRatings(projectId: string): Promise<ProjectRatings | null> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      const result = await apiFetch<ApiResponse<ProjectRatings>>(
        `/api/gig-ratings/project/${projectId}`,
        { session }
      );
      return result.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get all visible ratings for a user + their average.
   * GET /api/gig-ratings/user/:userId
   * Public endpoint — no auth required.
   */
  async getUserRatings(userId: string): Promise<UserRatingSummary> {
    const session = await getSession();

    const result = await apiFetch<ApiResponse<UserRatingSummary>>(
      `/api/gig-ratings/user/${userId}`,
      session ? { session } : {}
    );
    return result.data;
  }

  /**
   * Check if the current user has already submitted a rating for this project.
   */
  async hasRatedProject(projectId: string): Promise<boolean> {
    const ratings = await this.getProjectRatings(projectId);
    return ratings?.has_rated ?? false;
  }
}

export const gigRatingService = new GigRatingService();
