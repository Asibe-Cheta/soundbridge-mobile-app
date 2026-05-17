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
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useStripe } from '@stripe/stripe-react-native';
import { createTip, confirmTip } from '../services/TipService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Fixed heights for non-scrollable zones
const DRAG_H = 26;
const HEADER_H = 50;
const FOOTER_H = Platform.OS === 'ios' ? 100 : 84;
// Scrollable area is capped so total sheet ≤ 56% of screen
const SCROLL_MAX_H = Math.round(SCREEN_HEIGHT * 0.56) - DRAG_H - HEADER_H - FOOTER_H;

interface TipModalProps {
  visible: boolean;
  creatorId: string;
  creatorName: string;
  onClose: () => void;
  onTipSuccess: (amount: number, message?: string) => void;
  initialAmount?: number;
  trackId?: string;
}

export default function TipModal({ visible, creatorId, creatorName, onClose, onTipSuccess, initialAmount, trackId }: TipModalProps) {
  const { theme } = useTheme();
  const { user, userProfile, session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const presetAmounts = [1, 3, 5, 10, 20];
  const isDark = theme.isDark;

  const stripeConfigured = useMemo(() => {
    return Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }, []);

  const userTier = useMemo<'free' | 'premium' | 'unlimited'>(() => {
    const tierFromMetadata = (user?.user_metadata as any)?.subscription_tier;
    const tierFromProfile = (userProfile as any)?.subscription_tier;
    const tier = tierFromMetadata || tierFromProfile;
    if (tier === 'premium' || tier === 'unlimited') return tier;
    return 'free';
  }, [user?.user_metadata, userProfile]);

  useEffect(() => {
    if (visible) {
      if (initialAmount != null) {
        setSelectedAmount(initialAmount);
        setCustomAmount('');
      }
    } else {
      setSelectedAmount(5);
      setCustomAmount('');
      setTipMessage('');
      setIsAnonymous(false);
      setProcessingMessage(null);
    }
  }, [visible, initialAmount]);

  const getFinalAmount = () => {
    const amountInput = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!Number.isFinite(amountInput)) return 0;
    return parseFloat(Math.max(amountInput, 0).toFixed(2));
  };

  const getPlatformFee = (amountOverride?: number) => {
    const amount = typeof amountOverride === 'number' ? amountOverride : getFinalAmount();
    return amount * 0.15;
  };

  const getCreatorEarnings = (amountOverride?: number) => {
    const amount = typeof amountOverride === 'number' ? amountOverride : getFinalAmount();
    return amount - getPlatformFee(amount);
  };

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


    setLoading(true);
    setProcessingMessage('Processing payment...');

    try {
      if (!stripeConfigured) {
        const amountInCents = Math.round(amount * 100);
        Alert.alert(
          'Tip Sent (Simulation Mode)',
          `Stripe is not configured. Simulating a $${amount.toFixed(2)} tip to ${creatorName}.`,
          [{ text: 'OK', onPress: () => { onTipSuccess(amountInCents, tipMessage); onClose(); } }]
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
        trackId,
      });

      if (!createResponse?.success || !createResponse.clientSecret) {
        throw new Error(createResponse?.message || 'Unable to start tip payment.');
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: createResponse.clientSecret,
        merchantDisplayName: 'SoundBridge',
        ...(createResponse.customer_id && createResponse.ephemeral_key_secret
          ? { customerId: createResponse.customer_id, customerEphemeralKeySecret: createResponse.ephemeral_key_secret }
          : {}),
        defaultBillingDetails: {
          name: user?.display_name || user?.email || undefined,
          email: user?.email || undefined,
        },
      });

      if (initError) throw new Error(initError.localizedMessage || initError.message || 'Payment setup failed.');

      setProcessingMessage('Confirming payment...');
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') return;
        throw new Error(presentError.localizedMessage || presentError.message || 'Payment failed.');
      }

      setProcessingMessage('Finalising tip...');
      const confirmResponse = await confirmTip(session, createResponse.paymentIntentId);

      if (!confirmResponse?.success) throw new Error(confirmResponse?.message || 'Failed to confirm tip payment.');

      const platformFee = typeof createResponse.platformFee === 'number' ? createResponse.platformFee : getPlatformFee(amount);
      const creatorEarnings = typeof createResponse.creatorEarnings === 'number' ? createResponse.creatorEarnings : getCreatorEarnings(amount);
      const amountInCents = Math.round(amount * 100);

      Alert.alert(
        'Tip Sent! 🎉',
        `$${amount.toFixed(2)} to ${creatorName}. Creator receives $${creatorEarnings.toFixed(2)}.`,
        [{ text: 'OK', onPress: () => { onTipSuccess(amountInCents, tipMessage); onClose(); } }]
      );
    } catch (error) {
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

  const finalAmount = getFinalAmount();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 0}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.sheet,
              {
                backgroundColor: Platform.OS === 'android'
                  ? (isDark ? '#0F0A1E' : '#F5F5FA')
                  : (isDark ? 'rgba(18, 12, 36, 0.72)' : 'rgba(245, 245, 250, 0.82)'),
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            {/* Drag handle */}
            <View style={[styles.dragHandleRow, { height: DRAG_H }]}>
              <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />
            </View>

            {/* Header */}
            <View style={[styles.header, { height: HEADER_H, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                Tip{' '}
                <Text style={{ color: theme.colors.primary }}>{creatorName}</Text>
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable body — explicit maxHeight keeps total sheet ≤ 56% screen */}
            <ScrollView
              style={{ maxHeight: SCROLL_MAX_H }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Amount pills */}
              <View style={styles.amountRow}>
                {presetAmounts.map((amount) => {
                  const isSelected = selectedAmount === amount && !customAmount;
                  return (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.amountPill,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                    >
                      <Text style={[styles.amountPillText, { color: isSelected ? '#FFFFFF' : theme.colors.text }]}>
                        ${amount}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom amount */}
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: customAmount ? theme.colors.primary : theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Custom amount (USD)"
                placeholderTextColor={theme.colors.textSecondary}
                value={customAmount}
                onChangeText={(text) => {
                  const numeric = text.replace(/[^0-9.]/g, '');
                  const parts = numeric.split('.');
                  if (parts.length > 2) return;
                  setCustomAmount(numeric);
                  if (numeric) setSelectedAmount(0);
                }}
                keyboardType="numeric"
              />

              {/* Message */}
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Say something nice... (optional)"
                placeholderTextColor={theme.colors.textSecondary}
                value={tipMessage}
                onChangeText={setTipMessage}
                multiline
                numberOfLines={2}
                maxLength={200}
              />

              {/* Anonymous + fee hint */}
              <View style={styles.bottomRow}>
                <TouchableOpacity style={styles.anonToggle} onPress={() => setIsAnonymous(!isAnonymous)} activeOpacity={0.7}>
                  <Ionicons
                    name={isAnonymous ? 'checkbox' : 'checkbox-outline'}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.anonLabel, { color: theme.colors.textSecondary }]}>
                    Send anonymously
                  </Text>
                </TouchableOpacity>

                {finalAmount > 0 && (
                  <Text style={[styles.feeHint, { color: theme.colors.textSecondary }]}>
                    Creator gets{' '}
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      ${getCreatorEarnings().toFixed(2)}
                    </Text>
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Footer — send button */}
            <View style={[styles.footer, { height: FOOTER_H, borderTopColor: theme.colors.border }]}>
              {processingMessage ? (
                <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
                  {processingMessage}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: finalAmount > 0 ? theme.colors.primary : theme.colors.surface,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSendTip}
                disabled={finalAmount <= 0 || loading || !session}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="heart" size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>
                      Send ${finalAmount.toFixed(2)} Tip
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  dragHandleRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amountPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  amountPillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anonLabel: {
    fontSize: 13,
  },
  feeHint: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  processingText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
