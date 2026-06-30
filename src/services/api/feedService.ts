import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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

      // Fetch user's reactions, all reaction counts, comment counts, and author verified status from Supabase.
      // The REST API may omit is_verified and subscription_tier — Supabase profiles is authoritative.
      const postIds = rawPosts.map((p: any) => p.id).filter(Boolean);
      const authorIds = [...new Set(rawPosts.map((p: any) => p.author?.id).filter(Boolean))];
      const [
        { data: userReactionRows, error: userReactionError },
        { data: allReactionRows },
        { data: commentCountRows },
        { data: authorRows },
        { data: attachmentRows },
        { data: postMetaRows },
      ] = await Promise.all([
        postIds.length > 0
          ? supabase
              .from('post_reactions')
              .select('post_id, reaction_type')
              .in('post_id', postIds)
              .eq('user_id', session.user.id)
          : Promise.resolve({ data: [] }),
        postIds.length > 0
          ? supabase
              .from('post_reactions')
              .select('post_id, reaction_type')
              .in('post_id', postIds)
          : Promise.resolve({ data: [] }),
        postIds.length > 0
          ? supabase
              .from('post_comments')
              .select('post_id')
              .in('post_id', postIds)
          : Promise.resolve({ data: [] }),
        authorIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, is_verified, subscription_tier')
              .in('id', authorIds)
          : Promise.resolve({ data: [] }),
        // Fetch attachments from Supabase — the web API feed endpoint may omit them
        postIds.length > 0
          ? supabase
              .from('post_attachments')
              .select('post_id, attachment_type, file_url')
              .in('post_id', postIds)
          : Promise.resolve({ data: [] }),
        // Fetch headline/gradient_preset from Supabase — web API does not return these fields
        postIds.length > 0
          ? supabase
              .from('posts')
              .select('id, headline, gradient_preset')
              .in('id', postIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (userReactionError) {
        console.warn('⚠️ FeedService: user reactions query failed (reactions will fall back to cache):', userReactionError.message);
      }

      const authorVerifiedMap = new Map<string, { is_verified: boolean; subscription_tier: string | null }>();
      (authorRows ?? []).forEach((a: any) => authorVerifiedMap.set(a.id, { is_verified: !!a.is_verified, subscription_tier: a.subscription_tier }));

      // Supabase-authoritative headline/gradient_preset map (web API omits these)
      const postMetaMap = new Map<string, { headline?: string; gradient_preset?: number }>();
      (postMetaRows ?? []).forEach((row: any) => {
        postMetaMap.set(row.id, { headline: row.headline ?? undefined, gradient_preset: row.gradient_preset ?? undefined });
      });

      // Build a Supabase-authoritative attachment map keyed by post_id
      const attachmentMap = new Map<string, { audio_url?: string; image_url?: string; image_urls?: string[] }>();
      (attachmentRows ?? []).forEach((row: any) => {
        const entry = attachmentMap.get(row.post_id) || { image_urls: [] };
        if (row.attachment_type === 'audio' && row.file_url) {
          entry.audio_url = row.file_url;
        } else if (row.attachment_type === 'image' && row.file_url) {
          entry.image_urls = [...(entry.image_urls || []), row.file_url];
          if (!entry.image_url) entry.image_url = row.file_url;
        }
        attachmentMap.set(row.post_id, entry);
      });

      const userReactionMap = new Map<string, string>();
      (userReactionRows ?? []).forEach((r: any) => userReactionMap.set(r.post_id, r.reaction_type));

      // Build per-post reaction counts from Supabase rows
      const reactionCountMap = new Map<string, { support: number; love: number; fire: number; congrats: number }>();
      (allReactionRows ?? []).forEach((r: any) => {
        const existing = reactionCountMap.get(r.post_id) ?? { support: 0, love: 0, fire: 0, congrats: 0 };
        const type = r.reaction_type as 'support' | 'love' | 'fire' | 'congrats';
        if (type in existing) existing[type] += 1;
        reactionCountMap.set(r.post_id, existing);
      });

      // Build per-post comment counts from Supabase rows
      const commentCountMap = new Map<string, number>();
      (commentCountRows ?? []).forEach((r: any) => {
        commentCountMap.set(r.post_id, (commentCountMap.get(r.post_id) ?? 0) + 1);
      });
      
      // Transform API response to match our Post type
      // API returns: { author: { name, ... }, attachments: [...], reactions: { user_reaction, ... } }
      // Our Post type expects: { author: { display_name, ... }, image_url, audio_url, reactions_count, user_reaction }
      const posts: Post[] = rawPosts.map((apiPost: any) => {
        // DEBUG: log attachment structure from feed API
        if (apiPost.attachments?.length > 0 || apiPost.image_urls?.length > 0) {
          console.log(`🖼️ Feed post ${apiPost.id} - attachments:`, JSON.stringify(apiPost.attachments?.slice(0,3)), '| image_urls:', apiPost.image_urls);
        }

        // Extract image(s) and audio — Supabase is authoritative; fall back to API response
        const sbAttachments = attachmentMap.get(apiPost.id);
        const imageAttachments = apiPost.attachments?.filter((a: any) =>
          a.attachment_type === 'image' || a.type === 'image'
        ) || [];
        const imageAttachment = imageAttachments[0];
        const audioAttachment = apiPost.attachments?.find((a: any) =>
          a.attachment_type === 'audio' || a.type === 'audio'
        );
        
        // Use Supabase as authoritative source for all counts and user_reaction.
        const userReaction = userReactionMap.get(apiPost.id) || null;
        const reactionsCount = reactionCountMap.get(apiPost.id) ?? { support: 0, love: 0, fire: 0, congrats: 0 };
        
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
            is_verified: authorVerifiedMap.get(apiPost.author?.id)?.is_verified ?? apiPost.author?.is_verified,
            subscription_tier: authorVerifiedMap.get(apiPost.author?.id)?.subscription_tier ?? apiPost.author?.subscription_tier,
          },
          content: apiPost.content || '',
          post_type: apiPost.post_type || 'update',
          visibility: apiPost.visibility || 'public',
          image_url: sbAttachments?.image_url || imageAttachment?.file_url || imageAttachment?.url,
          image_urls: (sbAttachments?.image_urls?.length ?? 0) > 1
            ? sbAttachments!.image_urls
            : imageAttachments.length > 1
              ? imageAttachments.map((a: any) => a.file_url || a.url).filter(Boolean)
              : (apiPost.image_urls?.length > 0 ? apiPost.image_urls : undefined),
          audio_url: sbAttachments?.audio_url || audioAttachment?.file_url || audioAttachment?.url,
          event_id: apiPost.event_id,
          headline: postMetaMap.get(apiPost.id)?.headline || apiPost.headline || undefined,
          gradient_preset: postMetaMap.get(apiPost.id)?.gradient_preset ?? apiPost.gradient_preset ?? undefined,
          reactions_count: reactionsCount,
          comments_count: commentCountMap.get(apiPost.id) ?? apiPost.comment_count ?? apiPost.comments_count ?? 0,
          user_reaction: userReaction,
          created_at: apiPost.created_at,
          updated_at: apiPost.updated_at || apiPost.created_at,
          reposted_from_id: apiPost.reposted_from_id || null,
          reposted_from: apiPost.reposted_from
            ? {
                ...apiPost.reposted_from,
                // Normalize author shape — API may return null or a different shape
                author: apiPost.reposted_from.author
                  ? {
                      id: apiPost.reposted_from.author.id || '',
                      username: apiPost.reposted_from.author.username || '',
                      display_name: apiPost.reposted_from.author.name || apiPost.reposted_from.author.display_name || apiPost.reposted_from.author.username || 'Unknown',
                      avatar_url: apiPost.reposted_from.author.avatar_url || undefined,
                      role: apiPost.reposted_from.author.role,
                      headline: apiPost.reposted_from.author.headline,
                      is_verified: apiPost.reposted_from.author.is_verified,
                      subscription_tier: apiPost.reposted_from.author.subscription_tier,
                    }
                  : null, // backfill will patch this below
              }
            : null,
        };
      });
      
      // For any repost missing its nested reposted_from object (or author), fetch from Supabase
      const missingRepostIds = posts
        .filter(p => p.reposted_from_id && (!p.reposted_from || !p.reposted_from.author))
        .map(p => p.reposted_from_id as string);

      if (missingRepostIds.length > 0) {
        try {
          const { data: originalPosts } = await supabase
            .from('posts')
            .select('id, user_id, content, post_type, visibility, created_at')
            .in('id', missingRepostIds);

          if (originalPosts && originalPosts.length > 0) {
            const authorIds = [...new Set(originalPosts.map(p => p.user_id))];
            const { data: authors } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, role')
              .in('id', authorIds);

            const authorsMap = new Map(authors?.map(a => [a.id, a]) || []);
            const originalsMap = new Map(originalPosts.map(p => [p.id, {
              ...p,
              author: authorsMap.get(p.user_id) || { id: p.user_id, username: 'unknown', display_name: 'Unknown User', avatar_url: undefined, role: undefined },
            }]));

            posts.forEach(p => {
              if (p.reposted_from_id && (!p.reposted_from || !p.reposted_from.author) && originalsMap.has(p.reposted_from_id)) {
                p.reposted_from = originalsMap.get(p.reposted_from_id);
              }
            });
          }
        } catch (e) {
          console.warn('⚠️ Could not backfill reposted_from data:', e);
        }
      }

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
        .select('id, user_id, content, post_type, visibility, event_id, headline, gradient_preset, created_at, updated_at, reposted_from_id')
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

      // Build attachments map — collect ALL image URLs per post
      const attachmentsMap = new Map<string, { image_url?: string; image_urls?: string[]; audio_url?: string }>();
      postIds.forEach(postId => {
        attachmentsMap.set(postId, { image_urls: [] });
      });

      attachmentsData?.forEach(attachment => {
        const current = attachmentsMap.get(attachment.post_id) || { image_urls: [] };
        if (attachment.attachment_type === 'image' && attachment.file_url) {
          current.image_urls = [...(current.image_urls || []), attachment.file_url];
          // Keep image_url as the first image for backwards compat
          if (!current.image_url) current.image_url = attachment.file_url;
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
          image_urls: (attachments.image_urls?.length ?? 0) > 1 ? attachments.image_urls : undefined,
          audio_url: attachments.audio_url || undefined,
          event_id: post.event_id || undefined,
          headline: post.headline || undefined,
          gradient_preset: post.gradient_preset ?? undefined,
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

      // ── Headline posts: insert directly to Supabase ──────────────────────────
      // The web API validates post_type against a hard-coded list that doesn't
      // include 'headline', and the database may have a matching CHECK constraint.
      // Bypassing the API gives us full control over all headline-specific fields.
      if (postData.post_type === 'headline') {
        const { data: inserted, error: insertErr } = await supabase
          .from('posts')
          .insert({
            user_id: session.user.id,
            content: postData.content,
            post_type: 'headline',
            visibility: postData.visibility,
            headline: postData.headline ?? null,
            gradient_preset: postData.gradient_preset ?? 1,
            event_id: postData.event_id ?? null,
          })
          .select('id, user_id, content, post_type, visibility, event_id, headline, gradient_preset, created_at, updated_at')
          .single();

        if (insertErr) throw insertErr;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier, is_verified')
          .eq('id', session.user.id)
          .single();

        const headlinePost: Post = {
          id: inserted.id,
          content: inserted.content,
          post_type: 'headline',
          visibility: inserted.visibility as any,
          headline: inserted.headline ?? undefined,
          gradient_preset: inserted.gradient_preset ?? 1,
          created_at: inserted.created_at,
          updated_at: inserted.updated_at || inserted.created_at,
          author: {
            id: session.user.id,
            username: profile?.username || '',
            display_name: profile?.display_name || '',
            avatar_url: profile?.avatar_url ?? undefined,
            role: profile?.role ?? undefined,
            bio: profile?.bio ?? undefined,
            headline: profile?.professional_headline ?? undefined,
            is_verified: profile?.is_verified ?? false,
            subscription_tier: profile?.subscription_tier ?? 'free',
          },
          reactions_count: { support: 0, love: 0, fire: 0, congrats: 0 },
          comments_count: 0,
          shares_count: 0,
          user_reaction: null,
          user_reposted: false,
        };

        return headlinePost;
      }

      // ── Photo posts: insert directly to Supabase (API may not accept 'photo' type) ──
      if (postData.post_type === 'photo') {
        const { data: inserted, error: insertErr } = await supabase
          .from('posts')
          .insert({
            user_id: session.user.id,
            content: postData.content,
            post_type: 'photo',
            visibility: postData.visibility,
          })
          .select('id, user_id, content, post_type, visibility, created_at, updated_at')
          .single();

        if (insertErr) throw insertErr;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier, is_verified')
          .eq('id', session.user.id)
          .single();

        return {
          id: inserted.id,
          content: inserted.content,
          post_type: 'photo',
          visibility: inserted.visibility as any,
          created_at: inserted.created_at,
          updated_at: inserted.updated_at || inserted.created_at,
          author: {
            id: session.user.id,
            username: profile?.username || '',
            display_name: profile?.display_name || '',
            avatar_url: profile?.avatar_url ?? undefined,
            role: profile?.role ?? undefined,
            bio: profile?.bio ?? undefined,
            headline: profile?.professional_headline ?? undefined,
            is_verified: profile?.is_verified ?? false,
            subscription_tier: profile?.subscription_tier ?? 'free',
          },
          reactions_count: { support: 0, love: 0, fire: 0, congrats: 0 },
          comments_count: 0,
          shares_count: 0,
          user_reaction: null,
          user_reposted: false,
        } as Post;
      }

      // ── All other post types: go through the web API ─────────────────────────
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
      let newPost: Post;
      if (response.success && response.data) {
        newPost = response.data;
      } else {
        newPost = (response as any).post || response;
      }

      // Patch gradient_preset / headline for non-headline types if supplied
      if (newPost?.id && (postData.headline !== undefined || postData.gradient_preset !== undefined)) {
        try {
          const patch: Record<string, unknown> = {};
          if (postData.headline !== undefined) patch.headline = postData.headline;
          if (postData.gradient_preset !== undefined) patch.gradient_preset = postData.gradient_preset;
          await supabase.from('posts').update(patch).eq('id', newPost.id);
          newPost = { ...newPost, ...patch } as Post;
        } catch (patchErr) {
          console.warn('FeedService.createPost: patch failed:', patchErr);
        }
      }

      return newPost;
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
   * Upload audio for post directly to Supabase Storage.
   * Bypasses the Next.js API route (which has a ~6MB body limit) by streaming
   * the file straight to the storage REST endpoint, then writes the attachment
   * record to Supabase. Safe for full-length tracks and untrimmed fallback audio.
   */
  async uploadAudio(uri: string, postId?: string): Promise<string> {
    try {
      if (!uri || uri.trim() === '') {
        throw new Error('No file provided');
      }

      // If uri is already a remote URL (server-side trim already uploaded it),
      // skip the storage upload and just write the attachment record.
      if (uri.startsWith('https://')) {
        if (postId) {
          const { error: attachErr } = await supabase
            .from('post_attachments')
            .insert({ post_id: postId, attachment_type: 'audio', file_url: uri });
          if (attachErr) {
            console.warn('FeedService.uploadAudio: attachment record failed:', attachErr);
          }
        }
        return uri;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const filename = uri.split('/').pop() || 'audio.mp3';
      const ext = (/\.(\w+)$/.exec(filename) || [])[1] || 'mp3';
      const mimeType = `audio/${ext === 'mp3' ? 'mpeg' : ext}`;
      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `post-clips/${session.user.id}/${Date.now()}_${sanitized}`;
      const bucket = 'audio-tracks'; // 100MB limit; post-attachments is image-sized

      const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;
      const uploadResp = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        mimeType,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: config.supabaseAnonKey,
          'Content-Type': mimeType,
          'x-upsert': 'false',
          'cache-control': '3600',
        },
      });

      if (uploadResp.status < 200 || uploadResp.status >= 300) {
        let errMsg = 'Failed to upload audio';
        try {
          const body = JSON.parse(uploadResp.body);
          errMsg = body.message || body.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      console.log('✅ Audio uploaded directly to Supabase Storage:', publicUrl);

      if (postId) {
        const { error: attachErr } = await supabase
          .from('post_attachments')
          .insert({ post_id: postId, attachment_type: 'audio', file_url: publicUrl });
        if (attachErr) {
          console.warn('FeedService.uploadAudio: attachment record failed:', attachErr);
        }
      }

      return publicUrl;
    } catch (error: any) {
      console.error('FeedService.uploadAudio:', error);
      throw error;
    }
  }

  /**
   * Add reaction to post
   */
  async addReaction(postId: string, reactionType: 'support' | 'love' | 'fire' | 'congrats'): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Write directly to Supabase — this is the source of truth for the mobile read path.
    // The REST API may not return user_reaction correctly, so we own persistence here.
    const { error } = await supabase
      .from('post_reactions')
      .upsert(
        { post_id: postId, user_id: session.user.id, reaction_type: reactionType },
        { onConflict: 'post_id,user_id' }
      );
    if (error) throw error;

    // Notify web API in background (non-blocking — no throw on failure)
    apiFetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      session,
      body: JSON.stringify({ reaction_type: reactionType }),
    }).catch(() => {});
  }

  /**
   * Remove reaction from post
   */
  async removeReaction(postId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Delete directly from Supabase
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', session.user.id);
    if (error) throw error;

    // Notify web API in background
    apiFetch(`/api/posts/${postId}/reactions`, {
      method: 'DELETE',
      session,
    }).catch(() => {});
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

      const response = await apiFetch<{ success: boolean; data: CommentsResponse } | CommentsResponse>(
        `/api/posts/${postId}/comments?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      // Handle both { success, data: { comments, pagination } } and direct { comments, pagination }
      const commentsData = (response as any).success ? (response as any).data : response;
      const rawComments: any[] = commentsData.comments || [];

      // Enrich comment authors with is_verified from Supabase (REST API omits it)
      const commentUserIds = [...new Set(rawComments.map((c: any) => (c.user ?? c.author)?.id ?? c.user_id).filter(Boolean))];
      const { data: commentAuthorRows } = commentUserIds.length > 0
        ? await supabase.from('profiles').select('id, is_verified').in('id', commentUserIds)
        : { data: [] };
      const commentVerifiedMap = new Map<string, boolean>();
      (commentAuthorRows ?? []).forEach((a: any) => commentVerifiedMap.set(a.id, !!a.is_verified));

      // Normalize user object — backend may use 'author' or 'user', different field names
      const comments: Comment[] = rawComments.map((c: any) => {
        const raw = c.user ?? c.author ?? null;
        const userId = raw?.id ?? c.user_id ?? '';
        return {
          ...c,
          user: raw
            ? {
                id: userId,
                display_name: raw.display_name ?? raw.name ?? raw.username ?? 'Unknown',
                username: raw.username ?? raw.name ?? '',
                avatar_url: raw.avatar_url ?? raw.avatar ?? null,
                is_verified: commentVerifiedMap.get(userId) ?? raw.is_verified,
              }
            : { id: userId, display_name: 'Unknown', username: '', avatar_url: null },
        };
      });

      return {
        comments,
        hasMore: commentsData.pagination?.has_more || false,
      };
    } catch (error) {
      console.error('FeedService.getComments:', error);
      throw error;
    }
  }

  /**
   * Add comment to post
   */
  async addComment(postId: string, content: string, parentCommentId?: string, imageUrl?: string): Promise<Comment> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<any>(
        `/api/posts/${postId}/comments`,
        {
          method: 'POST',
          session,
          body: JSON.stringify({
            content,
            parent_comment_id: parentCommentId,
            ...(imageUrl ? { image_url: imageUrl } : {}),
          }),
        }
      );

      // Unwrap { success, data: { comment } } or { success, data: {...} } or direct comment
      const rawComment = response?.success
        ? (response.data?.comment ?? response.data)
        : (response?.comment ?? response);

      // Normalize author/user — same logic as getComments
      const raw = rawComment?.user ?? rawComment?.author ?? null;
      return {
        ...rawComment,
        user: raw
          ? {
              id: raw.id ?? rawComment.user_id ?? '',
              display_name: raw.display_name ?? raw.name ?? raw.username ?? 'Unknown',
              username: raw.username ?? raw.name ?? '',
              avatar_url: raw.avatar_url ?? raw.avatar ?? null,
            }
          : { id: rawComment?.user_id ?? '', display_name: 'Unknown', username: '', avatar_url: null },
      } as Comment;
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
   * Delete a comment (own comment or post author deleting any comment)
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE', session });
    } catch (error) {
      console.error('FeedService.deleteComment:', error);
      throw error;
    }
  }

  /**
   * Get replies for a comment
   */
  async getReplies(commentId: string): Promise<Comment[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await apiFetch<any>(
        `/api/comments/${commentId}/replies`,
        { method: 'GET', session }
      );

      const data = response?.success ? response.data : response;
      const rawReplies: any[] = data?.replies ?? data?.comments ?? (Array.isArray(data) ? data : []);

      const replyUserIds = [...new Set(rawReplies.map((c: any) => (c.user ?? c.author)?.id ?? c.user_id).filter(Boolean))];
      const { data: replyAuthorRows } = replyUserIds.length > 0
        ? await supabase.from('profiles').select('id, is_verified').in('id', replyUserIds)
        : { data: [] };
      const replyVerifiedMap = new Map<string, boolean>();
      (replyAuthorRows ?? []).forEach((a: any) => replyVerifiedMap.set(a.id, !!a.is_verified));

      return rawReplies.map((c: any) => {
        const raw = c.user ?? c.author ?? null;
        const userId = raw?.id ?? c.user_id ?? '';
        return {
          ...c,
          user: raw
            ? {
                id: userId,
                display_name: raw.display_name ?? raw.name ?? raw.username ?? 'Unknown',
                username: raw.username ?? raw.name ?? '',
                avatar_url: raw.avatar_url ?? raw.avatar ?? null,
                is_verified: replyVerifiedMap.get(userId) ?? raw.is_verified,
              }
            : { id: userId, display_name: 'Unknown', username: '', avatar_url: null },
        };
      });
    } catch (error) {
      console.error('FeedService.getReplies:', error);
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
          method: 'PUT',
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
            const imageAttachments2 = apiPost.attachments?.filter((a: any) => a.attachment_type === 'image') || [];
            const imageAttachment = imageAttachments2[0];
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
              image_url: imageAttachment?.url || imageAttachment?.file_url,
              image_urls: imageAttachments2.length > 1
                ? imageAttachments2.map((a: any) => a.url || a.file_url).filter(Boolean)
                : undefined,
              audio_url: audioAttachment?.url || audioAttachment?.file_url,
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
        .select('id, user_id, content, post_type, visibility, event_id, headline, gradient_preset, created_at, updated_at, reposted_from_id')
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
        const imageAttachments3 = attachments.filter((a: any) => a.attachment_type === 'image');
        const imageAttachment = imageAttachments3[0];
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
          image_urls: imageAttachments3.length > 1
            ? imageAttachments3.map((a: any) => a.file_url).filter(Boolean)
            : undefined,
          audio_url: audioAttachment?.file_url || null,
          headline: post.headline || undefined,
          gradient_preset: post.gradient_preset ?? undefined,
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

  async getPhotoPostsByUser(userId: string, page: number = 1, limit: number = 30): Promise<{
    posts: Post[];
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * limit;

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, post_type, visibility, created_at, updated_at')
        .eq('user_id', userId)
        .eq('post_type', 'photo')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) return { posts: [], hasMore: false };

      const { data: authorData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, bio, professional_headline, subscription_tier, is_verified')
        .eq('id', userId)
        .single();

      const postIds = postsData.map((p: any) => p.id);

      const [attachmentsResult, reactionsResult, commentsResult] = await Promise.all([
        supabase.from('post_attachments').select('post_id, file_url, attachment_type').in('post_id', postIds),
        supabase.from('post_reactions').select('post_id, reaction_type').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
      ]);

      const attachmentsMap = new Map<string, any[]>();
      attachmentsResult.data?.forEach((att: any) => {
        if (!attachmentsMap.has(att.post_id)) attachmentsMap.set(att.post_id, []);
        attachmentsMap.get(att.post_id)!.push(att);
      });

      const reactionsMap = new Map<string, any>();
      reactionsResult.data?.forEach((reaction: any) => {
        if (!reactionsMap.has(reaction.post_id)) {
          reactionsMap.set(reaction.post_id, { support: 0, love: 0, fire: 0, congrats: 0 });
        }
        const counts = reactionsMap.get(reaction.post_id);
        counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
      });

      const commentsMap = new Map<string, number>();
      commentsResult.data?.forEach((comment: any) => {
        commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
      });

      const posts: Post[] = postsData.map((post: any) => {
        const attachments = attachmentsMap.get(post.id) || [];
        const imageAttachments = attachments.filter((a: any) => a.attachment_type === 'image');
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
            is_verified: authorData.is_verified,
          } : { id: userId, display_name: 'Unknown', username: 'unknown' },
          content: post.content,
          post_type: 'photo' as const,
          visibility: post.visibility,
          image_url: imageAttachments[0]?.file_url || undefined,
          image_urls: imageAttachments.length > 1
            ? imageAttachments.map((a: any) => a.file_url).filter(Boolean)
            : undefined,
          reactions_count: reactionsMap.get(post.id) || { support: 0, love: 0, fire: 0, congrats: 0 },
          comments_count: commentsMap.get(post.id) || 0,
          created_at: post.created_at,
          updated_at: post.updated_at || post.created_at,
        };
      });

      return { posts, hasMore: postsData.length === limit };
    } catch (error: any) {
      console.error('❌ FeedService.getPhotoPostsByUser:', error);
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
          const imageAttachments4 = postData.attachments?.filter((a: any) => a.attachment_type === 'image') || [];
          const imageAttachment = imageAttachments4[0];
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
            image_urls: imageAttachments4.length > 1
              ? imageAttachments4.map((a: any) => a.file_url || a.url).filter(Boolean)
              : undefined,
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

      const imageAttachments5 = attachments?.filter((a: any) => a.file_type?.startsWith('image/')) || [];
      const imageAttachment = imageAttachments5[0];
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
        image_urls: imageAttachments5.length > 1
          ? imageAttachments5.map((a: any) => a.file_url).filter(Boolean)
          : undefined,
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

