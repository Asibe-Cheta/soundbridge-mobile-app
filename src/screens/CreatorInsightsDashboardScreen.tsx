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
type TabType = 'overview' | 'fans' | 'tracks' | 'growth';

const CreatorInsightsDashboardScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRangeTab>('month');
  const [selectedTab, setSelectedTab] = useState<TabType>('overview');

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
          {(['overview', 'fans', 'tracks', 'growth'] as TabType[]).map(tab => (
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
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
});

export default CreatorInsightsDashboardScreen;
