import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, Dimensions, Linking, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerifiedAvatar from './VerifiedAvatar';
import VerifiedBadge from './VerifiedBadge';
import PremiumBadge from './PremiumBadge';
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
import ReactionsListModal from '../modals/ReactionsListModal';
import { RepostModal } from './RepostModal';
import { RepostedPostCard } from './RepostedPostCard';
import HeadlineGradientPill, { HEADLINE_GRADIENT_PRESETS } from './HeadlineGradientPill';
import { LinearGradient } from 'expo-linear-gradient';
import { networkService } from '../services/api/networkService';
import { useToast } from '../contexts/ToastContext';
import { SystemTypography as Typography } from '../constants/Typography';

// Create walkthroughable component for tour
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function renderTextWithLinks(content: string, linkColor: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  URL_REGEX.lastIndex = 0;
  let match = URL_REGEX.exec(content);
  while (match !== null) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) parts.push(content.slice(lastIndex, start));
    parts.push(
      <Text
        key={start}
        style={{ color: linkColor, textDecorationLine: 'underline' }}
        onPress={() => Linking.openURL(url)}
        suppressHighlighting
      >
        {url}
      </Text>
    );
    lastIndex = start + url.length;
    match = URL_REGEX.exec(content);
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
}

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
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionPending, setConnectionPending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Headline Post expand/collapse animation
  const [isHeadlineExpanded, setIsHeadlineExpanded] = useState(false);
  const headlineExpandAnim = useRef(new Animated.Value(0)).current;

  const toggleHeadlineExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const expanding = !isHeadlineExpanded;
    setIsHeadlineExpanded(expanding);
    Animated.timing(headlineExpandAnim, {
      toValue: expanding ? 1 : 0,
      duration: 500,
      easing: expanding ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isHeadlineExpanded, headlineExpandAnim]);

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

  // Get reaction icon name and color for the action bar button
  const getReactionIcon = (): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } => {
    if (!post.user_reaction) return { name: 'thumbs-up-outline', color: theme.colors.textSecondary };
    const map: Record<string, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
      support: { name: 'thumbs-up', color: '#DC2626' },
      love: { name: 'heart', color: '#EC4899' },
      fire: { name: 'flame', color: '#F5A623' },
      congrats: { name: 'ribbon', color: '#7B68EE' },
    };
    return map[post.user_reaction] ?? { name: 'thumbs-up', color: '#DC2626' };
  };

  // Calculate total reactions
  const totalReactions = 
    post.reactions_count.support +
    post.reactions_count.love +
    post.reactions_count.fire +
    post.reactions_count.congrats;

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
      photo: 'Portfolio',
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
      photo: 'images',
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
      photo: '#7C3AED', // Brand primary violet
    };
    return colors[type] || '#6B7280';
  };

  return (
    <View style={[styles.outerContainer, { borderBottomColor: theme.colors.border }]}>
      {/* LinkedIn-style Header - Outside Card */}
      <View style={styles.profileHeader}>
        {/* Avatar */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAuthorPress?.(post.author.id);
          }}
        >
          <VerifiedAvatar
            avatarUrl={post.author.avatar_url}
            isVerified={post.author.is_verified}
            size={48}
            marginRight={12}
          />
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
            {(post.author.subscription_tier === 'premium' || post.author.subscription_tier === 'unlimited') && (
              <PremiumBadge tier={post.author.subscription_tier} size={14} />
            )}

            <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
              {post.author.display_name}
            </Text>

            {isOwnPost && (
              <Text style={[styles.youIndicator, { color: theme.colors.textSecondary }]}>
                {' · You'}
              </Text>
            )}

            {post.author.is_verified && <VerifiedBadge size={14} />}
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

      {/* Post Card — View wrapper so text selection and action buttons receive touches */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.card,
          },
        ]}
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowActionsModal(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

      {/* Headline Post — pill + animated scroll reveal */}
      {post.post_type === 'headline' && (() => {
        const cardWidth = Dimensions.get('window').width;
        const pillWidth = cardWidth - 32;
        const allImages: string[] = post.image_urls && post.image_urls.length > 0
          ? post.image_urls
          : post.image_url ? [post.image_url] : [];
        const GRID_H = Math.round(cardWidth * 0.68);
        const leftW = Math.round(cardWidth * 0.58);
        const rightW = cardWidth - leftW - 2;
        const gradientPreset = post.gradient_preset ?? 1;
        const presetColors = (HEADLINE_GRADIENT_PRESETS.find(g => g.id === gradientPreset) ?? HEADLINE_GRADIENT_PRESETS[0]).colors;
        const accentColor = presetColors[0];

        return (
          <View style={styles.headlineSection}>
            {/* Pill — always visible, tap to expand */}
            <TouchableOpacity
              style={styles.headlinePillWrapper}
              onPress={toggleHeadlineExpand}
              activeOpacity={0.9}
            >
              <HeadlineGradientPill
                headline={post.headline || post.content}
                gradientPreset={gradientPreset}
                pillWidth={pillWidth}
                backgroundColor={theme.colors.card}
              />
            </TouchableOpacity>

            {/* Expand / collapse row */}
            <TouchableOpacity
              style={styles.headlineExpandRow}
              onPress={toggleHeadlineExpand}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
            >
              <Text style={[styles.headlineExpandLabel, { color: accentColor }]}>
                {isHeadlineExpanded ? 'Show less' : 'Read more'}
              </Text>
              <Ionicons
                name={isHeadlineExpanded ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={accentColor}
              />
            </TouchableOpacity>

            {/* Animated scroll-reveal body */}
            <Animated.View
              style={{
                maxHeight: headlineExpandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1200],
                }),
                overflow: 'hidden',
                opacity: headlineExpandAnim.interpolate({
                  inputRange: [0, 0.12, 1],
                  outputRange: [0, 0, 1],
                }),
                width: '100%',
              }}
            >
              {/* Gradient divider */}
              <LinearGradient
                colors={['transparent', accentColor + '55', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headlineDivider}
              />

              {/* Body text with left accent bar */}
              {post.content.trim().length > 0 && (
                <View style={[styles.headlineBodyContent, { borderLeftColor: accentColor + 'AA' }]}>
                  <Text
                    style={[styles.postContent, { color: theme.colors.text }]}
                    selectable
                    selectionColor="#8B5CF640"
                  >
                    {renderTextWithLinks(post.content, theme.colors.primary)}
                  </Text>
                </View>
              )}

              {/* Audio player — shown inside expanded section for headline posts */}
              {post.audio_url && (
                <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
                  <PostAudioPlayer audioUrl={post.audio_url} title="Teaser" />
                </View>
              )}

              {/* Attached images */}
              {allImages.length > 0 && (
                <View style={[styles.mediaSection, { marginBottom: 14 }]}>
                  {allImages.length === 1 && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => { setGalleryIndex(0); setShowFullScreenImage(true); }}>
                      <Image
                        source={{ uri: allImages[0] }}
                        style={{ width: cardWidth, height: Math.round(cardWidth / (imageRatios[allImages[0]] || (16 / 9))) }}
                        resizeMode="cover"
                        onLoad={(e) => {
                          const { width, height } = e.nativeEvent.source;
                          if (width > 0 && height > 0) setImageRatios(prev => ({ ...prev, [allImages[0]]: width / height }));
                        }}
                      />
                    </TouchableOpacity>
                  )}
                  {allImages.length === 2 && (
                    <View style={{ flexDirection: 'row', gap: 2, height: Math.round(cardWidth * 0.52) }}>
                      {allImages.map((uri, i) => (
                        <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setGalleryIndex(i); setShowFullScreenImage(true); }} style={{ flex: 1 }}>
                          <Image source={{ uri }} style={{ flex: 1 }} resizeMode="cover" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {allImages.length === 3 && (
                    <View style={{ flexDirection: 'row', gap: 2, height: GRID_H }}>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => { setGalleryIndex(0); setShowFullScreenImage(true); }}>
                        <Image source={{ uri: allImages[0] }} style={{ width: leftW, height: GRID_H }} resizeMode="cover" />
                      </TouchableOpacity>
                      <View style={{ flex: 1, gap: 2 }}>
                        {allImages.slice(1).map((uri, i) => (
                          <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setGalleryIndex(i + 1); setShowFullScreenImage(true); }}>
                            <Image source={{ uri }} style={{ width: rightW, height: Math.round((GRID_H - 2) / 2) }} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  {allImages.length >= 4 && (
                    <View style={{ flexDirection: 'row', gap: 2, height: GRID_H }}>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => { setGalleryIndex(0); setShowFullScreenImage(true); }}>
                        <Image source={{ uri: allImages[0] }} style={{ width: leftW, height: GRID_H }} resizeMode="cover" />
                      </TouchableOpacity>
                      <View style={{ flex: 1, gap: 2 }}>
                        {[allImages[1], allImages[2], allImages[3]].map((uri, i) => {
                          const h = Math.round((GRID_H - 4) / 3);
                          const isLast = i === 2;
                          const remaining = allImages.length - 4;
                          return (
                            <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setGalleryIndex(i + 1); setShowFullScreenImage(true); }} style={{ position: 'relative' }}>
                              <Image source={{ uri }} style={{ width: rightW, height: h }} resizeMode="cover" />
                              {isLast && remaining > 0 && (
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
                                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+{remaining}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          </View>
        );
      })()}

      {/* Content Section - Only show for non-reposts, non-headline OR reposts with comment */}
      {post.post_type !== 'headline' && (!isRepost || (isRepost && post.content && post.content.trim().length > 0)) && (
        <View style={styles.contentSection}>
          <Text
            style={[styles.postContent, { color: theme.colors.text }]}
            numberOfLines={isExpanded ? undefined : 8}
            selectable
            selectionColor="#8B5CF640"
          >
            {renderTextWithLinks(post.content, theme.colors.primary)}
          </Text>
          {post.content.length > 200 && (
            <TouchableOpacity onPress={() => setIsExpanded(prev => !prev)}>
              <Text style={[styles.seeMore, { color: theme.colors.primary }]}>
                {isExpanded ? 'See less' : 'See more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reposted Original Post (Quote Repost - Twitter style) */}
      {isRepost && (
        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
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
        </View>
      )}

      {/* Media Section (only for standard posts — headline posts render images in expand container) */}
      {!isRepost && post.post_type !== 'headline' && (() => {
        const allImages: string[] = post.image_urls && post.image_urls.length > 0
          ? post.image_urls
          : post.image_url ? [post.image_url] : [];

        if (allImages.length === 0) return null;

        const openGallery = (index: number) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setGalleryIndex(index);
          setShowFullScreenImage(true);
        };

        const cardWidth = Dimensions.get('window').width;
        // LinkedIn-style grid dimensions
        const GRID_H = Math.round(cardWidth * 0.68);
        const leftW = Math.round(cardWidth * 0.58);
        const rightW = cardWidth - leftW - 2;

        return (
          <View style={styles.mediaSection}>
            {/* 1 image — natural aspect ratio (LinkedIn-style, no crop) */}
            {allImages.length === 1 && (
              <TouchableOpacity activeOpacity={0.9} onPress={() => openGallery(0)}>
                <Image
                  source={{ uri: allImages[0] }}
                  style={{ width: cardWidth, height: Math.round(cardWidth / (imageRatios[allImages[0]] || (16 / 9))) }}
                  resizeMode="cover"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    if (width > 0 && height > 0) setImageRatios(prev => ({ ...prev, [allImages[0]]: width / height }));
                  }}
                />
              </TouchableOpacity>
            )}

            {/* 2 images — side by side equal */}
            {allImages.length === 2 && (
              <View style={{ flexDirection: 'row', gap: 2, height: Math.round(cardWidth * 0.52) }}>
                {allImages.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.9}
                    onPress={() => openGallery(i)}
                    style={{ flex: 1 }}
                  >
                    <Image
                      source={{ uri }}
                      style={{ flex: 1 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 3 images — LinkedIn: left big, right 2 stacked */}
            {allImages.length === 3 && (
              <View style={{ flexDirection: 'row', gap: 2, height: GRID_H }}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => openGallery(0)}>
                  <Image
                    source={{ uri: allImages[0] }}
                    style={{ width: leftW, height: GRID_H }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 2 }}>
                  {allImages.slice(1).map((uri, i) => {
                    const h = Math.round((GRID_H - 2) / 2);
                    return (
                      <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => openGallery(i + 1)}>
                        <Image
                          source={{ uri }}
                          style={{ width: rightW, height: h }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4+ images — LinkedIn: left big, right 3 stacked, last with +N */}
            {allImages.length >= 4 && (
              <View style={{ flexDirection: 'row', gap: 2, height: GRID_H }}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => openGallery(0)}>
                  <Image
                    source={{ uri: allImages[0] }}
                    style={{ width: leftW, height: GRID_H }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 2 }}>
                  {[allImages[1], allImages[2], allImages[3]].map((uri, i) => {
                    const h = Math.round((GRID_H - 4) / 3);
                    const isLast = i === 2;
                    const remaining = allImages.length - 4; // images beyond the 4 shown
                    return (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.9}
                        onPress={() => openGallery(i + 1)}
                        style={{ position: 'relative' }}
                      >
                        <Image
                          source={{ uri }}
                          style={{ width: rightW, height: h }}
                          resizeMode="cover"
                        />
                        {isLast && remaining > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0, left: 0, right: 0, bottom: 0,
                              backgroundColor: 'rgba(0,0,0,0.55)',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                              +{remaining}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })()}

      {post.audio_url && post.post_type !== 'headline' && (
        <PostAudioPlayer
          audioUrl={post.audio_url}
          title="Teaser"
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
            <Ionicons
              name={getReactionIcon().name}
              size={20}
              color={getReactionIcon().color}
            />
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

        {/* Summary Line - LinkedIn style */}
        {(totalReactions > 0 || post.comments_count > 0 || (post.shares_count ?? 0) > 0) && (
          <View style={styles.summaryLine}>
            {/* Left: emoji bubbles + reaction count */}
            {totalReactions > 0 && (
              <TouchableOpacity
                style={styles.reactorsRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowReactionsModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.reactionBubblesCluster}>
                  {Object.entries(post.reactions_count)
                    .filter(([_, count]) => (count as number) > 0)
                    .slice(0, 3)
                    .map(([type], i) => (
                      <View
                        key={type}
                        style={[
                          styles.reactionBubbleSmall,
                          {
                            marginLeft: i > 0 ? -6 : 0,
                            zIndex: 10 - i,
                            borderColor: theme.colors.card,
                          },
                        ]}
                      >
                        <Text style={styles.reactionEmojiSmall}>
                          {REACTION_TYPES[type as keyof typeof REACTION_TYPES].emoji}
                        </Text>
                      </View>
                    ))}
                </View>
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  {totalReactions}
                </Text>
              </TouchableOpacity>
            )}

            {/* Right: comments + redrops */}
            <View style={styles.summaryRight}>
              {post.comments_count > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCommentsModal(true);
                  }}
                >
                  <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                    {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
              {post.comments_count > 0 && (post.shares_count ?? 0) > 0 && (
                <Text style={[styles.summaryDot, { color: theme.colors.textSecondary }]}> · </Text>
              )}
              {(post.shares_count ?? 0) > 0 && (
                <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                  {post.shares_count} redrop{post.shares_count !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
      </View>

      {/* Reactions List Modal */}
      <ReactionsListModal
        visible={showReactionsModal}
        onClose={() => setShowReactionsModal(false)}
        postId={post.id}
        reactionsCount={post.reactions_count}
      />

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
        onViewDetail={() => onPress?.()}
        onRepost={() => setShowRepostModal(true)}
      />

      {/* Full Screen Image Gallery */}
      {(post.image_urls?.length || post.image_url) && (
        <FullScreenImageModal
          visible={showFullScreenImage}
          imageUrls={
            post.image_urls && post.image_urls.length > 0
              ? post.image_urls
              : post.image_url ? [post.image_url] : []
          }
          initialIndex={galleryIndex}
          onClose={() => setShowFullScreenImage(false)}
          userReaction={post.user_reaction}
          reactionsCount={post.reactions_count}
          commentsCount={post.comments_count}
          onReactionPress={handleReactionPress}
          onCommentPress={() => setShowCommentsModal(true)}
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
    marginBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  container: {
    // edge-to-edge: no horizontal margin, no border radius
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
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
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
  verifiedRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2.5,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedRingInner: {
    width: 49,
    height: 49,
    borderRadius: 24.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
  youIndicator: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
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
    paddingHorizontal: 16,
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
    overflow: 'hidden',
  },
  engagementSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
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
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  reactorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reactionBubblesCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionBubbleSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  reactionEmojiSmall: {
    fontSize: 11,
    lineHeight: 14,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // ── Headline Post ─────────────────────────────────────────
  headlineSection: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headlinePillWrapper: {
    alignSelf: 'stretch',
    marginBottom: 0,
  },
  headlineExpandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 2,
  },
  headlineExpandLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headlineDivider: {
    height: 1,
    marginVertical: 12,
    width: '100%',
  },
  headlineBodyContent: {
    paddingLeft: 12,
    paddingRight: 4,
    paddingBottom: 8,
    width: '100%',
    borderLeftWidth: 2.5,
  },

});

