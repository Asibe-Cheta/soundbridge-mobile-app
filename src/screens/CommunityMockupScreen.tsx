import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import BackButton from '../components/BackButton';
import { SystemTypography as Typography } from '../constants/Typography';

const { width: W } = Dimensions.get('window');

type Tab = 'tips' | 'ai';

const TABS: { key: Tab; label: string }[] = [
  { key: 'tips', label: 'Fan Tips' },
  { key: 'ai', label: 'AI Analysis' },
];

const SONG_TIPS = [
  { city: 'Lagos, Nigeria', flag: '🇳🇬', amount: '$189.50', plays: '1,420 plays', pct: 100 },
  { city: 'London, UK', flag: '🇬🇧', amount: '$156.20', plays: '1,182 plays', pct: 82 },
  { city: 'Atlanta, USA', flag: '🇺🇸', amount: '$98.70', plays: '748 plays', pct: 52 },
  { city: 'New York, USA', flag: '🇺🇸', amount: '$87.40', plays: '661 plays', pct: 46 },
  { city: 'Toronto, Canada', flag: '🇨🇦', amount: '$65.30', plays: '493 plays', pct: 34 },
  { city: 'Accra, Ghana', flag: '🇬🇭', amount: '$43.80', plays: '331 plays', pct: 23 },
  { city: 'Manchester, UK', flag: '🇬🇧', amount: '$38.20', plays: '289 plays', pct: 20 },
  { city: 'Houston, USA', flag: '🇺🇸', amount: '$31.50', plays: '239 plays', pct: 17 },
];

const EVENT_TIPS = [
  {
    event: 'Living Loud — The Concert',
    date: 'Feb 20, 2026',
    location: 'National Theatre, Abuja',
    amount: '$445.00',
    tippers: 34,
    topTip: '$40',
  },
  {
    event: 'AJOYO × Loud Urban Choir',
    date: 'Jan 10, 2026',
    location: 'Accra Theatre, Accra',
    amount: '$287.50',
    tippers: 22,
    topTip: '$25',
  },
];

const AI_FACTORS = [
  {
    icon: 'megaphone-outline',
    category: 'Political Climate',
    title: 'Post-election stability in Nigeria',
    detail: 'Civic calm following the 2025 Lagos governorship transition has reduced anxiety-driven content avoidance. Entertainment consumption in Lagos is up 11% since November.',
    impact: '+11%',
    direction: 'up' as const,
    color: '#10B981',
  },
  {
    icon: 'football-outline',
    category: 'Sporting Events',
    title: 'AFCON 2025 — West Africa attention spike',
    detail: 'During the 3-week tournament window (Jan 13–Feb 2), music streaming in Nigeria, Ghana, and Cameroon dropped 14–18%. Your plays dipped 12% in that window — in line with the market, not your content.',
    impact: '-12%',
    direction: 'down' as const,
    color: '#F59E0B',
  },
  {
    icon: 'musical-notes-outline',
    category: 'Industry Signal',
    title: "Burna Boy's sold-out O2 Arena run",
    detail: "Three consecutive sell-outs in London (March 2026) triggered a 27% spike in Afrobeats search interest across UK platforms. Your London plays rose 23% in the same 10-day window — you are riding the genre uplift.",
    impact: '+23% UK',
    direction: 'up' as const,
    color: '#8B5CF6',
  },
  {
    icon: 'sunny-outline',
    category: 'Seasonal Factor',
    title: 'Q1 post-Christmas slowdown',
    detail: 'January–February historically shows a 6–9% dip in music consumption globally as discretionary spending tightens. Your streams held relatively flat — stronger performance than the seasonal baseline.',
    impact: 'Resilient',
    direction: 'neutral' as const,
    color: '#06B6D4',
  },
  {
    icon: 'phone-portrait-outline',
    category: 'User Behaviour',
    title: '78% of your listeners replay tracks 3+ times',
    detail: 'High replay rate indicates emotional resonance — listeners are not passively browsing, they are deliberately returning. This signals catalogue depth and loyal base formation, uncommon at 117 followers.',
    impact: 'High signal',
    direction: 'up' as const,
    color: '#EC4899',
  },
  {
    icon: 'location-outline',
    category: 'Location Intelligence',
    title: 'Lagos + London = 69% of active listeners',
    detail: 'Your two primary markets are geographically complementary — dual-timezone primetime. Lagos peaks 7–10 PM WAT, London peaks 8–11 PM GMT. A single release can ride both windows with a staggered promotion push.',
    impact: 'Dual peak',
    direction: 'up' as const,
    color: '#8B5CF6',
  },
];

export default function CommunityMockupScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('tips');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <View style={[styles.header, { borderBottomColor: 'transparent', backgroundColor: 'transparent' }]}>
          <BackButton style={[styles.headerBtn, { borderWidth: 0 }]} onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Community</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.tabsRow, { borderBottomColor: theme.colors.border }]}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, { color: activeTab === key ? theme.colors.primary : theme.colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'tips' && <TipsTab theme={theme} />}
          {activeTab === 'ai' && <AITab theme={theme} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TipsTab({ theme }: { theme: any }) {
  const songTotal = SONG_TIPS.reduce((s, r) => s + parseFloat(r.amount.replace('$', '')), 0);
  const eventTotal = EVENT_TIPS.reduce((s, r) => s + parseFloat(r.amount.replace('$', '')), 0);

  return (
    <View style={{ padding: 16 }}>
      {/* Total summary */}
      <LinearGradient
        colors={['#7C3AED', '#9D4EDD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.totalCard}
      >
        <Text style={styles.totalLabel}>Total Tips Received</Text>
        <Text style={styles.totalAmount}>${(songTotal + eventTotal).toFixed(2)}</Text>
        <Text style={styles.totalSub}>from song plays + events · last 90 days</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalPill}>
            <Ionicons name="musical-note-outline" size={12} color="#fff" />
            <Text style={styles.totalPillText}>${songTotal.toFixed(2)} streams</Text>
          </View>
          <View style={styles.totalPill}>
            <Ionicons name="ticket-outline" size={12} color="#fff" />
            <Text style={styles.totalPillText}>${eventTotal.toFixed(2)} events</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Song play tips */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>FROM SONG PLAYS — BY LOCATION</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {SONG_TIPS.map((row, i) => (
          <View key={i} style={[styles.tipRow, i < SONG_TIPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
            <Text style={styles.tipFlag}>{row.flag}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.tipMeta}>
                <Text style={[styles.tipCity, { color: theme.colors.text }]}>{row.city}</Text>
                <Text style={[styles.tipAmount, { color: '#10B981' }]}>{row.amount}</Text>
              </View>
              <View style={styles.tipBarRow}>
                <View style={[styles.tipBarBg, { backgroundColor: theme.colors.border }]}>
                  <View style={[styles.tipBarFill, { width: `${row.pct}%`, backgroundColor: '#10B981' }]} />
                </View>
                <Text style={[styles.tipPlays, { color: theme.colors.textSecondary }]}>{row.plays}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Event tips */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>FROM EVENTS</Text>
      {EVENT_TIPS.map((ev, i) => (
        <View key={i} style={[styles.eventTipCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.eventTipHeader}>
            <Text style={[styles.eventTipName, { color: theme.colors.text }]}>{ev.event}</Text>
            <Text style={[styles.eventTipAmount, { color: '#EC4899' }]}>{ev.amount}</Text>
          </View>
          <View style={styles.eventTipMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{ev.date}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{ev.location}</Text>
            </View>
          </View>
          <View style={styles.eventTipStats}>
            <View style={[styles.eventTipStat, { backgroundColor: '#EC489920' }]}>
              <Text style={[styles.eventTipStatVal, { color: '#EC4899' }]}>{ev.tippers}</Text>
              <Text style={[styles.eventTipStatLabel, { color: theme.colors.textSecondary }]}>tippers</Text>
            </View>
            <View style={[styles.eventTipStat, { backgroundColor: '#8B5CF620' }]}>
              <Text style={[styles.eventTipStatVal, { color: '#8B5CF6' }]}>{ev.topTip}</Text>
              <Text style={[styles.eventTipStatLabel, { color: theme.colors.textSecondary }]}>top tip</Text>
            </View>
            <View style={[styles.eventTipStat, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.eventTipStatVal, { color: '#10B981' }]}>
                ${(parseFloat(ev.amount.replace('$', '')) / ev.tippers).toFixed(2)}
              </Text>
              <Text style={[styles.eventTipStatLabel, { color: theme.colors.textSecondary }]}>avg tip</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function AITab({ theme }: { theme: any }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const advicePoints = [
    "Release your next single in late March or early April — you'll catch the post-AFCON rebound and the Burna-driven UK Afrobeats wave simultaneously.",
    "Target London promotion first. Your 23% UK play spike is genre-driven, not reach-driven — you haven't fully capitalised on it yet.",
    "Consider a stripped or acoustic version of your strongest track. Your 78% replay rate tells us listeners want depth, not just moments.",
    "Avoid event announcements in January. AFCON suppresses West Africa engagement every odd year — wait until February.",
    "Your Lagos–London dual-timezone window is an asset. Schedule social content at 7 PM WAT / 7 PM GMT on release days to hit both primetime feeds simultaneously.",
  ];

  return (
    <View style={{ padding: 16 }}>
      {/* Header card */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiHeaderCard}
      >
        <View style={styles.aiHeaderTop}>
          <View style={styles.aiIconCircle}>
            <Ionicons name="sparkles" size={20} color="#A78BFA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiHeaderTitle}>Career Intelligence Report</Text>
            <Text style={styles.aiHeaderSub}>Generated from 6 external data signals · Jun 2026</Text>
          </View>
        </View>
        <View style={styles.aiScoreRow}>
          <View style={styles.aiScoreItem}>
            <Text style={styles.aiScoreVal}>74</Text>
            <Text style={styles.aiScoreLabel}>Momentum Score</Text>
          </View>
          <View style={styles.aiScoreDivider} />
          <View style={styles.aiScoreItem}>
            <Text style={[styles.aiScoreVal, { color: '#34D399' }]}>↑ 12pts</Text>
            <Text style={styles.aiScoreLabel}>vs last quarter</Text>
          </View>
          <View style={styles.aiScoreDivider} />
          <View style={styles.aiScoreItem}>
            <Text style={[styles.aiScoreVal, { color: '#FCD34D' }]}>Strong</Text>
            <Text style={styles.aiScoreLabel}>Outlook</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>SIGNALS ANALYSED</Text>

      {AI_FACTORS.map((factor, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.8}
          onPress={() => setExpanded(expanded === i ? null : i)}
          style={[styles.factorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={styles.factorHeader}>
            <View style={[styles.factorIconWrap, { backgroundColor: factor.color + '18' }]}>
              <Ionicons name={factor.icon as any} size={16} color={factor.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.factorCat, { color: theme.colors.textSecondary }]}>{factor.category}</Text>
              <Text style={[styles.factorTitle, { color: theme.colors.text }]}>{factor.title}</Text>
            </View>
            <View style={[styles.impactBadge, { backgroundColor: factor.color + '18' }]}>
              <Text style={[styles.impactText, { color: factor.color }]}>{factor.impact}</Text>
            </View>
          </View>
          {expanded === i && (
            <Text style={[styles.factorDetail, { color: theme.colors.textSecondary, borderTopColor: theme.colors.border }]}>
              {factor.detail}
            </Text>
          )}
          <View style={styles.factorExpand}>
            <Ionicons
              name={expanded === i ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* AI Advice */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>AI RECOMMENDATIONS</Text>
      <LinearGradient
        colors={['rgba(139,92,246,0.12)', 'rgba(236,72,153,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.adviceCard, { borderColor: 'rgba(139,92,246,0.25)' }]}
      >
        <View style={styles.adviceHeader}>
          <Ionicons name="bulb-outline" size={18} color="#A78BFA" />
          <Text style={[styles.adviceTitle, { color: theme.colors.text }]}>What the data is telling you</Text>
        </View>
        {advicePoints.map((point, i) => (
          <View key={i} style={styles.adviceRow}>
            <View style={[styles.adviceDot, { backgroundColor: '#A78BFA' }]} />
            <Text style={[styles.adviceText, { color: theme.colors.textSecondary }]}>{point}</Text>
          </View>
        ))}
        <Text style={[styles.adviceDisclaimer, { color: theme.colors.textSecondary }]}>
          Analysis draws on Afrobeats streaming indices, SoundBridge platform behaviour, public touring data, and seasonal consumption models. Updated monthly.
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 8 },
  headerTitle: {
    fontFamily: Typography.headerMedium.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '300', letterSpacing: -0.3 },
  sectionTitle: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: { borderRadius: 14, padding: 0, overflow: 'hidden' },

  // Total card
  totalCard: { borderRadius: 16, padding: 20 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', letterSpacing: 0.5, marginBottom: 4 },
  totalAmount: { color: '#fff', fontSize: 40, fontWeight: '700', letterSpacing: -1, marginBottom: 4 },
  totalSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '300', marginBottom: 14 },
  totalRow: { flexDirection: 'row', gap: 10 },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  totalPillText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  tipFlag: { fontSize: 18, marginTop: 1 },
  tipMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  tipCity: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', letterSpacing: -0.3 },
  tipAmount: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '600', letterSpacing: -0.3 },
  tipBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipBarBg: { flex: 1, height: 3, borderRadius: 2 },
  tipBarFill: { height: 3, borderRadius: 2 },
  tipPlays: { fontFamily: Typography.body.fontFamily, fontSize: 10, fontWeight: '300', width: 62, textAlign: 'right' },

  // Event tips
  eventTipCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  eventTipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTipName: { fontFamily: Typography.body.fontFamily, fontSize: 14, fontWeight: '600', letterSpacing: -0.3, flex: 1, paddingRight: 8 },
  eventTipAmount: { fontFamily: Typography.body.fontFamily, fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  eventTipMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontFamily: Typography.body.fontFamily, fontSize: 12, fontWeight: '300' },
  eventTipStats: { flexDirection: 'row', gap: 8 },
  eventTipStat: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  eventTipStatVal: { fontFamily: Typography.body.fontFamily, fontSize: 16, fontWeight: '600', letterSpacing: -0.3, marginBottom: 2 },
  eventTipStatLabel: { fontFamily: Typography.body.fontFamily, fontSize: 10, fontWeight: '300' },

  // AI header
  aiHeaderCard: { borderRadius: 16, padding: 18 },
  aiHeaderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  aiIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.3, marginBottom: 3 },
  aiHeaderSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '300' },
  aiScoreRow: { flexDirection: 'row', alignItems: 'center' },
  aiScoreItem: { flex: 1, alignItems: 'center' },
  aiScoreVal: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5, marginBottom: 3 },
  aiScoreLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '300', textAlign: 'center' },
  aiScoreDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Factors
  factorCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  factorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  factorIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  factorCat: { fontFamily: Typography.body.fontFamily, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginBottom: 3 },
  factorTitle: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '500', letterSpacing: -0.3, lineHeight: 18 },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  impactText: { fontFamily: Typography.body.fontFamily, fontSize: 11, fontWeight: '600' },
  factorDetail: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 13,
    fontWeight: '300',
    lineHeight: 20,
    letterSpacing: -0.3,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  factorExpand: { alignItems: 'center', marginTop: 8 },

  // Advice
  adviceCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  adviceTitle: { fontFamily: Typography.body.fontFamily, fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  adviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  adviceDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  adviceText: { fontFamily: Typography.body.fontFamily, fontSize: 13, fontWeight: '300', lineHeight: 20, letterSpacing: -0.3, flex: 1 },
  adviceDisclaimer: {
    fontFamily: Typography.body.fontFamily,
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 0.1,
    lineHeight: 15,
    marginTop: 10,
    opacity: 0.6,
  },
});
