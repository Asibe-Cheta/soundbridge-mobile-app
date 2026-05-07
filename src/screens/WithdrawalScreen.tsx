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
import { payoutService, PayoutEligibility, CreatorRevenue } from '../services/PayoutService';
import { revenueService, BankAccount } from '../services/revenueService';
import { SystemTypography as Typography } from '../constants/Typography';

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
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState('');
  const [payoutAmountInput, setPayoutAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreeToFees, setAgreeToFees] = useState(false);
  const [payoutEligibility, setPayoutEligibility] = useState<PayoutEligibility | null>(null);
  const [creatorRevenue, setCreatorRevenue] = useState<CreatorRevenue | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to make withdrawals');
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('💸 Loading withdrawal data...');

      // Load wallet balance, bank account, payout eligibility, and creator revenue in parallel
      const [balanceResult, bankResult, eligibilityResult, revenueResult] = await Promise.all([
        walletService.getWalletBalanceSafe(session),
        revenueService.getBankAccount(session.user.id).catch(() => null),
        payoutService.checkEligibility(session).catch(() => null),
        payoutService.getCreatorRevenue(session).catch(() => null),
      ]);

      setWalletData(balanceResult);
      setBankAccount(bankResult);
      setPayoutEligibility(eligibilityResult);
      setCreatorRevenue(revenueResult);

      console.log('💰 Wallet balance:', balanceResult);
      console.log('🏦 Bank account:', bankResult ? `${bankResult.bank_name} (${bankResult.currency})` : 'None');
      console.log('✅ Payout eligibility:', eligibilityResult);
      console.log('💵 Creator revenue:', revenueResult);
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

      if (!validateAmount(withdrawalAmountInput)) {
        return;
      }

      if (!agreeToFees) {
        Alert.alert('Agreement Required', 'Please agree to the fees and terms to proceed');
        return;
      }

      const withdrawalAmount = parseFloat(withdrawalAmountInput);
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
        amount: parseFloat(withdrawalAmountInput),
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

  const handlePayoutRequest = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to request a payout');
        return;
      }

      if (!validatePayoutAmount(payoutAmountInput)) {
        return;
      }

      const payoutAmount = parseFloat(payoutAmountInput);

      // Show confirmation dialog
      Alert.alert(
        'Confirm Payout Request',
        `Request payout of ${currencyService.formatAmount(payoutAmount, creatorRevenue?.currency || 'USD')}?\n\nFunds sent via Fincra (Africa) or Stripe (UK/EU/US). Typically arrive within 1–3 business days.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Request', onPress: () => processPayoutRequest(payoutAmount) }
        ]
      );
    } catch (error) {
      console.error('Error preparing payout:', error);
      Alert.alert('Error', 'Failed to prepare payout request. Please try again.');
    }
  };

  const processPayoutRequest = async (payoutAmount: number) => {
    try {
      setSubmitting(true);
      console.log('💸 Processing payout request...');

      const result = await payoutService.requestPayout(session!, {
        amount: payoutAmount,
        currency: creatorRevenue?.currency || 'USD',
        notes: description || `Creator payout request`,
      });

      if (result.success) {
        console.log('✅ Payout request submitted:', result.payout);

        Alert.alert(
          'Payout Requested',
          `Your payout request has been submitted successfully!\n\nAmount: ${currencyService.formatAmount(payoutAmount, creatorRevenue?.currency || 'USD')}\nStatus: Pending\n\nFunds are sent via Fincra (Africa) or Stripe (UK/EU/US) and typically arrive in your local bank within 1–3 business days. You'll receive a notification when the payout is processed.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form and reload data
                setPayoutAmountInput('');
                setDescription('');
                setShowPayoutForm(false);
                loadData();
              }
            }
          ]
        );
      } else {
        Alert.alert('Payout Failed', result.error || 'Failed to submit payout request. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      Alert.alert('Error', 'Payout request failed. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const validatePayoutAmount = (value: string): boolean => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than $0');
      return false;
    }

    if (!creatorRevenue || numValue > creatorRevenue.available_balance) {
      Alert.alert(
        'Insufficient Balance',
        `Your available balance is ${currencyService.formatAmount(creatorRevenue?.available_balance || 0, creatorRevenue?.currency || 'USD')}`
      );
      return false;
    }

    const minPayout = 25.00; // $25 minimum
    if (numValue < minPayout) {
      Alert.alert(
        'Minimum Amount',
        `Minimum payout amount is ${currencyService.formatAmount(minPayout, creatorRevenue?.currency || 'USD')}`
      );
      return false;
    }

    return true;
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

  const withdrawalAmount = parseFloat(withdrawalAmountInput) || 0;
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

        {/* Creator Revenue Payout Section */}
        {creatorRevenue && creatorRevenue.available_balance > 0 && (
          <View style={[styles.payoutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <View style={styles.payoutHeader}>
              <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
              <Text style={[styles.payoutTitle, { color: theme.colors.text }]}>Creator Earnings Payout</Text>
            </View>

            <View style={styles.payoutStats}>
              <View style={styles.payoutStat}>
                <Text style={[styles.payoutStatLabel, { color: theme.colors.textSecondary }]}>Available</Text>
                <Text style={[styles.payoutStatAmount, { color: theme.colors.primary }]}>
                  {currencyService.formatAmount(creatorRevenue.available_balance, creatorRevenue.currency)}
                </Text>
              </View>
              <View style={styles.payoutStat}>
                <Text style={[styles.payoutStatLabel, { color: theme.colors.textSecondary }]}>Total Earned</Text>
                <Text style={[styles.payoutStatAmount, { color: theme.colors.success }]}>
                  {currencyService.formatAmount(creatorRevenue.total_earned, creatorRevenue.currency)}
                </Text>
              </View>
            </View>

            {payoutEligibility && !payoutEligibility.eligible && (() => {
              // Filter out RPC-failure reasons when we have reliable local data
              const hasLocalData = creatorRevenue.available_balance > 0 && bankAccount?.is_verified;
              const rpcOnlyFailure = payoutEligibility.reasons.every(r =>
                r.toLowerCase().includes('unable to determine') || r.toLowerCase().includes('something went wrong')
              );
              if (hasLocalData && rpcOnlyFailure) return null;
              const realReasons = payoutEligibility.reasons.filter(r =>
                !r.toLowerCase().includes('unable to determine') && !r.toLowerCase().includes('something went wrong')
              );
              if (realReasons.length === 0) return null;
              return (
                <View style={[styles.ineligibleBanner, { backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning }]}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
                  <View style={styles.ineligibleInfo}>
                    <Text style={[styles.ineligibleTitle, { color: theme.colors.warning }]}>Payout Not Available</Text>
                    {realReasons.map((reason, index) => (
                      <Text key={index} style={[styles.ineligibleReason, { color: theme.colors.textSecondary }]}>• {reason}</Text>
                    ))}
                  </View>
                </View>
              );
            })()}

            {(
              !payoutEligibility ||
              payoutEligibility.eligible ||
              (creatorRevenue.available_balance > 0 && bankAccount?.is_verified)
            ) && (
              <TouchableOpacity
                style={styles.requestPayoutBtn}
                onPress={() => setShowPayoutForm(!showPayoutForm)}
                disabled={creatorRevenue.available_balance < 25}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#DC2626', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.requestPayoutBtnGradient}
                >
                  <Ionicons name="cash" size={20} color="#FFFFFF" />
                  <Text style={styles.requestPayoutBtnText}>
                    {creatorRevenue.available_balance >= 25 ? 'Request Payout' : 'Minimum $25 Required'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {showPayoutForm && (
              <View style={styles.payoutForm}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>Payout Amount</Text>
                <View style={[styles.amountInputContainer, { borderColor: theme.colors.border }]}>
                    <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>
                      {currencyService.getCurrencySymbol(creatorRevenue?.currency || 'USD')}
                    </Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={payoutAmountInput}
                    onChangeText={setPayoutAmountInput}
                    keyboardType="decimal-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.quickAmounts}>
                  {[25, 50, 100].map((quickAmount) => (
                    <TouchableOpacity
                      key={quickAmount}
                      style={[styles.quickAmountBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      onPress={() => setPayoutAmountInput(Math.min(quickAmount, creatorRevenue.available_balance).toString())}
                    >
                    <Text style={[styles.quickAmountText, { color: theme.colors.text }]}>
                      {currencyService.getCurrencySymbol(creatorRevenue?.currency || 'USD')}
                      {quickAmount}
                    </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.quickAmountBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => setPayoutAmountInput(creatorRevenue.available_balance.toString())}
                  >
                    <Text style={[styles.quickAmountText, { color: theme.colors.text }]}>Max</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.submitPayoutBtn}
                  onPress={handlePayoutRequest}
                  disabled={submitting || !payoutAmountInput || parseFloat(payoutAmountInput) <= 0}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#DC2626', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitPayoutBtnGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.submitPayoutBtnText}>Confirm Payout</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={[styles.payoutNote, { color: theme.colors.textSecondary }]}>
                  Funds are sent via Fincra (Africa) or Stripe (UK/EU/US) and typically arrive in your local bank within 1–3 business days. No SoundBridge fees charged.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Payout Destination — sourced from creator_bank_accounts */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payout Destination</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PaymentMethods' as never)}
              style={styles.manageButton}
            >
              <Text style={[styles.manageButtonText, { color: theme.colors.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>

          {bankAccount ? (
            <View style={[styles.bankAccountCard, { backgroundColor: theme.colors.surface, borderColor: bankAccount.is_verified ? theme.colors.success : theme.colors.border }]}>
              <View style={styles.bankAccountRow}>
                <View style={[styles.bankIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="business" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bankName, { color: theme.colors.text }]}>{bankAccount.bank_name}</Text>
                  <Text style={[styles.bankDetail, { color: theme.colors.textSecondary }]}>
                    {bankAccount.account_holder_name} · ****{bankAccount.account_number_encrypted?.slice(-4)} · {bankAccount.currency}
                  </Text>
                </View>
                {bankAccount.is_verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success + '20' }]}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                    <Text style={[styles.verifiedText, { color: theme.colors.success }]}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noMethodsState}>
              <Ionicons name="card-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.noMethodsTitle, { color: theme.colors.text }]}>No Bank Account</Text>
              <Text style={[styles.noMethodsText, { color: theme.colors.textSecondary }]}>
                Add your bank account in Payment Methods to receive payouts
              </Text>
              <TouchableOpacity
                style={[styles.addMethodButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('PaymentMethods' as never)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addMethodButtonText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          )}
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
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
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
    ...Typography.button,
    fontSize: 16,
    marginLeft: 8,
  },
  balanceAmount: {
    ...Typography.button,
    fontSize: 24,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
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
    ...Typography.button,
    fontSize: 14,
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
    ...Typography.button,
    fontSize: 18,
    marginRight: 8,
  },
  amountInput: {
    ...Typography.button,
    flex: 1,
    fontSize: 18,
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
    ...Typography.button,
    fontSize: 14,
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
    ...Typography.button,
    fontSize: 16,
    marginBottom: 2,
  },
  methodDescription: {
    ...Typography.label,
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
    ...Typography.label,
    fontSize: 10,
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
    ...Typography.label,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    ...Typography.label,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  noMethodsState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noMethodsTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
  },
  noMethodsText: {
    ...Typography.label,
    textAlign: 'center',
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
    ...Typography.button,
    fontSize: 14,
    color: '#FFFFFF',
  },
  bankAccountCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  bankAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    ...Typography.headerSmall,
    fontSize: 15,
  },
  bankDetail: {
    ...Typography.label,
    fontSize: 13,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
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
    ...Typography.label,
  },
  totalLabel: {
    ...Typography.button,
    fontSize: 14,
  },
  feeValue: {
    ...Typography.label,
  },
  totalValue: {
    ...Typography.button,
    fontSize: 16,
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  agreementText: {
    ...Typography.label,
    flex: 1,
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
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  payoutCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    marginLeft: 12,
  },
  payoutStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  payoutStat: {
    flex: 1,
    alignItems: 'center',
  },
  payoutStatLabel: {
    ...Typography.label,
    fontSize: 12,
    marginBottom: 4,
  },
  payoutStatAmount: {
    ...Typography.button,
    fontSize: 18,
  },
  ineligibleBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  ineligibleInfo: {
    flex: 1,
  },
  ineligibleTitle: {
    ...Typography.button,
    fontSize: 14,
    marginBottom: 4,
  },
  ineligibleReason: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  requestPayoutBtn: {
    marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  requestPayoutBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  requestPayoutBtnText: {
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  payoutForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  formLabel: {
    ...Typography.button,
    fontSize: 14,
    marginBottom: 8,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickAmountText: {
    ...Typography.button,
    fontSize: 14,
  },
  submitPayoutBtn: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  submitPayoutBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  submitPayoutBtnText: {
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  payoutNote: {
    ...Typography.label,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});
