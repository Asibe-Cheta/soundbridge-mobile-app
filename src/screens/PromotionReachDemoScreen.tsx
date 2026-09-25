// TEMPORARY — marketing/ad demo only. Shows the real Promotion Reach visualization UI
// (PromotionReachVisualization + funnel layout, copied from EventPromotionReachScreen.tsx)
// fed with realistic MOCK data instead of a live query, for screen-recording purposes.
// Not linked from anywhere a real user would stumble onto it — reached only via the
// temporary "Promotion Reach Demo (Ad)" row added to ProfileScreen's settings list.
// Remove this file, its App.tsx route, and that settings row once the ad is captured.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import PromotionReachVisualization from '../components/PromotionReachVisualization';

const MOCK_EVENT_TITLE = "Port Harcourt, We're Outside!";
const MOCK_CENTER_LABEL = 'Port Harcourt';

const MOCK_AREAS = [
  { city: 'Yenagoa', count: 342 },
  { city: 'Aba', count: 218 },
  { city: 'Owerri', count: 176 },
  { city: 'Uyo', count: 134 },
  { city: 'Warri', count: 98 },
  { city: 'Calabar', count: 61 },
];

const MOCK_FUNNEL = {
  sent: 1029,
  reached: 872,
  opened: 391,
  booked: 84,
};

interface FunnelCardProps {
  label: string;
  value: number;
  color: string;
  theme: any;
}

function FunnelCard({ label, value, color, theme }: FunnelCardProps) {
  return (
    <View style={[styles.funnelCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.funnelValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={[styles.funnelLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function PromotionReachDemoScreen({ navigation }: any) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          Promotion Reach
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eventTitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {MOCK_EVENT_TITLE}
        </Text>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>GEOGRAPHIC REACH</Text>
        <PromotionReachVisualization centerLabel={MOCK_CENTER_LABEL} areas={MOCK_AREAS} />

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 28 }]}>
          ENGAGEMENT
        </Text>
        <View style={styles.funnelRow}>
          <FunnelCard label="Sent" value={MOCK_FUNNEL.sent} color={theme.colors.accentBlue} theme={theme} />
          <FunnelCard label="Reached" value={MOCK_FUNNEL.reached} color={theme.colors.accentPurple} theme={theme} />
          <FunnelCard label="Opened" value={MOCK_FUNNEL.opened} color={theme.colors.accentPink} theme={theme} />
          <FunnelCard label="Booked" value={MOCK_FUNNEL.booked} color={theme.colors.success} theme={theme} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  funnelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  funnelCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  funnelValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  funnelLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 6,
  },
});
