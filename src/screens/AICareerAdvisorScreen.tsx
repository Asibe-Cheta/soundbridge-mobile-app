import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'scanning' | 'results';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// ─── Mock data ──────────────────────────────────────────────────────────────────

const SCAN_LINES = [
  'Connecting to SoundBridge...',
  'Analysing 847 plays across 12 tracks...',
  'Comparing against 4,200 gospel artists...',
  'Calculating earning potential by city...',
  'Mapping collaboration opportunities...',
  'Generating your personalised report...',
];

const INSIGHT_CARDS = [
  {
    id: 'performance',
    icon: 'trending-up',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    borderColor: 'rgba(96,165,250,0.25)',
    label: 'PERFORMANCE',
    title: "You're in the top 15% for your stage",
    stat: '847 plays/mo',
    statLabel: 'vs 420 avg',
    detail:
      'Gospel artists at your career stage average 420 plays per month. You are averaging 847. The gap between you and the top 10% is consistent posting cadence.',
  },
  {
    id: 'earnings',
    icon: 'cash',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.25)',
    label: 'EARNINGS',
    title: '"The Gospel Prevails" is your breakout',
    stat: '+280%',
    statLabel: 'tips-per-play',
    detail:
      'This track outperforms your catalogue average by 280% in tips-per-play. A follow-up in the same style is projected to generate £420–£640 in month one.',
  },
  {
    id: 'location',
    icon: 'location',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    borderColor: 'rgba(168,85,247,0.25)',
    label: 'LOCATION',
    title: 'Manchester is your best untapped market',
    stat: '22,000',
    statLabel: 'potential fans',
    detail:
      'Manchester has 22,000 gospel fans in your segment but only 3 active artists of your calibre. Earnings potential: £12,400/yr — vs £3,800 in Birmingham today.',
  },
  {
    id: 'collaboration',
    icon: 'people',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.12)',
    borderColor: 'rgba(236,72,153,0.25)',
    label: 'COLLABORATION',
    title: 'Worship bridges earn 3.2× more tips',
    stat: '3.2×',
    statLabel: 'more tips',
    detail:
      'Tracks ending with a worship bridge receive 3.2× more tips than instrumental outros — even when total play counts are similar. Pattern detected across 47 tracks.',
  },
  {
    id: 'timing',
    icon: 'time',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    borderColor: 'rgba(251,191,36,0.25)',
    label: 'RELEASE TIMING',
    title: 'Friday evenings are your golden window',
    stat: '+58%',
    statLabel: 'vs any other time',
    detail:
      'You perform 58% better on Friday evenings than any other time slot. Most gospel artists in your area show no day-of-week variation — this is a specific advantage.',
  },
];

const PROMPT_CHIPS = [
  'Why Manchester?',
  'How do I grow faster?',
  'What should I post today?',
  'Explain my earnings',
];

const MOCK_RESPONSES: Record<string, string> = {
  'Why Manchester?':
    "Manchester has 22,000 gospel fans in your audience segment but only 3 active gospel artists of your calibre. The competition-to-audience ratio is 7.3× better than London, and the average fan tip is £4.80 — 20% above the national average.",
  'How do I grow faster?':
    "Your single biggest lever is posting consistency. Top 10% artists at your stage post 3× per week. You're averaging 1.2×. Even bumping to 2× weekly is projected to increase your monthly plays by 65% within 90 days.",
  'What should I post today?':
    "Based on your audience activity patterns, post a 30-second preview of your strongest recent track this afternoon between 2pm and 4pm. Tuesday afternoons drive 58% more first-listens for gospel artists in your region.",
  'Explain my earnings':
    "You're currently earning through tips and service bookings. Your tips-per-play rate of £0.042 is 2.8× the gospel artist average of £0.015. Scaling your plays to 2,000/month — achievable in 6 months — projects £84–£126/month in tips alone.",
};

// ─── Typing indicator ────────────────────────────────────────────────────────────
function TypingDots({ theme }: { theme: any }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 160),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { backgroundColor: '#a855f7', opacity: dot }]} />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────────
export default function AICareerAdvisorScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const firstName = (user as any)?.display_name?.split(' ')[0] ?? 'Creator';

  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>('idle');

  // ── Scanning state ──
  const [visibleLines, setVisibleLines] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Card entrance animations ──
  const cardAnims = useRef(INSIGHT_CARDS.map(() => new Animated.Value(0))).current;

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // ── Start scanning ──
  const startScan = () => {
    setPhase('scanning');
    setVisibleLines(0);
    progressAnim.setValue(0);

    // Reveal lines one by one
    SCAN_LINES.forEach((_, i) => {
      setTimeout(() => {
        setVisibleLines(prev => prev + 1);
      }, i * 600 + 300);
    });

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SCAN_LINES.length * 600 + 200,
      useNativeDriver: false,
    }).start();

    // Transition to results
    setTimeout(() => {
      setPhase('results');
      // Stagger card entrances
      INSIGHT_CARDS.forEach((_, i) => {
        setTimeout(() => {
          Animated.spring(cardAnims[i], {
            toValue: 1,
            tension: 60,
            friction: 9,
            useNativeDriver: true,
          }).start();
        }, i * 120);
      });
    }, SCAN_LINES.length * 600 + 600);
  };

  // ── Send chat message ──
  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response =
        MOCK_RESPONSES[text.trim()] ??
        "That's a great question. Based on your profile data, I'd recommend focusing on your Friday evening posting window and the Manchester market opportunity — both are uniquely suited to your current audience profile.";
      setIsTyping(false);
      setChatMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: response },
      ]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1800);
  };

  const COMING_SOON_FEATURES = [
    { icon: 'trending-up', label: 'How your plays compare to artists at your stage' },
    { icon: 'cash', label: 'Which of your tracks has the highest earnings potential' },
    { icon: 'location', label: 'The best cities for your music right now' },
    { icon: 'time', label: 'Your optimal release windows by day and time' },
    { icon: 'megaphone', label: 'How to promote your next event for maximum attendance' },
    { icon: 'people', label: 'Collaboration patterns that drive 3x more tips' },
    { icon: 'star', label: 'What top earners in your genre are doing differently' },
    { icon: 'chatbubble-ellipses', label: 'Ask the AI anything about your career' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Coming Soon Modal — blocks all interaction ── */}
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.csOverlay}>
          <View style={[styles.csCard, { backgroundColor: theme.isDark ? '#12091F' : '#FFFFFF' }]}>
            {/* AI badge */}
            <LinearGradient
              colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.csAiBadge}
            >
              <Text style={styles.csAiBadgeText}>AI</Text>
            </LinearGradient>

            <Text style={[styles.csComingSoon, { color: '#a855f7' }]}>COMING SOON</Text>
            <Text style={[styles.csTitle, { color: theme.isDark ? '#FFFFFF' : '#0F172A' }]}>
              AI Career Advisor
            </Text>
            <Text style={[styles.csBody, { color: theme.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)' }]}>
              We're building a personalised AI analyst that reads your real SoundBridge data — not generic advice. Here's what you'll get when it launches:
            </Text>

            <View style={styles.csFeatureList}>
              {COMING_SOON_FEATURES.map(f => (
                <View key={f.label} style={styles.csFeatureRow}>
                  <View style={styles.csFeatureIcon}>
                    <Ionicons name={f.icon as any} size={14} color="#a855f7" />
                  </View>
                  <Text style={[styles.csFeatureText, { color: theme.isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.75)' }]}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.csBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <LinearGradient
                colors={['#a855f7', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.csBtnGrad}
              >
                <Text style={styles.csBtnText}>Got it — Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backBtn} />
          <View style={styles.headerCenter}>
            <View style={styles.aiBadge}>
              <LinearGradient colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiBadgeGrad}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </LinearGradient>
            </View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Career Advisor</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          ref={chatScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={[styles.greetName, { color: theme.colors.text }]}>
              Good evening, {firstName}
            </Text>
            <Text style={[styles.greetSub, { color: theme.colors.textSecondary }]}>
              Your personal AI career analyst — trained on SoundBridge data from thousands of creators.
            </Text>
          </View>

          {/* ── IDLE STATE ── */}
          {phase === 'idle' && (
            <View style={styles.idleContainer}>
              <LinearGradient
                colors={['rgba(168,85,247,0.12)', 'rgba(96,165,250,0.08)', 'rgba(236,72,153,0.06)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.idleCard, { borderColor: 'rgba(168,85,247,0.3)' }]}
              >
                {/* AI icon */}
                <LinearGradient
                  colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.idleAiIcon}
                >
                  <Text style={styles.idleAiIconText}>AI</Text>
                </LinearGradient>

                <Text style={[styles.idleTitle, { color: theme.colors.text }]}>
                  Ready to analyse your career
                </Text>
                <Text style={[styles.idleBody, { color: theme.colors.textSecondary }]}>
                  I'll scan your play counts, earnings, audience location, and collaboration patterns — then give you 5 data-backed insights tailored specifically to you.
                </Text>

                {/* Feature bullets */}
                <View style={styles.idleFeatures}>
                  {[
                    { icon: 'trending-up', label: 'Performance vs peers' },
                    { icon: 'cash', label: 'Earnings opportunities' },
                    { icon: 'location', label: 'Best cities for your music' },
                    { icon: 'people', label: 'Collaboration patterns' },
                    { icon: 'time', label: 'Optimal release timing' },
                  ].map(f => (
                    <View key={f.label} style={styles.idleFeatureRow}>
                      <View style={styles.idleFeatureIcon}>
                        <Ionicons name={f.icon as any} size={14} color="#a855f7" />
                      </View>
                      <Text style={[styles.idleFeatureText, { color: theme.colors.textSecondary }]}>{f.label}</Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                <TouchableOpacity style={styles.ctaBtn} onPress={startScan} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaBtnGrad}
                  >
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={styles.ctaBtnText}>Analyse My Career</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={[styles.idleFootnote, { color: theme.colors.textSecondary }]}>
                  Uses anonymised platform benchmarks · Updates weekly
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* ── SCANNING STATE ── */}
          {phase === 'scanning' && (
            <View style={styles.scanContainer}>
              <LinearGradient
                colors={['rgba(168,85,247,0.1)', 'rgba(96,165,250,0.07)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.scanCard, { borderColor: 'rgba(168,85,247,0.25)' }]}
              >
                <LinearGradient
                  colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scanAiIcon}
                >
                  <Text style={styles.scanAiIconText}>AI</Text>
                </LinearGradient>

                <Text style={[styles.scanTitle, { color: theme.colors.text }]}>Analysing your career…</Text>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>

                {/* Scan lines */}
                <View style={styles.scanLines}>
                  {SCAN_LINES.map((line, i) =>
                    i < visibleLines ? (
                      <View key={i} style={styles.scanLineRow}>
                        <Ionicons
                          name={i < visibleLines - 1 ? 'checkmark-circle' : 'ellipse'}
                          size={14}
                          color={i < visibleLines - 1 ? '#10b981' : '#a855f7'}
                        />
                        <Text style={[styles.scanLineText, { color: i < visibleLines - 1 ? theme.colors.textSecondary : theme.colors.text }]}>
                          {line}
                        </Text>
                      </View>
                    ) : null
                  )}
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── RESULTS STATE ── */}
          {phase === 'results' && (
            <>
              {/* Section label */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>YOUR INSIGHTS</Text>

              {/* 5 insight cards */}
              {INSIGHT_CARDS.map((card, i) => (
                <Animated.View
                  key={card.id}
                  style={[
                    styles.insightCardWrap,
                    {
                      opacity: cardAnims[i],
                      transform: [
                        {
                          translateY: cardAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [24, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[card.bg, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.insightCard, { borderColor: card.borderColor }]}
                  >
                    {/* Card header */}
                    <View style={styles.insightCardHeader}>
                      <View style={[styles.insightIconWrap, { backgroundColor: card.bg }]}>
                        <Ionicons name={card.icon as any} size={20} color={card.color} />
                      </View>
                      <View style={styles.insightCardHeaderText}>
                        <Text style={[styles.insightCardLabel, { color: card.color }]}>{card.label}</Text>
                        <Text style={[styles.insightCardTitle, { color: theme.colors.text }]} numberOfLines={2}>
                          {card.title}
                        </Text>
                      </View>
                      <View style={styles.insightStatWrap}>
                        <Text style={[styles.insightStat, { color: card.color }]}>{card.stat}</Text>
                        <Text style={[styles.insightStatLabel, { color: theme.colors.textSecondary }]}>{card.statLabel}</Text>
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={[styles.insightDivider, { backgroundColor: card.borderColor }]} />

                    {/* Detail */}
                    <Text style={[styles.insightDetail, { color: theme.colors.textSecondary }]}>{card.detail}</Text>
                  </LinearGradient>
                </Animated.View>
              ))}

              {/* ── ASK ME ANYTHING ── */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 32 }]}>ASK ME ANYTHING</Text>

              <View style={[styles.chatContainer, { borderColor: theme.colors.border }]}>
                <LinearGradient
                  colors={['rgba(168,85,247,0.06)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                {/* Intro message */}
                {chatMessages.length === 0 && (
                  <View style={styles.chatIntroRow}>
                    <LinearGradient colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatAiAvatar}>
                      <Text style={styles.chatAiAvatarText}>AI</Text>
                    </LinearGradient>
                    <View style={[styles.chatBubble, { backgroundColor: theme.isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.2)' }]}>
                      <Text style={[styles.chatBubbleText, { color: theme.colors.text }]}>
                        I've analysed your career data. Ask me anything about your results, or tap a suggestion below.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Chat messages */}
                {chatMessages.map(msg => (
                  <View key={msg.id} style={msg.role === 'user' ? styles.chatUserRow : styles.chatAiRow}>
                    {msg.role === 'ai' && (
                      <LinearGradient colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatAiAvatar}>
                        <Text style={styles.chatAiAvatarText}>AI</Text>
                      </LinearGradient>
                    )}
                    <View
                      style={[
                        styles.chatBubble,
                        msg.role === 'user'
                          ? { backgroundColor: 'rgba(168,85,247,0.18)', borderColor: 'rgba(168,85,247,0.35)', alignSelf: 'flex-end' }
                          : { backgroundColor: theme.isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.2)' },
                      ]}
                    >
                      <Text style={[styles.chatBubbleText, { color: theme.colors.text }]}>{msg.text}</Text>
                    </View>
                  </View>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <View style={styles.chatAiRow}>
                    <LinearGradient colors={['#ef4444', '#ec4899', '#a855f7', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatAiAvatar}>
                      <Text style={styles.chatAiAvatarText}>AI</Text>
                    </LinearGradient>
                    <View style={[styles.chatBubble, { backgroundColor: theme.isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.2)' }]}>
                      <TypingDots theme={theme} />
                    </View>
                  </View>
                )}
              </View>

              {/* Prompt chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
                {PROMPT_CHIPS.map(chip => (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.chip, { borderColor: 'rgba(168,85,247,0.4)', backgroundColor: theme.isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.05)' }]}
                    onPress={() => sendMessage(chip)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, { color: '#a855f7' }]}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Input row */}
              <View style={[styles.inputRow, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.textInput, { color: theme.colors.text }]}
                  placeholder="Ask your AI advisor…"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={() => sendMessage(chatInput)}
                  returnKeyType="send"
                  multiline={false}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { opacity: chatInput.trim() ? 1 : 0.4 }]}
                  onPress={() => sendMessage(chatInput)}
                  disabled={!chatInput.trim()}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#a855f7', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendBtnGrad}>
                    <Ionicons name="arrow-up" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <Text style={[styles.footerNote, { color: theme.colors.textSecondary }]}>
                Recommendations are based on anonymised platform benchmarks. All projections are estimates, not guarantees.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: { width: 28, height: 28, borderRadius: 8 },
  aiBadgeGrad: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  aiBadgeText: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerTitle: { ...Typography.headerMedium, fontSize: 18 },

  scroll: { paddingBottom: 48 },

  greeting: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  greetName: { ...Typography.headerMedium, fontSize: 22, marginBottom: 4 },
  greetSub: { ...Typography.body, fontSize: 14, lineHeight: 20 },

  sectionLabel: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 12,
    marginHorizontal: 16,
  },

  // ── Idle ──
  idleContainer: { paddingHorizontal: 16, marginTop: 16 },
  idleCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  idleAiIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  idleAiIconText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  idleTitle: { ...Typography.headerMedium, fontSize: 20, textAlign: 'center', marginBottom: 10 },
  idleBody: { ...Typography.body, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  idleFeatures: { width: '100%', gap: 10, marginBottom: 24 },
  idleFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  idleFeatureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleFeatureText: { ...Typography.body, fontSize: 14 },
  ctaBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  ctaBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  idleFootnote: { ...Typography.label, fontSize: 11, textAlign: 'center', lineHeight: 15 },

  // ── Scanning ──
  scanContainer: { paddingHorizontal: 16, marginTop: 16 },
  scanCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  scanAiIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  scanAiIconText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  scanTitle: { ...Typography.headerMedium, fontSize: 18, marginBottom: 16 },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  scanLines: { width: '100%', gap: 10 },
  scanLineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanLineText: { ...Typography.body, fontSize: 13 },

  // ── Insight cards ──
  insightCardWrap: { marginHorizontal: 16, marginBottom: 12 },
  insightCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  insightCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightCardHeaderText: { flex: 1 },
  insightCardLabel: { ...Typography.label, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 },
  insightCardTitle: { ...Typography.body, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  insightStatWrap: { alignItems: 'flex-end', flexShrink: 0 },
  insightStat: { ...Typography.headerMedium, fontSize: 18, fontWeight: '800' },
  insightStatLabel: { ...Typography.label, fontSize: 10, marginTop: 1 },
  insightDivider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  insightDetail: { ...Typography.label, fontSize: 13, lineHeight: 18 },

  // ── Chat ──
  chatContainer: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  chatIntroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chatAiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chatUserRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  chatAiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatAiAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  chatBubble: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  chatBubbleText: { ...Typography.body, fontSize: 13, lineHeight: 19 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Prompt chips
  chipsScroll: { marginTop: 10 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { ...Typography.label, fontSize: 13, fontWeight: '600' },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  textInput: { flex: 1, ...Typography.body, fontSize: 14, paddingVertical: 6 },
  sendBtn: { flexShrink: 0 },
  sendBtnGrad: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footerNote: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },

  // ── Coming Soon Modal ──
  csOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  csCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  csAiBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  csAiBadgeText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  csComingSoon: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  csTitle: { ...Typography.headerMedium, fontSize: 22, marginBottom: 10, textAlign: 'center' },
  csBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  csFeatureList: { width: '100%', gap: 11, marginBottom: 26 },
  csFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  csFeatureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  csFeatureText: { ...Typography.body, fontSize: 13, lineHeight: 18, flex: 1 },
  csBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  csBtnGrad: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  csBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
