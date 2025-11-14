import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService, WalletBalance, WithdrawalMethod, WithdrawalRequest } from '../services/WalletService';
import { currencyService } from '../services/CurrencyService';

interface WithdrawalMethodOption {
  type: 'bank_transfer' | 'paypal' | 'crypto' | 'prepaid_card';
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

const WITHDRAWAL_METHODS: WithdrawalMethodOption[] = [
  {
    type: 'bank_transfer',
    name: 'Bank Transfer',
    icon: 'card',
    description: 'Direct transfer to your bank account (1-3 business days)',
    available: true,
  },
  {
    type: 'paypal',
    name: 'PayPal',
    icon: 'logo-paypal',
    description: 'Transfer to your PayPal account (instant)',
    available: false, // Coming soon
  },
  {
    type: 'crypto',
    name: 'Cryptocurrency',
    icon: 'logo-bitcoin',
    description: 'Bitcoin, Ethereum, and other cryptocurrencies',
    available: false, // Coming soon
  },
  {
    type: 'prepaid_card',
    name: 'Prepaid Card',
    icon: 'card-outline',
    description: 'Visa/Mastercard prepaid cards',
    available: false, // Coming soon
  },
];

export default function WithdrawalScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [savedMethods, setSavedMethods] = useState<WithdrawalMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreeToFees, setAgreeToFees] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to make withdrawals');
        return;
      }

      setLoading(true);
      console.log('💸 Loading withdrawal data...');

      // Load wallet balance and withdrawal methods in parallel
      const [balanceResult, methodsResult] = await Promise.all([
        walletService.getWalletBalanceSafe(session),
        walletService.getWithdrawalMethods(session).catch(() => ({ methods: [], count: 0 })) // Graceful fallback
      ]);

      setWalletData(balanceResult);
      setSavedMethods(methodsResult.methods || []);

      console.log('💰 Wallet balance:', balanceResult);
      console.log('🏦 Withdrawal methods:', methodsResult.length);
    } catch (error) {
      console.error('Error loading withdrawal data:', error);
      Alert.alert('Error', 'Failed to load withdrawal information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (value: string): boolean => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than $0');
      return false;
    }
    
    if (!walletData || numValue > walletData.balance) {
      Alert.alert('Insufficient Balance', `You can withdraw up to ${currencyService.formatAmount(walletData?.balance || 0, walletData?.currency || 'USD')}`);
      return false;
    }

    const minWithdrawal = 5.00; // $5 minimum
    if (numValue < minWithdrawal) {
      Alert.alert('Minimum Amount', `Minimum withdrawal amount is ${currencyService.formatAmount(minWithdrawal, walletData?.currency || 'USD')}`);
      return false;
    }

    return true;
  };

  const calculateFees = (amount: number): { fee: number; net: number } => {
    // Example fee structure - adjust based on actual requirements
    const feePercentage = 0.025; // 2.5%
    const minimumFee = 0.50; // $0.50 minimum
    
    const calculatedFee = Math.max(amount * feePercentage, minimumFee);
    const netAmount = amount - calculatedFee;
    
    return { fee: calculatedFee, net: netAmount };
  };

  const handleWithdrawal = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to make withdrawals');
        return;
      }

      if (!selectedMethod) {
        Alert.alert('Select Method', 'Please select a withdrawal method');
        return;
      }

      if (!validateAmount(amount)) {
        return;
      }

      if (!agreeToFees) {
        Alert.alert('Agreement Required', 'Please agree to the fees and terms to proceed');
        return;
      }

      const withdrawalAmount = parseFloat(amount);
      const { fee, net } = calculateFees(withdrawalAmount);

      // Show confirmation dialog
      Alert.alert(
        'Confirm Withdrawal',
        `Withdraw ${currencyService.formatAmount(withdrawalAmount, walletData?.currency || 'USD')} via ${selectedMethod.name}?\n\nFee: ${currencyService.formatAmount(fee, walletData?.currency || 'USD')}\nYou'll receive: ${currencyService.formatAmount(net, walletData?.currency || 'USD')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: processWithdrawal }
        ]
      );
    } catch (error) {
      console.error('Error preparing withdrawal:', error);
      Alert.alert('Error', 'Failed to prepare withdrawal. Please try again.');
    }
  };

  const processWithdrawal = async () => {
    try {
      setSubmitting(true);
      console.log('💸 Processing withdrawal...');

      const withdrawalData: WithdrawalRequest = {
        amount: parseFloat(amount),
        currency: walletData?.currency || 'USD',
        withdrawal_method_id: selectedMethod?.id || '',
        description: description || `Withdrawal via ${selectedMethod?.method_name}`,
      };

      // Step 1: Submit withdrawal request
      const withdrawalResult = await walletService.submitWithdrawal(session!, withdrawalData);

      if (withdrawalResult.success) {
        console.log('✅ Withdrawal request submitted:', withdrawalResult.transactionId);

        // Step 2: Process the withdrawal with enhanced status tracking
        const processResult = await walletService.processWithdrawal(
          session!,
          withdrawalResult.transactionId,
          selectedMethod?.id || ''
        );

        if (processResult.success) {
          Alert.alert(
            'Withdrawal Processed',
            `Your withdrawal has been processed successfully!\n\nTransfer ID: ${processResult.data?.transferId}\n\nYou will receive a confirmation email shortly.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to wallet
                  navigation.goBack();
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Processing Error',
            processResult.error || 'Withdrawal was submitted but processing failed. Please contact support.'
          );
        }
      } else {
        Alert.alert('Withdrawal Failed', withdrawalResult.message || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process withdrawal');
    } finally {
      setSubmitting(false);
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

  const renderWithdrawalMethod = (method: WithdrawalMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.methodCard,
        {
          backgroundColor: selectedMethod?.id === method.id ? theme.colors.primary + '20' : theme.colors.card,
          borderColor: selectedMethod?.id === method.id ? theme.colors.primary : theme.colors.border,
          opacity: method.is_verified ? 1 : 0.7,
        }
      ]}
      onPress={() => method.is_verified && setSelectedMethod(method)}
      disabled={!method.is_verified}
    >
      <View style={styles.methodHeader}>
        <View style={[styles.methodIcon, { backgroundColor: getMethodColor(method.method_type) + '20' }]}>
          <Ionicons name={getMethodIcon(method.method_type) as any} size={24} color={getMethodColor(method.method_type)} />
        </View>
        <View style={styles.methodInfo}>
          <View style={styles.methodTitleRow}>
            <Text style={[styles.methodName, { color: theme.colors.text }]}>{method.method_name}</Text>
            {method.is_default && (
              <View style={[styles.defaultBadge, { backgroundColor: theme.colors.success + '20' }]}>
                <Text style={[styles.defaultText, { color: theme.colors.success }]}>Default</Text>
              </View>
            )}
          </View>
          <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
            {method.method_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        {method.is_verified ? (
          <View style={[styles.radioButton, { borderColor: theme.colors.border }]}>
            {selectedMethod?.id === method.id && (
              <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.primary }]} />
            )}
          </View>
        ) : (
          <View style={[styles.pendingBadge, { backgroundColor: theme.colors.warning + '20' }]}>
            <Text style={[styles.pendingText, { color: theme.colors.warning }]}>Pending</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
        
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading withdrawal options...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const withdrawalAmount = parseFloat(amount) || 0;
  const { fee, net } = calculateFees(withdrawalAmount);

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
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
           />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Withdraw Funds</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Info */}
        <View style={[styles.balanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={24} color={theme.colors.primary} />
            <Text style={[styles.balanceTitle, { color: theme.colors.text }]}>Available Balance</Text>
          </View>
          <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
            {walletData ? currencyService.formatAmount(walletData.balance, walletData.currency) : '$0.00'}
          </Text>
        </View>

        {/* Amount Input */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Withdrawal Amount</Text>
          <View style={[styles.amountInputContainer, { borderColor: theme.colors.border }]}>
            <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.colors.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              maxLength={10}
            />
          </View>
          
          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {[25, 50, 100].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={[styles.quickAmountButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setAmount(quickAmount.toString())}
                disabled={!walletData || quickAmount > walletData.balance}
              >
                <Text style={[styles.quickAmountText, { color: theme.colors.text }]}>${quickAmount}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.quickAmountButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => setAmount(walletData?.balance.toString() || '0')}
              disabled={!walletData || walletData.balance <= 0}
            >
              <Text style={[styles.quickAmountText, { color: theme.colors.text }]}>Max</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Withdrawal Methods */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Withdrawal Method</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('WithdrawalMethods' as never)}
              style={styles.manageButton}
            >
              <Text style={[styles.manageButtonText, { color: theme.colors.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {savedMethods.length > 0 ? (
            <View style={styles.methodsList}>
              {savedMethods.map(renderWithdrawalMethod)}
            </View>
          ) : (
            <View style={styles.noMethodsState}>
              <Ionicons name="card-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.noMethodsTitle, { color: theme.colors.text }]}>No Withdrawal Methods</Text>
              <Text style={[styles.noMethodsText, { color: theme.colors.textSecondary }]}>
                Add a withdrawal method to start receiving payments
              </Text>
              <TouchableOpacity 
                style={[styles.addMethodButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('AddWithdrawalMethod' as never)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addMethodButtonText}>Add Method</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Description (Optional) */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.descriptionInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Add a note for this withdrawal..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />
        </View>

        {/* Fee Breakdown */}
        {withdrawalAmount > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fee Breakdown</Text>
            <View style={styles.feeBreakdown}>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Withdrawal Amount</Text>
                <Text style={[styles.feeValue, { color: theme.colors.text }]}>
                  {currencyService.formatAmount(withdrawalAmount, walletData?.currency || 'USD')}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Processing Fee (2.5%)</Text>
                <Text style={[styles.feeValue, { color: theme.colors.error }]}>
                  -{currencyService.formatAmount(fee, walletData?.currency || 'USD')}
                </Text>
              </View>
              <View style={[styles.feeRow, styles.totalRow, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.feeLabel, styles.totalLabel, { color: theme.colors.text }]}>You'll Receive</Text>
                <Text style={[styles.feeValue, styles.totalValue, { color: theme.colors.success }]}>
                  {currencyService.formatAmount(net, walletData?.currency || 'USD')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Agreement */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.agreementContainer}>
            <Switch
              value={agreeToFees}
              onValueChange={setAgreeToFees}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
              thumbColor={agreeToFees ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.agreementText, { color: theme.colors.textSecondary }]}>
              I agree to the processing fees and understand that withdrawals may take 1-3 business days to complete.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: (selectedMethod && withdrawalAmount > 0 && agreeToFees) 
                ? theme.colors.primary 
                : theme.colors.textSecondary,
            }
          ]}
          onPress={handleWithdrawal}
          disabled={!selectedMethod || withdrawalAmount <= 0 || !agreeToFees || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                Submit Withdrawal
              </Text>
            </>
          )}
        </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  balanceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  methodsList: {
    gap: 12,
  },
  methodCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  noMethodsState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noMethodsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noMethodsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  addMethodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  feeBreakdown: {
    gap: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  feeLabel: {
    fontSize: 14,
  },
  totalLabel: {
    fontWeight: '600',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 32,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
