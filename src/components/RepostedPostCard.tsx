import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { Post } from '../types/feed.types';
import { formatTimeAgo } from '../utils/timeAgo';

interface RepostedPostCardProps {
  post: Post;
  onPress?: () => void;
}

/**
 * Embedded card to show the original post within a repost (quote repost)
 * Similar to Twitter's quote tweet display
 */
export const RepostedPostCard = memo(function RepostedPostCard({
  post,
  onPress,
}: RepostedPostCardProps) {
  const { theme } = useTheme();

  return (
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
      {/* Author Info */}
      <View style={styles.header}>
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
          <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
            {post.author.display_name}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatTimeAgo(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text
        style={[styles.content, { color: theme.colors.text }]}
        numberOfLines={4}
      >
        {post.content}
      </Text>

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
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  authorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  timestamp: {
    fontSize: 12,
  },
  content: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  statText: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default RepostedPostCard;

