/**
 * PurchaseModal
 * Modal for purchasing paid audio content
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import type { ContentType } from '../types/paid-content';

interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  session: Session;
  contentId: string;
  contentType: ContentType;
  title: string;
  creatorName: string;
  price: number;
  currency: string;
  coverImageUrl?: string;
}

export default function PurchaseModal({
  visible,
  onClose,
  onSuccess,
  session,
  contentId,
  contentType,
  title,
  creatorName,
  price,
  currency,
  coverImageUrl,
}: PurchaseModalProps) {
  const { theme } = useTheme();
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);

  const formatPrice = (amount: number, curr: string) => {
    const symbol = curr === 'GBP' ? '£' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // 1. Get session token
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (!userSession) {
        Alert.alert('Error', 'Please log in to purchase content');
        return;
      }

      console.log('💳 Creating payment intent for:', { contentId, contentType, price, currency });

      // 2. Create payment intent
      const response = await fetch(`${config.apiUrl}/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: contentId,
          content_type: contentType,
          price: price,
          currency: currency,
        }),
      });

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error('❌ Payment API returned non-JSON response:', rawText.slice(0, 200));
        throw new Error('Payment service is unavailable. Please try again later.');
      }

      if (!response.ok) {
        console.error('❌ Payment intent creation failed:', data);
        throw new Error(data.error || 'Failed to create payment intent');
      }

      console.log('✅ Payment intent created:', data.payment_intent_id);

      // 3. Confirm payment with Stripe SDK
      const { error } = await confirmPayment(data.client_secret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('❌ Payment failed:', error);
        Alert.alert('Payment Failed', error.message);
        return;
      }

      console.log('✅ Payment successful!');

      // 4. Success!
      Alert.alert(
        'Purchase Complete!',
        `You now own "${title}". You can play it anytime!`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      Alert.alert('Purchase Failed', error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Purchase Content
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content Preview */}
          <View style={styles.contentPreview}>
            {coverImageUrl ? (
              <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.contentInfo}>
              <Text style={[styles.contentTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              <Text style={[styles.creatorName, { color: theme.colors.textSecondary }]}>
                by {creatorName}
              </Text>
              <Text style={[styles.price, { color: theme.colors.primary }]}>
                {formatPrice(price, currency)}
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              You'll be able to download this content after purchase
            </Text>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
              Payment Method
            </Text>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name="card" size={20} color={theme.colors.primary} />
              <Text style={[styles.paymentMethodText, { color: theme.colors.text }]}>
                Default Payment Method
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.card }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.purchaseButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cart" size={18} color="#FFFFFF" />
                  <Text style={styles.purchaseButtonText}>
                    Purchase {formatPrice(price, currency)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  contentPreview: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  coverImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  coverPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 18,
  },
  paymentSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseButton: {
    flexDirection: 'row',
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
