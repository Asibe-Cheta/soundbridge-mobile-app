import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface RouteParams {
  trackId: string;
  trackTitle: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.soundbridge.live';

export default function AppealFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { trackId, trackTitle } = route.params as RouteParams;
  const { theme } = useTheme();
  const { session } = useAuth();

  const [appealText, setAppealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const MIN_CHARS = 20;
  const MAX_CHARS = 500;

  const handleTextChange = (text: string) => {
    if (text.length <= MAX_CHARS) {
      setAppealText(text);
      setCharCount(text.length);
    }
  };

  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert(
        'Invalid Appeal',
        `Please write between ${MIN_CHARS} and ${MAX_CHARS} characters.`
      );
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Authentication Required', 'Please log in to submit an appeal.');
      return;
    }

    try {
      setIsSubmitting(true);

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
        Alert.alert(
          'Appeal Submitted',
          "We'll review your appeal within 24-48 hours. You'll receive a notification with our decision.",
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to submit appeal');
      }
    } catch (error: any) {
      console.error('Appeal submission error:', error);
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit your appeal. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#130722', '#240c3e', '#2e1065']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Appeal Decision</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Track Info */}
          <View style={styles.trackInfoCard}>
            <View style={styles.trackInfoIcon}>
              <Ionicons name="musical-note" size={32} color="#DC2626" />
            </View>
            <View style={styles.trackInfoText}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {trackTitle}
              </Text>
              <Text style={styles.trackStatus}>Rejected</Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionHeader}>
              <Ionicons name="information-circle" size={20} color="#DC2626" />
              <Text style={styles.instructionTitle}>Appeal Guidelines</Text>
            </View>
            <Text style={styles.instructionText}>
              • Explain why you believe this decision should be reconsidered
            </Text>
            <Text style={styles.instructionText}>
              • Provide context about your content
            </Text>
            <Text style={styles.instructionText}>
              • Be respectful and professional
            </Text>
            <Text style={styles.instructionText}>
              • Appeals are reviewed within 24-48 hours
            </Text>
          </View>

          {/* Appeal Text Input */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Your Appeal</Text>
            <TextInput
              style={[
                styles.textInput,
                !isValid && charCount > 0 && styles.textInputInvalid,
              ]}
              placeholder={`Write your appeal (${MIN_CHARS}-${MAX_CHARS} characters)...`}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={appealText}
              onChangeText={handleTextChange}
              multiline
              maxLength={MAX_CHARS}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.charCounter}>
              <Text
                style={[
                  styles.charCountText,
                  charCount < MIN_CHARS && styles.charCountTextWarning,
                  charCount >= MIN_CHARS && charCount <= MAX_CHARS && styles.charCountTextValid,
                ]}
              >
                {charCount} / {MAX_CHARS}
              </Text>
              {charCount < MIN_CHARS && (
                <Text style={styles.charCountHint}>
                  {MIN_CHARS - charCount} more characters needed
                </Text>
              )}
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={18} color="#F59E0B" />
            <Text style={styles.warningText}>
              False or abusive appeals may result in restrictions on your account.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isValid || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>Submit Appeal</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#130722',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  trackInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trackInfoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(220,38,38,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackInfoText: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  trackStatus: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  instructionsCard: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    lineHeight: 20,
  },
  inputCard: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 15,
    minHeight: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInputInvalid: {
    borderColor: '#DC2626',
  },
  charCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCountText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  charCountTextWarning: {
    color: '#F59E0B',
  },
  charCountTextValid: {
    color: '#10B981',
  },
  charCountHint: {
    fontSize: 12,
    color: '#F59E0B',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(220,38,38,0.3)',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

