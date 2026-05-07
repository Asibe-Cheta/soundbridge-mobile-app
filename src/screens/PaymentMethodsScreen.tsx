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
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService } from '../services/WalletService';
import { currencyService } from '../services/CurrencyService';
import { revenueService } from '../services/revenueService';
import CountryAwareBankForm from '../components/CountryAwareBankForm';
import { SystemTypography as Typography } from '../constants/Typography';

interface BankAccount {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_encrypted: string;
  routing_number_encrypted: string;
  account_type: 'checking' | 'savings';
  currency: string;
  verification_status: 'pending' | 'verified' | 'failed';
  is_verified: boolean;
  created_at: string;
}

interface BankAccountFormData {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  currency: string;
}

// Currencies routed through Wise — Stripe Connect is irrelevant for these
const WISE_CURRENCIES = new Set([
  'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'EGP', 'RWF', 'XOF', 'XAF',
  'INR', 'IDR', 'MYR', 'PHP', 'THB', 'VND', 'BDT', 'PKR', 'LKR', 'NPR', 'CNY', 'KRW',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'CRC', 'UYU',
  'TRY', 'ILS', 'MAD', 'UAH', 'GEL',
]);

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [statusDisplay, setStatusDisplay] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [cleaningAccounts, setCleaningAccounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [isWiseCountry, setIsWiseCountry] = useState(false);
  
  const [formData, setFormData] = useState<BankAccountFormData>({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    currency: 'USD'
  });

  useEffect(() => {
    loadBankAccount();
  }, []);

  const loadBankAccount = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading bank account data...');

      // Detect country in parallel with loading bank account
      const [account, countryResult] = await Promise.allSettled([
        revenueService.getBankAccount(session.user.id),
        walletService.detectCountryForStripe(session),
      ]);

      const resolvedAccount = account.status === 'fulfilled' ? account.value : null;
      setBankAccount(resolvedAccount);
      setFormData({
        account_holder_name: resolvedAccount?.account_holder_name || '',
        bank_name: resolvedAccount?.bank_name || '',
        account_number: resolvedAccount?.account_number_encrypted || '',
        routing_number: resolvedAccount?.routing_number_encrypted || '',
        account_type: resolvedAccount?.account_type || 'checking',
        currency: resolvedAccount?.currency || 'USD'
      });

      // Determine payout provider from country detection
      if (countryResult.status === 'fulfilled') {
        setIsWiseCountry(!countryResult.value.supported_by_stripe);
      }

      console.log('✅ Bank account loaded:', resolvedAccount ? 'Found' : 'None');

      // Check Stripe account status only for non-Wise users with a bank account
      await checkAccountStatus(resolvedAccount);

      console.log('✅ Bank account data loaded');
    } catch (error) {
      // Don't show error dialog — just show the empty/setup state
      console.error('❌ Error loading bank account:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check Stripe account status and update display
   */
  const checkAccountStatus = async (accountOverride?: BankAccount | null) => {
    if (!session) return;

    try {
      setCheckingStatus(true);

      const accountToCheck = accountOverride ?? bankAccount;
      // ✅ SKIP STRIPE CHECK FOR WISE-SUPPORTED CURRENCIES
      // Users with Wise currencies (NGN, INR, BRL, etc.) don't need Stripe Connect
      const wiseCurrencies = [
        'NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'EGP',  // Africa
        'INR', 'IDR', 'MYR', 'PHP', 'THB', 'VND', 'BDT', 'PKR', 'LKR', 'NPR', 'CNY', 'KRW',  // Asia
        'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'CRC', 'UYU',  // Latin America
        'TRY', 'ILS', 'MAD', 'UAH', 'GEL',  // Middle East & Europe
      ];

      if (accountToCheck && wiseCurrencies.includes(accountToCheck.currency)) {
        console.log(`ℹ️ User has Wise currency (${accountToCheck.currency}) - skipping Stripe check`);
        setStatusDisplay({
          status: 'wise',
          color: '#10B981',
          icon: 'globe-outline',
          message: 'Payouts via Wise (no Stripe required)',
          actionRequired: false,
        });
        setCheckingStatus(false);
        return;
      }

      console.log('🔍 Checking Stripe account status...');

      const statusResult = await walletService.checkStripeAccountStatusSafe(session);

      if (statusResult?.success && statusResult?.accountStatus) {
        const status = statusResult.accountStatus;
        setAccountStatus(status);

        // Get display information
        const display = walletService.getVerificationStatusDisplay(status);
        setStatusDisplay(display);

        console.log('✅ Account status updated:', display);

        // Show alert for restricted accounts
        if (walletService.isAccountRestricted(status)) {
          Alert.alert(
            'Account Restricted',
            'Your Stripe account has been restricted. This may be due to multiple verification attempts. You can clean up restricted accounts and contact Stripe support for assistance.',
            [
              { text: 'Contact Support', onPress: () => handleContactSupport() },
              { text: 'Clean Up Accounts', onPress: () => handleCleanupAccounts() },
              { text: 'OK', style: 'cancel' }
            ]
          );
        }
      } else {
        console.log('⚠️ No account status available');
        setStatusDisplay({
          status: 'unknown',
          color: '#6B7280',
          icon: 'help-circle',
          message: 'Unable to check account status',
          actionRequired: false,
        });
      }
    } catch (error) {
      console.error('❌ Error checking account status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  /**
   * Clean up restricted Stripe accounts
   */
  const handleCleanupAccounts = async () => {
    if (!session) return;

    Alert.alert(
      'Clean Up Restricted Accounts',
      'This will remove restricted Stripe accounts from your profile. You may need to contact Stripe support before creating new accounts. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clean Up', 
          style: 'destructive',
          onPress: async () => {
            try {
              setCleaningAccounts(true);
              console.log('🧹 Cleaning up restricted accounts...');
              
              const cleanupResult = await walletService.cleanupRestrictedAccountsSafe(session);
              
              if (cleanupResult?.success) {
                Alert.alert(
                  'Accounts Cleaned',
                  `Successfully cleaned up ${cleanupResult.cleaned || 0} restricted accounts. ${cleanupResult.recommendation || ''}`,
                  [
                    { text: 'Contact Support', onPress: () => handleContactSupport() },
                    { text: 'OK' }
                  ]
                );
                
                // Refresh account status
                await checkAccountStatus();
                await loadBankAccount();
              } else {
                Alert.alert('Error', 'Failed to clean up accounts. Please try again.');
              }
            } catch (error) {
              console.error('❌ Error cleaning up accounts:', error);
              Alert.alert('Error', 'Failed to clean up accounts. Please try again.');
            } finally {
              setCleaningAccounts(false);
            }
          }
        }
      ]
    );
  };

  /**
   * Open Stripe support link
   */
  const handleContactSupport = () => {
    Linking.openURL('https://support.stripe.com/');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate form
      if (!formData.account_holder_name.trim()) {
        Alert.alert('Validation Error', 'Account holder name is required');
        return;
      }
      if (!formData.bank_name.trim()) {
        Alert.alert('Validation Error', 'Bank name is required');
        return;
      }
      if (!formData.account_number.trim()) {
        Alert.alert('Validation Error', 'Account number is required');
        return;
      }
      if (!formData.routing_number.trim() || formData.routing_number.length !== 9) {
        Alert.alert('Validation Error', 'Routing number must be 9 digits');
        return;
      }

      // ✅ SAVE BANK ACCOUNT TO DATABASE
      const result = await revenueService.setBankAccount(user?.id || '', formData);

      if (result.success) {
        Alert.alert('Success', 'Bank account information saved successfully!');
        setIsEditing(false);
        await loadBankAccount(); // Reload to show saved data
      } else {
        throw new Error(result.error?.message || 'Failed to save bank account');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      Alert.alert('Error', 'Failed to save bank account information');
    } finally {
      setSaving(false);
    }
  };





  const handleCountryAwareBankSubmit = async (methodData: any) => {
    try {
      console.log('🏦 Submitting country-aware bank account:', methodData);

      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // ✅ SAVE COUNTRY-AWARE BANK ACCOUNT TO DATABASE
      const derivedCurrency = methodData.currency
        || (methodData.country ? currencyService.getCurrencyForCountry(methodData.country) : undefined)
        || 'USD';
      const formData = {
        account_holder_name: methodData.account_holder_name || methodData.accountHolderName,
        bank_name: methodData.bank_name || methodData.bankName,
        account_number: methodData.account_number || methodData.accountNumber,
        routing_number: methodData.bank_code || methodData.routing_number || methodData.routingNumber || '',
        account_type: methodData.account_type || methodData.accountType || 'checking',
        currency: derivedCurrency,
      };

      const result = await revenueService.setBankAccount(user.id, formData);

      if (result.success) {
        Alert.alert('Success', 'Bank account added successfully with country-aware details!');
        setIsEditing(false);
        await loadBankAccount(); // Refresh data
      } else {
        throw new Error(result.error?.message || 'Failed to save bank account');
      }
    } catch (error: any) {
      console.error('❌ Error adding bank account:', error);
      Alert.alert('Error', error.message || 'Failed to add bank account. Please try again.');
    }
  };

  const handleSetupStripeConnect = async () => {
    try {
      setSaving(true);

      if (!user || !session) {
        Alert.alert('Error', 'You must be logged in to set up payments');
        return;
      }

      // Validate session is not expired
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        console.log('Session expired, attempting refresh...');
        Alert.alert('Session Expired', 'Please sign in again to continue');
        return;
      }

      console.log('=== STRIPE CONNECT DEFERRED ONBOARDING ===');
      console.log('User ID:', user?.id);
      console.log('User email:', session?.user?.email);

      // Step 1: Detect user's country for Stripe Connect
      console.log('🌍 Detecting user country...');
      let userCountry = 'US'; // Default fallback

      try {
        const countryResult = await walletService.detectCountryForStripe(session);
        if (countryResult.supported_by_stripe) {
          userCountry = countryResult.country_code;
          console.log(`✅ Country detected: ${countryResult.country_name} (${userCountry}) - Currency: ${countryResult.currency}`);
        } else {
          console.log(`⚠️ Country ${countryResult.country_name} not supported by Stripe, using fallback: ${userCountry}`);
        }
      } catch (error) {
        console.log('❌ Country detection failed, using fallback:', userCountry);
      }

      // Step 2: Create Stripe Connect account with DEFERRED onboarding
      console.log(`🏦 Creating Stripe Connect account for ${userCountry} (deferred onboarding)...`);

      const result = await walletService.createStripeConnectAccount(session, userCountry, 'deferred');
      console.log('Stripe Connect API response:', result);

      if (result.success) {
        if (result.skipOnboarding) {
          // DEFERRED MODE: Account created instantly, no onboarding needed now
          Alert.alert(
            'Account Created!',
            result.message || 'Your Stripe Connect account has been created! You can start earning immediately. Complete verification when you want to withdraw funds.',
            [
              {
                text: 'OK',
                onPress: () => {
                  loadBankAccount();
                  checkAccountStatus();
                }
              }
            ]
          );
        } else if (result.onboardingUrl) {
          // IMMEDIATE MODE: Redirect to Stripe onboarding
          const supported = await Linking.canOpenURL(result.onboardingUrl);

          if (supported) {
            await Linking.openURL(result.onboardingUrl);

            Alert.alert(
              'Complete Stripe Setup',
              `You've been redirected to Stripe to set up your ${result.country || userCountry} payout account. Once completed, return to the app to see your connected account.`,
              [
                { text: 'OK' },
                {
                  text: 'Refresh',
                  onPress: () => loadBankAccount()
                }
              ]
            );
          } else {
            Alert.alert('Error', 'Unable to open Stripe setup page');
          }
        }
      } else {
        // Handle specific error cases
        if (result.action === 'setup_platform_profile' && result.url) {
          Alert.alert(
            'Platform Setup Required',
            result.details || 'Additional setup is required on Stripe\'s end.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Setup',
                onPress: () => Linking.openURL(result.url)
              }
            ]
          );
        } else if (result.action === 'enable_connect') {
          Alert.alert(
            'Stripe Connect Not Enabled',
            result.details || 'Stripe Connect needs to be enabled for this account.',
            [{ text: 'OK' }]
          );
        } else {
          const errorMsg = result.error || 'Failed to set up Stripe Connect account';
          console.error('Stripe Connect setup failed:', errorMsg);
          Alert.alert('Setup Failed', errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Error setting up Stripe Connect:', error);

      if (error.name === 'AbortError') {
        Alert.alert('Request Timeout', 'The request took too long to complete. Please try again.');
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        Alert.alert('Connection Error', 'Unable to connect to the payment server. Please check your internet connection.');
      } else {
        Alert.alert('Error', 'Failed to connect to payment service. Please check your internet connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteVerification = async () => {
    try {
      setSaving(true);

      if (!user || !session) {
        Alert.alert('Error', 'You must be logged in to complete verification');
        return;
      }

      console.log('🛡️ Starting verification process...');

      // Detect user's country
      let userCountry = 'US';
      try {
        const countryResult = await walletService.detectCountryForStripe(session);
        if (countryResult.supported_by_stripe) {
          userCountry = countryResult.country_code;
        }
      } catch (error) {
        console.log('❌ Country detection failed, using fallback:', userCountry);
      }

      // Create Stripe Connect account with IMMEDIATE onboarding
      const result = await walletService.createStripeConnectAccount(session, userCountry, 'immediate');
      console.log('Stripe Connect verification response:', result);

      if (result.success && result.onboardingUrl) {
        const supported = await Linking.canOpenURL(result.onboardingUrl);

        if (supported) {
          await Linking.openURL(result.onboardingUrl);

          Alert.alert(
            'Complete Verification',
            'You\'ve been redirected to Stripe to complete verification. Once finished, return to the app.',
            [
              { text: 'OK' },
              {
                text: 'Refresh',
                onPress: () => {
                  loadBankAccount();
                  checkAccountStatus();
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Unable to open Stripe verification page');
        }
      } else {
        const errorMsg = result.error || 'Failed to start verification process';
        console.error('Verification failed:', errorMsg);
        Alert.alert('Verification Failed', errorMsg);
      }
    } catch (error: any) {
      console.error('Error completing verification:', error);
      Alert.alert('Error', 'Failed to start verification process. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetBankAccount = async () => {
    try {
      if (!session) {
        Alert.alert('Error', 'You must be logged in to reset your bank account');
        return;
      }

      setSaving(true);
      console.log('🔄 Resetting bank account...');

      const result = await walletService.resetBankAccount(session);
      
      if (result.success) {
        Alert.alert(
          'Success', 
          result.message || 'Bank account reset successfully! You can now set up a new account.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh the screen data
                loadBankAccount();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to reset bank account');
      }
    } catch (error) {
      console.error('Bank account reset error:', error);
      Alert.alert('Reset Error', error instanceof Error ? error.message : 'Failed to reset bank account');
    } finally {
      setSaving(false);
    }
  };

  const showResetConfirmation = () => {
    Alert.alert(
      'Reset Bank Account',
      'Are you sure you want to reset your bank account? This will clear your current Stripe Connect setup and allow you to start fresh.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive', 
          onPress: handleResetBankAccount 
        }
      ]
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (bankAccount) {
      setFormData({
        account_holder_name: bankAccount.account_holder_name,
        bank_name: bankAccount.bank_name,
        account_number: bankAccount.account_number_encrypted,
        routing_number: bankAccount.routing_number_encrypted,
        account_type: bankAccount.account_type,
        currency: bankAccount.currency
      });
    } else {
      setFormData({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        routing_number: '',
        account_type: 'checking',
        currency: 'USD'
      });
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'failed':
        return 'close-circle';
      default:
        return 'alert-circle';
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
        
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payment Methods</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading payment methods...</Text>
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
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payment Methods</Text>
          {bankAccount && !isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {!bankAccount && <View style={{ width: 24 }} />}
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Account Status Section */}
        {statusDisplay && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Stripe Account Status</Text>
              <TouchableOpacity 
                style={[styles.refreshButton, { backgroundColor: theme.colors.card }]}
                onPress={checkAccountStatus}
                disabled={checkingStatus}
              >
                {checkingStatus ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons name="refresh" size={16} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusIcon, { backgroundColor: `${statusDisplay.color}20` }]}>
                  <Ionicons 
                    name={statusDisplay.icon as any} 
                    size={20} 
                    color={statusDisplay.color} 
                  />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                    {statusDisplay.status.charAt(0).toUpperCase() + statusDisplay.status.slice(1)}
                  </Text>
                  <Text style={[styles.statusMessage, { color: theme.colors.textSecondary }]}>
                    {statusDisplay.message}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action buttons for restricted accounts */}
            {statusDisplay.status === 'restricted' && (
              <View style={styles.restrictedActions}>
                <TouchableOpacity 
                  style={[styles.supportButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleContactSupport}
                >
                  <Ionicons name="help-circle" size={16} color="white" />
                  <Text style={styles.supportButtonText}>Contact Stripe Support</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.cleanupButton, { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error }]}
                  onPress={handleCleanupAccounts}
                  disabled={cleaningAccounts}
                >
                  {cleaningAccounts ? (
                    <ActivityIndicator size="small" color={theme.colors.error} />
                  ) : (
                    <Ionicons name="trash" size={16} color={theme.colors.error} />
                  )}
                  <Text style={[styles.cleanupButtonText, { color: theme.colors.error }]}>
                    {cleaningAccounts ? 'Cleaning...' : 'Clean Up Restricted Accounts'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Requirements display */}
            {accountStatus?.requirements?.currently_due?.length > 0 && (
              <View style={styles.requirementsSection}>
                <Text style={[styles.requirementsTitle, { color: theme.colors.text }]}>
                  Required Information:
                </Text>
                {accountStatus.requirements.currently_due.map((req: string, index: number) => (
                  <Text key={index} style={[styles.requirementItem, { color: theme.colors.textSecondary }]}>
                    • {req.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        {/* Bank Account Information */}
        {bankAccount ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Bank Account</Text>
            
            {/* Verification Status */}
            <View style={styles.statusContainer}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusIcon, { backgroundColor: `${getVerificationStatusColor(WISE_CURRENCIES.has(bankAccount.currency) ? 'verified' : bankAccount.verification_status)}20` }]}>
                  <Ionicons
                    name={getVerificationStatusIcon(WISE_CURRENCIES.has(bankAccount.currency) ? 'verified' : bankAccount.verification_status) as any}
                    size={20}
                    color={getVerificationStatusColor(WISE_CURRENCIES.has(bankAccount.currency) ? 'verified' : bankAccount.verification_status)}
                  />
                </View>
                <View>
                  <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Verification Status</Text>
                  <Text style={[styles.statusSubtitle, { color: theme.colors.textSecondary }]}>
                    {WISE_CURRENCIES.has(bankAccount.currency) ? 'Active' : bankAccount.verification_status.charAt(0).toUpperCase() + bankAccount.verification_status.slice(1)}
                  </Text>
                </View>
              </View>
              {bankAccount.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Account Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Account Holder</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{bankAccount.account_holder_name}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Bank Name</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{bankAccount.bank_name}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Account Type</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {bankAccount.account_type.charAt(0).toUpperCase() + bankAccount.account_type.slice(1)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Currency</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{bankAccount.currency}</Text>
              </View>
            </View>

            {/* Account Number (Masked) */}
            <View style={[styles.accountNumberContainer, { backgroundColor: theme.colors.card }]}>
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Account Number</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {showAccountDetails ? formData.account_number : `****${formData.account_number.slice(-4)}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAccountDetails(!showAccountDetails)}>
                <Ionicons 
                  name={showAccountDetails ? "eye-off" : "eye"} 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="business" size={48} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Bank Account Added</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Add your bank account details to start receiving payouts
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.addButtonText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Country-Aware Bank Form */}
        {isEditing && session && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Add Bank Account
            </Text>
            
            <CountryAwareBankForm
              session={session}
              onSubmit={handleCountryAwareBankSubmit}
              setAsDefault={true}
            />
            
            {/* Cancel Button */}
            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payout Account Setup — country-aware */}
        {!bankAccount && !isEditing && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {isWiseCountry ? (
              /* ── WISE SETUP (Nigeria, Ghana, Kenya, etc.) ── */
              <View style={styles.stripeContainer}>
                <View style={[styles.stripeIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Ionicons name="globe" size={32} color="#10B981" />
                </View>
                <Text style={[styles.stripeTitle, { color: theme.colors.text }]}>Set Up Bank Payout</Text>
                <Text style={[styles.stripeSubtitle, { color: theme.colors.textSecondary }]}>
                  Add your local bank account to receive payouts. We use Wise to send money directly to your bank in your local currency.
                </Text>

                <TouchableOpacity
                  style={[styles.stripeButton, { backgroundColor: '#10B981' }]}
                  onPress={() => navigation.navigate('AddWithdrawalMethod' as never)}
                  disabled={saving}
                >
                  <Ionicons name="business" size={20} color="#FFFFFF" />
                  <Text style={styles.stripeButtonText}>Add Bank Account</Text>
                </TouchableOpacity>

                <View style={styles.benefitsContainer}>
                  <View style={styles.benefitsHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    <Text style={[styles.benefitsTitle, { color: theme.colors.text }]}>How payouts work</Text>
                  </View>
                  <View style={styles.benefitsList}>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Earnings land in your SoundBridge wallet instantly</Text>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Withdraw to your bank account anytime (min. $25)</Text>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Wise converts USD to your local currency at the live rate</Text>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Transfers typically arrive within 1–3 business days</Text>
                  </View>
                </View>
              </View>
            ) : (
              /* ── STRIPE CONNECT SETUP (UK, US, EU, etc.) ── */
              <View style={styles.stripeContainer}>
                <View style={styles.stripeIcon}>
                  <Ionicons name="card" size={32} color="#635BFF" />
                </View>
                <Text style={[styles.stripeTitle, { color: theme.colors.text }]}>Set Up Payout Account</Text>
                <Text style={[styles.stripeSubtitle, { color: theme.colors.textSecondary }]}>
                  Connect your bank account to receive payouts from your earnings.
                  We use Stripe Connect for secure and reliable payments.
                </Text>

                <TouchableOpacity
                  style={styles.stripeButton}
                  onPress={handleSetupStripeConnect}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color="#FFFFFF" />
                      <Text style={styles.stripeButtonText}>Set Up with Stripe Connect</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.manualButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => setIsEditing(true)}
                  disabled={saving}
                >
                  <Ionicons name="business" size={20} color={theme.colors.text} />
                  <Text style={[styles.manualButtonText, { color: theme.colors.text }]}>Manual Bank Account Setup</Text>
                </TouchableOpacity>

                <View style={styles.benefitsContainer}>
                  <View style={styles.benefitsHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    <Text style={[styles.benefitsTitle, { color: theme.colors.text }]}>Why Stripe Connect?</Text>
                  </View>
                  <View style={styles.benefitsList}>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Secure and trusted payment processing</Text>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Faster payouts (1-2 business days)</Text>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Lower fees compared to manual transfers</Text>
                    <Text style={[styles.benefitItem, { color: theme.colors.textSecondary }]}>• Automatic tax reporting and compliance</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Complete Verification Section — Stripe countries only */}
        {bankAccount && bankAccount.verification_status === 'pending' && !WISE_CURRENCIES.has(bankAccount.currency) && (
          <View style={[styles.verificationSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <View style={styles.verificationHeader}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
              <Text style={[styles.verificationTitle, { color: theme.colors.text }]}>Complete Verification to Withdraw</Text>
            </View>
            <Text style={[styles.verificationDescription, { color: theme.colors.textSecondary }]}>
              You can start earning immediately! Complete verification now to withdraw funds anytime.
            </Text>
            <TouchableOpacity
              style={[styles.verificationButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleCompleteVerification()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.verificationButtonText}>Complete Verification Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Wise accounts — show ready status instead of Stripe verification prompt */}
        {bankAccount && WISE_CURRENCIES.has(bankAccount.currency) && (
          <View style={[styles.verificationSection, { backgroundColor: theme.colors.surface, borderColor: '#10B981' }]}>
            <View style={styles.verificationHeader}>
              <Ionicons name="globe" size={24} color="#10B981" />
              <Text style={[styles.verificationTitle, { color: theme.colors.text }]}>Ready for Withdrawals</Text>
            </View>
            <Text style={[styles.verificationDescription, { color: theme.colors.textSecondary }]}>
              Your bank account is set up and ready. When you earn from gigs, tips, or content, funds land in your SoundBridge wallet first. You can then withdraw to your local bank in {bankAccount.currency} via Wise — typically arriving within 1–3 business days. Minimum withdrawal is $25. No further verification needed.
            </Text>
          </View>
        )}

        {/* Bank Account Reset Section — Stripe countries only */}
        {bankAccount && bankAccount.verification_status === 'pending' && !WISE_CURRENCIES.has(bankAccount.currency) && (
          <View style={[styles.resetSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.resetHeader}>
              <Ionicons name="refresh-circle" size={24} color="#EF4444" />
              <Text style={[styles.resetTitle, { color: theme.colors.text }]}>Having Issues?</Text>
            </View>
            <Text style={[styles.resetDescription, { color: theme.colors.textSecondary }]}>
              If your Stripe Connect setup is stuck or you're experiencing verification issues,
              you can reset your bank account and start fresh.
            </Text>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: '#EF4444' }]}
              onPress={showResetConfirmation}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#EF4444" />
                  <Text style={styles.resetButtonText}>Reset Bank Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
            <Text style={[styles.securityTitle, { color: theme.colors.text }]}>Security Notice</Text>
          </View>
          <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
            Your bank account information is encrypted and stored securely. 
            We use industry-standard encryption to protect your sensitive data.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTitle: {
    ...Typography.body,
    fontSize: 16,
  },
  statusSubtitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#10B981',
    ...Typography.label,
    fontSize: 12,
    marginLeft: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 16,
  },
  detailLabel: {
    ...Typography.label,
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    ...Typography.body,
    fontSize: 16,
  },
  accountNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    ...Typography.button,
    fontSize: 16,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.label,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.button,
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    ...Typography.button,
    fontSize: 16,
  },
  stripeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  stripeIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#635BFF20',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stripeTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    marginBottom: 8,
  },
  stripeSubtitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  stripeButton: {
    backgroundColor: '#635BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  stripeButtonText: {
    color: '#FFFFFF',
    ...Typography.button,
    fontSize: 16,
    marginLeft: 8,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  manualButtonText: {
    ...Typography.button,
    fontSize: 16,
    marginLeft: 8,
  },
  benefitsContainer: {
    backgroundColor: '#3B82F620',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitsTitle: {
    ...Typography.label,
    fontSize: 14,
    marginLeft: 8,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitItem: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  securityNotice: {
    backgroundColor: '#3B82F620',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    ...Typography.label,
    fontSize: 14,
    marginLeft: 8,
  },
  securityText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 18,
  },
  verificationSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verificationTitle: {
    ...Typography.body,
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  verificationDescription: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  verificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  verificationButtonText: {
    ...Typography.button,
    fontSize: 16,
    color: '#FFFFFF',
  },
  resetSection: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resetTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetDescription: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  resetButtonText: {
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Account Status Styles
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  restrictedActions: {
    marginTop: 16,
    gap: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  cleanupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  requirementsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});
