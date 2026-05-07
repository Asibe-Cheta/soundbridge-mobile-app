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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { creatorRevenueService, RevenueBySource, RevenueTrendPoint, TopEarningItem } from '../services/CreatorRevenueService';
import { payoutService } from '../services/PayoutService';
import { SystemTypography as Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

type DateRangeTab = 'week' | 'month' | 'year';

const CreatorEarningsDashboardScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { session, userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRangeTab>('month');

  // Data state
  const [revenueBySource, setRevenueBySource] = useState<RevenueBySource | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [topEarning, setTopEarning] = useState<TopEarningItem[]>([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);

  // Fetch all earnings data
  const fetchEarningsData = useCallback(async () => {
    if (!session) return;

    try {
      const [revenueData, trendData, topItems, creatorRevenue] = await Promise.all([
        creatorRevenueService.getRevenueBySource(session, getStartDate(selectedRange), new Date().toISOString()),
        creatorRevenueService.getRevenueTrend(session, selectedRange),
        creatorRevenueService.getTopEarningItems(session, 5, getStartDate(selectedRange), new Date().toISOString()),
        payoutService.getCreatorRevenue(session).catch(() => null),
      ]);

      setRevenueBySource(revenueData);
      setRevenueTrend(trendData);
      setTopEarning(topItems);

      if (creatorRevenue) {
        setPendingBalance(creatorRevenue.pending_balance || 0);
        setLifetimeEarnings(creatorRevenue.total_earned || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, selectedRange]);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  // Get start date based on selected range
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

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'GBP'): string => {
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Format change percentage
  const formatChange = (change?: number): { text: string; color: string; icon: string } => {
    if (!change) return { text: '0%', color: theme.colors.textSecondary, icon: 'remove-outline' };

    const isPositive = change > 0;
    return {
      text: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
      color: isPositive ? '#10B981' : '#EF4444',
      icon: isPositive ? 'trending-up-outline' : 'trending-down-outline',
    };
  };

  // Get icon for revenue source
  const getSourceIcon = (source: string): string => {
    switch (source) {
      case 'tips':
        return 'heart-outline';
      case 'eventTickets':
        return 'ticket-outline';
      case 'serviceBookings':
        return 'calendar-outline';
      case 'downloads':
        return 'download-outline';
      default:
        return 'cash-outline';
    }
  };

  // Get label for revenue source
  const getSourceLabel = (source: string): string => {
    switch (source) {
      case 'tips':
        return 'Tips';
      case 'eventTickets':
        return 'Event Tickets';
      case 'serviceBookings':
        return 'Service Bookings';
      case 'downloads':
        return 'Downloads';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading earnings data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Earnings Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Wallet')} style={styles.walletButton}>
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
          style={[styles.totalEarningsCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.totalEarningsHeader}>
            <Text style={[styles.totalEarningsLabel, { color: theme.colors.textSecondary }]}>
              {selectedRange === 'week' ? 'Last 7 Days' : selectedRange === 'month' ? 'Last 30 Days' : 'Last 365 Days'}
            </Text>
            {revenueBySource?.total.change_percentage !== undefined && (
              <View style={[styles.changeBadge, { backgroundColor: formatChange(revenueBySource.total.change_percentage).color + '20' }]}>
                <Ionicons
                  name={formatChange(revenueBySource.total.change_percentage).icon as any}
                  size={14}
                  color={formatChange(revenueBySource.total.change_percentage).color}
                />
                <Text style={[styles.changeText, { color: formatChange(revenueBySource.total.change_percentage).color }]}>
                  {formatChange(revenueBySource.total.change_percentage).text}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.totalEarningsAmount, { color: theme.colors.text }]}>
            {revenueBySource ? formatCurrency(revenueBySource.total.amount, revenueBySource.total.currency) : '£0.00'}
          </Text>
          <View style={styles.totalEarningsStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCurrency(pendingBalance)}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Lifetime</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCurrency(lifetimeEarnings)}</Text>
            </View>
          </View>
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

        {/* Revenue by Source */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Revenue by Source</Text>
          {revenueBySource && (
            <>
              {Object.entries(revenueBySource)
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
                    <View style={styles.sourceRight}>
                      <Text style={[styles.sourceAmount, { color: theme.colors.text }]}>
                        {formatCurrency((data as any).amount, (data as any).currency)}
                      </Text>
                      {(data as any).change_percentage !== undefined && (
                        <View style={[styles.miniChangeIndicator, { backgroundColor: formatChange((data as any).change_percentage).color + '15' }]}>
                          <Ionicons
                            name={formatChange((data as any).change_percentage).icon as any}
                            size={12}
                            color={formatChange((data as any).change_percentage).color}
                          />
                          <Text style={[styles.miniChangeText, { color: formatChange((data as any).change_percentage).color }]}>
                            {formatChange((data as any).change_percentage).text}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
            </>
          )}
        </View>

        {/* Simple Revenue Trend Chart */}
        {revenueTrend.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Revenue Trend</Text>
            <View style={styles.chartContainer}>
              {revenueTrend.slice(-7).map((point, index) => {
                const maxAmount = Math.max(...revenueTrend.map(p => p.amount));
                const height = maxAmount > 0 ? (point.amount / maxAmount) * 120 : 0;

                return (
                  <View key={point.date} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <LinearGradient
                        colors={[theme.colors.primary, theme.colors.primary + '80']}
                        style={[styles.bar, { height: Math.max(height, 4) }]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                      {new Date(point.date).getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Earning Items */}
        {topEarning.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Earning Sources</Text>
            {topEarning.map((item, index) => (
              <View key={`${item.type}-${item.id}`} style={[styles.topItem, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.topItemLeft}>
                  <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.rankText, { color: theme.colors.primary }]}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={[styles.topItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.topItemType, { color: theme.colors.textSecondary }]}>
                      {item.count} {item.type === 'tip' ? 'tips' : item.type === 'event' ? 'tickets' : 'bookings'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.topItemAmount, { color: theme.colors.text }]}>
                  {formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Wallet')}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('TransactionHistory' as never)}
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
          >
            <Ionicons name="list-outline" size={20} color={theme.colors.text} />
            <Text style={[styles.actionButtonTextSecondary, { color: theme.colors.text }]}>Transaction History</Text>
          </TouchableOpacity>
        </View>

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
  totalEarningsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  totalEarningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalEarningsLabel: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  totalEarningsAmount: {
    ...Typography.headerLarge,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    marginBottom: 16,
  },
  totalEarningsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  statValue: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 16,
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
  sourceRight: {
    alignItems: 'flex-end',
  },
  sourceAmount: {
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
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    marginTop: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 2,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topItemLeft: {
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
  topItemTitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    maxWidth: width - 180,
  },
  topItemType: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  topItemAmount: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    ...Typography.button,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    ...Typography.button,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});

export default CreatorEarningsDashboardScreen;
