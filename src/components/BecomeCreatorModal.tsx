/**
 * BecomeCreatorModal Component
 * Two-step flow: (1) perks overview, (2) creator agreement checkboxes.
 * All five agreement items must be individually ticked before proceeding.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { isCreatorAgreementCached } from '../hooks/useCreatorAgreement';
import { creatorAgreementService } from '../services/CreatorAgreementService';

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

const AGREEMENT_ITEMS = [
  'I confirm that I own or have the rights to all content I will upload to SoundBridge. I understand that uploading content I do not have rights to may result in removal of that content and termination of my account.',
  'I understand that SoundBridge is a platform and marketplace. SoundBridge does not endorse, guarantee or take responsibility for my content, services or events.',
  'I confirm that any events I list on SoundBridge are my sole responsibility including their organisation, safety and delivery. SoundBridge is not liable for anything that occurs at my events.',
  'I confirm that any services I offer through the SoundBridge marketplace are provided by me as an independent contractor. I am not an employee or agent of SoundBridge.',
  'I have read and agree to the SoundBridge Terms of Service, Privacy Policy and Creator Rights Agreement.',
];

export default function BecomeCreatorModal({
  visible,
  onClose,
  onBecomeCreator,
  loading = false,
}: BecomeCreatorModalProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'perks' | 'agreement'>('perks');
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false, false]);

  const allChecked = checked.every(Boolean);
  const isLoading = loading || isSubmitting;

  // Reset when modal hides
  useEffect(() => {
    if (!visible) {
      setStep('perks');
      setChecked([false, false, false, false, false]);
    }
  }, [visible]);

  const toggleCheck = (index: number) => {
    setChecked(prev => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleAgree = async () => {
    setIsSubmitting(true);
    try {
      await creatorAgreementService.acceptAgreement();

      const success = await onBecomeCreator();
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.isDark ? '#1A2233' : '#FFFFFF' }]}>

          {/* ── STEP 1: Perks ─────────────────────────────────────────── */}
          {step === 'perks' && (
            <>
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

              <Text style={[styles.title, { color: theme.colors.text }]}>
                Become a Creator
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                To host paid events, you need a creator account. Becoming a creator is free!
              </Text>

              <ScrollView style={styles.perksList} showsVerticalScrollIndicator={false}>
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

              <View style={[styles.noteContainer, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                  Becoming a creator is free. To monetize (sell tickets, downloads, etc.), you'll need a subscription.
                </Text>
              </View>

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
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={async () => {
                    // If user already accepted agreement via another action, skip step 2
                    if (isCreatorAgreementCached()) {
                      await handleAgree();
                      return;
                    }
                    // Check server in case cache is cold (e.g. fresh app start)
                    try {
                      if (await creatorAgreementService.hasAcceptedAgreement()) {
                        await handleAgree();
                        return;
                      }
                    } catch { /* non-blocking */ }
                    setStep('agreement');
                  }}
                >
                  <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── STEP 2: Creator Agreement ──────────────────────────────── */}
          {step === 'agreement' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep('perks')}
                  disabled={isLoading}
                >
                  <Ionicons name="arrow-back" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>
                Creator Agreement
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Before you start uploading and earning on SoundBridge please confirm the following.
              </Text>

              <ScrollView style={styles.agreementList} showsVerticalScrollIndicator={false}>
                {AGREEMENT_ITEMS.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.checkRow}
                    onPress={() => toggleCheck(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: checked[index] ? theme.colors.primary : theme.colors.border },
                      checked[index] && { backgroundColor: theme.colors.primary },
                    ]}>
                      {checked[index] && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.checkText, { color: theme.colors.text }]}>
                      {index === 4 ? (
                        // Last item — inline links to legal docs
                        <>
                          {'I have read and agree to the SoundBridge '}
                          <Text
                            style={{ color: theme.colors.primary }}
                            onPress={() => Linking.openURL('https://www.soundbridge.live/legal/terms')}
                          >
                            Terms of Service
                          </Text>
                          {', '}
                          <Text
                            style={{ color: theme.colors.primary }}
                            onPress={() => Linking.openURL('https://www.soundbridge.live/legal/privacy')}
                          >
                            Privacy Policy
                          </Text>
                          {' and Creator Rights Agreement.'}
                        </>
                      ) : item}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.allRequiredNote, { color: theme.colors.textSecondary }]}>
                  All five items must be individually confirmed.
                </Text>
              </ScrollView>

              <View style={[styles.actions, { paddingTop: 8 }]}>
                <TouchableOpacity
                  style={[
                    styles.agreeButton,
                    { backgroundColor: allChecked && !isLoading ? theme.colors.primary : theme.colors.border },
                  ]}
                  onPress={handleAgree}
                  disabled={!allChecked || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>I Agree — Start Creating</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

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
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 40,
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
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
    lineHeight: 20,
  },

  // Perks
  perksList: {
    maxHeight: 260,
    paddingHorizontal: 16,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  perkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkContent: { flex: 1 },
  perkTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  perkDescription: { fontSize: 13, lineHeight: 18 },

  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Agreement
  agreementList: {
    paddingHorizontal: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  allRequiredNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // Actions
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
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
  primaryButton: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  agreeButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 15,
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
