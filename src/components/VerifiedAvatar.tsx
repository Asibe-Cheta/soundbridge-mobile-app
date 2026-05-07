import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface VerifiedAvatarProps {
  avatarUrl?: string | null;
  isVerified?: boolean;
  size?: number;
  fallbackIconSize?: number;
  marginRight?: number;
}

export default function VerifiedAvatar({
  avatarUrl,
  isVerified,
  size = 48,
  fallbackIconSize,
  marginRight = 0,
}: VerifiedAvatarProps) {
  const { theme } = useTheme();
  const radius = size / 2;
  const iconSize = fallbackIconSize ?? Math.round(size * 0.5);

  const inner = avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: radius }} />
  ) : (
    <Ionicons name="person" size={iconSize} color={theme.colors.textSecondary} />
  );

  if (isVerified) {
    return (
      <LinearGradient
        colors={['#9333EA', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size + 5, height: size + 5, borderRadius: (size + 5) / 2, padding: 2.5, alignItems: 'center', justifyContent: 'center', marginRight }}
      >
        <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
          {inner}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, marginRight }}>
      {inner}
    </View>
  );
}
