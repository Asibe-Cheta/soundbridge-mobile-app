import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import type { AudioTrack, PublicProfile, Event } from '@soundbridge/types';

const { width } = Dimensions.get('window');

interface CreatorProfileScreenProps {
  navigation: any;
  route: any;
}

interface CreatorStats {
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
  totalTips: number;
  totalEarnings: number;
}

export default function CreatorProfileScreen({ navigation, route }: CreatorProfileScreenProps) {
  const { username } = route.params || {};
  const { play, addToQueue } = useAudioPlayer();
  
  const [creator, setCreator] = useState<PublicProfile | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [activeTab, setActiveTab] = useState<'tracks' | 'events' | 'about'>('tracks');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadCreatorData();
  }, [username]);

  const loadCreatorData = async () => {
    setLoading(true);
    try {
      // Mock data for now - in real app, this would come from API
      const mockCreator: PublicProfile = {
        id: '1',
        username: username || 'creator123',
        display_name: 'SoundBridge Creator',
        avatar_url: 'https://picsum.photos/200/200?random=creator',
        bio: 'Music producer and composer. Creating beats that move your soul. 🎵✨',
        location: 'Los Angeles, CA',
        city: 'Los Angeles',
        country: 'US',
        genre: 'Hip Hop',
        role: 'creator',
        verified: false,
        followers_count: 0,
        following_count: 0,
        total_plays: 0,
        // total_tracks: 0, // TODO: Add total_tracks to database schema
        total_likes: 0,
        total_events: 0,
        last_active: '2022-03-15T10:30:00Z',
        // TODO: Add onboarding fields to database schema
        created_at: '2022-03-15T10:30:00Z',
        // updated_at: '2022-03-15T10:30:00Z', // TODO: Add updated_at to database schema
      };

      const mockTracks: AudioTrack[] = [
        {
          id: '1',
          title: 'Summer Vibes',
          creator_id: '1',
          description: 'A chill summer track',
          genre: 'Hip Hop',
          sub_genre: null,
          duration: 180,
          file_url: 'https://example.com/audio1.mp3',
          artwork_url: 'https://picsum.photos/300/300?random=1',
          waveform_url: null,
          share_count: 0,
          comment_count: 0,
          is_public: true,
          play_count: 15420,
          like_count: 892,
          // comments_count: 0, // TODO: Add comments_count to database schema
          // shares_count: 0, // TODO: Add shares_count to database schema
          download_count: 0,
          is_explicit: false,
          is_featured: false,
          tags: ['summer', 'vibes', 'chill'],
          metadata: {},
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          deleted_at: null,
        },
        {
          id: '2',
          title: 'Midnight Dreams',
          creator_id: '1',
          description: 'A soulful midnight track',
          genre: 'R&B',
          sub_genre: null,
          duration: 240,
          file_url: 'https://example.com/audio2.mp3',
          artwork_url: 'https://picsum.photos/300/300?random=2',
          waveform_url: null,
          share_count: 0,
          comment_count: 0,
          is_public: true,
          play_count: 12350,
          like_count: 756,
          // comments_count: 0, // TODO: Add comments_count to database schema
          // shares_count: 0, // TODO: Add shares_count to database schema
          download_count: 0,
          is_explicit: false,
          is_featured: false,
          tags: ['midnight', 'dreams', 'soulful'],
          metadata: {},
          created_at: '2024-01-10T10:30:00Z',
          updated_at: '2024-01-10T10:30:00Z',
          deleted_at: null,
        },
      ];

      const mockStats: CreatorStats = {
        totalTracks: mockTracks.length,
        totalPlays: mockTracks.reduce((sum, track) => sum + track.play_count, 0),
        totalLikes: mockTracks.reduce((sum, track) => sum + track.like_count, 0),
        totalFollowers: mockCreator.followers_count,
        totalFollowing: mockCreator.following_count,
        totalTips: 156,
        totalEarnings: 1247.50,
      };

      setCreator(mockCreator);
      setTracks(mockTracks);
      setEvents([]);
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading creator data:', error);
      Alert.alert('Error', 'Failed to load creator profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCreatorData();
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleTipCreator = () => {
    Alert.alert('Tip Creator', 'Tip functionality will be implemented soon.');
  };

  const handlePlayTrack = (track: AudioTrack) => {
    play(track);
  };

  const handleAddToQueue = (track: AudioTrack) => {
    addToQueue(track);
    Alert.alert('Added to Queue', `${track.title} has been added to your queue.`);
  };

  const handleLikeTrack = (trackId: string) => {
    setIsLiked(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Loading creator profile...</Text>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color="rgba(255,255,255,0.3)" />
        <Text style={styles.errorText}>Creator not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#DC2626"
            colors={['#DC2626']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Creator Profile</Text>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: 'https://via.placeholder.com/800x300' }}
            style={styles.banner}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.bannerGradient}
          />
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: creator.avatar_url || 'https://via.placeholder.com/120' }}
              style={styles.avatar}
            />
            {creator.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{creator.display_name}</Text>
            <Text style={styles.creatorUsername}>@{creator.username}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats?.totalFollowers || 0)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats?.totalTracks || 0)}</Text>
            <Text style={styles.statLabel}>Tracks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats?.totalPlays || 0)}</Text>
            <Text style={styles.statLabel}>Plays</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats?.totalLikes || 0)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}
          >
            <Ionicons 
              name={isFollowing ? 'person-remove' : 'person-add'} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.tipButton]}
            onPress={handleTipCreator}
          >
            <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Tip Creator</Text>
          </TouchableOpacity>
        </View>

        {/* Tracks */}
        <View style={styles.tracksContainer}>
          <Text style={styles.sectionTitle}>Tracks</Text>
          {tracks.map((track) => (
            <TouchableOpacity key={track.id} style={styles.trackItem}>
              <Image 
                source={{ uri: track.artwork_url || 'https://via.placeholder.com/80' }}
                style={styles.trackImage}
              />
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.trackGenre}>{track.genre}</Text>
                <View style={styles.trackStats}>
                  <Text style={styles.trackStat}>
                    <Ionicons name="play" size={12} color="rgba(255,255,255,0.6)" /> {formatNumber(track.play_count)}
                  </Text>
                  <Text style={styles.trackStat}>
                    <Ionicons name="heart" size={12} color="rgba(255,255,255,0.6)" /> {formatNumber(track.like_count)}
                  </Text>
                </View>
              </View>
              <View style={styles.trackActions}>
                <TouchableOpacity 
                  style={styles.trackActionButton}
                  onPress={() => handleLikeTrack(track.id)}
                >
                  <Ionicons 
                    name={isLiked[track.id] ? 'heart' : 'heart-outline'} 
                    size={20} 
                    color={isLiked[track.id] ? '#DC2626' : 'rgba(255,255,255,0.6)'} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trackActionButton}
                  onPress={() => handlePlayTrack(track)}
                >
                  <Ionicons name="play" size={20} color="#DC2626" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.trackActionButton}
                  onPress={() => handleAddToQueue(track)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* About Section */}
        <View style={styles.aboutContainer}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>Bio</Text>
            <Text style={styles.aboutText}>{creator.bio}</Text>
          </View>
          
          {creator.location && (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>Location</Text>
              <Text style={styles.aboutText}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.6)" /> {creator.location}
              </Text>
            </View>
          )}
          
          {/* TODO: Add website field to database schema */}
          
          {creator.genre && (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>Genre</Text>
              <View style={styles.genresContainer}>
                <View style={styles.genreTag}>
                  <Text style={styles.genreText}>{creator.genre}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bannerContainer: {
    height: 200,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: -50,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  creatorInfo: {
    flex: 1,
    paddingBottom: 10,
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  creatorUsername: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  followButton: {
    backgroundColor: '#DC2626',
  },
  followingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tracksContainer: {
    paddingBottom: 20,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  trackGenre: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 8,
  },
  trackStats: {
    flexDirection: 'row',
    gap: 16,
  },
  trackStat: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackActionButton: {
    padding: 8,
  },
  aboutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  aboutSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aboutTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aboutText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  websiteLink: {
    color: '#DC2626',
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
});