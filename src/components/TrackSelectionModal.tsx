import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TrackSelection } from '../services/SubscriptionService';

interface TrackSelectionModalProps {
  visible: boolean;
  tracks: TrackSelection[];
  onSelect: (selectedTrackIds: string[]) => void;
  onCancel: () => void;
}

export default function TrackSelectionModal({
  visible,
  tracks,
  onSelect,
  onCancel,
}: TrackSelectionModalProps) {
  const { theme } = useTheme();
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleTrack = (trackId: string) => {
    if (selectedTracks.includes(trackId)) {
      setSelectedTracks(selectedTracks.filter(id => id !== trackId));
    } else {
      if (selectedTracks.length < 3) {
        setSelectedTracks([...selectedTracks, trackId]);
      } else {
        Alert.alert('Maximum Reached', 'You can only select 3 tracks to keep public.');
      }
    }
  };

  const handleConfirm = () => {
    if (selectedTracks.length !== 3) {
      Alert.alert('Selection Required', 'Please select exactly 3 tracks to keep public.');
      return;
    }
    setIsProcessing(true);
    onSelect(selectedTracks);
  };

  const handleCancel = () => {
    setSelectedTracks([]);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleCancel} disabled={isProcessing}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Select Tracks to Keep Public
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>
              Choose 3 Tracks to Keep Public
            </Text>
            <Text style={[styles.instructionsText, { color: theme.colors.textSecondary }]}>
              Your account will be downgraded to Free tier, which includes 3 track uploads. 
              Select which 3 tracks you'd like to keep visible. The remaining tracks will be set to private (not deleted).
            </Text>
          </View>
        </View>

        {/* Selection Counter */}
        <View style={[styles.counter, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.counterText, { color: theme.colors.text }]}>
            {selectedTracks.length} of 3 selected
          </Text>
        </View>

        {/* Tracks List */}
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedTracks.includes(item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.trackItem,
                  { 
                    backgroundColor: theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleToggleTrack(item.id)}
                disabled={isProcessing}
              >
                <View style={styles.trackContent}>
                  {item.cover_art_url ? (
                    <Image
                      source={{ uri: item.cover_art_url }}
                      style={styles.trackImage}
                    />
                  ) : (
                    <View style={[styles.trackImagePlaceholder, { backgroundColor: theme.colors.surface }]}>
                      <Ionicons name="musical-notes" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.trackInfo}>
                    <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.trackDate, { color: theme.colors.textSecondary }]}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No tracks available
              </Text>
            </View>
          }
        />

        {/* Footer Actions */}
        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={handleCancel}
            disabled={isProcessing}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { 
                backgroundColor: selectedTracks.length === 3 ? theme.colors.primary : theme.colors.border,
                opacity: selectedTracks.length === 3 ? 1 : 0.5,
              },
            ]}
            onPress={handleConfirm}
            disabled={selectedTracks.length !== 3 || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm Selection ({selectedTracks.length}/3)
              </Text>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  instructions: {
    flexDirection: 'row',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  counter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  trackImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackDate: {
    fontSize: 12,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
