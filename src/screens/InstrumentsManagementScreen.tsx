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

const COMMON_INSTRUMENTS = [
  'Piano', 'Guitar', 'Bass', 'Drums', 'Violin', 'Cello', 'Viola', 'Double Bass',
  'Saxophone', 'Trumpet', 'Trombone', 'Flute', 'Clarinet', 'Oboe', 'Bassoon',
  'Harp', 'Organ', 'Synthesizer', 'Keyboard', 'Ukulele', 'Banjo', 'Mandolin',
  'Harmonica', 'Accordion', 'Xylophone', 'Marimba', 'Vibraphone', 'Percussion',
  'Vocals', 'Beatboxing', 'DJ Equipment', 'Turntables',
];

export default function InstrumentsManagementScreen() {
  const navigation = useNavigation();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const [instruments, setInstruments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInstrument, setNewInstrument] = useState('');
  const [adding, setAdding] = useState(false);
  const [filteredCommonInstruments, setFilteredCommonInstruments] = useState<string[]>([]);

  useEffect(() => {
    loadInstruments();
  }, []);

  useEffect(() => {
    if (newInstrument.trim()) {
      const filtered = COMMON_INSTRUMENTS.filter(
        instrument => instrument.toLowerCase().includes(newInstrument.toLowerCase()) && !instruments.includes(instrument)
      );
      setFilteredCommonInstruments(filtered.slice(0, 5));
    } else {
      setFilteredCommonInstruments(COMMON_INSTRUMENTS.filter(instrument => !instruments.includes(instrument)).slice(0, 5));
    }
  }, [newInstrument, instruments]);

  const loadInstruments = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const result = await profileService.getInstruments(session);
      
      if (result.success && result.instruments) {
        setInstruments(result.instruments);
      } else {
        setInstruments([]);
      }
    } catch (error) {
      console.error('❌ Error loading instruments:', error);
      Alert.alert('Error', 'Failed to load instruments');
      setInstruments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInstruments();
  };

  const handleAddInstrument = async (instrumentToAdd?: string) => {
    const instrument = (instrumentToAdd || newInstrument).trim();
    
    if (!instrument) {
      Alert.alert('Validation Error', 'Please enter an instrument');
      return;
    }

    if (instruments.includes(instrument)) {
      Alert.alert('Duplicate', 'This instrument is already added');
      return;
    }

    if (instruments.length >= 20) {
      Alert.alert('Limit Reached', 'You can add a maximum of 20 instruments');
      return;
    }

    if (!session) return;

    try {
      setAdding(true);
      const result = await profileService.addInstrument(instrument, session);
      
      if (result.success) {
        setNewInstrument('');
        setShowAddModal(false);
        loadInstruments();
      } else {
        Alert.alert('Error', result.error || 'Failed to add instrument');
      }
    } catch (error) {
      console.error('❌ Error adding instrument:', error);
      Alert.alert('Error', 'Failed to add instrument');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteInstrument = (instrument: string) => {
    Alert.alert(
      'Remove Instrument',
      `Are you sure you want to remove "${instrument}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              const result = await profileService.deleteInstrument(instrument, session);
              if (result.success) {
                loadInstruments();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove instrument');
              }
            } catch (error) {
              console.error('❌ Error deleting instrument:', error);
              Alert.alert('Error', 'Failed to remove instrument');
            }
          },
        },
      ]
    );
  };

  const renderInstrument = ({ item }: { item: string }) => (
    <View style={[styles.instrumentChip, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
      <Text style={[styles.instrumentText, { color: theme.colors.primary }]}>{item}</Text>
      <TouchableOpacity
        onPress={() => handleDeleteInstrument(item)}
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Instruments</Text>
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
            {instruments.length}/20 instruments added
          </Text>
          {instruments.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No instruments added yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textMuted }]}>
                Add the instruments you play to showcase your musical abilities
              </Text>
            </View>
          ) : (
            <FlatList
              data={instruments}
              renderItem={renderInstrument}
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

      {/* Add Instrument Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Instrument</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Instrument Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="e.g., Piano"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newInstrument}
                  onChangeText={setNewInstrument}
                  autoCapitalize="words"
                />
              </View>

              {filteredCommonInstruments.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Suggestions</Text>
                  <View style={styles.suggestionsContainer}>
                    {filteredCommonInstruments.map((instrument) => (
                      <TouchableOpacity
                        key={instrument}
                        style={[styles.suggestionChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                        onPress={() => handleAddInstrument(instrument)}
                      >
                        <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{instrument}</Text>
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
                    setNewInstrument('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButtonModal, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleAddInstrument()}
                  disabled={adding || !newInstrument.trim()}
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
  instrumentChip: {
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
  instrumentText: {
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

