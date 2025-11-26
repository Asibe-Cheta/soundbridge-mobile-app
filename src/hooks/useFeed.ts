import { useState, useEffect, useCallback } from 'react';
import { Post } from '../types/feed.types';
import { feedService } from '../services/api/feedService';
import { realtimeService } from '../services/realtime/realtimeService';
import { useAuth } from '../contexts/AuthContext';

export const useFeed = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Load initial posts
  const loadPosts = useCallback(async (pageNum: number = 1) => {
    // Don't make API calls if auth is not ready or user is not authenticated
    if (authLoading || !user || !session) {
      console.log('⏳ Waiting for authentication before loading posts...');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(pageNum === 1);
      setError(null);
      const { posts: newPosts, hasMore: more } = await feedService.getFeedPosts(
        pageNum,
        10
      );

      if (pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(more);
      setPage(pageNum);
    } catch (err: any) {
      // Handle 404 errors gracefully - API endpoint may not be available yet
      if (err?.status === 404) {
        console.warn('Feed API endpoint not available (404). Showing empty feed.');
        if (pageNum === 1) {
          setPosts([]);
        }
        setHasMore(false);
        setError(null); // Don't show error for missing endpoint
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        console.error('Error loading posts:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, session, authLoading]);

  // Refresh feed
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(1);
  }, [loadPosts]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (!loading && hasMore && !refreshing) {
      await loadPosts(page + 1);
    }
  }, [loading, hasMore, page, loadPosts, refreshing]);

  // Add reaction optimistically
  const addReaction = useCallback(
    async (
      postId: string,
      reactionType: 'support' | 'love' | 'fire' | 'congrats'
    ) => {
      // Optimistic update
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const currentReaction = post.user_reaction;
            const isTogglingOff = currentReaction === reactionType;
            
            if (isTogglingOff) {
              // Toggling off - remove reaction
              return {
                ...post,
                user_reaction: null,
                reactions_count: {
                  ...post.reactions_count,
                  [reactionType]: Math.max(0, post.reactions_count[reactionType] - 1),
                },
              };
            } else {
              // Adding new reaction
              const newReactions = { ...post.reactions_count };
              if (currentReaction) {
                newReactions[currentReaction] = Math.max(0, newReactions[currentReaction] - 1);
              }
              newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;

              return {
                ...post,
                user_reaction: reactionType,
                reactions_count: newReactions,
              };
            }
          }
          return post;
        })
      );

      try {
        const currentPost = posts.find((p) => p.id === postId);
        const isTogglingOff = currentPost?.user_reaction === reactionType;

        if (isTogglingOff) {
          await feedService.removeReaction(postId);
        } else {
          await feedService.addReaction(postId, reactionType);
        }
      } catch (err) {
        // Revert on error - reload the post to get correct state
        const currentPost = posts.find((p) => p.id === postId);
        if (currentPost) {
          setPosts((prev) =>
            prev.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  user_reaction: currentPost.user_reaction,
                  reactions_count: currentPost.reactions_count,
                };
              }
              return post;
            })
          );
        }
        throw err;
      }
    },
    [posts]
  );

  // Remove reaction optimistically
  const removeReaction = useCallback(async (postId: string) => {
    // Find current reaction type
    const post = posts.find((p) => p.id === postId);
    const currentReaction = post?.user_reaction;

    if (!currentReaction) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            user_reaction: null,
            reactions_count: {
              ...p.reactions_count,
              [currentReaction]: Math.max(0, p.reactions_count[currentReaction] - 1),
            },
          };
        }
        return p;
      })
    );

    try {
      await feedService.removeReaction(postId);
    } catch (err) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              user_reaction: currentReaction,
              reactions_count: {
                ...p.reactions_count,
                [currentReaction]: (p.reactions_count[currentReaction] || 0) + 1,
              },
            };
          }
          return p;
        })
      );
      throw err;
    }
  }, [posts]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToFeedPosts((newPost) => {
      setPosts((prev) => [newPost, ...prev]);
    });

    return unsubscribe;
  }, []);

  // Initial load - wait for auth to be ready
  useEffect(() => {
    // Only load posts when auth is ready and user is authenticated
    if (!authLoading && user && session) {
      loadPosts(1);
    } else if (!authLoading && !user) {
      // Auth is ready but no user - clear loading state
      setLoading(false);
      setPosts([]);
    }
  }, [authLoading, user, session, loadPosts]);

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    addReaction,
    removeReaction,
  };
};

