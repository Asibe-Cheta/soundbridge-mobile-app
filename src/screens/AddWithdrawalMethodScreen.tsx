import React, { useState } from 'react';
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
import { walletService } from '../services/WalletService';
import CountryAwareBankForm from '../components/CountryAwareBankForm';

type MethodType = 'bank_transfer' | 'paypal' | 'crypto' | 'prepaid_card';

interface MethodOption {
  type: MethodType;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

const METHOD_OPTIONS: MethodOption[] = [
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
    available: true,
  },
  {
    type: 'crypto',
    name: 'Cryptocurrency',
    icon: 'logo-bitcoin',
    description: 'Bitcoin, Ethereum, and other cryptocurrencies',
    available: true,
  },
  {
    type: 'prepaid_card',
    name: 'Prepaid Card',
    icon: 'card-outline',
    description: 'Visa/Mastercard prepaid cards',
    available: false, // Coming soon
  },
];

export default function AddWithdrawalMethodScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  
  const [selectedMethod, setSelectedMethod] = useState<MethodType | null>(null);
  const [submitting, setSubmitting] = useState(false);


  // PayPal Form State
  const [paypalForm, setPaypalForm] = useState({
    method_name: '',
    paypal_email: '',
  });

  // Crypto Form State
  const [cryptoForm, setCryptoForm] = useState({
    method_name: '',
    address: '',
    currency: 'BTC',
    network: 'Bitcoin',
  });

  // Prepaid Card Form State
  const [cardForm, setCardForm] = useState({
    method_name: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: '',
  });

  const [makeDefault, setMakeDefault] = useState(false);

  // Handler for CountryAwareBankForm
  const handleAddMethod = async (methodData: any) => {
    try {
      setSubmitting(true);
      
      const result = await walletService.addWithdrawalMethod(session!, methodData);
      
      if (result.success) {
        Alert.alert('Success', 'Withdrawal method added successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to add withdrawal method');
      }
    } catch (error) {
      console.error('Error adding withdrawal method:', error);
      Alert.alert('Error', 'Failed to add withdrawal method');
    } finally {
      setSubmitting(false);
    }
  };


  const validatePayPalForm = (): boolean => {
    if (!paypalForm.method_name.trim()) {
      Alert.alert('Error', 'Please enter a name for this method');
      return false;
    }
    if (!paypalForm.paypal_email.trim() || !paypalForm.paypal_email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid PayPal email address');
      return false;
    }
    return true;
  };

  const validateCryptoForm = (): boolean => {
    if (!cryptoForm.method_name.trim()) {
      Alert.alert('Error', 'Please enter a name for this method');
      return false;
    }
    if (!cryptoForm.address.trim()) {
      Alert.alert('Error', 'Please enter a crypto wallet address');
      return false;
    }
    if (cryptoForm.address.length < 20) {
      Alert.alert('Error', 'Please enter a valid crypto wallet address');
      return false;
    }
    return true;
  };

  const validateCardForm = (): boolean => {
    if (!cardForm.method_name.trim()) {
      Alert.alert('Error', 'Please enter a name for this method');
      return false;
    }
    if (!cardForm.cardholder_name.trim()) {
      Alert.alert('Error', 'Please enter the cardholder name');
      return false;
    }
    if (!cardForm.card_number.trim() || cardForm.card_number.replace(/\s/g, '').length < 13) {
      Alert.alert('Error', 'Please enter a valid card number');
      return false;
    }
    if (!cardForm.expiry_month.trim() || !cardForm.expiry_year.trim()) {
      Alert.alert('Error', 'Please enter the card expiry date');
      return false;
    }
    if (!cardForm.cvv.trim() || cardForm.cvv.length < 3) {
      Alert.alert('Error', 'Please enter a valid CVV');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!session || !selectedMethod) {
        Alert.alert('Error', 'Please select a withdrawal method');
        return;
      }

      let isValid = false;
      let methodData: any = { method_type: selectedMethod };

      switch (selectedMethod) {
        case 'bank_transfer':
          // Bank transfer is handled by CountryAwareBankForm
          return;

        case 'paypal':
          isValid = validatePayPalForm();
          if (isValid) {
            methodData = {
              method_type: 'paypal',
              method_name: paypalForm.method_name,
              paypal_email: paypalForm.paypal_email,
            };
          }
          break;

        case 'crypto':
          isValid = validateCryptoForm();
          if (isValid) {
            methodData = {
              method_type: 'crypto',
              method_name: cryptoForm.method_name,
              crypto_address: {
                address: cryptoForm.address,
                currency: cryptoForm.currency,
                network: cryptoForm.network,
              }
            };
          }
          break;

        case 'prepaid_card':
          isValid = validateCardForm();
          if (isValid) {
            methodData = {
              method_type: 'prepaid_card',
              method_name: cardForm.method_name,
              card_details: {
                card_number: cardForm.card_number.replace(/\s/g, ''),
                expiry_month: cardForm.expiry_month,
                expiry_year: cardForm.expiry_year,
                cvv: cardForm.cvv,
                cardholder_name: cardForm.cardholder_name,
              }
            };
          }
          break;
      }

      if (!isValid) return;

      setSubmitting(true);
      console.log('💳 Adding withdrawal method:', selectedMethod);

      const result = await walletService.addWithdrawalMethod(session, methodData);

      if (result.success) {
        // If user wants to make this the default method
        if (makeDefault && result.data) {
          try {
            await walletService.updateWithdrawalMethod(session, result.data.id, {
              is_default: true
            });
          } catch (error) {
            console.warn('Failed to set as default, but method was added successfully');
          }
        }

        Alert.alert(
          'Success',
          result.message || 'Withdrawal method added successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to add withdrawal method');
      }
    } catch (error) {
      console.error('Error adding withdrawal method:', error);
      Alert.alert('Error', 'Failed to add withdrawal method. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.methodSelection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Withdrawal Method</Text>
      {METHOD_OPTIONS.map((method) => (
        <TouchableOpacity
          key={method.type}
          style={[
            styles.methodOption,
            {
              backgroundColor: selectedMethod === method.type ? theme.colors.primary + '20' : theme.colors.card,
              borderColor: selectedMethod === method.type ? theme.colors.primary : theme.colors.border,
              opacity: method.available ? 1 : 0.5,
            }
          ]}
          onPress={() => method.available && setSelectedMethod(method.type)}
          disabled={!method.available}
        >
          <View style={[styles.methodIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name={method.icon as any} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodName, { color: theme.colors.text }]}>{method.name}</Text>
            <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
              {method.description}
            </Text>
          </View>
          {method.available ? (
            <View style={[styles.radioButton, { borderColor: theme.colors.border }]}>
              {selectedMethod === method.type && (
                <View style={[styles.radioButtonInner, { backgroundColor: theme.colors.primary }]} />
              )}
            </View>
          ) : (
            <View style={[styles.comingSoonBadge, { backgroundColor: theme.colors.warning + '20' }]}>
              <Text style={[styles.comingSoonText, { color: theme.colors.warning }]}>Soon</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );


  const renderPayPalForm = () => (
    <View style={styles.formSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>PayPal Account Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Method Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="e.g., My PayPal Account"
          placeholderTextColor={theme.colors.textSecondary}
          value={paypalForm.method_name}
          onChangeText={(text) => setPaypalForm({...paypalForm, method_name: text})}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>PayPal Email *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="your-email@example.com"
          placeholderTextColor={theme.colors.textSecondary}
          value={paypalForm.paypal_email}
          onChangeText={(text) => setPaypalForm({...paypalForm, paypal_email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={[styles.infoBox, { backgroundColor: '#0070BA20', borderColor: '#0070BA' }]}>
        <Ionicons name="information-circle" size={20} color="#0070BA" />
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          Make sure this email is associated with your verified PayPal account. 
          Transfers are usually instant but may take up to 30 minutes.
        </Text>
      </View>
    </View>
  );

  const renderCryptoForm = () => (
    <View style={styles.formSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Crypto Wallet Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Method Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="e.g., My Bitcoin Wallet"
          placeholderTextColor={theme.colors.textSecondary}
          value={cryptoForm.method_name}
          onChangeText={(text) => setCryptoForm({...cryptoForm, method_name: text})}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Cryptocurrency</Text>
        <View style={styles.cryptoTypeContainer}>
          {['BTC', 'ETH', 'USDT', 'USDC'].map((crypto) => (
            <TouchableOpacity
              key={crypto}
              style={[
                styles.cryptoTypeButton,
                {
                  backgroundColor: cryptoForm.currency === crypto ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => setCryptoForm({...cryptoForm, currency: crypto})}
            >
              <Text style={[
                styles.cryptoTypeText,
                { color: cryptoForm.currency === crypto ? '#FFFFFF' : theme.colors.text }
              ]}>
                {crypto}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Network</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="e.g., Bitcoin, Ethereum, Polygon"
          placeholderTextColor={theme.colors.textSecondary}
          value={cryptoForm.network}
          onChangeText={(text) => setCryptoForm({...cryptoForm, network: text})}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Wallet Address *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="Enter your crypto wallet address"
          placeholderTextColor={theme.colors.textSecondary}
          value={cryptoForm.address}
          onChangeText={(text) => setCryptoForm({...cryptoForm, address: text})}
          autoCapitalize="none"
          multiline
        />
      </View>

      <View style={[styles.infoBox, { backgroundColor: '#F7931A20', borderColor: '#F7931A' }]}>
        <Ionicons name="warning" size={20} color="#F7931A" />
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          Double-check your wallet address. Crypto transactions are irreversible. 
          Test with a small amount first.
        </Text>
      </View>
    </View>
  );

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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Withdrawal Method</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderMethodSelection()}

        {selectedMethod === 'bank_transfer' && (
          <CountryAwareBankForm
            session={session!}
            onSubmit={handleAddMethod}
            setMakeDefault={setMakeDefault}
          />
        )}
        {selectedMethod === 'paypal' && renderPayPalForm()}
        {selectedMethod === 'crypto' && renderCryptoForm()}

        {selectedMethod && selectedMethod !== 'bank_transfer' && (
          <>
            {/* Make Default Option */}
            <View style={[styles.defaultSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.defaultOption}>
                <View style={styles.defaultInfo}>
                  <Text style={[styles.defaultTitle, { color: theme.colors.text }]}>Set as Default</Text>
                  <Text style={[styles.defaultDescription, { color: theme.colors.textSecondary }]}>
                    Use this method for all future withdrawals by default
                  </Text>
                </View>
                <Switch
                  value={makeDefault}
                  onValueChange={setMakeDefault}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                  thumbColor={makeDefault ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Add Withdrawal Method</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
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
  },
  methodSelection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  accountTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cryptoTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cryptoTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cryptoTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  defaultSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  defaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultInfo: {
    flex: 1,
  },
  defaultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  defaultDescription: {
    fontSize: 14,
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
