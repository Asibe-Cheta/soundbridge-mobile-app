import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';
import { calendarIntegrationService } from '../services/CalendarIntegrationService';

interface PollResult {
  selected_option: string;
  selected_date: string;
  selected_location: string;
  vote_count: number;
  vote_pct: number;
}

interface Campaign {
  id: string;
  total_recipients: number;
  total_responses: number;
  expires_at: string;
  status: string;
}

interface LocationAggregate {
  location: string;
  total_votes: number;
}

export default function PollResultsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { session } = useAuth();

  const campaignId: string = route?.params?.campaignId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [locationAgg, setLocationAgg] = useState<LocationAggregate[]>([]);
  const [calendarInsight, setCalendarInsight] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !campaignId) return;
    try {
      const [campaignRes, resultsRes] = await Promise.all([
        supabase
          .from('poll_campaigns')
          .select('id,total_recipients,total_responses,expires_at,status')
          .eq('id', campaignId)
          .single(),
        supabase.rpc('get_poll_results', { p_campaign_id: campaignId }),
      ]);

      if (campaignRes.data) setCampaign(campaignRes.data as Campaign);

      if (resultsRes.data) {
        const rows = resultsRes.data as PollResult[];
        setResults(rows);

        // Aggregate by location
        const locMap: Record<string, number> = {};
        for (const r of rows) {
          locMap[r.selected_location] = (locMap[r.selected_location] ?? 0) + r.vote_count;
        }
        const sorted = Object.entries(locMap)
          .map(([location, total_votes]) => ({ location, total_votes }))
          .sort((a, b) => b.total_votes - a.total_votes);
        setLocationAgg(sorted);
      }

      if (session) {
        const insight = await calendarIntegrationService.getPollAvailabilityInsight(session, campaignId);
        setCalendarInsight(insight);
      }
    } catch (err) {
      console.warn('PollResultsScreen load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, campaignId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const winner = results[0] ?? null;
  const responseRate = campaign && campaign.total_recipients > 0
    ? Math.round((campaign.total_responses / campaign.total_recipients) * 100)
    : 0;

  const daysLeft = campaign
    ? Math.max(0, Math.ceil((new Date(campaign.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  const handleCreateEvent = () => {
    if (!winner) return;
    navigation.navigate('CreateEvent', {
      prefill: {
        title: '',
        location: winner.selected_location,
        event_date: winner.selected_date,
      },
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient?.start ?? '#0a0a0a', theme.colors.backgroundGradient?.end ?? '#1a1a2e']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading poll results...
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient?.start ?? '#0a0a0a', theme.colors.backgroundGradient?.end ?? '#1a1a2e']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Poll Results</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        >
          {/* Response summary */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {campaign?.total_responses ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Responses</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {campaign?.total_recipients ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sent to</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{responseRate}%</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Response rate</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: daysLeft <= 3 ? '#EF4444' : theme.colors.text }]}>
                {daysLeft}d
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Days left</Text>
            </View>
          </View>

          {calendarInsight ? (
            <View style={[styles.insightCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.insightHeader}>
                <Ionicons name="calendar-outline" size={18} color="#4285F4" />
                <Text style={[styles.insightTitle, { color: theme.colors.text }]}>Calendar availability</Text>
              </View>
              <Text style={[styles.insightBody, { color: theme.colors.textSecondary }]}>
                {calendarInsight}
              </Text>
            </View>
          ) : null}

          {results.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="hourglass-outline" size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No responses yet. Check back soon.
              </Text>
            </View>
          ) : (
            <>
              {/* Winning combination */}
              {winner && (
                <LinearGradient
                  colors={['#7C3AED', '#4C1D95']}
                  style={styles.winnerCard}
                >
                  <Ionicons name="trophy" size={24} color="#FCD34D" style={{ marginBottom: 8 }} />
                  <Text style={styles.winnerLabel}>Strongest Option</Text>
                  <Text style={styles.winnerOption}>{winner.selected_option}</Text>
                  <Text style={styles.winnerPct}>
                    {winner.vote_pct}% of respondents chose this
                  </Text>
                </LinearGradient>
              )}

              {/* Full breakdown */}
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Full Breakdown</Text>
              <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                {results.map((r, i) => (
                  <View key={i} style={[styles.resultRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.resultLeft}>
                      <View style={[styles.optionBadge, { backgroundColor: '#8B5CF620' }]}>
                        <Text style={styles.optionBadgeText}>{String.fromCharCode(65 + i)}</Text>
                      </View>
                      <Text style={[styles.resultOption, { color: theme.colors.text }]} numberOfLines={2}>
                        {r.selected_option}
                      </Text>
                    </View>
                    <View style={styles.resultRight}>
                      <Text style={[styles.resultPct, { color: r.vote_pct >= 50 ? '#8B5CF6' : theme.colors.text }]}>
                        {r.vote_pct}%
                      </Text>
                      <Text style={[styles.resultVotes, { color: theme.colors.textSecondary }]}>
                        {r.vote_count} votes
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Location breakdown */}
              {locationAgg.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>By Location</Text>
                  <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    {locationAgg.map((l, i) => (
                      <View key={i} style={[styles.locationRow, { borderBottomColor: theme.colors.border }]}>
                        <Ionicons name="location-outline" size={16} color="#8B5CF6" />
                        <Text style={[styles.locationName, { color: theme.colors.text }]}>{l.location}</Text>
                        <Text style={[styles.locationVotes, { color: theme.colors.textSecondary }]}>
                          {l.total_votes} total votes
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* CTA */}
              {winner && (
                <View style={[styles.ctaCard, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.ctaTitle, { color: theme.colors.text }]}>Ready to make it official?</Text>
                  <Text style={[styles.ctaSub, { color: theme.colors.textSecondary }]}>
                    Create this event with the winning date and location pre-filled.
                  </Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={handleCreateEvent}>
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ctaBtnGradient}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.ctaBtnText}>Create This Event</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  content: { padding: 16 },
  loadingText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  winnerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerLabel: {
    color: '#DDD6FE',
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  winnerOption: {
    color: '#fff',
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  winnerPct: {
    color: '#C4B5FD',
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  resultOption: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  resultRight: { alignItems: 'flex-end' },
  resultPct: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  resultVotes: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  locationName: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  locationVotes: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  insightCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  insightBody: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  ctaCard: {
    borderRadius: 14,
    padding: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  ctaTitle: {
    ...Typography.headerMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  ctaSub: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  ctaBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  ctaBtnText: {
    color: '#fff',
    ...Typography.button,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
