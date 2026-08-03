/**
 * TalentCategoryCard
 *
 * A category tile for the Talent Discovery category-selection row (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD) — the card represents the CATEGORY
 * itself (icon + label), not a live creator preview. No equivalent exists on
 * DiscoverScreen (its cards are all creator/track shaped), so this is a new,
 * minimal component — but its outer container styling (radius, padding,
 * background) matches CreatorGridCard's artistGridCard exactly, so it reads
 * as the same design system rather than a one-off.
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
}

export default function TalentCategoryCard({ icon, label, onPress }: TalentCategoryCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '20' }]}>
        <Ionicons name={icon} size={26} color={theme.colors.primary} />
      </View>
      <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    ...Typography.label,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
