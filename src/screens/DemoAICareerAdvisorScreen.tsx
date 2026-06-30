import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const AI_GRADIENT = ['#ef4444', '#ec4899', '#a855f7', '#60a5fa'] as const;
const AI_GRADIENT_H = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
const AI_GRADIENT_D = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

function AiBadge({ size = 28, radius = 8, fontSize = 10 }: { size?: number; radius?: number; fontSize?: number }) {
  return (
    <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_D} style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize, fontWeight: '800', letterSpacing: 0.5 }}>AI</Text>
    </LinearGradient>
  );
}

const DEMO_CARDS = [
  {
    id: 'performance',
    icon: 'trending-up',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    borderColor: 'rgba(96,165,250,0.22)',
    shadowColor: '#60a5fa',
    label: 'PERFORMANCE',
    title: 'Your top track is outperforming 91% of peers',
    stat: '1,247',
    statUnit: '',
    statLabel: 'total plays',
    detail: '"Midnight Echoes" has driven 847 of your 1,247 plays in the last 30 days — a 23% week-on-week growth rate that puts you in the top 9% of SoundBridge creators at your career stage. Your R&B and Afrobeats crossover sound is clearly resonating. Release a follow-up single within the next 14 days to capitalise on the momentum.',
  },
  {
    id: 'earnings',
    icon: 'cash',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.22)',
    shadowColor: '#10b981',
    label: 'EARNINGS',
    title: 'Strong monetisation — you\'re ahead of the curve',
    stat: '$1,013',
    statUnit: '.75',
    statLabel: 'total earned',
    detail: 'Your $1,013.75 in total earnings puts you in the top 12% of monetising creators on the platform. Fan tips account for 27% of that revenue — a healthy sign of an engaged audience. Your $450 gig payout this week alone shows your live performance market is growing. Add a tipping prompt to your next two posts to push your monthly fan revenue past the $200 mark.',
  },
  {
    id: 'location',
    icon: 'location',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    borderColor: 'rgba(168,85,247,0.22)',
    shadowColor: '#a855f7',
    label: 'LOCATION',
    title: 'West Coast listeners are your fastest-growing segment',
    stat: '68%',
    statUnit: '',
    statLabel: 'US audience',
    detail: 'Your music is resonating most strongly in Los Angeles, Atlanta, and Houston — the three biggest markets for Afrobeats crossover in North America right now. Creators with your sound who actively tag LA, ATL, and Houston in their posts see 34% higher discovery rates. Schedule your next event or live session in one of these cities to convert listeners into paying fans.',
  },
  {
    id: 'collaboration',
    icon: 'people',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.12)',
    borderColor: 'rgba(236,72,153,0.22)',
    shadowColor: '#ec4899',
    label: 'COLLABORATION',
    title: 'Your network is your most underutilised asset',
    stat: '2,847',
    statUnit: '',
    statLabel: 'followers',
    detail: 'With 2,847 followers and a 94% community retention rate, your audience loyalty is exceptional. However, your current collaboration output is 60% below creators at a similar follower count. One feature release with a complementary artist in your network could generate an estimated 300–500 new profile visits. Reach out to 3 producers in your genre this week.',
  },
  {
    id: 'timing',
    icon: 'time',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    borderColor: 'rgba(251,191,36,0.22)',
    shadowColor: '#fbbf24',
    label: 'RELEASE TIMING',
    title: 'Friday 7–9pm drops are delivering your best numbers',
    stat: '12',
    statUnit: '',
    statLabel: 'events created',
    detail: 'Your 12 events show consistent audience turnout — your Friday evening releases outperform Thursday or Monday drops by 41% on average. Platform data shows your core listeners are most active between 7–9pm EST on Fridays. Your next release should drop at 7pm EST Friday to maximise first-24-hour streams, which is the primary metric for playlist consideration on SoundBridge.',
  },
];

const MOCK_CHAT: { role: 'user' | 'ai'; text: string }[] = [
  {
    role: 'user',
    text: 'How do I grow my fan tips faster?',
  },
  {
    role: 'ai',
    text: 'Your best lever right now is recency — fans who discovered you through "Midnight Echoes" in the last 30 days are 4× more likely to tip if you post within the first 48 hours of them following you. Add a short voice message or exclusive clip to your next post with a clear call-to-action like "Support this next release." Your R&B audience specifically responds well to personal connection over promotion. Do that for your next three posts and your tip rate should move.',
  },
];

export default function DemoAICareerAdvisorScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#080812', '#1a0a2e', '#080812']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <AiBadge size={30} radius={9} fontSize={11} />
            <Text style={styles.headerTitle}>Career Advisor</Text>
          </View>

          <View style={{ width: 60 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Greeting */}
          <View style={styles.greetingSection}>
            <View style={styles.greetingBadgeRow}>
              <View style={styles.greetingBadge}>
                <View style={styles.greetingBadgeDot} />
                <Text style={styles.greetingBadgeText}>PERSONALISED ANALYSIS</Text>
              </View>
            </View>
            <Text style={styles.greetName}>Good evening, Alex</Text>
            <Text style={styles.greetSub}>
              Your personal AI career analyst — trained on SoundBridge data from thousands of creators.
            </Text>
          </View>

          {/* Insight cards */}
          <Text style={styles.sectionLabel}>YOUR INSIGHTS</Text>

          {DEMO_CARDS.map((card) => (
            <View
              key={card.id}
              style={[styles.insightCardWrap, { shadowColor: card.shadowColor }]}
            >
              <View style={[styles.insightCard, { borderColor: card.borderColor }]}>
                <LinearGradient
                  colors={[card.bg, 'transparent']}
                  {...AI_GRADIENT_D}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.insightCardHeader}>
                  <View style={[styles.insightIconWrap, { backgroundColor: card.bg, borderColor: card.borderColor, borderWidth: 1 }]}>
                    <Ionicons name={card.icon as any} size={20} color={card.color} />
                  </View>
                  <View style={styles.insightCardHeaderText}>
                    <Text style={[styles.insightCardLabel, { color: card.color }]}>{card.label}</Text>
                    <Text style={styles.insightCardTitle} numberOfLines={2}>{card.title}</Text>
                  </View>
                  <View style={styles.insightStatWrap}>
                    <Text style={[styles.insightStat, { color: card.color }]}>{card.stat}</Text>
                    {card.statUnit ? <Text style={[styles.insightStatUnit, { color: card.color }]}>{card.statUnit}</Text> : null}
                    <Text style={styles.insightStatLabel}>{card.statLabel}</Text>
                  </View>
                </View>

                <View style={[styles.insightDivider, { backgroundColor: card.borderColor }]} />
                <Text style={styles.insightDetail}>{card.detail}</Text>
              </View>
            </View>
          ))}

          {/* Chat intro */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, marginBottom: 0 }}>
            <Text style={styles.sectionLabel}>ASK ME ANYTHING</Text>
            <View style={{ flexDirection: 'row', gap: 16, paddingRight: 4 }}>
              <Ionicons name="create-outline" size={20} color="rgba(255,255,255,0.45)" />
              <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.45)" />
            </View>
          </View>

          {/* Chat intro text */}
          <View style={[styles.chatContainer]}>
            <View style={styles.aiMsgWrap}>
              <AiBadge size={26} radius={8} fontSize={9} />
              <View style={styles.aiMsgBubble}>
                <LinearGradient
                  colors={['rgba(168,85,247,0.18)', 'rgba(96,165,250,0.10)']}
                  {...AI_GRADIENT_H}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.aiMsgText}>
                  I've analysed your career data. Your $1,013.75 in earnings and momentum around "Midnight Echoes" gives us a lot to work with. Ask me anything about your results, or tap a suggestion below.
                </Text>
              </View>
            </View>

            {/* Demo Q&A */}
            {MOCK_CHAT.map((msg, i) => (
              msg.role === 'user' ? (
                <View key={i} style={styles.userMsgWrap}>
                  <View style={styles.userMsgBubble}>
                    <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_H} style={StyleSheet.absoluteFill} />
                    <Text style={styles.userMsgText}>{msg.text}</Text>
                  </View>
                </View>
              ) : (
                <View key={i} style={styles.aiMsgWrap}>
                  <AiBadge size={26} radius={8} fontSize={9} />
                  <View style={styles.aiMsgBubble}>
                    <LinearGradient
                      colors={['rgba(168,85,247,0.18)', 'rgba(96,165,250,0.10)']}
                      {...AI_GRADIENT_H}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.aiMsgText}>{msg.text}</Text>
                  </View>
                </View>
              )
            ))}

            {/* Prompt chips */}
            <View style={styles.chipsRow}>
              {['How do I get more plays?', 'Explain my earnings', 'Best release strategy'].map(chip => (
                <View key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
            </View>

            {/* Input bar */}
            <View style={styles.inputRow}>
              <View style={[styles.inputBox, { flex: 1 }]}>
                <Text style={styles.inputPlaceholder}>Ask anything about your career…</Text>
              </View>
              <View style={styles.sendBtn}>
                <LinearGradient colors={AI_GRADIENT} {...AI_GRADIENT_H} style={styles.sendBtnGrad}>
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </LinearGradient>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {},
  backBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  greetingSection: { marginBottom: 28 },
  greetingBadgeRow: { flexDirection: 'row', marginBottom: 14 },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  greetingBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a855f7',
  },
  greetingBadgeText: { color: '#a855f7', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  greetName: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8 },
  greetSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 21 },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 16,
  },

  insightCardWrap: {
    marginBottom: 16,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  insightCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  insightCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightCardHeaderText: { flex: 1 },
  insightCardLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 },
  insightCardTitle: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  insightStatWrap: { alignItems: 'flex-end', flexShrink: 0 },
  insightStat: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
  insightStatUnit: { fontSize: 14, fontWeight: '700', lineHeight: 18, marginTop: -2 },
  insightStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '500', marginTop: 2 },
  insightDivider: { height: 1, marginVertical: 14, opacity: 0.5 },
  insightDetail: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 21 },

  chatContainer: { marginTop: 20, gap: 16 },
  aiMsgWrap: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiMsgBubble: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  aiMsgText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22 },
  userMsgWrap: { alignItems: 'flex-end' },
  userMsgBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  userMsgText: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '500' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500' },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  inputBox: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputPlaceholder: { color: 'rgba(255,255,255,0.25)', fontSize: 14 },
  sendBtn: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
  sendBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
