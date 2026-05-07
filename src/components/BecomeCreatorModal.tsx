/**
 * BecomeCreatorModal Component
 * Prompts non-creator users to switch to a creator account when attempting
 * to access creator-only features like hosting paid events.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface BecomeCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onBecomeCreator: () => Promise<boolean>;
  loading?: boolean;
}

const CREATOR_PERKS = [
  {
    icon: 'ticket-outline' as const,
    title: 'Host Paid Events',
    description: 'Sell tickets and keep 95% of revenue',
  },
  {
    icon: 'musical-notes-outline' as const,
    title: 'Sell Your Audio',
    description: 'Upload and monetize your music, podcasts, and more',
  },
  {
    icon: 'heart-outline' as const,
    title: 'Receive Tips',
    description: 'Let fans support you directly with tips',
  },
  {
    icon: 'analytics-outline' as const,
    title: 'Creator Analytics',
    description: 'Track your performance with detailed insights',
  },
  {
    icon: 'people-outline' as const,
    title: 'Professional Networking',
    description: 'Connect with other creators and industry professionals',
  },
  {
    icon: 'ribbon-outline' as const,
    title: 'Creator Badge',
    description: 'Stand out with a verified creator profile badge',
  },
];

export default function BecomeCreatorModal({
  visible,
  onClose,
  onBecomeCreator,
  loading = false,
}: BecomeCreatorModalProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBecomeCreator = async () => {
    setIsSubmitting(true);
    try {
      const success = await onBecomeCreator();
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loading || isSubmitting;

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
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="star" size={32} color={theme.colors.primary} />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Become a Creator
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            To host paid events, you need a creator account. Becoming a creator is free!
          </Text>

          {/* Perks List */}
          <ScrollView
            style={styles.perksList}
            showsVerticalScrollIndicator={false}
          >
            {CREATOR_PERKS.map((perk, index) => (
              <View key={index} style={styles.perkItem}>
                <View style={[styles.perkIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Ionicons name={perk.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.perkContent}>
                  <Text style={[styles.perkTitle, { color: theme.colors.text }]}>
                    {perk.title}
                  </Text>
                  <Text style={[styles.perkDescription, { color: theme.colors.textSecondary }]}>
                    {perk.description}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Note about subscription */}
          <View style={[styles.noteContainer, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
              Becoming a creator is free. To monetize (sell tickets, downloads, etc.), you'll need a subscription.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleBecomeCreator}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Become a Creator</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    maxHeight: '85%',
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
    marginBottom: 20,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  perksList: {
    maxHeight: 280,
    paddingHorizontal: 16,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  perkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkContent: {
    flex: 1,
  },
  perkTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  perkDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  buttonDisabled: {
    opacity: 0.7,
  },
});
