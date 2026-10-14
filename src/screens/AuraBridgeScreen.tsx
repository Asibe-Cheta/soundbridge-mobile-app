// Dependencies: expo-linear-gradient, react-native-svg, @expo/vector-icons, expo-blur,
// @expo-google-fonts/inter, react-native-reanimated
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

type Phase = 'entry' | 'morphing' | 'response';

const entryStars = [
  { left: '23%', top: '33.5%', size: 3, opacity: 0.35 },
  { left: '57%', top: '34.8%', size: 4, opacity: 0.4 },
  { left: '59%', top: '34%', size: 2, opacity: 0.2 },
  { left: '27.5%', top: '41.9%', size: 3, opacity: 0.45 },
  { left: '25.5%', top: '42.7%', size: 2, opacity: 0.3 },
  { left: '43%', top: '42.7%', size: 2, opacity: 0.15 },
  { left: '46%', top: '42.1%', size: 2, opacity: 0.15 },
  { left: '61%', top: '43%', size: 3, opacity: 0.25 },
  { left: '63%', top: '42.2%', size: 2, opacity: 0.2 },
  { left: '65%', top: '41.5%', size: 2, opacity: 0.1 },
] as const;

// Response-phase star field — ported from Aura's own RN conversion (pixel-position pairs,
// not percentage strings, and a single shared dot style rather than per-star opacity).
const responseStars = [
  [55, 69], [53, 70], [50, 72], [46, 72.2], [41, 71.8],
  [35, 73], [45, 75], [48, 74.4], [53, 74], [30, 76.5],
  [23, 79], [30, 86], [27, 88], [76, 85], [78, 85.3],
  [80, 84.8], [76, 90], [80, 90.2],
] as const;

export default function App() {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  const [menuOpen, setMenuOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('entry');
  const morph = useSharedValue(0);

  if (!fontsLoaded) return <View style={styles.screen} />;

  // Morph target geometry: the entry pill (148x45, centered ~49.3% down) traveling and
  // shrinking into the orb's resting spot (61x61 circle, bottom:34, centered). Only
  // transform (translateY/scaleX/scaleY) is animated here — never width/height/borderRadius
  // directly — animating layout props on this screen's absolutely-positioned descendants is
  // what caused a crash on an earlier Bridge screen; transform is paint-only and safe.
  const entryCenterY = height * 0.493;
  const orbCenterY = height - 34 - 30.5;
  const morphTranslateY = orbCenterY - entryCenterY;
  const scaleXTarget = 61 / 148;
  const scaleYTarget = 61 / 45;

  const startMorph = () => {
    setPhase('morphing');
    morph.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    setTimeout(() => setPhase('response'), 680);
  };

  const morphProxyStyle = useAnimatedStyle(() => {
    const scaleX = interpolate(morph.value, [0, 1], [1, scaleXTarget], Extrapolation.CLAMP);
    const scaleY = interpolate(morph.value, [0, 1], [1, scaleYTarget], Extrapolation.CLAMP);
    const translateY = interpolate(morph.value, [0, 1], [0, morphTranslateY], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scaleX }, { scaleY }] } as any;
  });
  const morphTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
  }));
  const orbRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const entryFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));
  const responseFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <TouchableWithoutFeedback onPress={() => setMenuOpen(false)} accessible={false}>
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {phase !== 'response' && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, entryFadeStyle]}
          >
            <LinearGradient
              colors={['#28168e', '#21137e', '#1b126e', '#160e55']}
              locations={[0, 0.29, 0.58, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.65, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {entryStars.map((star, index) => (
              <View
                key={index}
                style={[
                  styles.star,
                  { left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity },
                ]}
              />
            ))}
            <View pointerEvents="none" style={styles.horizon}>
              <Svg width="100%" height="100%" viewBox="0 0 393 265" preserveAspectRatio="none">
                <Defs>
                  <SvgGradient id="horizon-fill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#2d2085" stopOpacity={0.2} />
                    <Stop offset="1" stopColor="#100c48" stopOpacity={0.05} />
                  </SvgGradient>
                </Defs>
                <Path
                  d="M-30 64 Q196 -26 423 64 L423 265 L-30 265Z"
                  fill="url(#horizon-fill)"
                  stroke="#43309b"
                  strokeOpacity={0.08}
                  strokeWidth={2}
                />
                <Path
                  d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225"
                  fill="none"
                  stroke="#8e71ff"
                  strokeOpacity={0.12}
                  strokeWidth={18}
                />
                <Path
                  d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225 L419 265 L-25 265Z"
                  fill="#110c49"
                  fillOpacity={0.6}
                />
                <Path
                  d="M-25 224 Q26 183 89 183 L304 183 Q369 184 419 225"
                  fill="none"
                  stroke="#8d74dd"
                  strokeOpacity={0.5}
                  strokeWidth={3}
                />
                <Path
                  d="M-25 232 Q26 191 89 191 L304 191 Q369 192 419 233"
                  fill="none"
                  stroke="#493095"
                  strokeOpacity={0.35}
                  strokeWidth={5}
                />
              </Svg>
            </View>
          </Animated.View>
        )}

        {phase !== 'entry' && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, responseFadeStyle]}>
            <LinearGradient
              colors={['#9b00ef', '#6610df', '#2218a5', '#070924', '#050717']}
              locations={[0, 0.19, 0.36, 0.59, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {responseStars.map(([x, y], index) => (
              <View
                key={index}
                style={[styles.responseStar, { left: (width * x) / 100, top: (height * y) / 100 }]}
              />
            ))}
            <View
              style={[
                styles.responseHorizon,
                {
                  width: width * 1.5,
                  height: height * 0.65,
                  borderRadius: width,
                  left: -width * 0.25,
                  top: height * 0.63,
                },
              ]}
            />
          </Animated.View>
        )}

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerPill}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More options"
                accessibilityState={{ expanded: menuOpen }}
                onPress={() => setMenuOpen(!menuOpen)}
                hitSlop={8}
                style={styles.headerDotsButton}
              >
                <Ionicons name="grid" size={20} color="#d2acff" />
              </Pressable>
              <View accessible accessibilityLabel="Your profile" style={styles.headerAvatarButton}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces' }}
                  style={styles.headerAvatarImage as any}
                />
              </View>
            </View>
            {phase !== 'entry' && (
              <Animated.Text style={[styles.headline, responseFadeStyle]}>
                {'Tell me more about\nmy peer comparison'}
              </Animated.Text>
            )}
          </View>

          {menuOpen && (
            <View style={styles.menu}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuOpen(false)}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>Back to friends</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>

        {phase !== 'response' && (
          <Animated.View style={[styles.morphProxy, morphProxyStyle]}>
            <Svg pointerEvents="none" style={styles.morphGlow} width="100%" height="100%">
              <Defs>
                <RadialGradient id="entryGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#7960ff" stopOpacity={0.6} />
                  <Stop offset="60%" stopColor="#7960ff" stopOpacity={0.25} />
                  <Stop offset="100%" stopColor="#7960ff" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx={999} fill="url(#entryGlow)" />
            </Svg>
            <Pressable
              accessibilityRole="button"
              onPress={startMorph}
              disabled={phase !== 'entry'}
              style={styles.morphProxyShadow}
            >
              <BlurView intensity={15} tint="dark" style={styles.morphProxyInner}>
                <Animated.Text style={[styles.typeText, morphTextStyle]}>What's your type?</Animated.Text>
              </BlurView>
            </Pressable>
          </Animated.View>
        )}

        {phase !== 'entry' && (
          <Animated.View
            pointerEvents={phase === 'response' ? 'auto' : 'none'}
            style={[styles.invitation, { top: height * 0.81 - 25.5 }, responseFadeStyle]}
          >
            <Pressable
              disabled
              accessibilityRole="button"
              accessibilityState={{ disabled: true, busy: true }}
              style={styles.generatingButton}
            >
              <Text accessibilityLiveRegion="polite" style={styles.generatingText}>
                Generating responses
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {phase !== 'entry' && (
          <Animated.View
            pointerEvents="none"
            accessible
            accessibilityLabel="Generating response"
            style={[styles.orb, orbRevealStyle]}
          >
            <LinearGradient
              colors={['#17216e', '#6237c3', '#bd43d4']}
              start={{ x: 0.8, y: 0 }}
              end={{ x: 0.2, y: 1 }}
              style={styles.orbGradient}
            >
              <Ionicons name="flash" size={30} color="#e7e2ff" />
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050719', overflow: 'hidden' },
  safeArea: { zIndex: 20 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'flex-start',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 47,
    width: 103,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(191,128,255,0.5)',
    paddingHorizontal: 8,
  },
  headerDotsButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerAvatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(211,162,255,0.7)',
    backgroundColor: '#a06ad8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: { width: '100%', height: '100%' },
  headline: {
    marginTop: 20,
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    lineHeight: 25,
    color: '#ded1ff',
  },
  menu: {
    alignSelf: 'flex-end',
    marginRight: 12,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#251776',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  menuText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#ede9fe' },
  star: { position: 'absolute', borderRadius: 4, backgroundColor: '#ad9bff' },
  responseStar: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(224,242,254,0.45)',
  },
  horizon: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '31%' },
  responseHorizon: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(84,154,255,0.25)',
    backgroundColor: 'rgba(11,22,73,0.18)',
    shadowColor: '#387eff',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  // Shrinks/travels via transform only (see startMorph's comment) from the entry pill's
  // geometry down into the orb's resting spot — never a real circle mid-transition since
  // borderRadius stays a flat 9999 throughout, same tradeoff the original pill-to-bar morph
  // on the other Bridge screen accepted.
  morphProxy: {
    position: 'absolute',
    top: '49.3%',
    left: '50%',
    width: 148,
    height: 45,
    transform: [{ translateX: -74 }, { translateY: -22.5 }],
    zIndex: 10,
  },
  morphGlow: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    left: -20,
    right: -20,
  },
  morphProxyShadow: {
    flex: 1,
    borderRadius: 9999,
    shadowColor: '#7f60ff',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  morphProxyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(163,145,255,0.3)',
    backgroundColor: 'rgba(104,81,204,0.35)',
  },
  typeText: { fontSize: 12, fontWeight: '500', color: '#c1b1ff' },
  invitation: { position: 'absolute', alignSelf: 'center', zIndex: 1 },
  generatingButton: {
    width: 200,
    height: 51,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(37,44,64,0.9)',
  },
  generatingText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: '#d4d9e3' },
  orb: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    width: 61,
    height: 61,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: 'rgba(122,116,217,0.6)',
    overflow: 'hidden',
  },
  orbGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
