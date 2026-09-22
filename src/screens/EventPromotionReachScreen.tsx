import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import eventPromotionReachService, { PromotionReach } from '../services/EventPromotionReachService';
import PromotionReachVisualization from '../components/PromotionReachVisualization';

interface FunnelCardProps {
  label: string;
  value: number | null;
  color: string;
  theme: any;
}

function FunnelCard({ label, value, color, theme }: FunnelCardProps) {
  return (
    <View style={[styles.funnelCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {value === null ? (
        <>
          <Text style={[styles.funnelValueDash, { color: theme.colors.textMuted }]}>—</Text>
          <Text style={[styles.funnelNotTracked, { color: theme.colors.textMuted }]}>Not tracked yet</Text>
        </>
      ) : (
        <Text style={[styles.funnelValue, { color }]}>{value.toLocaleString()}</Text>
      )}
      <Text style={[styles.funnelLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function EventPromotionReachScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { eventId, eventTitle } = (route.params as { eventId: string; eventTitle?: string }) || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [centerLabel, setCenterLabel] = useState<string>('Your location');
  const [reach, setReach] = useState<PromotionReach | null>(null);

  const loadData = useCallback(async () => {
    if (!eventId) {
      setError(true);
      setLoading(false);
      return;
    }
    setError(false);
    try {
      const [{ data: eventRow }, reachData] = await Promise.all([
        supabase.from('events').select('city, location').eq('id', eventId).maybeSingle(),
        eventPromotionReachService.getPromotionReach(eventId),
      ]);

      setCenterLabel(eventRow?.city || eventRow?.location || 'Your location');
      setReach(reachData);
    } catch (err) {
      console.error('EventPromotionReachScreen.loadData:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const areas = (reach?.byCity || [])
    .filter((row) => row.sentCount > 0)
    .map((row) => ({ city: row.city, count: row.sentCount }));

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="information-circle-outline" size={28} color={theme.colors.textSecondary} />
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Couldn't load promotion reach for this event.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {eventTitle ? (
            <Text style={[styles.eventTitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {eventTitle}
            </Text>
          ) : null}

          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>GEOGRAPHIC REACH</Text>
          <PromotionReachVisualization centerLabel={centerLabel} areas={areas} />

          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 28 }]}>
            ENGAGEMENT
          </Text>
          <View style={styles.funnelRow}>
            <FunnelCard label="Sent" value={reach?.funnel.sent ?? 0} color={theme.colors.accentBlue} theme={theme} />
            <FunnelCard
              label="Reached"
              value={reach?.funnel.reached ?? 0}
              color={theme.colors.accentPurple}
              theme={theme}
            />
            <FunnelCard
              label="Opened"
              value={reach?.funnel.opened ?? 0}
              color={theme.colors.accentPink}
              theme={theme}
            />
            <FunnelCard
              label="Booked"
              value={reach?.funnel.booked ?? 0}
              color={theme.colors.success}
              theme={theme}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Header
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

  // Content
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

  // Funnel
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
  funnelValueDash: {
    fontSize: 18,
    fontWeight: '700',
  },
  funnelNotTracked: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  funnelLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 6,
  },
});
