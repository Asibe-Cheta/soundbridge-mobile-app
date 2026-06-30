import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SystemTypography as Typography } from '../constants/Typography';

export const HEADLINE_GRADIENT_PRESETS = [
  { id: 1, label: 'Rose',   colors: ['#EC4899', '#EF4444'] as [string, string] },
  { id: 2, label: 'Ocean',  colors: ['#3B82F6', '#7C3AED'] as [string, string] },
  { id: 3, label: 'Amber',  colors: ['#F59E0B', '#EF4444'] as [string, string] },
  { id: 4, label: 'Forest', colors: ['#10B981', '#06B6D4'] as [string, string] },
  { id: 5, label: 'Silver', colors: ['#9CA3AF', '#E5E7EB'] as [string, string] },
] as const;

const PILL_HEIGHT = 52;
const BORDER_WIDTH = 1.5;
const ROTATION_DURATION_MS = 5000;

interface HeadlineGradientPillProps {
  headline: string;
  gradientPreset?: number;
  pillWidth: number;
  backgroundColor: string;
  animate?: boolean;
  fontSize?: number;
}

export default function HeadlineGradientPill({
  headline,
  gradientPreset = 1,
  pillWidth,
  backgroundColor,
  animate = true,
  fontSize = 17,
}: HeadlineGradientPillProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const preset = HEADLINE_GRADIENT_PRESETS.find(g => g.id === gradientPreset)
    ?? HEADLINE_GRADIENT_PRESETS[0];

  useEffect(() => {
    if (!animate) {
      animRef.current?.stop();
      return;
    }
    animRef.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: ROTATION_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
    return () => { animRef.current?.stop(); };
  }, [animate]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const squareSize = Math.ceil(Math.sqrt(pillWidth * pillWidth + PILL_HEIGHT * PILL_HEIGHT)) + 8;
  const innerWidth = pillWidth - BORDER_WIDTH * 2;
  const innerHeight = PILL_HEIGHT - BORDER_WIDTH * 2;

  return (
    <View
      style={[
        styles.outerPill,
        { width: pillWidth, height: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2 },
      ]}
    >
      {/* Rotating gradient — only visible as the animated border */}
      <Animated.View
        style={[
          styles.rotatingWrapper,
          { width: squareSize, height: squareSize, transform: [{ rotate }] },
        ]}
      >
        <LinearGradient
          colors={preset.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: squareSize, height: squareSize }}
        />
      </Animated.View>

      {/* Inner glass surface */}
      <View
        style={[
          styles.innerPill,
          {
            width: innerWidth,
            height: innerHeight,
            borderRadius: innerHeight / 2,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Glassmorphic base */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(12,8,24,0.72)' }]} />
        )}

        {/* Subtle gradient tint overlay */}
        <LinearGradient
          colors={[preset.colors[0] + '28', preset.colors[1] + '18']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Glass highlight sheen at top */}
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: innerHeight / 2 }]}
        />

        {/* Headline text */}
        <Text
          style={[styles.headlineText, { fontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {headline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerPill: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatingWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerPill: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headlineText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
