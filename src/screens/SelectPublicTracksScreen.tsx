import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { formatBytes } from '../services/StorageQuotaService';
import { useAuth } from '../contexts/AuthContext';

interface Track {
  id: string;
  title: string;
  artwork_url?: string;
  file_size: number;
  created_at: string;
  play_count: number;
}

export const SelectPublicTracksScreen: React.FC = () => {
  const { session } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const FREE_TIER_LIMIT = 30 * 1024 * 1024; // 30MB

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('id, title, artwork_url, file_size, created_at, play_count')
        .eq('creator_id', session.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTracks(data || []);

      // Auto-select most recent tracks that fit in 30MB
      const autoSelect = autoSelectTracks(data || []);
      setSelectedTracks(new Set(autoSelect));
    } catch (error) {
      console.error('Error loading tracks:', error);
      Alert.alert('Error', 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select tracks that fit in 30MB (prioritize recent + most played)
  const autoSelectTracks = (allTracks: Track[]): string[] => {
    // Sort by play count (descending) then recency
    const sorted = [...allTracks].sort((a, b) => {
      if (b.play_count !== a.play_count) {
        return b.play_count - a.play_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const selected: string[] = [];
    let totalSize = 0;

    for (const track of sorted) {
      if (totalSize + track.file_size <= FREE_TIER_LIMIT) {
        selected.push(track.id);
        totalSize += track.file_size;
      }
    }

    return selected;
  };

  const toggleTrack = (trackId: string, fileSize: number) => {
    const newSelected = new Set(selectedTracks);

    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      // Check if adding this track would exceed limit
      const currentSize = getTotalSelectedSize();
      if (currentSize + fileSize > FREE_TIER_LIMIT) {
        Alert.alert(
          'Storage Limit Exceeded',
          `Adding this track would exceed the 30MB limit. Please deselect other tracks first.`,
          [{ text: 'OK' }]
        );
        return;
      }
      newSelected.add(trackId);
    }

    setSelectedTracks(newSelected);
  };

  const getTotalSelectedSize = (): number => {
    return tracks
      .filter((t) => selectedTracks.has(t.id))
      .reduce((sum, t) => sum + t.file_size, 0);
  };

  const handleSaveSelection = async () => {
    if (selectedTracks.size === 0) {
      Alert.alert(
        'No Tracks Selected',
        'Please select at least one track to keep public.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);

    try {
      // Mark all tracks as private first
      const { error: makePrivateError } = await supabase
        .from('posts')
        .update({ is_private: true })
        .eq('user_id', session?.user?.id);

      if (makePrivateError) throw makePrivateError;

      // Mark selected tracks as public
      const selectedIds = Array.from(selectedTracks);
      const { error: makePublicError } = await supabase
        .from('posts')
        .update({ is_private: false })
        .in('id', selectedIds);

      if (makePublicError) throw makePublicError;

      // Clear grace period fields
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          grace_period_ends: null,
          downgraded_at: null,
          storage_at_downgrade: null,
        })
        .eq('id', session?.user?.id);

      if (updateProfileError) throw updateProfileError;

      Alert.alert(
        'Selection Saved',
        `${selectedTracks.size} tracks will remain public. The rest are now private (accessible only to you).`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back or to main screen
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving selection:', error);
      Alert.alert('Error', 'Failed to save track selection');
    } finally {
      setSaving(false);
    }
  };

  const totalSelectedSize = getTotalSelectedSize();
  const percentUsed = (totalSelectedSize / FREE_TIER_LIMIT) * 100;
  const remainingSpace = FREE_TIER_LIMIT - totalSelectedSize;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading your tracks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Public Tracks</Text>
        <Text style={styles.subtitle}>
          Select up to 30MB worth of tracks to keep public
        </Text>
      </View>

      {/* Storage Meter */}
      <View style={styles.storageMeter}>
        <View style={styles.storageHeader}>
          <Text style={styles.storageLabel}>Selected Storage</Text>
          <Text style={styles.storageValue}>
            {formatBytes(totalSelectedSize)} / 30MB
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, percentUsed)}%`,
                backgroundColor: percentUsed > 100 ? '#FF6B6B' : '#4CAF50',
              },
            ]}
          />
        </View>

        <Text style={styles.remainingText}>
          {remainingSpace > 0
            ? `${formatBytes(remainingSpace)} remaining`
            : `${formatBytes(Math.abs(remainingSpace))} over limit`}
        </Text>
      </View>

      {/* Track List */}
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isSelected = selectedTracks.has(item.id);

          return (
            <TouchableOpacity
              style={[styles.trackItem, isSelected && styles.trackItemSelected]}
              onPress={() => toggleTrack(item.id, item.file_size)}
              activeOpacity={0.7}
            >
              <View style={styles.trackContent}>
                {item.artwork_url ? (
                  <Image
                    source={{ uri: item.artwork_url }}
                    style={styles.artwork}
                  />
                ) : (
                  <View style={[styles.artwork, styles.artworkPlaceholder]}>
                    <Ionicons name="musical-notes" size={24} color="#666" />
                  </View>
                )}

                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.trackMeta}>
                    <Text style={styles.metaText}>
                      {formatBytes(item.file_size)}
                    </Text>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Text style={styles.metaText}>
                      {item.play_count} {item.play_count === 1 ? 'play' : 'plays'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No tracks found</Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.autoSelectButton}
          onPress={() => {
            const autoSelect = autoSelectTracks(tracks);
            setSelectedTracks(new Set(autoSelect));
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={20} color="#2196F3" />
          <Text style={styles.autoSelectText}>Auto-Select Best Tracks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (selectedTracks.size === 0 || totalSelectedSize > FREE_TIER_LIMIT) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSaveSelection}
          disabled={selectedTracks.size === 0 || totalSelectedSize > FREE_TIER_LIMIT || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save Selection ({selectedTracks.size} tracks)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  storageMeter: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageLabel: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  listContainer: {
    padding: 16,
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  trackItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  artworkPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },
  metaSeparator: {
    marginHorizontal: 6,
    color: '#666',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  autoSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  autoSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#2a2a2a',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
