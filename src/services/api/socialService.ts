import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';

export interface BookmarkRequest {
  content_id: string;
  content_type: 'track' | 'event' | 'post';
}

export interface Bookmark {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'track' | 'event' | 'post';
  created_at: string;
}

export class SocialService {
  /**
   * Toggle bookmark (add if doesn't exist, remove if exists)
   * Returns bookmark object if added, null if removed
   */
  async toggleBookmark(request: BookmarkRequest): Promise<{ data: Bookmark | null; error: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<{ success: boolean; data: Bookmark | null }>(
        '/api/social/bookmark',
        {
          method: 'POST',
          session,
          body: JSON.stringify(request),
        }
      );

      return { data: response.data || null, error: null };
    } catch (error) {
      console.error('SocialService.toggleBookmark:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if content is bookmarked
   */
  async isBookmarked(
    userId: string,
    contentId: string,
    contentType: 'track' | 'event' | 'post'
  ): Promise<{ data: boolean; error: any }> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return { data: !!data, error: null };
    } catch (error) {
      console.error('SocialService.isBookmarked:', error);
      return { data: false, error };
    }
  }

  /**
   * Get user's bookmarks
   */
  async getBookmarks(
    userId: string,
    contentType?: 'track' | 'event' | 'post',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: Bookmark[]; error: any }> {
    try {
      let query = supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('SocialService.getBookmarks:', error);
      return { data: [], error };
    }
  }
}

export const socialService = new SocialService();

