/**
 * Pricing Controls Component
 * Reusable component for setting content pricing
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PricingControlsProps {
  isPaid: boolean;
  price: string;
  currency: 'USD' | 'GBP' | 'EUR';
  onIsPaidChange: (value: boolean) => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: 'USD' | 'GBP' | 'EUR') => void;
  userSubscription?: string | null;
  disabled?: boolean;
}

export default function PricingControls({
  isPaid,
  price,
  currency,
  onIsPaidChange,
  onPriceChange,
  onCurrencyChange,
  userSubscription,
  disabled = false,
}: PricingControlsProps) {
  const { theme } = useTheme();

  const handleTogglePaid = () => {
    onIsPaidChange(!isPaid);
  };

  const handlePriceChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    // Validate price range (0.99 to 50.00)
    const numericValue = parseFloat(cleaned);
    if (cleaned && (numericValue < 0.99 || numericValue > 50.00)) {
      return;
    }

    onPriceChange(cleaned);
  };

  const calculateEarnings = () => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return '0.00';
    const earnings = priceNum * 0.85; // 85% goes to creator
    return earnings.toFixed(2);
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'GBP':
        return '£';
      case 'EUR':
        return '€';
      default:
        return '$';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Sell This Content
        </Text>
      </View>

      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Make your content available for purchase. You keep 85% of all sales.
      </Text>

      {/* Enable Paid Content Toggle */}
      <TouchableOpacity
        style={[
          styles.toggleContainer,
          { borderColor: theme.colors.border },
        ]}
        onPress={handleTogglePaid}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.toggleContent}>
          <View>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
              Make Available for Purchase
            </Text>
          </View>
          <View
            style={[
              styles.switch,
              isPaid && { backgroundColor: theme.colors.primary },
              !isPaid && { backgroundColor: theme.colors.surface },
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                isPaid && styles.switchThumbActive,
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Pricing Fields (shown when isPaid is true) */}
      {isPaid && (
        <>
          {/* Currency Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              Currency
            </Text>
            <View style={styles.currencyButtons}>
              {(['USD', 'GBP', 'EUR'] as const).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyButton,
                    {
                      backgroundColor: currency === curr ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => onCurrencyChange(curr)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      { color: currency === curr ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              Price
            </Text>
            <View style={[styles.priceInputContainer, { borderColor: theme.colors.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                {getCurrencySymbol()}
              </Text>
              <TextInput
                style={[styles.priceInput, { color: theme.colors.text }]}
                value={price}
                onChangeText={handlePriceChange}
                placeholder="0.99"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                editable={!disabled}
              />
            </View>
            <Text style={[styles.priceHint, { color: theme.colors.textSecondary }]}>
              Price range: {getCurrencySymbol()}0.99 - {getCurrencySymbol()}50.00
            </Text>
          </View>

          {/* Earnings Preview */}
          {price && parseFloat(price) >= 0.99 && (
            <View style={[styles.earningsPreview, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.earningsRow}>
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>
                  Sale Price:
                </Text>
                <Text style={[styles.earningsValue, { color: theme.colors.text }]}>
                  {getCurrencySymbol()}{parseFloat(price).toFixed(2)}
                </Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>
                  Platform Fee (15%):
                </Text>
                <Text style={[styles.earningsValue, { color: theme.colors.textSecondary }]}>
                  -{getCurrencySymbol()}{(parseFloat(price) * 0.15).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.earningsRow, styles.earningsTotal]}>
                <Text style={[styles.earningsLabel, { color: theme.colors.text }]}>
                  Your Earnings (85%):
                </Text>
                <Text style={[styles.earningsTotalValue, { color: theme.colors.primary }]}>
                  {getCurrencySymbol()}{calculateEarnings()}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  toggleContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  switch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  priceHint: {
    fontSize: 12,
    marginTop: 4,
  },
  earningsPreview: {
    borderRadius: 8,
    padding: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsTotal: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningsLabel: {
    fontSize: 14,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  earningsTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
