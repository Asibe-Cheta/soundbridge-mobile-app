import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TIP_COLOR = '#FACC15';
const GLOW_IN = 900;
const GLOW_OUT = 1400;
const STAR_DURATION = 1300;
const STAGGER = 430;

// Three ✦ characters: left, centre, right relative to the icon
const STAR_OFFSETS = [-5, 2, 9];

interface Props {
  size: number;
  onPress: () => void;
  showAnimation: boolean;
}

export default function TipIconAnimated({ size, onPress, showAnimation }: Props) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const starAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);
  const starLoops = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (showAnimation) {
      // Glow pulse — breathes the icon opacity
      glowLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: GLOW_IN,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: GLOW_OUT,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.current.start();

      // Floating ✦ stars — staggered so they drift upward continuously
      starLoops.current = starAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * STAGGER),
            Animated.timing(anim, {
              toValue: 1,
              duration: STAR_DURATION,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        )
      );
      starLoops.current.forEach((loop) => loop.start());
    } else {
      glowLoop.current?.stop();
      starLoops.current.forEach((loop) => loop.stop());
      glowAnim.setValue(0);
      starAnims.forEach((a) => a.setValue(0));
    }

    return () => {
      glowLoop.current?.stop();
      starLoops.current.forEach((loop) => loop.stop());
    };
  }, [showAnimation]);

  const iconOpacity = showAnimation
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
    : 1;

  return (
    <View style={styles.wrapper}>
      {/* Floating ✦ stars — absolutely positioned above the icon */}
      {showAnimation &&
        starAnims.map((anim, i) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -20],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.15, 0.85, 1],
            outputRange: [0, 0.95, 0.7, 0],
          });
          return (
            <Animated.Text
              key={i}
              style={[
                styles.star,
                {
                  left: size / 2 - 5 + STAR_OFFSETS[i],
                  bottom: size + 1,
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            >
              ✦
            </Animated.Text>
          );
        })}

      <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Animated.View
          style={[
            styles.iconContainer,
            showAnimation && Platform.OS === 'ios' && styles.iosGlow,
            { opacity: iconOpacity },
          ]}
        >
          <Ionicons name="gift" size={size} color={TIP_COLOR} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    color: TIP_COLOR,
    fontSize: 9,
    // Neon halo on the star glyphs
    ...Platform.select({
      ios: {
        textShadowColor: TIP_COLOR,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
      },
    }),
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosGlow: {
    shadowColor: TIP_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
  },
});
