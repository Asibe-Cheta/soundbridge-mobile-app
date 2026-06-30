import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { SystemTypography as Typography } from '../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

interface LiveAudioBannerProps {
  onPress?: () => void;
}

const PINK = '#EC4899'

function PodMicSvg({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Line x1="64" x2="64" y1="96.9" y2="109.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M64,81L64,81c-10.7,0-19.4-8.7-19.4-19.4V39.9c0-10.7,8.7-19.4,19.4-19.4h0c10.7,0,19.4,8.7,19.4,19.4v21.7C83.4,72.3,74.7,81,64,81z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M64,96.9c-20.1,0-36.5-16.3-36.5-36.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M100.5,60.4c0,15.4-9.5,28.5-22.9,33.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

function PodMicIcon({
  size = 48,
  glowOpacity,
}: {
  size?: number;
  glowOpacity: Animated.Value;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Wide outer glow — thick pink stroke creates visible spread at any display size */}
      <Animated.View style={{ position: 'absolute', opacity: glowOpacity }}>
        <PodMicSvg size={size} color={PINK} strokeWidth={32} />
      </Animated.View>
      {/* Mid glow — tighter but still wide */}
      <Animated.View style={{ position: 'absolute', opacity: glowOpacity }}>
        <PodMicSvg size={size} color={PINK} strokeWidth={20} />
      </Animated.View>
      {/* Sharp white icon on top — always visible, never moves */}
      <PodMicSvg size={size} color="#ffffff" strokeWidth={8} />
    </View>
  )
}

// Circle circumference at r=11
const RING_R = 11
const RING_CIRC = 2 * Math.PI * RING_R

function TravellingRingArrow() {
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const runCycle = (onDone: () => void) => {
      rotateAnim.setValue(0)
      Animated.sequence([
        // Slow sweep — 75% of circle in 1000ms
        Animated.timing(rotateAnim, {
          toValue: 0.75,
          duration: 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Rocket to end — remaining 25% in 280ms
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) onDone() })
    }

    // Run exactly 3 cycles then stop
    runCycle(() => runCycle(() => runCycle(() => {})))
  }, [])

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.arrowCircle}>
      {/* Static dim background ring */}
      <Svg width={24} height={24} style={{ position: 'absolute' }}>
        <Circle
          cx={12} cy={12} r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
      </Svg>
      {/* Rotating gradient arc */}
      <Animated.View style={{ position: 'absolute', width: 24, height: 24, transform: [{ rotate: spin }] }}>
        <Svg width={24} height={24}>
          <Defs>
            <SvgLinearGradient id="liveRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#EC4899" stopOpacity={1} />
              <Stop offset="33%"  stopColor="#FFFFFF"  stopOpacity={1} />
              <Stop offset="66%"  stopColor="#EF4444"  stopOpacity={1} />
              <Stop offset="100%" stopColor="#3B82F6"  stopOpacity={1} />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={12} cy={12} r={RING_R}
            fill="none"
            stroke="url(#liveRing)"
            strokeWidth={1.5}
            strokeDasharray={`${RING_CIRC * 0.55} ${RING_CIRC * 0.45}`}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
    </View>
  )
}

const BAR_COUNT = 26
const MAX_BAR_H = 52
const MIN_BAR_H = 6

// Stable per-bar config — deterministic pseudo-random so bars feel organic, not uniform
// Each bar gets a unique high target, low target, duration and phase offset
const BAR_CONFIGS = Array.from({ length: BAR_COUNT }, (_, i) => {
  // Use prime-based offsets to break any visible periodicity
  const seed1 = (i * 127 + 31) % 97
  const seed2 = (i * 61 + 17) % 83
  const seed3 = (i * 43 + 7) % 71
  const seed4 = (i * 89 + 53) % 59
  const seed5 = (i * 37 + 11) % 53
  const palette = ['#A78BFA', '#C084FC', '#EC4899', '#F43F5E', '#FB7185', '#E879A0', '#F472B6']
  return {
    highH: MIN_BAR_H + (seed1 / 97) * (MAX_BAR_H - MIN_BAR_H),
    lowH: MIN_BAR_H + (seed2 / 83) * 18,
    duration: 500 + (seed3 / 71) * 1100,
    delay: (seed4 / 59) * 1200,
    color: palette[seed5 % palette.length],
  }
})

export default function LiveAudioBanner({ onPress }: LiveAudioBannerProps) {
  const navigation = useNavigation();

  // --- Waveform bars (height animation, no native driver) ---
  const barAnims = useRef(
    BAR_CONFIGS.map(c => new Animated.Value(c.lowH + (c.highH - c.lowH) * 0.5))
  ).current

  // --- Live dot pulse (scale) ---
  const pulseAnim = useRef(new Animated.Value(1)).current

  // --- Live dot glow ring (opacity) ---
  const glowAnim = useRef(new Animated.Value(0)).current

  // --- Mic neon glow opacity (0 = invisible, 0.85 = full neon) ---
  const micGlowAnim = useRef(new Animated.Value(0)).current

  // --- Press scale ---
  const scaleAnim = useRef(new Animated.Value(1)).current

  // --- Slide-out on navigate ---
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const barLoops = BAR_CONFIGS.map((c, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(c.delay),
          Animated.timing(barAnims[i], {
            toValue: c.highH,
            duration: c.duration,
            useNativeDriver: false,
          }),
          Animated.timing(barAnims[i], {
            toValue: c.lowH,
            duration: c.duration,
            useNativeDriver: false,
          }),
        ])
      )
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );

    const micGlow = Animated.loop(
      Animated.sequence([
        Animated.timing(micGlowAnim, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
        Animated.timing(micGlowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );

    const decorativeLoops = [...barLoops, pulse, glow, micGlow];
    const start = () => decorativeLoops.forEach((l) => l.start());
    const stop = () => decorativeLoops.forEach((l) => l.stop());

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else if (next === 'background' || next === 'inactive') stop();
    });

    return () => {
      sub.remove();
      stop();
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start()
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (onPress) {
      onPress()
      return
    }
    Animated.timing(slideAnim, {
      toValue: -420,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(0)
      navigation.navigate('LiveSessions' as never)
    })
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <LinearGradient
          colors={['#4C1D95', '#6D28D9', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Waveform background — bottom-aligned bars */}
          <View style={styles.waveformContainer} pointerEvents="none">
            {barAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: anim,
                    opacity: 0.13 + (i % 3) * 0.02,
                    backgroundColor: BAR_CONFIGS[i].color,
                    shadowColor: BAR_CONFIGS[i].color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                  },
                ]}
              />
            ))}
          </View>

          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* Header: icon + live dot */}
          <View style={styles.header}>
            <PodMicIcon size={40} glowOpacity={micGlowAnim} />

            {/* Live indicator with glow ring */}
            <View style={styles.livePulseWrapper}>
              {/* Glow ring */}
              <Animated.View
                style={[
                  styles.glowRing,
                  { opacity: glowAnim },
                ]}
              />
              {/* Pulsing outer dot */}
              <Animated.View
                style={[
                  styles.liveDotOuter,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              {/* Solid inner dot */}
              <View style={styles.liveDotInner} />
            </View>
          </View>

          {/* Glassmorphism content section */}
          <View style={styles.glassSection}>
            <BlurView intensity={18} tint="dark" style={styles.blurFill}>
              <View style={styles.glassOverlay}>
                <Text style={styles.title}>Live Audio Sessions</Text>
                <Text style={styles.subtitle}>
                  Join live rooms • Host your own • Connect in real-time
                </Text>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>Explore Live Rooms</Text>
                  <TravellingRingArrow />
                </View>
              </View>
            </BlurView>
          </View>
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  pressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  waveformContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 78,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    gap: 3,
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulseWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  liveDotOuter: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  liveDotInner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  glassSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blurFill: {
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(109, 40, 217, 0.12)',
    padding: 16,
    gap: 10,
  },
  title: {
    ...Typography.headerMedium,
    fontSize: 22,
    color: '#FFFFFF',
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 19,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    ...Typography.button,
    fontSize: 14,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
