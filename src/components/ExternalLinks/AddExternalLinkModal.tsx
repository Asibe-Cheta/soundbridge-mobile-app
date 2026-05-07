/**
 * AddExternalLinkModal Component
 * Modal for adding/editing external portfolio links
 * Includes platform selection, URL validation, and real-time feedback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { ExternalLink, PlatformType } from '../../types/external-links';
import {
  PLATFORM_METADATA,
  getSupportedPlatforms,
} from '../../config/external-links-config';
import {
  validateExternalLink,
  isValidUrlFormat,
  detectPlatformFromUrl,
} from '../../utils/external-links-validation';
import { externalLinksService } from '../../services/ExternalLinksService';

interface AddExternalLinkModalProps {
  visible: boolean;
  session: Session;
  existingLink?: ExternalLink | null;
  existingPlatforms: PlatformType[];
  onClose: () => void;
  onSave: () => void;
}

export const AddExternalLinkModal: React.FC<AddExternalLinkModalProps> = ({
  visible,
  session,
  existingLink,
  existingPlatforms,
  onClose,
  onSave,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(
    null
  );
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (existingLink) {
        // Editing existing link
        setSelectedPlatform(existingLink.platform_type);
        setUrl(existingLink.url);
      } else {
        // Adding new link
        setSelectedPlatform(null);
        setUrl('');
      }
      setErrors([]);
    }
  }, [visible, existingLink]);

  // Auto-detect platform from URL
  useEffect(() => {
    if (url && !existingLink && !selectedPlatform) {
      const detected = detectPlatformFromUrl(url);
      if (detected && !existingPlatforms.includes(detected)) {
        setSelectedPlatform(detected);
      }
    }
  }, [url]);

  // Real-time validation
  useEffect(() => {
    if (selectedPlatform && url) {
      const validation = validateExternalLink(selectedPlatform, url);
      setErrors(validation.errors);
    } else {
      setErrors([]);
    }
  }, [selectedPlatform, url]);

  const handleSubmit = async () => {
    if (!selectedPlatform) {
      Alert.alert('Error', 'Please select a platform');
      return;
    }

    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    const validation = validateExternalLink(selectedPlatform, url);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingLink) {
        // Update existing link
        await externalLinksService.updateExternalLink(session, existingLink.id, {
          url: validation.sanitizedUrl!,
        });
        Alert.alert('Success', 'Link updated successfully');
      } else {
        // Add new link
        await externalLinksService.addExternalLink(session, {
          platform_type: selectedPlatform,
          url: validation.sanitizedUrl!,
          display_order: existingPlatforms.length + 1,
        });
        Alert.alert('Success', 'Link added successfully');
      }

      onSave();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availablePlatforms = getSupportedPlatforms().filter(
    (platform) =>
      existingLink?.platform_type === platform ||
      !existingPlatforms.includes(platform)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {existingLink ? 'Edit Link' : 'Add External Link'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Platform Selection */}
            <Text style={styles.sectionTitle}>Select Platform</Text>
            <View style={styles.platformGrid}>
              {availablePlatforms.map((platform) => {
                const metadata = PLATFORM_METADATA[platform];
                const isSelected = selectedPlatform === platform;
                const isDisabled = existingLink !== null; // Can't change platform

                return (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      isSelected && styles.platformButtonSelected,
                      isDisabled && styles.platformButtonDisabled,
                    ]}
                    onPress={() => !isDisabled && setSelectedPlatform(platform)}
                    disabled={isDisabled}
                  >
                    <View
                      style={[
                        styles.platformIconSmall,
                        { backgroundColor: `${metadata.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={metadata.icon as any}
                        size={20}
                        color={metadata.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.platformButtonText,
                        isSelected && styles.platformButtonTextSelected,
                      ]}
                    >
                      {metadata.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {existingLink && (
              <Text style={styles.helperText}>
                Platform cannot be changed. Delete and recreate to change platform.
              </Text>
            )}

            {/* URL Input */}
            {selectedPlatform && (
              <>
                <Text style={styles.sectionTitle}>URL</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.length > 0 && styles.inputError,
                  ]}
                  placeholder={PLATFORM_METADATA[selectedPlatform].example}
                  placeholderTextColor="#9CA3AF"
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                {errors.length > 0 && (
                  <View style={styles.errorContainer}>
                    {errors.map((error, index) => (
                      <View key={index} style={styles.errorRow}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {errors.length === 0 && url.length > 0 && (
                  <View style={styles.successRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.successText}>URL looks good!</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (errors.length > 0 || !selectedPlatform || !url || isSubmitting) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                errors.length > 0 || !selectedPlatform || !url || isSubmitting
              }
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {existingLink ? 'Update' : 'Add Link'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4, // Negative margin for spacing
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '48%',
    margin: 4, // Spacing between buttons
  },
  platformButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366f1',
  },
  platformButtonDisabled: {
    opacity: 0.5,
  },
  platformIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  platformButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  platformButtonTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorContainer: {
    marginTop: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 6,
    flex: 1,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
