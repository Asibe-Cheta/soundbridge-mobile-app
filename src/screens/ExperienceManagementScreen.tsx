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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { profileService } from '../services/ProfileService';
import { SystemTypography as Typography } from '../constants/Typography';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const START_YEAR = 1960;
const END_YEAR = new Date().getFullYear() + 10; // allow a few future years for end dates
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

interface MonthYearPickerProps {
  month: number; // 1-12
  year: number;
  maxYear?: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  textColor: string;
  backgroundColor: string;
}

function MonthYearPicker({ month, year, maxYear, onMonthChange, onYearChange, textColor, backgroundColor }: MonthYearPickerProps) {
  const years = maxYear ? YEARS.filter(y => y <= maxYear) : YEARS;
  return (
    <View style={{ flexDirection: 'row', height: 180 }}>
      <Picker
        style={{ flex: 1, color: textColor }}
        selectedValue={month}
        onValueChange={(val) => onMonthChange(Number(val))}
        itemStyle={{ color: textColor, fontSize: 16 }}
      >
        {MONTH_FULL.map((name, i) => (
          <Picker.Item key={name} label={name} value={i + 1} color={textColor} />
        ))}
      </Picker>
      <Picker
        style={{ flex: 1, color: textColor }}
        selectedValue={year}
        onValueChange={(val) => onYearChange(Number(val))}
        itemStyle={{ color: textColor, fontSize: 16 }}
      >
        {years.map((y) => (
          <Picker.Item key={y} label={String(y)} value={y} color={textColor} />
        ))}
      </Picker>
    </View>
  );
}

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

  // Committed month/year values
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  const [startMonth, setStartMonth] = useState(nowMonth);
  const [startYear, setStartYear] = useState(nowYear);
  const [endMonth, setEndMonth] = useState(nowMonth);
  const [endYear, setEndYear] = useState(nowYear);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  // Temp values while picker is open — only committed on confirm tap
  const [tempStartMonth, setTempStartMonth] = useState(nowMonth);
  const [tempStartYear, setTempStartYear] = useState(nowYear);
  const [tempEndMonth, setTempEndMonth] = useState(nowMonth);
  const [tempEndYear, setTempEndYear] = useState(nowYear);

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
    setStartMonth(nowMonth); setStartYear(nowYear);
    setEndMonth(nowMonth); setEndYear(nowYear);
    setTempStartMonth(nowMonth); setTempStartYear(nowYear);
    setTempEndMonth(nowMonth); setTempEndYear(nowYear);
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

    if (experience.start_date) {
      const [y, m] = experience.start_date.split('-').map(Number);
      setStartMonth(m); setStartYear(y);
      setTempStartMonth(m); setTempStartYear(y);
    } else {
      setStartMonth(nowMonth); setStartYear(nowYear);
      setTempStartMonth(nowMonth); setTempStartYear(nowYear);
    }
    if (experience.end_date) {
      const [y, m] = experience.end_date.split('-').map(Number);
      setEndMonth(m); setEndYear(y);
      setTempEndMonth(m); setTempEndYear(y);
    } else {
      setEndMonth(nowMonth); setEndYear(nowYear);
      setTempEndMonth(nowMonth); setTempEndYear(nowYear);
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

      // API stores as DATE (YYYY-MM-DD) — always send first of month
      const toApiDate = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`;

      const formattedStartDate = formData.start_date
        ? (formData.start_date.length === 7 ? formData.start_date + '-01' : formData.start_date)
        : toApiDate(startYear, startMonth);

      const formattedEndDate = formData.is_current
        ? undefined
        : formData.end_date
        ? (formData.end_date.length === 7 ? formData.end_date + '-01' : formData.end_date)
        : toApiDate(endYear, endMonth);

      const experienceData = {
        title: formData.title.trim(),
        role: formData.title.trim(), // backend table uses 'role' as NOT NULL column
        company: formData.company.trim() || undefined,
        description: formData.description.trim() || undefined,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        is_current: formData.is_current,
      };

      const result = await profileService.addExperience(experienceData, session);

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
    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parts[1];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const confirmStartDate = () => {
    setStartMonth(tempStartMonth);
    setStartYear(tempStartYear);
    setFormData(prev => ({
      ...prev,
      start_date: `${tempStartYear}-${String(tempStartMonth).padStart(2, '0')}`,
    }));
    setShowStartDatePicker(false);
  };

  const confirmEndDate = () => {
    setEndMonth(tempEndMonth);
    setEndYear(tempEndYear);
    setFormData(prev => ({
      ...prev,
      end_date: `${tempEndYear}-${String(tempEndMonth).padStart(2, '0')}`,
    }));
    setShowEndDatePicker(false);
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingExperience ? 'Edit Experience' : 'Add Experience'}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

              {/* Start Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Start Date</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => {
                    setTempStartMonth(startMonth);
                    setTempStartYear(startYear);
                    setShowStartDatePicker(true);
                  }}
                >
                  <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                    {formData.start_date ? formatDate(formData.start_date) : `${MONTHS[startMonth - 1]} ${startYear}`}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {showStartDatePicker && (
                  <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={[styles.pickerToolbar, { borderBottomColor: theme.colors.border }]}>
                      <TouchableOpacity onPress={() => setShowStartDatePicker(false)} style={styles.pickerToolbarBtn}>
                        <Text style={[styles.pickerCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={[styles.pickerToolbarTitle, { color: theme.colors.text }]}>Start Date</Text>
                      <TouchableOpacity onPress={confirmStartDate} style={styles.pickerToolbarBtn}>
                        <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <MonthYearPicker
                      month={tempStartMonth}
                      year={tempStartYear}
                      maxYear={nowYear}
                      onMonthChange={setTempStartMonth}
                      onYearChange={setTempStartYear}
                      textColor={theme.colors.text}
                      backgroundColor={theme.colors.card}
                    />
                  </View>
                )}
              </View>

              {/* Currently work here toggle */}
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

              {/* End Date */}
              {!formData.is_current && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => {
                      setTempEndMonth(endMonth);
                      setTempEndYear(endYear);
                      setShowEndDatePicker(true);
                    }}
                  >
                    <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                      {formData.end_date ? formatDate(formData.end_date) : `${MONTHS[endMonth - 1]} ${endYear}`}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  {showEndDatePicker && (
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      <View style={[styles.pickerToolbar, { borderBottomColor: theme.colors.border }]}>
                        <TouchableOpacity onPress={() => setShowEndDatePicker(false)} style={styles.pickerToolbarBtn}>
                          <Text style={[styles.pickerCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.pickerToolbarTitle, { color: theme.colors.text }]}>End Date</Text>
                        <TouchableOpacity onPress={confirmEndDate} style={styles.pickerToolbarBtn}>
                          <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <MonthYearPicker
                        month={tempEndMonth}
                        year={tempEndYear}
                        onMonthChange={setTempEndMonth}
                        onYearChange={setTempEndYear}
                        textColor={theme.colors.text}
                        backgroundColor={theme.colors.card}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Description */}
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

              {/* Bottom padding so description isn't hidden behind footer */}
              <View style={{ height: 16 }} />
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
        </KeyboardAvoidingView>
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
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
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
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
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
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  experienceCompany: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  experienceDate: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
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
    ...Typography.label,
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
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickerToolbarBtn: {
    minWidth: 60,
    alignItems: 'center',
  },
  pickerToolbarTitle: {
    ...Typography.label,
    fontSize: 15,
    fontWeight: '600',
  },
  pickerCancelText: {
    ...Typography.label,
    fontSize: 15,
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
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
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
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
});
