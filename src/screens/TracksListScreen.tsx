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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  is_paid?: boolean;
  price?: number;
  currency?: string;
  live_interest_enabled?: boolean;
}

export default function TracksListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play, currentTrack, isPlaying } = useAudioPlayer();

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

      // Always use Supabase directly — API route doesn't return creator join or cover art
      const { data: tracksDataSupabase, error: tracksError } = await supabase
        .from('audio_tracks')
        .select(`
          id, title, file_url, cover_art_url, duration,
          play_count, likes_count, created_at, creator_id,
          is_paid, price, currency,
          moderation_status, moderation_confidence,
          live_interest_enabled,
          creator:profiles!creator_id(id, username, display_name, avatar_url)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Get current user's likes
      let likedTrackIds: string[] = [];
      if (user?.id && tracksDataSupabase && tracksDataSupabase.length > 0) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('content_id')
          .eq('user_id', user.id)
          .eq('content_type', 'track')
          .in('content_id', tracksDataSupabase.map(t => t.id));
        likedTrackIds = likesData?.map(l => l.content_id) || [];
      }

      const tracksData: Track[] = (tracksDataSupabase || []).map((track: any) => ({
        id: track.id,
        title: track.title || 'Untitled Track',
        artist_name: track.creator?.display_name || track.creator?.username || '',
        cover_url: track.cover_art_url || null,
        audio_url: track.file_url || '',
        file_url: track.file_url || '',
        cover_image_url: track.cover_art_url || null,
        duration: track.duration || 0,
        play_count: track.play_count || 0,
        likes_count: track.likes_count || 0,
        created_at: track.created_at,
        is_liked: likedTrackIds.includes(track.id),
        creator_id: track.creator_id,
        creator: track.creator ?? null,
        moderation_status: track.moderation_status,
        moderation_confidence: track.moderation_confidence,
        is_paid: track.is_paid,
        price: track.price,
        currency: track.currency,
        live_interest_enabled: track.live_interest_enabled ?? false,
      }));

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
      await play({
        id: track.id,
        title: track.title,
        created_at: track.created_at,
        file_url: track.audio_url,
        audio_url: track.audio_url,
        cover_image_url: track.cover_url || '',
        duration: track.duration,
        is_paid: track.is_paid,
        price: track.price,
        currency: track.currency,
        creator_id: track.creator_id,
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
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.trackItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => isOwnProfile
          ? (navigation as any).navigate('TrackDetails', { trackId: item.id, track: item })
          : handlePlayTrack(item)
        }
      >
        {/* Cover + active indicator */}
        <View style={styles.coverContainer}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.cover} />
          ) : (
            <LinearGradient
              colors={[theme.colors.primary + '40', theme.colors.primary + '10']}
              style={[styles.cover, styles.coverPlaceholder]}
            >
              <Ionicons name="musical-notes" size={26} color={theme.colors.primary} />
            </LinearGradient>
          )}
          {/* Play overlay — shown when this track is active */}
          {isCurrentTrack && (
            <View style={styles.playOverlay}>
              <Ionicons
                name={isCurrentlyPlaying ? 'pause-circle' : 'play-circle'}
                size={34}
                color="#FFFFFF"
              />
            </View>
          )}
          {/* Price badge on cover for paid tracks */}
          {item.is_paid && item.price ? (
            <View style={[styles.coverPriceBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.coverPriceBadgeText}>
                {item.currency === 'GBP' ? '£' : item.currency === 'EUR' ? '€' : '$'}{Number(item.price).toFixed(2)}
              </Text>
            </View>
          ) : null}
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
            <View style={{ marginTop: 4 }}>
              <ModerationBadge
                status={item.moderation_status}
                confidence={item.moderation_confidence}
                isOwner={true}
              />
            </View>
          )}
          <View style={styles.trackStats}>
            <View style={styles.stat}>
              <Ionicons name="play" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatNumber(item.play_count)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatNumber(item.likes_count)}
              </Text>
            </View>
            {item.duration > 0 && (
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={11} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatDuration(item.duration)}
                </Text>
              </View>
            )}
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.distNudge}
              onPress={() => (navigation as any).navigate('MBGSonicsDistribution', { preSelectedTrackId: item.id })}
            >
              <Ionicons name="globe-outline" size={10} color="#16A34A" />
              <Text style={styles.distNudgeText}>
                Get this track on Spotify and major platforms. Distribute through MBG Sonics.
              </Text>
              <Text style={styles.distNudgeAction}>Distribute This Track →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right-side actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => handlePlayTrack(item)}
          >
            <Ionicons
              name={isCurrentlyPlaying ? 'pause' : 'play'}
              size={16}
              color={isCurrentTrack ? theme.colors.primary : theme.colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleLikeToggle(item.id, item.is_liked)}
            disabled={isProcessingLike}
          >
            {isProcessingLike ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={16}
                color={item.is_liked ? theme.colors.primary : theme.colors.textSecondary}
              />
            )}
          </TouchableOpacity>

          {isOwnProfile && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: item.is_paid ? theme.colors.primary + '20' : theme.colors.surface }]}
                onPress={() => (navigation as any).navigate('TrackDetails', { trackId: item.id, track: item })}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={16}
                  color={item.is_paid ? theme.colors.primary : theme.colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => handleDeleteTrack(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.card, theme.colors.background]}
        style={[styles.header, { borderBottomColor: theme.colors.border }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={[styles.backButtonInner, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {isOwnProfile ? 'My Tracks' : 'Tracks'}
          </Text>
          {isOwnProfile && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Tap a track to manage pricing
            </Text>
          )}
        </View>
        <View style={styles.backButton} />
      </LinearGradient>

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
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.2,
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
    fontWeight: '700',
    letterSpacing: -0.5,
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
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 28,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 12,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 58,
    height: 58,
    borderRadius: 10,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
  },
  coverPriceBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverPriceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  artistName: {
    fontSize: 13,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  distNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  distNudgeText: {
    fontSize: 11,
    color: '#16A34A',
    flex: 1,
    lineHeight: 15,
  },
  distNudgeAction: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
});
