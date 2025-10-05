import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { dbHelpers } from '../lib/supabase';

interface PlaylistDetailsScreenProps {
  route: any;
  navigation: any;
}

interface PlaylistTrack {
  id: string;
  position: number;
  added_at: string;
  track: {
    id: string;
    title: string;
    description?: string;
    file_url?: string;
    cover_art_url?: string;
    duration?: number;
    genre?: string;
    play_count?: number;
    likes_count?: number;
    is_public: boolean;
    created_at: string;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
  };
}

interface PlaylistDetails {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  tracks_count?: number;
  total_duration?: number;
  followers_count?: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
  };
  tracks: PlaylistTrack[];
}

const PlaylistDetailsScreen: React.FC<PlaylistDetailsScreenProps> = ({ route, navigation }) => {
  const { playlistId } = route.params;
  const { theme } = useTheme();
  const { play, addToQueue } = useAudioPlayer();
  
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playlistId) {
      loadPlaylistDetails();
    } else {
      setError('Playlist ID not provided');
      setLoading(false);
    }
  }, [playlistId]);

  const loadPlaylistDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎵 Loading playlist details for:', playlistId);
      const { data, error } = await dbHelpers.getPlaylistDetails(playlistId);
      
      if (error) throw error;
      if (!data) throw new Error('Playlist not found');
      
      setPlaylist(data);
      console.log('✅ Playlist loaded:', data.name, 'with', data.tracks?.length || 0, 'tracks');
    } catch (err) {
      console.error('❌ Error loading playlist details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (track: PlaylistTrack['track']) => {
    try {
      console.log('🎵 Playing track from playlist:', track.title);
      await play(track);
      
      // Add other tracks from playlist to queue
      if (playlist?.tracks) {
        const otherTracks = playlist.tracks
          .filter(t => t.track.id !== track.id)
          .map(t => t.track);
        otherTracks.forEach(t => addToQueue(t));
      }
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Playback Error', 'Failed to play the track. Please try again.');
    }
  };

  const handlePlayAll = async () => {
    if (!playlist?.tracks || playlist.tracks.length === 0) {
      Alert.alert('No Tracks', 'This playlist is empty.');
      return;
    }

    try {
      const firstTrack = playlist.tracks[0].track;
      await play(firstTrack);
      
      // Add remaining tracks to queue
      const remainingTracks = playlist.tracks.slice(1).map(t => t.track);
      remainingTracks.forEach(track => addToQueue(track));
      
      Alert.alert('Playing Playlist', `Now playing "${playlist.name}"`);
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert('Playback Error', 'Failed to play the playlist. Please try again.');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds?: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderTrackItem = ({ item, index }: { item: PlaylistTrack; index: number }) => (
    <TouchableOpacity
      style={[styles.trackItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handlePlayTrack(item.track)}
    >
      <Text style={[styles.trackPosition, { color: theme.colors.textSecondary }]}>
        {index + 1}
      </Text>
      
      <View style={styles.trackCover}>
        {item.track.cover_art_url ? (
          <Image source={{ uri: item.track.cover_art_url }} style={styles.trackImage} />
        ) : (
          <View style={[styles.defaultTrackImage, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>
      
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {item.track.title}
        </Text>
        <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {item.track.creator.display_name || item.track.creator.username}
        </Text>
      </View>
      
      <View style={styles.trackActions}>
        <Text style={[styles.trackDuration, { color: theme.colors.textSecondary }]}>
          {formatDuration(item.track.duration)}
        </Text>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => handlePlayTrack(item.track)}
        >
          <Ionicons name="play" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading playlist...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !playlist) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error || 'Playlist not found'}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadPlaylistDetails}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Playlist</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Playlist Info */}
        <View style={styles.playlistHeader}>
          <View style={styles.coverContainer}>
            {playlist.cover_image_url ? (
              <Image source={{ uri: playlist.cover_image_url }} style={styles.coverImage} />
            ) : (
              <View style={[styles.defaultCoverImage, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
          
          <Text style={[styles.playlistName, { color: theme.colors.text }]}>
            {playlist.name}
          </Text>
          
          {playlist.description && (
            <Text style={[styles.playlistDescription, { color: theme.colors.textSecondary }]}>
              {playlist.description}
            </Text>
          )}
          
          <Text style={[styles.creatorName, { color: theme.colors.textSecondary }]}>
            by {playlist.creator.display_name || playlist.creator.username}
          </Text>
          
          <View style={styles.statsContainer}>
            <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
              {playlist.tracks_count || 0} tracks • {formatTotalDuration(playlist.total_duration)} • {playlist.followers_count || 0} followers
            </Text>
          </View>
          
          {/* Play All Button */}
          <TouchableOpacity 
            style={[styles.playAllButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePlayAll}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.playAllText}>Play All</Text>
          </TouchableOpacity>
        </View>

        {/* Track List */}
        <View style={styles.tracksSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tracks ({playlist.tracks?.length || 0})
          </Text>
          
          {playlist.tracks && playlist.tracks.length > 0 ? (
            <FlatList
              data={playlist.tracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyTracksContainer}>
              <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTracksText, { color: theme.colors.textSecondary }]}>
                This playlist is empty
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  playlistHeader: {
    alignItems: 'center',
    padding: 24,
  },
  coverContainer: {
    marginBottom: 16,
  },
  coverImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  defaultCoverImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  creatorName: {
    fontSize: 16,
    marginBottom: 12,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  playAllText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tracksSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trackPosition: {
    width: 24,
    fontSize: 14,
    textAlign: 'center',
    marginRight: 12,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  trackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultTrackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 12,
    marginRight: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTracksContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTracksText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default PlaylistDetailsScreen;
