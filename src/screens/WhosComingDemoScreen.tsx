// TEMPORARY — marketing/ad demo only. Reuses the real WhosComingVisualization component
// (same one EventDetailsScreen.tsx shows the organiser) with mock attendees trickling in one
// at a time, so the entrance animation (edge -> centre, staggered) plays naturally for
// screen-recording instead of everyone appearing at once. Not reading anything from Supabase,
// not linked from any user-facing flow other than a clearly-labeled row in Profile settings.
// Remove this file, its App.tsx route, and that settings row once the ad is captured.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import WhosComingVisualization from '../components/WhosComingVisualization';
import type { EventCheckin, CheckinStatus } from '../services/EventCheckinService';

const MOCK_EVENT_TITLE = "Port Harcourt, We're Outside!";
const MOCK_CENTER_LABEL = 'GRA Phase 3';

// (id, status) pairs only — the rest of EventCheckin is filled in synthetically below.
// Mostly "close" with a couple "difficulty" for visual variety against the legend.
const MOCK_ARRIVALS: { id: string; status: CheckinStatus }[] = [
  { id: 'demo-1', status: 'close' },
  { id: 'demo-2', status: 'close' },
  { id: 'demo-3', status: 'difficulty' },
  { id: 'demo-4', status: 'close' },
  { id: 'demo-5', status: 'close' },
  { id: 'demo-6', status: 'close' },
  { id: 'demo-7', status: 'difficulty' },
  { id: 'demo-8', status: 'close' },
  { id: 'demo-9', status: 'close' },
];

function makeMockCheckin(id: string, status: CheckinStatus): EventCheckin {
  const now = new Date().toISOString();
  return {
    id,
    event_id: 'demo-event',
    user_id: id,
    status,
    created_at: now,
    updated_at: now,
  };
}

export default function WhosComingDemoScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [checkins, setCheckins] = useState<EventCheckin[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const revealNext = () => {
      if (indexRef.current >= MOCK_ARRIVALS.length) return;
      const next = MOCK_ARRIVALS[indexRef.current];
      indexRef.current += 1;
      setCheckins((prev) => [...prev, makeMockCheckin(next.id, next.status)]);
      // Randomised interval between arrivals for a more organic "people trickling in" feel
      // than a fixed metronome — 1.2s-1.8s.
      timer = setTimeout(revealNext, 1200 + Math.random() * 600);
    };

    timer = setTimeout(revealNext, 700);
    return () => clearTimeout(timer);
  }, []);

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
          Who's Coming
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eventTitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {MOCK_EVENT_TITLE}
        </Text>

        <WhosComingVisualization checkins={checkins} centerLabel={MOCK_CENTER_LABEL} />
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
});
