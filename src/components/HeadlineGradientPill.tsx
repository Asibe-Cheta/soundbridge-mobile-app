import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const HEADLINE_GRADIENT_PRESETS = [
  { id: 1, label: 'Rose',   colors: ['#EC4899', '#EF4444'] as [string, string] },
  { id: 2, label: 'Ocean',  colors: ['#3B82F6', '#7C3AED'] as [string, string] },
  { id: 3, label: 'Amber',  colors: ['#F59E0B', '#EF4444'] as [string, string] },
  { id: 4, label: 'Forest', colors: ['#10B981', '#06B6D4'] as [string, string] },
  { id: 5, label: 'Silver', colors: ['#9CA3AF', '#E5E7EB'] as [string, string] },
] as const;

const PILL_HEIGHT = 58;
const BORDER_WIDTH = 2.5;
// One full rotation every 3 seconds — slow and elegant per spec
const ROTATION_DURATION_MS = 3000;

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
    return () => {
      animRef.current?.stop();
    };
  }, [animate]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Square must cover the full pill diagonal at any rotation angle
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
      {/* Rotating gradient fills the background behind the pill */}
      <Animated.View
        style={[
          styles.rotatingWrapper,
          {
            width: squareSize,
            height: squareSize,
            transform: [{ rotate }],
          },
        ]}
      >
        <LinearGradient
          colors={preset.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: squareSize, height: squareSize }}
        />
      </Animated.View>

      {/* Inner pill — solid card background creates the animated border illusion */}
      <View
        style={[
          styles.innerPill,
          {
            width: innerWidth,
            height: innerHeight,
            borderRadius: innerHeight / 2,
            backgroundColor,
          },
        ]}
      >
        <Text
          style={[styles.headlineText, { fontSize }]}
          numberOfLines={2}
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
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
});
