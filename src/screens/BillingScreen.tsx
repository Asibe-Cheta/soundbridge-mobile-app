import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, WalletBalance } from '../services/WalletService';
import { currencyService } from '../services/CurrencyService';
import { subscriptionService, SubscriptionStatus, UsageStatistics, BillingHistoryItem, RevenueData } from '../services/SubscriptionService';

// Interfaces moved to SubscriptionService

export default function BillingScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UsageStatistics | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [statusDisplay, setStatusDisplay] = useState<any>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading real billing data from APIs...');

      // Load all data in parallel for better performance
      const [
        subscriptionData,
        usageData,
        revenueData,
        billingHistoryData,
        walletBalance,
        accountStatusData
      ] = await Promise.allSettled([
        subscriptionService.getSubscriptionStatusSafe(session),
        subscriptionService.getUsageStatisticsSafe(session),
        subscriptionService.getRevenueDataSafe(session),
        subscriptionService.getBillingHistorySafe(session, 10),
        walletService.getWalletBalanceSafe(session),
        walletService.checkStripeAccountStatusSafe(session)
      ]);

      // Handle subscription data
      if (subscriptionData.status === 'fulfilled' && subscriptionData.value) {
        setSubscription(subscriptionData.value);
        console.log('✅ Real subscription data loaded');
      } else {
        console.warn('⚠️ Failed to load subscription data, using fallback');
        // Fallback to free plan with correct limits
        setSubscription({
          tier: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          amount: 0,
          currency: 'USD',
          billing_cycle: 'monthly',
        });
      }

      // Handle usage data
      if (usageData.status === 'fulfilled' && usageData.value) {
        setUsage(usageData.value);
        console.log('✅ Real usage data loaded');
      } else {
        console.warn('⚠️ Failed to load usage data, using fallback');
        // Fallback usage stats for free plan (correct limits)
        setUsage({
          uploads_used: 0,
          uploads_limit: 3, // Free plan: 3 uploads
          storage_used: 0,
          storage_limit: 512, // Free plan: 0.5 GB = 512 MB
          bandwidth_used: 0,
          bandwidth_limit: 1000, // Free plan: 1 GB = 1000 MB
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Handle revenue data
      if (revenueData.status === 'fulfilled' && revenueData.value) {
        setRevenue(revenueData.value);
        console.log('✅ Real revenue data loaded');
      } else {
        console.warn('⚠️ Failed to load revenue data, using fallback');
        // Fallback revenue data
        setRevenue({
          total_earnings: 0,
          pending_earnings: 0,
          last_payout: 0,
          last_payout_date: '',
          next_payout_date: '',
          currency: 'USD',
          total_tips: 0,
          total_subscriptions: 0,
          total_purchases: 0,
        });
      }

      // Handle billing history
      if (billingHistoryData.status === 'fulfilled') {
        setBillingHistory(billingHistoryData.value);
        console.log('✅ Real billing history loaded');
      } else {
        console.warn('⚠️ Failed to load billing history, using fallback');
        setBillingHistory([]);
      }

      // Handle wallet data
      if (walletBalance.status === 'fulfilled' && walletBalance.value) {
        setWalletData(walletBalance.value);
        console.log('✅ Real wallet data loaded');
      } else {
        console.warn('⚠️ Failed to load wallet data');
        setWalletData(null);
      }

      // Handle account status data
      if (accountStatusData.status === 'fulfilled' && accountStatusData.value?.success && accountStatusData.value?.accountStatus) {
        const status = accountStatusData.value.accountStatus;
        setAccountStatus(status);
        
        // Get display information
        const display = walletService.getVerificationStatusDisplay(status);
        setStatusDisplay(display);
        
        console.log('✅ Account status loaded:', display);
      } else {
        console.warn('⚠️ Failed to load account status');
        setStatusDisplay({
          status: 'unknown',
          color: '#6B7280',
          icon: 'help-circle',
          message: 'Unable to check account status',
          actionRequired: false,
        });
      }

      console.log('✅ All real billing data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading billing data:', error);
      // Set fallback data on error
      setSubscription({
        tier: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        amount: 0,
        currency: 'USD',
        billing_cycle: 'monthly',
      });
      setUsage({
        uploads_used: 0,
        uploads_limit: 3, // Free plan: 3 uploads
        storage_used: 0,
        storage_limit: 512, // Free plan: 0.5 GB = 512 MB
        bandwidth_used: 0,
        bandwidth_limit: 1000, // Free plan: 1 GB = 1000 MB
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setRevenue({
        total_earnings: 0,
        pending_earnings: 0,
        last_payout: 0,
        last_payout_date: '',
        next_payout_date: '',
        currency: 'USD',
        total_tips: 0,
        total_subscriptions: 0,
        total_purchases: 0,
      });
      setBillingHistory([]);
      setWalletData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!session) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You\'ll lose access to Pro features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await subscriptionService.cancelSubscription(session);
              if (result.success) {
                Alert.alert('Success', result.message || 'Your subscription has been cancelled.');
                loadBillingData(); // Refresh data
              } else {
                Alert.alert('Error', result.message || 'Failed to cancel subscription.');
              }
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRequestPayout = async () => {
    if (!session || !revenue) return;

    Alert.alert(
      'Request Payout',
      `Request payout of ${currencyService.formatAmount(revenue.pending_earnings, revenue.currency)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request', 
          onPress: async () => {
            try {
              const result = await subscriptionService.requestPayout(session);
              if (result.success) {
                Alert.alert('Success', result.message || 'Payout requested successfully.');
                loadBillingData(); // Refresh data
              } else {
                Alert.alert('Error', result.message || 'Failed to request payout.');
              }
            } catch (error) {
              console.error('Error requesting payout:', error);
              Alert.alert('Error', 'Failed to request payout. Please try again.');
            }
          }
        }
      ]
    );
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Using SubscriptionService methods for formatting

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return '#10B981';
      case 'trialing':
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
      case 'past_due':
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return 'checkmark-circle';
      case 'trialing':
      case 'pending':
        return 'time';
      case 'cancelled':
      case 'past_due':
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Billing & Usage</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Billing & Usage</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Upgrade' as never)}>
          <Ionicons name="rocket" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Subscription Status */}
        {subscription && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Current Plan</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(subscription.status)}20` }]}>
                <Ionicons 
                  name={getStatusIcon(subscription.status) as any} 
                  size={16} 
                  color={getStatusColor(subscription.status)} 
                />
                <Text style={[styles.statusText, { color: subscriptionService.getStatusColor(subscription.status) }]}>
                  {subscriptionService.formatStatus(subscription.status)}
                </Text>
              </View>
            </View>

            <View style={styles.planInfo}>
              <View style={styles.planDetails}>
                <Text style={[styles.planName, { color: theme.colors.text }]}>
                  {subscriptionService.formatTier(subscription.tier)}
                </Text>
                <Text style={[styles.planPrice, { color: theme.colors.text }]}>
                  ${subscription.amount}/{subscription.billing_cycle === 'monthly' ? 'month' : 'year'}
                </Text>
              </View>
              
              <View style={styles.billingDates}>
                <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>Current Period</Text>
                <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </Text>
              </View>

              {subscription.cancel_at_period_end && (
                <View style={styles.cancellationNotice}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={[styles.cancellationText, { color: theme.colors.textSecondary }]}>
                    Subscription will end on {formatDate(subscription.current_period_end)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.planActions}>
              <TouchableOpacity 
                style={[styles.upgradeButton, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('Upgrade' as never)}
              >
                <Ionicons name="rocket" size={16} color="#DC2626" />
                <Text style={[styles.upgradeButtonText, { color: theme.colors.text }]}>Change Plan</Text>
              </TouchableOpacity>
              
              {subscription.tier !== 'free' && !subscription.cancel_at_period_end && (
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Usage Statistics */}
        {usage && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Usage Statistics</Text>
            
            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageLabel, { color: theme.colors.text }]}>Uploads</Text>
                <Text style={[styles.usageValue, { color: theme.colors.textSecondary }]}>
                  {usage.uploads_used} / {subscriptionService.formatUsageLimit(usage.uploads_limit)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.card }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${subscriptionService.calculateUsagePercentage(usage.uploads_used, usage.uploads_limit)}%`,
                      backgroundColor: subscriptionService.calculateUsagePercentage(usage.uploads_used, usage.uploads_limit) > 80 ? '#EF4444' : '#DC2626'
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageLabel, { color: theme.colors.text }]}>Storage</Text>
                <Text style={[styles.usageValue, { color: theme.colors.textSecondary }]}>
                  {subscriptionService.formatStorage(usage.storage_used)} / {subscriptionService.formatStorage(usage.storage_limit)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.card }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${subscriptionService.calculateUsagePercentage(usage.storage_used, usage.storage_limit)}%`,
                      backgroundColor: subscriptionService.calculateUsagePercentage(usage.storage_used, usage.storage_limit) > 80 ? '#EF4444' : '#10B981'
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageLabel, { color: theme.colors.text }]}>Bandwidth</Text>
                <Text style={[styles.usageValue, { color: theme.colors.textSecondary }]}>
                  {subscriptionService.formatStorage(usage.bandwidth_used)} / {subscriptionService.formatStorage(usage.bandwidth_limit)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.card }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${subscriptionService.calculateUsagePercentage(usage.bandwidth_used, usage.bandwidth_limit)}%`,
                      backgroundColor: subscriptionService.calculateUsagePercentage(usage.bandwidth_used, usage.bandwidth_limit) > 80 ? '#EF4444' : '#3B82F6'
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        )}

        {/* Revenue Tracker */}
        {revenue && subscription?.tier !== 'free' && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Revenue & Payouts</Text>
            
            <View style={styles.revenueGrid}>
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>Total Earnings</Text>
                <Text style={[styles.revenueValue, { color: theme.colors.text }]}>
                  ${revenue.total_earnings.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
                <Text style={[styles.revenueValue, { color: theme.colors.text }]}>
                  ${revenue.pending_earnings.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>Last Payout</Text>
                <Text style={[styles.revenueValue, { color: theme.colors.text }]}>
                  ${revenue.last_payout.toFixed(2)}
                </Text>
                <Text style={[styles.revenueDate, { color: theme.colors.textSecondary }]}>
                  {formatDate(revenue.last_payout_date)}
                </Text>
              </View>
              
              <View style={styles.revenueItem}>
                <Text style={[styles.revenueLabel, { color: theme.colors.textSecondary }]}>Next Payout</Text>
                <Text style={[styles.revenueDate, { color: theme.colors.text }]}>
                  {formatDate(revenue.next_payout_date)}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.payoutButton, 
                { 
                  backgroundColor: revenue.pending_earnings >= 25 ? '#DC2626' : theme.colors.card,
                  opacity: revenue.pending_earnings >= 25 ? 1 : 0.5
                }
              ]}
              onPress={handleRequestPayout}
              disabled={revenue.pending_earnings < 25}
            >
              <Ionicons 
                name="cash" 
                size={16} 
                color={revenue.pending_earnings >= 25 ? '#FFFFFF' : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.payoutButtonText, 
                { color: revenue.pending_earnings >= 25 ? '#FFFFFF' : theme.colors.textSecondary }
              ]}>
                Request Payout
              </Text>
            </TouchableOpacity>
            
            {revenue.pending_earnings < 25 && (
              <Text style={[styles.payoutMinimum, { color: theme.colors.textSecondary }]}>
                Minimum payout amount is $25.00
              </Text>
            )}
          </View>
        )}

        {/* Digital Wallet */}
        {walletData && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Digital Wallet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Wallet' as never)}>
                <Ionicons name="wallet" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.walletInfo}>
              <View style={styles.walletBalance}>
                <Text style={[styles.walletLabel, { color: theme.colors.textSecondary }]}>Available Balance</Text>
                <Text style={[styles.walletAmount, { color: theme.colors.text }]}>
                  {currencyService.formatAmount(walletData.balance, walletData.currency)}
                </Text>
              </View>
              
              <View style={styles.walletStatus}>
                <Text style={[styles.walletLabel, { color: theme.colors.textSecondary }]}>Status</Text>
                <View style={styles.walletStatusBadge}>
                  <View style={[
                    styles.walletStatusDot, 
                    { backgroundColor: walletData.balance > 0 ? theme.colors.success : theme.colors.textSecondary }
                  ]} />
                  <Text style={[
                    styles.walletStatusText, 
                    { color: walletData.balance > 0 ? theme.colors.success : theme.colors.textSecondary }
                  ]}>
                    {walletData.balance > 0 ? 'Active' : 'Empty'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.walletActions}>
              <TouchableOpacity 
                style={[styles.walletButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('Wallet' as never)}
              >
                <Ionicons name="wallet" size={16} color={theme.colors.text} />
                <Text style={[styles.walletButtonText, { color: theme.colors.text }]}>View Wallet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.walletButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('TransactionHistory' as never)}
              >
                <Ionicons name="list" size={16} color={theme.colors.text} />
                <Text style={[styles.walletButtonText, { color: theme.colors.text }]}>Transactions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Billing History */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Billing History</Text>
          
          {billingHistory.length > 0 ? (
            <View style={styles.historyList}>
              {billingHistory.map((item) => (
                <View key={item.id} style={[styles.historyItem, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyDescription, { color: theme.colors.text }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  
                  <View style={styles.historyAmount}>
                    <Text style={[styles.historyPrice, { color: theme.colors.text }]}>
                      ${item.amount.toFixed(2)}
                    </Text>
                    <View style={[styles.historyStatus, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                      <Ionicons 
                        name={getStatusIcon(item.status) as any} 
                        size={12} 
                        color={getStatusColor(item.status)} 
                      />
                      <Text style={[styles.historyStatusText, { color: getStatusColor(item.status) }]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyHistoryText, { color: theme.colors.textSecondary }]}>
                No billing history yet
              </Text>
            </View>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  planInfo: {
    marginBottom: 20,
  },
  planDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  billingDates: {
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
  },
  cancellationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    padding: 12,
    borderRadius: 8,
  },
  cancellationText: {
    fontSize: 12,
    marginLeft: 8,
  },
  planActions: {
    flexDirection: 'row',
    gap: 12,
  },
  upgradeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF444420',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  usageItem: {
    marginBottom: 20,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  usageValue: {
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  revenueItem: {
    width: '50%',
    marginBottom: 16,
  },
  revenueLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  revenueDate: {
    fontSize: 12,
    marginTop: 2,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  payoutMinimum: {
    fontSize: 12,
    textAlign: 'center',
  },
  historyList: {
    marginTop: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    fontSize: 14,
    marginTop: 16,
  },
  walletInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  walletBalance: {
    flex: 1,
  },
  walletStatus: {
    alignItems: 'flex-end',
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  walletStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  walletStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  walletButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
