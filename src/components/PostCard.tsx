import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from './VerifiedBadge';
import { ActivityIndicator } from 'react-native';
import { walkthroughable } from 'react-native-copilot';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post } from '../types/feed.types';
import * as Haptics from 'expo-haptics';
import PostActionsModal from '../modals/PostActionsModal';
import FullScreenImageModal from '../modals/FullScreenImageModal';
import BlockUserModal from '../modals/BlockUserModal';
import ReportContentModal from '../modals/ReportContentModal';
import PostAudioPlayer from './PostAudioPlayer';
import PostSaveButton from './PostSaveButton';
import { ReactionPicker } from './ReactionPicker';
import CommentsModal from '../modals/CommentsModal';
import { RepostModal } from './RepostModal';
import { RepostedPostCard } from './RepostedPostCard';
import { networkService } from '../services/api/networkService';
import { useToast } from '../contexts/ToastContext';
import { SystemTypography as Typography } from '../constants/Typography';

// Create walkthroughable component for tour
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onReactionPress?: (reactionType: 'support' | 'love' | 'fire' | 'congrats') => void;
  onCommentPress?: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onSave?: (postId: string) => void;
  onUnsave?: (postId: string) => void;
  onSaveImage?: (imageUrl: string) => void;
  onBlocked?: () => void;
  onReported?: () => void;
  onAuthorPress?: (authorId: string) => void;
  onRepost?: (post: Post, withComment?: boolean, comment?: string) => void;
  onTip?: (authorId: string, authorName: string) => void;
  isSaved?: boolean;
}

const REACTION_TYPES = {
  support: {
    id: 'support' as const,
    emoji: '👍',
    label: 'Like',
    color: '#DC2626',
  },
  love: {
    id: 'love' as const,
    emoji: '❤️',
    label: 'Love',
    color: '#EC4899',
  },
  fire: {
    id: 'fire' as const,
    emoji: '🔥',
    label: 'Fire',
    color: '#F5A623',
  },
  congrats: {
    id: 'congrats' as const,
    emoji: '👏',
    label: 'Congrats',
    color: '#7B68EE',
  },
} as const;

const PostCard = memo(function PostCard({
  post,
  onPress,
  onReactionPress,
  onCommentPress,
  onEdit,
  onDelete,
  onShare,
  onSave,
  onUnsave,
  onSaveImage,
  onBlocked,
  onReported,
  onAuthorPress,
  onRepost,
  onTip,
  isSaved = false,
}: PostCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionPending, setConnectionPending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleReactionPress = (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReactionPress?.(reactionType);
  };

  // Long-press detection for Support button
  const handleSupportPressIn = () => {
    longPressTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowReactionPicker(true);
    }, 500); // 500ms hold
  };

  const handleSupportPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Quick Support reaction (single tap)
  const handleQuickSupport = () => {
    if (!showReactionPicker) {
      handleReactionPress('support');
    }
  };

  // Handle reaction selection from picker
  const handleReactionSelect = (reactionType: 'support' | 'love' | 'fire' | 'congrats') => {
    setShowReactionPicker(false);
    handleReactionPress(reactionType);
  };

  // Get current reaction display
  const getCurrentReaction = () => {
    if (post.user_reaction) {
      return REACTION_TYPES[post.user_reaction];
    }
    return { emoji: '👍', label: 'Like', color: theme.colors.textSecondary };
  };

  // Calculate total reactions
  const totalReactions = 
    post.reactions_count.support +
    post.reactions_count.love +
    post.reactions_count.fire +
    post.reactions_count.congrats;

  // Debug logging for repost detection
  console.log('🔍 PostCard Debug:', {
    postId: post.id,
    hasRepostedFromId: !!post.reposted_from_id,
    hasRepostedFrom: !!post.reposted_from,
    repostedFromId: post.reposted_from_id,
    content: post.content?.substring(0, 30) + '...',
  });

  const isRepost = post.reposted_from_id && post.reposted_from;
  const isOwnPost = user?.id === post.author.id;

  // Check follow status
  useEffect(() => {
    checkFollowStatus();
  }, [post.author.id]);

  const checkFollowStatus = async () => {
    if (!user?.id || isOwnPost) return;

    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', post.author.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setIsConnected(!!data);
    } catch (error) {
      console.error('❌ Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.id || isOwnPost) return;

    setIsConnecting(true);
    try {
      const { supabase } = await import('../lib/supabase');

      if (isConnected) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', post.author.id);

        if (error) throw error;

        setIsConnected(false);
        showToast('Unfollowed', 'success');
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: post.author.id,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsConnected(true);
        showToast(`Following ${post.author.display_name}`, 'success');
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      console.error('❌ Error toggling follow:', error);
      showToast(error.message || 'Failed to follow/unfollow', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle repost with toggle behavior
  const handleRepostPress = () => {
    if (post.user_reposted) {
      // User already reposted - show unrepost option
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowRepostModal(true);
    } else {
      // User hasn't reposted - show repost options
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowRepostModal(true);
    }
  };

  const handleQuickRepost = async () => {
    setIsReposting(true);
    try {
      await onRepost?.(post, false); // Quick repost without comment
      setShowRepostModal(false);
    } catch (error) {
      console.error('Error reposting:', error);
    } finally {
      setIsReposting(false);
    }
  };

  const handleRepostWithComment = async (comment: string) => {
    setIsReposting(true);
    try {
      await onRepost?.(post, true, comment); // Repost with comment
      setShowRepostModal(false);
    } catch (error) {
      console.error('Error reposting with comment:', error);
    } finally {
      setIsReposting(false);
    }
  };

  const handleUnrepost = async () => {
    setIsReposting(true);
    try {
      await onRepost?.(post); // onRepost will handle toggle logic (no withComment param)
      setShowRepostModal(false);
    } catch (error) {
      console.error('Error unreposting:', error);
    } finally {
      setIsReposting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPostTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      opportunity: 'Opportunity',
      achievement: 'Achievement',
      collaboration: 'Collaboration',
      event: 'Event',
      update: 'Update',
    };
    return labels[type] || type;
  };

  const getPostTypeIcon = (type: string): any => {
    const icons: Record<string, any> = {
      opportunity: 'briefcase',
      achievement: 'trophy',
      collaboration: 'people',
      event: 'calendar',
      update: 'chatbubble',
    };
    return icons[type] || 'chatbubble';
  };

  const getPostTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      opportunity: '#10B981', // Green
      achievement: '#F59E0B', // Amber/Gold
      collaboration: '#8B5CF6', // Purple
      event: '#3B82F6', // Blue
      update: '#6B7280', // Gray
    };
    return colors[type] || '#6B7280';
  };

  return (
    <View style={styles.outerContainer}>
      {/* LinkedIn-style Header - Outside Card */}
      <View style={styles.profileHeader}>
        {/* Avatar */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAuthorPress?.(post.author.id);
          }}
        >
          <View
            style={[
              styles.avatar,
              { borderColor: theme.colors.border },
            ]}
          >
            {post.author.avatar_url ? (
              <Image
                source={{ uri: post.author.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Author Info */}
        <TouchableOpacity
          style={styles.authorInfo}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAuthorPress?.(post.author.id);
          }}
        >
          <View style={styles.authorNameRow}>
            <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
              {post.author.display_name}
            </Text>

            {post.author.is_verified && <VerifiedBadge size={14} />}

            {/* Pro Badge (Premium tier) */}
            {post.author.subscription_tier === 'premium' && (
              <View style={styles.proBadge}>
                <Ionicons name="diamond" size={10} color="#FFFFFF" />
              </View>
            )}

            {/* Pro+ Badge (Unlimited tier) */}
            {post.author.subscription_tier === 'unlimited' && (
              <View style={styles.proPlusBadge}>
                <Ionicons name="diamond" size={10} color="#FFFFFF" />
                <Text style={styles.proPlusText}>+</Text>
              </View>
            )}
          </View>

          {/* Professional headline only */}
          {post.author.headline && (
            <Text style={[styles.authorDetails, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {post.author.headline}
            </Text>
          )}

          <View style={styles.timestampRow}>
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
            {/* Post Type Badge */}
            {post.post_type && post.post_type !== 'update' && (
              <>
                <Text style={[styles.dot, { color: theme.colors.textSecondary }]}> • </Text>
                <View style={[styles.postTypeBadge, {
                  backgroundColor: getPostTypeColor(post.post_type) + '20',
                  borderColor: getPostTypeColor(post.post_type) + '40',
                }]}>
                  <Ionicons
                    name={getPostTypeIcon(post.post_type)}
                    size={10}
                    color={getPostTypeColor(post.post_type)}
                  />
                  <Text style={[styles.postTypeBadgeText, { color: getPostTypeColor(post.post_type) }]}>
                    {getPostTypeLabel(post.post_type)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Follow Button - LinkedIn style */}
        {!isOwnPost && (
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isConnected ? 'transparent' : theme.colors.primary,
                borderColor: isConnected ? theme.colors.border : theme.colors.primary,
              }
            ]}
            onPress={handleFollowToggle}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={isConnected ? theme.colors.text : '#FFFFFF'} />
            ) : (
              <>
                <Ionicons
                  name={isConnected ? "checkmark" : "person-add"}
                  size={16}
                  color={isConnected ? theme.colors.text : '#FFFFFF'}
                />
                <Text style={[
                  styles.followButtonText,
                  { color: isConnected ? theme.colors.text : '#FFFFFF' }
                ]}>
                  {isConnected ? 'Following' : 'Follow'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Post Card */}
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {/* Card Header - Redrop Indicator + Save and More buttons */}
        <View style={styles.cardHeader}>
          {/* Redrop Indicator */}
          {isRepost ? (
            <View style={styles.repostIndicator}>
              <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
                REDROPPED
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {/* Save Button */}
          <PostSaveButton
            postId={post.id}
            initialIsSaved={isSaved}
            size={22}
          />

          {/* More Options Button */}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowActionsModal(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

      {/* Content Section - Only show for non-reposts OR reposts with comment */}
      {(!isRepost || (isRepost && post.content && post.content.trim().length > 0)) && (
        <View style={styles.contentSection}>
          <Text
            style={[styles.postContent, { color: theme.colors.text }]}
            numberOfLines={8}
          >
            {post.content}
          </Text>
          {post.content.length > 200 && (
            <TouchableOpacity>
              <Text style={[styles.seeMore, { color: theme.colors.primary }]}>
                See more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reposted Original Post (Quote Repost - Twitter style) */}
      {isRepost && (
        <>
          <RepostedPostCard
            post={post.reposted_from!}
            onPress={() => {
              // Navigate to the original post detail (like Twitter's quote tweet behavior)
              if (post.reposted_from_id) {
                console.log('🔗 Navigating to original post:', post.reposted_from_id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('PostDetail' as never, { postId: post.reposted_from_id } as never);
              }
            }}
            onAuthorPress={(authorId) => {
              // Navigate to author's profile
              console.log('🔗 Navigating to author profile:', authorId);
              onAuthorPress?.(authorId);
            }}
          />
        </>
      )}

      {/* Media Section (only if NOT a repost with original post data) */}
      {post.image_url && !isRepost && (
        <View style={styles.mediaSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFullScreenImage(true);
            }}
          >
            <Image
              source={{ uri: post.image_url }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      )}

      {post.audio_url && (
        <PostAudioPlayer
          audioUrl={post.audio_url}
          title="Audio Preview"
        />
      )}

      {/* Engagement Section - LinkedIn Style */}
      <View
        style={[
          styles.engagementSection,
          { borderTopColor: theme.colors.border },
        ]}
      >
        {/* Interaction Buttons Row */}
        <View style={styles.interactionButtonsRow}>
          {/* Like Button with Long-Press */}
          <Pressable
            style={[
              styles.interactionButton,
              post.user_reaction && {
                backgroundColor: theme.isDark
                  ? 'rgba(220, 38, 38, 0.15)'
                  : 'rgba(220, 38, 38, 0.08)',
              },
            ]}
            onPressIn={handleSupportPressIn}
            onPressOut={handleSupportPressOut}
            onPress={handleQuickSupport}
          >
            <Text style={[styles.interactionIcon, { fontSize: 20 }]}>
              {getCurrentReaction().emoji}
            </Text>
          </Pressable>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCommentsModal(true);
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Redrop Button */}
          <TouchableOpacity
            style={[
              styles.interactionButton,
              post.user_reposted && {
                backgroundColor: theme.isDark
                  ? 'rgba(34, 197, 94, 0.15)'
                  : 'rgba(34, 197, 94, 0.08)',
              },
            ]}
            onPress={handleRepostPress}
            disabled={isReposting}
          >
            {isReposting ? (
              <ActivityIndicator size="small" color={post.user_reposted ? '#22C55E' : theme.colors.textSecondary} />
            ) : (
              <Ionicons
                name={post.user_reposted ? "repeat" : "repeat-outline"}
                size={20}
                color={post.user_reposted ? '#22C55E' : theme.colors.textSecondary}
              />
            )}
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.interactionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare?.(post);
            }}
          >
            <Ionicons
              name="arrow-redo-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Tip Button - Step 2 */}
          <WalkthroughableTouchable
            order={2}
            name="tip_button_location"
            text="This 💰 icon is where you tip creators to support their work. When others tip YOUR drops, you keep 95%. Tap it to see how tipping works - this is how you earn on SoundBridge while growing your professional network."
          >
            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTip?.(post.author.id, post.author.display_name);
              }}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </WalkthroughableTouchable>
        </View>

        {/* Summary Line */}
        {(totalReactions > 0 || post.comments_count > 0 || (post.shares_count && post.shares_count > 0)) && (
          <TouchableOpacity 
            style={styles.summaryLine}
            onPress={() => {
              if (post.comments_count > 0) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCommentsModal(true);
              }
            }}
            activeOpacity={post.comments_count > 0 ? 0.7 : 1}
          >
            {totalReactions > 0 && (
              <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                {post.user_reaction 
                  ? `You and ${totalReactions - 1} other${totalReactions - 1 !== 1 ? 's' : ''} reacted`
                  : `${totalReactions} reaction${totalReactions !== 1 ? 's' : ''}`
                }
              </Text>
            )}
            {totalReactions > 0 && (post.comments_count > 0 || (post.shares_count && post.shares_count > 0)) && (
              <Text style={[styles.summaryDot, { color: theme.colors.textSecondary }]}> • </Text>
            )}
            {post.comments_count > 0 && (
              <>
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
                </Text>
                {post.shares_count && post.shares_count > 0 && (
                  <Text style={[styles.summaryDot, { color: theme.colors.textSecondary }]}> • </Text>
                )}
              </>
            )}
            {post.shares_count && post.shares_count > 0 && (
              <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                {post.shares_count} redrop{post.shares_count !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Reaction Picker Modal */}
      <ReactionPicker
        visible={showReactionPicker}
        onSelect={handleReactionSelect}
        onDismiss={() => setShowReactionPicker(false)}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        post={post}
        onClose={() => setShowCommentsModal(false)}
      />

      {/* Repost Modal */}
      <RepostModal
        visible={showRepostModal}
        post={post}
        onClose={() => setShowRepostModal(false)}
        onQuickRepost={handleQuickRepost}
        onRepostWithComment={handleRepostWithComment}
        onUnrepost={handleUnrepost}
        isReposting={isReposting}
        isReposted={post.user_reposted || false}
      />

      {/* Post Actions Modal */}
      <PostActionsModal
        visible={showActionsModal}
        post={post}
        isSaved={isSaved}
        onClose={() => setShowActionsModal(false)}
        onEdit={() => onEdit?.(post)}
        onDelete={() => onDelete?.(post.id)}
        onShare={() => onShare?.(post)}
        onSave={() => onSave?.(post.id)}
        onUnsave={() => onUnsave?.(post.id)}
        onSaveImage={post.image_url && onSaveImage ? () => {
          console.log('📸 PostCard: Calling onSaveImage with URL:', post.image_url);
          onSaveImage(post.image_url!);
        } : undefined}
        onReport={() => {
          setShowActionsModal(false);
          setShowReportModal(true);
        }}
        onBlocked={() => {
          setShowActionsModal(false);
          setShowBlockModal(true);
        }}
      />

      {/* Full Screen Image Modal */}
      {post.image_url && (
        <FullScreenImageModal
          visible={showFullScreenImage}
          imageUrl={post.image_url}
          onClose={() => setShowFullScreenImage(false)}
        />
      )}

      {/* Block User Modal */}
      <BlockUserModal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        userId={post.author.id}
        userName={post.author.display_name || post.author.username || 'User'}
        userAvatar={post.author.avatar_url}
        isCurrentlyBlocked={false}
        onBlocked={() => {
          onBlocked?.();
          setShowBlockModal(false);
        }}
      />

      {/* Report Content Modal */}
      <ReportContentModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post.id}
        contentTitle={post.content || 'Post'}
        onReported={() => {
          onReported?.();
          setShowReportModal(false);
        }}
      />
    </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.reactions_count.support === nextProps.post.reactions_count.support &&
    prevProps.post.reactions_count.love === nextProps.post.reactions_count.love &&
    prevProps.post.reactions_count.fire === nextProps.post.reactions_count.fire &&
    prevProps.post.reactions_count.congrats === nextProps.post.reactions_count.congrats &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.user_reaction === nextProps.post.user_reaction
  );
});

export default PostCard;

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  container: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  repostText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  authorName: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  proBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proPlusBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 16,
  },
  proPlusText: {
    color: '#FFFFFF',
    ...Typography.label,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    marginTop: -1,
  },
  authorDetails: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 2,
  },
  authorBio: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  dot: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  followButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  postTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  postTypeBadgeText: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moreButton: {
    padding: 8,
  },
  contentSection: {
    marginBottom: 14,
  },
  postContent: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  seeMore: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  mediaSection: {
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 300,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  engagementSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  interactionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
  },
  interactionIcon: {
    fontSize: 18,
  },
  interactionLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  summaryText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  summaryDot: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
});

