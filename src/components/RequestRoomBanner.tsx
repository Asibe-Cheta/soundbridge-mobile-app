import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
import { SystemTypography as Typography } from '../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const BAR_COUNT = 26;
const MAX_BAR_H = 52;
const MIN_BAR_H = 6;

const BAR_CONFIGS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const seed1 = (i * 127 + 31) % 97;
  const seed2 = (i * 61 + 17) % 83;
  const seed3 = (i * 43 + 7) % 71;
  const seed4 = (i * 89 + 53) % 59;
  const seed5 = (i * 37 + 11) % 53;
  const palette = ['#A78BFA', '#C084FC', '#EC4899', '#F43F5E', '#DC2626', '#EF4444', '#FB7185'];
  return {
    highH: MIN_BAR_H + (seed1 / 97) * (MAX_BAR_H - MIN_BAR_H),
    lowH: MIN_BAR_H + (seed2 / 83) * 18,
    duration: 500 + (seed3 / 71) * 1100,
    delay: (seed4 / 59) * 1200,
    color: palette[seed5 % palette.length],
  };
});

const RING_R = 11;
const RING_CIRC = 2 * Math.PI * RING_R;

export function MicGlowIcon({
  size = 40,
  glowOpacity,
}: {
  size?: number;
  glowOpacity: Animated.Value;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Wide pink glow — large icon + semi-transparent for spread */}
      <Animated.View style={{ position: 'absolute', opacity: glowOpacity }}>
        <Ionicons name="mic" size={size * 1.7} color="rgba(236,72,153,0.45)" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: glowOpacity }}>
        <Ionicons name="mic" size={size * 1.35} color="rgba(236,72,153,0.7)" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: glowOpacity }}>
        <Ionicons name="mic" size={size} color="#EC4899" />
      </Animated.View>
      {/* Sharp white icon always on top */}
      <Ionicons name="mic" size={size} color="#FFFFFF" />
    </View>
  );
}

function TravellingRingArrow() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runCycle = (onDone: () => void) => {
      rotateAnim.setValue(0);
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 0.75,
          duration: 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) onDone(); });
    };
    runCycle(() => runCycle(() => runCycle(() => {})));
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.arrowCircle}>
      <Svg width={24} height={24} style={{ position: 'absolute' }}>
        <Circle cx={12} cy={12} r={RING_R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      </Svg>
      <Animated.View style={{ position: 'absolute', width: 24, height: 24, transform: [{ rotate: spin }] }}>
        <Svg width={24} height={24}>
          <Defs>
            <SvgLinearGradient id="rrRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#EC4899" stopOpacity={1} />
              <Stop offset="33%"  stopColor="#FFFFFF"  stopOpacity={1} />
              <Stop offset="66%"  stopColor="#EF4444"  stopOpacity={1} />
              <Stop offset="100%" stopColor="#3B82F6"  stopOpacity={1} />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={12} cy={12} r={RING_R}
            fill="none"
            stroke="url(#rrRing)"
            strokeWidth={1.5}
            strokeDasharray={`${RING_CIRC * 0.55} ${RING_CIRC * 0.45}`}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
    </View>
  );
}

function TravellingPillBorder({ onPress }: { onPress: () => void }) {
  const [dims, setDims] = React.useState({ w: 0, h: 0 });
  const dashAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Pill perimeter: 2×(width−height) + π×height  (full borderRadius = height/2)
  const perim = dims.w > 0 ? 2 * (dims.w - dims.h) + Math.PI * dims.h : 0;
  const arcLen = perim * 0.28;

  useEffect(() => {
    if (perim === 0) return;
    dashAnim.setValue(0);
    loopRef.current = Animated.loop(
      Animated.timing(dashAnim, {
        toValue: -perim,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: false, // SVG strokeDashoffset cannot use native driver
      })
    );
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [perim]);

  return (
    <Pressable
      onPress={onPress}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setDims(prev => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
      }}
      style={styles.button}
    >
      {dims.w > 0 && (
        <Svg width={dims.w} height={dims.h} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
          <Defs>
            <SvgLinearGradient id="pillBdr" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%"   stopColor="#EC4899" stopOpacity={1} />
              <Stop offset="35%"  stopColor="#FFFFFF"  stopOpacity={1} />
              <Stop offset="70%"  stopColor="#EF4444"  stopOpacity={1} />
              <Stop offset="100%" stopColor="#3B82F6"  stopOpacity={1} />
            </SvgLinearGradient>
          </Defs>
          {/* Dim base ring */}
          <Rect
            x={1} y={1} width={dims.w - 2} height={dims.h - 2}
            rx={dims.h / 2 - 1} ry={dims.h / 2 - 1}
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          />
          {/* Travelling gradient arc */}
          <AnimatedRect
            x={1} y={1} width={dims.w - 2} height={dims.h - 2}
            rx={dims.h / 2 - 1} ry={dims.h / 2 - 1}
            fill="none"
            stroke="url(#pillBdr)"
            strokeWidth={1.5}
            strokeDasharray={`${arcLen} ${perim - arcLen}`}
            strokeDashoffset={dashAnim as any}
            strokeLinecap="round"
          />
        </Svg>
      )}
      <Text style={styles.buttonText}>Open Request Room</Text>
      <TravellingRingArrow />
    </Pressable>
  );
}

export function WaveformBars({ barAnims }: { barAnims: Animated.Value[] }) {
  return (
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
  );
}

export function useWaveformAnims() {
  const barAnims = useRef(
    BAR_CONFIGS.map(c => new Animated.Value(c.lowH + (c.highH - c.lowH) * 0.5))
  ).current;

  const createLoops = useCallback(
    () =>
      BAR_CONFIGS.map((c, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(c.delay),
            Animated.timing(barAnims[i], { toValue: c.highH, duration: c.duration, useNativeDriver: false }),
            Animated.timing(barAnims[i], { toValue: c.lowH, duration: c.duration, useNativeDriver: false }),
          ]),
        ),
      ),
    [barAnims],
  );

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    const stop = () => {
      loops.forEach((l) => l.stop());
      loops = [];
    };
    const start = () => {
      stop();
      loops = createLoops();
      loops.forEach((l) => l.start());
    };

    if (AppState.currentState === 'active') start();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else if (next === 'background' || next === 'inactive') stop();
    });

    return () => {
      sub.remove();
      stop();
    };
  }, [createLoops]);

  return barAnims;
}

interface RequestRoomBannerProps {
  onPress?: () => void;
}

export default function RequestRoomBanner({ onPress }: RequestRoomBannerProps) {
  const navigation = useNavigation<any>();
  const barAnims = useWaveformAnims();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const micGlowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    glow.start();

    const micGlow = Animated.loop(
      Animated.sequence([
        Animated.timing(micGlowAnim, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
        Animated.timing(micGlowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    micGlow.start();

    return () => { pulse.stop(); glow.stop(); micGlow.stop(); };
  }, []);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 20, bounciness: 0 }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) { onPress(); return; }
    Animated.timing(slideAnim, { toValue: -420, duration: 280, useNativeDriver: true })
      .start(() => { slideAnim.setValue(0); navigation.navigate('RequestRoomSetup'); });
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.pressable}>
        <LinearGradient
          colors={['#4C1D95', '#6D28D9', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <WaveformBars barAnims={barAnims} />

          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <View style={styles.header}>
              <MicGlowIcon size={40} glowOpacity={micGlowAnim} />
              <View style={styles.livePulseWrapper}>
                <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
                <Animated.View style={[styles.liveDotOuter, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.liveDotInner} />
              </View>
            </View>

            <View style={styles.glassSection}>
              <BlurView intensity={18} tint="dark" style={styles.blurFill}>
                <View style={styles.glassOverlay}>
                  <Text style={styles.title}>Request Room</Text>
                  <Text style={styles.subtitle}>
                    Set a tip • Share your link • Take live requests
                  </Text>
                  <TravellingPillBorder onPress={handlePress} />
                </View>
              </BlurView>
            </View>
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  pressable: { borderRadius: 20, overflow: 'hidden' },
  gradient: { borderRadius: 20, overflow: 'hidden', paddingTop: 20, paddingHorizontal: 20 },
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
  waveBar: { flex: 1, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  livePulseWrapper: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  glowRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  liveDotOuter: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  liveDotInner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  glassSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blurFill: { overflow: 'hidden' },
  glassOverlay: {
    backgroundColor: 'rgba(153, 27, 27, 0.15)',
    padding: 16,
    gap: 10,
  },
  title: { ...Typography.headerMedium, fontSize: 22, color: '#FFFFFF' },
  subtitle: { ...Typography.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(220, 38, 38, 0.28)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  buttonText: { color: '#FFFFFF', ...Typography.button, fontSize: 14 },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
