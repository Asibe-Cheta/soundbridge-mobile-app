# Service Provider Payment - Implementation Guide

**Date:** December 30, 2025
**Status:** Ready to Implement
**Priority:** 🔴 CRITICAL

---

## Quick Summary

The service provider payment system has **3 critical gaps** that block payouts:

1. **PaymentMethodsScreen** - Bank account loading is mocked (line 86-91)
2. **ServiceProviderDashboard** - No earnings display
3. **No RequestPayoutScreen** - Can't request withdrawals

**Good News:** All services exist (revenueService, PayoutService, EarningsService). Just need to wire them up.

---

## Fix #1: Wire Up Bank Account Loading (5 minutes)

**File:** `src/screens/PaymentMethodsScreen.tsx`

**Current Code (Lines 86-91):**
```typescript
// Mock data - replace with actual API call
await new Promise(resolve => setTimeout(resolve, 1000));
setBankAccount(null); // ← MOCKED
```

**Fixed Code:**
```typescript
import { revenueService } from '../services/revenueService';

const loadBankAccount = async () => {
  if (!session) return;

  try {
    setLoading(true);
    console.log('🔄 Loading bank account data...');

    // ✅ ACTUAL API CALL
    const account = await revenueService.getBankAccount(session.user.id);
    setBankAccount(account);

    console.log('✅ Bank account loaded:', account ? 'Found' : 'None');

    await checkAccountStatus();
  } catch (error) {
    console.error('❌ Error loading bank account:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## Fix #2: Wire Up Bank Account Save (5 minutes)

**File:** `src/screens/PaymentMethodsScreen.tsx` (around line 188-215)

**Current Code:**
```typescript
// TODO: Implement actual save to database via API
await new Promise(resolve => setTimeout(resolve, 1500));
```

**Fixed Code:**
```typescript
const handleSaveBankAccount = async () => {
  if (!session) return;

  // Validate required fields
  if (!bankForm.accountHolderName || !bankForm.bankName ||
      !bankForm.accountNumber || !selectedCountry) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  setIsSavingBankAccount(true);

  try {
    console.log('💾 Saving bank account...');

    const formData = {
      account_holder_name: bankForm.accountHolderName,
      bank_name: bankForm.bankName,
      account_number: bankForm.accountNumber,
      routing_number: bankForm.routingNumber || '',
      account_type: bankForm.accountType,
      currency: selectedCountry,
    };

    const result = await revenueService.setBankAccount(session.user.id, formData);

    if (result.success) {
      Alert.alert('Success', 'Bank account saved successfully');

      // Reload to show saved account
      await loadBankAccount();
      setShowAddBankAccountModal(false);

      // Reset form
      setBankForm({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountType: 'checking',
      });
    } else {
      throw new Error(result.error?.message || 'Failed to save bank account');
    }
  } catch (error: any) {
    console.error('❌ Error saving bank account:', error);
    Alert.alert('Error', error.message || 'Failed to save bank account');
  } finally {
    setIsSavingBankAccount(false);
  }
};
```

---

## Fix #3: Add Earnings Display to Dashboard (15 minutes)

**File:** `src/screens/ServiceProviderDashboardScreen.tsx`

**Add at top with other imports:**
```typescript
import earningsService from '../services/EarningsService';
```

**Add to state variables:**
```typescript
const [earnings, setEarnings] = useState<{
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
} | null>(null);
const [loadingEarnings, setLoadingEarnings] = useState(false);
```

**Add to useEffect or create new one:**
```typescript
useEffect(() => {
  if (session) {
    loadEarnings();
  }
}, [session]);

const loadEarnings = async () => {
  if (!session) return;

  setLoadingEarnings(true);
  try {
    const summary = await earningsService.getEarningsSummary(session);
    setEarnings(summary);
  } catch (error) {
    console.error('Error loading earnings:', error);
  } finally {
    setLoadingEarnings(false);
  }
};
```

**Add component before existing sections:**
```typescript
{/* Earnings Card */}
{earnings && (
  <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleContainer}>
        <Ionicons name="cash-outline" size={24} color="#10B981" />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Earnings
        </Text>
      </View>
    </View>

    <View style={styles.earningsContent}>
      <View style={styles.earningsRow}>
        <View style={styles.earningStat}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Earned
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {earnings.currency} {earnings.totalEarnings.toFixed(2)}
          </Text>
        </View>

        <View style={styles.earningStat}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Available
          </Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {earnings.currency} {earnings.availableBalance.toFixed(2)}
          </Text>
        </View>
      </View>

      {earnings.pendingBalance > 0 && (
        <View style={styles.pendingEarnings}>
          <Text style={[styles.pendingLabel, { color: theme.colors.textSecondary }]}>
            Pending: {earnings.currency} {earnings.pendingBalance.toFixed(2)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.requestPayoutButton,
          earnings.availableBalance < 10 && styles.requestPayoutButtonDisabled
        ]}
        onPress={() => navigation.navigate('RequestPayout')}
        disabled={earnings.availableBalance < 10}
      >
        <Text style={styles.requestPayoutText}>
          Request Payout
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>

      {earnings.availableBalance < 10 && (
        <Text style={[styles.minimumNote, { color: theme.colors.textSecondary }]}>
          Minimum payout: {earnings.currency} 10.00
        </Text>
      )}
    </View>
  </View>
)}
```

**Add styles:**
```typescript
earningsContent: {
  padding: 16,
},
earningsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 16,
},
earningStat: {
  flex: 1,
},
statLabel: {
  fontSize: 14,
  marginBottom: 4,
},
statValue: {
  fontSize: 24,
  fontWeight: 'bold',
},
pendingEarnings: {
  padding: 12,
  backgroundColor: '#FEF3C7',
  borderRadius: 8,
  marginBottom: 16,
},
pendingLabel: {
  fontSize: 14,
},
requestPayoutButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#10B981',
  padding: 16,
  borderRadius: 8,
  gap: 8,
},
requestPayoutButtonDisabled: {
  backgroundColor: '#9CA3AF',
},
requestPayoutText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
minimumNote: {
  fontSize: 12,
  textAlign: 'center',
  marginTop: 8,
},
```

---

## Fix #4: Create Request Payout Screen (30 minutes)

**Create new file:** `src/screens/RequestPayoutScreen.tsx`

```typescript
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import payoutService from '../services/PayoutService';
import type { PayoutEligibilityResult } from '../services/PayoutService';

export default function RequestPayoutScreen({ navigation }: any) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [eligibility, setEligibility] = useState<PayoutEligibilityResult | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const result = await payoutService.checkPayoutEligibility(session);
      setEligibility(result);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      Alert.alert('Error', 'Failed to check payout eligibility');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!session || !eligibility) return;

    const payoutAmount = parseFloat(amount);

    // Validation
    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (payoutAmount < eligibility.minimumAmount) {
      Alert.alert(
        'Amount Too Low',
        `Minimum payout amount is ${eligibility.currency} ${eligibility.minimumAmount}`
      );
      return;
    }

    if (payoutAmount > eligibility.availableBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Available balance is ${eligibility.currency} ${eligibility.availableBalance}`
      );
      return;
    }

    setRequesting(true);
    try {
      const result = await payoutService.requestPayout(session, payoutAmount);

      if (result.success) {
        Alert.alert(
          'Payout Requested',
          `Your payout of ${result.currency} ${result.amount} has been requested. It will be processed within 2-3 business days.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!eligibility) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Unable to load payout information</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Balance Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Available Balance
          </Text>
          <Text style={[styles.balanceAmount, { color: '#10B981' }]}>
            {eligibility.currency} {eligibility.availableBalance.toFixed(2)}
          </Text>
          <Text style={[styles.minimumText, { color: theme.colors.textSecondary }]}>
            Minimum payout: {eligibility.currency} {eligibility.minimumAmount}
          </Text>
        </View>

        {eligibility.eligible ? (
          <>
            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Payout Amount
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                  {eligibility.currency}
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={`Min ${eligibility.minimumAmount}`}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                  editable={!requesting}
                />
              </View>
            </View>

            {/* Request Button */}
            <TouchableOpacity
              style={[
                styles.requestButton,
                requesting && styles.requestButtonDisabled
              ]}
              onPress={handleRequestPayout}
              disabled={requesting}
            >
              {requesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.requestButtonText}>Request Payout</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Payouts are processed within 2-3 business days. Funds will be transferred to your connected bank account.
              </Text>
            </View>
          </>
        ) : (
          /* Not Eligible */
          <View style={[styles.notEligibleCard, { backgroundColor: '#FEE2E2' }]}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  minimumText: {
    fontSize: 12,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  requestButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  notEligibleCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  notEligibleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
```

**Add to navigation stack in `src/navigation/AppNavigator.tsx` or similar:**
```typescript
<Stack.Screen
  name="RequestPayout"
  component={RequestPayoutScreen}
  options={{ title: 'Request Payout' }}
/>
```

---

## Testing Checklist

After implementing:

- [ ] Bank account save works (data persists in database)
- [ ] Bank account load works (shows saved account)
- [ ] Earnings display shows in dashboard
- [ ] Request Payout button appears when balance > minimum
- [ ] Request Payout screen shows eligibility
- [ ] Can successfully request payout
- [ ] Wise currencies skip Stripe check
- [ ] Stripe currencies show Connect status

---

## Summary

**Time to Implement:** ~1 hour

**Critical Changes:**
1. Fix bank account loading (5 min)
2. Fix bank account saving (5 min)
3. Add earnings display (15 min)
4. Create RequestPayoutScreen (30 min)
5. Add navigation + test (5 min)

**Result:** Service providers can save bank accounts, see earnings, and request payouts! 🎉

---

**Last Updated:** December 30, 2025
**Status:** Ready to implement
