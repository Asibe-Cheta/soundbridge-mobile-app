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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { user } = useAuth();
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

  const handleSetupStripeConnect = async () => {
    try {
      setSaving(true);
      
      Alert.alert(
        'Stripe Connect Setup',
        'This will redirect you to Stripe to securely connect your bank account. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => {
              // TODO: Implement Stripe Connect flow
              Alert.alert('Coming Soon', 'Stripe Connect integration will be available soon!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      Alert.alert('Error', 'Failed to set up Stripe Connect');
    } finally {
      setSaving(false);
    }
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
});
