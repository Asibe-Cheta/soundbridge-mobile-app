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
import { walletService, WithdrawalMethod } from '../services/WalletService';

export default function WithdrawalMethodsScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadWithdrawalMethods();
  }, []);

  const loadWithdrawalMethods = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to view withdrawal methods');
        return;
      }

      setLoading(true);
      console.log('🏦 Loading withdrawal methods...');

      const result = await walletService.getWithdrawalMethods(session);
      setWithdrawalMethods(result.methods || []);

      console.log(`🏦 Loaded ${result.methods?.length || 0} withdrawal methods`);
    } catch (error) {
      console.error('Error loading withdrawal methods:', error);
      Alert.alert('Error', 'Failed to load withdrawal methods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWithdrawalMethods();
    setRefreshing(false);
  };

  const handleAddMethod = () => {
    navigation.navigate('AddWithdrawalMethod' as never);
  };

  const handleEditMethod = (method: WithdrawalMethod) => {
    navigation.navigate('EditWithdrawalMethod' as never, { method } as never);
  };

  const handleDeleteMethod = async (method: WithdrawalMethod) => {
    Alert.alert(
      'Delete Withdrawal Method',
      `Are you sure you want to delete "${method.method_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => confirmDeleteMethod(method.id) 
        }
      ]
    );
  };

  const confirmDeleteMethod = async (methodId: string) => {
    try {
      if (!session) return;

      setDeleting(methodId);
      console.log('🗑️ Deleting withdrawal method:', methodId);

      const result = await walletService.deleteWithdrawalMethod(session, methodId);
      
      if (result.success) {
        Alert.alert('Success', 'Withdrawal method deleted successfully');
        await loadWithdrawalMethods(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to delete withdrawal method');
      }
    } catch (error) {
      console.error('Error deleting withdrawal method:', error);
      Alert.alert('Error', 'Failed to delete withdrawal method');
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (method: WithdrawalMethod) => {
    try {
      if (!session) return;

      console.log('⭐ Setting default withdrawal method:', method.id);

      const result = await walletService.updateWithdrawalMethod(session, method.id, {
        is_default: true
      });
      
      if (result.success) {
        Alert.alert('Success', 'Default withdrawal method updated');
        await loadWithdrawalMethods(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to update default method');
      }
    } catch (error) {
      console.error('Error setting default method:', error);
      Alert.alert('Error', 'Failed to update default method');
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'bank_transfer': return 'card';
      case 'paypal': return 'logo-paypal';
      case 'crypto': return 'logo-bitcoin';
      case 'prepaid_card': return 'card-outline';
      default: return 'wallet';
    }
  };

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'bank_transfer': return '#3B82F6';
      case 'paypal': return '#0070BA';
      case 'crypto': return '#F7931A';
      case 'prepaid_card': return '#6B7280';
      default: return theme.colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderWithdrawalMethod = (method: WithdrawalMethod) => (
    <View 
      key={method.id} 
      style={[styles.methodCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
    >
      <View style={styles.methodHeader}>
        <View style={[styles.methodIcon, { backgroundColor: getMethodColor(method.method_type) + '20' }]}>
          <Ionicons 
            name={getMethodIcon(method.method_type) as any} 
            size={24} 
            color={getMethodColor(method.method_type)} 
          />
        </View>
        
        <View style={styles.methodInfo}>
          <View style={styles.methodTitleRow}>
            <Text style={[styles.methodName, { color: theme.colors.text }]}>
              {method.method_name}
            </Text>
            {method.is_default && (
              <View style={[styles.defaultBadge, { backgroundColor: theme.colors.success + '20' }]}>
                <Text style={[styles.defaultText, { color: theme.colors.success }]}>Default</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.methodType, { color: theme.colors.textSecondary }]}>
            {method.method_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          
          <View style={styles.methodStatus}>
            <View style={[styles.statusBadge, { backgroundColor: method.is_verified ? theme.colors.success + '20' : theme.colors.warning + '20' }]}>
              <Ionicons 
                name={method.is_verified ? 'checkmark-circle' : 'time'} 
                size={12} 
                color={method.is_verified ? theme.colors.success : theme.colors.warning} 
              />
              <Text style={[
                styles.statusText, 
                { color: method.is_verified ? theme.colors.success : theme.colors.warning }
              ]}>
                {method.is_verified ? 'Verified' : 'Pending'}
              </Text>
            </View>
            
            <Text style={[styles.methodDate, { color: theme.colors.textSecondary }]}>
              Added {formatDate(method.created_at)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.methodActions}>
        {!method.is_default && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleSetDefault(method)}
          >
            <Ionicons name="star-outline" size={16} color={theme.colors.text} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Set Default</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => handleEditMethod(method)}
        >
          <Ionicons name="pencil" size={16} color={theme.colors.text} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton, { borderColor: theme.colors.error }]}
          onPress={() => handleDeleteMethod(method)}
          disabled={deleting === method.id}
        >
          {deleting === method.id ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <>
              <Ionicons name="trash" size={16} color={theme.colors.error} />
              <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading withdrawal methods...</Text>
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Withdrawal Methods</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddMethod}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Add Method Button */}
        <TouchableOpacity 
          style={[styles.addMethodCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={handleAddMethod}
        >
          <View style={[styles.addMethodIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.addMethodInfo}>
            <Text style={[styles.addMethodTitle, { color: theme.colors.text }]}>Add New Method</Text>
            <Text style={[styles.addMethodDescription, { color: theme.colors.textSecondary }]}>
              Add a bank account, PayPal, crypto wallet, or prepaid card
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Withdrawal Methods List */}
        {withdrawalMethods.length > 0 ? (
          <View style={styles.methodsList}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Your Withdrawal Methods ({withdrawalMethods.length})
            </Text>
            {withdrawalMethods.map(renderWithdrawalMethod)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Withdrawal Methods</Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              Add your first withdrawal method to start receiving payments
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>About Withdrawal Methods</Text>
          </View>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Withdrawal methods allow you to receive payments from your digital wallet. 
            You can add multiple methods and set one as your default for faster withdrawals.
          </Text>
          <View style={styles.infoFeatures}>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Secure encryption for all financial data</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Multi-step verification process</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Support for multiple currencies</Text>
            <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>• Real-time processing status</Text>
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
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addMethodInfo: {
    flex: 1,
  },
  addMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addMethodDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodsList: {
    marginBottom: 24,
  },
  methodCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  methodType: {
    fontSize: 14,
    marginBottom: 8,
  },
  methodStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  methodDate: {
    fontSize: 12,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  deleteButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
