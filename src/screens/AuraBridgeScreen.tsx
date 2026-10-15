// Dependencies: expo-linear-gradient, react-native-svg, @expo/vector-icons, expo-blur,
// @expo-google-fonts/inter, react-native-reanimated
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
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

type Phase = 'entry' | 'morphing' | 'response' | 'results';

// Sizes/opacities boosted from the original Aura values (2-4px, 0.1-0.45) per Justice's
// request to make the shimmers clearly visible — positions unchanged.
const entryStars = [
  { left: '23%', top: '33.5%', size: 5, opacity: 0.7 },
  { left: '57%', top: '34.8%', size: 6, opacity: 0.8 },
  { left: '59%', top: '34%', size: 4, opacity: 0.5 },
  { left: '27.5%', top: '41.9%', size: 5, opacity: 0.85 },
  { left: '25.5%', top: '42.7%', size: 4, opacity: 0.6 },
  { left: '43%', top: '42.7%', size: 4, opacity: 0.45 },
  { left: '46%', top: '42.1%', size: 4, opacity: 0.45 },
  { left: '61%', top: '43%', size: 5, opacity: 0.55 },
  { left: '63%', top: '42.2%', size: 4, opacity: 0.5 },
  { left: '65%', top: '41.5%', size: 4, opacity: 0.4 },
] as const;

// Response-phase star field — ported from Aura's own RN conversion (pixel-position pairs,
// not percentage strings, and a single shared dot style rather than per-star opacity).
const responseStars = [
  [55, 69], [53, 70], [50, 72], [46, 72.2], [41, 71.8],
  [35, 73], [45, 75], [48, 74.4], [53, 74], [30, 76.5],
  [23, 79], [30, 86], [27, 88], [76, 85], [78, 85.3],
  [80, 84.8], [76, 90], [80, 90.2],
] as const;

// Twinkles (opacity+scale pulse) AND drifts (small position float) at once, per Justice's
// request — purely additive motion, no change to each dot's base left/top/size/color.
function Shimmer({
  left,
  top,
  size,
  baseOpacity,
  delay,
  dotStyle,
}: {
  left: number | string;
  top: number | string;
  size: number;
  baseOpacity: number;
  delay: number;
  dotStyle: any;
}) {
  const twinkle = useRef(new RNAnimated.Value(baseOpacity * 0.3)).current;
  const drift = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const twinkleAnim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.timing(twinkle, { toValue: baseOpacity, duration: 1500, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: true }),
        RNAnimated.timing(twinkle, { toValue: baseOpacity * 0.25, duration: 2100, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: true }),
      ]),
    );
    const driftAnim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(drift, { toValue: 1, duration: 4200 + delay, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        RNAnimated.timing(drift, { toValue: 0, duration: 4200 + delay, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ]),
    );
    twinkleAnim.start();
    driftAnim.start();
    return () => { twinkleAnim.stop(); driftAnim.stop(); };
  }, [delay, baseOpacity, twinkle, drift]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const scale = twinkle.interpolate({ inputRange: [baseOpacity * 0.25, baseOpacity], outputRange: [0.7, 1.2] });

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[
        dotStyle,
        {
          left,
          top,
          width: size,
          height: size,
          opacity: twinkle,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

// Literal conversion of Aura's @keyframes dome-pulse: a ring expanding from the orb's
// position (scale 1→14) while fading in then out (opacity 0→.4→.8→.65→0), sped up from
// Aura's original 9s to 5.5s per Justice's request, linear loop,
// two instances offset by half a cycle. Only opacity/transform are animated (both
// native-driver-supported) — unlike the strokeOpacity approach tried earlier, which never
// visibly animated.
function DomePulseRing({ startDelay }: { startDelay: number }) {
  const progress = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    let loopAnim: RNAnimated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loopAnim = RNAnimated.loop(
        RNAnimated.timing(progress, { toValue: 1, duration: 5500, easing: RNEasing.linear, useNativeDriver: true }),
      );
      loopAnim.start();
    }, startDelay);
    return () => { clearTimeout(timer); loopAnim?.stop(); };
  }, [startDelay, progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.45, 0.75, 1],
    outputRange: [0, 0.4, 0.8, 0.65, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.08, 0.45, 0.75, 1],
    outputRange: [1, 1.3, 5.5, 10, 14],
  });

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[
        styles.domePulseRing,
        { opacity, transform: [{ translateX: -32 }, { scale }] },
      ]}
    />
  );
}

// ─── Results cards — ported verbatim from BridgeRedesignTestScreenV2.tsx (same mock data,
// same components/styles) per Justice's request that the results screen match exactly. ────
function CountUpNumber({ to, suffix = '%', style }: { to: number; suffix?: string; style?: any }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const DURATION = 900;
    const start = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * to));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);

  return (
    <Text style={style}>
      {display}
      <Text style={[style, styles.statSuffix]}>{suffix}</Text>
    </Text>
  );
}

const BELL_CURVE = [2,3,4,6,9,13,19,27,37,48,58,67,73,75,74,70,63,54,44,34,25,17,11,7,4,3,2];

interface StatTab {
  key: string;
  tabLabel: string;
  value: number;
  suffix: string;
  caption: string;
}

function StatToggleCard({
  tabs,
  maturityLeft,
  maturityRight,
}: {
  tabs: [StatTab, StatTab];
  maturityLeft: { title: string; sub: string };
  maturityRight: { title: string; sub: string };
}) {
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const active = tabs.find(t => t.key === activeKey) ?? tabs[0];

  return (
    <View style={styles.insightCardWrap}>
      <View style={styles.tabPill}>
        {tabs.map(tab => (
          activeKey === tab.key ? (
            <LinearGradient
              key={tab.key}
              colors={['#35C9FC', '#1B6FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabOptionActive}
            >
              <TouchableOpacity style={styles.tabOptionActiveTouch} onPress={() => setActiveKey(tab.key)}>
                <Text style={styles.tabOptionTextActive}>{tab.tabLabel}</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <TouchableOpacity key={tab.key} style={styles.tabOption} onPress={() => setActiveKey(tab.key)}>
              <Text style={styles.tabOptionText}>{tab.tabLabel}</Text>
            </TouchableOpacity>
          )
        ))}
      </View>

      <View style={styles.moreOptionsPill}>
        <View style={styles.moreOptionsDot} />
        <View style={styles.moreOptionsDot} />
        <View style={styles.moreOptionsDot} />
      </View>

      <LinearGradient
        colors={['#333563', '#202A4D', '#2D3565']}
        locations={[0, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <TouchableOpacity style={styles.statCardExpand} activeOpacity={0.7}>
          <Ionicons name="arrow-up-outline" size={16} color="#F4F2FF" style={{ transform: [{ rotate: '45deg' }] }} />
        </TouchableOpacity>
        <CountUpNumber to={active.value} suffix={active.suffix} style={styles.statNumber} />
        <Text style={styles.statLabel}>{active.caption}</Text>
        <View style={styles.bellCurveRow}>
          {BELL_CURVE.map((h, i) => (
            <View
              key={i}
              style={[styles.bellCurveBar, { height: Math.max(2, h * 0.9), opacity: 0.3 + (h / 75) * 0.7 }]}
            />
          ))}
        </View>
      </LinearGradient>

      <View style={styles.maturityRow}>
        <View style={styles.maturityPill}>
          <MaturityRing />
          <View>
            <Text style={styles.maturityTitle}>{maturityLeft.title}</Text>
            <Text style={styles.maturitySub}>{maturityLeft.sub}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward-outline" size={14} color="#74788F" />
        <View style={styles.maturityPill}>
          <MaturityRing />
          <View>
            <Text style={styles.maturityTitle}>{maturityRight.title}</Text>
            <Text style={styles.maturitySub}>{maturityRight.sub}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function MaturityRing() {
  return (
    <View style={styles.maturityRingOuter}>
      <View style={styles.maturityRingInner} />
    </View>
  );
}

function GuidanceCard() {
  return (
    <View style={styles.guidanceCardWrap}>
      <GuidanceSection
        icon="people"
        iconColor="#FF6FB8"
        title="Collaboration"
        text="Once there's more activity here, this gets specific to who you actually overlap with. Right now, the highest-leverage move is reaching out to one or two artists in a similar genre."
      />
      <View style={styles.guidanceDivider} />
      <GuidanceSection
        icon="time"
        iconColor="#F5B84D"
        title="Release timing"
        text="There's no personalised timing data yet — that becomes real once there's enough release history to see a pattern. Generally, releasing consistently on the same day each cycle tends to work better than chasing a single best time."
      />
    </View>
  );
}

function GuidanceSection({ icon, iconColor, title, text }: { icon: any; iconColor: string; title: string; text: string }) {
  return (
    <View style={styles.guidanceSection}>
      <View style={styles.guidanceHeaderRow}>
        <View style={[styles.guidanceIconWrap, { backgroundColor: `${iconColor}22` }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.guidanceTitle}>{title}</Text>
        <View style={styles.guidanceBadge}>
          <Text style={styles.guidanceBadgeText}>General guidance</Text>
        </View>
      </View>
      <Text style={styles.guidanceText}>{text}</Text>
    </View>
  );
}

function AiBubble({ text }: { text: string }) {
  return (
    <View style={styles.aiBubbleRow}>
      <BlurView intensity={30} tint="dark" style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>{text}</Text>
        <View style={styles.reactionRow}>
          <View style={styles.reactionPill}><Ionicons name="heart" size={11} color="#fff" /></View>
          <View style={styles.reactionPill}><Ionicons name="sparkles" size={11} color="#fff" /></View>
        </View>
      </BlurView>
    </View>
  );
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium });
  const [menuOpen, setMenuOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('entry');
  const morph = useSharedValue(0);

  // Cycles 1→2→3→1... for the "Generating responses" ellipsis.
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDotCount(d => (d % 3) + 1), 450);
    return () => clearInterval(id);
  }, []);

  // Entry screen's dome pulsing in place — opacity + a uniform scale (keeps the curve's own
  // proportions intact, never distorting it into anything else), unlike the response screen's
  // circles. Only opacity/transform are animated (native-driver-supported), same reliable
  // technique as DomePulseRing, since the earlier strokeOpacity attempt never actually rendered.
  const entryDomePulse = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const pulseAnim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(entryDomePulse, { toValue: 1, duration: 1800, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: true }),
        RNAnimated.timing(entryDomePulse, { toValue: 0, duration: 1800, easing: RNEasing.inOut(RNEasing.ease), useNativeDriver: true }),
      ]),
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [entryDomePulse]);
  const entryDomeOpacity = entryDomePulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const entryDomeScale = entryDomePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

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
    // "Generating" dwell time before the results cards appear — same mock-delay idea as the
    // other Bridge screen's startMorph, just a bit longer since there's a visible loading
    // state (ellipsis + pulsing orb) to actually show here.
    setTimeout(() => setPhase('results'), 3400);
  };

  // transform arrays in a style array fully REPLACE each other (not merged key-by-key) —
  // this style's own transform must carry the constant centering offsets (-74/-22.5) itself,
  // since listing them separately on styles.morphProxy got silently dropped the moment this
  // animated style's transform array won out, shifting the button 74pt (half its width) off
  // center and making the morph land beside the orb instead of on it.
  const morphProxyStyle = useAnimatedStyle(() => {
    const scaleX = interpolate(morph.value, [0, 1], [1, scaleXTarget], Extrapolation.CLAMP);
    const scaleY = interpolate(morph.value, [0, 1], [1, scaleYTarget], Extrapolation.CLAMP);
    const translateY = interpolate(morph.value, [0, 1], [0, morphTranslateY], Extrapolation.CLAMP);
    const opacity = interpolate(morph.value, [0.75, 1], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: -74 }, { translateY: -22.5 + translateY }, { scaleX }, { scaleY }],
      opacity,
    } as any;
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

  // Moved below all hook calls — an early return before useAnimatedStyle calls meant this
  // component called a different number of hooks on the font-not-loaded-yet render vs every
  // render after, which is exactly what crashed the app ("Rendered more hooks than during
  // the previous render"). All hooks must run unconditionally on every render.
  if (!fontsLoaded) return <View style={styles.screen} />;

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
              <Shimmer
                key={index}
                left={star.left}
                top={star.top}
                size={star.size}
                baseOpacity={star.opacity}
                delay={(index % 8) * 280}
                dotStyle={styles.star}
              />
            ))}
            <RNAnimated.View
              pointerEvents="none"
              style={[styles.horizon, { opacity: entryDomeOpacity, transform: [{ scale: entryDomeScale }] }]}
            >
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
            </RNAnimated.View>
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
              <Shimmer
                key={index}
                left={(width * x) / 100}
                top={(height * y) / 100}
                size={5}
                baseOpacity={0.8}
                delay={(index % 8) * 280}
                dotStyle={styles.responseStar}
              />
            ))}
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

          {phase === 'results' && (
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <AiBubble text="Here's what stands out across your plays, earnings, and audience, plus a couple of things to focus on next." />
              <StatToggleCard
                tabs={[
                  { key: 'performance', tabLabel: 'Performance', value: 248, suffix: '', caption: 'Total plays across your tracks (all-time)' },
                  { key: 'earnings', tabLabel: 'Earnings', value: 18, suffix: '%', caption: 'Earnings growth vs last month' },
                ]}
                maturityLeft={{ title: 'Last month', sub: '£42 earned' }}
                maturityRight={{ title: 'This month', sub: '£50 earned' }}
              />
              <StatToggleCard
                tabs={[
                  { key: 'audience', tabLabel: 'Audience', value: 6, suffix: '', caption: 'Paying fans in your top city (Manchester)' },
                  { key: 'followers', tabLabel: 'Followers', value: 12, suffix: '%', caption: 'Follower growth vs last month' },
                ]}
                maturityLeft={{ title: 'Last month', sub: '34 followers' }}
                maturityRight={{ title: 'This month', sub: '38 followers' }}
              />
              <GuidanceCard />
            </ScrollView>
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

        {phase === 'response' && (
          <Animated.View
            pointerEvents="auto"
            style={[styles.invitation, { top: height * 0.81 - 25.5 }, responseFadeStyle]}
          >
            <Pressable
              disabled
              accessibilityRole="button"
              accessibilityState={{ disabled: true, busy: true }}
              style={styles.generatingButton}
            >
              <Text accessibilityLiveRegion="polite" style={styles.generatingText}>
                {`Generating responses${'.'.repeat(dotCount)}`}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === 'response' && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, orbRevealStyle]}>
            <DomePulseRing startDelay={0} />
            <DomePulseRing startDelay={2750} />
          </Animated.View>
        )}

        {phase === 'response' && (
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
    borderRadius: 10,
    // Near-opaque — Shimmer's own `opacity` prop (up to baseOpacity) already handles the
    // twinkle fade, so a low alpha baked in here on top of that was making the dots much
    // dimmer than intended (the two multiply).
    backgroundColor: 'rgba(224,242,254,0.95)',
  },
  horizon: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '31%' },
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
    // No transform here — morphProxyStyle (the animated style) always wins when both are in
    // the same style array, so the centering offsets live there instead; see its comment.
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
  // Base box for DomePulseRing — no transform here (see its own comment re: the earlier
  // transform-merge bug); left:'50%' + the animated translateX:-32 together center it.
  domePulseRing: {
    position: 'absolute',
    bottom: 22,
    left: '50%',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.5)',
  },

  // ─── Results cards — styles ported verbatim from BridgeRedesignTestScreenV2.tsx. ──────
  resultsScroll: { flex: 1 },
  resultsScrollContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40, gap: 14 },
  aiBubbleRow: { alignItems: 'flex-start' },
  aiBubble: { maxWidth: '85%', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  aiBubbleText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  reactionRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  reactionPill: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },

  insightCardWrap: { gap: 10 },
  tabPill: { flexDirection: 'row', backgroundColor: 'rgba(83,77,206,0.27)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(103,91,221,0.31)', padding: 6, gap: 6 },
  tabOption: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  tabOptionActive: { flex: 1, borderRadius: 999, overflow: 'hidden' },
  tabOptionActiveTouch: { paddingVertical: 12, alignItems: 'center' },
  tabOptionText: { color: '#BFC3F6', fontSize: 13, fontWeight: '500' },
  tabOptionTextActive: { color: '#F4F2FF', fontSize: 13, fontWeight: '600' },

  moreOptionsPill: {
    alignSelf: 'center',
    width: 50, height: 28, borderRadius: 999,
    backgroundColor: '#000000',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  moreOptionsDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D5D5E7' },

  statCard: { borderRadius: 30, padding: 20, paddingTop: 24, overflow: 'hidden' },
  statCardExpand: { position: 'absolute', top: 20, right: 20, width: 49, height: 49, borderRadius: 20, backgroundColor: 'rgba(83,98,142,0.44)', alignItems: 'center', justifyContent: 'center' },
  statNumber: { color: '#E5E4F9', fontSize: 71, fontWeight: '200' },
  statSuffix: { color: '#68709F', fontSize: 59, fontWeight: '200' },
  statLabel: { color: '#9BA4C6', fontSize: 13, marginTop: 4 },
  bellCurveRow: { flexDirection: 'row', alignItems: 'flex-end', height: 80, marginTop: 16, gap: 3 },
  bellCurveBar: { flex: 1, backgroundColor: '#36B8FF', borderRadius: 2, minHeight: 2 },

  maturityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15161C', borderRadius: 999, borderWidth: 1, borderColor: '#2C2E3A', padding: 10, justifyContent: 'space-between' },
  maturityPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#303139', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12, flex: 1 },
  maturityRingOuter: { width: 19, height: 19, borderRadius: 9.5, borderWidth: 2, borderColor: 'rgba(140,136,76,0.44)', alignItems: 'center', justifyContent: 'center' },
  maturityRingInner: { width: 13, height: 13, borderRadius: 6.5, borderWidth: 2.5, borderColor: '#D2CB62' },
  maturityTitle: { color: '#F4F2FF', fontSize: 12, fontWeight: '600' },
  maturitySub: { color: '#A2A3B3', fontSize: 10 },

  guidanceCardWrap: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 18, gap: 16 },
  guidanceSection: { gap: 8 },
  guidanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  guidanceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guidanceIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  guidanceTitle: { color: '#F4F2FF', fontSize: 14, fontWeight: '600', flex: 1 },
  guidanceBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  guidanceBadgeText: { color: 'rgba(244,242,255,0.55)', fontSize: 10, fontWeight: '600' },
  guidanceText: { color: 'rgba(244,242,255,0.75)', fontSize: 13, lineHeight: 19 },
});
