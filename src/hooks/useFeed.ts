import { useState, useEffect, useCallback, useRef } from 'react';
import { Post } from '../types/feed.types';
import { feedService } from '../services/api/feedService';
import { realtimeService } from '../services/realtime/realtimeService';
import { feedCacheService } from '../services/feedCacheService';
import { useAuth } from '../contexts/AuthContext';

export const useFeed = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false); // Start with false - show cached data immediately
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const backgroundRefreshRef = useRef(false);

  // Load initial posts with instant cache loading
  const loadPosts = useCallback(async (pageNum: number = 1, forceRefresh: boolean = false) => {
    // Don't make API calls if auth is not ready or user is not authenticated
    if (authLoading || !user || !session) {
      console.log('⏳ Waiting for authentication before loading posts...');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const isFirstPage = pageNum === 1;
    const isInitialLoad = isInitialLoadRef.current && isFirstPage;

    try {
      // For initial load, try to load from cache first (instant display)
      if (isInitialLoad && !forceRefresh) {
        const cached = await feedCacheService.getCachedFeed();
        
        if (cached && cached.posts.length > 0) {
          console.log('⚡ Instant load: Showing cached feed immediately');
          setPosts(cached.posts);
          setHasMore(cached.hasMore);
          setPage(cached.page);
          setLoading(false);
          isInitialLoadRef.current = false;
          
          // Fetch fresh data in background (silent refresh)
          backgroundRefreshRef.current = true;
          setTimeout(() => {
            loadPosts(1, true).finally(() => {
              backgroundRefreshRef.current = false;
            });
          }, 100); // Small delay to ensure UI is rendered first
          return;
        }
      }

      // No cache or force refresh - fetch from API
      // Only show loading spinner if it's a manual refresh (pull-to-refresh)
      if (!isInitialLoad && !backgroundRefreshRef.current) {
        setLoading(isFirstPage && !refreshing);
      }
      
      setError(null);
      const { posts: newPosts, hasMore: more } = await feedService.getFeedPosts(
        pageNum,
        10
      );

      if (isFirstPage) {
        setPosts(newPosts);
        // Cache the fresh data
        await feedCacheService.saveFeedCache(newPosts, pageNum, more);
      } else {
        setPosts((prev) => {
          const updated = [...prev, ...newPosts];
          // Update cache with appended posts
          feedCacheService.appendToCache(newPosts, pageNum, more);
          return updated;
        });
      }

      setHasMore(more);
      setPage(pageNum);
      isInitialLoadRef.current = false;
    } catch (err: any) {
      // Handle 404 errors gracefully - API endpoint may not be available yet
      if (err?.status === 404) {
        console.warn('Feed API endpoint not available (404).');
        
        // If we have cached data, keep showing it
        if (isFirstPage && posts.length === 0) {
          const cached = await feedCacheService.getCachedFeed();
          if (cached) {
            setPosts(cached.posts);
            setHasMore(cached.hasMore);
            setPage(cached.page);
          } else {
            setPosts([]);
          }
        }
        
        setHasMore(false);
        setError(null); // Don't show error for missing endpoint
      } else {
        // Only show error if we don't have cached data to fall back to
        if (posts.length === 0) {
          setError(err instanceof Error ? err.message : 'Failed to load posts');
        }
        console.error('Error loading posts:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      backgroundRefreshRef.current = false;
    }
  }, [user, session, authLoading, posts.length, refreshing]);

  // Refresh feed (pull-to-refresh)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    // Force refresh - bypass cache
    await loadPosts(1, true);
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
        
        // Update cache with new reaction state
        const updatedPost = posts.find((p) => p.id === postId);
        if (updatedPost) {
          await feedCacheService.updatePostInCache(postId, {
            user_reaction: updatedPost.user_reaction,
            reactions_count: updatedPost.reactions_count,
          });
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
      // Optimistic update - add to UI immediately
      setPosts((prev) => {
        // Check for duplicates
        if (prev.some(p => p.id === newPost.id)) {
          return prev;
        }
        return [newPost, ...prev];
      });
      
      // Update cache in background
      feedCacheService.prependPostToCache(newPost);
    });

    return unsubscribe;
  }, []);

  // Track if initial load has been attempted
  const initialLoadAttemptedRef = useRef(false);

  // Initial load - show cached data immediately, then refresh when auth is ready
  useEffect(() => {
    // Prevent multiple initial loads
    if (initialLoadAttemptedRef.current) {
      return;
    }

    // Try to load cached data immediately (even before auth is ready)
    // This provides instant feed display like LinkedIn/Instagram
    const loadCachedData = async () => {
      if (isInitialLoadRef.current) {
        const cached = await feedCacheService.getCachedFeed();
        if (cached && cached.posts.length > 0) {
          console.log('⚡ Instant load: Showing cached feed before auth check');
          setPosts(cached.posts);
          setHasMore(cached.hasMore);
          setPage(cached.page);
          setLoading(false);
        }
      }
    };

    loadCachedData();

    // Once auth is ready, load fresh data
    if (!authLoading && user && session) {
      initialLoadAttemptedRef.current = true;
      // Small delay to ensure cached data is displayed first
      const timeoutId = setTimeout(() => {
        loadPosts(1);
      }, 50);
      
      return () => clearTimeout(timeoutId);
    } else if (!authLoading && !user) {
      // Auth is ready but no user - clear posts
      initialLoadAttemptedRef.current = true;
      setPosts([]);
      setLoading(false);
    }
  }, [authLoading, user?.id, session?.access_token]); // Use stable identifiers instead of objects

  // Delete post optimistically
  const deletePost = useCallback(async (postId: string) => {
    try {
      // Optimistic update - remove from UI immediately
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      
      // Update cache in background
      await feedCacheService.removePostFromCache(postId);
      
      // Call API to delete
      await feedService.deletePost(postId);
      
      // Success - post is already removed from UI
    } catch (err) {
      // Revert on error - reload the feed to restore the post
      console.error('Failed to delete post:', err);
      await refresh();
      throw err;
    }
  }, [refresh]);

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
    deletePost,
  };
};

