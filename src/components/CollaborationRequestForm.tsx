// src/components/CollaborationRequestForm.tsx
// Modal form for sending collaboration requests

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { collaborationUtils } from '../utils/collaborationUtils';
import type { CreatorAvailability, CreateCollaborationRequest } from '../types/collaboration';

interface CollaborationRequestFormProps {
  visible: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  availabilitySlot?: CreatorAvailability;
}

export default function CollaborationRequestForm({
  visible,
  onClose,
  creatorId,
  creatorName,
  availabilitySlot
}: CollaborationRequestFormProps) {
  const { theme } = useTheme();
  const { sendCollaborationRequest } = useCollaboration();

  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState(new Date());
  const [proposedEndDate, setProposedEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
      if (availabilitySlot) {
        // Pre-fill with availability slot times
        setProposedStartDate(new Date(availabilitySlot.start_date));
        setProposedEndDate(new Date(availabilitySlot.end_date));
        setSubject(`Collaboration Request - ${collaborationUtils.formatDate(availabilitySlot.start_date)}`);
      } else {
        // Default to next hour
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        setProposedStartDate(nextHour);
        
        const endTime = new Date(nextHour);
        endTime.setHours(endTime.getHours() + 2);
        setProposedEndDate(endTime);
        
        setSubject(`Collaboration Request - ${collaborationUtils.formatDate(nextHour.toISOString())}`);
      }
    }
  }, [visible, availabilitySlot]);

  // Update end date when start date changes
  useEffect(() => {
    if (proposedStartDate) {
      const newEndDate = new Date(proposedStartDate);
      newEndDate.setHours(newEndDate.getHours() + 2);
      setProposedEndDate(newEndDate);
    }
  }, [proposedStartDate]);

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setProposedStartDate(new Date());
    setProposedEndDate(new Date());
    setShowStartPicker(false);
    setShowEndPicker(false);
    setLoading(false);
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate subject
    const subjectValidation = collaborationUtils.validateSubject(subject);
    if (!subjectValidation.isValid) {
      errors.push(...subjectValidation.errors);
    }

    // Validate message
    const messageValidation = collaborationUtils.validateCollaborationMessage(message);
    if (!messageValidation.isValid) {
      errors.push(...messageValidation.errors);
    }

    // Validate time slot
    const availabilityWindow = availabilitySlot ? {
      start: new Date(availabilitySlot.start_date),
      end: new Date(availabilitySlot.end_date)
    } : undefined;

    const timeValidation = collaborationUtils.validateTimeSlot(
      proposedStartDate,
      proposedEndDate,
      availabilityWindow,
      1 // Minimum 1 day notice
    );
    if (!timeValidation.isValid) {
      errors.push(...timeValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleSendRequest = async () => {
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Invalid Request', validation.errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const requestData: CreateCollaborationRequest = {
        creatorId,
        availabilityId: availabilitySlot?.id,
        subject: subject.trim(),
        message: message.trim(),
        proposedStartDate,
        proposedEndDate
      };

      const success = await sendCollaborationRequest(requestData);
      
      if (success) {
        Alert.alert(
          'Request Sent!',
          `Your collaboration request has been sent to ${creatorName}. They will receive a notification and can respond from their requests inbox.`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Error', 'Failed to send collaboration request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending collaboration request:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTimeSlotInfo = () => {
    if (!availabilitySlot) return null;

    return (
      <View style={[styles.timeSlotCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.timeSlotHeader}>
          <Ionicons name="time" size={16} color={theme.colors.primary} />
          <Text style={[styles.timeSlotTitle, { color: theme.colors.text }]}>Available Time Slot</Text>
        </View>
        <Text style={[styles.timeSlotText, { color: theme.colors.textSecondary }]}>
          {collaborationUtils.formatDateRange(availabilitySlot.start_date, availabilitySlot.end_date)}
        </Text>
        {availabilitySlot.notes && (
          <Text style={[styles.timeSlotNotes, { color: theme.colors.textSecondary }]}>
            "{availabilitySlot.notes}"
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={[styles.cancelButton, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Collaboration Request</Text>
          <TouchableOpacity onPress={handleSendRequest} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.sendButton, { color: theme.colors.primary }]}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Creator Info */}
          <View style={[styles.creatorCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="person" size={20} color={theme.colors.primary} />
            <Text style={[styles.creatorText, { color: theme.colors.text }]}>
              Requesting collaboration with <Text style={{ fontWeight: '600' }}>{creatorName}</Text>
            </Text>
          </View>

          {/* Time Slot Info */}
          {renderTimeSlotInfo()}

          {/* Subject */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Subject *</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border, 
                color: theme.colors.text 
              }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your collaboration idea"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={255}
            />
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
              {subject.length}/255
            </Text>
          </View>

          {/* Proposed Start Time */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Proposed Start Time *</Text>
            <TouchableOpacity
              style={[styles.dateButton, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border 
              }]}
              onPress={() => setShowStartPicker(true)}
              disabled={loading}
            >
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {collaborationUtils.formatDate(proposedStartDate.toISOString())} at {collaborationUtils.formatTime(proposedStartDate.toISOString())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Proposed End Time */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Proposed End Time *</Text>
            <TouchableOpacity
              style={[styles.dateButton, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border 
              }]}
              onPress={() => setShowEndPicker(true)}
              disabled={loading}
            >
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {collaborationUtils.formatDate(proposedEndDate.toISOString())} at {collaborationUtils.formatTime(proposedEndDate.toISOString())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Message *</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.colors.surface, 
                borderColor: theme.colors.border, 
                color: theme.colors.text 
              }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your collaboration idea, what you'd like to work on together, and any other relevant details..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
              {message.length}/1000
            </Text>
          </View>

          {/* Guidelines */}
          <View style={[styles.guidelinesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
              <Text style={[styles.guidelinesTitle, { color: theme.colors.text }]}>Request Guidelines</Text>
            </View>
            <View style={styles.guidelinesList}>
              <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                • Be specific about what you want to collaborate on
              </Text>
              <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                • Respect the creator's available time slots
              </Text>
              <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                • Provide at least 24 hours notice for requests
              </Text>
              <Text style={[styles.guidelineItem, { color: theme.colors.textSecondary }]}>
                • Be professional and courteous in your message
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={proposedStartDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) {
                setProposedStartDate(selectedDate);
              }
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={proposedEndDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) {
                setProposedEndDate(selectedDate);
              }
            }}
          />
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  sendButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  creatorText: {
    flex: 1,
    fontSize: 16,
  },
  timeSlotCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeSlotTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeSlotNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  guidelinesCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  guidelinesList: {
    gap: 8,
  },
  guidelineItem: {
    fontSize: 14,
    lineHeight: 20,
  },
});
