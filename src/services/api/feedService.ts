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

      const response = await apiFetch<FeedResponse>(
        `/api/posts/feed?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      return {
        posts: response.posts || [],
        hasMore: response.pagination?.has_more || false,
      };
    } catch (error: any) {
      // Don't log 404 errors as errors - API endpoint may not be available yet
      if (error?.status === 404) {
        console.warn('FeedService.getFeedPosts: API endpoint not available (404)');
      } else {
        console.error('FeedService.getFeedPosts:', error);
      }
      throw error;
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

      const response = await apiFetch<{ post: Post }>(
        '/api/posts',
        {
          method: 'POST',
          session,
          body: JSON.stringify(postData),
        }
      );

      return response.post;
    } catch (error) {
      console.error('FeedService.createPost:', error);
      throw error;
    }
  }

  /**
   * Upload image for post
   */
  async uploadImage(uri: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Create form data
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);

      // For file uploads, we need to use fetch directly with proper headers
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';
      const response = await fetch(`${API_BASE_URL}/api/posts/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to upload image' }));
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('FeedService.uploadImage:', error);
      throw error;
    }
  }

  /**
   * Upload audio for post (max 60s, 10MB)
   */
  async uploadAudio(uri: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      const filename = uri.split('/').pop() || 'audio.mp3';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/mpeg';

      formData.append('audio', {
        uri,
        name: filename,
        type,
      } as any);

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';
      const response = await fetch(`${API_BASE_URL}/api/posts/upload-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to upload audio' }));
        throw new Error(error.error || 'Failed to upload audio');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('FeedService.uploadAudio:', error);
      throw error;
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
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Soft delete by updating deleted_at timestamp
      await apiFetch(
        `/api/posts/${postId}`,
        {
          method: 'PATCH',
          session,
          body: JSON.stringify({
            deleted_at: new Date().toISOString(),
          }),
        }
      );
    } catch (error) {
      console.error('FeedService.deletePost:', error);
      throw error;
    }
  }
}

export const feedService = new FeedService();

