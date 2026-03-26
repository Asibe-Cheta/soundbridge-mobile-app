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
import { SystemTypography as Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

type DateRangeTab = 'week' | 'month' | 'year';
type TabType = 'overview' | 'fans' | 'tracks' | 'growth' | 'advisor';

const CreatorInsightsDashboardScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { session, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRangeTab>('month');
  const [selectedTab, setSelectedTab] = useState<TabType>('advisor');

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

      const [revenue, demographics, fans, tracks, growth, creatorRevenue] = await Promise.all([
        creatorRevenueService.getRevenueBySource(session, startDate, endDate),
        creatorRevenueService.getFanDemographics(session, 10, startDate, endDate),
        creatorRevenueService.getTopFans(session, 10, startDate, endDate),
        creatorRevenueService.getTrackPerformance(session, 10, startDate, endDate),
        creatorRevenueService.getMonthlyGrowth(session, 6),
        payoutService.getCreatorRevenue(session).catch(() => null),
      ]);

      setRevenueBySource(revenue);
      setFanDemographics(demographics);
      setTopFans(fans);
      setTrackPerformance(tracks);
      setMonthlyGrowth(growth);

      if (creatorRevenue) {
        setPendingBalance(creatorRevenue.pending_balance || 0);
        setLifetimeEarnings(creatorRevenue.total_earned || 0);
      }
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

  // AI Advisor Mock Data
  const aiAdvisorData = {
    greeting: `Good evening, ${user?.user_metadata?.display_name?.split(' ')[0] || 'Creator'}`,
    dailyAction: {
      title: 'Post a track preview today',
      description: 'Your audience is most active Tuesday afternoons — 3 days before your weekend peak. A 30-second preview now is predicted to add 40–60 plays by Friday.',
      projectedRevenue: '+£28–42 projected',
      cta: 'Create Post',
    },
    locationAnalysis: {
      current: {
        city: 'Birmingham',
        fans: 4200,
        yearlyEstimate: 3800,
        competition: 'Low',
      },
      recommended: {
        city: 'Manchester',
        fans: 22000,
        yearlyEstimate: 12400,
        increase: 8600,
        competition: 'Medium',
      },
      hidden: {
        city: 'London',
        fans: 45000,
        yearlyEstimate: 18500,
        competition: 'High',
      },
    },
    diasporaMatch: {
      event: 'Nigerian Independence Day — London',
      fans: 12000,
      avgTip: 5.20,
      localAvgTip: 0.40,
      predictedRevenue: '£3,800–£7,200',
    },
    careerInsights: [
      {
        icon: 'musical-note',
        insight: 'Worship bridge = 3.2× more tips',
        tag: 'Pattern detected',
        tagColor: '#FF6B9D',
      },
      {
        icon: 'time',
        insight: "Friday evenings are your golden window",
        tag: 'Timing edge',
        tagColor: '#F59E0B',
      },
      {
        icon: 'trending-up',
        insight: "You're in the top 15% for your stage",
        tag: 'Top performer',
        tagColor: '#3B82F6',
      },
      {
        icon: 'sparkles',
        insight: '"The Gospel Prevails" is pulling far ahead',
        tag: 'Breakout track',
        tagColor: '#10B981',
      },
    ],
    profileScore: {
      percentage: 40,
      status: 'Room to grow',
      description: 'Top earners in your genre average 85%+ profile completeness.',
      actions: [
        { label: 'Add a professional bio', impact: '+30% service enquiries', completed: false },
        { label: 'Upload 3 more portfolio tracks', impact: '4× more collaboration requests', completed: false },
        { label: 'Add Gospel Producer + Session Singer categories', impact: '+65% discovery appearances', completed: false },
        { label: 'Professional profile photo', impact: 'Already earning +30% bookings', completed: true },
        { label: 'External portfolio links added', impact: 'Completed', completed: true },
      ],
    },
    releaseStrategy: {
      confidence: 78,
      title: 'Upbeat Gospel — Piano Intro',
      details: [
        { label: 'Intro style', value: 'Piano-led' },
        { label: 'Tempo', value: '120–130 BPM' },
        { label: 'Structure', value: 'Worship bridge ending' },
        { label: 'Duration', value: '3:20–3:50' },
      ],
      projection: {
        month1: '£480–£720',
        vsAverage: '+300%',
        avgAmount: '£180',
      },
      sixMonthPlan: [
        { step: 1, title: 'Lead single', description: 'Upbeat gospel, piano intro (your best elements)' },
        { step: 2, title: 'Feature collab', description: 'Gospel producer within 20km, expands your audience' },
        { step: 3, title: 'Mini-EP', description: '60% upbeat, 40% worship — your top performing styles' },
      ],
    },
  };

  const renderAIAdvisorTab = () => (
    <>
      {/* Greeting Section */}
      <View style={styles.aiGreetingSection}>
        <Text style={[styles.aiGreeting, { color: theme.colors.text }]}>{aiAdvisorData.greeting}</Text>
        <Text style={[styles.aiSubtext, { color: theme.colors.textSecondary }]}>
          Here's your personalised career direction — updated weekly.
        </Text>
      </View>

      {/* What to Do Today */}
      <View style={[styles.aiActionCard, { backgroundColor: theme.colors.card }]}>
        <LinearGradient
          colors={['rgba(255, 107, 157, 0.15)', 'rgba(139, 92, 246, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.aiActionHeader}>
          <Text style={[styles.aiActionTitle, { color: theme.colors.text }]}>{aiAdvisorData.dailyAction.title}</Text>
          <View style={[styles.aiTodayBadge, { backgroundColor: '#FF6B9D30' }]}>
            <Text style={[styles.aiTodayBadgeText, { color: '#FF6B9D' }]}>Today</Text>
          </View>
        </View>
        <Text style={[styles.aiActionDescription, { color: theme.colors.textSecondary }]}>
          {aiAdvisorData.dailyAction.description}
        </Text>
        <View style={styles.aiActionFooter}>
          <Text style={styles.aiProjectedRevenue}>{aiAdvisorData.dailyAction.projectedRevenue}</Text>
          <TouchableOpacity style={styles.aiCtaButton}>
            <Text style={styles.aiCtaText}>{aiAdvisorData.dailyAction.cta}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Analysis */}
      <View style={styles.aiSection}>
        <Text style={[styles.aiSectionTitle, { color: theme.colors.textSecondary }]}>LOCATION ANALYSIS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aiLocationScroll}>
          {/* Current City */}
          <View style={[styles.aiLocationCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.aiLocationBadge, { backgroundColor: theme.colors.border }]}>
              <Text style={[styles.aiLocationBadgeText, { color: theme.colors.textSecondary }]}>Current</Text>
            </View>
            <Text style={[styles.aiCityName, { color: theme.colors.text }]}>{aiAdvisorData.locationAnalysis.current.city}</Text>
            <Text style={[styles.aiCityFans, { color: theme.colors.textSecondary }]}>
              {aiAdvisorData.locationAnalysis.current.fans.toLocaleString()} fans
            </Text>
            <Text style={[styles.aiCityEstimate, { color: theme.colors.text }]}>
              £{aiAdvisorData.locationAnalysis.current.yearlyEstimate.toLocaleString()}/yr est.
            </Text>
            <Text style={[styles.aiCompetition, { color: '#10B981' }]}>
              Competition: {aiAdvisorData.locationAnalysis.current.competition}
            </Text>
          </View>

          {/* Recommended City */}
          <View style={[styles.aiLocationCard, { backgroundColor: theme.colors.card, borderColor: '#3B82F6', borderWidth: 1 }]}>
            <View style={[styles.aiLocationBadge, { backgroundColor: '#3B82F630' }]}>
              <Text style={[styles.aiLocationBadgeText, { color: '#3B82F6' }]}>Recommended</Text>
            </View>
            <Ionicons name="star" size={14} color="#3B82F6" style={styles.aiRecommendedStar} />
            <Text style={[styles.aiCityName, { color: theme.colors.text }]}>{aiAdvisorData.locationAnalysis.recommended.city}</Text>
            <Text style={[styles.aiCityFans, { color: theme.colors.textSecondary }]}>
              {aiAdvisorData.locationAnalysis.recommended.fans.toLocaleString()} fans
            </Text>
            <Text style={[styles.aiCityEstimate, { color: theme.colors.text }]}>
              £{aiAdvisorData.locationAnalysis.recommended.yearlyEstimate.toLocaleString()}/yr est.
            </Text>
            <Text style={[styles.aiCityIncrease, { color: '#10B981' }]}>
              +£{aiAdvisorData.locationAnalysis.recommended.increase.toLocaleString()}
            </Text>
            <Text style={[styles.aiCompetition, { color: '#F59E0B' }]}>
              Competition: {aiAdvisorData.locationAnalysis.recommended.competition}
            </Text>
          </View>

          {/* Hidden Opportunity */}
          <View style={[styles.aiLocationCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.aiLocationBadge, { backgroundColor: '#10B98130' }]}>
              <Text style={[styles.aiLocationBadgeText, { color: '#10B981' }]}>Hidden Gem</Text>
            </View>
            <Text style={[styles.aiCityName, { color: theme.colors.text }]}>{aiAdvisorData.locationAnalysis.hidden.city}</Text>
            <Text style={[styles.aiCityFans, { color: theme.colors.textSecondary }]}>
              {aiAdvisorData.locationAnalysis.hidden.fans.toLocaleString()} fans
            </Text>
            <Text style={[styles.aiCityEstimate, { color: theme.colors.text }]}>
              £{aiAdvisorData.locationAnalysis.hidden.yearlyEstimate.toLocaleString()}/yr est.
            </Text>
            <Text style={[styles.aiCompetition, { color: '#EF4444' }]}>
              Competition: {aiAdvisorData.locationAnalysis.hidden.competition}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Diaspora Match */}
      <View style={[styles.aiDiasporaCard, { backgroundColor: theme.colors.card }]}>
        <LinearGradient
          colors={['rgba(255, 193, 7, 0.15)', 'rgba(255, 152, 0, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.aiDiasporaHeader}>
          <View style={styles.aiGlobeIcon}>
            <Ionicons name="globe" size={20} color="#FFC107" />
          </View>
          <View style={[styles.aiDiasporaBadge, { backgroundColor: '#FFC10730' }]}>
            <Text style={[styles.aiDiasporaBadgeText, { color: '#FFC107' }]}>Diaspora Match</Text>
          </View>
        </View>
        <Text style={[styles.aiDiasporaEvent, { color: theme.colors.text }]}>{aiAdvisorData.diasporaMatch.event}</Text>
        <Text style={[styles.aiDiasporaStats, { color: theme.colors.textSecondary }]}>
          {aiAdvisorData.diasporaMatch.fans.toLocaleString()} diaspora fans · avg tip £{aiAdvisorData.diasporaMatch.avgTip} vs £{aiAdvisorData.diasporaMatch.localAvgTip} locally
        </Text>
        <Text style={[styles.aiDiasporaRevenue, { color: '#FFC107' }]}>
          {aiAdvisorData.diasporaMatch.predictedRevenue} <Text style={[styles.aiDiasporaRevenueLabel, { color: theme.colors.textSecondary }]}>predicted revenue</Text>
        </Text>
      </View>

      {/* Career Insights */}
      <View style={styles.aiSection}>
        <Text style={[styles.aiSectionTitle, { color: theme.colors.textSecondary }]}>CAREER INSIGHTS</Text>
        {aiAdvisorData.careerInsights.map((insight, index) => (
          <View key={index} style={[styles.aiInsightCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.aiInsightLeft}>
              <View style={[styles.aiInsightIcon, { backgroundColor: insight.tagColor + '20' }]}>
                <Ionicons name={insight.icon as any} size={18} color={insight.tagColor} />
              </View>
              <Text style={[styles.aiInsightText, { color: theme.colors.text }]}>{insight.insight}</Text>
            </View>
            <View style={[styles.aiInsightTag, { backgroundColor: insight.tagColor + '20' }]}>
              <Text style={[styles.aiInsightTagText, { color: insight.tagColor }]}>{insight.tag}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Profile Score */}
      <View style={styles.aiSection}>
        <Text style={[styles.aiSectionTitle, { color: theme.colors.textSecondary }]}>PROFILE SCORE</Text>
        <View style={[styles.aiProfileCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.aiProfileHeader}>
            <View style={styles.aiProfileCircle}>
              <View style={styles.aiProfileCircleInner}>
                <Text style={styles.aiProfilePercentage}>{aiAdvisorData.profileScore.percentage}%</Text>
                <Text style={styles.aiProfileComplete}>complete</Text>
              </View>
              <View style={[styles.aiProfileProgress, { transform: [{ rotate: `${(aiAdvisorData.profileScore.percentage / 100) * 360}deg` }] }]} />
            </View>
            <View style={styles.aiProfileInfo}>
              <Text style={[styles.aiProfileStatus, { color: theme.colors.text }]}>{aiAdvisorData.profileScore.status}</Text>
              <Text style={[styles.aiProfileDescription, { color: theme.colors.textSecondary }]}>
                {aiAdvisorData.profileScore.description}
              </Text>
            </View>
          </View>

          {aiAdvisorData.profileScore.actions.map((action, index) => (
            <TouchableOpacity key={index} style={[styles.aiProfileAction, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.aiActionCheckbox, { borderColor: action.completed ? '#10B981' : theme.colors.border }]}>
                {action.completed && <Ionicons name="checkmark" size={14} color="#10B981" />}
              </View>
              <View style={styles.aiActionContent}>
                <Text style={[styles.aiActionLabel, { color: theme.colors.text, textDecorationLine: action.completed ? 'line-through' : 'none' }]}>
                  {action.label}
                </Text>
                <Text style={[styles.aiActionImpact, { color: action.completed ? '#10B981' : '#3B82F6' }]}>
                  {action.impact}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Release Strategy */}
      <View style={styles.aiSection}>
        <Text style={[styles.aiSectionTitle, { color: theme.colors.textSecondary }]}>RELEASE STRATEGY</Text>
        <View style={[styles.aiReleaseCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.aiReleaseHeader}>
            <Text style={[styles.aiReleaseConfidenceLabel, { color: theme.colors.textSecondary }]}>Recommendation confidence</Text>
            <Text style={[styles.aiReleaseConfidenceValue, { color: '#3B82F6' }]}>{aiAdvisorData.releaseStrategy.confidence}%</Text>
          </View>
          <View style={styles.aiConfidenceBar}>
            <View style={[styles.aiConfidenceFill, { width: `${aiAdvisorData.releaseStrategy.confidence}%` }]} />
          </View>

          <Text style={[styles.aiReleaseTitle, { color: theme.colors.text }]}>{aiAdvisorData.releaseStrategy.title}</Text>

          <View style={styles.aiReleaseDetails}>
            {aiAdvisorData.releaseStrategy.details.map((detail, index) => (
              <View key={index} style={[styles.aiReleaseDetail, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.aiReleaseDetailLabel, { color: theme.colors.textSecondary }]}>{detail.label}</Text>
                <Text style={[styles.aiReleaseDetailValue, { color: theme.colors.text }]}>{detail.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.aiProjectionCard, { backgroundColor: theme.colors.background }]}>
            <View>
              <Text style={[styles.aiProjectionLabel, { color: theme.colors.textSecondary }]}>Month 1 projection</Text>
              <Text style={[styles.aiProjectionValue, { color: '#10B981' }]}>{aiAdvisorData.releaseStrategy.projection.month1}</Text>
            </View>
            <View style={styles.aiVsDivider} />
            <View>
              <Text style={[styles.aiProjectionLabel, { color: theme.colors.textSecondary }]}>vs your average</Text>
              <Text style={[styles.aiVsValue, { color: '#10B981' }]}>
                {aiAdvisorData.releaseStrategy.projection.vsAverage} <Text style={[styles.aiVsAmount, { color: theme.colors.textSecondary }]}>({aiAdvisorData.releaseStrategy.projection.avgAmount})</Text>
              </Text>
            </View>
          </View>

          <View style={styles.aiPlanSection}>
            <Text style={[styles.aiPlanTitle, { color: theme.colors.textSecondary }]}>6-MONTH PLAN</Text>
            {aiAdvisorData.releaseStrategy.sixMonthPlan.map((step, index) => (
              <View key={index} style={styles.aiPlanStep}>
                <View style={[styles.aiPlanNumber, { backgroundColor: '#FF6B9D' }]}>
                  <Text style={styles.aiPlanNumberText}>{step.step}</Text>
                </View>
                <View style={styles.aiPlanContent}>
                  <Text style={[styles.aiPlanStepTitle, { color: theme.colors.text }]}>{step.title}</Text>
                  <Text style={[styles.aiPlanStepDesc, { color: theme.colors.textSecondary }]}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </>
  );

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
          {(['advisor', 'overview', 'fans', 'tracks', 'growth'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[
                styles.tab,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                selectedTab === tab && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.text },
                  selectedTab === tab && { color: '#FFFFFF' },
                ]}
              >
                {tab === 'advisor' ? 'AI Advisor' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        {selectedTab === 'advisor' && renderAIAdvisorTab()}
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'fans' && renderFansTab()}
        {selectedTab === 'tracks' && renderTracksTab()}
        {selectedTab === 'growth' && renderGrowthTab()}

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

  // AI Advisor Styles
  aiGreetingSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  aiGreeting: {
    ...Typography.headerMedium,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    marginBottom: 8,
  },
  aiSubtext: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  aiSection: {
    marginBottom: 24,
  },
  aiSectionTitle: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // What to Do Today
  aiActionCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiActionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  aiTodayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiTodayBadgeText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  aiActionDescription: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  aiActionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiProjectedRevenue: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#10B981',
  },
  aiCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  aiCtaText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Location Analysis
  aiLocationScroll: {
    paddingHorizontal: 16,
  },
  aiLocationCard: {
    width: 180,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  aiLocationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiLocationBadgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  aiRecommendedStar: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  aiCityName: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiCityFans: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  aiCityEstimate: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiCityIncrease: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiCompetition: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Diaspora Match
  aiDiasporaCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiDiasporaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiGlobeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiDiasporaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiDiasporaBadgeText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  aiDiasporaEvent: {
    ...Typography.headerMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  aiDiasporaStats: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  aiDiasporaRevenue: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  aiDiasporaRevenueLabel: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Career Insights
  aiInsightCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  aiInsightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  aiInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    flex: 1,
  },
  aiInsightTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiInsightTagText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },

  // Profile Score
  aiProfileCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  aiProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  aiProfileCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aiProfileCircleInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#16162A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiProfilePercentage: {
    ...Typography.headerMedium,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiProfileComplete: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    color: '#8B92A8',
  },
  aiProfileProgress: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#FF6B9D',
    borderRightColor: '#8B5CF6',
  },
  aiProfileInfo: {
    flex: 1,
  },
  aiProfileStatus: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiProfileDescription: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  aiProfileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  aiActionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiActionContent: {
    flex: 1,
  },
  aiActionLabel: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 2,
  },
  aiActionImpact: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Release Strategy
  aiReleaseCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  aiReleaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiReleaseConfidenceLabel: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },
  aiReleaseConfidenceValue: {
    ...Typography.label,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  aiConfidenceBar: {
    height: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 3,
    marginBottom: 20,
  },
  aiConfidenceFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  aiReleaseTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    marginBottom: 16,
  },
  aiReleaseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  aiReleaseDetail: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
  },
  aiReleaseDetailLabel: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 4,
  },
  aiReleaseDetailValue: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  aiProjectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  aiProjectionLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  aiProjectionValue: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  aiVsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  aiVsValue: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  aiVsAmount: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },
  aiPlanSection: {
    marginTop: 4,
  },
  aiPlanTitle: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  aiPlanStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  aiPlanNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPlanNumberText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiPlanContent: {
    flex: 1,
  },
  aiPlanStepTitle: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  aiPlanStepDesc: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CreatorInsightsDashboardScreen;
