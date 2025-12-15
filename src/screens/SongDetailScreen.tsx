import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { dbHelpers } from '../lib/supabase';
import MiniPlayer from '../components/MiniPlayer';

const { width, height } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  audio_url?: string;
  file_url?: string;
  cover_image_url?: string;
  cover_art_url?: string;
  artwork_url?: string;
  duration?: number;
  play_count?: number;
  likes_count?: number;
  created_at: string;
  genre?: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function SongDetailScreen() {
  const { play, addToQueue } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const trackId = (route.params as any)?.trackId;

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [topSongs, setTopSongs] = useState<AudioTrack[]>([]);
  const [similarSongs, setSimilarSongs] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackDetails();
  }, [trackId]);

  const loadTrackDetails = async () => {
    if (!trackId) return;

    try {
      setLoading(true);

      // Load track details
      const { data: trackData, error: trackError } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          audio_url,
          file_url,
          cover_art_url,
          artwork_url,
          duration,
          play_count,
          likes_count,
          created_at,
          genre,
          creator_id,
          creator:profiles!creator_id(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', trackId)
        .single();

      if (trackError) throw trackError;
      if (!trackData) return;

      const formattedTrack: AudioTrack = {
        ...trackData,
        cover_image_url: trackData.cover_art_url || trackData.artwork_url,
      };
      setTrack(formattedTrack);

      // Load top songs by the same creator
      if (trackData.creator_id) {
        const { data: creatorTracks } = await supabase
          .from('audio_tracks')
          .select(`
            id,
            title,
            description,
            audio_url,
            file_url,
            cover_art_url,
            artwork_url,
            duration,
            play_count,
            likes_count,
            created_at,
            genre,
            creator:profiles!creator_id(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('creator_id', trackData.creator_id)
          .eq('is_public', true)
          .neq('id', trackId)
          .order('play_count', { ascending: false })
          .limit(5);

        if (creatorTracks) {
          setTopSongs(
            creatorTracks.map((t) => ({
              ...t,
              cover_image_url: t.cover_art_url || t.artwork_url,
            }))
          );
        }
      }

      // Load similar songs (same genre)
      if (trackData.genre) {
        const { data: genreTracks } = await supabase
          .from('audio_tracks')
          .select(`
            id,
            title,
            description,
            audio_url,
            file_url,
            cover_art_url,
            artwork_url,
            duration,
            play_count,
            likes_count,
            created_at,
            genre,
            creator:profiles!creator_id(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('genre', trackData.genre)
          .eq('is_public', true)
          .neq('id', trackId)
          .order('play_count', { ascending: false })
          .limit(5);

        if (genreTracks) {
          setSimilarSongs(
            genreTracks.map((t) => ({
              ...t,
              cover_image_url: t.cover_art_url || t.artwork_url,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error loading track details:', error);
      Alert.alert('Error', 'Failed to load track details');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeInSeconds?: number) => {
    if (!timeInSeconds || timeInSeconds === 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleAddToPlaylist = () => {
    // TODO: Implement add to playlist functionality
    Alert.alert('Add to Playlist', 'Playlist feature coming soon!');
  };

  const renderSongItem = (song: AudioTrack, showPlayButton = false) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => play(song)}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri:
            song.cover_image_url ||
            song.cover_art_url ||
            song.artwork_url ||
            'https://via.placeholder.com/60',
        }}
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text
          style={[styles.songArtist, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {song.creator?.display_name || song.creator?.username || 'Unknown Artist'}
        </Text>
      </View>
      {showPlayButton ? (
        <TouchableOpacity
          style={styles.playButtonSmall}
          onPress={(e) => {
            e.stopPropagation();
            play(song);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={16} color={theme.colors.text} />
        </TouchableOpacity>
      ) : (
        <Text style={[styles.songDuration, { color: theme.colors.textSecondary }]}>
          {formatTime(song.duration)}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading || !track) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Purple gradient background matching reference */}
      <LinearGradient
        colors={
          theme.isDark
            ? ['#1a0f2e', '#2d1b4e', '#1a0f2e'] // Dark purple gradient
            : ['#f3e8ff', '#e9d5ff', '#f3e8ff'] // Light purple gradient
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme.colors.textSecondary }]} />
        </View>
        <TouchableOpacity onPress={() => {/* TODO: Add menu */}} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Album Art */}
        <View style={styles.albumArtContainer}>
          <Image
            source={{
              uri:
                track.cover_image_url ||
                track.cover_art_url ||
                track.artwork_url ||
                'https://via.placeholder.com/300',
            }}
            style={styles.albumArt}
          />
        </View>

        {/* Song Info */}
        <View style={styles.songInfoSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.songTitleLarge, { color: theme.colors.text }]} numberOfLines={2}>
              {track.title}
            </Text>
            <TouchableOpacity
              style={styles.playButtonLarge}
              onPress={() => play(track)}
              activeOpacity={0.9}
            >
              <Ionicons name="play" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.artistName, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {formatNumber(track.play_count)} Views
            </Text>
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {formatDate(track.created_at)}
            </Text>
          </View>

          {/* Add to Playlist Button */}
          <TouchableOpacity
            style={[styles.addToPlaylistButton, { borderColor: theme.colors.border }]}
            onPress={handleAddToPlaylist}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.addToPlaylistText, { color: theme.colors.primary }]}>
              Add To Playlist
            </Text>
          </TouchableOpacity>
        </View>

        {/* Top Songs Section */}
        {topSongs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Songs</Text>
            {topSongs.map((song) => renderSongItem(song))}
            {topSongs.length >= 5 && (
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>+ See All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Similar Songs Section */}
        {similarSongs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Similar Songs</Text>
            {similarSongs.map((song) => renderSongItem(song, true))}
            {similarSongs.length >= 5 && (
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>+ See All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Mini Player at Bottom */}
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: height,
    zIndex: -1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerHandle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120, // Space for mini player
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  albumArt: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 16,
  },
  songInfoSection: {
    marginBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  songTitleLarge: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  playButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistName: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statText: {
    fontSize: 14,
    fontWeight: '400',
  },
  addToPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  addToPlaylistText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    fontWeight: '400',
  },
  songDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  playButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

