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
   * Falls back to Supabase if API returns 405 (not deployed yet)
   */
  async toggleBookmark(request: BookmarkRequest): Promise<{ data: Bookmark | null; error: any; isSaved: boolean }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      try {
        console.log('📌 Toggling bookmark via API:', request);
        const response = await apiFetch<{ success: boolean; data: Bookmark | null }>(
          '/api/social/bookmark',
          {
            method: 'POST',
            session,
            body: JSON.stringify(request),
          }
        );

        const isSaved = response.data !== null;
        console.log(`✅ Bookmark toggled via API: ${isSaved ? 'saved' : 'unsaved'}`);
        return { data: response.data || null, error: null, isSaved };
      } catch (apiError: any) {
        // If 405, 401, or 400 with RLS error, fall back to Supabase direct query
        // 405 = endpoint not deployed
        // 401 = backend auth misconfigured
        // 400 with RLS = backend RLS policy missing or incorrect
        
        // Debug: Log error structure to help diagnose
        console.log('🔍 API Error Status:', apiError?.status);
        console.log('🔍 API Error Body:', JSON.stringify(apiError?.body, null, 2));
        
        // Check for RLS error in the error body
        const isRlsError = apiError?.status === 400 && 
          (apiError?.message?.includes('row-level security') || 
           apiError?.body?.error?.message?.includes('row-level security') ||
           apiError?.body?.message?.includes('row-level security'));
        
        console.log('🔍 RLS Error Detected:', isRlsError);
        
        if (apiError?.status === 405 || apiError?.status === 401 || isRlsError) {
          console.log(`⚠️ API returned ${apiError?.status}${isRlsError ? ' (RLS policy error)' : ''}, falling back to Supabase direct query`);
          return await this.toggleBookmarkSupabase(request, session);
        }
        throw apiError;
      }
    } catch (error) {
      console.error('❌ SocialService.toggleBookmark:', error);
      return { data: null, error, isSaved: false };
    }
  }

  /**
   * Supabase fallback for toggleBookmark when API is not available
   */
  private async toggleBookmarkSupabase(
    request: BookmarkRequest,
    session: any
  ): Promise<{ data: Bookmark | null; error: any; isSaved: boolean }> {
    try {
      // Check if already bookmarked
      const { data: existing, error: checkError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('content_id', request.content_id)
        .eq('content_type', request.content_type)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Remove bookmark
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;

        console.log('✅ Bookmark removed via Supabase');
        return { data: null, error: null, isSaved: false };
      } else {
        // Add bookmark
        const { data, error: insertError } = await supabase
          .from('bookmarks')
          .insert({
            user_id: session.user.id,
            content_id: request.content_id,
            content_type: request.content_type,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log('✅ Bookmark added via Supabase');
        return { data: data as Bookmark, error: null, isSaved: true };
      }
    } catch (error) {
      console.error('❌ SocialService.toggleBookmarkSupabase:', error);
      return { data: null, error, isSaved: false };
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

  /**
   * Get saved posts with full post details
   * Returns posts that the user has bookmarked
   */
  async getSavedPosts(
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: any[]; hasMore: boolean; error: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const offset = (page - 1) * limit;

      console.log(`📌 Getting saved posts (page: ${page}, limit: ${limit})`);

      // Get bookmarked post IDs
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('content_id, created_at')
        .eq('user_id', session.user.id)
        .eq('content_type', 'post')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (bookmarksError) throw bookmarksError;

      if (!bookmarks || bookmarks.length === 0) {
        console.log('ℹ️ No saved posts found');
        return { posts: [], hasMore: false, error: null };
      }

      const postIds = bookmarks.map(b => b.content_id);

      // Get post details
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, post_type, visibility, event_id, created_at, updated_at')
        .in('id', postIds)
        .is('deleted_at', null);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        console.log('ℹ️ No post details found for bookmarks');
        return { posts: [], hasMore: false, error: null };
      }

      // Get authors
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role')
        .in('id', userIds);

      const authorsMap = new Map();
      authorsData?.forEach(author => {
        authorsMap.set(author.id, author);
      });

      // Get attachments
      const { data: attachmentsData } = await supabase
        .from('post_attachments')
        .select('post_id, attachment_type, file_url')
        .in('post_id', postIds);

      const attachmentsMap = new Map<string, { image_url?: string; audio_url?: string }>();
      attachmentsData?.forEach(attachment => {
        const current = attachmentsMap.get(attachment.post_id) || {};
        if (attachment.attachment_type === 'image') {
          current.image_url = attachment.file_url;
        } else if (attachment.attachment_type === 'audio') {
          current.audio_url = attachment.file_url;
        }
        attachmentsMap.set(attachment.post_id, current);
      });

      // Build bookmark saved_at map
      const savedAtMap = new Map();
      bookmarks.forEach(b => {
        savedAtMap.set(b.content_id, b.created_at);
      });

      // Map to posts with details
      const posts = postsData.map((post: any) => {
        const author = authorsMap.get(post.user_id) || {
          id: post.user_id,
          username: 'unknown',
          display_name: 'Unknown User',
        };
        const attachments = attachmentsMap.get(post.id) || {};

        return {
          id: post.id,
          content: post.content || '',
          post_type: post.post_type || 'update',
          visibility: post.visibility || 'public',
          event_id: post.event_id,
          created_at: post.created_at,
          updated_at: post.updated_at,
          saved_at: savedAtMap.get(post.id),
          image_url: attachments.image_url,
          audio_url: attachments.audio_url,
          author: {
            id: author.id,
            username: author.username,
            display_name: author.display_name || author.username,
            avatar_url: author.avatar_url,
            role: author.role,
          },
          reactions_count: { support: 0, love: 0, fire: 0, congrats: 0 },
          comments_count: 0,
          user_reaction: null,
        };
      });

      console.log(`✅ Found ${posts.length} saved posts`);

      return {
        posts,
        hasMore: bookmarks.length === limit,
        error: null,
      };
    } catch (error) {
      console.error('❌ SocialService.getSavedPosts:', error);
      return { posts: [], hasMore: false, error };
    }
  }
}

export const socialService = new SocialService();

