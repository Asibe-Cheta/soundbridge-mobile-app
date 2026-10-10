// TEMPORARY — private preview of the Bridge redesign, for Justice only. Reached via the
// "Bridge Redesign Preview" row in ProfileScreen's settings list, not linked anywhere a
// real user would find it. Visual/interaction prototype only — results below are mock
// data (matching the PromotionReachDemoScreen/WhosComingDemoScreen convention), not wired
// to the real analysis pipeline (fetchCreatorContext/Gemini) yet. See BRIDGE_DESIGN_SOURCES.MD
// for the design sources this is built from (Figma "Controls insight" card + Aura chat/
// weather treatments) and the resolved flow spec.
// Remove this file, its App.tsx route, and the ProfileScreen settings row once the real
// redesign replaces AICareerAdvisorScreen's current idle/results flow.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated as RNAnimated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Entry pill → input bar morph geometry ─────────────────────────────────
// The same pill element animates between these two states rather than crossfading
// two different components — that's what makes it read as "the same object moving,"
// matching what was asked for.
const ENTRY_PILL_WIDTH = SCREEN_W - 80;
const ENTRY_PILL_HEIGHT = 64;
const BAR_WIDTH = SCREEN_W - 40;
const BAR_HEIGHT = 56;
const ENTRY_PILL_TOP = 420; // roughly centered under the heading copy
const BAR_BOTTOM_OFFSET = 18; // distance from safe-area bottom

type Phase = 'entry' | 'morphing' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  kind: 'text' | 'insight-card' | 'weather-card';
  text?: string;
}

// ─── Count-up number (Figma source's big thin-weight stat) ────────────────
function CountUpNumber({ to, suffix = '%', style }: { to: number; suffix?: string; style?: any }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const DURATION = 900; // fast but visibly counting, not instant
    const start = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic — fast start, settles gently
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

// ─── Rising concentric arcs (Aura Attempt 2) — confined to the upper two-thirds
// of the screen only, so it structurally cannot reach the input bar at the bottom,
// satisfying "must not cover the message button" without needing mask math. ──────
function RisingArcs() {
  const anims = useRef([0, 1, 2].map(() => new RNAnimated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((v, i) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(i * 900),
          RNAnimated.timing(v, { toValue: 1, duration: 3200, easing: Easing.out(Easing.ease) as any, useNativeDriver: true }),
          RNAnimated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
          RNAnimated.delay((2 - i) * 900),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={styles.arcsContainer} pointerEvents="none">
      {anims.map((v, i) => (
        <RNAnimated.View
          key={i}
          style={[
            styles.arcRing,
            {
              opacity: v.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 0.8, 0.5, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, -60] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Figma-sourced insight card: big stat + bell-curve bars + segmented toggle ──
const BELL_CURVE = [2,3,4,6,9,13,19,27,37,48,58,67,73,75,74,70,63,54,44,34,25,17,11,7,4,3,2];

function InsightCard() {
  const [activeTab, setActiveTab] = useState<'growth' | 'earnings'>('growth');
  const data = activeTab === 'growth'
    ? { value: 24, label: 'More listeners this week' }
    : { value: 32, label: 'More followers this week' };

  return (
    <View style={styles.insightCardWrap}>
      <View style={styles.tabPill}>
        <TouchableOpacity
          onPress={() => setActiveTab('growth')}
          style={[styles.tabOption, activeTab === 'growth' && styles.tabOptionActive]}
        >
          <Text style={[styles.tabOptionText, activeTab === 'growth' && styles.tabOptionTextActive]}>Growth</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('earnings')}
          style={[styles.tabOption, activeTab === 'earnings' && styles.tabOptionActive]}
        >
          <Text style={[styles.tabOptionText, activeTab === 'earnings' && styles.tabOptionTextActive]}>Earnings</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#333563', '#202A4D', '#2D3565']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <TouchableOpacity style={styles.statCardExpand} activeOpacity={0.7}>
          <Ionicons name="arrow-up-outline" size={14} color="#F4F2FF" style={{ transform: [{ rotate: '45deg' }] }} />
        </TouchableOpacity>
        <CountUpNumber to={data.value} style={styles.statNumber} />
        <Text style={styles.statLabel}>{data.label}</Text>
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
          <Ionicons name="ellipse-outline" size={16} color="#D2CB62" />
          <View>
            <Text style={styles.maturityTitle}>This week</Text>
            <Text style={styles.maturitySub}>Current</Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={14} color="#74788F" />
        <View style={styles.maturityPill}>
          <Ionicons name="ellipse-outline" size={16} color="#D2CB62" />
          <View>
            <Text style={styles.maturityTitle}>Next release</Text>
            <Text style={styles.maturitySub}>Upcoming</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Aura-sourced weather card (Source 2, Attempt 3) ───────────────────────
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
      <Text style={styles.weatherNote}>Rain is expected during load-in — worth planning extra time, or an indoor backup for anything outdoors.</Text>
    </View>
  );
}

function RainLines() {
  const positions = [24,43,63,82,104,122,17,36,56,76,97,115,30,49,70,89,108,12,40,61,82,101];
  return (
    <View style={styles.rainWrap} pointerEvents="none">
      {positions.map((x, i) => (
        <View key={i} style={[styles.rainDrop, { left: `${(x / 140) * 100}%`, top: 4 + (i % 4) * 10 }]} />
      ))}
    </View>
  );
}

// ─── Chat bubble, Aura-sourced treatment ───────────────────────────────────
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
  const [phase, setPhase] = useState<Phase>('entry');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const morph = useSharedValue(0); // 0 = entry pill, 1 = bottom input bar

  const startMorph = () => {
    setPhase('morphing');
    morph.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    setTimeout(() => {
      setPhase('chat');
      setMessages([
        { id: 'intro', role: 'ai', kind: 'text', text: 'Your momentum is strongest with returning listeners. I found one clear opportunity in your latest activity.' },
        { id: 'card-1', role: 'ai', kind: 'insight-card' },
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
    const width = interpolate(morph.value, [0, 1], [ENTRY_PILL_WIDTH, BAR_WIDTH], Extrapolation.CLAMP);
    const height = interpolate(morph.value, [0, 1], [ENTRY_PILL_HEIGHT, BAR_HEIGHT], Extrapolation.CLAMP);
    const translateY = interpolate(
      morph.value,
      [0, 1],
      [0, SCREEN_H - ENTRY_PILL_TOP - BAR_BOTTOM_OFFSET - BAR_HEIGHT - 40],
      Extrapolation.CLAMP
    );
    return { width, height, transform: [{ translateY }] };
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={20} color="#F4F2FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bridge</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Preview</Text>
          </View>
        </View>

        {phase !== 'chat' ? (
          <Animated.View style={[styles.entryContent, entryContentStyle]}>
            <View style={styles.entryOrb}>
              <Ionicons name="sparkles" size={26} color="#fff" />
            </View>
            <Text style={styles.entryHeading}>Ready to analyse{'\n'}your career</Text>
            <Text style={styles.entryBody}>
              I'll scan your plays, earnings, audience, and collaboration patterns — then
              give you data-backed insights tailored to you.
            </Text>
            <RisingArcs />
          </Animated.View>
        ) : (
          <ScrollView
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(m => {
              if (m.kind === 'insight-card') return <InsightCard key={m.id} />;
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

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.morphPill, pillStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, entryContentStyle]} pointerEvents={phase === 'entry' ? 'auto' : 'none'}>
              <TouchableOpacity style={styles.analyseFill} onPress={startMorph} activeOpacity={0.85} disabled={phase !== 'entry'}>
                <Ionicons name="sparkles" size={16} color="#F4F2FF" />
                <Text style={styles.analyseFillText}>Analyse my career</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, barContentStyle]} pointerEvents={phase === 'chat' ? 'auto' : 'none'}>
              <BlurView intensity={30} tint="dark" style={styles.inputFill}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Message"
                  placeholderTextColor="rgba(244,242,255,0.4)"
                  style={styles.input}
                  onSubmitEditing={sendDraft}
                  returnKeyType="send"
                />
                <TouchableOpacity onPress={sendDraft} style={styles.sendBtn} disabled={!draft.trim()}>
                  <Ionicons name="arrow-up" size={16} color={draft.trim() ? '#F4F2FF' : 'rgba(244,242,255,0.3)'} />
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
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

  entryContent: { flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  entryOrb: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
  },
  entryHeading: { color: '#F4F2FF', fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 32, marginBottom: 14 },
  entryBody: { color: 'rgba(244,242,255,0.6)', fontSize: 14, lineHeight: 21, textAlign: 'center' },

  arcsContainer: {
    position: 'absolute',
    left: 0, right: 0,
    top: 260,
    height: 260, // upper two-thirds only — never reaches the bottom input bar
    alignItems: 'center',
    overflow: 'hidden',
  },
  arcRing: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    borderWidth: 2, borderColor: '#A184FF',
  },

  morphPill: {
    position: 'absolute',
    left: 20,
    top: ENTRY_PILL_TOP,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(83,77,206,0.27)',
    borderWidth: 1,
    borderColor: 'rgba(103,91,221,0.31)',
  },
  analyseFill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  analyseFillText: { color: '#F4F2FF', fontSize: 15, fontWeight: '700' },
  inputFill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 10,
  },
  input: { flex: 1, color: '#F4F2FF', fontSize: 14, paddingVertical: 10 },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  chatScroll: { flex: 1 },
  chatScrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: BAR_HEIGHT + BAR_BOTTOM_OFFSET + 24, gap: 14 },

  userBubbleRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '82%', backgroundColor: '#F4F2FA', borderRadius: 21, borderBottomRightRadius: 7, paddingHorizontal: 16, paddingVertical: 12 },
  userBubbleText: { color: '#302C43', fontSize: 14, lineHeight: 20 },

  aiBubbleRow: { alignItems: 'flex-start' },
  aiBubble: { maxWidth: '85%', borderRadius: 21, borderTopLeftRadius: 7, padding: 14, borderWidth: 1, borderColor: 'rgba(206,205,255,0.14)', overflow: 'hidden' },
  aiBubbleText: { color: 'rgba(249,248,255,0.9)', fontSize: 14, lineHeight: 20 },
  reactionRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  reactionPill: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },

  insightCardWrap: { gap: 10 },
  tabPill: { flexDirection: 'row', backgroundColor: 'rgba(83,77,206,0.27)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(103,91,221,0.31)', padding: 6, gap: 6 },
  tabOption: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  tabOptionActive: { backgroundColor: '#35C9FC' },
  tabOptionText: { color: '#BFC3F6', fontSize: 13, fontWeight: '600' },
  tabOptionTextActive: { color: '#F4F2FF' },

  statCard: { borderRadius: 30, padding: 20, paddingTop: 24, overflow: 'hidden' },
  statCardExpand: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(83,98,142,0.44)', alignItems: 'center', justifyContent: 'center' },
  statNumber: { color: '#E5E4F9', fontSize: 56, fontWeight: '200' },
  statSuffix: { color: '#68709F', fontSize: 44, fontWeight: '200' },
  statLabel: { color: '#9BA4C6', fontSize: 13, marginTop: 4 },
  bellCurveRow: { flexDirection: 'row', alignItems: 'flex-end', height: 80, marginTop: 16, gap: 3 },
  bellCurveBar: { flex: 1, backgroundColor: '#36B8FF', borderRadius: 2, minHeight: 2 },

  maturityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15161C', borderRadius: 999, borderWidth: 1, borderColor: '#2C2E3A', padding: 10, justifyContent: 'space-between' },
  maturityPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#303139', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12, flex: 1 },
  maturityTitle: { color: '#F4F2FF', fontSize: 12, fontWeight: '600' },
  maturitySub: { color: '#A2A3B3', fontSize: 10 },

  weatherCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16 },
  weatherHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherTemp: { color: '#fff', fontSize: 40, fontWeight: '400' },
  weatherCondition: { color: '#fff', fontSize: 14, fontWeight: '600' },
  weatherPlace: { color: 'rgba(244,242,255,0.5)', fontSize: 11, marginTop: 2 },
  rainWrap: { height: 60, marginTop: 10, position: 'relative' },
  rainDrop: { position: 'absolute', width: 1.5, height: 10, backgroundColor: '#CDCAFF', opacity: 0.7, transform: [{ rotate: '20deg' }] },
  weatherNote: { color: 'rgba(244,242,255,0.75)', fontSize: 13, lineHeight: 19, marginTop: 10 },

  suggestedRow: { flexDirection: 'row', marginTop: 4 },
  suggestedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  suggestedChipText: { color: '#BFC3F6', fontSize: 12 },
});
