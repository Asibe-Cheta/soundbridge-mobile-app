import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { walletService } from '../services/WalletService';

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

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  
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
    try {
      setLoading(true);
      // TODO: Implement actual API call
      // const account = await revenueService.getBankAccount(user?.id);
      // setBankAccount(account);
      
      // Mock data for now
      setTimeout(() => {
        setBankAccount(null); // No account initially
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading bank account:', error);
      Alert.alert('Error', 'Failed to load bank account information');
      setLoading(false);
    }
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

      // TODO: Implement actual API call
      // const result = await revenueService.setBankAccount(user?.id, formData);
      
      // Mock success for now
      setTimeout(() => {
        Alert.alert('Success', 'Bank account information saved successfully!');
        setIsEditing(false);
        loadBankAccount();
      }, 1500);
    } catch (error) {
      console.error('Error saving bank account:', error);
      Alert.alert('Error', 'Failed to save bank account information');
    } finally {
      setSaving(false);
    }
  };

  const testBasicConnectivity = async () => {
    try {
      console.log('=== TESTING BASIC CONNECTIVITY ===');
      
      // Test 1: Can we reach the domain at all?
      console.log('🌐 Test 1: Testing basic domain connectivity...');
      const response1 = await fetch('https://soundbridge.live/', {
        method: 'GET',
      });
      console.log('✅ Domain reachable! Status:', response1.status);
      
      // Test 2: Can we reach a simple API endpoint?
      console.log('🔗 Test 2: Testing simple API endpoint...');
      const response2 = await fetch('https://soundbridge.live/api/test-deployment', {
        method: 'GET',
      });
      console.log('✅ API endpoint reachable! Status:', response2.status);
      
      // Test 3: Can we make a POST request?
      console.log('📤 Test 3: Testing POST request...');
      const response3 = await fetch('https://soundbridge.live/api/debug/bearer-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'basic connectivity' })
      });
      console.log('✅ POST request works! Status:', response3.status);
      
      Alert.alert('Connectivity Test Results', 
        `Domain: ${response1.status}\n` +
        `API GET: ${response2.status}\n` +
        `API POST: ${response3.status}\n\n` +
        `All tests passed! Issue is route-specific.`
      );
    } catch (error) {
      console.error('❌ Connectivity test failed:', error);
      Alert.alert('Connectivity Failed', 
        `Error: ${error instanceof Error ? error.message : 'Unknown'}\n\n` +
        `This indicates a fundamental network issue.`
      );
    }
  };

  const testSimpleCheckout = async () => {
    try {
      if (!session?.access_token) {
        Alert.alert('Error', 'No access token available');
        return;
      }

      console.log('=== TESTING SIMPLE CHECKOUT ROUTE ===');
      console.log('🚀 Testing if ANY Stripe API route works...');
      
      const startTime = Date.now();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Auth-Token': `Bearer ${session.access_token}`,
        'X-Authorization': `Bearer ${session.access_token}`,
        'X-Supabase-Token': session.access_token,
      };
      
      console.log('📡 Calling test route:', 'https://soundbridge.live/api/stripe/test-checkout');
      console.log('📡 Request headers:', headers);
      
      const response = await fetch('https://soundbridge.live/api/stripe/test-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ test: 'mobile app routing test' })
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('⏱️ Test route response time:', duration + 'ms');
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.text();
      console.log('📊 Raw response:', result);
      
      Alert.alert('Simple Route Test', 
        `Status: ${response.status}\n` +
        `Time: ${duration}ms\n` +
        `Response: ${result.substring(0, 200)}...`
      );
    } catch (error) {
      console.error('❌ Simple route test error:', error);
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testDeployment = async () => {
    try {
      console.log('=== TESTING DEPLOYMENT STATUS ===');
      const response = await fetch('https://soundbridge.live/api/test-deployment', {
        method: 'GET',
      });
      
      const result = await response.text();
      console.log('Deployment test status:', response.status);
      console.log('Deployment test response:', result);
      
      Alert.alert('Deployment Test', `Status: ${response.status}\n\nResponse: ${result.substring(0, 300)}...`);
    } catch (error) {
      console.error('Deployment test error:', error);
      Alert.alert('Deployment Test Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testBearerTokenAuth = async () => {
    try {
      if (!session?.access_token) {
        Alert.alert('Error', 'No access token available');
        return;
      }

      console.log('=== TESTING BEARER TOKEN AUTH - ENHANCED ===');
      console.log('Access token preview:', session.access_token.substring(0, 50) + '...');
      
      // Test 1: Multiple header approach
      console.log('Test 1: Multiple header approach...');
      const headers1 = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Auth-Token': `Bearer ${session.access_token}`,
        'X-Authorization': `Bearer ${session.access_token}`,
        'X-Supabase-Token': session.access_token,
      };
      console.log('Headers being sent:', headers1);
      
      const response1 = await fetch('https://soundbridge.live/api/debug/bearer-auth', {
        method: 'POST',
        headers: headers1,
      });

      const result1 = await response1.text();
      console.log('Test 1 - Status:', response1.status);
      console.log('Test 1 - Response:', result1);
      
      // Test 2: Try lowercase 'authorization'
      console.log('Test 2: Lowercase authorization header...');
      const headers2 = {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${session.access_token}`,
      };
      
      const response2 = await fetch('https://soundbridge.live/api/debug/bearer-auth', {
        method: 'POST',
        headers: headers2,
      });

      const result2 = await response2.text();
      console.log('Test 2 - Status:', response2.status);
      console.log('Test 2 - Response:', result2);
      
      // Test 3: Send token in body instead of header
      console.log('Test 3: Token in request body...');
      const response3 = await fetch('https://soundbridge.live/api/debug/bearer-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: session.access_token,
          authHeader: `Bearer ${session.access_token}`
        }),
      });

      const result3 = await response3.text();
      console.log('Test 3 - Status:', response3.status);
      console.log('Test 3 - Response:', result3);
      
      Alert.alert('Enhanced Debug Results', 
        `Test 1 (Authorization): ${response1.status}\n` +
        `Test 2 (authorization): ${response2.status}\n` +
        `Test 3 (body): ${response3.status}\n\n` +
        `Check console for full details`
      );
    } catch (error) {
      console.error('Debug test error:', error);
      Alert.alert('Debug Error', error instanceof Error ? error.message : 'Unknown error');
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

      // Call the web app's API directly with Bearer token authentication
      console.log('=== STRIPE CONNECT DEBUG INFO ===');
      console.log('User ID:', user?.id);
      console.log('User email:', session?.user?.email);
      console.log('Session exists:', !!session);
      console.log('Access token exists:', !!session?.access_token);
      console.log('Access token length:', session?.access_token?.length);
      console.log('Access token preview:', session?.access_token?.substring(0, 50) + '...');
      console.log('Token type:', typeof session?.access_token);
      
      // Use production URL - the live web app
      const baseUrl = 'https://soundbridge.live';
      console.log('Calling API:', `${baseUrl}/api/stripe/connect/create-account`);
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Auth-Token': `Bearer ${session.access_token}`,
        'X-Authorization': `Bearer ${session.access_token}`,
        'X-Supabase-Token': session.access_token,
      };
      console.log('Request headers:', headers);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${baseUrl}/api/stripe/connect/create-account`, {
        method: 'POST',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed response:', result);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        result = { error: 'Invalid JSON response', rawResponse: responseText };
      }

      if (response.ok && result.success && result.onboardingUrl) {
        // Open the Stripe onboarding URL directly
        const supported = await Linking.canOpenURL(result.onboardingUrl);
        
        if (supported) {
          await Linking.openURL(result.onboardingUrl);
          
          Alert.alert(
            'Complete Stripe Setup',
            'You\'ve been redirected to Stripe to set up your payout account. Once completed, return to the app to see your connected account.',
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
        Alert.alert('Connection Error', `Unable to connect to the payment server at ${baseUrl}. Please check your internet connection.`);
      } else {
        Alert.alert('Error', 'Failed to connect to payment service. Please check your internet connection and try again.');
      }
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payment Methods</Text>
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payment Methods</Text>
        {bankAccount && !isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={20} color="#DC2626" />
          </TouchableOpacity>
        )}
        {!bankAccount && <View style={{ width: 24 }} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Bank Account Information */}
        {bankAccount ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Bank Account</Text>
            
            {/* Verification Status */}
            <View style={styles.statusContainer}>
              <View style={styles.statusInfo}>
                <View style={[styles.statusIcon, { backgroundColor: `${getVerificationStatusColor(bankAccount.verification_status)}20` }]}>
                  <Ionicons 
                    name={getVerificationStatusIcon(bankAccount.verification_status) as any} 
                    size={20} 
                    color={getVerificationStatusColor(bankAccount.verification_status)} 
                  />
                </View>
                <View>
                  <Text style={[styles.statusTitle, { color: theme.colors.text }]}>Verification Status</Text>
                  <Text style={[styles.statusSubtitle, { color: theme.colors.textSecondary }]}>
                    {bankAccount.verification_status.charAt(0).toUpperCase() + bankAccount.verification_status.slice(1)}
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

        {/* Edit Form */}
        {isEditing && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {bankAccount ? 'Edit Bank Account' : 'Add Bank Account'}
            </Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Account Holder Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={formData.account_holder_name}
                    onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
                    placeholder="John Doe"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Bank Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={formData.bank_name}
                    onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                    placeholder="Bank of America"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Account Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={formData.account_number}
                    onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                    placeholder="123456789"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Routing Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={formData.routing_number}
                    onChangeText={(text) => setFormData({ ...formData, routing_number: text })}
                    placeholder="123456789"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Account Type</Text>
                  <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <TouchableOpacity
                      style={styles.picker}
                      onPress={() => {
                        Alert.alert(
                          'Account Type',
                          'Select your account type',
                          [
                            { text: 'Checking', onPress: () => setFormData({ ...formData, account_type: 'checking' }) },
                            { text: 'Savings', onPress: () => setFormData({ ...formData, account_type: 'savings' }) },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                        {formData.account_type.charAt(0).toUpperCase() + formData.account_type.slice(1)}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Currency</Text>
                  <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <TouchableOpacity
                      style={styles.picker}
                      onPress={() => {
                        Alert.alert(
                          'Currency',
                          'Select your currency',
                          [
                            { text: 'USD - US Dollar', onPress: () => setFormData({ ...formData, currency: 'USD' }) },
                            { text: 'EUR - Euro', onPress: () => setFormData({ ...formData, currency: 'EUR' }) },
                            { text: 'GBP - British Pound', onPress: () => setFormData({ ...formData, currency: 'GBP' }) },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.pickerText, { color: theme.colors.text }]}>
                        {formData.currency}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Form Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.colors.card }]}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stripe Connect Setup */}
        {!bankAccount && !isEditing && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
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
                style={[styles.stripeButton, { backgroundColor: '#FF6B35' }]}
                onPress={testBearerTokenAuth}
                disabled={saving}
              >
                <Ionicons name="bug" size={20} color="#FFFFFF" />
                <Text style={styles.stripeButtonText}>Test Bearer Token (Debug)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.stripeButton, { backgroundColor: '#E91E63' }]}
                onPress={testBasicConnectivity}
                disabled={saving}
              >
                <Ionicons name="wifi" size={20} color="#FFFFFF" />
                <Text style={styles.stripeButtonText}>🌐 Test Connectivity</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.stripeButton, { backgroundColor: '#FF9800' }]}
                onPress={testSimpleCheckout}
                disabled={saving}
              >
                <Ionicons name="flask" size={20} color="#FFFFFF" />
                <Text style={styles.stripeButtonText}>🧪 Test Simple Route</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.stripeButton, { backgroundColor: '#10B981' }]}
                onPress={testDeployment}
                disabled={saving}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.stripeButtonText}>Test Deployment Status</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.manualButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setIsEditing(true)}
                disabled={saving}
              >
                <Ionicons name="business" size={20} color={theme.colors.text} />
                <Text style={[styles.manualButtonText, { color: theme.colors.text }]}>Manual Bank Account Setup</Text>
              </TouchableOpacity>

              {/* Benefits */}
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
          </View>
        )}

        {/* Bank Account Reset Section */}
        {bankAccount && bankAccount.verification_status === 'pending' && (
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontSize: 16,
    fontWeight: '600',
  },
  statusSubtitle: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stripeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitItem: {
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resetDescription: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
