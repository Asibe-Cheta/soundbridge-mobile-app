/**
 * FeaturedCreatorCard
 *
 * The poster-style creator card used in DiscoverScreen's horizontal
 * "Featured Artists" row (the same `htmlCard` container/visual design used
 * for the "Trending This Week" tracks row) — extracted so other screens
 * (Talent Discovery) can reuse the exact same horizontal-row card instead of
 * building visually-similar duplicates. Pixel-identical to the original
 * inline JSX: 280x380 card, background image + gradient, avatar, name,
 * follower count, badge, Follow button.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

export interface FeaturedCreatorCardData {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  followers_count?: number | null;
}

interface FeaturedCreatorCardProps {
  creator: FeaturedCreatorCardData;
  onPress: () => void;
  /** Matches DiscoverScreen's default "RISING" badge; pass null to hide it. */
  badgeLabel?: string | null;
  /** DiscoverScreen's Follow button is currently a stub (no persisted action) — kept as-is by default. */
  onFollowPress?: (e: any) => void;
  isFirst?: boolean;
}

function formatNumber(num?: number | null): string {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function FeaturedCreatorCard({
  creator,
  onPress,
  badgeLabel = 'RISING',
  onFollowPress,
  isFirst = false,
}: FeaturedCreatorCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.htmlCard, isFirst && { marginLeft: 24 }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {badgeLabel && (
        <View style={styles.htmlBadge}>
          <Text style={[styles.htmlBadgeText, { color: theme.colors.primary }]}>{badgeLabel}</Text>
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 24 }]}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={[styles.htmlCardImage, { opacity: 0.8 }]} />
        ) : (
          <View
            style={[
              styles.htmlCardImage,
              {
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Ionicons name="person" size={80} color={theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
          </View>
        )}
        <LinearGradient
          colors={
            theme.isDark
              ? ['transparent', 'rgba(19, 7, 34, 0.5)', '#130722']
              : ['transparent', `${theme.colors.background}80`, theme.colors.background]
          }
          style={styles.htmlCardGradient}
        />
      </View>

      <View style={[styles.htmlCardContent, { alignItems: 'center', paddingBottom: 32 }]}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            padding: 4,
            marginBottom: 16,
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
          }}
        >
          {creator.avatar_url ? (
            <Image source={{ uri: creator.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 36 }} />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 36,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="person" size={32} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </View>

        <Text style={[styles.htmlCardTitle, { textAlign: 'center' }]} numberOfLines={1}>
          {creator.display_name || creator.username}
        </Text>
        <Text style={[styles.htmlCardArtist, { marginBottom: 16 }]} numberOfLines={1}>
          {formatNumber(creator.followers_count || 0)} Followers
        </Text>

        <TouchableOpacity
          style={{
            width: '100%',
            paddingVertical: 8,
            paddingHorizontal: 24,
            backgroundColor: theme.colors.primary,
            borderRadius: 999,
            alignItems: 'center',
          }}
          onPress={(e: any) => {
            e.stopPropagation();
            onFollowPress?.(e);
          }}
        >
          <Text style={[Typography.label, { color: '#FFFFFF', fontSize: 14, fontWeight: '600' }]}>Follow</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  htmlCard: {
    width: 280,
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  htmlCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  htmlCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  htmlBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  htmlBadgeText: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1.2,
  },
  htmlCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
  },
  htmlCardTitle: {
    ...Typography.headerMedium,
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  htmlCardArtist: {
    ...Typography.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
});
