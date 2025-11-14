import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, WalletTransaction } from '../services/WalletService';
import { currencyService } from '../services/CurrencyService';

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'tip_received' | 'tip_sent' | 'payout' | 'refund';

const FILTER_OPTIONS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'tip_received', label: 'Tips Received', icon: 'trending-up' },
  { key: 'withdrawal', label: 'Withdrawals', icon: 'arrow-up-circle' },
  { key: 'deposit', label: 'Deposits', icon: 'arrow-down-circle' },
  { key: 'payout', label: 'Payouts', icon: 'card' },
  { key: 'refund', label: 'Refunds', icon: 'refresh-circle' },
];

export default function TransactionHistoryScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const LIMIT = 20;

  useEffect(() => {
    loadTransactions(true);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [transactions, activeFilter]);

  const loadTransactions = async (reset: boolean = false) => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to view transactions');
        return;
      }

      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      console.log(`📊 Loading transactions: offset=${currentOffset}, limit=${LIMIT}`);

      const result = await walletService.getWalletTransactionsSafe(session, LIMIT, currentOffset);
      
      if (reset) {
        setTransactions(result.transactions);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
      }

      setHasMore(result.transactions.length === LIMIT);
      setOffset(currentOffset + result.transactions.length);

      console.log(`📊 Loaded ${result.transactions.length} transactions, total: ${reset ? result.transactions.length : transactions.length + result.transactions.length}`);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transaction history. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyFilter = () => {
    if (activeFilter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.transaction_type === activeFilter));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadTransactions(false);
    }
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => (
    <View style={[styles.transactionItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.transactionIcon, { backgroundColor: walletService.getStatusColor(item.status) + '20' }]}>
        <Ionicons 
          name={walletService.getTransactionIcon(item.transaction_type) as any} 
          size={24} 
          color={walletService.getStatusColor(item.status)} 
        />
      </View>
      
      <View style={styles.transactionDetails}>
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionType, { color: theme.colors.text }]}>
            {walletService.getTransactionTypeDisplay(item.transaction_type)}
          </Text>
          <Text style={[
            styles.amountText,
            { color: item.amount > 0 ? theme.colors.success : theme.colors.error }
          ]}>
            {item.amount > 0 ? '+' : ''}{currencyService.formatAmount(item.amount, item.currency)}
          </Text>
        </View>
        
        <Text style={[styles.transactionDescription, { color: theme.colors.textSecondary }]}>
          {item.description || 'Wallet transaction'}
        </Text>
        
        <View style={styles.transactionFooter}>
          <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
            {walletService.formatDate(item.created_at)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: walletService.getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: walletService.getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFilter = ({ item }: { item: typeof FILTER_OPTIONS[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { 
          backgroundColor: activeFilter === item.key ? theme.colors.primary : theme.colors.surface,
          borderColor: activeFilter === item.key ? theme.colors.primary : theme.colors.border
        }
      ]}
      onPress={() => setActiveFilter(item.key)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={16} 
        color={activeFilter === item.key ? '#FFFFFF' : theme.colors.text} 
      />
      <Text style={[
        styles.filterText,
        { color: activeFilter === item.key ? '#FFFFFF' : theme.colors.text }
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Transactions</Text>
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        {activeFilter === 'all' 
          ? 'Your transaction history will appear here'
          : `No ${FILTER_OPTIONS.find(f => f.key === activeFilter)?.label.toLowerCase()} transactions found`
        }
      </Text>
    </View>
  );

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
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading transactions...</Text>
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transaction History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface }]}>
        <FlatList
          data={FILTER_OPTIONS}
          renderItem={renderFilter}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Summary */}
      <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
          {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          {activeFilter !== 'all' && ` • ${FILTER_OPTIONS.find(f => f.key === activeFilter)?.label}`}
        </Text>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredTransactions.length === 0 && styles.emptyListContent
        ]}
        showsVerticalScrollIndicator={false}
      />
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
  placeholder: {
    width: 40,
  },
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
});
