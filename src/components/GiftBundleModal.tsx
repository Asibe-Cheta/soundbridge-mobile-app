/**
 * GiftBundleModal — credit a non-refundable, non-withdrawable Gift Bundle balance,
 * later spent on tips to any artist (GIFT_BUNDLE.MD, Item 36). Structurally mirrors
 * TipModal.tsx (same bottom-sheet pattern, same Stripe flow shape) but is a separate
 * component — this is a distinct financial primitive, not a tip.
 */
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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useStripe } from '@stripe/stripe-react-native';
import { giftBundleService } from '../services/GiftBundleService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAG_H = 26;
const HEADER_H = 50;
const FOOTER_H = Platform.OS === 'ios' ? 100 : 84;
const SCROLL_MAX_H = Math.round(SCREEN_HEIGHT * 0.62) - DRAG_H - HEADER_H - FOOTER_H;

const GIFT_BUNDLE_COPY =
  "Credit your Gift Bundle with an amount of your choice, and unlock amazing rewards like discounted and free transportation to shows, and free event tickets, our way of saying thank you for showing up for the people you love.";

interface GiftBundleModalProps {
  visible: boolean;
  onClose: () => void;
  onCredited?: (newBalance: number) => void;
}

export default function GiftBundleModal({ visible, onClose, onCredited }: GiftBundleModalProps) {
  const { theme } = useTheme();
  const { user, userProfile, session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedAmount, setSelectedAmount] = useState(30);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  // Matches MINIMUM_GIFT_BUNDLE_TOPUP_USD in the web app (src/lib/platform-fees.ts).
  const MINIMUM_TOPUP = 5;
  const presetAmounts = [30, 50];
  const isDark = theme.isDark;

  const stripeConfigured = useMemo(() => Boolean(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY), []);

  useEffect(() => {
    if (!visible) {
      setSelectedAmount(30);
      setCustomAmount('');
      setProcessingMessage(null);
    }
  }, [visible]);

  const getFinalAmount = () => {
    const amountInput = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!Number.isFinite(amountInput)) return 0;
    return parseFloat(Math.max(amountInput, 0).toFixed(2));
  };

  const finalAmount = getFinalAmount();

  const proceedToPayment = async (amount: number) => {
    setLoading(true);
    setProcessingMessage('Processing payment...');

    try {
      if (!stripeConfigured) {
        Alert.alert(
          'Gift Bundle Credited (Simulation Mode)',
          `Stripe is not configured. Simulating a $${amount.toFixed(2)} Gift Bundle credit.`,
          [{ text: 'OK', onPress: () => { onCredited?.(amount); onClose(); } }]
        );
        return;
      }

      if (!session) {
        Alert.alert('Missing Session', 'We could not verify your session. Please sign out and try again.');
        return;
      }

      setProcessingMessage('Contacting payment service...');
      const createResponse = await giftBundleService.createCredit(session, amount, 'USD');

      if (!createResponse?.success || !createResponse.clientSecret) {
        throw new Error('Unable to start Gift Bundle payment.');
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: createResponse.clientSecret,
        merchantDisplayName: 'SoundBridge',
        returnURL: 'soundbridge://stripe-redirect',
        ...(createResponse.customer_id && createResponse.ephemeral_key_secret
          ? { customerId: createResponse.customer_id, customerEphemeralKeySecret: createResponse.ephemeral_key_secret }
          : {}),
        defaultBillingDetails: {
          name: userProfile?.display_name || user?.email || undefined,
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

      setProcessingMessage('Finalising your Gift Bundle...');
      const confirmResponse = await giftBundleService.confirmCredit(session, createResponse.paymentIntentId);

      if (!confirmResponse?.success) throw new Error(confirmResponse?.message || 'Failed to confirm your Gift Bundle credit.');

      Alert.alert(
        'Gift Bundle Credited 🎁',
        `$${amount.toFixed(2)} added to your Gift Bundle. New balance: $${confirmResponse.newBalance.toFixed(2)}.`,
        [{ text: 'OK', onPress: () => { onCredited?.(confirmResponse.newBalance); onClose(); } }]
      );
    } catch (error) {
      Alert.alert(
        "Couldn't Credit Gift Bundle",
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setProcessingMessage(null);
    }
  };

  const handleConfirmPress = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to credit your Gift Bundle');
      return;
    }
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (finalAmount < MINIMUM_TOPUP) {
      Alert.alert('Minimum Top-Up', `Minimum Gift Bundle top-up is $${MINIMUM_TOPUP}.`);
      return;
    }

    // Gentle check-in safeguard — not a block, just a caring confirmation if this is
    // their 3rd+ credit in the last week.
    const recentCount = await giftBundleService.getRecentCreditCount(user.id, 7);
    if (recentCount >= 3) {
      Alert.alert(
        'Just checking in',
        "You've credited your Gift Bundle a few times this week — just making sure you're comfortable with that before we continue. No pressure either way.",
        [
          { text: 'Not right now', style: 'cancel' },
          { text: "Yes, I'm sure", onPress: () => proceedToPayment(finalAmount) },
        ]
      );
      return;
    }

    proceedToPayment(finalAmount);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            <View style={[styles.dragHandleRow, { height: DRAG_H }]}>
              <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />
            </View>

            <View style={[styles.header, { height: HEADER_H, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                Gift Bundle
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: SCROLL_MAX_H }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.copyText, { color: theme.colors.text }]}>{GIFT_BUNDLE_COPY}</Text>

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

              {/* Non-refundability disclosure — always visible, not buried in fine print */}
              <View style={[styles.disclosureBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.disclosureText, { color: theme.colors.textSecondary }]}>
                  This is a gift you're choosing to give, not a deposit. Once credited, it can't be refunded or withdrawn — you can only spend it on tips to artists.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.footer, { height: FOOTER_H, borderTopColor: theme.colors.border }]}>
              {processingMessage ? (
                <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>{processingMessage}</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: finalAmount >= MINIMUM_TOPUP ? theme.colors.primary : theme.colors.surface,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleConfirmPress}
                disabled={finalAmount < MINIMUM_TOPUP || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="gift" size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Credit ${finalAmount.toFixed(2)}</Text>
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.50)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden' },
  dragHandleRow: { alignItems: 'center', justifyContent: 'center' },
  dragHandle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  closeButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 12 },
  copyText: { fontSize: 14, lineHeight: 20 },
  amountRow: { flexDirection: 'row', gap: 8 },
  amountPill: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  amountPillText: { fontSize: 16, fontWeight: '600' },
  customInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  disclosureBox: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'flex-start' },
  disclosureText: { flex: 1, fontSize: 12, lineHeight: 17 },
  footer: { paddingHorizontal: 16, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  processingText: { fontSize: 12, textAlign: 'center', marginBottom: 6 },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  sendButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
