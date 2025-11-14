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
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { supabase } from '../lib/supabase';

interface Track {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  play_count?: number;        // Correct field name from schema
  likes_count?: number;       // Correct field name from schema
  cover_art_url?: string;     // Correct field name from schema
  file_url?: string;          // Correct field name from schema
  genre?: string;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function TrackDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying, pause, resume, updateCurrentTrack, incrementPlayCount } = useAudioPlayer();

  const { trackId, track: initialTrack } = route.params as { trackId: string; track?: Track };

  const [track, setTrack] = useState<Track | null>(initialTrack || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    loadTrackDetails();
    checkLikeStatus();
  }, [trackId]);

  // Sync track data with currentTrack from AudioPlayerContext
  useEffect(() => {
    if (currentTrack && currentTrack.id === trackId) {
      setTrack(prev => prev ? {
        ...prev,
        likes_count: currentTrack.likes_count,
        play_count: currentTrack.plays_count
      } : null);
    }
  }, [currentTrack, trackId]);

  const loadTrackDetails = async () => {
    try {
      console.log('🔧 Loading track details:', trackId);
      
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          duration,
          play_count,
          likes_count,
          cover_art_url,
          file_url,
          genre,
          created_at,
          creator:profiles!creator_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', trackId)
        .single();

      if (error) throw error;

      setTrack(data);
      console.log('✅ Track details loaded:', data.title);
      console.log('🎭 Creator data:', data.creator);
    } catch (error) {
      console.error('❌ Error loading track details:', error);
      Alert.alert('Error', 'Failed to load track details');
    } finally {
      setLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    if (!user?.id) return;

    try {
      // Simplified approach - just set to false for now
      // This avoids database conflicts while maintaining UI functionality
      setIsLiked(false);
    } catch (error) {
      console.error('❌ Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to like tracks');
      return;
    }

    try {
      const newLikeStatus = !isLiked;
      setIsLiked(newLikeStatus);
      
      // Update likes count in audio_tracks table only (safer approach)
      const likeIncrement = newLikeStatus ? 1 : -1;
      const newLikesCount = Math.max(0, (track?.likes_count || 0) + likeIncrement);
      
      const { error: updateError } = await supabase
        .from('audio_tracks')
        .update({ 
          likes_count: newLikesCount 
        })
        .eq('id', trackId);
      
      if (updateError) {
        console.error('Error updating likes count:', updateError);
        // Revert the like status if database update failed
        setIsLiked(!newLikeStatus);
        Alert.alert('Error', 'Failed to update likes count. Please try again.');
        return;
      }
      
      // Update local track state
      setTrack(prev => prev ? { 
        ...prev, 
        likes_count: newLikesCount 
      } : null);
      
      // Also update AudioPlayerContext if this track is currently playing
      if (currentTrack && currentTrack.id === trackId) {
        updateCurrentTrack({ likes_count: newLikesCount });
      }
      
    } catch (error) {
      console.error('❌ Error updating like status:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handlePlay = async () => {
    if (!track) return;

    try {
      if (currentTrack?.id === track.id) {
        // Same track - toggle play/pause
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
      } else {
        // Different track - play new track
        await play({
          id: track.id,
          title: track.title,
          creator: track.creator,
          duration: track.duration,
          cover_image_url: track.cover_art_url,
          artwork_url: track.cover_art_url,
          file_url: track.file_url,
          plays_count: track.play_count,
          likes_count: track.likes_count,
          created_at: track.created_at,
        });

        // Play count will be automatically incremented by AudioPlayerContext
      }
    } catch (error) {
      console.error('❌ Error playing track:', error);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const handleShare = async () => {
    if (!track) return;

    try {
      await Share.share({
        message: `Check out "${track.title}" by ${track.creator?.display_name || 'Unknown Artist'} on SoundBridge!`,
        title: track.title,
      });
    } catch (error) {
      console.error('❌ Error sharing track:', error);
    }
  };

  const handleCreatorPress = () => {
    if (track?.creator) {
      console.log('🎭 Navigating to creator profile:', track.creator.display_name, 'ID:', track.creator.id);
      navigation.navigate('CreatorProfile' as never, { 
        creatorId: track.creator.id, 
        creator: track.creator 
      } as never);
    } else {
      console.log('❌ No creator data available for navigation');
      Alert.alert('Error', 'Creator information not available');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTrackDetails(), checkLikeStatus()]);
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading track...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!track) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.errorContainer}>
            <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>Track not found</Text>
            <BackButton
              label="Go Back"
              style={{ marginTop: 24 }}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Return to previous screen"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isCurrentTrack = currentTrack?.id === track.id;

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
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton style={styles.headerButton} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {track.title}
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Track Artwork */}
        <View style={styles.artworkSection}>
          {track.cover_art_url ? (
            <Image 
              source={{ uri: track.cover_art_url }} 
              style={styles.artwork} 
            />
          ) : (
            <View style={[styles.defaultArtwork, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="musical-notes" size={64} color={theme.colors.textSecondary} />
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.colors.text }]}>{track.title}</Text>
            
            {track.creator && (
              <TouchableOpacity style={styles.creatorRow} onPress={handleCreatorPress}>
                {track.creator.avatar_url ? (
                  <Image source={{ uri: track.creator.avatar_url }} style={styles.creatorAvatar} />
                ) : (
                  <View style={[styles.defaultCreatorAvatar, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.creatorName, { color: theme.colors.textSecondary }]}>
                  {track.creator.display_name}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            {track.genre && (
              <View style={[styles.genreTag, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.genreText, { color: theme.colors.primary }]}>{track.genre}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
              onPress={handlePlay}
            >
              <Ionicons 
                name={isCurrentTrack && isPlaying ? "pause" : "play"} 
                size={24} 
                color="#FFFFFF" 
              />
              <Text style={styles.playButtonText}>
                {isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.likeButton,
                {
                  backgroundColor: isLiked ? theme.colors.primary + '20' : theme.colors.surface,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={handleLike}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={isLiked ? theme.colors.primary : theme.colors.textSecondary} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Ionicons name="play" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatNumber(track.play_count || 0)} plays
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatNumber(track.likes_count || 0)} likes
              </Text>
            </View>
            {track.duration && (
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatDuration(track.duration)}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {track.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                {track.description}
              </Text>
            </View>
          )}

          {/* Release Date */}
          <View style={styles.infoSection}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Released</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {formatDate(track.created_at)}
            </Text>
          </View>
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
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  artworkSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  artwork: {
    width: 250,
    height: 250,
    borderRadius: 16,
  },
  defaultArtwork: {
    width: 250,
    height: 250,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  defaultCreatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 16,
    marginRight: 4,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  likeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
