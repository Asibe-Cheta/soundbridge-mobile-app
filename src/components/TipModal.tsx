import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import InAppPurchaseService from '../services/InAppPurchaseService';

interface TipModalProps {
  visible: boolean;
  creatorId: string;
  creatorName: string;
  onClose: () => void;
  onTipSuccess: (amount: number, message?: string) => void;
}

interface TipResponse {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  tipId?: string;
  platformFee?: number;
  creatorEarnings?: number;
  message?: string;
}

export default function TipModal({ visible, creatorId, creatorName, onClose, onTipSuccess }: TipModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const presetAmounts = [1, 3, 5, 10, 20];

  const handleSendTip = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to send tips');
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    
    if (amount <= 0 || isNaN(amount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid tip amount');
      return;
    }

    if (amount > 100) {
      Alert.alert('Amount Too Large', 'Maximum tip amount is $100 for in-app purchases');
      return;
    }

    setLoading(true);

    try {
      console.log('🎯 Sending tip:', { creatorId, amount, message: tipMessage });

      // For development/testing, simulate successful tip without IAP
      console.log('💡 Simulating tip success (development mode)');
      
      // Simulate backend verification
      const mockResponse = {
        success: true,
        message: 'Tip processed successfully',
        platformFee: getPlatformFee(),
        creatorEarnings: getCreatorEarnings()
      };

      // Show success message
      const platformFee = getPlatformFee();
      const creatorEarnings = getCreatorEarnings();

      Alert.alert(
        'Tip Sent Successfully! 🎉',
        `You tipped $${amount.toFixed(2)} to ${creatorName}.\nCreator receives: $${creatorEarnings.toFixed(2)}\nPlatform fee: $${platformFee.toFixed(2)}\n\n(Development Mode - No actual payment processed)`,
        [{ text: 'OK', onPress: () => {
          onTipSuccess(amount, tipMessage);
          onClose();
        }}]
      );

      /* 
      // TODO: Enable this for production with proper IAP setup
      
      // Create a tip product ID based on amount
      const tipProductId = `tip_${amount.toString().replace('.', '_')}`;
      
      console.log('💳 Processing In-App Purchase for tip:', tipProductId);

      // Initialize IAP service if not already done
      try {
        await InAppPurchaseService.initialize();
      } catch (initError) {
        console.log('⚠️ IAP initialization failed, using fallback:', initError);
        throw new Error('In-App Purchases not available. Please try again later.');
      }

      // Use In-App Purchase Service (similar to upgrade flow)
      const purchaseResult = await InAppPurchaseService.purchaseProduct(tipProductId);
      
      if (purchaseResult?.success) {
        console.log('✅ IAP Purchase successful:', purchaseResult);

        // Verify the purchase with backend
        const verifyResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://soundbridge.live'}/api/payments/verify-tip-iap`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token || user.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creatorId,
            amount,
            message: tipMessage.trim() || undefined,
            isAnonymous,
            userTier: user.subscription?.tier || 'free',
            receipt: purchaseResult.receipt,
            productId: tipProductId,
            transactionId: purchaseResult.transactionId
          }),
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
          const platformFee = getPlatformFee();
          const creatorEarnings = getCreatorEarnings();

          Alert.alert(
            'Tip Sent Successfully! 🎉',
            `You tipped $${amount.toFixed(2)} to ${creatorName}.\nCreator receives: $${creatorEarnings.toFixed(2)}\nPlatform fee: $${platformFee.toFixed(2)}`,
            [{ text: 'OK', onPress: () => {
              onTipSuccess(amount, tipMessage);
              onClose();
            }}]
          );
        } else {
          throw new Error(verifyData.message || 'Failed to verify tip purchase');
        }
      } else {
        throw new Error(purchaseResult?.error || 'Purchase was cancelled or failed');
      }
      */
    } catch (error) {
      console.error('❌ Error sending tip:', error);
      Alert.alert(
        'Tip Failed',
        error instanceof Error ? error.message : 'Failed to send tip. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getFinalAmount = () => {
    return customAmount ? parseFloat(customAmount) || 0 : selectedAmount;
  };

  const getPlatformFee = () => {
    const amount = getFinalAmount();
    const userTier = user?.subscription?.tier || 'free';
    const feeRate = userTier === 'enterprise' ? 0.05 : userTier === 'pro' ? 0.08 : 0.10;
    return amount * feeRate;
  };

  const getCreatorEarnings = () => {
    return getFinalAmount() - getPlatformFee();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Send a Tip</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Creator Info */}
          <View style={styles.creatorSection}>
            <Text style={[styles.creatorText, { color: theme.colors.textSecondary }]}>
              Sending tip to
            </Text>
            <Text style={[styles.creatorName, { color: theme.colors.text }]}>
              {creatorName}
            </Text>
          </View>

          {/* Amount Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Amount</Text>
            <View style={styles.amountGrid}>
              {presetAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.amountButton,
                    {
                      backgroundColor: selectedAmount === amount && !customAmount 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: theme.colors.border,
                    }
                  ]}
                  onPress={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.amountButtonText,
                      {
                        color: selectedAmount === amount && !customAmount 
                          ? '#FFFFFF' 
                          : theme.colors.text
                      }
                    ]}
                  >
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <Text style={[styles.customLabel, { color: theme.colors.textSecondary }]}>
              Or enter custom amount:
            </Text>
            <TextInput
              style={[
                styles.customAmountInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }
              ]}
              placeholder="Enter amount (USD) - Max $100"
              placeholderTextColor={theme.colors.textSecondary}
              value={customAmount}
              onChangeText={(text) => {
                // Only allow numbers and one decimal point
                const numericValue = text.replace(/[^0-9.]/g, '');
                const parts = numericValue.split('.');
                if (parts.length > 2) return; // Prevent multiple decimal points
                
                setCustomAmount(numericValue);
                if (numericValue) setSelectedAmount(0);
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Tip Message */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Message (Optional)
            </Text>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }
              ]}
              placeholder="Say something nice..."
              placeholderTextColor={theme.colors.textSecondary}
              value={tipMessage}
              onChangeText={setTipMessage}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
              {tipMessage.length}/200
            </Text>
          </View>

          {/* Anonymous Option */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.anonymousOption}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <Ionicons
                name={isAnonymous ? "checkbox" : "checkbox-outline"}
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.anonymousText}>
                <Text style={[styles.anonymousTitle, { color: theme.colors.text }]}>
                  Send anonymously
                </Text>
                <Text style={[styles.anonymousSubtitle, { color: theme.colors.textSecondary }]}>
                  Your name won't be shown to the creator
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Fee Breakdown */}
          {getFinalAmount() > 0 && (
            <View style={[styles.feeBreakdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.feeTitle, { color: theme.colors.text }]}>Fee Breakdown</Text>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Tip Amount:</Text>
                <Text style={[styles.feeValue, { color: theme.colors.text }]}>${getFinalAmount().toFixed(2)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Platform Fee:</Text>
                <Text style={[styles.feeValue, { color: theme.colors.textSecondary }]}>-${getPlatformFee().toFixed(2)}</Text>
              </View>
              <View style={[styles.feeRow, styles.totalRow, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.feeLabel, { color: theme.colors.text, fontWeight: '600' }]}>Creator Receives:</Text>
                <Text style={[styles.feeValue, { color: theme.colors.primary, fontWeight: '600' }]}>${getCreatorEarnings().toFixed(2)}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Send Button */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: getFinalAmount() > 0 ? theme.colors.primary : theme.colors.surface,
                opacity: loading ? 0.7 : 1,
              }
            ]}
            onPress={handleSendTip}
            disabled={getFinalAmount() <= 0 || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>
                  Send ${getFinalAmount().toFixed(2)} Tip
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  creatorSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  creatorText: {
    fontSize: 14,
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  amountButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  customAmountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  anonymousText: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  anonymousSubtitle: {
    fontSize: 14,
  },
  feeBreakdown: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  feeLabel: {
    fontSize: 14,
  },
  feeValue: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
