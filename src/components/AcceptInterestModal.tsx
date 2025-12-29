import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface Interest {
  id: string;
  opportunity_id: string;
  interested_user_id: string;
  reason: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  opportunity: {
    id: string;
    title: string;
  };
  interested_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    headline: string | null;
    location: string | null;
  };
}

interface AcceptInterestModalProps {
  visible: boolean;
  interest: Interest;
  onClose: () => void;
  onSubmit: (customMessage: string) => Promise<void>;
}

const QUICK_TEMPLATES = [
  {
    id: 'schedule_call',
    label: "Let's schedule a call",
    message: "Great to hear from you! I'd love to schedule a call to discuss this opportunity in detail. What times work best for you this week?",
    icon: 'call' as const,
  },
  {
    id: 'send_samples',
    label: 'Can you send samples?',
    message: "Thanks for your interest! I'd love to hear some samples of your work. Could you share a few examples that showcase your skills?",
    icon: 'musical-notes' as const,
  },
  {
    id: 'availability',
    label: "What's your availability?",
    message: "This looks like a great fit! Can you share your availability and expected timeline for this project?",
    icon: 'calendar' as const,
  },
];

export default function AcceptInterestModal({
  visible,
  interest,
  onClose,
  onSubmit,
}: AcceptInterestModalProps) {
  const { theme } = useTheme();
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTemplateSelect = (template: typeof QUICK_TEMPLATES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomMessage(template.message);
  };

  const handleSubmit = async () => {
    if (!customMessage.trim()) {
      Alert.alert('Message Required', 'Please write a message to send with your acceptance.');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await onSubmit(customMessage.trim());

      // Reset form
      setCustomMessage('');
    } catch (error) {
      console.error('Failed to accept interest:', error);
      Alert.alert('Error', 'Failed to accept interest. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomMessage('');
    onClose();
  };

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
              Accept Interest
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* User Preview */}
            <View style={[styles.userPreview, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.userHeader}>
                {interest.interested_user.avatar_url ? (
                  <Image
                    source={{ uri: interest.interested_user.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.colors.text }]}>
                    {interest.interested_user.display_name}
                  </Text>
                  {interest.interested_user.headline && (
                    <Text style={[styles.userHeadline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {interest.interested_user.headline}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.opportunityBadge, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="briefcase" size={14} color={theme.colors.primary} />
                <Text style={[styles.opportunityText, { color: theme.colors.text }]} numberOfLines={1}>
                  {interest.opportunity.title}
                </Text>
              </View>

              {interest.message && (
                <View style={[styles.originalMessage, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.originalMessageLabel, { color: theme.colors.textSecondary }]}>
                    Their message:
                  </Text>
                  <Text style={[styles.originalMessageText, { color: theme.colors.text }]}>
                    "{interest.message}"
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Templates */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Quick Templates
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Start with a template or write your own message
              </Text>

              <View style={styles.templatesContainer}>
                {QUICK_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => handleTemplateSelect(template)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.templateIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Ionicons name={template.icon} size={20} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.templateLabel, { color: theme.colors.text }]}>
                      {template.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Message */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Your Message *
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                This will be sent to {interest.interested_user.display_name}
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
                placeholder="Write your message here..."
                placeholderTextColor={theme.colors.textSecondary}
                value={customMessage}
                onChangeText={setCustomMessage}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                {customMessage.length}/1000
              </Text>
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                Your message will be sent to their Messages inbox, and they'll receive a push notification.
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!customMessage.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!customMessage.trim() || submitting}
            >
              <LinearGradient
                colors={submitting || !customMessage.trim() ? ['#666', '#666'] : ['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>
                  {submitting ? 'Accepting...' : 'Send & Accept'}
                </Text>
                {!submitting && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
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
  userPreview: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userHeadline: {
    fontSize: 13,
    fontWeight: '400',
  },
  opportunityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  opportunityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  originalMessage: {
    padding: 12,
    borderRadius: 8,
  },
  originalMessageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  originalMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
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
  templatesContainer: {
    gap: 12,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  templateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
