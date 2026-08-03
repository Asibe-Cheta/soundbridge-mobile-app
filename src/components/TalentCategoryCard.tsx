/**
 * TalentCategoryCard
 *
 * Category tile for the Talent Discovery horizontal category row (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD). Discover uses two distinct card
 * designs depending on layout: the compact artistGridCard for wrapped
 * vertical grids, and the poster-style htmlCard (see FeaturedCreatorCard)
 * for horizontal-scrolling rows specifically. Since this is a horizontal
 * row, this card matches htmlCard's container and background-image+gradient
 * treatment exactly — same 280x380 size, radius, border — with a category
 * photo in place of a creator photo, falling back to an icon ring when no
 * photo is supplied (e.g. Session Musicians & Instrumentalists).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';

interface TalentCategoryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isFirst?: boolean;
  image?: ImageSourcePropType;
}

export default function TalentCategoryCard({ icon, label, onPress, isFirst = false, image }: TalentCategoryCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.htmlCard, isFirst && { marginLeft: 24 }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 24 }]}>
        {image ? (
          <Image source={image} style={styles.htmlCardImage} />
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
            <Ionicons name={icon} size={80} color={theme.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
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

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
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
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
    alignItems: 'center',
  },
  title: {
    ...Typography.headerMedium,
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
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
