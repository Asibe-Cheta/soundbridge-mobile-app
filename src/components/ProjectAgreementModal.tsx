import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import * as Haptics from 'expo-haptics';

const VALUE_PROP_SEEN_KEY = '@soundbridge_project_agreement_value_prop_seen';

interface ProjectAgreementModalProps {
  visible: boolean;
  opportunityTitle: string;
  creatorName: string;
  onClose: () => void;
  onSubmit: (data: {
    agreed_amount: number;
    currency: string;
    deadline?: string;
    brief: string;
  }) => Promise<void>;
}

const CURRENCY_OPTIONS = ['GBP', 'USD', 'EUR', 'NGN'];

export default function ProjectAgreementModal({
  visible,
  opportunityTitle,
  creatorName,
  onClose,
  onSubmit,
}: ProjectAgreementModalProps) {
  const { theme } = useTheme();

  const [showValueProp, setShowValueProp] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [deadline, setDeadline] = useState('');
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      checkValuePropSeen();
    }
  }, [visible]);

  const checkValuePropSeen = async () => {
    const seen = await AsyncStorage.getItem(VALUE_PROP_SEEN_KEY);
    if (!seen) {
      setShowValueProp(true);
    }
  };

  const dismissValueProp = async () => {
    await AsyncStorage.setItem(VALUE_PROP_SEEN_KEY, 'true');
    setShowValueProp(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClose = () => {
    setAmount('');
    setCurrency('GBP');
    setDeadline('');
    setBrief('');
    setShowValueProp(false);
    onClose();
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid agreed amount.');
      return;
    }
    if (!brief.trim() || brief.trim().length < 10) {
      Alert.alert('Brief Required', 'Please describe the deliverables (at least 10 characters).');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSubmit({
        agreed_amount: parsedAmount,
        currency,
        deadline: deadline.trim() || undefined,
        brief: brief.trim(),
      });
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send project agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Create Project Agreement
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Value Prop Screen (shown on first use) */}
          {showValueProp ? (
            <View style={styles.valuePropContainer}>
              <View style={[styles.valuePropCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.lockIcon}>
                  <LinearGradient
                    colors={['#7C3AED', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.lockGradient}
                  >
                    <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </View>

                <Text style={[styles.valuePropTitle, { color: theme.colors.text }]}>
                  Why pay through SoundBridge?
                </Text>

                {[
                  { icon: 'lock-closed', text: 'Funds held in escrow — released only when you confirm delivery' },
                  { icon: 'shield', text: 'Full dispute resolution if something goes wrong' },
                  { icon: 'star', text: 'Verified Review on both profiles — only for on-platform transactions' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.valuePropItem}>
                    <Ionicons name={item.icon as any} size={18} color="#7C3AED" style={styles.valuePropIcon} />
                    <Text style={[styles.valuePropText, { color: theme.colors.text }]}>{item.text}</Text>
                  </View>
                ))}

                <View style={[styles.warningBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Ionicons name="warning-outline" size={16} color="#EF4444" />
                  <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
                    Off-platform payments remove all protection for both parties
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={dismissValueProp} style={styles.valuePropButton}>
                <LinearGradient
                  colors={['#EC4899', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.valuePropGradient}
                >
                  <Text style={styles.valuePropButtonText}>Got it — Create Agreement</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* For whom */}
                <View style={[styles.previewCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>
                    Agreeing with
                  </Text>
                  <Text style={[styles.previewName, { color: theme.colors.text }]}>
                    {creatorName}
                  </Text>
                  <Text style={[styles.previewTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {opportunityTitle}
                  </Text>
                </View>

                {/* Amount */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Agreed Amount *
                  </Text>
                  <View style={styles.amountRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.currencyScroll}
                      contentContainerStyle={styles.currencyList}
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.currencyChip,
                            {
                              backgroundColor: currency === c ? theme.colors.primary : theme.colors.card,
                              borderColor: currency === c ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                          onPress={() => {
                            setCurrency(c);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Text
                            style={[
                              styles.currencyText,
                              { color: currency === c ? '#FFFFFF' : theme.colors.text },
                            ]}
                          >
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TextInput
                      style={[
                        styles.amountInput,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                    <View style={[styles.feeBreakdown, { backgroundColor: 'rgba(124, 58, 237, 0.08)' }]}>
                      <Text style={[styles.feeText, { color: theme.colors.textSecondary }]}>
                        Platform fee (15%): {currency} {(parseFloat(amount) * 0.15).toFixed(2)}
                      </Text>
                      <Text style={[styles.feeText, { color: '#7C3AED', fontWeight: '600' }]}>
                        Creator receives: {currency} {(parseFloat(amount) * 0.85).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Deadline */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Deadline (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="e.g. 2026-03-15 or March 15, 2026"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={deadline}
                    onChangeText={setDeadline}
                  />
                </View>

                {/* Brief */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Project Brief *
                  </Text>
                  <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
                    Describe exactly what you need delivered
                  </Text>
                  <TextInput
                    style={[
                      styles.briefInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                    ]}
                    placeholder="e.g. Record 3 lead vocal tracks + harmonies. Files delivered as 48kHz WAV by the deadline."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={brief}
                    onChangeText={setBrief}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                    {brief.length}/500
                  </Text>
                </View>

                {/* Escrow note */}
                <View style={[styles.escrowNote, { backgroundColor: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(124, 58, 237, 0.2)' }]}>
                  <Ionicons name="lock-closed" size={16} color="#7C3AED" />
                  <Text style={[styles.escrowNoteText, { color: theme.colors.textSecondary }]}>
                    Payment is held in escrow and released to the creator only when you confirm delivery.
                  </Text>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={[styles.submitButton, (submitting || !amount || !brief.trim()) && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting || !amount || !brief.trim()}
                >
                  <LinearGradient
                    colors={submitting || !amount || !brief.trim() ? ['#666', '#666'] : ['#EC4899', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitGradient}
                  >
                    <Text style={styles.submitText}>
                      {submitting ? 'Sending...' : 'Send Agreement'}
                    </Text>
                    {!submitting && <Ionicons name="paper-plane" size={18} color="#FFFFFF" />}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const T = Typography.body.fontFamily;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: { padding: 4 },
  headerTitle: { fontFamily: T, fontSize: 18, fontWeight: '600', letterSpacing: -0.4 },

  // Value prop
  valuePropContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  valuePropCard: { borderRadius: 20, borderWidth: 1, padding: 24, marginBottom: 24, alignItems: 'center' },
  lockIcon: { marginBottom: 20 },
  lockGradient: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  valuePropTitle: { fontFamily: T, fontSize: 20, fontWeight: '600', letterSpacing: -0.4, marginBottom: 20, textAlign: 'center' },
  valuePropItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, width: '100%' },
  valuePropIcon: { marginRight: 10, marginTop: 1 },
  valuePropText: { fontFamily: T, flex: 1, fontSize: 14, fontWeight: '300', letterSpacing: -0.4, lineHeight: 20 },
  warningBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, padding: 10, marginTop: 8, gap: 8, width: '100%' },
  warningText: { fontFamily: T, flex: 1, fontSize: 12, fontWeight: '300', letterSpacing: -0.4, lineHeight: 16 },
  valuePropButton: { borderRadius: 24, overflow: 'hidden' },
  valuePropGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  valuePropButtonText: { fontFamily: T, fontSize: 15, fontWeight: '600', letterSpacing: -0.4, color: '#FFFFFF' },

  // Form
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  previewCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  previewLabel: { fontFamily: T, fontSize: 11, fontWeight: '300', letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase', opacity: 0.5 },
  previewName: { fontFamily: T, fontSize: 16, fontWeight: '600', letterSpacing: -0.4, marginBottom: 2 },
  previewTitle: { fontFamily: T, fontSize: 13, fontWeight: '300', letterSpacing: -0.4 },
  section: { marginBottom: 20 },
  label: { fontFamily: T, fontSize: 14, fontWeight: '600', letterSpacing: -0.4, marginBottom: 8 },
  sublabel: { fontFamily: T, fontSize: 12, fontWeight: '300', letterSpacing: -0.4, marginBottom: 8 },
  amountRow: { gap: 8 },
  currencyScroll: { marginBottom: 8 },
  currencyList: { flexDirection: 'row', gap: 8 },
  currencyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  currencyText: { fontFamily: T, fontSize: 13, fontWeight: '600', letterSpacing: -0.4 },
  amountInput: { fontFamily: T, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 22, fontWeight: '600', letterSpacing: -0.4 },
  feeBreakdown: { borderRadius: 8, padding: 10, marginTop: 8, gap: 4 },
  feeText: { fontFamily: T, fontSize: 12, fontWeight: '300', letterSpacing: -0.4 },
  input: { fontFamily: T, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '300', letterSpacing: -0.4 },
  briefInput: { fontFamily: T, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '300', letterSpacing: -0.4, minHeight: 100 },
  charCount: { fontFamily: T, fontSize: 11, fontWeight: '300', letterSpacing: -0.4, textAlign: 'right', marginTop: 4 },
  escrowNote: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  escrowNoteText: { fontFamily: T, flex: 1, fontSize: 12, fontWeight: '300', letterSpacing: -0.4, lineHeight: 18 },
  footer: { padding: 16, borderTopWidth: 1 },
  submitButton: { borderRadius: 24, overflow: 'hidden' },
  submitDisabled: { opacity: 0.5 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  submitText: { fontFamily: T, fontSize: 15, fontWeight: '600', letterSpacing: -0.4, color: '#FFFFFF' },
});
