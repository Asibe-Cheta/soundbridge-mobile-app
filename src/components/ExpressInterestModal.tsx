import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface Opportunity {
  id: string;
  type: 'collaboration' | 'event' | 'job';
  title: string;
  description: string;
  posted_by: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  posted_at: string;
  is_featured: boolean;
}

interface ExpressInterestModalProps {
  visible: boolean;
  opportunity: Opportunity | null;
  onClose: () => void;
  onSubmit: (data: {
    opportunityId: string;
    reason: string;
    message: string;
    enableAlerts: boolean;
  }) => Promise<void>;
}

const INTEREST_REASONS = [
  {
    id: 'perfect_fit',
    label: 'Perfect Fit',
    description: 'This matches my skills exactly',
    icon: 'checkmark-circle' as const,
  },
  {
    id: 'interested',
    label: 'Very Interested',
    description: 'This sounds great to me',
    icon: 'star' as const,
  },
  {
    id: 'learn_more',
    label: 'Want Details',
    description: 'I\'d like to know more',
    icon: 'information-circle' as const,
  },
  {
    id: 'available',
    label: 'Available Now',
    description: 'Ready to start immediately',
    icon: 'time' as const,
  },
];

export default function ExpressInterestModal({
  visible,
  opportunity,
  onClose,
  onSubmit,
}: ExpressInterestModalProps) {
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if user is a subscriber (for alerts toggle)
  const isSubscriber = userProfile?.subscription_tier !== 'free';

  const handleReasonSelect = (reasonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(reasonId);
  };

  const handleSubmit = async () => {
    if (!opportunity) return;

    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select why you\'re interested');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await onSubmit({
        opportunityId: opportunity.id,
        reason: selectedReason,
        message: message.trim(),
        enableAlerts: enableAlerts && isSubscriber,
      });

      // Reset form
      setSelectedReason(null);
      setMessage('');
      setEnableAlerts(false);
      onClose();
    } catch (error) {
      console.error('Failed to submit interest:', error);
      Alert.alert('Error', 'Failed to express interest. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setMessage('');
    setEnableAlerts(false);
    onClose();
  };

  if (!opportunity) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Background Gradient */}
        <LinearGradient
          colors={[
            theme.colors.backgroundGradient.start,
            theme.colors.backgroundGradient.middle,
            theme.colors.backgroundGradient.end,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.backgroundGradient}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Express Interest
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Opportunity Preview */}
            <View style={[styles.opportunityPreview, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.opportunityTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {opportunity.title}
              </Text>
              <Text style={[styles.opportunityPoster, { color: theme.colors.textSecondary }]}>
                Posted by {opportunity.posted_by.display_name}
              </Text>
            </View>

            {/* Why You're Interested */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Why are you interested? *
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Select the option that best describes your interest
              </Text>

              <View style={styles.reasonsContainer}>
                {INTEREST_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: selectedReason === reason.id ? theme.colors.primary : theme.colors.border,
                        borderWidth: selectedReason === reason.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleReasonSelect(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonHeader}>
                      <Ionicons
                        name={reason.icon}
                        size={24}
                        color={selectedReason === reason.id ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      {selectedReason === reason.id && (
                        <View style={[styles.selectedBadge, { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.reasonLabel, { color: theme.colors.text }]}>
                      {reason.label}
                    </Text>
                    <Text style={[styles.reasonDescription, { color: theme.colors.textSecondary }]}>
                      {reason.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Optional Message */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Add a message (optional)
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Tell them why you're a great fit
              </Text>
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Hi! I'm very interested in this opportunity because..."
                placeholderTextColor={theme.colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                {message.length}/500
              </Text>
            </View>

            {/* Alerts Toggle (Subscribers Only) */}
            <View style={[styles.alertsSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.alertsInfo}>
                <View style={styles.alertsHeader}>
                  <Ionicons
                    name="notifications"
                    size={20}
                    color={isSubscriber ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.alertsTitle, { color: theme.colors.text }]}>
                    Get alerts for similar opportunities
                  </Text>
                </View>
                <Text style={[styles.alertsDescription, { color: theme.colors.textSecondary }]}>
                  {isSubscriber
                    ? 'We\'ll notify you when new opportunities matching this one are posted'
                    : 'Upgrade to Premium or Unlimited to get alerts for similar opportunities'}
                </Text>
                {!isSubscriber && (
                  <TouchableOpacity style={styles.upgradeButton}>
                    <Text style={[styles.upgradeText, { color: theme.colors.primary }]}>
                      Upgrade Now
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <Switch
                value={enableAlerts}
                onValueChange={setEnableAlerts}
                disabled={!isSubscriber}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedReason || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
            >
              <LinearGradient
                colors={submitting || !selectedReason ? ['#666', '#666'] : ['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>
                  {submitting ? 'Sending...' : 'Send Interest'}
                </Text>
                {!submitting && <Ionicons name="paper-plane" size={18} color="#FFFFFF" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  opportunityPreview: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  opportunityPoster: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 16,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reasonCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  alertsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  alertsInfo: {
    flex: 1,
    marginRight: 12,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertsDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
