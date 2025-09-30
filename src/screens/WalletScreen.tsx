import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, WalletBalance, WalletTransaction } from '../services/WalletService';

export default function WalletScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to view your wallet');
        return;
      }

      setLoading(true);
      console.log('📱 Loading wallet data...');

      // Load wallet balance and recent transactions in parallel
      const [balanceResult, transactionsResult] = await Promise.all([
        walletService.getWalletBalance(session),
        walletService.getWalletTransactions(session, 5, 0) // Get last 5 transactions
      ]);

      setWalletData(balanceResult);
      setRecentTransactions(transactionsResult.transactions);

      console.log('💰 Wallet balance:', balanceResult);
      console.log('📊 Recent transactions:', transactionsResult.transactions.length);
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
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
        <View style={[styles.walletCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={28} color="#8B5CF6" />
            <Text style={[styles.walletTitle, { color: theme.colors.text }]}>Digital Wallet</Text>
          </View>
          
          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Available Balance</Text>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              {walletData ? walletService.formatAmount(walletData.balance, walletData.currency) : '$0.00'}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                {getWalletStatus()}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={navigateToWithdrawal}
              disabled={!walletData || walletData.balance <= 0}
            >
              <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
              onPress={navigateToTransactionHistory}
            >
              <Ionicons name="list" size={20} color={theme.colors.text} />
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

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
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.transactionIcon}>
                    <Ionicons 
                      name={walletService.getTransactionIcon(transaction.transaction_type) as any} 
                      size={24} 
                      color={walletService.getStatusColor(transaction.status)} 
                    />
                  </View>
                  
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                      {walletService.getTransactionTypeDisplay(transaction.transaction_type)}
                    </Text>
                    <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>
                      {transaction.description || 'Wallet transaction'}
                    </Text>
                    <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                      {walletService.formatDate(transaction.created_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountText,
                      { color: transaction.amount > 0 ? theme.colors.success : theme.colors.error }
                    ]}>
                      {transaction.amount > 0 ? '+' : ''}{walletService.formatAmount(transaction.amount, transaction.currency)}
                    </Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: walletService.getStatusColor(transaction.status) + '20' }]}>
                      <Text style={[styles.statusTextSmall, { color: walletService.getStatusColor(transaction.status) }]}>
                        {transaction.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
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
            Your digital wallet securely stores tips and earnings from your content. 
            You can withdraw funds to your bank account, PayPal, or other supported methods.
          </Text>
          <View style={styles.infoFeatures}>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Secure storage for tips and earnings</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Multiple withdrawal methods</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Real-time transaction tracking</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Legal compliance and reporting</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  walletCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoFeatures: {
    gap: 4,
  },
  featureItem: {
    fontSize: 12,
    lineHeight: 18,
  },
});
