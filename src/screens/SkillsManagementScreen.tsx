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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { profileService } from '../services/ProfileService';

const COMMON_SKILLS = [
  'Music Production', 'Sound Engineering', 'Mixing', 'Mastering', 'Audio Editing',
  'Songwriting', 'Composition', 'Arrangement', 'Vocal Production', 'Beat Making',
  'Live Sound', 'Recording', 'Post-Production', 'Foley', 'Sound Design',
  'Podcast Production', 'Audio Post', 'Music Theory', 'Instrumentation', 'Orchestration',
];

export default function SkillsManagementScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [adding, setAdding] = useState(false);
  const [filteredCommonSkills, setFilteredCommonSkills] = useState<string[]>([]);

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    if (newSkill.trim()) {
      const filtered = COMMON_SKILLS.filter(
        skill => skill.toLowerCase().includes(newSkill.toLowerCase()) && !skills.includes(skill)
      );
      setFilteredCommonSkills(filtered.slice(0, 5));
    } else {
      setFilteredCommonSkills(COMMON_SKILLS.filter(skill => !skills.includes(skill)).slice(0, 5));
    }
  }, [newSkill, skills]);

  const loadSkills = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const result = await profileService.getSkills(session);
      
      if (result.success && result.skills) {
        setSkills(result.skills);
      } else {
        setSkills([]);
      }
    } catch (error) {
      console.error('❌ Error loading skills:', error);
      Alert.alert('Error', 'Failed to load skills');
      setSkills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSkills();
  };

  const handleAddSkill = async (skillToAdd?: string) => {
    const skill = (skillToAdd || newSkill).trim();
    
    if (!skill) {
      Alert.alert('Validation Error', 'Please enter a skill');
      return;
    }

    if (skills.includes(skill)) {
      Alert.alert('Duplicate', 'This skill is already added');
      return;
    }

    if (skills.length >= 20) {
      Alert.alert('Limit Reached', 'You can add a maximum of 20 skills');
      return;
    }

    if (!session) return;

    try {
      setAdding(true);
      const result = await profileService.addSkill(skill, session);
      
      if (result.success) {
        setNewSkill('');
        setShowAddModal(false);
        loadSkills();
      } else {
        Alert.alert('Error', result.error || 'Failed to add skill');
      }
    } catch (error) {
      console.error('❌ Error adding skill:', error);
      Alert.alert('Error', 'Failed to add skill');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSkill = (skill: string) => {
    Alert.alert(
      'Remove Skill',
      `Are you sure you want to remove "${skill}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              const result = await profileService.deleteSkill(skill, session);
              if (result.success) {
                loadSkills();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove skill');
              }
            } catch (error) {
              console.error('❌ Error deleting skill:', error);
              Alert.alert('Error', 'Failed to remove skill');
            }
          },
        },
      ]
    );
  };

  const renderSkill = ({ item }: { item: string }) => (
    <View style={[styles.skillChip, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
      <Text style={[styles.skillText, { color: theme.colors.primary }]}>{item}</Text>
      <TouchableOpacity
        onPress={() => handleDeleteSkill(item)}
        style={styles.deleteButton}
      >
        <Ionicons name="close-circle" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Skills</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
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
      ) : (
        <View style={styles.content}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {skills.length}/20 skills added
          </Text>
          {skills.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="star-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No skills added yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
                Add your skills to showcase your expertise
              </Text>
            </View>
          ) : (
            <FlatList
              data={skills}
              renderItem={renderSkill}
              keyExtractor={(item) => item}
              numColumns={2}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
              }
            />
          )}
        </View>
      )}

      {/* Add Skill Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Skill</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Skill Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="e.g., Music Production"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newSkill}
                  onChangeText={setNewSkill}
                  autoCapitalize="words"
                />
              </View>

              {filteredCommonSkills.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Suggestions</Text>
                  <View style={styles.suggestionsContainer}>
                    {filteredCommonSkills.map((skill) => (
                      <TouchableOpacity
                        key={skill}
                        style={[styles.suggestionChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                        onPress={() => handleAddSkill(skill)}
                      >
                        <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{skill}</Text>
                        <Ionicons name="add" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    setShowAddModal(false);
                    setNewSkill('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButtonModal, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleAddSkill()}
                  disabled={adding || !newSkill.trim()}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.addButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 16,
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
  },
  listContent: {
    gap: 12,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 12,
    flex: 1,
    minWidth: '45%',
  },
  skillText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  suggestionText: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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
  addButtonModal: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

