/**
 * UpgradeForPaidEventsModal Component
 * Prompts creators with free tier to upgrade to Premium/Unlimited
 * to access monetization features like paid events.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import RevenueCatService from '../services/RevenueCatService';
import { subscriptionPlans } from '../constants/subscriptionPlans';

interface UpgradeForPaidEventsModalProps {
  visible: boolean;
  onClose: () => void;
}

const getBenefitIcon = (feature: string) => {
  const lower = feature.toLowerCase();
  if (lower.includes('event')) return 'ticket-outline';
  if (lower.includes('download')) return 'musical-notes-outline';
  if (lower.includes('upload')) return 'cloud-upload-outline';
  if (lower.includes('storage')) return 'folder-open-outline';
  if (lower.includes('analytics')) return 'analytics-outline';
  if (lower.includes('discover')) return 'sparkles-outline';
  return 'star-outline';
};

export default function UpgradeForPaidEventsModal({
  visible,
  onClose,
}: UpgradeForPaidEventsModalProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [priceLabel, setPriceLabel] = useState('£6.99/month');
  const premiumPlan = subscriptionPlans.find(plan => plan.id === 'premium');
  const premiumBenefits = premiumPlan?.features.slice(0, 4) || [];

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    const loadPricing = async () => {
      while (!RevenueCatService.isReady() && attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!RevenueCatService.isReady()) return;

      const products = await RevenueCatService.getAvailableProducts();
      if (!isMounted || products.length === 0) return;

      const premiumMonthly = products.find(p => p.tier === 'premium' && p.billingCycle === 'monthly');
      const premiumYearly = products.find(p => p.tier === 'premium' && p.billingCycle === 'yearly');
      const selected = premiumMonthly || premiumYearly;

      if (selected?.priceString) {
        const cycle = selected.billingCycle === 'yearly' ? 'year' : 'month';
        setPriceLabel(`${selected.priceString}/${cycle}`);
      }
    };

    loadPricing().catch(error => {
      console.warn('Failed to load RevenueCat pricing (non-blocking):', error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpgrade = () => {
    onClose();
    // Navigate to the Upgrade screen
    navigation.navigate('Upgrade');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFD700' + '30' }]}>
              <Ionicons name="diamond" size={32} color="#FFD700" />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Upgrade to Monetize
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You need a Premium or Unlimited subscription to host paid events and access other monetization features.
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            {premiumBenefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={[styles.benefitIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Ionicons name={getBenefitIcon(benefit)} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={[styles.benefitTitle, { color: theme.colors.text }]}>
                    {benefit}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing hint */}
          <View style={[styles.pricingHint, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.pricingText, { color: theme.colors.text }]}>
              Premium from{' '}
              <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{priceLabel}</Text>
            </Text>
            <Text style={[styles.pricingSubtext, { color: theme.colors.textSecondary }]}>
              Cancel anytime. No commitment required.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                Not Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleUpgrade}
            >
              <Ionicons name="arrow-up-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>View Plans</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  benefitsList: {
    paddingHorizontal: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  pricingHint: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pricingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  pricingSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
