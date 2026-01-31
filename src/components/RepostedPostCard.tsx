import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from './VerifiedBadge';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SystemTypography as Typography } from '../constants/Typography';
import type { Post } from '../types/feed.types';
import { formatTimeAgo } from '../utils/timeAgo';
import * as Haptics from 'expo-haptics';

interface RepostedPostCardProps {
  post: Post;
  onPress?: () => void;
  onAuthorPress?: (authorId: string) => void;
}

/**
 * Embedded card to show the original post within a repost (quote repost)
 * Similar to Twitter's quote tweet display
 */
export const RepostedPostCard = memo(function RepostedPostCard({
  post,
  onPress,
  onAuthorPress,
}: RepostedPostCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);

  const isOwnPost = user?.id === post.author.id;
  const CHAR_LIMIT = 200;

  // Check follow status
  useEffect(() => {
    checkFollowStatus();
  }, [post.author.id]);

  // Check if content exceeds character limit
  useEffect(() => {
    if (post.content && post.content.length > CHAR_LIMIT) {
      setShowSeeMore(true);
    }
  }, [post.content]);

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

  const handleAuthorPress = () => {
    if (onAuthorPress && post.author?.id) {
      onAuthorPress(post.author.id);
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* LinkedIn-style Header - Outside Card */}
      <View style={styles.profileHeader}>
        {/* Author Info */}
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={handleAuthorPress}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { borderColor: theme.colors.border }]}>
            {post.author.avatar_url ? (
              <Image
                source={{ uri: post.author.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
            )}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
                {post.author.display_name}
              </Text>

              {post.author.is_verified && <VerifiedBadge size={13} />}

              {/* Pro Badge (Premium tier) */}
              {post.author.subscription_tier === 'premium' && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={9} color="#FFFFFF" />
                </View>
              )}

              {/* Pro+ Badge (Unlimited tier) */}
              {post.author.subscription_tier === 'unlimited' && (
                <View style={styles.proPlusBadge}>
                  <Ionicons name="diamond" size={9} color="#FFFFFF" />
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

            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
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
                  size={14}
                  color={isConnected ? theme.colors.text : '#FFFFFF'}
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Embedded Post Card */}
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >

      {/* Content */}
      <Text style={[styles.content, { color: theme.colors.text }]}>
        {isExpanded || !showSeeMore
          ? post.content
          : `${post.content.substring(0, CHAR_LIMIT)}...`}
      </Text>

      {/* See More Button */}
      {showSeeMore && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={styles.seeMoreButton}
        >
          <Text style={[styles.seeMoreText, { color: theme.colors.primary }]}>
            {isExpanded ? 'See less' : 'See more'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Media Preview (if exists) */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      )}

      {/* Interaction Summary (minimal) */}
      {post.reactions_count && post.comments_count !== undefined && (
        <>
          {(Object.values(post.reactions_count || {}).reduce((sum: number, count: number) => sum + count, 0) > 0 || (post.comments_count || 0) > 0) && (
            <View style={styles.statsRow}>
              {Object.values(post.reactions_count || {}).reduce((sum: number, count: number) => sum + count, 0) > 0 && (
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {Object.values(post.reactions_count).reduce((sum, count) => sum + count, 0)} reactions
                </Text>
              )}
              {(post.comments_count || 0) > 0 && (
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {post.comments_count} comments
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  authorName: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  proBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proPlusBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 14,
  },
  proPlusText: {
    color: '#FFFFFF',
    ...Typography.label,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
    marginTop: -1,
  },
  authorDetails: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
    marginBottom: 2,
  },
  authorBio: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    marginBottom: 3,
  },
  timestamp: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    marginLeft: 8,
  },
  content: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  seeMoreButton: {
    marginTop: 4,
    marginBottom: 8,
  },
  seeMoreText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  statText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
});

export default RepostedPostCard;

