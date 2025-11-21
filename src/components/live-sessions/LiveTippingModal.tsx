/**
 * Live Tipping Modal
 * Allows users to tip creators during live sessions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

interface LiveTippingModalProps {
  visible: boolean;
  creatorName: string;
  creatorId: string;
  sessionId: string;
  onClose: () => void;
  onSendTip: (amount: number, message?: string) => Promise<void>;
}

export default function LiveTippingModal({
  visible,
  creatorName,
  onClose,
  onSendTip,
}: LiveTippingModalProps) {
  const { theme } = useTheme();
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const quickAmounts = [1, 5, 10, 20, 50];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    setCustomAmount(text);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number | null => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const handleSendTip = async () => {
    const amount = getFinalAmount();
    
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid tip amount');
      return;
    }

    if (amount < 1) {
      Alert.alert('Minimum Tip', 'Minimum tip amount is $1');
      return;
    }

    if (amount > 1000) {
      Alert.alert('Maximum Tip', 'Maximum tip amount is $1,000');
      return;
    }

    try {
      setLoading(true);
      await onSendTip(amount, message || undefined);
      
      // Reset form
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      
      // Close modal
      onClose();
      
      // Show success
      Alert.alert(
        'Tip Sent! 🎉',
        `You sent $${amount.toFixed(2)} to ${creatorName}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Tip error:', error);
      Alert.alert(
        'Tip Failed',
        error instanceof Error ? error.message : 'Failed to send tip. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      onClose();
    }
  };

  const finalAmount = getFinalAmount();
  const platformFee = finalAmount ? finalAmount * 0.15 : 0;
  const creatorReceives = finalAmount ? finalAmount - platformFee : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          {/* Handle Bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#DC2626', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tipIcon}
              >
                <Ionicons name="cash" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                  Send Tip
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                  to {creatorName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick Amounts */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Quick Amount
              </Text>
              <View style={styles.quickAmounts}>
                {quickAmounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountButton,
                      { 
                        backgroundColor: theme.colors.card,
                        borderColor: selectedAmount === amount ? theme.colors.primary : theme.colors.border,
                      },
                      selectedAmount === amount && styles.amountButtonSelected,
                    ]}
                    onPress={() => handleAmountSelect(amount)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        { color: selectedAmount === amount ? theme.colors.primary : theme.colors.text },
                      ]}
                    >
                      ${amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Amount */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Or Enter Custom Amount
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
                <TextInput
                  style={[styles.customAmountInput, { color: theme.colors.text }]}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Message */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Add a Message (Optional)
              </Text>
              <TextInput
                style={[
                  styles.messageInput,
                  { 
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder="Say something nice..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={200}
                editable={!loading}
              />
              <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                {message.length}/200
              </Text>
            </View>

            {/* Breakdown */}
            {finalAmount && finalAmount > 0 && (
              <View style={[styles.breakdown, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                    Tip Amount
                  </Text>
                  <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>
                    ${finalAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                    Platform Fee (15%)
                  </Text>
                  <Text style={[styles.breakdownValue, { color: theme.colors.textSecondary }]}>
                    -${platformFee.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={[styles.breakdownLabel, { color: theme.colors.text, fontWeight: '700' }]}>
                    Creator Receives
                  </Text>
                  <Text style={[styles.breakdownValue, { color: theme.colors.primary, fontWeight: '700' }]}>
                    ${creatorReceives.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Tips are processed securely through Stripe. The creator receives 85% of the tip amount.
              </Text>
            </View>
          </ScrollView>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: finalAmount && finalAmount > 0 && !loading ? 1 : 0.5 }
            ]}
            onPress={handleSendTip}
            disabled={!finalAmount || finalAmount <= 0 || loading}
          >
            <LinearGradient
              colors={['#DC2626', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>
                    Send ${finalAmount ? finalAmount.toFixed(2) : '0.00'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amountButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  amountButtonSelected: {
    borderWidth: 2,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  breakdown: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownLabel: {
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  sendButton: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

