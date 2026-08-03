/**
 * CreatorGridCard
 *
 * The creator card used in DiscoverScreen's "All Artists" grid (Artists tab),
 * extracted so other screens (Talent Discovery) can reuse the exact same
 * component instead of building visually-similar duplicates. Card internals
 * (avatar size, padding, radius, typography) are pixel-identical to the
 * original inline JSX in DiscoverScreen — only the outer width is
 * configurable via `cardStyle` so the same card can sit in a 2-column grid
 * (width: '48%', DiscoverScreen's own usage) or a fixed-width horizontal row.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import InstitutionBadge from './InstitutionBadge';

export interface CreatorGridCardData {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  genre?: string | null;
  location?: string | null;
  followers_count?: number | null;
  tracks_count?: number | null;
  institution_badge?: string | null;
}

interface CreatorGridCardProps {
  creator: CreatorGridCardData;
  onPress: () => void;
  cardStyle?: StyleProp<ViewStyle>;
}

function formatNumber(num?: number | null): string {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function CreatorGridCard({ creator, onPress, cardStyle }: CreatorGridCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity style={[styles.artistGridCard, cardStyle]} onPress={onPress}>
      <View style={styles.artistGridAvatar}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.artistGridImage} />
        ) : (
          <View style={styles.defaultArtistGridImage}>
            <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[styles.artistGridName, { color: theme.colors.text }]} numberOfLines={1}>
          {creator.display_name || creator.username}
        </Text>
        <InstitutionBadge institution={creator.institution_badge} size={14} />
      </View>
      <Text style={[styles.artistGridUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        @{creator.username}
      </Text>
      <View style={styles.artistGridMeta}>
        {creator.genre && (
          <Text style={[styles.artistGridGenre, { color: theme.colors.primary }]} numberOfLines={1}>
            {creator.genre}
          </Text>
        )}
        {creator.location && (
          <Text style={[styles.artistGridLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {creator.location}
          </Text>
        )}
      </View>
      <Text style={[styles.artistGridStats, { color: theme.colors.textSecondary }]}>
        {formatNumber(creator.followers_count)} followers • {formatNumber(creator.tracks_count)} tracks
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  artistGridCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  artistGridAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  artistGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  defaultArtistGridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistGridName: {
    ...Typography.label,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  artistGridUsername: {
    ...Typography.label,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  artistGridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  artistGridGenre: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '500',
  },
  artistGridLocation: {
    ...Typography.label,
    fontSize: 11,
  },
  artistGridStats: {
    ...Typography.label,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
});
