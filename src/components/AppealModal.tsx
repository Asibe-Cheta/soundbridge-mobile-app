import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';

interface AppealModalProps {
  visible: boolean;
  trackId: string;
  trackTitle: string;
  flagReasons?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AppealModal({
  visible,
  trackId,
  trackTitle,
  flagReasons = [],
  onClose,
  onSuccess,
}: AppealModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!appealText.trim()) {
      Alert.alert('Appeal Required', 'Please provide a reason for your appeal.');
      return;
    }

    if (appealText.trim().length < 20) {
      Alert.alert('Appeal Too Short', 'Please provide at least 20 characters explaining why you believe this decision should be reconsidered.');
      return;
    }

    if (appealText.trim().length > 500) {
      Alert.alert('Appeal Too Long', 'Please limit your appeal to 500 characters.');
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Authentication Required', 'Please log in to submit an appeal.');
      return;
    }

    try {
      setSubmitting(true);

      // Use API endpoint instead of direct Supabase call
      const response = await fetch(`${API_BASE_URL}/api/tracks/${trackId}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          appealText: appealText.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
      console.log('✅ Appeal submitted successfully for track:', trackId);
      Alert.alert(
        'Appeal Submitted',
          "We'll review your appeal within 24-48 hours. You'll receive a notification with our decision.",
        [
          {
            text: 'OK',
            onPress: () => {
              setAppealText('');
              onSuccess();
            },
          },
        ]
      );
      } else {
        throw new Error(data.error || 'Failed to submit appeal');
      }
    } catch (error: any) {
      console.error('❌ Exception submitting appeal:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (appealText.trim() && !submitting) {
      Alert.alert(
        'Discard Appeal?',
        'Are you sure you want to discard your appeal?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setAppealText('');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={submitting}
            >
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Submit Appeal
            </Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Track Info */}
            <View style={[styles.trackInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.trackInfoHeader}>
                <Ionicons name="musical-note" size={20} color={theme.colors.primary} />
                <Text style={[styles.trackInfoTitle, { color: theme.colors.text }]}>
                  Track
                </Text>
              </View>
              <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {trackTitle}
              </Text>
            </View>

            {/* Flag Reasons */}
            {flagReasons.length > 0 && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Issues Identified
                  </Text>
                </View>
                {flagReasons.map((reason, index) => (
                  <View key={index} style={styles.flagReason}>
                    <Ionicons name="ellipse" size={6} color={theme.colors.textSecondary} />
                    <Text style={[styles.flagReasonText, { color: theme.colors.textSecondary }]}>
                      {reason}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Instructions */}
            <View style={[styles.instructions, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
                Please explain why you believe this decision should be reconsidered. Be specific and provide relevant details.
              </Text>
            </View>

            {/* Appeal Text Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Your Appeal <Text style={{ color: theme.colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Explain your case here... (20-500 characters)"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={8}
                maxLength={500}
                value={appealText}
                onChangeText={setAppealText}
                editable={!submitting}
                textAlignVertical="top"
              />
              <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
                {appealText.length}/500 characters
                {appealText.length < 20 && ` (${20 - appealText.length} more needed)`}
              </Text>
            </View>

            {/* Guidelines */}
            <View style={[styles.guidelines, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.guidelinesTitle, { color: theme.colors.text }]}>
                Appeal Guidelines
              </Text>
              <View style={styles.guideline}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Be specific about why you believe the decision was incorrect
                </Text>
              </View>
              <View style={styles.guideline}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Provide context or clarification about your content
                </Text>
              </View>
              <View style={styles.guideline}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Be respectful and professional in your explanation
                </Text>
              </View>
              <View style={styles.guideline}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  Avoid aggressive or demanding language
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: appealText.trim().length >= 20 && !submitting
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleSubmit}
              disabled={appealText.trim().length < 20 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Appeal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  trackInfo: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  trackInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  trackInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  flagReason: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
    paddingLeft: 8,
  },
  flagReasonText: {
    fontSize: 14,
    flex: 1,
  },
  instructions: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 160,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  guidelines: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  guidelineText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

