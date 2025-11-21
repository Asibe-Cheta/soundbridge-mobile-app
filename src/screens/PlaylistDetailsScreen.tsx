import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { dbHelpers } from '../lib/supabase';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { play } = useAudioPlayer();
  const { theme } = useTheme();
  
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
      artist_name: track.artist_name,
      duration: track.duration,
      cover_art_url: track.cover_art_url,
      file_url: track.file_url,
      likes_count: track.likes_count,
      plays_count: track.plays_count,
      created_at: new Date().toISOString(),
      creator: track.creator,
    };
    
    play(audioTrack);
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
      style={[styles.trackItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handlePlayTrack(track)}
    >
      <View style={styles.trackNumber}>
        <Text style={[styles.trackNumberText, { color: theme.colors.textMuted }]}>{index + 1}</Text>
      </View>
      
      <View style={styles.trackImageContainer}>
        {track.cover_art_url ? (
          <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
        ) : (
          <View style={[styles.trackImagePlaceholder, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="musical-notes" size={24} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
      
      <View style={styles.trackInfo}>
        <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {track.creator?.display_name || track.artist_name}
        </Text>
      </View>
      
      <View style={styles.trackStats}>
        <Text style={[styles.trackDuration, { color: theme.colors.textMuted }]}>
          {formatDuration(track.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
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
          <View style={styles.header}>
            <BackButton
              style={styles.backButton}
              onPress={() => navigation.goBack()}
             />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Loading...</Text>
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading playlist...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !playlist) {
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
          <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <BackButton
              style={styles.backButton}
              onPress={() => navigation.goBack()}
             />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Error</Text>
          </View>
          
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              {error || 'Playlist not found'}
            </Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} onPress={loadPlaylistDetails}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton
            style={styles.backButton}
            onPress={() => navigation.goBack()}
           />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {playlist.name}
          </Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
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
            <Text style={[styles.playlistName, { color: theme.colors.text }]}>{playlist.name}</Text>
            <Text style={[styles.playlistCreator, { color: theme.colors.textSecondary }]}>
              by {playlist.creator.display_name}
            </Text>
            {playlist.description && (
              <Text style={[styles.playlistDescription, { color: theme.colors.textMuted }]}>
                {playlist.description}
              </Text>
            )}
            
            <View style={styles.playlistStats}>
              <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
                {playlist.tracks_count} tracks • {formatTotalDuration(playlist.total_duration)}
              </Text>
              {playlist.followers_count > 0 && (
                <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
                  {playlist.followers_count} followers
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.playAllButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePlayAll}
            disabled={!playlist.tracks.length}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.playAllButtonText}>Play All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="heart-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tracks List */}
        <View style={styles.tracksSection}>
          <Text style={[styles.tracksSectionTitle, { color: theme.colors.text }]}>
            Tracks ({playlist.tracks.length})
          </Text>
          
          {playlist.tracks.length === 0 ? (
            <View style={styles.emptyTracks}>
              <Ionicons name="musical-notes" size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTracksText, { color: theme.colors.textMuted }]}>No tracks in this playlist</Text>
            </View>
          ) : (
            playlist.tracks.map((track, index) => renderTrackItem(track, index))
          )}
        </View>
      </ScrollView>
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  moreButton: {
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
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
    marginBottom: 4,
  },
  playlistCreator: {
    fontSize: 16,
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  playlistStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: 14,
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
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  trackNumberText: {
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
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
  },
  trackStats: {
    alignItems: 'flex-end',
  },
  trackDuration: {
    fontSize: 14,
  },
  emptyTracks: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTracksText: {
    fontSize: 16,
    marginTop: 12,
  },
});