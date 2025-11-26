import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';
import { Post, CreatePostDto, Comment } from '../../types/feed.types';

interface FeedResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export class FeedService {
  /**
   * Fetch paginated feed posts
   * Falls back to Supabase query if API endpoint is not available
   */
  async getFeedPosts(page: number = 1, limit: number = 10): Promise<{
    posts: Post[];
    hasMore: boolean;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Response format: { success: true, data: { posts: [...], pagination: {...} } }
      const response = await apiFetch<{ success: boolean; data: FeedResponse }>(
        `/api/posts/feed?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      // Handle both new format (wrapped) and old format (direct)
      const feedData = response.success ? response.data : response;
      const rawPosts = feedData.posts || [];
      
      // Transform API response to match our Post type
      // API returns: { author: { name, ... }, attachments: [...], reactions: { user_reaction, ... } }
      // Our Post type expects: { author: { display_name, ... }, image_url, audio_url, reactions_count, user_reaction }
      const posts: Post[] = rawPosts.map((apiPost: any) => {
        // Extract image and audio from attachments array
        const imageAttachment = apiPost.attachments?.find((a: any) => a.attachment_type === 'image');
        const audioAttachment = apiPost.attachments?.find((a: any) => a.attachment_type === 'audio');
        
        // Extract reactions
        const reactions = apiPost.reactions || {};
        const userReaction = reactions.user_reaction || null;
        const reactionsCount = {
          support: reactions.support || 0,
          love: reactions.love || 0,
          fire: reactions.fire || 0,
          congrats: reactions.congrats || 0,
        };
        
        return {
          id: apiPost.id,
          author: {
            id: apiPost.author?.id || '',
            username: apiPost.author?.username || '',
            display_name: apiPost.author?.name || apiPost.author?.display_name || apiPost.author?.username || 'Unknown',
            avatar_url: apiPost.author?.avatar_url,
            role: apiPost.author?.role,
          },
          content: apiPost.content || '',
          post_type: apiPost.post_type || 'update',
          visibility: apiPost.visibility || 'public',
          image_url: imageAttachment?.file_url,
          audio_url: audioAttachment?.file_url,
          event_id: apiPost.event_id,
          reactions_count: reactionsCount,
          comments_count: apiPost.comment_count || 0,
          user_reaction: userReaction,
          created_at: apiPost.created_at,
          updated_at: apiPost.updated_at || apiPost.created_at,
        };
      });
      
      return {
        posts,
        hasMore: feedData.pagination?.has_more || false,
      };
    } catch (error: any) {
      // If API endpoint returns 404 or fails, fall back to Supabase query
      if (error?.status === 404 || error?.message?.includes('404')) {
        console.log('ℹ️ Feed API endpoint not available, querying Supabase directly');
        return this.getFeedPostsFromSupabase(page, limit, session);
      } else {
        console.error('FeedService.getFeedPosts:', error);
        // Try Supabase fallback even for other errors
        try {
          const { data: { session: fallbackSession } } = await supabase.auth.getSession();
          if (fallbackSession) {
            return this.getFeedPostsFromSupabase(page, limit, fallbackSession);
          }
        } catch (fallbackError) {
          console.error('FeedService.getFeedPosts: Supabase fallback also failed:', fallbackError);
        }
        throw error;
      }
    }
  }

  /**
   * Fetch posts directly from Supabase (fallback method)
   */
  private async getFeedPostsFromSupabase(
    page: number,
    limit: number,
    session: any
  ): Promise<{
    posts: Post[];
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;

      // Query posts with author information
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          post_type,
          visibility,
          image_url,
          audio_url,
          event_id,
          created_at,
          updated_at,
          deleted_at,
          author:profiles!user_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .is('deleted_at', null) // Only get non-deleted posts
        .eq('visibility', 'public') // For now, only show public posts (can be expanded later)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('Error querying posts from Supabase:', postsError);
        return { posts: [], hasMore: false };
      }

      if (!postsData || postsData.length === 0) {
        return { posts: [], hasMore: false };
      }

      // Get reactions for posts
      const postIds = postsData.map(p => p.id);
      const { data: reactionsData } = await supabase
        .from('post_reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);

      // Get comments count for posts
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds);

      // Get user's reactions
      const { data: userReactions } = await supabase
        .from('post_reactions')
        .select('post_id, reaction_type')
        .in('post_id', postIds)
        .eq('user_id', session.user.id);

      // Build reactions count map
      const reactionsMap = new Map<string, { support: number; love: number; fire: number; congrats: number }>();
      const commentsCountMap = new Map<string, number>();
      const userReactionsMap = new Map<string, string>();

      postIds.forEach(postId => {
        reactionsMap.set(postId, { support: 0, love: 0, fire: 0, congrats: 0 });
        commentsCountMap.set(postId, 0);
      });

      reactionsData?.forEach(reaction => {
        const counts = reactionsMap.get(reaction.post_id) || { support: 0, love: 0, fire: 0, congrats: 0 };
        if (reaction.reaction_type === 'support') counts.support++;
        else if (reaction.reaction_type === 'love') counts.love++;
        else if (reaction.reaction_type === 'fire') counts.fire++;
        else if (reaction.reaction_type === 'congrats') counts.congrats++;
        reactionsMap.set(reaction.post_id, counts);
      });

      commentsData?.forEach(comment => {
        const count = commentsCountMap.get(comment.post_id) || 0;
        commentsCountMap.set(comment.post_id, count + 1);
      });

      userReactions?.forEach(reaction => {
        userReactionsMap.set(reaction.post_id, reaction.reaction_type);
      });

      // Map to Post format
      const posts: Post[] = postsData.map((post: any) => ({
        id: post.id,
        author: {
          id: post.author?.id || post.user_id,
          username: post.author?.username || 'unknown',
          display_name: post.author?.display_name || post.author?.username || 'Unknown User',
          avatar_url: post.author?.avatar_url || undefined,
          role: post.author?.role || undefined,
        },
        content: post.content || '',
        post_type: post.post_type || 'update',
        visibility: post.visibility || 'public',
        image_url: post.image_url || undefined,
        audio_url: post.audio_url || undefined,
        event_id: post.event_id || undefined,
        reactions_count: reactionsMap.get(post.id) || { support: 0, love: 0, fire: 0, congrats: 0 },
        comments_count: commentsCountMap.get(post.id) || 0,
        user_reaction: userReactionsMap.get(post.id) || null,
        created_at: post.created_at,
        updated_at: post.updated_at || post.created_at,
      }));

      return {
        posts,
        hasMore: postsData.length === limit, // If we got a full page, there might be more
      };
    } catch (error) {
      console.error('Error in Supabase fallback query:', error);
      return { posts: [], hasMore: false };
    }
  }

  /**
   * Create a new post
   */
  async createPost(postData: CreatePostDto): Promise<Post> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Response format: { success: true, data: { id, user_id, content, ... } }
      const response = await apiFetch<{ success: boolean; data: Post }>(
        '/api/posts',
        {
          method: 'POST',
          session,
          body: JSON.stringify(postData),
        }
      );

      // Handle both new format (wrapped) and old format (direct)
      if (response.success && response.data) {
        return response.data;
      }
      // Fallback for old format
      return (response as any).post || response;
    } catch (error) {
      console.error('FeedService.createPost:', error);
      throw error;
    }
  }

  /**
   * Upload image for post
   * @param uri - File URI to upload
   * @param postId - Optional post ID to associate the image with
   */
  async uploadImage(uri: string, postId?: string): Promise<string> {
    try {
      if (!uri || uri.trim() === '') {
        throw new Error('No file provided');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create form data - React Native FormData requires specific format
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // React Native FormData format for file uploads
      // ⚠️ CRITICAL: Field name must be 'file', not 'image'
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      } as any);

      // Add post_id if provided (creates attachment record automatically)
      if (postId) {
        formData.append('post_id', postId);
      }

      // For file uploads, we need to use fetch directly with proper headers
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';
      const response = await fetch(`${API_BASE_URL}/api/posts/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Don't set Content-Type - let fetch set it with boundary for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to upload image' };
        }
        throw new Error(error.error || error.message || 'Failed to upload image');
      }

      const data = await response.json();
      // Response format: { success: true, data: { file_url: "...", ... } }
      if (data.success && data.data) {
        return data.data.file_url;
      }
      // Fallback for old format
      return data.url || data.image_url || data.imageUrl || data.data?.file_url;
    } catch (error: any) {
      console.error('FeedService.uploadImage:', error);
      if (error.message === 'No file provided') {
        throw error;
      }
      throw new Error(error.message || 'Failed to upload image');
    }
  }

  /**
   * Upload audio for post (max 60s, 10MB)
   * @param uri - File URI to upload
   * @param postId - Optional post ID to associate the audio with
   */
  async uploadAudio(uri: string, postId?: string): Promise<string> {
    try {
      if (!uri || uri.trim() === '') {
        throw new Error('No file provided');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      const filename = uri.split('/').pop() || 'audio.mp3';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/mpeg';

      // React Native FormData format for file uploads
      // ⚠️ CRITICAL: Field name must be 'file', not 'audio'
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      } as any);

      // Add post_id if provided (creates attachment record automatically)
      if (postId) {
        formData.append('post_id', postId);
      }

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';
      const response = await fetch(`${API_BASE_URL}/api/posts/upload-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Don't set Content-Type - let fetch set it with boundary for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to upload audio' };
        }
        throw new Error(error.error || error.message || 'Failed to upload audio');
      }

      const data = await response.json();
      // Response format: { success: true, data: { file_url: "...", ... } }
      if (data.success && data.data) {
        return data.data.file_url;
      }
      // Fallback for old format
      return data.url || data.audio_url || data.audioUrl || data.data?.file_url;
    } catch (error: any) {
      console.error('FeedService.uploadAudio:', error);
      if (error.message === 'No file provided') {
        throw error;
      }
      throw new Error(error.message || 'Failed to upload audio');
    }
  }

  /**
   * Add reaction to post
   */
  async addReaction(postId: string, reactionType: 'support' | 'love' | 'fire' | 'congrats'): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/posts/${postId}/reactions`,
        {
          method: 'POST',
          session,
          body: JSON.stringify({ reaction_type: reactionType }),
        }
      );
    } catch (error) {
      console.error('FeedService.addReaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from post
   */
  async removeReaction(postId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/posts/${postId}/reactions`,
        {
          method: 'DELETE',
          session,
        }
      );
    } catch (error) {
      console.error('FeedService.removeReaction:', error);
      throw error;
    }
  }

  /**
   * Get post comments
   */
  async getComments(postId: string, page: number = 1, limit: number = 20): Promise<{
    comments: Comment[];
    hasMore: boolean;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<CommentsResponse>(
        `/api/posts/${postId}/comments?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      return {
        comments: response.comments || [],
        hasMore: response.pagination?.has_more || false,
      };
    } catch (error) {
      console.error('FeedService.getComments:', error);
      throw error;
    }
  }

  /**
   * Add comment to post
   */
  async addComment(postId: string, content: string, parentCommentId?: string): Promise<Comment> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<{ comment: Comment }>(
        `/api/posts/${postId}/comments`,
        {
          method: 'POST',
          session,
          body: JSON.stringify({
            content,
            parent_comment_id: parentCommentId,
          }),
        }
      );

      return response.comment;
    } catch (error) {
      console.error('FeedService.addComment:', error);
      throw error;
    }
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/comments/${commentId}/like`,
        {
          method: 'POST',
          session,
        }
      );
    } catch (error) {
      console.error('FeedService.likeComment:', error);
      throw error;
    }
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/comments/${commentId}/like`,
        {
          method: 'DELETE',
          session,
        }
      );
    } catch (error) {
      console.error('FeedService.unlikeComment:', error);
      throw error;
    }
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, postData: Partial<CreatePostDto>): Promise<Post> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<{ post: Post }>(
        `/api/posts/${postId}`,
        {
          method: 'PATCH',
          session,
          body: JSON.stringify(postData),
        }
      );

      return response.post;
    } catch (error) {
      console.error('FeedService.updatePost:', error);
      throw error;
    }
  }

  /**
   * Delete a post (soft delete - sets deleted_at timestamp)
   * Uses DELETE /api/posts/[id] endpoint
   * 
   * Response format: { success: true, message: "Post deleted successfully" }
   * Status codes: 200 (success), 401 (unauthorized), 403 (not owner), 404 (not found), 500 (server error)
   * 
   * Note: RLS policy issues have been resolved (November 26, 2025). Post deletion should work reliably.
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Soft delete using DELETE endpoint
      // apiFetch automatically parses JSON and throws on non-OK responses
      const response = await apiFetch<{ success: boolean; message?: string; error?: string; details?: string }>(
        `/api/posts/${postId}`,
        {
          method: 'DELETE',
          session,
        }
      );

      // Check if the response indicates success
      if (!response || (response.success === false)) {
        // Extract error message from response (check error, details, or message fields)
        const errorMessage = response?.error || response?.details || response?.message || 'Failed to delete post';
        throw new Error(errorMessage);
      }

      // Success - post is soft deleted
      // The post will automatically disappear from feed queries
      return;
    } catch (error: any) {
      console.error('FeedService.deletePost:', error);
      
      // Handle specific error status codes with user-friendly messages
      // apiFetch throws errors with status property for non-OK responses
      if (error.status === 401) {
        throw new Error('Please log in to delete posts');
      } else if (error.status === 403) {
        throw new Error('You can only delete your own posts');
      } else if (error.status === 404) {
        throw new Error('Post not found');
      } else if (error.status === 500) {
        // For 500 errors, try to extract detailed error message if available
        const errorDetails = error.body?.error || error.body?.details || error.message;
        throw new Error(errorDetails || 'Server error. Please try again later');
      } else if (error.message) {
        // Use the error message from the API or the caught error
        throw error;
      } else {
        throw new Error('Failed to delete post. Please try again');
      }
    }
  }
}

export const feedService = new FeedService();

