import React, { useEffect, useMemo, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { createTip, confirmTip } from '../services/TipService';

interface TipModalProps {
  visible: boolean;
  creatorId: string;
  creatorName: string;
  onClose: () => void;
  onTipSuccess: (amount: number, message?: string) => void;
}

export default function TipModal({ visible, creatorId, creatorName, onClose, onTipSuccess }: TipModalProps) {
  const { theme } = useTheme();
  const { user, userProfile, session } = useAuth();
  const { confirmPayment } = useStripe();

  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const presetAmounts = [1, 3, 5, 10, 20];

  const stripeConfigured = useMemo(() => {
    return Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }, []);

  const userTier = useMemo<'free' | 'pro'>(() => {
    const tierFromMetadata = (user?.user_metadata as any)?.subscription_tier;
    const tierFromProfile = (userProfile as any)?.subscription_tier;
    const tier = tierFromMetadata || tierFromProfile;
    if (tier === 'pro') {
      return tier;
    }
    return 'free';
  }, [user?.user_metadata, userProfile]);


  useEffect(() => {
    if (!visible) {
      setSelectedAmount(5);
      setCustomAmount('');
      setTipMessage('');
      setIsAnonymous(false);
      setCardComplete(false);
      setProcessingMessage(null);
    }
  }, [visible]);

  const isCardPaymentReady = useMemo(() => {
    if (!stripeConfigured) {
      return true; // allow mock fallback
    }
    return cardComplete;
  }, [cardComplete, stripeConfigured]);

  const handleSendTip = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to send tips');
      return;
    }

    if (!session) {
      Alert.alert('Missing Session', 'We could not verify your session. Please sign out and try again.');
      return;
    }

    const amountInput = customAmount ? parseFloat(customAmount) : selectedAmount;
    const amount = Number.isFinite(amountInput) ? parseFloat(amountInput.toFixed(2)) : amountInput;

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid tip amount');
      return;
    }

    if (amount > 100) {
      Alert.alert('Amount Too Large', 'Maximum tip amount is $100 for in-app purchases');
      return;
    }

    if (stripeConfigured && !isCardPaymentReady) {
      Alert.alert('Payment Details Needed', 'Please complete your card details before sending a tip.');
      return;
    }

    setLoading(true);
    setProcessingMessage('Processing payment...');

    try {
      console.log('🎯 Sending tip:', { creatorId, amount, message: tipMessage, isAnonymous, tier: userTier });

      if (!stripeConfigured) {
        console.warn('Stripe publishable key missing, using fallback flow.');
        const amountInCents = Math.round(amount * 100);
        Alert.alert(
          'Tip Sent (Simulation Mode)',
          `Stripe is not configured. Simulating a £${amount.toFixed(2)} tip to ${creatorName}.`,
          [{
            text: 'OK',
            onPress: () => {
              onTipSuccess(amountInCents, tipMessage);
              onClose();
            },
          }]
        );
        return;
      }

      setProcessingMessage('Contacting payment service...');
      const createResponse = await createTip(session, {
        creatorId,
        amount,
        currency: 'USD',
        message: tipMessage.trim() || undefined,
        isAnonymous,
        userTier,
        paymentMethod: 'card',
      });

      if (!createResponse?.success || !createResponse.clientSecret) {
        throw new Error(createResponse?.message || 'Unable to start tip payment.');
      }

      setProcessingMessage('Confirming payment...');
      const { error: confirmError } = await confirmPayment(createResponse.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        console.error('❌ Stripe confirmPayment error:', confirmError);
        throw new Error(confirmError.localizedMessage || confirmError.message || 'Payment failed.');
      }

      setProcessingMessage('Finalising tip...');
      const confirmResponse = await confirmTip(session, createResponse.paymentIntentId);

      if (!confirmResponse?.success) {
        throw new Error(confirmResponse?.message || 'Failed to confirm tip payment.');
      }

      const platformFee = typeof createResponse.platformFee === 'number' ? createResponse.platformFee : getPlatformFee(amount);
      const creatorEarnings = typeof createResponse.creatorEarnings === 'number' ? createResponse.creatorEarnings : getCreatorEarnings(amount);
      const amountInCents = Math.round(amount * 100);

      Alert.alert(
        'Tip Sent Successfully! 🎉',
        `You tipped $${amount.toFixed(2)} to ${creatorName}.
Creator receives: $${creatorEarnings.toFixed(2)}
Platform fee: $${platformFee.toFixed(2)}`,
        [{
          text: 'OK',
          onPress: () => {
            onTipSuccess(amountInCents, tipMessage);
            onClose();
          },
        }]
      );
    } catch (error) {
      console.error('❌ Error sending tip:', error);
      Alert.alert(
        'Tip Failed',
        error instanceof Error ? error.message : 'Failed to send tip. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setProcessingMessage(null);
    }
  };

  const getFinalAmount = () => {
    const amountInput = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!Number.isFinite(amountInput)) {
      return 0;
    }
    return parseFloat(Math.max(amountInput, 0).toFixed(2));
  };

  const getPlatformFee = (amountOverride?: number) => {
    const amount = typeof amountOverride === 'number' ? amountOverride : getFinalAmount();
    const feeRate = userTier === 'pro' ? 0.08 : 0.10;
    return amount * feeRate;
  };

  const getCreatorEarnings = (amountOverride?: number) => {
    const amount = typeof amountOverride === 'number' ? amountOverride : getFinalAmount();
    return amount - getPlatformFee(amount);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.container}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Send a Tip</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
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

            {stripeConfigured ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Method</Text>
                <View
                  style={[
                    styles.cardFieldContainer,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }
                  ]}
                >
                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{
                      number: '4242 4242 4242 4242',
                      expiration: 'MM/YY',
                      cvc: 'CVC',
                    }}
                    cardStyle={{
                      backgroundColor: theme.isDark ? '#1F1F1F' : '#FFFFFF',
                      textColor: theme.isDark ? '#FFFFFF' : '#000000',
                      placeholderColor: theme.isDark ? '#9CA3AF' : '#6B7280',
                      borderColor: 'transparent',
                      fontSize: 16,
                      textErrorColor: '#EF4444',
                    }}
                    style={styles.cardField}
                    onCardChange={(details) => setCardComplete(Boolean(details?.complete))}
                  />
                </View>
                {!cardComplete && (
                  <Text style={[styles.cardHelperText, { color: theme.colors.textSecondary }]}>Enter your card details to complete the tip.</Text>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <View
                  style={[
                    styles.noticeBanner,
                    {
                      backgroundColor: theme.colors.warning + '20',
                      borderColor: theme.colors.warning + '40',
                    }
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={theme.colors.warning} />
                  <Text style={[styles.noticeText, { color: theme.colors.text }]}>
                    Stripe is not configured for this build. Tips will be simulated.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Send Button */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            {processingMessage ? (
              <Text style={[styles.processingMessage, { color: theme.colors.textSecondary }]}>
                {processingMessage}
              </Text>
            ) : null}
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
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
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
  scrollContent: {
    paddingBottom: 24,
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
  cardFieldContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  cardHelperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  noticeText: {
    fontSize: 14,
    flex: 1,
  },
  processingMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
});
