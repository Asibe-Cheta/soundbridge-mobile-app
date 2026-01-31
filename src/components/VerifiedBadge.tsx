import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type VerifiedBadgeProps = {
  size?: number;
};

export default function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  const radius = Math.round(size / 2);
  return (
    <LinearGradient
      colors={['#DC2626', '#EC4899']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
    >
      <Ionicons name="checkmark" size={Math.max(8, size - 6)} color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
