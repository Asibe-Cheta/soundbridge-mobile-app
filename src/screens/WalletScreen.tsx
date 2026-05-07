import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import { walletService, WalletBalance, WalletTransaction } from '../services/WalletService';
import { currencyService } from '../services/CurrencyService';
import { payoutService, CreatorRevenue } from '../services/PayoutService';
import { opportunityService, OpportunityProject } from '../services/OpportunityService';

export default function WalletScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [creatorRevenue, setCreatorRevenue] = useState<CreatorRevenue | null>(null);
  const [completedGigEarnings, setCompletedGigEarnings] = useState<OpportunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to view your wallet');
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('📱 Loading wallet data...');

      // Load wallet balance, recent transactions, creator revenue, and gig projects in parallel
      const [balanceResult, transactionsResult, revenueResult, gigProjects] = await Promise.all([
        walletService.getWalletBalanceSafe(session),
        walletService.getWalletTransactionsSafe(session, 5, 0),
        payoutService.getCreatorRevenue(session).catch(() => null), // Graceful fallback if no revenue yet
        opportunityService.getMyProjects('creator').catch(() => [] as OpportunityProject[]),
      ]);

      setWalletData(balanceResult);
      setRecentTransactions(transactionsResult.transactions);
      setCreatorRevenue(revenueResult);

      // Completed gig projects = real earnings even if wallet_transaction was never created
      // De-dup against wallet_transactions that have reference_type=opportunity_project
      const existingProjectRefs = new Set(
        transactionsResult.transactions
          .filter(t => t.reference_type === 'opportunity_project')
          .map(t => t.reference_id)
      );
      const completedGigs = (gigProjects as OpportunityProject[]).filter(
        p => p.status === 'completed' && !existingProjectRefs.has(p.id)
      );
      setCompletedGigEarnings(completedGigs);

      console.log('💰 Wallet balance:', balanceResult);
      console.log('📊 Recent transactions:', transactionsResult.transactions.length);
      console.log('💵 Creator revenue:', revenueResult);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const navigateToTransactionHistory = () => {
    navigation.navigate('TransactionHistory' as never);
  };

  const navigateToWithdrawal = () => {
    if (!walletData || walletData.balance <= 0) {
      Alert.alert('No Balance', 'You need a positive balance to make a withdrawal.');
      return;
    }
    navigation.navigate('Withdrawal' as never);
  };

  const getWalletStatus = () => {
    if (!walletData) return 'Loading...';
    if (!walletData.hasWallet) return 'Not Created';
    if (walletData.balance > 0) return 'Active';
    return 'Empty';
  };

  const getStatusColor = () => {
    const status = getWalletStatus();
    switch (status) {
      case 'Active': return theme.colors.success;
      case 'Empty': return theme.colors.textSecondary;
      case 'Not Created': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Main Background Gradient - Uses theme colors */}
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading wallet...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
         />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Digital Wallet</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? theme.colors.textSecondary : theme.colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Balance Card */}
        <LinearGradient
          colors={['#4C1D95', '#9D174D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.walletCard, { borderColor: theme.colors.border }]}
        >
          <View style={styles.walletAccentTopRight} />
          <View style={styles.walletAccentBottomLeft} />

          <View style={styles.walletHeader}>
            <Image
              source={require('../../assets/images/logos/logo-white.png')}
              style={styles.walletLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.cardContent}>
            <View>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceAmount}>
                {walletData ? currencyService.formatAmount(walletData.balance, walletData.currency) : '$0.00'}
              </Text>
            </View>
            <View style={styles.walletIconBadge}>
              <Ionicons name="wallet" size={18} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardFooterLabel}>My Wallet</Text>
              <Text style={styles.cardFooterNumber}>**** **** **** 0000</Text>
            </View>
            <View style={styles.cardBrandDots}>
              <View style={styles.cardBrandDot} />
              <View style={[styles.cardBrandDot, styles.cardBrandDotOffset]} />
            </View>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={navigateToWithdrawal}
            disabled={!walletData || walletData.balance <= 0}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#DC2626', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.withdrawButtonGradient}
            >
              <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            onPress={navigateToTransactionHistory}
            activeOpacity={0.85}
          >
            <Ionicons name="list" size={20} color={theme.colors.text} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Creator Revenue Card */}
        {creatorRevenue && (
          <View style={[styles.revenueCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
            <View style={styles.revenueHeader}>
              <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
              <Text style={[styles.revenueTitle, { color: theme.colors.text }]}>Creator Earnings</Text>
            </View>

            <View style={styles.revenueStats}>
              <View style={styles.revenueStat}>
                <Text style={[styles.revenueStatLabel, { color: theme.colors.textSecondary }]}>Total Earned</Text>
                <Text style={[styles.revenueStatAmount, { color: theme.colors.success }]}>
                  {currencyService.formatAmount(creatorRevenue.total_earned, creatorRevenue.currency)}
                </Text>
              </View>

              <View style={styles.revenueStat}>
                <Text style={[styles.revenueStatLabel, { color: theme.colors.textSecondary }]}>Available Balance</Text>
                <Text style={[styles.revenueStatAmount, { color: theme.colors.primary }]}>
                  {currencyService.formatAmount(creatorRevenue.pending_balance, creatorRevenue.currency)}
                </Text>
              </View>

              <View style={styles.revenueStat}>
                <Text style={[styles.revenueStatLabel, { color: theme.colors.textSecondary }]}>Lifetime Payouts</Text>
                <Text style={[styles.revenueStatAmount, { color: theme.colors.text }]}>
                  {currencyService.formatAmount(creatorRevenue.lifetime_payout, creatorRevenue.currency)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.requestPayoutButton, { backgroundColor: theme.colors.primary }]}
              onPress={navigateToWithdrawal}
              disabled={creatorRevenue.pending_balance < 25}
            >
              <Ionicons name="cash" size={20} color="#FFFFFF" />
              <Text style={styles.requestPayoutButtonText}>
                {creatorRevenue.pending_balance >= 25 ? 'Request Payout' : 'Minimum $25 Required'}
              </Text>
            </TouchableOpacity>

            {creatorRevenue.pending_balance < 25 && (
              <Text style={[styles.minPayoutText, { color: theme.colors.textSecondary }]}>
                Minimum payout amount is $25.00 USD. Keep earning!
              </Text>
            )}
          </View>
        )}

        {/* Completed Gig Earnings (from opportunity projects — shown even if wallet_transaction not yet created) */}
        {completedGigEarnings.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gig Earnings</Text>
            </View>
            <View style={styles.transactionsList}>
              {completedGigEarnings.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('OpportunityProject' as never, { projectId: project.id } as never)}
                >
                  <View style={[styles.transactionIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                      Gig Payment
                    </Text>
                    <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>
                      {project.opportunity?.title ?? project.title ?? 'Completed gig'}
                    </Text>
                    <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                      {new Date(project.completed_at ?? project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[styles.amountText, { color: theme.colors.success }]}>
                      +{project.currency === 'GBP' ? '£' : '$'}{(project.creator_payout_amount ?? project.agreed_amount ?? 0).toFixed(2)}
                    </Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: '#10B98120' }]}>
                      <Text style={[styles.statusTextSmall, { color: '#10B981' }]}>EARNED</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity onPress={navigateToTransactionHistory}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {recentTransactions.map((transaction) => {
                const isProjectRef = transaction.reference_type === 'opportunity_project' && !!transaction.reference_id;
                return (
                <TouchableOpacity
                  key={transaction.id}
                  style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}
                  disabled={!isProjectRef}
                  activeOpacity={isProjectRef ? 0.75 : 1}
                  onPress={() => {
                    if (isProjectRef) {
                      navigation.navigate('OpportunityProject' as never, { projectId: transaction.reference_id } as never);
                    }
                  }}
                >
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={walletService.getTransactionIcon(transaction.transaction_type) as any}
                      size={24}
                      color={walletService.getStatusColor(transaction.status)}
                    />
                  </View>

                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                      {walletService.getTransactionLabel(transaction)}
                    </Text>
                    <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>
                      {transaction.description || 'Wallet transaction'}
                    </Text>
                    <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                      {walletService.formatDate(transaction.created_at)}
                    </Text>
                    {isProjectRef && (
                      <Text style={[styles.transactionDate, { color: theme.colors.primary, marginTop: 2 }]}>
                        View project →
                      </Text>
                    )}
                  </View>

                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountText,
                      { color: transaction.amount > 0 ? theme.colors.success : theme.colors.error }
                    ]}>
                      {transaction.amount > 0 ? '+' : ''}{currencyService.formatAmount(transaction.amount, transaction.currency)}
                    </Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: walletService.getStatusColor(transaction.status) + '20' }]}>
                      <Text style={[styles.statusTextSmall, { color: walletService.getStatusColor(transaction.status) }]}>
                        {transaction.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                No transactions yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                Your transaction history will appear here
              </Text>
            </View>
          )}
        </View>

        {/* Wallet Info */}
        <View style={[styles.infoSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>About Digital Wallet</Text>
          </View>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Your digital wallet securely stores earnings from gigs, tips, and content sales. Once funds are in your wallet, you can request a withdrawal to your local bank account at any time (minimum $25).
          </Text>
          <View style={styles.infoFeatures}>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Gig payments land in your wallet on completion</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Withdraw to your local bank via Wise (1–3 business days)</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Supports 40+ currencies across Africa, Asia & Latin America</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Real-time transaction tracking</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Minimum withdrawal: $25</Text>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  loadingText: {
    ...Typography.body,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  walletCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletLogo: {
    width: 28,
    height: 28,
  },
  walletAccentTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  walletAccentBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  balanceLabel: {
    ...Typography.label,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 28,
    color: '#FFFFFF',
    fontFamily: Typography.headerLarge.fontFamily,
  },
  walletIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterLabel: {
    ...Typography.label,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  cardFooterNumber: {
    ...Typography.button,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardBrandDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBrandDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cardBrandDotOffset: {
    marginLeft: -6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  withdrawButton: {
    flex: 1,
  },
  withdrawButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  actionButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
  },
  viewAllText: {
    ...Typography.button,
    fontSize: 14,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    ...Typography.button,
    fontSize: 16,
    marginBottom: 2,
  },
  transactionDescription: {
    ...Typography.body,
    fontSize: 14,
    marginBottom: 2,
  },
  transactionDate: {
    ...Typography.label,
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    ...Typography.button,
    fontSize: 16,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusTextSmall: {
    ...Typography.button,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    ...Typography.button,
    fontSize: 16,
  },
  emptyStateSubtext: {
    ...Typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  infoSection: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    ...Typography.button,
    fontSize: 16,
    marginLeft: 8,
  },
  infoText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoFeatures: {
    gap: 4,
  },
  featureItem: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 18,
  },
  revenueCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  revenueTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    marginLeft: 12,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  revenueStat: {
    flex: 1,
    alignItems: 'center',
  },
  revenueStatLabel: {
    ...Typography.label,
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  revenueStatAmount: {
    ...Typography.button,
    fontSize: 18,
    textAlign: 'center',
  },
  requestPayoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  requestPayoutButtonText: {
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  minPayoutText: {
    ...Typography.label,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
