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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { profileService } from '../services/ProfileService';
import { ModerationBadge } from '../components/ModerationBadge';

interface Track {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  audio_url: string;
  duration: number;
  play_count: number;
  likes_count: number;
  created_at: string;
  is_liked: boolean;
  creator_id?: string;
  moderation_status?: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected' | 'appealed';
  moderation_confidence?: number;
}

export default function TracksListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  // Get userId from route params or use current user
  const userId = (route.params as any)?.userId || user?.id;
  const isOwnProfile = userId === user?.id;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingLikes, setProcessingLikes] = useState<Set<string>>(new Set());
  const [moderationFilter, setModerationFilter] = useState<'all' | 'approved' | 'pending' | 'flagged' | 'rejected'>('all');

  useEffect(() => {
    loadTracks();
  }, [userId]);

  const loadTracks = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('🎵 Loading tracks for user:', userId);

      // Try API endpoint first, fallback to Supabase if it fails
      let tracksData: Track[] = [];
      
      try {
        const result = await profileService.getTracks(userId, session || undefined);
        if (result.success && result.tracks) {
          console.log('✅ Loaded tracks from API:', result.tracks.length);
          tracksData = result.tracks.map(track => ({
            id: track.id,
            title: track.title,
            artist_name: track.artist_name,
            cover_url: track.cover_image_url || null,
            audio_url: track.audio_url,
            duration: track.duration,
            play_count: track.play_count,
            likes_count: track.likes_count,
            created_at: track.created_at,
            is_liked: track.is_liked,
          }));
        }
      } catch (apiError) {
        console.warn('⚠️ API endpoint failed, falling back to Supabase:', apiError);
        
        // Fallback to Supabase
        const { data: tracksDataSupabase, error: tracksError } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Get current user's likes to check if they liked these tracks
      let likedTrackIds: string[] = [];
      if (user?.id) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('content_id')
          .eq('user_id', user.id)
          .eq('content_type', 'track')
          .in('content_id', tracksDataSupabase?.map(t => t.id) || []);

        likedTrackIds = likesData?.map(l => l.content_id) || [];
      }

      // Transform data
        tracksData = (tracksDataSupabase || []).map(track => ({
        id: track.id,
        title: track.title || 'Untitled Track',
        artist_name: track.artist_name || 'Unknown Artist',
        cover_url: track.cover_image_url || track.cover_url || track.artwork_url || track.image_url,
        audio_url: track.audio_url || track.file_url,
        duration: track.duration || 0,
        play_count: track.play_count || track.plays_count || 0,
        likes_count: track.likes_count || track.like_count || 0,
        created_at: track.created_at,
        is_liked: likedTrackIds.includes(track.id),
        creator_id: track.creator_id,
        moderation_status: track.moderation_status,
        moderation_confidence: track.moderation_confidence,
      }));
      }

      setTracks(tracksData);
    } catch (error) {
      console.error('❌ Error loading tracks:', error);
      Alert.alert('Error', 'Failed to load tracks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTracks();
  };

  const handleLikeToggle = async (trackId: string, isCurrentlyLiked: boolean) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to like tracks');
      return;
    }

    // Prevent multiple simultaneous like/unlike operations
    if (processingLikes.has(trackId)) return;

    try {
      setProcessingLikes(prev => new Set(prev).add(trackId));

      if (isCurrentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', trackId)
          .eq('content_type', 'track');

        if (error) throw error;

        // Update local state
        setTracks(prev =>
          prev.map(t =>
            t.id === trackId
              ? { ...t, is_liked: false, likes_count: Math.max(0, t.likes_count - 1) }
              : t
          )
        );
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            content_id: trackId,
            content_type: 'track',
          });

        if (error) throw error;

        // Update local state
        setTracks(prev =>
          prev.map(t =>
            t.id === trackId
              ? { ...t, is_liked: true, likes_count: t.likes_count + 1 }
              : t
          )
        );
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    } finally {
      setProcessingLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
    }
  };

  const handlePlayTrack = async (track: Track) => {
    try {
      console.log('▶️ Playing track:', track.title);

      // Increment play count
      const { error } = await supabase
        .from('audio_tracks')
        .update({
          play_count: track.play_count + 1,
        })
        .eq('id', track.id);

      if (error) {
        console.warn('Failed to increment play count:', error);
      }

      // Play track using audio player context
      await playTrack({
        id: track.id,
        title: track.title,
        artist: track.artist_name,
        artwork: track.cover_url || '',
        url: track.audio_url,
        duration: track.duration,
      });

      // Update local play count
      setTracks(prev =>
        prev.map(t =>
          t.id === track.id ? { ...t, play_count: t.play_count + 1 } : t
        )
      );
    } catch (error) {
      console.error('❌ Error playing track:', error);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!isOwnProfile) return;

    Alert.alert(
      'Delete Track',
      'Are you sure you want to delete this track? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('audio_tracks')
                .delete()
                .eq('id', trackId);

              if (error) throw error;

              // Remove from local state
              setTracks(prev => prev.filter(t => t.id !== trackId));

              console.log('✅ Track deleted:', trackId);
              Alert.alert('Success', 'Track deleted successfully');
            } catch (error) {
              console.error('❌ Error deleting track:', error);
              Alert.alert('Error', 'Failed to delete track');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const filterTracksByModeration = (tracks: Track[]) => {
    if (!isOwnProfile || moderationFilter === 'all') return tracks;

    return tracks.filter((track) => {
      const status = track.moderation_status;
      switch (moderationFilter) {
        case 'approved':
          return status === 'clean' || status === 'approved';
        case 'pending':
          return status === 'pending_check' || status === 'checking';
        case 'flagged':
          return status === 'flagged';
        case 'rejected':
          return status === 'rejected' || status === 'appealed';
        default:
          return true;
      }
    });
  };

  const filteredTracks = filterTracksByModeration(tracks);

  const renderTrack = ({ item }: { item: Track }) => {
    const isProcessingLike = processingLikes.has(item.id);
    const isCurrentTrack = currentTrack?.id === item.id;
    const isCurrentlyPlaying = isCurrentTrack && isPlaying;

    return (
      <View style={[styles.trackItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.trackMain}
          onPress={() => handlePlayTrack(item)}
        >
          {/* Track Cover */}
          <View style={styles.coverContainer}>
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="musical-notes" size={24} color={theme.colors.textSecondary} />
              </View>
            )}
            {/* Play/Pause Overlay */}
            <View style={styles.playOverlay}>
              {isCurrentlyPlaying ? (
                <Ionicons name="pause-circle" size={32} color="#FFFFFF" />
              ) : (
                <Ionicons name="play-circle" size={32} color="#FFFFFF" />
              )}
            </View>
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.artistName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.artist_name}
            </Text>
            {isOwnProfile && item.moderation_status && (
              <ModerationBadge
                status={item.moderation_status}
                confidence={item.moderation_confidence}
                isOwner={true}
              />
            )}
            <View style={styles.trackStats}>
              <View style={styles.stat}>
                <Ionicons name="play" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatNumber(item.play_count)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="heart" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatNumber(item.likes_count)}
                </Text>
              </View>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          {/* Duration */}
          {item.duration > 0 && (
            <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>
              {formatDuration(item.duration)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikeToggle(item.id, item.is_liked)}
            disabled={isProcessingLike}
          >
            {isProcessingLike ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={24}
                color={item.is_liked ? theme.colors.primary : theme.colors.textSecondary}
              />
            )}
          </TouchableOpacity>

          {isOwnProfile && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteTrack(item.id)}
            >
              <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isOwnProfile ? 'My Tracks' : 'Tracks'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Moderation Filter (Owner Only) */}
      {isOwnProfile && (
        <View style={styles.filterContainer}>
          <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Filter by status:</Text>
          <View style={styles.filterButtons}>
            {(['all', 'approved', 'pending', 'flagged', 'rejected'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: moderationFilter === filter ? theme.colors.primary + '20' : theme.colors.surface,
                    borderColor: moderationFilter === filter ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setModerationFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: moderationFilter === filter ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  {filter === 'all' ? 'All' :
                   filter === 'approved' ? 'Approved' :
                   filter === 'pending' ? 'Pending' :
                   filter === 'flagged' ? 'Flagged' :
                   'Rejected'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tracks List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading tracks...
          </Text>
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Tracks Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {isOwnProfile
              ? 'Upload your first track to get started!'
              : 'This user has not uploaded any tracks yet'}
          </Text>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Upload' as never)}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Upload Track</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTracks}
          keyExtractor={item => item.id}
          renderItem={renderTrack}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  trackItem: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trackMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  coverContainer: {
    position: 'relative',
    marginRight: 12,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  duration: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
