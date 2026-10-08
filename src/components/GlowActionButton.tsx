import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

/**
 * Ported from a hand-built HTML/CSS button (glass pill, glowing border, flickering
 * sparkle icon, per-letter pulsing text that crossfades to an "-ing" active label).
 * CSS inset box-shadows and the ::before/::after glow layers have no direct RN
 * equivalent, so they're approximated with a top-edge gloss gradient, a shadow-based
 * outer glow, and an animated gradient overlay — same visual read, RN-native means.
 *
 * `active` is controlled by the caller (e.g. an in-flight request), not just touch —
 * CSS used :focus for this because a real page click holds focus; RN has no such
 * state, so the label crossfade and persisted glow both key off this prop instead.
 */

const HIGHLIGHT = '#66B3FF'; // hsl(210, 100%, 70%) from the original --highlight-color-hue

interface GlowActionButtonProps {
  onPress: () => void;
  label?: string;
  activeLabel?: string;
  active?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

function PulsingLetters({ text, delayStep = 80 }: { text: string; delayStep?: number }) {
  const anims = useRef(text.split('').map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * delayStep),
          Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [text]);

  return (
    <View style={styles.letterRow}>
      {text.split('').map((char, i) => (
        <Animated.Text
          key={`${char}-${i}`}
          style={[
            styles.letter,
            {
              color: anims[i].interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,255,255,0.33)', '#ffffff'],
              }),
              textShadowRadius: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, 3] }),
            },
          ]}
        >
          {char === ' ' ? ' ' : char}
        </Animated.Text>
      ))}
    </View>
  );
}

export default function GlowActionButton({
  onPress,
  label = 'Analyse',
  activeLabel = 'Analysing',
  active = false,
  disabled = false,
  style,
}: GlowActionButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current; // momentary touch feedback
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current; // caller-controlled, persists
  const iconFlicker = useRef(new Animated.Value(1)).current;
  const labelCrossfade = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(iconFlicker, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(iconFlicker, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    Animated.timing(activeAnim, { toValue: active ? 1 : 0, duration: 400, useNativeDriver: false }).start();
    Animated.timing(labelCrossfade, { toValue: active ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [active]);

  const glowOpacity = Animated.add(pressAnim, activeAnim).interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  const borderColor = Animated.add(pressAnim, activeAnim).interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['rgba(255,255,255,0.13)', 'rgba(102,179,255,0.4)', 'rgba(102,179,255,0.7)'],
    extrapolate: 'clamp',
  });

  const iconColor = Animated.add(pressAnim, activeAnim).interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#e8e8e8', '#ffffff', '#ffffff'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrap, style]}>
      {/* Outer glow — the original's ::before pseudo-element glow border */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.outerGlow,
          {
            opacity: glowOpacity,
            shadowColor: HIGHLIGHT,
          },
        ]}
      />

      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => Animated.timing(pressAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start()}
        onPressOut={() => Animated.timing(pressAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start()}
        style={({ pressed }) => [styles.btn, disabled && styles.btnDisabled, pressed && styles.btnPressed]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.btn, { borderColor }]}>
          {/* Top-edge gloss — approximates the CSS inset highlight shadows */}
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Hover/active highlight sweep — the original's ::after gradient */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(102,179,255,0.25)', 'rgba(255,255,255,0.35)']}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ opacity: iconFlicker, marginRight: 8 }}>
          <AnimatedSvgIcon color={iconColor} />
        </Animated.View>

        <View style={styles.textWrap}>
          <Animated.View
            style={[
              styles.textLayer,
              { opacity: labelCrossfade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
            ]}
          >
            <PulsingLetters text={label} />
          </Animated.View>
          <Animated.View style={[styles.textLayer, { opacity: labelCrossfade }]}>
            <PulsingLetters text={activeLabel} />
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

// react-native-svg's Path doesn't animate fill via Animated.Value directly in the
// JS-driven (non-native-driver) sense across versions reliably, so this small
// wrapper re-renders the Svg on each interpolated color tick instead.
function AnimatedSvgIcon({ color }: { color: Animated.AnimatedInterpolation<string> }) {
  const [resolved, setResolved] = React.useState('#e8e8e8');
  useEffect(() => {
    const id = color.addListener(({ value }) => setResolved(value as unknown as string));
    return () => color.removeListener(id);
  }, [color]);

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        fill={resolved}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  outerGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  btnPressed: {
    backgroundColor: 'rgba(102,179,255,0.12)',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  textWrap: {
    minWidth: 92,
    height: 20,
    justifyContent: 'center',
  },
  textLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  letterRow: {
    flexDirection: 'row',
  },
  letter: {
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: '#ffffff88',
    textShadowOffset: { width: 0, height: 0 },
  },
});
