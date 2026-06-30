import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  creatorRevenueService,
  RevenueBySource,
  FanDemographic,
  TopFan,
  TrackPerformance,
  MonthlyGrowth,
} from '../services/CreatorRevenueService';
import { payoutService } from '../services/PayoutService';
import { audienceIntelligenceService, TrackQualityData, AffinityFan } from '../services/AudienceIntelligenceService';
import { SystemTypography as Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

type DateRangeTab = 'week' | 'month' | 'year';
type TabType = 'overview' | 'fans' | 'tracks' | 'growth' | 'audience' | 'event-poll' | 'ai-advisor';

const CreatorInsightsDashboardScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { session, userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRangeTab>('month');
  const [selectedTab, setSelectedTab] = useState<TabType>('overview');

  // Audience intelligence state
  const [qualitySignals, setQualitySignals] = useState<TrackQualityData[]>([]);
  const [affinityFans, setAffinityFans] = useState<AffinityFan[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Event poll state
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [interestedCount, setInterestedCount] = useState(0);
  const [pollLoading, setPollLoading] = useState(false);

  // Data state
  const [revenueBySource, setRevenueBySource] = useState<RevenueBySource | null>(null);
  const [fanDemographics, setFanDemographics] = useState<FanDemographic[]>([]);
  const [topFans, setTopFans] = useState<TopFan[]>([]);
  const [trackPerformance, setTrackPerformance] = useState<TrackPerformance[]>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowth[]>([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!session) return;

    try {
      const startDate = getStartDate(selectedRange);
      const endDate = new Date().toISOString();

      const [revenue, demographics, fans, tracks, growth, creatorRevenue, allTimeRevenue] = await Promise.all([
        creatorRevenueService.getRevenueBySource(session, startDate, endDate),
        creatorRevenueService.getFanDemographics(session, 10, startDate, endDate),
        creatorRevenueService.getTopFans(session, 10, startDate, endDate),
        creatorRevenueService.getTrackPerformance(session, 10, startDate, endDate),
        creatorRevenueService.getMonthlyGrowth(session, 6),
        payoutService.getCreatorRevenue(session).catch(() => null),
        creatorRevenueService.getRevenueBySource(session).catch(() => null), // all-time, no date filter
      ]);

      setRevenueBySource(revenue);
      setFanDemographics(demographics);
      setTopFans(fans);
      setTrackPerformance(tracks);
      setMonthlyGrowth(growth);

      if (creatorRevenue) {
        setPendingBalance(creatorRevenue.pending_balance || 0);
      }
      // Use wallet_transactions (all-time) for lifetime — more accurate than summary table
      setLifetimeEarnings(allTimeRevenue?.total?.amount ?? creatorRevenue?.total_earned ?? 0);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStartDate = (range: DateRangeTab): string => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const fetchAudienceData = useCallback(async () => {
    if (!session) return;
    setAudienceLoading(true);
    try {
      const [signals, fans] = await Promise.all([
        audienceIntelligenceService.getTrackQualitySignals(session),
        audienceIntelligenceService.getTopAffinityFans(session, 10),
      ]);
      setQualitySignals(signals);
      setAffinityFans(fans);
    } catch (err) {
      console.error('❌ Error fetching audience data:', err);
    } finally {
      setAudienceLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (selectedTab === 'audience' && qualitySignals.length === 0) {
      fetchAudienceData();
    }
    if (selectedTab === 'event-poll' && !pollLoading && activeCampaign === null && interestedCount === 0) {
      fetchPollData();
    }
  }, [selectedTab, fetchAudienceData, qualitySignals.length]);

  const fetchPollData = async () => {
    if (!session) return;
    setPollLoading(true);
    try {
      const [campaignRes, countRes] = await Promise.all([
        supabase
          .from('poll_campaigns')
          .select('id,total_recipients,total_responses,expires_at,status,sent_at')
          .eq('creator_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('live_interest_responses')
          .select('user_id', { count: 'exact', head: true })
          .eq('responded_yes', true)
          .in('track_id',
            (await supabase
              .from('audio_tracks')
              .select('id')
              .eq('creator_id', session.user.id)
            ).data?.map((t: any) => t.id) ?? []
          ),
      ]);
      setActiveCampaign(campaignRes.data ?? null);
      setInterestedCount(countRes.count ?? 0);
    } catch (err) {
      console.error('Poll data error:', err);
    } finally {
      setPollLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP'): string => {
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatChange = (change?: number): { text: string; color: string; icon: string } => {
    if (!change) return { text: '0%', color: theme.colors.textSecondary, icon: 'remove-outline' };
    const isPositive = change > 0;
    return {
      text: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
      color: isPositive ? '#10B981' : '#EF4444',
      icon: isPositive ? 'trending-up-outline' : 'trending-down-outline',
    };
  };

  const getSourceIcon = (source: string): string => {
    const icons: Record<string, string> = {
      tips: 'heart-outline',
      eventTickets: 'ticket-outline',
      serviceBookings: 'calendar-outline',
      downloads: 'download-outline',
    };
    return icons[source] || 'cash-outline';
  };

  const getSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      tips: 'Tips',
      eventTickets: 'Event Tickets',
      serviceBookings: 'Service Bookings',
      downloads: 'Downloads',
    };
    return labels[source] || 'Other';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading insights...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderOverviewTab = () => (
    <>
      {/* Revenue by Source */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Revenue Breakdown</Text>
        {revenueBySource && Object.entries(revenueBySource)
          .filter(([key]) => key !== 'total')
          .map(([source, data]) => (
            <View key={source} style={[styles.sourceRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.sourceLeft}>
                <View style={[styles.sourceIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name={getSourceIcon(source) as any} size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.sourceLabel, { color: theme.colors.text }]}>{getSourceLabel(source)}</Text>
                  <Text style={[styles.sourceCount, { color: theme.colors.textSecondary }]}>
                    {(data as any).count} {(data as any).count === 1 ? 'transaction' : 'transactions'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.sourceAmount, { color: theme.colors.text }]}>
                {formatCurrency((data as any).amount, (data as any).currency)}
              </Text>
            </View>
          ))}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCurrency(pendingBalance)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="trending-up-outline" size={24} color="#10B981" />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCurrency(lifetimeEarnings)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Lifetime</Text>
        </View>
      </View>
    </>
  );

  const renderFansTab = () => (
    <>
      {/* Top Cities */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Cities</Text>
        {fanDemographics.slice(0, 5).map((demo, index) => (
          <View key={`${demo.city}-${demo.country}`} style={[styles.cityRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.cityLeft}>
              <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.rankText, { color: theme.colors.primary }]}>{index + 1}</Text>
              </View>
              <View>
                <Text style={[styles.cityName, { color: theme.colors.text }]}>{demo.city}</Text>
                <Text style={[styles.cityCountry, { color: theme.colors.textSecondary }]}>{demo.country}</Text>
              </View>
            </View>
            <View style={styles.cityRight}>
              <Text style={[styles.cityFans, { color: theme.colors.text }]}>{demo.fanCount} fans</Text>
              <Text style={[styles.citySpent, { color: theme.colors.textSecondary }]}>
                {formatCurrency(demo.totalSpent)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Top Fans */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Supporters</Text>
        {topFans.slice(0, 5).map((fan, index) => (
          <View key={fan.id} style={[styles.fanRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.fanLeft}>
              <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.rankText, { color: theme.colors.primary }]}>{index + 1}</Text>
              </View>
              {fan.avatarUrl ? (
                <Image source={{ uri: fan.avatarUrl }} style={styles.fanAvatar} />
              ) : (
                <View style={[styles.fanAvatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                </View>
              )}
              <View>
                <Text style={[styles.fanName, { color: theme.colors.text }]}>{fan.username}</Text>
                <Text style={[styles.fanLocation, { color: theme.colors.textSecondary }]}>
                  {fan.city ? `${fan.city}, ${fan.country}` : 'Unknown location'}
                </Text>
              </View>
            </View>
            <View style={styles.fanRight}>
              <Text style={[styles.fanAmount, { color: theme.colors.text }]}>{formatCurrency(fan.totalSpent)}</Text>
              <Text style={[styles.fanStats, { color: theme.colors.textSecondary }]}>
                {fan.tipsGiven} tips • {fan.ticketsPurchased} tickets
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  const renderTracksTab = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Track Performance</Text>
      {trackPerformance.map((track, index) => (
        <View key={track.id} style={[styles.trackRow, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.trackLeft}>
            <Text style={[styles.trackRank, { color: theme.colors.textSecondary }]}>{index + 1}</Text>
            {track.coverArt ? (
              <Image source={{ uri: track.coverArt }} style={styles.trackCover} />
            ) : (
              <View style={[styles.trackCoverPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="musical-note" size={20} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {track.title}
              </Text>
              <View style={styles.trackStats}>
                <View style={styles.trackStat}>
                  <Ionicons name="play-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                    {formatNumber(track.plays)}
                  </Text>
                </View>
                <View style={styles.trackStat}>
                  <Ionicons name="heart-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                    {formatNumber(track.likes)}
                  </Text>
                </View>
                <View style={styles.trackStat}>
                  <Ionicons name="share-social-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                    {formatNumber(track.shares)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderGrowthTab = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Monthly Growth (Last 6 Months)</Text>
      {monthlyGrowth.map((month, index) => (
        <View key={month.month} style={[styles.growthRow, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.growthLeft}>
            <Text style={[styles.growthMonth, { color: theme.colors.text }]}>{month.month}</Text>
            <View style={styles.growthMetrics}>
              <Text style={[styles.growthMetric, { color: theme.colors.textSecondary }]}>
                {month.newFollowers} new followers
              </Text>
              <Text style={[styles.growthMetric, { color: theme.colors.textSecondary }]}>
                {month.engagement} engagements
              </Text>
            </View>
          </View>
          <View style={styles.growthRight}>
            <Text style={[styles.growthRevenue, { color: theme.colors.text }]}>
              {formatCurrency(month.revenue)}
            </Text>
            {month.revenueChange !== undefined && (
              <View style={[styles.miniChangeIndicator, { backgroundColor: formatChange(month.revenueChange).color + '15' }]}>
                <Ionicons
                  name={formatChange(month.revenueChange).icon as any}
                  size={12}
                  color={formatChange(month.revenueChange).color}
                />
                <Text style={[styles.miniChangeText, { color: formatChange(month.revenueChange).color }]}>
                  {formatChange(month.revenueChange).text}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );


  const subscriptionTier = (userProfile as any)?.subscription_tier;
  const hasPremiumAccess = subscriptionTier === 'premium' || subscriptionTier === 'unlimited';

  const renderEventPollTab = () => {
    if (pollLoading) {
      return (
        <View style={[styles.audienceLoading]}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      );
    }

    const daysLeft = activeCampaign
      ? Math.max(0, Math.ceil((new Date(activeCampaign.expires_at).getTime() - Date.now()) / 86400000))
      : 0;

    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {/* Interested listener count */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="radio-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 2 }]}>
                {interestedCount} listeners want you live
              </Text>
              <Text style={[{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }]}>
                Across all tracks with live interest enabled
              </Text>
            </View>
          </View>
        </View>

        {/* Active campaign summary */}
        {activeCampaign ? (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Active Poll</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Sent to', value: String(activeCampaign.total_recipients) },
                { label: 'Responses', value: String(activeCampaign.total_responses) },
                { label: 'Days left', value: `${daysLeft}d` },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700' }}>{s.value}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{s.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.audienceLockUpgradeBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => navigation.navigate('PollResults', { campaignId: activeCampaign.id })}
            >
              <Text style={styles.audienceLockUpgradeBtnText}>View Poll Results</Text>
            </TouchableOpacity>
          </View>
        ) : interestedCount >= 25 || interestedCount >= 1 ? (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Send a Date Poll</Text>
            <Text style={[{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16 }]}>
              {interestedCount >= 25
                ? `You have reached ${interestedCount} interested listeners. Send them a poll to find the best date and location.`
                : `You have ${interestedCount} interested listener${interestedCount === 1 ? '' : 's'}. Keep building — you need 25 to unlock the poll.`}
            </Text>
            {interestedCount >= 25 ? (
              <TouchableOpacity
                style={[styles.audienceLockUpgradeBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() => navigation.navigate('EventPollSetup', { interestedCount })}
              >
                <Text style={styles.audienceLockUpgradeBtnText}>Ask Your Audience When & Where</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.audienceLockUpgradeBtn, { backgroundColor: theme.colors.border }]}>
                <Text style={[styles.audienceLockUpgradeBtnText, { color: theme.colors.textSecondary }]}>
                  Need {25 - interestedCount} more responses to unlock
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="radio-outline" size={32} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' }]}>
              No live interest responses yet. Enable live interest on your tracks to start collecting audience demand data.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAudienceTab = () => {
    if (audienceLoading) {
      return (
        <View style={styles.audienceLoading}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.audienceLoadingText, { color: theme.colors.textSecondary }]}>
            Building your audience picture...
          </Text>
        </View>
      );
    }

    if (!hasPremiumAccess) {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <LinearGradient colors={['#1e1b4b', '#3b0764']} style={styles.audienceLockCard}>
            <Ionicons name="analytics-outline" size={40} color="#a78bfa" style={{ marginBottom: 12 }} />
            <Text style={styles.audienceLockTitle}>Audience Intelligence</Text>
            <Text style={styles.audienceLockBody}>
              See which tracks are resonating, who your true fans are, and how engagement signals build your quality score — all driven by real listener behaviour on SoundBridge.
            </Text>
            <View style={styles.audiencePreviewRows}>
              {[
                { label: 'Repeat listen rate', value: '—' },
                { label: 'Tip conversion', value: '—' },
                { label: 'Live interest', value: '—' },
              ].map(item => (
                <View key={item.label} style={styles.audiencePreviewRow}>
                  <Text style={styles.audiencePreviewLabel}>{item.label}</Text>
                  <View style={styles.audiencePreviewBlur}>
                    <Text style={styles.audiencePreviewBlurText}>████</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.audienceLockUpgradeBtn}
              onPress={() => navigation.navigate('UpgradeScreen')}
            >
              <Text style={styles.audienceLockUpgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      );
    }

    const isEmpty = qualitySignals.length === 0;

    return (
      <>
        {/* Quality Score Leaderboard */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Track Quality Scores</Text>
          <Text style={[styles.audienceSectionSub, { color: theme.colors.textSecondary }]}>
            Based on repeat listens, tips, live interest, and shares
          </Text>
          {isEmpty ? (
            <Text style={[styles.audienceEmptyText, { color: theme.colors.textSecondary }]}>
              Quality signals build as listeners engage with your tracks. Check back after your first plays.
            </Text>
          ) : (
            qualitySignals.slice(0, 8).map((track) => (
              <View key={track.track_id} style={[styles.qualityRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.qualityLeft}>
                  {track.cover_image_url ? (
                    <Image source={{ uri: track.cover_image_url }} style={styles.qualityCover} />
                  ) : (
                    <View style={[styles.qualityCoverPlaceholder, { backgroundColor: '#8B5CF620' }]}>
                      <Ionicons name="musical-note" size={16} color="#8B5CF6" />
                    </View>
                  )}
                  <View style={styles.qualityInfo}>
                    <Text style={[styles.qualityTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {track.track_title}
                    </Text>
                    <View style={styles.qualityMeta}>
                      <Text style={[styles.qualityMetaText, { color: theme.colors.textSecondary }]}>
                        {track.total_plays} plays · {track.unique_listeners} listeners
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.qualityScoreCol}>
                  <View style={[styles.qualityScoreBadge, {
                    backgroundColor: track.quality_score >= 70 ? '#10B98120' : track.quality_score >= 40 ? '#F59E0B20' : '#EF444420',
                  }]}>
                    <Text style={[styles.qualityScoreText, {
                      color: track.quality_score >= 70 ? '#10B981' : track.quality_score >= 40 ? '#F59E0B' : '#EF4444',
                    }]}>
                      {track.quality_score.toFixed(0)}
                    </Text>
                  </View>
                  <View style={[styles.qualityBar, { backgroundColor: theme.colors.border }]}>
                    <View style={[styles.qualityBarFill, {
                      width: `${Math.min(100, track.quality_score)}%` as any,
                      backgroundColor: track.quality_score >= 70 ? '#10B981' : track.quality_score >= 40 ? '#F59E0B' : '#EF4444',
                    }]} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Signal Breakdown for top track */}
        {qualitySignals.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Signal Breakdown</Text>
            <Text style={[styles.audienceSectionSub, { color: theme.colors.textSecondary }]}>
              Top track: {qualitySignals[0].track_title}
            </Text>
            {[
              { label: 'Repeat listen rate', value: `${(qualitySignals[0].repeat_listens / Math.max(1, qualitySignals[0].total_plays) * 100).toFixed(1)}%`, icon: 'repeat-outline', weight: '40%' },
              { label: 'Tip conversion', value: `${(qualitySignals[0].tip_rate * 100).toFixed(1)}%`, icon: 'heart-outline', weight: '35%' },
              { label: 'Live interest', value: `${(qualitySignals[0].live_interest_rate * 100).toFixed(1)}%`, icon: 'radio-outline', weight: '15%' },
              { label: 'Share + bookmark rate', value: `${((qualitySignals[0].share_count + qualitySignals[0].bookmark_count) / Math.max(1, qualitySignals[0].unique_listeners) * 100).toFixed(1)}%`, icon: 'share-social-outline', weight: '10%' },
            ].map(signal => (
              <View key={signal.label} style={[styles.signalRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.signalLeft}>
                  <Ionicons name={signal.icon as any} size={18} color="#8B5CF6" />
                  <View>
                    <Text style={[styles.signalLabel, { color: theme.colors.text }]}>{signal.label}</Text>
                    <Text style={[styles.signalWeight, { color: theme.colors.textSecondary }]}>
                      {signal.weight} of quality score
                    </Text>
                  </View>
                </View>
                <Text style={[styles.signalValue, { color: theme.colors.text }]}>{signal.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Affinity Fans */}
        {subscriptionTier === 'unlimited' && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Highest Affinity Listeners</Text>
            <Text style={[styles.audienceSectionSub, { color: theme.colors.textSecondary }]}>
              Listeners who keep coming back to your music
            </Text>
            {affinityFans.length === 0 ? (
              <Text style={[styles.audienceEmptyText, { color: theme.colors.textSecondary }]}>
                Affinity data grows as listeners return to your tracks.
              </Text>
            ) : (
              affinityFans.map((fan, index) => (
                <View key={fan.user_id} style={[styles.affinityRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.affinityLeft}>
                    <View style={[styles.rankBadge, { backgroundColor: '#8B5CF620' }]}>
                      <Text style={[styles.rankText, { color: '#8B5CF6' }]}>{index + 1}</Text>
                    </View>
                    {fan.avatar_url ? (
                      <Image source={{ uri: fan.avatar_url }} style={styles.affinityAvatar} />
                    ) : (
                      <View style={[styles.affinityAvatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
                      </View>
                    )}
                    <View>
                      <Text style={[styles.affinityUsername, { color: theme.colors.text }]}>@{fan.username}</Text>
                      <Text style={[styles.affinityStats, { color: theme.colors.textSecondary }]}>
                        {fan.repeat_listens} repeat listens · {fan.tips_sent} tips
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.affinityScoreBadge, { backgroundColor: '#8B5CF620' }]}>
                    <Text style={[styles.affinityScoreText, { color: '#8B5CF6' }]}>
                      {fan.affinity_score.toFixed(0)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {subscriptionTier === 'premium' && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.audienceUnlimitedTeaser}>
              <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.audienceUnlimitedTeaserText, { color: theme.colors.textSecondary }]}>
                Upgrade to Unlimited to see your highest-affinity listeners
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 8 }} />
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Creator Insights</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WalletScreen')} style={styles.walletButton}>
          <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Total Earnings Card */}
        <LinearGradient
          colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.totalCard, { backgroundColor: theme.colors.card }]}
        >
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
            {selectedRange === 'week' ? 'Last 7 Days' : selectedRange === 'month' ? 'Last 30 Days' : 'Last 365 Days'}
          </Text>
          <Text style={[styles.totalAmount, { color: theme.colors.text }]}>
            {revenueBySource ? formatCurrency(revenueBySource.total.amount, revenueBySource.total.currency) : '£0.00'}
          </Text>
          {revenueBySource?.total.change_percentage !== undefined && (
            <View style={[styles.changeBadge, { backgroundColor: formatChange(revenueBySource.total.change_percentage).color + '20' }]}>
              <Ionicons
                name={formatChange(revenueBySource.total.change_percentage).icon as any}
                size={16}
                color={formatChange(revenueBySource.total.change_percentage).color}
              />
              <Text style={[styles.changeText, { color: formatChange(revenueBySource.total.change_percentage).color }]}>
                {formatChange(revenueBySource.total.change_percentage).text} from previous period
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Date Range Selector */}
        <View style={styles.rangeSelector}>
          {(['week', 'month', 'year'] as DateRangeTab[]).map(range => (
            <TouchableOpacity
              key={range}
              onPress={() => setSelectedRange(range)}
              style={[
                styles.rangeTab,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                selectedRange === range && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.rangeTabText,
                  { color: theme.colors.text },
                  selectedRange === range && { color: '#FFFFFF' },
                ]}
              >
                {range === 'week' ? '7D' : range === 'month' ? '30D' : '1Y'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabSelector}>
          {(['overview', 'fans', 'tracks', 'growth', 'audience', 'event-poll', 'ai-advisor'] as TabType[]).map(tab => {
            const labelMap: Record<TabType, string> = {
              overview: 'Overview', fans: 'Fans', tracks: 'Tracks', growth: 'Growth',
              audience: '◈ Audience', 'event-poll': '⬡ Event Poll', 'ai-advisor': '✦ AI Advisor',
            };
            const label = labelMap[tab];
            const isAI = tab === 'ai-advisor';
            const isAudience = tab === 'audience';
            const isPoll = tab === 'event-poll';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={[
                  styles.tab,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  selectedTab === tab && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  isAI && { borderColor: '#7c3aed', borderWidth: 1 },
                  isAI && selectedTab === tab && { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
                  isAudience && { borderColor: '#8B5CF6', borderWidth: 1 },
                  isAudience && selectedTab === tab && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                  isPoll && { borderColor: '#10B981', borderWidth: 1 },
                  isPoll && selectedTab === tab && { backgroundColor: '#10B981', borderColor: '#10B981' },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isAI ? '#a78bfa' : isAudience ? '#8B5CF6' : isPoll ? '#10B981' : theme.colors.text },
                    selectedTab === tab && { color: '#FFFFFF' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'fans' && renderFansTab()}
        {selectedTab === 'tracks' && renderTracksTab()}
        {selectedTab === 'growth' && renderGrowthTab()}
        {selectedTab === 'audience' && renderAudienceTab()}
        {selectedTab === 'event-poll' && renderEventPollTab()}
        {selectedTab === 'ai-advisor' && (
          <View style={styles.aiComingSoon}>
            <LinearGradient
              colors={['#3b0764', '#1e1b4b']}
              style={styles.aiComingSoonCard}
            >
              <Ionicons name="sparkles" size={48} color="#a78bfa" style={{ marginBottom: 16 }} />
              <Text style={styles.aiComingSoonTitle}>AI Career Advisor</Text>
              <Text style={styles.aiComingSoonSubtitle}>Coming Soon</Text>
              <Text style={styles.aiComingSoonBody}>
                Your personal AI music career coach — analysing your growth, suggesting your next moves, and helping you build your audience strategically.
              </Text>
              <View style={styles.aiComingSoonBadge}>
                <Text style={styles.aiComingSoonBadgeText}>Notify me when it's live</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  walletButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  totalCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  totalLabel: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  totalAmount: {
    ...Typography.headerLarge,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    marginBottom: 12,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  changeText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  rangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  rangeTabText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  tabSelector: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tabText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  aiComingSoon: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  aiComingSoonCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
  },
  aiComingSoonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e9d5ff',
    marginBottom: 6,
    textAlign: 'center',
  },
  aiComingSoonSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  aiComingSoonBody: {
    fontSize: 14,
    color: '#c4b5fd',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  aiComingSoonBadge: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  aiComingSoonBadgeText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceLabel: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  sourceCount: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sourceAmount: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  cityName: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  cityCountry: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  cityRight: {
    alignItems: 'flex-end',
  },
  cityFans: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  citySpent: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  fanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fanAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  fanAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanName: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  fanLocation: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  fanRight: {
    alignItems: 'flex-end',
  },
  fanAmount: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  fanStats: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  trackRank: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    width: 24,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  trackCoverPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    gap: 12,
  },
  trackStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackStatText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  growthLeft: {
    flex: 1,
  },
  growthMonth: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  growthMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  growthMetric: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  growthRight: {
    alignItems: 'flex-end',
  },
  growthRevenue: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniChangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  miniChangeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  audienceLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  audienceLoadingText: {
    marginTop: 12,
    fontSize: 14,
    ...Typography.label,
    lineHeight: 20,
  },
  audienceLockCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    marginBottom: 16,
  },
  audienceLockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e9d5ff',
    marginBottom: 10,
    textAlign: 'center',
  },
  audienceLockBody: {
    fontSize: 14,
    color: '#c4b5fd',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  audiencePreviewRows: {
    width: '100%',
    marginBottom: 24,
  },
  audiencePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.15)',
  },
  audiencePreviewLabel: {
    fontSize: 14,
    color: '#c4b5fd',
  },
  audiencePreviewBlur: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  audiencePreviewBlurText: {
    color: 'rgba(196,181,253,0.4)',
    fontSize: 13,
    letterSpacing: 2,
  },
  audienceLockUpgradeBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  audienceLockUpgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  audienceSectionSub: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: -8,
  },
  audienceEmptyText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 12,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  qualityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  qualityCover: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  qualityCoverPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityInfo: {
    flex: 1,
  },
  qualityTitle: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  qualityMeta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  qualityMetaText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
  },
  qualityScoreCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 60,
  },
  qualityScoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qualityScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  qualityBar: {
    width: 48,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  qualityBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  signalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  signalLabel: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  signalWeight: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  signalValue: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  affinityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  affinityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  affinityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  affinityAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affinityUsername: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  affinityStats: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  affinityScoreBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  affinityScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  audienceUnlimitedTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  audienceUnlimitedTeaserText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
});

export default CreatorInsightsDashboardScreen;
