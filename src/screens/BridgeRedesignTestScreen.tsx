// TEMPORARY — private preview of the Bridge redesign, for Justice only. Reached via the
// "Bridge Redesign Preview" row in ProfileScreen's Overview tab, not linked anywhere a
// real user would find it. Visual/interaction prototype only — results below are mock
// data (matching the PromotionReachDemoScreen/WhosComingDemoScreen convention), not wired
// to the real analysis pipeline (fetchCreatorContext/Gemini) yet.
//
// Entry screen (background, rising arcs, shimmer field, the glowing pill) is a direct,
// verbatim port of src/bridge/src/App.tsx — a Figma Make export already written in real
// React Native (Animated/StyleSheet/View, not web CSS), confirmed via SHA-256 against
// what Figma Make reports for its repo. Not reinterpreted — only two things differ:
// - The phone-bezel mockup chrome (device border, side buttons, fake status bar, dynamic
//   island, home indicator, "Friends" app-header row) is that export's browser-demo
//   wrapper for showing a phone inside a webpage — this screen already runs on a real
//   phone with its own real status bar/home indicator and its own header, so only the
//   `.screen` contents (background, MovingBackground, the prompt button) are ported.
// - Button label is "Analyse" (not the source's "What's your type?"), the one deliberate
//   content change, which is all this screen needs beyond the direct port.
//
// Result card (stat number, bell-curve chart, segmented toggle, floating ••• pill,
// maturity pill row), weather card, and chat bubbles remain ported from
// BRIDGE_DESIGN_SOURCES.MD's Figma/Aura sources as before — this round only replaces the
// entry screen's background/button, which is what was reported broken.
// Remove this file, its App.tsx route, and the ProfileScreen row once the real redesign
// replaces AICareerAdvisorScreen's current idle/results flow.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated as RNAnimated,
  Dimensions,
  ScrollView,
  Easing,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing as REasing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { G, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const ALLOWED_EMAIL = 'asibechetachukwu@gmail.com';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Entry pill → input bar morph geometry ─────────────────────────────────
// The same pill element animates between these two states rather than crossfading two
// different components. Layout size is FIXED (entry-state size) — the resize is done
// purely via transform: scale, not animated width/height, so this never forces a Yoga
// relayout pass on the UI thread (animating width/height on a container with absolutely
// positioned descendants is what caused the original crash on this screen).
// .prompt's exact dimensions: minWidth 129, paddingHorizontal 20, paddingVertical 13,
// fontSize 9 — ported verbatim, not resized. (Height isn't an explicit prop in the
// source since the button auto-sizes to padding+content; 40 is that padding+line-height
// computed out, since this screen's morph animation needs a fixed layout height.)
const ENTRY_PILL_WIDTH = 129;
const ENTRY_PILL_HEIGHT = 40;
const BAR_WIDTH = SCREEN_W - 40;
const BAR_HEIGHT = 50;
const BAR_BOTTOM_OFFSET = 18;
const PILL_SCALE_X = BAR_WIDTH / ENTRY_PILL_WIDTH;
const PILL_SCALE_Y = BAR_HEIGHT / ENTRY_PILL_HEIGHT;

type Phase = 'entry' | 'morphing' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  kind: 'text' | 'insight-card' | 'audience-card' | 'guidance-card' | 'weather-card';
  text?: string;
}

// ─── Count-up number (cross-cutting requirement: any stat counts up on reveal) ─────
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

// ─── Ambient backdrop — direct, verbatim port of src/bridge/src/App.tsx (a confirmed
// Figma Make React Native export — SHA-256 985af68d..., commit d7c890d). Not
// reinterpreted: the shimmer position formula, the rising-arc shape/timing/colors, and
// the background gradient are copied exactly, including the pixel values calibrated for
// the source's 390x844 reference device. Only the phone-bezel mockup chrome (device
// border/buttons/status bar/dynamic island/home indicator, "Friends" app-header row) is
// excluded — Bridge already runs on a real phone with its own header and the device's own
// real status bar.
const SHIMMERS = Array.from({ length: 24 }, (_, index) => ({
  left: `${8 + ((index * 37) % 84)}%`,
  top: `${7 + ((index * 29) % 86)}%`,
  delay: (index % 8) * 330,
  size: index % 5 === 0 ? 3 : index % 3 === 0 ? 1 : 2,
}));

function Shimmer({ left, top, delay, size }: { left: string; top: string; delay: number; size: number }) {
  const glow = useRef(new RNAnimated.Value(0.12)).current;

  useEffect(() => {
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.timing(glow, { toValue: 0.55, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        RNAnimated.timing(glow, { toValue: 0.08, duration: 2100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, glow]);

  const scale = glow.interpolate({ inputRange: [0.08, 0.55], outputRange: [0.65, 1.2] });

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[
        styles.shimmer,
        { left: left as any, top: top as any, width: size, height: size, opacity: glow, transform: [{ scale }] },
      ]}
    />
  );
}

function RisingArc({ index }: { index: number }) {
  const progress = useRef(new RNAnimated.Value(index === 0 ? 0.4 : 0)).current;
  const phaseDelay = index * 2600;

  useEffect(() => {
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(phaseDelay),
        RNAnimated.timing(progress, { toValue: 1, duration: 7000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        RNAnimated.delay((2 - index) * 2600),
        RNAnimated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [phaseDelay, progress]);

  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.32, 0.7, 1], outputRange: [0, 0.12, 0.72, 0.28, 0] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [130, -250] });

  return (
    <RNAnimated.View pointerEvents="none" style={[styles.risingArcTrack, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.risingGlow} />
      <View style={styles.risingArc} />
    </RNAnimated.View>
  );
}

function MovingBackground() {
  return (
    <>
      <View style={styles.arcStage} pointerEvents="none">
        {[0, 1, 2].map(index => <RisingArc index={index} key={index} />)}
      </View>
      <View style={styles.shimmerField} pointerEvents="none">
        {SHIMMERS.map((shimmer, index) => <Shimmer key={index} {...shimmer} />)}
      </View>
    </>
  );
}

function AmbientBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#241797', '#1a1383', '#17116f', '#100a4d']}
        locations={[0, 0.34, 0.70, 1]}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <MovingBackground />
    </View>
  );
}

// ─── Figma-sourced result card: big stat + bell-curve bars + segmented toggle ──────
// Reused for both toggle cards below. Stat types are chosen to match what's actually
// achievable per BridgeRedesignTestScreen's data audit: performance/plays only ever has
// an all-time total (no monthly play history exists anywhere), while earnings and
// follower counts now have a real month-over-month change via
// CreatorRevenueService.getMonthlyGrowth (wired into the live AICareerAdvisorScreen's
// Gemini context) — so only those two tabs use "vs last month" framing.
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

// ─── Non-numeric guidance card — Collaboration and Timing have no dedicated real
// metric anywhere in the data model today (confirmed against the live screen's own
// Gemini prompt, which hard-codes Timing to general guidance and has no collaboration
// field at all) — so unlike the two stat cards above, this never shows a fabricated
// percentage. Same "general guidance, not personalised yet" honesty badge the live
// screen already uses for exactly this case. ──────────────────────────────────────
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

// ─── Aura-sourced weather card (Source 2, Attempt 3's second phone) ────────────────
function WeatherCard() {
  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherHeaderRow}>
        <Text style={styles.weatherTemp}>22°</Text>
        <View>
          <Text style={styles.weatherCondition}>Rain Showers</Text>
          <Text style={styles.weatherPlace}>Your next show's city</Text>
        </View>
      </View>
      <RainLines />
      <View style={styles.weatherBubble}>
        <Text style={styles.weatherBubbleText}>It will rain in 1 hour, I recommend taking an umbrella.</Text>
      </View>
    </View>
  );
}

// Exact path data from the source's rain SVG, two stroke passes standing in for its
// feGaussianBlur glow layer (a true gaussian filter isn't reliably portable to RN SVG).
function RainLines() {
  return (
    <Svg width="100%" height={56} viewBox="0 0 140 60">
      <G stroke="#cdcaff" strokeWidth={3} strokeLinecap="round" opacity={0.35}>
        <Path d="M24 10l-3 5M43 5l-3 5M63 9l-3 5M82 4l-3 5M104 8l-3 5M122 12l-3 5M17 24l-3 5M36 20l-3 5M56 26l-3 5M76 19l-3 5M97 25l-3 5M115 21l-3 5M30 37l-3 5M49 34l-3 5M70 39l-3 5M89 34l-3 5M108 39l-3 5M12 48l-3 5M40 49l-3 5M61 51l-3 5M82 48l-3 5M101 53l-3 5" />
      </G>
      <G stroke="#e1deff" strokeWidth={1} strokeLinecap="round" opacity={0.8}>
        <Path d="M24 10l-2 3M63 9l-2 3M104 8l-2 3M36 20l-2 3M76 19l-2 3M115 21l-2 3M49 34l-2 3M89 34l-2 3M12 48l-2 3M61 51l-2 3M101 53l-2 3" />
      </G>
    </Svg>
  );
}

// ─── Chat bubble, Source 2's boxed treatment ───────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{text}</Text>
      </View>
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

export default function BridgeRedesignTestScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('entry');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const morph = useSharedValue(0); // 0 = entry pill, 1 = bottom input bar

  // Lifts the input bar + scroll content above the keyboard. Plain React state driving an
  // ordinary (non-worklet) transform — cheap, infrequent, and doesn't touch the reanimated
  // morph worklet at all, so it can't reintroduce the layout-relayout crash that removing
  // KeyboardAvoidingView was fixing in the first place.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => setKeyboardHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Real gate, not just an unlisted route — blocks direct navigation too, not only the
  // hidden ProfileScreen row.
  useEffect(() => {
    if (user?.email?.toLowerCase() !== ALLOWED_EMAIL) {
      navigation.goBack();
    }
  }, [user, navigation]);
  if (user?.email?.toLowerCase() !== ALLOWED_EMAIL) return null;

  // SafeAreaView (edges: top+bottom) already excludes the device insets from its own
  // content box, so positioning inside it is computed against that reduced height, not
  // the raw window height — using the raw height here would overshoot past the safe area.
  const contentH = SCREEN_H - insets.top - insets.bottom;
  // promptWrap in the source is inset:0 + alignItems/justifyContent:'center' — the button
  // sits at the true center of the screen, not a fixed ratio down from the top.
  const entryPillTop = Math.round(contentH / 2) - ENTRY_PILL_HEIGHT / 2;
  const targetCenterY = contentH - BAR_BOTTOM_OFFSET - BAR_HEIGHT / 2;
  const originalCenterY = entryPillTop + ENTRY_PILL_HEIGHT / 2;
  const morphTranslateYTarget = targetCenterY - originalCenterY;

  const startMorph = () => {
    setPhase('morphing');
    morph.value = withTiming(1, { duration: 620, easing: REasing.out(REasing.cubic) });
    setTimeout(() => {
      setPhase('chat');
      setMessages([
        { id: 'intro', role: 'ai', kind: 'text', text: "Here's what stands out across your plays, earnings, and audience, plus a couple of things to focus on next." },
        { id: 'card-1', role: 'ai', kind: 'insight-card' },
        { id: 'card-2', role: 'ai', kind: 'audience-card' },
        { id: 'card-3', role: 'ai', kind: 'guidance-card' },
      ]);
    }, 650);
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const isWeather = /weather|rain|show|gig/i.test(text);
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', kind: 'text', text },
      {
        id: `a-${Date.now()}`,
        role: 'ai',
        kind: isWeather ? 'weather-card' : 'text',
        text: isWeather ? undefined : "Good question — here's what I'm seeing based on your real activity.",
      },
    ]);
  };

  const pillStyle = useAnimatedStyle(() => {
    const scaleX = interpolate(morph.value, [0, 1], [1, PILL_SCALE_X], Extrapolation.CLAMP);
    const scaleY = interpolate(morph.value, [0, 1], [1, PILL_SCALE_Y], Extrapolation.CLAMP);
    const translateY = interpolate(morph.value, [0, 1], [0, morphTranslateYTarget], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(morph.value, [0, 0.35], [0.95, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }, { scaleX }, { scaleY }],
      shadowOpacity,
    } as any;
  });

  const entryContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));
  const barContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#4820D7', '#2B22BE', '#192278', '#030611', '#000000']}
        locations={[0, 0.25, 0.49, 0.78, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {phase !== 'chat' && (
          <Animated.View style={[StyleSheet.absoluteFill, entryContentStyle]} pointerEvents="none">
            <AmbientBackdrop />
          </Animated.View>
        )}

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={20} color="#F4F2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bridge</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Preview</Text>
          </View>
        </View>

        {phase === 'chat' && (
          <ScrollView
            style={styles.chatScroll}
            contentContainerStyle={[styles.chatScrollContent, { paddingBottom: BAR_HEIGHT + BAR_BOTTOM_OFFSET + 24 + keyboardHeight }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map(m => {
              if (m.kind === 'insight-card') return (
                <StatToggleCard
                  key={m.id}
                  tabs={[
                    { key: 'performance', tabLabel: 'Performance', value: 248, suffix: '', caption: 'Total plays across your tracks (all-time)' },
                    { key: 'earnings', tabLabel: 'Earnings', value: 18, suffix: '%', caption: 'Earnings growth vs last month' },
                  ]}
                  maturityLeft={{ title: 'Last month', sub: '£42 earned' }}
                  maturityRight={{ title: 'This month', sub: '£50 earned' }}
                />
              );
              if (m.kind === 'audience-card') return (
                <StatToggleCard
                  key={m.id}
                  tabs={[
                    { key: 'audience', tabLabel: 'Audience', value: 6, suffix: '', caption: 'Paying fans in your top city (Manchester)' },
                    { key: 'followers', tabLabel: 'Followers', value: 12, suffix: '%', caption: 'Follower growth vs last month' },
                  ]}
                  maturityLeft={{ title: 'Last month', sub: '34 followers' }}
                  maturityRight={{ title: 'This month', sub: '38 followers' }}
                />
              );
              if (m.kind === 'guidance-card') return <GuidanceCard key={m.id} />;
              if (m.kind === 'weather-card') return <WeatherCard key={m.id} />;
              return m.role === 'user'
                ? <UserBubble key={m.id} text={m.text ?? ''} />
                : <AiBubble key={m.id} text={m.text ?? ''} />;
            })}
            {messages.length > 1 && (
              <View style={styles.suggestedRow}>
                <TouchableOpacity style={styles.suggestedChip} onPress={() => { setDraft('What\'s the weather for my next show?'); }}>
                  <Ionicons name="rainy-outline" size={13} color="#BFC3F6" />
                  <Text style={styles.suggestedChipText}>Weather for my next show?</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        <View style={{ transform: [{ translateY: -keyboardHeight }] }}>
          {/* Shadow and content-clipping are split across two views — overflow:'hidden'
              (needed to clip the two content layers to the pill shape) also clips a view's
              own shadow on iOS, which is why no glow was rendering at all before. */}
          <Animated.View
            style={[
              styles.morphPillShadow,
              { left: (SCREEN_W - ENTRY_PILL_WIDTH) / 2, top: entryPillTop, width: ENTRY_PILL_WIDTH, height: ENTRY_PILL_HEIGHT },
              phase !== 'entry' && styles.morphPillShadowActive,
              pillStyle,
            ]}
          >
            <View style={styles.morphPillClip}>
              <Animated.View style={[StyleSheet.absoluteFill, entryContentStyle]} pointerEvents={phase === 'entry' ? 'auto' : 'none'}>
                <Pressable
                  accessibilityRole="button"
                  onPress={startMorph}
                  disabled={phase !== 'entry'}
                  style={({ pressed }) => [
                    StyleSheet.absoluteFill,
                    styles.analyseFill,
                    phase !== 'entry' && styles.analyseFillActive,
                    pressed && styles.analyseFillPressed,
                  ]}
                >
                  <Text style={[styles.analyseFillText, phase !== 'entry' && styles.analyseFillTextActive]}>Analyse</Text>
                </Pressable>
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, barContentStyle]} pointerEvents={phase === 'chat' ? 'auto' : 'none'}>
                <View style={styles.inputFill}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Message"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    onSubmitEditing={sendDraft}
                    returnKeyType="send"
                  />
                  <TouchableOpacity onPress={sendDraft} style={styles.sendBtn} disabled={!draft.trim()}>
                    <Ionicons name="arrow-up" size={16} color={draft.trim() ? '#F4F2FF' : 'rgba(244,242,255,0.3)'} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030611' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#F4F2FF', fontSize: 17, fontWeight: '700' },
  headerBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.18)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  headerBadgeText: { color: '#CAC4F3', fontSize: 11, fontWeight: '700' },

  // Exact port of src/bridge's .arcStage/.risingArcTrack/.risingArc/.risingGlow/
  // .shimmerField/.shimmer — pixel values are the source's own, calibrated for its
  // 390x844 reference device, not rescaled.
  arcStage: {
    bottom: 0, left: 0, right: 0, height: '58%',
    position: 'absolute', overflow: 'hidden',
  },
  risingArcTrack: {
    alignSelf: 'center', bottom: -120, height: 170, width: '100%',
    position: 'absolute', overflow: 'hidden',
  },
  risingArc: {
    position: 'absolute', top: 38, left: -72, width: 520, height: 170,
    borderTopWidth: 3, borderTopLeftRadius: 260, borderTopRightRadius: 260,
    borderTopColor: 'rgba(190,174,255,0.82)',
    shadowColor: '#9b83ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12,
  },
  risingGlow: {
    position: 'absolute', top: 31, left: -72, width: 520, height: 170,
    borderTopWidth: 18, borderTopLeftRadius: 260, borderTopRightRadius: 260,
    borderTopColor: 'rgba(116,88,255,0.28)',
    shadowColor: '#8065ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 25,
  },
  shimmerField: {
    position: 'absolute', top: '34%', left: '22%', width: '58%', height: '24%',
  },
  shimmer: {
    position: 'absolute', borderRadius: 50,
    backgroundColor: 'rgba(235,230,255,0.72)',
    shadowColor: '#c8baff', shadowOpacity: 0.4, shadowRadius: 4,
  },

  // .prompt's exact border + shadow (a single native shadow is all the source uses —
  // no multi-layer glow approximation needed here).
  morphPillShadow: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#876fff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 25,
  },
  // .promptActive's shadow half — its backgroundColor half lives on analyseFillActive
  // below, since this view only carries the shadow (overflow:hidden on morphPillClip
  // would otherwise clip it, same reason the base/clip split exists at all).
  morphPillShadowActive: {
    shadowColor: '#9b86ff',
    shadowRadius: 36,
  },
  morphPillClip: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  analyseFill: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(111,94,224,0.36)',
  },
  // .promptActive / .promptPressed / .promptTextActive — ported verbatim, not dropped.
  analyseFillActive: {
    backgroundColor: 'rgba(125,108,238,0.46)',
  },
  analyseFillPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  analyseFillText: { color: 'rgba(255,255,255,0.62)', fontSize: 9 },
  analyseFillTextActive: { color: 'rgba(255,255,255,0.92)' },
  inputFill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, gap: 10,
  },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14, paddingVertical: 10 },
  sendBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  chatScroll: { flex: 1 },
  chatScrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: BAR_HEIGHT + BAR_BOTTOM_OFFSET + 24, gap: 14 },

  userBubbleRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '82%', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  userBubbleText: { color: '#66636C', fontSize: 14, lineHeight: 20 },

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

  weatherCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16 },
  weatherHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherTemp: { color: '#fff', fontSize: 40, fontWeight: '400' },
  weatherCondition: { color: '#fff', fontSize: 14, fontWeight: '600' },
  weatherPlace: { color: 'rgba(244,242,255,0.5)', fontSize: 11, marginTop: 2 },
  weatherBubble: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 17, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  weatherBubbleText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 19 },

  guidanceCardWrap: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 18, gap: 16 },
  guidanceSection: { gap: 8 },
  guidanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  guidanceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guidanceIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  guidanceTitle: { color: '#F4F2FF', fontSize: 14, fontWeight: '600', flex: 1 },
  guidanceBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  guidanceBadgeText: { color: 'rgba(244,242,255,0.55)', fontSize: 10, fontWeight: '600' },
  guidanceText: { color: 'rgba(244,242,255,0.75)', fontSize: 13, lineHeight: 19 },

  suggestedRow: { flexDirection: 'row', marginTop: 4 },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  suggestedChipText: { color: '#BFC3F6', fontSize: 12 },
});
