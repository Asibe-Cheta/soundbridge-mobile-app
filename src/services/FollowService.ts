import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabase';

class FollowService {
  async isFollowing(creatorId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const data = await apiFetch<{ isFollowing?: boolean }>(
        `/api/follows?following_id=${encodeURIComponent(creatorId)}`,
        { session, method: 'GET' },
      );
      return !!data?.isFollowing;
    } catch (err) {
      console.warn('[FollowService] isFollowing error:', err);
      return false;
    }
  }

  async follow(creatorId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      await apiFetch('/api/follows', {
        session,
        method: 'POST',
        body: JSON.stringify({ following_id: creatorId }),
      });
      return true;
    } catch (err) {
      console.error('[FollowService] follow error:', err);
      return false;
    }
  }

  async unfollow(creatorId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      await apiFetch(`/api/follows?following_id=${encodeURIComponent(creatorId)}`, {
        session,
        method: 'DELETE',
      });
      return true;
    } catch (err) {
      console.error('[FollowService] unfollow error:', err);
      return false;
    }
  }
}

export const followService = new FollowService();
