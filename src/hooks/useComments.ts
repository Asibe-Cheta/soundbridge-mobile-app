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
  const [repliesMap, setRepliesMap] = useState<Record<string, Comment[]>>({});
  const [loadingRepliesSet, setLoadingRepliesSet] = useState<Set<string>>(new Set());

  // Load comments
  const loadComments = useCallback(async (pageNum: number = 1) => {
    if (authLoading || !user || !session) {
      setLoading(false);
      return;
    }
    try {
      setLoading(pageNum === 1);
      setError(null);
      const { comments: newComments, hasMore: more } = await feedService.getComments(postId, pageNum, 20);
      if (pageNum === 1) {
        setComments(newComments);
      } else {
        setComments((prev) => [...prev, ...newComments]);
      }
      setHasMore(more);
      setPage(pageNum);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      setHasMore(false);
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, user, session, authLoading]);

  // Load replies for a comment
  const loadReplies = useCallback(async (commentId: string) => {
    setLoadingRepliesSet(prev => new Set([...prev, commentId]));
    try {
      const replies = await feedService.getReplies(commentId);
      setRepliesMap(prev => ({ ...prev, [commentId]: replies }));
    } catch (err) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoadingRepliesSet(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }, []);

  // Add comment or reply optimistically
  const addComment = useCallback(
    async (content: string, parentCommentId?: string, imageUrl?: string) => {
      const tempComment: Comment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user: { id: 'current-user', username: 'current_user', display_name: 'You' },
        content,
        image_url: imageUrl,
        likes_count: 0,
        user_liked: false,
        replies_count: 0,
        created_at: new Date().toISOString(),
      };

      if (parentCommentId) {
        // Optimistically add to replies and bump parent count everywhere
        setRepliesMap(prev => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            updated[key] = updated[key].map(c =>
              c.id === parentCommentId ? { ...c, replies_count: c.replies_count + 1 } : c
            );
          }
          updated[parentCommentId] = [tempComment, ...(prev[parentCommentId] ?? [])];
          return updated;
        });
        setComments(prev => prev.map(c =>
          c.id === parentCommentId ? { ...c, replies_count: c.replies_count + 1 } : c
        ));
      } else {
        setComments(prev => [tempComment, ...prev]);
      }

      try {
        const newComment = await feedService.addComment(postId, content, parentCommentId, imageUrl);
        const resolved = newComment?.id
          ? { ...newComment, user: newComment.user ?? tempComment.user }
          : { ...tempComment };

        if (parentCommentId) {
          setRepliesMap(prev => ({
            ...prev,
            [parentCommentId]: (prev[parentCommentId] ?? [])
              .filter(c => c.id !== resolved.id)
              .map(c => c.id === tempComment.id ? resolved : c),
          }));
        } else {
          setComments(prev =>
            prev.filter(c => c.id !== resolved.id).map(c => c.id === tempComment.id ? resolved : c)
          );
        }
        return newComment;
      } catch (err) {
        if (parentCommentId) {
          setRepliesMap(prev => ({
            ...prev,
            [parentCommentId]: (prev[parentCommentId] ?? []).filter(c => c.id !== tempComment.id),
          }));
          setComments(prev => prev.map(c =>
            c.id === parentCommentId ? { ...c, replies_count: Math.max(0, c.replies_count - 1) } : c
          ));
        } else {
          setComments(prev => prev.filter(c => c.id !== tempComment.id));
        }
        throw err;
      }
    },
    [postId]
  );

  // Like comment optimistically (works for both comments and replies)
  const likeComment = useCallback(async (commentId: string) => {
    const findAndUpdate = (list: Comment[]) =>
      list.map(c => {
        if (c.id !== commentId) return c;
        return { ...c, user_liked: !c.user_liked, likes_count: c.user_liked ? c.likes_count - 1 : c.likes_count + 1 };
      });

    let isLiked = comments.find(c => c.id === commentId)?.user_liked;
    if (isLiked === undefined) {
      for (const replies of Object.values(repliesMap)) {
        const found = replies.find(c => c.id === commentId);
        if (found) { isLiked = found.user_liked; break; }
      }
    }

    setComments(findAndUpdate);
    setRepliesMap(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) updated[key] = findAndUpdate(updated[key]);
      return updated;
    });

    try {
      if (isLiked) await feedService.unlikeComment(commentId);
      else await feedService.likeComment(commentId);
    } catch (err) {
      // Revert
      const revert = (list: Comment[]) =>
        list.map(c => {
          if (c.id !== commentId) return c;
          return { ...c, user_liked: !!isLiked, likes_count: c.user_liked ? c.likes_count - 1 : c.likes_count + 1 };
        });
      setComments(revert);
      setRepliesMap(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) updated[key] = revert(updated[key]);
        return updated;
      });
      throw err;
    }
  }, [comments, repliesMap]);

  // Delete comment or reply optimistically
  const deleteComment = useCallback(async (commentId: string) => {
    // Check top-level comments
    const topIdx = comments.findIndex(c => c.id === commentId);
    if (topIdx >= 0) {
      const removed = comments[topIdx];
      setComments(prev => prev.filter(c => c.id !== commentId));
      try {
        await feedService.deleteComment(commentId);
      } catch (err) {
        setComments(prev => {
          const next = [...prev];
          next.splice(Math.min(topIdx, next.length), 0, removed);
          return next;
        });
        throw err;
      }
      return;
    }

    // Check in repliesMap
    for (const [parentId, replies] of Object.entries(repliesMap)) {
      const replyIdx = replies.findIndex(c => c.id === commentId);
      if (replyIdx >= 0) {
        const removed = replies[replyIdx];
        setRepliesMap(prev => ({ ...prev, [parentId]: prev[parentId].filter(c => c.id !== commentId) }));
        // Decrement parent replies_count in comments and repliesMap
        setComments(prev => prev.map(c =>
          c.id === parentId ? { ...c, replies_count: Math.max(0, c.replies_count - 1) } : c
        ));
        setRepliesMap(prev => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            updated[key] = updated[key].map(c =>
              c.id === parentId ? { ...c, replies_count: Math.max(0, c.replies_count - 1) } : c
            );
          }
          return updated;
        });
        try {
          await feedService.deleteComment(commentId);
        } catch (err) {
          setRepliesMap(prev => {
            const next = [...(prev[parentId] ?? [])];
            next.splice(Math.min(replyIdx, next.length), 0, removed);
            return { ...prev, [parentId]: next };
          });
          setComments(prev => prev.map(c =>
            c.id === parentId ? { ...c, replies_count: c.replies_count + 1 } : c
          ));
          throw err;
        }
        return;
      }
    }
  }, [comments, repliesMap]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) await loadComments(page + 1);
  }, [loading, hasMore, page, loadComments]);

  // Real-time updates for top-level comments
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToPostComments(postId, (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [newComment, ...prev];
      });
    });
    return unsubscribe;
  }, [postId]);

  useEffect(() => {
    if (!authLoading && user && session) {
      loadComments(1);
    } else if (!authLoading && !user) {
      setLoading(false);
      setComments([]);
    }
  }, [authLoading, user, session, loadComments]);

  return {
    comments,
    loading,
    hasMore,
    error,
    repliesMap,
    loadingRepliesSet,
    addComment,
    likeComment,
    deleteComment,
    loadReplies,
    loadMore,
    refresh: () => loadComments(1),
  };
};
