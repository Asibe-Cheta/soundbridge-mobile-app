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

interface SubscriptionData {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
}

interface UsageStats {
  uploads_used: number;
  uploads_limit: number;
  storage_used: number; // in MB
  storage_limit: number; // in MB
  bandwidth_used: number; // in MB
  bandwidth_limit: number; // in MB
}

interface RevenueData {
  total_earnings: number;
  pending_earnings: number;
  last_payout: number;
  last_payout_date: string;
  next_payout_date: string;
  currency: string;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoice_url?: string;
}

export default function BillingScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Load wallet data if user is logged in
      if (session) {
        try {
          const walletBalance = await walletService.getWalletBalanceSafe(session);
          setWalletData(walletBalance);
        } catch (error) {
          console.error('Error loading wallet data:', error);
          // Don't fail the whole screen if wallet fails
          setWalletData(null);
        }
      }
      
      // TODO: Implement actual API calls for billing data
      // Mock data for now
      setTimeout(() => {
        setSubscription({
          tier: 'pro',
          status: 'active',
          current_period_start: '2025-01-01T00:00:00Z',
          current_period_end: '2025-02-01T00:00:00Z',
          cancel_at_period_end: false,
          amount: 9.99,
          currency: 'USD',
          billing_cycle: 'monthly'
        });

        setUsage({
          uploads_used: 7,
          uploads_limit: 10,
          storage_used: 1200, // 1.2GB
          storage_limit: 2048, // 2GB
          bandwidth_used: 850,
          bandwidth_limit: 10240 // 10GB
        });

        setRevenue({
          total_earnings: 245.67,
          pending_earnings: 32.45,
          last_payout: 180.22,
          last_payout_date: '2025-01-15T00:00:00Z',
          next_payout_date: '2025-02-15T00:00:00Z',
          currency: 'USD'
        });

        setBillingHistory([
          {
            id: '1',
            date: '2025-01-01T00:00:00Z',
            amount: 9.99,
            currency: 'USD',
            status: 'paid',
            description: 'Pro Plan - Monthly',
            invoice_url: 'https://example.com/invoice/1'
          },
          {
            id: '2',
            date: '2024-12-01T00:00:00Z',
            amount: 9.99,
            currency: 'USD',
            status: 'paid',
            description: 'Pro Plan - Monthly',
            invoice_url: 'https://example.com/invoice/2'
          }
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading billing data:', error);
      Alert.alert('Error', 'Failed to load billing information');
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You\'ll lose access to Pro features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cancellation
            Alert.alert('Success', 'Your subscription will be cancelled at the end of the current billing period.');
          }
        }
      ]
    );
  };

  const handleRequestPayout = () => {
    if (!revenue || revenue.pending_earnings < 25) {
      Alert.alert('Minimum Not Met', 'You need at least $25 in pending earnings to request a payout.');
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout of $${revenue.pending_earnings.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request Payout',
          onPress: () => {
            // TODO: Implement payout request
            Alert.alert('Success', 'Payout request submitted. You\'ll receive payment within 2-3 business days.');
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

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
                <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.planInfo}>
              <View style={styles.planDetails}>
                <Text style={[styles.planName, { color: theme.colors.text }]}>
                  {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
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
                  {usage.uploads_used} / {usage.uploads_limit}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.card }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${getUsagePercentage(usage.uploads_used, usage.uploads_limit)}%`,
                      backgroundColor: getUsagePercentage(usage.uploads_used, usage.uploads_limit) > 80 ? '#EF4444' : '#DC2626'
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageLabel, { color: theme.colors.text }]}>Storage</Text>
                <Text style={[styles.usageValue, { color: theme.colors.textSecondary }]}>
                  {formatBytes(usage.storage_used)} / {formatBytes(usage.storage_limit)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.card }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${getUsagePercentage(usage.storage_used, usage.storage_limit)}%`,
                      backgroundColor: getUsagePercentage(usage.storage_used, usage.storage_limit) > 80 ? '#EF4444' : '#10B981'
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageLabel, { color: theme.colors.text }]}>Bandwidth</Text>
                <Text style={[styles.usageValue, { color: theme.colors.textSecondary }]}>
                  {formatBytes(usage.bandwidth_used)} / {formatBytes(usage.bandwidth_limit)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.card }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${getUsagePercentage(usage.bandwidth_used, usage.bandwidth_limit)}%`,
                      backgroundColor: getUsagePercentage(usage.bandwidth_used, usage.bandwidth_limit) > 80 ? '#EF4444' : '#3B82F6'
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
