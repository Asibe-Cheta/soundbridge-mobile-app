import { useState, useEffect, useCallback } from 'react';
import { Comment } from '../types/feed.types';
import { feedService } from '../services/api/feedService';
import { realtimeService } from '../services/realtime/realtimeService';
import { useAuth } from '../contexts/AuthContext';

export const useComments = (postId: string) => {
  const { user, session, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Load comments
  const loadComments = useCallback(async (pageNum: number = 1) => {
    // Don't make API calls if auth is not ready or user is not authenticated
    if (authLoading || !user || !session) {
      console.log('⏳ Waiting for authentication before loading comments...');
      setLoading(false);
      return;
    }

    try {
      setLoading(pageNum === 1);
      setError(null);
      const { comments: newComments, hasMore: more } = await feedService.getComments(
        postId,
        pageNum,
        20
      );

      if (pageNum === 1) {
        setComments(newComments);
      } else {
        setComments((prev) => [...prev, ...newComments]);
      }

      setHasMore(more);
      setPage(pageNum);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, user, session, authLoading]);

  // Add comment optimistically
  const addComment = useCallback(
    async (content: string, parentCommentId?: string) => {
      // Optimistic update - we'll add a temporary comment
      const tempComment: Comment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user: {
          id: 'current-user',
          username: 'current_user',
          display_name: 'You',
        },
        content,
        likes_count: 0,
        user_liked: false,
        replies_count: 0,
        created_at: new Date().toISOString(),
      };

      setComments((prev) => [tempComment, ...prev]);

      try {
        const newComment = await feedService.addComment(postId, content, parentCommentId);
        // Replace temp comment with real one
        setComments((prev) =>
          prev.map((c) => (c.id === tempComment.id ? newComment : c))
        );
        return newComment;
      } catch (err) {
        // Remove temp comment on error
        setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
        throw err;
      }
    },
    [postId]
  );

  // Like comment optimistically
  const likeComment = useCallback(async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    const isLiked = comment?.user_liked;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            user_liked: !isLiked,
            likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1,
          };
        }
        return c;
      })
    );

    try {
      if (isLiked) {
        await feedService.unlikeComment(commentId);
      } else {
        await feedService.likeComment(commentId);
      }
    } catch (err) {
      // Revert on error
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              user_liked: isLiked,
              likes_count: comment?.likes_count || 0,
            };
          }
          return c;
        })
      );
      throw err;
    }
  }, [comments]);

  // Load more comments
  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadComments(page + 1);
    }
  }, [loading, hasMore, page, loadComments]);

  // Subscribe to real-time comment updates
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToPostComments(postId, (newComment) => {
      setComments((prev) => {
        // Check if comment already exists (avoid duplicates)
        if (prev.some((c) => c.id === newComment.id)) {
          return prev;
        }
        return [newComment, ...prev];
      });
    });

    return unsubscribe;
  }, [postId]);

  // Initial load - wait for auth to be ready
  useEffect(() => {
    // Only load comments when auth is ready and user is authenticated
    if (!authLoading && user && session) {
      loadComments(1);
    } else if (!authLoading && !user) {
      // Auth is ready but no user - clear loading state
      setLoading(false);
      setComments([]);
    }
  }, [authLoading, user, session, loadComments]);

  return {
    comments,
    loading,
    hasMore,
    error,
    addComment,
    likeComment,
    loadMore,
    refresh: () => loadComments(1),
  };
};

