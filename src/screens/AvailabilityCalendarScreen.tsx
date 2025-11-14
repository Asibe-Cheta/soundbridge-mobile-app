import BackButton from '../components/BackButton';
// src/screens/AvailabilityCalendarScreen.tsx
// Screen for creators to manage their availability calendar

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import { collaborationUtils } from '../utils/collaborationUtils';
import type { CreatorAvailability, CreateAvailabilityRequest } from '../types/collaboration';

export default function AvailabilityCalendarScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    availability,
    loadingAvailability,
    createAvailabilitySlot,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    refreshAvailability,
    error,
    clearError
  } = useCollaboration();

  // State for create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<CreatorAvailability | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [maxRequests, setMaxRequests] = useState('3');
  const [notes, setNotes] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Load availability on mount
  useEffect(() => {
    refreshAvailability();
  }, []);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, []);

  // Set default end date 2 hours after start date
  useEffect(() => {
    const newEndDate = new Date(startDate);
    newEndDate.setHours(newEndDate.getHours() + 2);
    setEndDate(newEndDate);
  }, [startDate]);

  const handleCreateSlot = () => {
    setEditingSlot(null);
    setStartDate(new Date());
    setEndDate(new Date());
    setMaxRequests('3');
    setNotes('');
    setShowModal(true);
  };

  const handleEditSlot = (slot: CreatorAvailability) => {
    setEditingSlot(slot);
    setStartDate(new Date(slot.start_date));
    setEndDate(new Date(slot.end_date));
    setMaxRequests(slot.max_requests_per_slot.toString());
    setNotes(slot.notes || '');
    setShowModal(true);
  };

  const handleDeleteSlot = (slot: CreatorAvailability) => {
    Alert.alert(
      'Delete Availability',
      'Are you sure you want to delete this availability slot? Any pending requests will be automatically expired.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAvailabilitySlot(slot.id);
            if (success) {
              Alert.alert('Success', 'Availability slot deleted successfully');
            }
          }
        }
      ]
    );
  };

  const handleSaveSlot = async () => {
    // Validation
    const validation = collaborationUtils.validateTimeSlot(startDate, endDate);
    if (!validation.isValid) {
      Alert.alert('Invalid Time Slot', validation.errors.join('\n'));
      return;
    }

    const maxReq = parseInt(maxRequests);
    if (isNaN(maxReq) || maxReq < 1 || maxReq > 10) {
      Alert.alert('Invalid Input', 'Maximum requests must be between 1 and 10');
      return;
    }

    setModalLoading(true);
    try {
      const slotData: CreateAvailabilityRequest = {
        startDate,
        endDate,
        maxRequests: maxReq,
        notes: notes.trim() || undefined
      };

      let success = false;
      if (editingSlot) {
        // Update existing slot
        success = await updateAvailabilitySlot(editingSlot.id, slotData);
      } else {
        // Create new slot
        success = await createAvailabilitySlot(slotData);
      }

      if (success) {
        setShowModal(false);
        Alert.alert('Success', `Availability slot ${editingSlot ? 'updated' : 'created'} successfully`);
      }
    } catch (error) {
      console.error('Error saving slot:', error);
      Alert.alert('Error', 'Failed to save availability slot');
    } finally {
      setModalLoading(false);
    }
  };

  const renderAvailabilitySlot = (slot: CreatorAvailability) => {
    const isExpired = collaborationUtils.isDateInPast(slot.end_date);
    const duration = collaborationUtils.getAvailabilityDuration(slot);
    
    return (
      <View
        key={slot.id}
        style={[
          styles.slotCard,
          { 
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            opacity: isExpired ? 0.6 : 1
          }
        ]}
      >
        <View style={styles.slotHeader}>
          <View style={styles.slotInfo}>
            <Text style={[styles.slotDate, { color: theme.colors.text }]}>
              {collaborationUtils.formatDateRange(slot.start_date, slot.end_date)}
            </Text>
            <Text style={[styles.slotDuration, { color: theme.colors.textSecondary }]}>
              Duration: {duration}
            </Text>
          </View>
          <View style={styles.slotActions}>
            {!isExpired && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
                  onPress={() => handleEditSlot(slot)}
                >
                  <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                  onPress={() => handleDeleteSlot(slot)}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.slotDetails}>
          <View style={styles.slotMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                Max {slot.max_requests_per_slot} request{slot.max_requests_per_slot > 1 ? 's' : ''}
              </Text>
            </View>
            {slot.notes && (
              <View style={styles.metaItem}>
                <Ionicons name="document-text" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {slot.notes}
                </Text>
              </View>
            )}
          </View>

          {isExpired && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text style={[styles.modalCancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editingSlot ? 'Edit Availability' : 'Add Availability'}
          </Text>
          <TouchableOpacity onPress={handleSaveSlot} disabled={modalLoading}>
            {modalLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.modalSave, { color: theme.colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Start Date/Time */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>Start Date & Time</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {collaborationUtils.formatDate(startDate.toISOString())} at {collaborationUtils.formatTime(startDate.toISOString())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* End Date/Time */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>End Date & Time</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                {collaborationUtils.formatDate(endDate.toISOString())} at {collaborationUtils.formatTime(endDate.toISOString())}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Max Requests */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>Maximum Requests</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={maxRequests}
              onChangeText={setMaxRequests}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <Text style={[styles.formHint, { color: theme.colors.textSecondary }]}>
              How many collaboration requests can be pending for this time slot
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Add any details about this availability slot..."
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </ScrollView>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Availability</Text>
          <TouchableOpacity onPress={handleCreateSlot}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#EF444420' }]}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loadingAvailability}
            onRefresh={refreshAvailability}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Set your availability for collaboration requests. Other creators can request to collaborate during these times.
          </Text>
        </View>

        {/* Availability List */}
        {loadingAvailability && availability.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading availability...
            </Text>
          </View>
        ) : availability.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Availability Set</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Add your first availability slot to start receiving collaboration requests
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateSlot}
            >
              <Text style={styles.emptyButtonText}>Add Availability</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.availabilityList}>
            {collaborationUtils.sortAvailabilityByDate(availability).map(renderAvailabilitySlot)}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      {renderCreateModal()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  availabilityList: {
    gap: 12,
    paddingBottom: 24,
  },
  slotCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  slotDuration: {
    fontSize: 14,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDetails: {
    gap: 8,
  },
  slotMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
  },
  expiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6B728020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expiredText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
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
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 14,
    marginTop: 4,
  },
});
