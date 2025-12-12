import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { profileService } from '../services/ProfileService';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ExperienceEntry {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  description?: string;
  start_date?: string; // YYYY-MM format
  end_date?: string;   // YYYY-MM format
  is_current: boolean;
}

export default function ExperienceManagementScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    loadExperiences();
  }, []);

  const loadExperiences = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const result = await profileService.getExperience(session);
      
      if (result.success && result.experience) {
        setExperiences(result.experience);
      } else {
        setExperiences([]);
      }
    } catch (error) {
      console.error('❌ Error loading experience:', error);
      Alert.alert('Error', 'Failed to load experience entries');
      setExperiences([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExperiences();
  };

  const handleAddNew = () => {
    setEditingExperience(null);
    setFormData({
      title: '',
      company: '',
      description: '',
      start_date: '',
      end_date: '',
      is_current: false,
    });
    setStartDate(new Date());
    setEndDate(new Date());
    setShowForm(true);
  };

  const handleEdit = (experience: ExperienceEntry) => {
    setEditingExperience(experience);
    setFormData({
      title: experience.title,
      company: experience.company || '',
      description: experience.description || '',
      start_date: experience.start_date || '',
      end_date: experience.end_date || '',
      is_current: experience.is_current,
    });
    
    // Parse dates if they exist
    if (experience.start_date) {
      const [year, month] = experience.start_date.split('-');
      setStartDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    }
    if (experience.end_date) {
      const [year, month] = experience.end_date.split('-');
      setEndDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    }
    
    setShowForm(true);
  };

  const handleDelete = (experience: ExperienceEntry) => {
    Alert.alert(
      'Delete Experience',
      `Are you sure you want to delete "${experience.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              const result = await profileService.deleteExperience(experience.id, session);
              if (result.success) {
                Alert.alert('Success', 'Experience deleted successfully');
                loadExperiences();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete experience');
              }
            } catch (error) {
              console.error('❌ Error deleting experience:', error);
              Alert.alert('Error', 'Failed to delete experience');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }

    if (!session) return;

    try {
      setSaving(true);

      // Format dates as YYYY-MM
      const formattedStartDate = formData.is_current && !formData.start_date
        ? undefined
        : `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      
      const formattedEndDate = formData.is_current
        ? undefined
        : formData.end_date
        ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
        : undefined;

      const experienceData = {
        title: formData.title.trim(),
        company: formData.company.trim() || undefined,
        description: formData.description.trim() || undefined,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        is_current: formData.is_current,
      };

      let result;
      if (editingExperience) {
        // For editing, we need to delete and recreate (API doesn't support PUT)
        // Or we can just use POST which should handle updates
        result = await profileService.addExperience(experienceData, session);
      } else {
        result = await profileService.addExperience(experienceData, session);
      }

      if (result.success) {
        Alert.alert('Success', editingExperience ? 'Experience updated successfully' : 'Experience added successfully');
        setShowForm(false);
        loadExperiences();
      } else {
        Alert.alert('Error', result.error || 'Failed to save experience');
      }
    } catch (error) {
      console.error('❌ Error saving experience:', error);
      Alert.alert('Error', 'Failed to save experience');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Present';
    const [year, month] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const renderExperience = ({ item }: { item: ExperienceEntry }) => (
    <View style={[styles.experienceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.experienceHeader}>
        <View style={styles.experienceInfo}>
          <Text style={[styles.experienceTitle, { color: theme.colors.text }]}>{item.title}</Text>
          {item.company && (
            <Text style={[styles.experienceCompany, { color: theme.colors.textSecondary }]}>{item.company}</Text>
          )}
          <Text style={[styles.experienceDate, { color: theme.colors.textSecondary }]}>
            {formatDate(item.start_date)} - {item.is_current ? 'Present' : formatDate(item.end_date)}
          </Text>
        </View>
        <View style={styles.experienceActions}>
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
          >
            <Ionicons name="pencil" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
          >
            <Ionicons name="trash" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      {item.description && (
        <Text style={[styles.experienceDescription, { color: theme.colors.textSecondary }]}>
          {item.description}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Experience</Text>
        <TouchableOpacity
          onPress={handleAddNew}
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : experiences.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="briefcase-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No experience entries yet
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
            Add your work experience to showcase your professional background
          </Text>
          <TouchableOpacity
            onPress={handleAddNew}
            style={[styles.addFirstButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.addFirstButtonText}>Add Experience</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={experiences}
          renderItem={renderExperience}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        />
      )}

      {/* Add/Edit Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingExperience ? 'Edit Experience' : 'Add Experience'}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="e.g., Music Producer"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Company</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="e.g., SoundBridge Studios"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.company}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, company: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                    {formData.start_date || formatDate(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false);
                      if (selectedDate) {
                        setStartDate(selectedDate);
                        setFormData(prev => ({
                          ...prev,
                          start_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`,
                        }));
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Currently work here</Text>
                  <Switch
                    value={formData.is_current}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, is_current: value, end_date: value ? '' : prev.end_date }));
                    }}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                    thumbColor={formData.is_current ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
              </View>

              {!formData.is_current && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                      {formData.end_date || formatDate(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowEndDatePicker(false);
                        }
                        if (selectedDate) {
                          setEndDate(selectedDate);
                          setFormData(prev => ({
                            ...prev,
                            end_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`,
                          }));
                        }
                        if (Platform.OS === 'ios') {
                          setShowEndDatePicker(false);
                        }
                      }}
                    />
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Describe your role and achievements..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  experienceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  experienceInfo: {
    flex: 1,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  experienceCompany: {
    fontSize: 14,
    marginBottom: 4,
  },
  experienceDate: {
    fontSize: 12,
  },
  experienceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  experienceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

