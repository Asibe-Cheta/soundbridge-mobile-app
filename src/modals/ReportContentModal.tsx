import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { reportService } from '../services/api/reportService';
import type { ReportType, ContentType } from '../types/report.types';

interface ReportContentModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  onReported?: () => void;
}

const MAX_DESCRIPTION_LENGTH = 1000;

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'copyright_infringement',
    label: 'Copyright infringement',
    description: 'Unauthorized use of copyrighted material',
  },
  {
    value: 'spam',
    label: 'Spam or misleading content',
    description: 'Repetitive, unwanted, or deceptive content',
  },
  {
    value: 'inappropriate_content',
    label: 'Inappropriate or offensive content',
    description: 'Content that violates community guidelines',
  },
  {
    value: 'harassment',
    label: 'Harassment or bullying',
    description: 'Targeted abuse or intimidation',
  },
  {
    value: 'fake_content',
    label: 'Fake or misleading information',
    description: 'False claims or misinformation',
  },
  {
    value: 'unauthorized_use',
    label: 'Unauthorized use',
    description: 'Unauthorized use of content or material',
  },
  {
    value: 'other',
    label: 'Other violation',
    description: 'Another type of violation',
  },
];

export default function ReportContentModal({
  visible,
  onClose,
  contentType,
  contentId,
  contentTitle,
  onReported,
}: ReportContentModalProps) {
  const { theme } = useTheme();
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reportType) {
      setError('Please select a report type');
      return;
    }

    // Reason is REQUIRED (minimum 10 characters)
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Please provide a reason (minimum 10 characters)');
      return;
    }

    if (reportType === 'other' && !description.trim()) {
      setError('Please provide a description for this report type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await reportService.reportContent({
        contentType,
        contentId,
        reportType,
        reason: reason.trim(),
        description: description.trim() || undefined,
      });
      onReported?.();
      onClose();
      setReportType(null);
      setReason('');
      setDescription('');
      Alert.alert(
        'Report Submitted',
        'Your report has been submitted and will be reviewed by our moderation team. Thank you for helping keep our community safe.'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReportType(null);
      setReason('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  const descriptionLength = description.length;
  const reasonLength = reason.length;
  const isOtherSelected = reportType === 'other';
  const canSubmit = reportType && reasonLength >= 10 && (!isOtherSelected || description.trim().length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
      transparent={false}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Report {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Content Preview */}
          <View
            style={[
              styles.contentPreview,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons name="flag-outline" size={20} color={theme.colors.textSecondary} />
            <Text
              style={[styles.contentPreviewText, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {contentTitle}
            </Text>
          </View>

          {/* Report Type Selection */}
          <View style={styles.reportTypeSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              What's the issue?
            </Text>
            {REPORT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.reportTypeOption,
                  {
                    backgroundColor:
                      reportType === type.value ? theme.colors.primary + '20' : theme.colors.card,
                    borderColor:
                      reportType === type.value ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setReportType(type.value);
                  setError(null);
                }}
                disabled={loading}
              >
                <View style={styles.radioContainer}>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor:
                          reportType === type.value
                            ? theme.colors.primary
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {reportType === type.value && (
                      <View
                        style={[styles.radioInner, { backgroundColor: theme.colors.primary }]}
                      />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[styles.radioLabel, { color: theme.colors.text }]}>
                      {type.label}
                    </Text>
                    <Text style={[styles.radioDescription, { color: theme.colors.textSecondary }]}>
                      {type.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reason Input (REQUIRED) */}
          <View style={styles.descriptionSection}>
            <Text style={[styles.descriptionLabel, { color: theme.colors.text }]}>
              Reason <Text style={{ color: theme.colors.error || '#FF6B6B' }}>*</Text>
            </Text>
            <Text style={[styles.descriptionHint, { color: theme.colors.textSecondary }]}>
              Minimum 10 characters required
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Please provide a reason for reporting this content..."
              placeholderTextColor={theme.colors.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text
              style={[
                styles.characterCount,
                {
                  color:
                    reasonLength < 10
                      ? theme.colors.error || '#FF6B6B'
                      : reasonLength > 500 * 0.9
                      ? theme.colors.warning || '#FF6B6B'
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {reasonLength}/500 {reasonLength < 10 && '(minimum 10 required)'}
            </Text>
          </View>

          {/* Description Input (for "other" type) */}
          {isOtherSelected && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.descriptionLabel, { color: theme.colors.text }]}>
                Description <Text style={{ color: theme.colors.error || '#FF6B6B' }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Please provide details about the violation..."
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={MAX_DESCRIPTION_LENGTH}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text
                style={[
                  styles.characterCount,
                  {
                    color:
                      descriptionLength > MAX_DESCRIPTION_LENGTH * 0.9
                        ? theme.colors.warning || '#FF6B6B'
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>
          )}

          {/* Optional Description for other types */}
          {reportType && !isOtherSelected && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.descriptionLabel, { color: theme.colors.text }]}>
                Additional details (optional)
              </Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Add any additional context that might help..."
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={MAX_DESCRIPTION_LENGTH}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text
                style={[
                  styles.characterCount,
                  {
                    color:
                      descriptionLength > MAX_DESCRIPTION_LENGTH * 0.9
                        ? theme.colors.warning || '#FF6B6B'
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>
          )}

          {/* Explanation */}
          <View
            style={[
              styles.explanationBox,
              {
                backgroundColor: theme.colors.primary + '10',
                borderColor: theme.colors.primary + '30',
              },
            ]}
          >
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <View style={styles.explanationContent}>
              <Text style={[styles.explanationText, { color: theme.colors.text }]}>
                Your report will be reviewed by our moderation team. We'll take appropriate action
                if a violation is found. You may not receive a direct response.
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error || '#FF6B6B'} />
              <Text style={[styles.errorText, { color: theme.colors.error || '#FF6B6B' }]}>
                {error}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: canSubmit ? theme.colors.error || '#DC2626' : theme.colors.surface,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  contentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  contentPreviewText: {
    flex: 1,
    fontSize: 14,
  },
  reportTypeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reportTypeOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  descriptionHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  descriptionInput: {
    minHeight: 120,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 4,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  explanationBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  explanationContent: {
    flex: 1,
    marginLeft: 8,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

