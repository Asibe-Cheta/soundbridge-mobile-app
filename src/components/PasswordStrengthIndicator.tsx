import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import zxcvbn from 'zxcvbn';
import { Ionicons } from '@expo/vector-icons';

interface PasswordStrengthIndicatorProps {
  password: string;
  showSuggestions?: boolean;
  minLength?: number;
}

export default function PasswordStrengthIndicator({
  password,
  showSuggestions = true,
  minLength = 6,
}: PasswordStrengthIndicatorProps) {
  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  // Calculate strength using zxcvbn
  const result = zxcvbn(password);
  const score = result.score; // 0-4 (0=weak, 4=very strong)

  // Strength configuration
  const strengthConfig = [
    { label: 'Very Weak', color: '#DC2626', width: '20%' },
    { label: 'Weak', color: '#F59E0B', width: '40%' },
    { label: 'Fair', color: '#FCD34D', width: '60%' },
    { label: 'Strong', color: '#10B981', width: '80%' },
    { label: 'Very Strong', color: '#059669', width: '100%' },
  ];

  const currentStrength = strengthConfig[score];

  // Requirements check
  const hasMinLength = password.length >= minLength;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const requirements = [
    { met: hasMinLength, text: `At least ${minLength} characters` },
    { met: hasUppercase, text: 'Contains uppercase letter' },
    { met: hasLowercase, text: 'Contains lowercase letter' },
    { met: hasNumber, text: 'Contains number' },
    { met: hasSpecialChar, text: 'Contains special character' },
  ];

  // Crack time estimation
  const crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second;

  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.strengthBarContainer}>
        <View style={styles.strengthBarBackground}>
          <View
            style={[
              styles.strengthBarFill,
              {
                width: currentStrength.width,
                backgroundColor: currentStrength.color,
              },
            ]}
          />
        </View>
        <Text style={[styles.strengthLabel, { color: currentStrength.color }]}>
          {currentStrength.label}
        </Text>
      </View>

      {/* Requirements Checklist */}
      {showSuggestions && (
        <View style={styles.requirementsContainer}>
          {requirements.map((req, index) => (
            <View key={index} style={styles.requirementRow}>
              <Ionicons
                name={req.met ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={req.met ? '#10B981' : '#6B7280'}
                style={styles.requirementIcon}
              />
              <Text
                style={[
                  styles.requirementText,
                  req.met && styles.requirementTextMet,
                ]}
              >
                {req.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Crack Time Estimate (only show for fair+ passwords) */}
      {score >= 2 && (
        <View style={styles.crackTimeContainer}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.crackTimeText}>
            Estimated crack time: {crackTime}
          </Text>
        </View>
      )}

      {/* zxcvbn Suggestions */}
      {showSuggestions && result.feedback.suggestions.length > 0 && score < 3 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
          {result.feedback.suggestions.map((suggestion, index) => (
            <Text key={index} style={styles.suggestionText}>
              • {suggestion}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  strengthBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  requirementsContainer: {
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requirementTextMet: {
    color: '#D1D5DB',
  },
  crackTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  crackTimeText: {
    fontSize: 11,
    color: '#10B981',
    marginLeft: 6,
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 11,
    color: '#FCD34D',
    marginLeft: 8,
    marginTop: 2,
  },
});

