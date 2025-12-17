import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { supabase, dbHelpers } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Album {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  release_date?: string;
  status: 'draft' | 'scheduled' | 'published';
  genre?: string;
  tracks_count: number;
  total_duration: number;
  total_plays: number;
  total_likes: number;
  created_at: string;
  published_at?: string;
  creator: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  tracks: any[];
}

export default function AlbumDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { playTrack, addToQueue, currentTrack, isPlaying } = useAudioPlayer();

  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const albumId = route.params?.albumId;
  const isCreator = user?.id === album?.creator?.id;

  useEffect(() => {
    if (albumId) {
      loadAlbum();
      checkLikeStatus();
    }
  }, [albumId]);

  const loadAlbum = async () => {
    try {
      setLoading(true);
      const { data, error } = await dbHelpers.getAlbumById(albumId);

      if (error) throw error;

      setAlbum(data);
      setLikesCount(data?.total_likes || 0);
    } catch (error) {
      console.error('Error loading album:', error);
      Alert.alert('Error', 'Failed to load album. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', albumId)
        .eq('content_type', 'album')
        .maybeSingle();

      if (!error && data) {
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to like albums');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', albumId)
          .eq('content_type', 'album');

        // Decrement count
        await supabase
          .from('albums')
          .update({ total_likes: Math.max(0, likesCount - 1) })
          .eq('id', albumId);

        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            content_id: albumId,
            content_type: 'album',
          });

        // Increment count
        await supabase
          .from('albums')
          .update({ total_likes: likesCount + 1 })
          .eq('id', albumId);

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handlePlayAll = async () => {
    if (!album || album.tracks.length === 0) return;

    try {
      // Play first track
      await playTrack(album.tracks[0]);

      // Add remaining tracks to queue
      for (let i = 1; i < album.tracks.length; i++) {
        await addToQueue(album.tracks[i]);
      }

      // Increment album plays
      await dbHelpers.incrementAlbumPlays(albumId);
    } catch (error) {
      console.error('Error playing album:', error);
      Alert.alert('Error', 'Failed to play album');
    }
  };

  const handlePlayTrack = async (track: any, index: number) => {
    try {
      await playTrack(track);

      // Add remaining tracks to queue
      for (let i = index + 1; i < album!.tracks.length; i++) {
        await addToQueue(album!.tracks[i]);
      }
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://soundbridge.live/album/${album?.id}`;
      const message = `🎵 Check out "${album?.title}" by ${album?.creator?.display_name || album?.creator?.username} on SoundBridge!\n\n${album?.tracks_count} tracks • ${formatDuration(album?.total_duration || 0)}\n\n${shareUrl}`;

      await Share.share({
        message,
        url: shareUrl,
        title: `${album?.title} - SoundBridge`,
      });
    } catch (error) {
      console.error('Error sharing album:', error);
    }
  };

  const handleEdit = () => {
    // Navigate to edit screen (to be implemented)
    Alert.alert('Edit Album', 'Album editing feature coming soon!');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Album',
      'Are you sure you want to delete this album? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await dbHelpers.deleteAlbum(albumId);
              if (error) throw error;

              Alert.alert('Success', 'Album deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting album:', error);
              Alert.alert('Error', 'Failed to delete album');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTrackDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading album...</Text>
      </View>
    );
  }

  if (!album) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>Album not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primary + '40', theme.colors.background, theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Album</Text>

          {isCreator && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Album Cover & Info */}
          <View style={styles.albumHeader}>
            {album.cover_image_url ? (
              <Image
                source={{ uri: album.cover_image_url }}
                style={styles.albumCover}
              />
            ) : (
              <View style={[styles.albumCoverPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="albums" size={80} color={theme.colors.textSecondary} />
              </View>
            )}

            <Text style={[styles.albumTitle, { color: theme.colors.text }]}>
              {album.title}
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('CreatorProfile', { creatorId: album.creator.id })}
            >
              <Text style={[styles.artistName, { color: theme.colors.primary }]}>
                {album.creator.display_name || album.creator.username}
              </Text>
            </TouchableOpacity>

            {album.description && (
              <Text style={[styles.albumDescription, { color: theme.colors.textSecondary }]}>
                {album.description}
              </Text>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatDate(album.release_date || album.published_at || album.created_at)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="musical-notes-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {album.tracks_count} tracks
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatDuration(album.total_duration)}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="play-circle-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatNumber(album.total_plays)} plays
                </Text>
              </View>
              {album.genre && (
                <View style={styles.stat}>
                  <Ionicons name="pricetag-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {album.genre}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.playAllButton, { backgroundColor: theme.colors.primary }]}
              onPress={handlePlayAll}
            >
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.playAllButtonText}>Play All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleLike}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? theme.colors.error : theme.colors.text}
              />
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                {formatNumber(likesCount)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {isCreator && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>

          {/* Track List */}
          <View style={[styles.trackListSection, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Tracks ({album.tracks.length})
            </Text>

            {album.tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isCurrentPlaying = isCurrentTrack && isPlaying;

              return (
                <TouchableOpacity
                  key={track.id}
                  style={[
                    styles.trackItem,
                    { borderBottomColor: theme.colors.border },
                    isCurrentTrack && { backgroundColor: theme.colors.primary + '10' }
                  ]}
                  onPress={() => handlePlayTrack(track, index)}
                >
                  <View style={styles.trackNumber}>
                    {isCurrentPlaying ? (
                      <Ionicons name="pause" size={20} color={theme.colors.primary} />
                    ) : isCurrentTrack ? (
                      <Ionicons name="play" size={20} color={theme.colors.primary} />
                    ) : (
                      <Text style={[styles.trackNumberText, { color: theme.colors.textSecondary }]}>
                        {track.track_number || index + 1}
                      </Text>
                    )}
                  </View>

                  <View style={styles.trackInfo}>
                    <Text
                      style={[
                        styles.trackTitle,
                        { color: isCurrentTrack ? theme.colors.primary : theme.colors.text }
                      ]}
                      numberOfLines={1}
                    >
                      {track.title}
                    </Text>
                    {track.creator && (
                      <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {track.creator.display_name || track.creator.username}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.trackDuration, { color: theme.colors.textSecondary }]}>
                    {formatTrackDuration(track.duration || 0)}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  albumHeader: {
    alignItems: 'center',
    padding: 20,
  },
  albumCover: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 20,
  },
  albumCoverPlaceholder: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  albumTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  albumDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  playAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  playAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  trackListSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  trackNumber: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNumberText: {
    fontSize: 14,
    fontWeight: '500',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
  },
  trackDuration: {
    fontSize: 13,
    marginLeft: 12,
  },
});

