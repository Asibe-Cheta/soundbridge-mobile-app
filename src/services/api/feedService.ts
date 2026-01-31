import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';
import { Post, CreatePostDto, Comment } from '../../types/feed.types';
import { config } from '../../config/environment';

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
      console.log(`📡 FeedService: Getting feed posts (page: ${page}, limit: ${limit})`);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ FeedService: Not authenticated');
        throw new Error('Not authenticated');
      }

      console.log('✅ FeedService: User authenticated, fetching from API endpoint...');

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
      
      // If API returns 0 posts, fall back to Supabase direct query
      if (!rawPosts || rawPosts.length === 0) {
        console.log('⚠️ FeedService: API returned 0 posts, falling back to direct Supabase query');
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        if (fallbackSession) {
          return this.getFeedPostsFromSupabase(page, limit, fallbackSession);
        }
      }
      
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
            headline: apiPost.author?.headline,
            bio: apiPost.author?.bio,
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
        console.log('ℹ️ FeedService: API endpoint not available (404), falling back to direct Supabase query');
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        if (fallbackSession) {
          return this.getFeedPostsFromSupabase(page, limit, fallbackSession);
        } else {
          console.error('❌ FeedService: No session for Supabase fallback');
          throw new Error('Not authenticated');
        }
      } else {
        console.error('❌ FeedService.getFeedPosts error:', error);
        // Try Supabase fallback even for other errors
        try {
          console.log('⚠️ FeedService: API failed, trying Supabase fallback...');
          const { data: { session: fallbackSession } } = await supabase.auth.getSession();
          if (fallbackSession) {
            return this.getFeedPostsFromSupabase(page, limit, fallbackSession);
          }
        } catch (fallbackError) {
          console.error('❌ FeedService: Supabase fallback also failed:', fallbackError);
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

      console.log('🔍 Querying posts from Supabase (page:', page, 'limit:', limit, 'offset:', offset, ')');

      // Step 1: Get posts first (without join to avoid RLS issues)
      // NOTE: posts table doesn't have image_url/audio_url - those are in attachments table
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, post_type, visibility, event_id, created_at, updated_at, reposted_from_id')
        .is('deleted_at', null) // CRITICAL: Filter soft-deleted posts
        .eq('visibility', 'public') // CRITICAL: Only public posts
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('❌ Error querying posts from Supabase:', postsError);
        return { posts: [], hasMore: false };
      }

      if (!postsData || postsData.length === 0) {
        console.log('ℹ️ No posts found in database');
        return { posts: [], hasMore: false };
      }

      console.log(`✅ Found ${postsData.length} posts from database`);

      // Step 2: Get author information separately (to avoid RLS join issues)
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: authorsData, error: authorsError} = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier, is_verified')
        .in('id', userIds);

      if (authorsError) {
        console.warn('⚠️ Could not fetch author profiles:', authorsError);
        // Continue without author data - better to show posts without avatars than no posts
      }

      // Build author map
      const authorsMap = new Map();
      authorsData?.forEach(author => {
        authorsMap.set(author.id, author);
      });

      // Step 2.5: Get reposted_from posts (for quote reposts)
      const repostedFromIds = postsData
        .filter(p => p.reposted_from_id)
        .map(p => p.reposted_from_id)
        .filter((id): id is string => id !== null);

      console.log(`🔍 Found ${repostedFromIds.length} reposts, fetching original posts...`);

      let repostedPostsMap = new Map();
      if (repostedFromIds.length > 0) {
        const { data: repostedPostsData, error: repostedError } = await supabase
          .from('posts')
          .select('id, user_id, content, created_at, visibility')
          .in('id', repostedFromIds);

        if (repostedError) {
          console.warn('⚠️ Could not fetch reposted posts:', repostedError);
        } else if (repostedPostsData) {
          console.log(`✅ Fetched ${repostedPostsData.length} original posts for reposts`);
          
          // Get authors for reposted posts
          const repostedUserIds = [...new Set(repostedPostsData.map(p => p.user_id))];
          const { data: repostedAuthorsData } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier')
            .in('id', repostedUserIds);

          const repostedAuthorsMap = new Map();
          repostedAuthorsData?.forEach(author => {
            repostedAuthorsMap.set(author.id, author);
          });

          // Build reposted posts map with author data
          repostedPostsData.forEach(repostedPost => {
            repostedPostsMap.set(repostedPost.id, {
              ...repostedPost,
              author: repostedAuthorsMap.get(repostedPost.user_id) || {
                id: repostedPost.user_id,
                username: 'unknown',
                display_name: 'Unknown User',
                avatar_url: null,
              },
            });
          });
        }
      }

      // Step 3: Get attachments for posts (images and audio)
      const postIds = postsData.map(p => p.id);
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('post_attachments')
        .select('post_id, attachment_type, file_url')
        .in('post_id', postIds);

      if (attachmentsError) {
        console.warn('⚠️ Could not fetch attachments:', attachmentsError);
        // Continue without attachments - better to show posts without media than no posts
      }

      // Build attachments map
      const attachmentsMap = new Map<string, { image_url?: string; audio_url?: string }>();
      postIds.forEach(postId => {
        attachmentsMap.set(postId, {});
      });
      
      attachmentsData?.forEach(attachment => {
        const current = attachmentsMap.get(attachment.post_id) || {};
        if (attachment.attachment_type === 'image') {
          current.image_url = attachment.file_url;
        } else if (attachment.attachment_type === 'audio') {
          current.audio_url = attachment.file_url;
        }
        attachmentsMap.set(attachment.post_id, current);
      });

      // Get reactions for posts
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
      const posts: Post[] = postsData.map((post: any) => {
        const author = authorsMap.get(post.user_id) || {
          id: post.user_id,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: undefined,
          role: undefined,
        };

        const attachments = attachmentsMap.get(post.id) || {};
        const repostedFrom = post.reposted_from_id ? repostedPostsMap.get(post.reposted_from_id) : null;

        console.log(`📦 Post ${post.id}: reposted_from_id=${post.reposted_from_id}, has reposted_from=${!!repostedFrom}`);

        return {
          id: post.id,
          author: {
            id: author.id,
            username: author.username || 'unknown',
            display_name: author.display_name || author.username || 'Unknown User',
            avatar_url: author.avatar_url || undefined,
            role: author.role || undefined,
            headline: author.professional_headline || undefined,
            bio: author.bio || undefined,
            subscription_tier: author.subscription_tier || undefined,
            is_verified: author.is_verified || false,
          },
          content: post.content || '',
          post_type: post.post_type || 'update',
          visibility: post.visibility || 'public',
          image_url: attachments.image_url || undefined,
          audio_url: attachments.audio_url || undefined,
          event_id: post.event_id || undefined,
          reactions_count: reactionsMap.get(post.id) || { support: 0, love: 0, fire: 0, congrats: 0 },
          comments_count: commentsCountMap.get(post.id) || 0,
          user_reaction: userReactionsMap.get(post.id) || null,
          created_at: post.created_at,
          updated_at: post.updated_at || post.created_at,
          reposted_from_id: post.reposted_from_id || undefined,
          reposted_from: repostedFrom || undefined,
        };
      });

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
      const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');
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
      
      // Log response for debugging
      console.log('UploadImage response:', JSON.stringify(data, null, 2));
      
      // Response format: { success: true, data: { file_url: "...", ... } }
      if (data.success && data.data) {
        const fileUrl = data.data.file_url || data.data.url;
        if (fileUrl) {
          console.log('✅ Image uploaded successfully, URL:', fileUrl);
          return fileUrl;
        }
      }
      
      // Fallback for various response formats
      const fileUrl = data.url || data.image_url || data.imageUrl || data.data?.file_url || data.data?.url;
      if (fileUrl) {
        console.log('✅ Image uploaded successfully (fallback format), URL:', fileUrl);
        return fileUrl;
      }
      
      // If success is true but no URL found, the upload likely succeeded
      // The attachment is linked via post_id, so we can return a success indicator
      if (data.success === true) {
        console.log('✅ Image upload succeeded (attachment linked via post_id)');
        // Return a success indicator - the attachment is already linked to the post
        return 'uploaded';
      }
      
      // If success is false or missing, extract error message
      const errorMessage = data.error || data.message || data.details || 'Failed to upload image';
      console.error('❌ Image upload failed:', errorMessage);
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('FeedService.uploadImage:', error);
      
      // Don't re-throw if it's already a proper Error with message
      if (error.message === 'No file provided') {
        throw error;
      }
      
      // If error has a message, use it; otherwise create a generic one
      if (error.message && error.message !== 'Failed to upload image') {
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

      const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');
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
      
      // Log response for debugging
      console.log('UploadAudio response:', JSON.stringify(data, null, 2));
      
      // Response format: { success: true, data: { file_url: "...", ... } }
      if (data.success && data.data) {
        const fileUrl = data.data.file_url || data.data.url;
        if (fileUrl) {
          console.log('✅ Audio uploaded successfully, URL:', fileUrl);
          return fileUrl;
        }
      }
      
      // Fallback for various response formats
      const fileUrl = data.url || data.audio_url || data.audioUrl || data.data?.file_url || data.data?.url;
      if (fileUrl) {
        console.log('✅ Audio uploaded successfully (fallback format), URL:', fileUrl);
        return fileUrl;
      }
      
      // If success is true but no URL found, the upload likely succeeded
      // The attachment is linked via post_id, so we can return a success indicator
      if (data.success === true) {
        console.log('✅ Audio upload succeeded (attachment linked via post_id)');
        // Return a success indicator - the attachment is already linked to the post
        return 'uploaded';
      }
      
      // If success is false or missing, extract error message
      const errorMessage = data.error || data.message || data.details || 'Failed to upload audio';
      console.error('❌ Audio upload failed:', errorMessage);
      throw new Error(errorMessage);
    } catch (error: any) {
      console.error('FeedService.uploadAudio:', error);
      
      // Don't re-throw if it's already a proper Error with message
      if (error.message === 'No file provided') {
        throw error;
      }
      
      // If error has a message, use it; otherwise create a generic one
      if (error.message && error.message !== 'Failed to upload audio') {
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
   * Repost a post (create repost)
   */
  async repost(postId: string, withComment: boolean = false, comment?: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Validate comment if with_comment is true
      if (withComment) {
        if (!comment || comment.trim().length === 0) {
          throw new Error('Comment is required when reposting with thoughts');
        }
        if (comment.length > 500) {
          throw new Error('Comment must be 500 characters or less');
        }
      }

      const response = await apiFetch(
        `/api/posts/${postId}/repost`,
        {
          method: 'POST',
          session,
          body: JSON.stringify({
            with_comment: withComment,
            ...(withComment && comment && { comment: comment.trim() }),
          }),
        }
      );

      return response;
    } catch (error: any) {
      console.error('FeedService.repost:', error);
      
      // Handle 409 Conflict (already reposted)
      if (error.status === 409) {
        throw new Error('You have already reposted this post');
      }
      
      throw error;
    }
  }

  /**
   * Remove repost (un-repost)
   */
  async unrepost(postId: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch(
        `/api/posts/${postId}/repost`,
        {
          method: 'DELETE',
          session,
        }
      );

      return response;
    } catch (error: any) {
      console.error('FeedService.unrepost:', error);
      
      // Handle 404 Not Found (not reposted)
      if (error.status === 404) {
        throw new Error('You have not reposted this post');
      }
      
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

  /**
   * Fetch posts by a specific user (for their profile)
   */
  async getUserPosts(userId: string, page: number = 1, limit: number = 10): Promise<{
    posts: Post[];
    hasMore: boolean;
  }> {
    try {
      console.log(`📡 FeedService: Getting posts for user ${userId} (page: ${page}, limit: ${limit})`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ FeedService: Not authenticated');
        throw new Error('Not authenticated');
      }

      // Try API endpoint first (if available)
      try {
        const response = await apiFetch<{ success: boolean; data: FeedResponse }>(
          `/api/posts/user/${userId}?page=${page}&limit=${limit}`,
          {
            method: 'GET',
            session,
          }
        );

        const feedData = response.success ? response.data : response;
        const rawPosts = feedData.posts || [];

        if (rawPosts.length > 0) {
          // Transform API response (same as getFeedPosts)
          const posts: Post[] = rawPosts.map((apiPost: any) => {
            const imageAttachment = apiPost.attachments?.find((a: any) => a.attachment_type === 'image');
            const audioAttachment = apiPost.attachments?.find((a: any) => a.attachment_type === 'audio');

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
                id: apiPost.author.id,
                display_name: apiPost.author.name || apiPost.author.display_name,
                username: apiPost.author.username,
                avatar_url: apiPost.author.avatar_url,
                role: apiPost.author.role,
                headline: apiPost.author.headline,
                bio: apiPost.author.bio,
                subscription_tier: apiPost.author.subscription_tier,
              },
              content: apiPost.content,
              post_type: apiPost.post_type,
              visibility: apiPost.visibility,
              image_url: imageAttachment?.url,
              audio_url: audioAttachment?.url,
              reactions_count: reactionsCount,
              user_reaction: userReaction,
              comments_count: apiPost.comments_count || 0,
              created_at: apiPost.created_at,
              reposted_from_id: apiPost.reposted_from_id || null,
              reposted_from: apiPost.reposted_from ? {
                id: apiPost.reposted_from.id,
                author: {
                  id: apiPost.reposted_from.author.id,
                  display_name: apiPost.reposted_from.author.name || apiPost.reposted_from.author.display_name,
                  username: apiPost.reposted_from.author.username,
                  avatar_url: apiPost.reposted_from.author.avatar_url,
                  role: apiPost.reposted_from.author.role,
                  headline: apiPost.reposted_from.author.headline,
                  bio: apiPost.reposted_from.author.bio,
                },
                content: apiPost.reposted_from.content,
                post_type: apiPost.reposted_from.post_type,
                visibility: apiPost.reposted_from.visibility,
                created_at: apiPost.reposted_from.created_at,
              } : undefined,
            };
          });

          return {
            posts,
            hasMore: feedData.pagination?.has_more || false,
          };
        }
      } catch (apiError) {
        console.log('⚠️ FeedService: API endpoint not available, falling back to Supabase');
      }

      // Fallback to direct Supabase query (using separate queries to avoid RLS issues)
      const offset = (page - 1) * limit;

      // Step 1: Get posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, post_type, visibility, event_id, created_at, updated_at, reposted_from_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('❌ FeedService: Error fetching user posts from Supabase:', postsError);
        throw postsError;
      }

      if (!postsData || postsData.length === 0) {
        console.log('ℹ️ No posts found for user:', userId);
        return { posts: [], hasMore: false };
      }

      console.log(`✅ Found ${postsData.length} posts for user:`, userId);

      // DEBUG: Log reposted_from_id values
      postsData.forEach((post, idx) => {
        console.log(`📝 getUserPosts - Post ${idx + 1} (${post.id}):`, {
          hasContent: !!post.content,
          contentLength: post.content?.length || 0,
          reposted_from_id: post.reposted_from_id || 'null',
        });
      });

      // Step 2: Get author information
      const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier')
        .eq('id', userId)
        .single();

      if (authorError) {
        console.warn('⚠️ Could not fetch author profile:', authorError);
      }

      // Step 3: Get reposted_from posts (for quote reposts)
      const repostedFromIds = postsData
        .filter(p => p.reposted_from_id)
        .map(p => p.reposted_from_id)
        .filter((id): id is string => id !== null);

      let repostedPostsMap = new Map();
      if (repostedFromIds.length > 0) {
        const { data: repostedPostsData, error: repostedError } = await supabase
          .from('posts')
          .select('id, user_id, content, created_at, visibility, post_type')
          .in('id', repostedFromIds);

        if (repostedError) {
          console.warn('⚠️ Could not fetch reposted posts:', repostedError);
        } else if (repostedPostsData) {
          // Get authors for reposted posts
          const repostedUserIds = [...new Set(repostedPostsData.map(p => p.user_id))];
          const { data: repostedAuthorsData } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier')
            .in('id', repostedUserIds);

          const repostedAuthorsMap = new Map();
          repostedAuthorsData?.forEach(author => {
            repostedAuthorsMap.set(author.id, author);
          });

          repostedPostsData.forEach(post => {
            repostedPostsMap.set(post.id, {
              ...post,
              author: repostedAuthorsMap.get(post.user_id),
            });
          });

          // DEBUG: Log repostedPostsMap
          console.log(`📦 getUserPosts - Built repostedPostsMap with ${repostedPostsMap.size} entries:`,
            Array.from(repostedPostsMap.keys())
          );
        }
      }

      // Step 4: Get attachments, reactions, comments counts
      const postIds = postsData.map(p => p.id);

      const [attachmentsResult, reactionsResult, commentsResult] = await Promise.all([
        supabase.from('post_attachments').select('post_id, file_url, attachment_type').in('post_id', postIds),
        supabase.from('post_reactions').select('post_id, reaction_type').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
      ]);

      // Build maps
      const attachmentsMap = new Map();
      attachmentsResult.data?.forEach(att => {
        if (!attachmentsMap.has(att.post_id)) {
          attachmentsMap.set(att.post_id, []);
        }
        attachmentsMap.get(att.post_id).push(att);
      });

      const reactionsMap = new Map();
      reactionsResult.data?.forEach(reaction => {
        if (!reactionsMap.has(reaction.post_id)) {
          reactionsMap.set(reaction.post_id, { support: 0, love: 0, fire: 0, congrats: 0 });
        }
        const counts = reactionsMap.get(reaction.post_id);
        counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
      });

      const commentsMap = new Map();
      commentsResult.data?.forEach(comment => {
        commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
      });

      // Transform to Post type
      const transformedPosts: Post[] = postsData.map((post: any) => {
        const attachments = attachmentsMap.get(post.id) || [];
        const imageAttachment = attachments.find((a: any) => a.attachment_type === 'image');
        const audioAttachment = attachments.find((a: any) => a.attachment_type === 'audio');

        return {
          id: post.id,
          author: authorData ? {
            id: authorData.id,
            display_name: authorData.display_name,
            username: authorData.username,
            avatar_url: authorData.avatar_url,
            role: authorData.role,
            headline: authorData.professional_headline,
            bio: authorData.bio,
            subscription_tier: authorData.subscription_tier,
          } : {
            id: userId,
            display_name: 'Unknown',
            username: 'unknown',
            avatar_url: null,
          },
          content: post.content,
          post_type: post.post_type,
          visibility: post.visibility,
          image_url: imageAttachment?.file_url || null,
          audio_url: audioAttachment?.file_url || null,
          reactions_count: reactionsMap.get(post.id) || { support: 0, love: 0, fire: 0, congrats: 0 },
          comments_count: commentsMap.get(post.id) || 0,
          created_at: post.created_at,
          reposted_from_id: post.reposted_from_id || null,
          reposted_from: post.reposted_from_id && repostedPostsMap.has(post.reposted_from_id)
            ? repostedPostsMap.get(post.reposted_from_id)
            : undefined,
        };
      });

      // DEBUG: Log final transformed posts with repost data
      transformedPosts.forEach((post, idx) => {
        if (post.reposted_from_id) {
          console.log(`🔄 getUserPosts - Transformed Post ${idx + 1}:`, {
            id: post.id,
            reposted_from_id: post.reposted_from_id,
            hasRepostedFrom: !!post.reposted_from,
            repostedFromContent: post.reposted_from?.content?.substring(0, 30),
            mapHasKey: repostedPostsMap.has(post.reposted_from_id),
          });
        }
      });

      return {
        posts: transformedPosts,
        hasMore: postsData.length === limit,
      };
    } catch (error: any) {
      console.error('❌ FeedService.getUserPosts:', error);
      throw error;
    }
  }

  /**
   * Get a single post by ID
   * Tries API endpoint first, falls back to direct Supabase query
   * @param postId - The ID of the post to fetch
   * @returns The post data
   */
  async getPostById(postId: string): Promise<Post> {
    try {
      console.log(`📡 FeedService: Getting post by ID (${postId})`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ FeedService: Not authenticated');
        throw new Error('Not authenticated');
      }

      // Try API endpoint first, fall back to Supabase if it fails
      try {
        console.log('✅ FeedService: Trying API endpoint...');
        const response = await apiFetch<{ success: boolean; data: { post: any } }>(
          `/api/posts/${postId}`,
          {
            method: 'GET',
            session,
          }
        );

        console.log('📦 API Response structure:', JSON.stringify(response).substring(0, 200));

        // Handle different response formats
        let postData;
        if (response.success && response.data) {
          // New format: { success: true, data: { post: {...} } } or { success: true, data: {...} }
          postData = response.data.post || response.data;
        } else if (response.data) {
          // Old format: { data: {...} }
          postData = response.data;
        } else {
          // Direct format: { id, author, ... }
          postData = response;
        }

        console.log('📦 Extracted postData:', postData ? `id: ${postData.id}` : 'null');

        if (postData && postData.id) {
          const imageAttachment = postData.attachments?.find((a: any) => a.attachment_type === 'image');
          const audioAttachment = postData.attachments?.find((a: any) => a.attachment_type === 'audio');

          const reactions = postData.reactions || {};
          const reactionsCount = {
            support: reactions.support || 0,
            love: reactions.love || 0,
            fire: reactions.fire || 0,
            congrats: reactions.congrats || 0,
          };

          console.log('✅ FeedService: Post fetched from API');
          return {
            id: postData.id,
            author: {
              id: postData.author?.id || '',
              username: postData.author?.username || '',
              display_name: postData.author?.name || postData.author?.display_name || 'Unknown',
              avatar_url: postData.author?.avatar_url,
              role: postData.author?.role,
              headline: postData.author?.headline,
              bio: postData.author?.bio,
            },
            content: postData.content || '',
            post_type: postData.post_type || 'update',
            visibility: postData.visibility || 'public',
            image_url: imageAttachment?.file_url,
            audio_url: audioAttachment?.file_url,
            event_id: postData.event_id,
            reactions_count: reactionsCount,
            user_reaction: reactions.user_reaction || null,
            comments_count: postData.comment_count || postData.comments_count || 0,
            shares_count: postData.shares_count || postData.repost_count || 0,
            created_at: postData.created_at,
            is_reposted: postData.is_reposted || false,
            is_saved: postData.is_saved || false,
            reposted_from_id: postData.reposted_from_id || null,
            reposted_from: postData.reposted_from || undefined,
          };
        }
      } catch (apiError: any) {
        console.warn('⚠️ FeedService: API endpoint failed:', apiError.message);
        console.warn('⚠️ Using Supabase fallback...');
      }

      // Fallback: Direct Supabase query
      console.log('📡 FeedService: Fetching from Supabase directly...');

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            role,
            bio,
            professional_headline,
            subscription_tier
          )
        `)
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('❌ Supabase query error:', postError);
        throw new Error(`Post not found: ${postError.message}`);
      }

      if (!postData) {
        console.error('❌ No post data returned');
        throw new Error('Post not found');
      }

      console.log('📦 Supabase post data received:', postData.id);

      // Fetch attachments
      const { data: attachments } = await supabase
        .from('post_attachments')
        .select('*')
        .eq('post_id', postId);

      // Fetch reactions
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', postId);

      const reactionsCount = {
        support: reactions?.filter(r => r.reaction_type === 'support').length || 0,
        love: reactions?.filter(r => r.reaction_type === 'love').length || 0,
        fire: reactions?.filter(r => r.reaction_type === 'fire').length || 0,
        congrats: reactions?.filter(r => r.reaction_type === 'congrats').length || 0,
      };

      const userReaction = reactions?.find(r => r.user_id === session.user.id)?.reaction_type || null;

      // Fetch counts
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      const { count: sharesCount } = await supabase
        .from('post_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      const { data: userRepost } = await supabase
        .from('post_reposts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      const { data: savedPost } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Handle reposted_from (if this is a repost)
      let repostedFrom = undefined;
      if (postData.reposted_from_id) {
        try {
          // Recursively fetch the original post
          repostedFrom = await this.getPostById(postData.reposted_from_id);
        } catch (err) {
          console.warn('⚠️ Failed to fetch reposted_from post:', err);
        }
      }

      const imageAttachment = attachments?.find((a: any) => a.file_type?.startsWith('image/'));
      const audioAttachment = attachments?.find((a: any) => a.file_type?.startsWith('audio/'));

      console.log('✅ FeedService: Post fetched from Supabase');
      return {
        id: postData.id,
        author: {
          id: postData.profiles?.id || postData.user_id,
          username: postData.profiles?.username || 'unknown',
          display_name: postData.profiles?.display_name || 'Unknown',
          avatar_url: postData.profiles?.avatar_url || null,
          role: postData.profiles?.role,
          headline: postData.profiles?.professional_headline,
          bio: postData.profiles?.bio,
          subscription_tier: postData.profiles?.subscription_tier,
        },
        content: postData.content || '',
        post_type: postData.post_type || 'update',
        visibility: postData.visibility || 'public',
        image_url: imageAttachment?.file_url || null,
        audio_url: audioAttachment?.file_url || null,
        event_id: postData.event_id || null,
        reactions_count: reactionsCount,
        user_reaction: userReaction,
        comments_count: commentsCount || 0,
        shares_count: sharesCount || 0,
        created_at: postData.created_at,
        is_reposted: !!userRepost,
        is_saved: !!savedPost,
        reposted_from_id: postData.reposted_from_id || null,
        reposted_from: repostedFrom,
      };
    } catch (error: any) {
      console.error('❌ FeedService.getPostById:', error);
      throw new Error(error.message || 'Failed to fetch post');
    }
  }
}

export const feedService = new FeedService();

