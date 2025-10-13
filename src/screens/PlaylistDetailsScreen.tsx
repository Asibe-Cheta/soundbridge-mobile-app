import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { dbHelpers } from '../lib/supabase';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface PlaylistTrack {
  id: string;
  title: string;
  artist_name: string;
  duration: number;
  cover_art_url?: string;
  file_url: string;
  likes_count: number;
  plays_count: number;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface PlaylistData {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  tracks_count: number;
  total_duration: number;
  followers_count: number;
  created_at: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
  };
  tracks: PlaylistTrack[];
}

export default function PlaylistDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { playTrack } = useAudioPlayer();
  
  const { playlistId } = route.params as { playlistId: string };
  
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlaylistDetails = async () => {
    try {
      console.log('🎵 Loading playlist details for:', playlistId);
      
      const { data, error } = await dbHelpers.getPlaylistDetails(playlistId);
      
      if (error) {
        console.error('❌ Error loading playlist:', error);
        setError('Failed to load playlist details');
        return;
      }
      
      if (!data) {
        setError('Playlist not found');
        return;
      }
      
      console.log('✅ Playlist loaded:', data.name, 'with', data.tracks.length, 'tracks');
      setPlaylist(data);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading playlist details:', err);
      setError('Failed to load playlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlaylistDetails();
  }, [playlistId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlaylistDetails();
  };

  const handlePlayTrack = (track: PlaylistTrack) => {
    console.log('🎵 Playing track from playlist:', track.title);
    
    const audioTrack = {
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || track.artist_name,
      duration: track.duration,
      coverArt: track.cover_art_url,
      url: track.file_url,
      likes: track.likes_count,
      plays: track.plays_count,
    };
    
    playTrack(audioTrack);
  };

  const handlePlayAll = () => {
    if (!playlist?.tracks.length) return;
    
    console.log('🎵 Playing all tracks from playlist:', playlist.name);
    // Play the first track, others will be added to queue automatically
    handlePlayTrack(playlist.tracks[0]);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderTrackItem = (track: PlaylistTrack, index: number) => (
    <TouchableOpacity
      key={track.id}
      style={styles.trackItem}
      onPress={() => handlePlayTrack(track)}
    >
      <View style={styles.trackNumber}>
        <Text style={styles.trackNumberText}>{index + 1}</Text>
      </View>
      
      <View style={styles.trackImageContainer}>
        {track.cover_art_url ? (
          <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
        ) : (
          <View style={styles.trackImagePlaceholder}>
            <Ionicons name="musical-notes" size={24} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.creator?.display_name || track.artist_name}
        </Text>
      </View>
      
      <View style={styles.trackStats}>
        <Text style={styles.trackDuration}>
          {formatDuration(track.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading playlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !playlist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>
            {error || 'Playlist not found'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlaylistDetails}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {playlist.name}
        </Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B6B"
          />
        }
      >
        {/* Playlist Header */}
        <View style={styles.playlistHeader}>
          <View style={styles.coverContainer}>
            {playlist.cover_image_url ? (
              <Image source={{ uri: playlist.cover_image_url }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="musical-notes" size={48} color="#666" />
              </View>
            )}
          </View>
          
          <View style={styles.playlistInfo}>
            <Text style={styles.playlistName}>{playlist.name}</Text>
            <Text style={styles.playlistCreator}>
              by {playlist.creator.display_name}
            </Text>
            {playlist.description && (
              <Text style={styles.playlistDescription}>
                {playlist.description}
              </Text>
            )}
            
            <View style={styles.playlistStats}>
              <Text style={styles.statText}>
                {playlist.tracks_count} tracks • {formatTotalDuration(playlist.total_duration)}
              </Text>
              {playlist.followers_count > 0 && (
                <Text style={styles.statText}>
                  {playlist.followers_count} followers
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.playAllButton}
            onPress={handlePlayAll}
            disabled={!playlist.tracks.length}
          >
            <Ionicons name="play" size={20} color="#000" />
            <Text style={styles.playAllButtonText}>Play All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tracks List */}
        <View style={styles.tracksSection}>
          <Text style={styles.tracksSectionTitle}>
            Tracks ({playlist.tracks.length})
          </Text>
          
          {playlist.tracks.length === 0 ? (
            <View style={styles.emptyTracks}>
              <Ionicons name="musical-notes" size={48} color="#666" />
              <Text style={styles.emptyTracksText}>No tracks in this playlist</Text>
            </View>
          ) : (
            playlist.tracks.map((track, index) => renderTrackItem(track, index))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  moreButton: {
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistHeader: {
    flexDirection: 'row',
    padding: 20,
  },
  coverContainer: {
    marginRight: 16,
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  playlistCreator: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 12,
  },
  playlistStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: 14,
    color: '#888',
    marginRight: 16,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  playAllButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tracksSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tracksSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  trackNumberText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  trackImageContainer: {
    marginRight: 12,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  trackImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#aaa',
  },
  trackStats: {
    alignItems: 'flex-end',
  },
  trackDuration: {
    fontSize: 14,
    color: '#888',
  },
  emptyTracks: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTracksText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
});