import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { payoutService } from '../services/PayoutService';
import type { PayoutEligibility } from '../services/PayoutService';
import { revenueService } from '../services/revenueService';
import { SystemTypography as Typography } from '../constants/Typography';

// Currencies routed through Fincra (African payout rail)
const FINCRA_CURRENCIES = new Set(['NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX']);

// Fincra currency-to-country display helper
const FINCRA_COUNTRY_NAMES: Record<string, string> = {
  NGN: 'Nigeria', GHS: 'Ghana', KES: 'Kenya',
  ZAR: 'South Africa', TZS: 'Tanzania', UGX: 'Uganda',
};

export default function RequestPayoutScreen() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [eligibility, setEligibility] = useState<PayoutEligibility | null>(null);
  const [amount, setAmount] = useState('');
  const [bankCurrency, setBankCurrency] = useState<string | null>(null);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [result, bankAccount] = await Promise.all([
        payoutService.checkEligibility(session),
        revenueService.getBankAccount(session.user.id).catch(() => null),
      ]);
      setEligibility(result);
      if (bankAccount?.currency) setBankCurrency(bankAccount.currency.toUpperCase());
    } catch (error) {
      console.error('Error checking eligibility:', error);
      Alert.alert('Error', 'Failed to check payout eligibility');
    } finally {
      setLoading(false);
    }
  };

  const isFincraPayment = bankCurrency ? FINCRA_CURRENCIES.has(bankCurrency) : false;

  const handleRequestPayout = () => {
    if (!session || !eligibility) return;

    const payoutAmount = parseFloat(amount);

    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (payoutAmount < eligibility.minimum_amount) {
      Alert.alert(
        'Amount Too Low',
        `Minimum payout amount is ${eligibility.currency} ${eligibility.minimum_amount}`
      );
      return;
    }

    if (payoutAmount > eligibility.available_balance) {
      Alert.alert(
        'Insufficient Balance',
        `Available balance is ${eligibility.currency} ${eligibility.available_balance.toFixed(2)}`
      );
      return;
    }

    // Build confirmation message
    let confirmMessage = `Request payout of ${eligibility.currency} ${payoutAmount.toFixed(2)}?`;
    if (isFincraPayment && bankCurrency) {
      const country = FINCRA_COUNTRY_NAMES[bankCurrency] ?? bankCurrency;
      confirmMessage =
        `You're requesting ${eligibility.currency} ${payoutAmount.toFixed(2)}.\n\n` +
        `Payment to ${country} will be processed via Fincra to your local bank account.\n\n` +
        `Processing takes 1–2 business days.`;
    } else {
      confirmMessage += '\n\nProcessing takes 2-3 business days.';
    }

    Alert.alert(
      'Confirm Payout',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'default', onPress: () => submitPayout(payoutAmount) },
      ]
    );
  };

  const submitPayout = async (payoutAmount: number) => {
    if (!session || !eligibility) return;
    setRequesting(true);
    try {
      const result = await payoutService.requestPayout(session, {
        amount: payoutAmount,
        currency: eligibility.currency,
      });

      if (result.success && result.payout) {
        Alert.alert(
          'Payout Requested',
          `Your payout request has been submitted. Funds will be transferred to your bank account within 2-3 business days.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(result.error || 'Failed to request payout');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request payout');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Main Background Gradient */}
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
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Request Payout</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading payout information...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!eligibility) {
    return (
      <View style={styles.container}>
        {/* Main Background Gradient */}
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
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Request Payout</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.loadingContainer}>
            <Text style={[styles.errorText, { color: theme.colors.text }]}>Unable to load payout information</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Background Gradient */}
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
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Request Payout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Balance Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.borderCard }]}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Available Balance
            </Text>
            <Text style={[styles.balanceAmount, { color: '#10B981' }]}>
              {eligibility.currency} {eligibility.available_balance.toFixed(2)}
            </Text>
            <Text style={[styles.minimumText, { color: theme.colors.textSecondary }]}>
              Minimum payout: {eligibility.currency} {eligibility.minimum_amount}
            </Text>
          </View>

          {eligibility.eligible ? (
            <>
              {/* Amount Input */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Payout Amount
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                    {eligibility.currency}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder={`Min ${eligibility.minimum_amount}`}
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                    editable={!requesting}
                  />
                </View>
              </View>

              {/* Fincra payout info — shown for African currencies */}
              {isFincraPayment && bankCurrency && (
                <View style={[styles.feeWarningBox, { backgroundColor: '#ECFDF5', borderColor: '#10B98140' }]}>
                  <Ionicons name="information-circle" size={20} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feeWarningTitle, { color: '#065F46' }]}>
                      African Bank Transfer via Fincra
                    </Text>
                    <Text style={[styles.feeWarningText, { color: '#064E3B' }]}>
                      Payments to {FINCRA_COUNTRY_NAMES[bankCurrency] ?? bankCurrency} are processed via Fincra directly to your local bank account. Transfers typically arrive within 1–2 business days.
                    </Text>
                  </View>
                </View>
              )}

              {/* Request Button */}
              <TouchableOpacity
                style={styles.requestButton}
                onPress={handleRequestPayout}
                disabled={requesting}
              >
                <LinearGradient
                  colors={requesting ? ['#6b7280', '#6b7280'] : ['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.requestButtonGradient}
                >
                  {requesting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.requestButtonText}>Request Payout</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Info Box */}
              <View style={[styles.infoBox, { backgroundColor: theme.colors.accentBlue + '15', borderColor: theme.colors.accentBlue + '40' }]}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.accentBlue} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Payouts are processed within 2-3 business days. Funds will be transferred to your connected bank account.
                </Text>
              </View>
            </>
          ) : (
            /* Not Eligible */
            <View style={[styles.notEligibleCard, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="alert-circle" size={48} color="#DC2626" />
              <Text style={[styles.notEligibleTitle, { color: '#DC2626' }]}>
                Not Eligible for Payout
              </Text>
              {eligibility.reasons.map((reason, index) => (
                <View key={index} style={styles.reasonItem}>
                  <Ionicons name="close-circle" size={16} color="#DC2626" />
                  <Text style={[styles.reasonText, { color: '#991B1B' }]}>
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontFamily: Typography.body.fontFamily,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    ...Typography.body,
    marginTop: 16,
  },
  errorText: {
    ...Typography.body,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    ...Typography.label,
    marginBottom: 8,
  },
  balanceAmount: {
    ...Typography.headerLarge,
    fontSize: 36,
    marginBottom: 8,
  },
  minimumText: {
    ...Typography.label,
    fontSize: 12,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    ...Typography.button,
    fontSize: 16,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  currencySymbol: {
    ...Typography.button,
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    ...Typography.button,
    flex: 1,
    fontSize: 18,
  },
  requestButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  requestButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  requestButtonText: {
    ...Typography.button,
    fontSize: 16,
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    ...Typography.label,
    flex: 1,
  },
  feeWarningBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  feeWarningTitle: {
    ...Typography.button,
    fontSize: 13,
    marginBottom: 4,
  },
  feeWarningText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  feeEstimate: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  feeWarningTip: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  notEligibleCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  notEligibleTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
  },
});
