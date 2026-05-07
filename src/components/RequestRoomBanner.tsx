import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
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

export function MicGlowIcon({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute',
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 20,
      }}>
        <Ionicons name="mic" size={size} color="#EC4899" />
      </View>
      <View style={{
        position: 'absolute',
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 8,
        elevation: 10,
      }}>
        <Ionicons name="mic" size={size} color="#EC4899" />
      </View>
      <Ionicons name="mic" size={size} color="#FFFFFF" />
    </View>
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

  useEffect(() => {
    const loops = BAR_CONFIGS.map((c, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(c.delay),
          Animated.timing(barAnims[i], { toValue: c.highH, duration: c.duration, useNativeDriver: false }),
          Animated.timing(barAnims[i], { toValue: c.lowH, duration: c.duration, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

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

    return () => { pulse.stop(); glow.stop(); };
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
              <MicGlowIcon size={40} />
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
                  <View style={styles.button}>
                    <Text style={styles.buttonText}>Open Request Room</Text>
                    <View style={styles.arrowCircle}>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </View>
                  </View>
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
