import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  style?: object;
}

export default function EventForYouBadge({ style }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.primary + 'E6' }, style]}>
      <Ionicons name="sparkles" size={11} color="#fff" style={styles.icon} />
      <Text style={styles.text}>For you</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
