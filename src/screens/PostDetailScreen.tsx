import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import CommentCard from '../components/CommentCard';
import { feedService } from '../services/api/feedService';
import { socialService } from '../services/api/socialService';
import { deepLinkingService } from '../services/DeepLinkingService';
import { imageSaveService } from '../services/ImageSaveService';
import { supabase } from '../lib/supabase';
import { useComments } from '../hooks/useComments';
import type { Post } from '../types/feed.types';
import { useToast } from '../contexts/ToastContext';
import { SystemTypography as Typography } from '../constants/Typography';
import * as Haptics from 'expo-haptics';

type PostDetailRouteProp = RouteProp<
  { PostDetail: { postId: string } },
  'PostDetail'
>;

const REACTION_TYPES = {
  support: { emoji: '👍', label: 'Like', color: '#DC2626' },
  love: { emoji: '❤️', label: 'Love', color: '#EC4899' },
  fire: { emoji: '🔥', label: 'Fire', color: '#F5A623' },
  congrats: { emoji: '👏', label: 'Congrats', color: '#7B68EE' },
} as const;

interface Reactor {
  user_id: string;
  display_name: string;
  reaction_type: string;
}

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;
  const { theme } = useTheme();
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const namesAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const {
    comments,
    loading: commentsLoading,
    hasMore: hasMoreComments,
    addComment,
    likeComment,
    loadMore: loadMoreComments,
  } = useComments(postId);

  useEffect(() => {
    fetchPost();
    fetchReactors();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const postData = await feedService.getPostById(postId);
      setPost(postData);
    } catch (err: any) {
      console.error('❌ Failed to fetch post:', err);
      setError(err.message || 'Failed to load post');
      showToast('Failed to load post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReactors = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('post_reactions')
        .select('user_id, reaction_type, profiles:user_id(display_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!dbError && data) {
        const mapped: Reactor[] = data.map((r: any) => ({
          user_id: r.user_id,
          reaction_type: r.reaction_type,
          display_name: r.profiles?.display_name || 'Someone',
        }));
        setReactors(mapped);
        if (mapped.length > 0) {
          Animated.timing(namesAnim, {
            toValue: 1,
            duration: 600,
            delay: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    } catch (e) {
      // Reactors are cosmetic — fail silently
    }
  };

  const handleReactionPress = async (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    if (!post) return;
    const isSameReaction = post.user_reaction === reactionType;
    const prevReaction = post.user_reaction;
    const prevCounts = { ...post.reactions_count };
    const newCounts = { ...post.reactions_count };

    if (isSameReaction) {
      newCounts[reactionType] = Math.max(0, newCounts[reactionType] - 1);
    } else {
      if (prevReaction) newCounts[prevReaction] = Math.max(0, newCounts[prevReaction] - 1);
      newCounts[reactionType] = newCounts[reactionType] + 1;
    }
    setPost({ ...post, user_reaction: isSameReaction ? null : reactionType, reactions_count: newCounts });

    try {
      if (isSameReaction) {
        await feedService.removeReaction(post.id);
      } else {
        await feedService.addReaction(post.id, reactionType);
      }
      fetchReactors();
    } catch (err: any) {
      setPost({ ...post, user_reaction: prevReaction, reactions_count: prevCounts });
      showToast(err.message || 'Failed to react', 'error');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    const text = commentText.trim();
    setCommentText('');
    setSubmittingComment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await addComment(text);
      if (post) setPost({ ...post, comments_count: post.comments_count + 1 });
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
      setCommentText(text);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async (postIdToDelete: string) => {
    try {
      await feedService.deletePost(postIdToDelete);
      showToast('Post deleted', 'success');
      navigation.goBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete post', 'error');
    }
  };

  const handleRepost = async (postToRepost: Post, withComment?: boolean, comment?: string) => {
    try {
      await feedService.repost(postToRepost.id, withComment, comment);
      const updated = await feedService.getPostById(postToRepost.id);
      setPost(updated);
      showToast(withComment ? 'Redropped with your thoughts!' : 'Redropped!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to redrop', 'error');
    }
  };

  // Build "Justice, Merit and 14 others" string
  const buildReactorNames = useCallback((): string | null => {
    if (!post || reactors.length === 0) return null;
    const totalReactions =
      post.reactions_count.support +
      post.reactions_count.love +
      post.reactions_count.fire +
      post.reactions_count.congrats;
    if (totalReactions === 0) return null;

    const myEntry = reactors.find((r) => r.user_id === user?.id);
    const others = reactors.filter((r) => r.user_id !== user?.id);

    if (myEntry) {
      if (totalReactions === 1) return 'You reacted';
      const remaining = totalReactions - 1;
      if (others.length > 0) {
        const firstName = others[0].display_name.split(' ')[0];
        return remaining > 1
          ? `You, ${firstName} and ${remaining - 1} other${remaining - 1 !== 1 ? 's' : ''}`
          : `You and ${firstName}`;
      }
      return `You and ${remaining} other${remaining !== 1 ? 's' : ''}`;
    }

    const names = reactors.slice(0, 2).map((r) => r.display_name.split(' ')[0]);
    const remaining = totalReactions - names.length;
    if (remaining <= 0) return names.join(' and ');
    return `${names.join(', ')} and ${remaining} other${remaining !== 1 ? 's' : ''}`;
  }, [post, reactors, user?.id]);

  const totalReactions = post
    ? post.reactions_count.support +
      post.reactions_count.love +
      post.reactions_count.fire +
      post.reactions_count.congrats
    : 0;

  const activeReactionTypes = post
    ? (Object.entries(post.reactions_count)
        .filter(([_, count]) => (count as number) > 0)
        .map(([type]) => type) as (keyof typeof REACTION_TYPES)[])
    : [];

  const gradientBackground = (
    <LinearGradient
      colors={[
        theme.colors.backgroundGradient.start,
        theme.colors.backgroundGradient.middle,
        theme.colors.backgroundGradient.end,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {gradientBackground}
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.container}>
        {gradientBackground}
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              {error || 'Post not found'}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
              onPress={fetchPost}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const reactorNames = buildReactorNames();

  const ListHeader = (
    <View>
      <PostCard
        post={post}
        onPress={() => {}}
        onReactionPress={handleReactionPress}
        onCommentPress={() => inputRef.current?.focus()}
        onEdit={() => {}}
        onDelete={handleDeletePost}
        onShare={async (p) => {
          await deepLinkingService.sharePost(p.id, p.content?.substring(0, 100));
        }}
        onSave={async (id) => {
          try {
            await socialService.savePost(id);
            setPost((prev) => prev ? { ...prev, is_saved: true } : prev);
            showToast('Post saved', 'success');
          } catch (err: any) {
            showToast('Failed to save post', 'error');
          }
        }}
        onUnsave={async (id) => {
          try {
            await socialService.unsavePost(id);
            setPost((prev) => prev ? { ...prev, is_saved: false } : prev);
            showToast('Post unsaved', 'success');
          } catch (err: any) {
            showToast('Failed to unsave post', 'error');
          }
        }}
        onSaveImage={async (imageUrl) => {
          try {
            const result = await imageSaveService.saveImageToGallery(imageUrl);
            showToast(result.success ? 'Image saved to gallery' : result.error || 'Failed to save image', result.success ? 'success' : 'error');
          } catch {
            showToast('Failed to save image', 'error');
          }
        }}
        onAuthorPress={(authorId) =>
          navigation.navigate('CreatorProfile' as never, { creatorId: authorId } as never)
        }
        onRepost={handleRepost}
        onTip={() => {}}
        isSaved={(post as any).is_saved}
      />

      {/* Reactions & Redrops row */}
      {(totalReactions > 0 || (post.shares_count ?? 0) > 0) && (
        <View
          style={[
            styles.reactionsSection,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
          ]}
        >
          {totalReactions > 0 && (
            <View style={styles.reactionsSummaryRow}>
              {/* Stacked emoji bubbles */}
              <View style={styles.emojiCluster}>
                {activeReactionTypes.slice(0, 3).map((type, i) => (
                  <View
                    key={type}
                    style={[
                      styles.reactionBubble,
                      {
                        marginLeft: i > 0 ? -10 : 0,
                        zIndex: 10 - i,
                        borderColor: theme.colors.card,
                      },
                    ]}
                  >
                    <Text style={styles.reactionEmoji}>
                      {REACTION_TYPES[type].emoji}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Animated names */}
              <Animated.Text
                style={[
                  styles.reactorNamesText,
                  { color: theme.colors.textSecondary, opacity: namesAnim },
                ]}
                numberOfLines={1}
              >
                {reactorNames || `${totalReactions} reaction${totalReactions !== 1 ? 's' : ''}`}
              </Animated.Text>
            </View>
          )}

          {/* Redrops */}
          {(post.shares_count ?? 0) > 0 && (
            <View style={styles.redropRow}>
              <Ionicons name="repeat" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.redropText, { color: theme.colors.textSecondary }]}>
                {post.shares_count} redrop{post.shares_count !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Comments header */}
      <View
        style={[
          styles.commentsHeaderRow,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.commentsHeaderTitle, { color: theme.colors.text }]}>
          Comments
          {post.comments_count > 0 ? ` (${post.comments_count})` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {gradientBackground}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={ListHeader}
            renderItem={({ item }) => (
              <View style={styles.commentWrapper}>
                <CommentCard
                  comment={item}
                  onLike={() => likeComment(item.id)}
                  onReply={() => inputRef.current?.focus()}
                />
              </View>
            )}
            ListEmptyComponent={
              commentsLoading ? (
                <View style={styles.commentsLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : (
                <View style={styles.noCommentsContainer}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={32}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                    Be the first to comment
                  </Text>
                </View>
              )
            }
            ListFooterComponent={<View style={{ height: 16 }} />}
            onEndReached={loadMoreComments}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
          />

          {/* Comment input bar */}
          <View
            style={[
              styles.commentInputBar,
              {
                backgroundColor: theme.colors.card,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.commentAvatarWrap}>
              {userProfile?.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.commentAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.commentAvatar,
                    styles.commentAvatarFallback,
                    { backgroundColor: theme.colors.border },
                  ]}
                >
                  <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>

            <TextInput
              ref={inputRef}
              style={[styles.commentInput, { color: theme.colors.text }]}
              placeholder="Add a comment..."
              placeholderTextColor={theme.colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: commentText.trim()
                    ? theme.colors.primary
                    : 'transparent',
                },
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={16}
                  color={commentText.trim() ? '#FFFFFF' : theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  headerRight: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: -0.4,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: Typography.body.fontFamily,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  // Reactions section
  reactionsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  reactionsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emojiCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  reactionEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  reactorNamesText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: -0.4,
    flex: 1,
  },
  redropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  redropText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  // Comments
  commentsHeaderRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  commentsHeaderTitle: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  commentWrapper: {
    paddingHorizontal: 16,
  },
  commentsLoadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noCommentsContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  noCommentsText: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  // Comment input
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  commentAvatarWrap: {
    paddingBottom: 2,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.4,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});
