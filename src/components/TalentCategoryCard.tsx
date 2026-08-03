/**
 * TalentCategoryCard
 *
 * Category tile for the Talent Discovery horizontal category row (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD). Discover uses two distinct card
 * designs depending on layout: the compact artistGridCard for wrapped
 * vertical grids, and the poster-style htmlCard (see FeaturedCreatorCard)
 * for horizontal-scrolling rows specifically. Since this is a horizontal
 * row, this card matches htmlCard's container exactly — same 280x380 size,
 * radius, border, background treatment — with an icon + label in place of
 * a creator photo/name.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

interface TalentCategoryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isFirst?: boolean;
}

export default function TalentCategoryCard({ icon, label, onPress, isFirst = false }: TalentCategoryCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.htmlCard, isFirst && { marginLeft: 24 }, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconRing,
            {
              borderColor: theme.colors.primary,
              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            },
          ]}
        >
          <Ionicons name={icon} size={40} color={theme.colors.primary} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
          {label}
        </Text>

        <TouchableOpacity style={[styles.viewAllBtn, { backgroundColor: theme.colors.primary }]} onPress={onPress}>
          <Text style={styles.viewAllBtnText}>View All</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Matches FeaturedCreatorCard's htmlCard exactly (same horizontal-row card
  // design used for DiscoverScreen's Trending This Week / Featured Artists).
  htmlCard: {
    width: 280,
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    ...Typography.headerMedium,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  // Matches FeaturedCreatorCard's Follow button exactly.
  viewAllBtn: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
  },
  viewAllBtnText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
