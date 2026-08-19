/**
 * LiveBadge — small red "LIVE" pill with a pulsing white dot, shown on a
 * creator's profile while their video live stream is active. Matches the
 * badge already live on the web profile page for visual consistency (per
 * MOBILE_TEAM_LIVE_STREAMING.MD: "small red pill, white pulsing dot, LIVE
 * text"). Unrelated to the existing Agora audio-live feature — no equivalent
 * badge exists for that today.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

interface LiveBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium';
}

export default function LiveBadge({ onPress, size = 'small' }: LiveBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const isSmall = size === 'small';

  const content = (
    <View style={[styles.pill, isSmall ? styles.pillSmall : styles.pillMedium]}>
      <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
      <Text style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}>LIVE</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 999,
  },
  pillSmall: { paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  pillMedium: { paddingHorizontal: 12, paddingVertical: 5, gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  text: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 },
  textSmall: { fontSize: 10 },
  textMedium: { fontSize: 12 },
});
