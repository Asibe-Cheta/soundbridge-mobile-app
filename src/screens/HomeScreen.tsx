import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { supabase, dbHelpers } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  file_url?: string;          // Correct field name from schema
  cover_art_url?: string;     // Correct field name from schema
  duration?: number;
  play_count?: number;        // Correct field name from schema
  likes_count?: number;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  followers_count?: number;
  tracks_count?: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  image_url?: string;         // Correct field name from schema
  organizer: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { play, addToQueue } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  
  // Content states
  const [featuredCreator, setFeaturedCreator] = useState<Creator | null>(null);
  const [trendingTracks, setTrendingTracks] = useState<AudioTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [hotCreators, setHotCreators] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  // UI states
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(false);

  // Navigation functions
  const navigateToTrending = () => {
    // Navigate to trending tracks page
    console.log('Navigate to trending tracks');
  };

  const navigateToRecentMusic = () => {
    navigation.navigate('Discover' as never);
  };

  const navigateToHotCreators = () => {
    navigation.navigate('AllCreators' as never);
  };

  const navigateToEvents = () => {
    navigation.navigate('AllEvents' as never);
  };

  const navigateToCreatorSetup = () => {
    // Navigate to creator profile setup
    console.log('Navigate to creator setup');
    navigation.navigate('CreatorSetup' as never);
  };
  
  // Loading states
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    loadHomeContent();
  }, []);

  const loadHomeContent = async () => {
    try {
      // Load all content in parallel
      await Promise.all([
        loadFeaturedCreator(),
        loadTrendingTracks(),
        loadRecentTracks(),
        loadHotCreators(),
        loadEvents(),
      ]);
    } catch (error) {
      console.error('Error loading home content:', error);
    }
  };

  const loadFeaturedCreator = async () => {
    try {
      console.log('🔧 Loading featured creator...');
      // Mock featured creator for now since we don't have this endpoint
      setFeaturedCreator({
        id: '1',
        username: 'featured_artist',
        display_name: 'Featured Artist',
        bio: 'Amazing music creator',
        avatar_url: null,
        followers_count: 1500,
        tracks_count: 25,
      });
      console.log('✅ Featured creator loaded (mock data)');
    } catch (error) {
      console.error('Error loading featured creator:', error);
      setFeaturedCreator(null);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const loadTrendingTracks = async () => {
    try {
      console.log('🔧 Loading trending tracks...');
      // Enhanced mock trending tracks with artwork
      const mockTrending: AudioTrack[] = [
        {
          id: 'trending-1',
          title: 'Electric Dreams',
          cover_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
          artwork_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
          creator: {
            id: '1',
            username: 'artist1',
            display_name: 'Artist One',
          },
          duration: 180,
          plays_count: 5500,
          likes_count: 234,
          created_at: new Date().toISOString(),
        },
        {
          id: 'trending-2',
          title: 'Midnight City',
          cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
          artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
          creator: {
            id: '2',
            username: 'artist2',
            display_name: 'City Sounds',
          },
          duration: 210,
          plays_count: 4200,
          likes_count: 189,
          created_at: new Date().toISOString(),
        },
        {
          id: 'trending-3',
          title: 'Ocean Waves',
          cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          creator: {
            id: '3',
            username: 'artist3',
            display_name: 'Wave Sounds',
          },
          duration: 195,
          plays_count: 3800,
          likes_count: 156,
          created_at: new Date().toISOString(),
        },
      ];
      setTrendingTracks(mockTrending);
      console.log('✅ Trending tracks loaded (mock data):', mockTrending.length);
    } catch (error) {
      console.error('Error loading trending tracks:', error);
      setTrendingTracks([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  const loadRecentTracks = async () => {
    try {
      console.log('🔧 Loading recent tracks...');
      // Try to load real tracks from Supabase - let's see what columns exist
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Supabase error loading recent tracks:', error);
        console.log('🔄 Trying alternative query...');
        
        // Try even simpler query with just basic fields
        const { data: simpleData, error: simpleError } = await supabase
          .from('audio_tracks')
          .select('id, title, created_at, creator_id')
          .order('created_at', { ascending: false })
          .limit(10);

        if (simpleError) {
          throw simpleError;
        }

        if (simpleData && simpleData.length > 0) {
          const fallbackImages = [
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
          ];
          
          const transformedTracks: AudioTrack[] = simpleData.map((track, index) => {
            const imageUrl = fallbackImages[index % fallbackImages.length];
            return {
              id: track.id,
              title: track.title || 'Untitled Track',
              description: undefined,
              audio_url: undefined,
              file_url: undefined,
              cover_image_url: imageUrl,
              artwork_url: imageUrl,
              duration: 180, // Default duration
              plays_count: 0,
              likes_count: 0,
              created_at: track.created_at,
              creator: {
                id: track.creator_id || 'unknown',
                username: 'creator',
                display_name: 'Music Creator',
                avatar_url: undefined,
              },
            };
          });
          
          setRecentTracks(transformedTracks);
          console.log('✅ Recent tracks loaded (simple query):', transformedTracks.length);
          return;
        }
      }

      if (data && data.length > 0) {
        console.log('🔍 Raw track data from database:', JSON.stringify(data[0], null, 2));
        
        const fallbackImages = [
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        ];
        
        const transformedTracks: AudioTrack[] = data.map((track, index) => {
          // Use the correct field name from schema
          const imageUrl = track.cover_art_url || fallbackImages[index % fallbackImages.length];
          
          console.log(`🖼️ Track "${track.title}" artwork check:`, {
            cover_art_url: track.cover_art_url,
            final: imageUrl
          });
          
          return {
            id: track.id,
            title: track.title || 'Untitled Track',
            description: track.description,
            file_url: track.file_url,
            cover_art_url: imageUrl,
            duration: track.duration || 180,
            play_count: track.play_count || 0,
            likes_count: track.likes_count || 0,
            created_at: track.created_at,
            creator: {
              id: track.creator_id || 'unknown',
              username: 'creator',
              display_name: 'Music Creator',
              avatar_url: undefined,
            },
          };
        });
        
        setRecentTracks(transformedTracks);
        console.log('✅ Recent tracks loaded from Supabase:', transformedTracks.length);
        transformedTracks.forEach(track => {
          console.log(`🎵 Track: "${track.title}" - Cover: ${track.cover_art_url || 'none'}`);
        });
      } else {
        console.log('ℹ️ No recent tracks found, using mock data');
        // Enhanced mock data with sample artwork
        const mockTracks: AudioTrack[] = [
          {
            id: 'mock-1',
            title: 'Untitled Audio File',
            cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
            creator: {
              id: 'mock-creator-1',
              username: 'asibe_cheta',
              display_name: 'Asibe Cheta',
            },
            duration: 180,
            plays_count: 45,
            likes_count: 12,
            created_at: new Date().toISOString(),
          },
          {
            id: 'mock-2',
            title: 'My Song Hits',
            cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            creator: {
              id: 'mock-creator-2',
              username: 'asibe_cheta',
              display_name: 'Asibe Cheta',
            },
            duration: 210,
            plays_count: 89,
            likes_count: 23,
            created_at: new Date().toISOString(),
          },
        ];
        setRecentTracks(mockTracks);
      }
    } catch (error) {
      console.error('❌ Error loading recent tracks:', error);
      // Enhanced fallback mock data
      const mockTracks: AudioTrack[] = [
        {
          id: 'fallback-1',
          title: 'Untitled Audio File',
          cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
          artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
          creator: {
            id: 'fallback-creator-1',
            username: 'asibe_cheta',
            display_name: 'Asibe Cheta',
          },
          duration: 180,
          plays_count: 0,
          likes_count: 0,
          created_at: new Date().toISOString(),
        },
      ];
      setRecentTracks(mockTracks);
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadHotCreators = async () => {
    try {
      console.log('🔧 Loading hot creators...');
      const { data, error } = await dbHelpers.getHotCreators(5);
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        const transformedCreators: Creator[] = data.map(creator => ({
          id: creator.id,
          username: creator.username || '',
          display_name: creator.display_name || creator.username || 'Unknown Creator',
          bio: creator.bio || undefined,
          avatar_url: creator.avatar_url || undefined,
          followers_count: Math.floor(Math.random() * 5000) + 100, // Mock follower count
          tracks_count: Math.floor(Math.random() * 50) + 5, // Mock track count
        }));
        
        setHotCreators(transformedCreators);
        console.log('✅ Hot creators loaded:', transformedCreators.length);
      } else {
        console.log('ℹ️ No hot creators found, using fallback');
        // Fallback mock data
        const mockCreators: Creator[] = [
          {
            id: 'mock-creator-1',
            username: 'asibe_cheta',
            display_name: 'Asibe Cheta',
            bio: 'Music creator',
            followers_count: 0,
            tracks_count: 0,
          },
        ];
        setHotCreators(mockCreators);
      }
    } catch (error) {
      console.error('❌ Error loading hot creators:', error);
      // Fallback mock data
      const mockCreators: Creator[] = [
        {
          id: 'fallback-creator-1',
          username: 'asibe_cheta',
          display_name: 'Asibe Cheta',
          bio: 'Music creator',
          followers_count: 0,
          tracks_count: 0,
        },
      ];
      setHotCreators(mockCreators);
    } finally {
      setLoadingCreators(false);
    }
  };

  const loadEvents = async () => {
    try {
      console.log('🔧 Loading events...');
      const { data, error } = await dbHelpers.getUpcomingEvents(3);
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        const transformedEvents: Event[] = data.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          image_url: event.image_url,
          organizer: {
            id: 'organizer-1',
            username: 'event_organizer',
            display_name: 'Event Organizer',
            avatar_url: undefined,
          },
        }));
        
        setEvents(transformedEvents);
        console.log('✅ Events loaded:', transformedEvents.length);
      } else {
        console.log('ℹ️ No events found, using mock data');
        // Enhanced mock events data
        const mockEvents: Event[] = [
          {
            id: 'mock-event-1',
            title: 'Virtual Music Showcase',
            description: 'Join us for an evening of new music from talented creators',
            event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Online Event',
            image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
            organizer: {
              id: 'organizer-1',
              username: 'event_organizer',
              display_name: 'Music Events',
              avatar_url: undefined,
            },
          },
          {
            id: 'mock-event-2',
            title: 'Beat Making Workshop',
            description: 'Learn the fundamentals of music production',
            event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Community Center',
            cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
            organizer: {
              id: 'organizer-2',
              username: 'workshop_host',
              display_name: 'Production Academy',
              avatar_url: undefined,
            },
          },
        ];
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('❌ Error loading events:', error);
      // Enhanced mock events fallback
      const mockEvents: Event[] = [
        {
          id: 'fallback-event-1',
          title: 'Music Meetup',
          description: 'Connect with local musicians and creators',
          event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Local Venue',
          cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          organizer: {
            id: 'fallback-organizer',
            username: 'music_community',
            display_name: 'Music Community',
            avatar_url: undefined,
          },
        },
      ];
      setEvents(mockEvents);
    } finally {
      setLoadingEvents(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeContent();
    setRefreshing(false);
  };

  const handleTrackPress = async (track: AudioTrack) => {
    navigation.navigate('TrackDetails' as never, { trackId: track.id, track: track } as never);
  };

  const handleTrackPlay = async (track: AudioTrack) => {
    try {
      console.log('🎵 Playing track from Home:', track.title);
      await play(track);
      
      // Add other tracks from current view to queue
      if (trendingTracks.length > 0) {
        const otherTracks = trendingTracks.filter(t => t.id !== track.id);
        otherTracks.forEach(t => addToQueue(t));
      }
      
      // Also add recent tracks to queue if available
      if (recentTracks.length > 0) {
        const otherRecentTracks = recentTracks.filter(t => t.id !== track.id);
        otherRecentTracks.forEach(t => addToQueue(t));
      }
      
      // Mini player will now handle showing the currently playing track
      // Navigation to full player is handled by mini player expand button
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Playbook Error', 'Failed to play the track. Please try again.');
    }
  };

  const handleCreatorPress = (creator: Creator) => {
    navigation.navigate('CreatorProfile' as never, { creatorId: creator.id, creator: creator } as never);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails' as never, { eventId: event.id, event: event } as never);
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
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.notificationButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Creator Banner */}
      <TouchableOpacity style={[styles.creatorBanner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={navigateToCreatorSetup}>
        <View style={styles.creatorBannerContent}>
          <View style={styles.creatorBannerLeft}>
            <Ionicons name="star" size={20} color={theme.colors.primary} />
            <Text style={[styles.creatorBannerTitle, { color: theme.colors.text }]}>Share Your Sound</Text>
          </View>
          <View style={styles.creatorBannerRight}>
            <Text style={[styles.creatorBannerSubtitle, { color: theme.colors.textSecondary }]}>Get support from fans</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Featured Creator Hero */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Featured Creator</Text>
            <Text style={styles.heroSubtitle}>
              {loadingFeatured ? 'Loading...' : 'Discover amazing talent'}
            </Text>
            <TouchableOpacity style={styles.heroButton}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.heroButtonText}>Explore</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Trending Tracks - Collapsible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={() => setIsTrendingExpanded(!isTrendingExpanded)}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Trending Now</Text>
            <Ionicons 
              name={isTrendingExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#DC2626" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToTrending}>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        {isTrendingExpanded && (
          <>
            {loadingTrending ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading trending tracks...</Text>
              </View>
            ) : trendingTracks.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {trendingTracks.map((track, index) => (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.trackCard, { marginLeft: index === 0 ? 0 : 12 }]}
                    onPress={() => handleTrackPress(track)}
                  >
                    <View style={[styles.trackCover, { backgroundColor: theme.colors.surface }]}>
                  {(() => {
                    const imageUrl = track.cover_art_url;
                    console.log(`🖼️ Trending track "${track.title}" - imageUrl: ${imageUrl}`);
                    
                    return imageUrl ? (
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.trackImage}
                        onError={(error) => {
                          console.log(`❌ Trending image failed to load for "${track.title}": ${imageUrl}`, error);
                        }}
                        onLoad={() => {
                          console.log(`✅ Trending image loaded successfully for "${track.title}": ${imageUrl}`);
                        }}
                      />
                    ) : (
                      <View style={[styles.defaultTrackImage, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="musical-notes" size={32} color={theme.colors.textSecondary} />
                      </View>
                    );
                  })()}
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
                    </Text>
                    <Text style={[styles.trackDuration, { color: theme.colors.textSecondary }]}>
                      {formatDuration(track.duration)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No trending tracks yet</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Recent Uploads */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={navigateToRecentMusic}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Music</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToRecentMusic}>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {loadingRecent ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading recent tracks...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {/* Column 1 */}
            <View style={styles.musicColumn}>
              {(recentTracks.length > 0 ? recentTracks.slice(0, 2) : [
                {
                  id: 'mock-recent-1',
                  title: 'Summer Vibes',
                  creator: { id: '1', username: 'artist1', display_name: 'Artist One' },
                  duration: 180,
                  plays_count: 1250,
                  likes_count: 89,
                  created_at: new Date().toISOString(),
                  cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                },
                {
                  id: 'mock-recent-2',
                  title: 'Night Drive',
                  creator: { id: '2', username: 'artist2', display_name: 'Artist Two' },
                  duration: 210,
                  plays_count: 890,
                  likes_count: 67,
                  created_at: new Date().toISOString(),
                  cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                }
              ]).map((track, index) => (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.trackRow, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
                  onPress={() => handleTrackPress(track)}
                >
                  <View style={[styles.trackRowCover, { backgroundColor: theme.colors.surface }]}>
                    {(() => {
                      const imageUrl = track.cover_art_url;
                      return imageUrl ? (
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.trackRowImage}
                          onError={(error) => {
                            console.log(`❌ Image failed to load for "${track.title}": ${imageUrl}`, error);
                          }}
                          onLoad={() => {
                            console.log(`✅ Image loaded successfully for "${track.title}": ${imageUrl}`);
                          }}
                        />
                      ) : (
                        <View style={[styles.defaultTrackRowImage, { backgroundColor: theme.colors.surface }]}>
                          <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                        </View>
                      );
                    })()}
                  </View>
                  <View style={styles.trackRowInfo}>
                    <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
                    </Text>
                  </View>
                  <View style={styles.trackRowActions}>
                      <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.colors.primary + '20' }]} onPress={() => handleTrackPlay(track)}>
                        <Ionicons name="play" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    <Text style={[styles.trackRowDuration, { color: theme.colors.textSecondary }]}>
                      {formatDuration(track.duration)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Column 2 */}
            <View style={styles.musicColumn}>
              {[
                {
                  id: 'mock-recent-3',
                  title: 'Ocean Waves',
                  creator: { id: '3', username: 'artist3', display_name: 'Wave Sounds' },
                  duration: 195,
                  plays_count: 1100,
                  likes_count: 78,
                  created_at: new Date().toISOString(),
                  image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
                },
                {
                  id: 'mock-recent-4',
                  title: 'City Lights',
                  creator: { id: '4', username: 'artist4', display_name: 'Urban Beats' },
                  duration: 225,
                  plays_count: 950,
                  likes_count: 92,
                  created_at: new Date().toISOString(),
                  cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                }
              ].map((track, index) => (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.trackRow, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
                  onPress={() => handleTrackPress(track)}
                >
                  <View style={[styles.trackRowCover, { backgroundColor: theme.colors.surface }]}>
                    <Image 
                      source={{ uri: track.cover_art_url }} 
                      style={styles.trackRowImage}
                      onError={(error) => {
                        console.log(`❌ Image failed to load for "${track.title}": ${track.cover_art_url}`, error);
                      }}
                      onLoad={() => {
                        console.log(`✅ Image loaded successfully for "${track.title}": ${track.cover_art_url}`);
                      }}
                    />
                  </View>
                  <View style={styles.trackRowInfo}>
                    <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {track.creator?.display_name || 'Unknown Artist'}
                    </Text>
                  </View>
                  <View style={styles.trackRowActions}>
                      <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.colors.primary + '20' }]} onPress={() => handleTrackPlay(track)}>
                        <Ionicons name="play" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    <Text style={[styles.trackRowDuration, { color: theme.colors.textSecondary }]}>
                      {formatDuration(track.duration)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Column 3 */}
            <View style={styles.musicColumn}>
              {[
                {
                  id: 'mock-recent-5',
                  title: 'Midnight Jazz',
                  creator: { id: '5', username: 'artist5', display_name: 'Jazz Collective' },
                  duration: 240,
                  plays_count: 1350,
                  likes_count: 105,
                  created_at: new Date().toISOString(),
                  cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                },
                {
                  id: 'mock-recent-6',
                  title: 'Electric Dreams',
                  creator: { id: '6', username: 'artist6', display_name: 'Synth Wave' },
                  duration: 200,
                  plays_count: 875,
                  likes_count: 64,
                  created_at: new Date().toISOString(),
                  cover_image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                }
              ].map((track, index) => (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.trackRow, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
                  onPress={() => handleTrackPress(track)}
                >
                  <View style={[styles.trackRowCover, { backgroundColor: theme.colors.surface }]}>
                    <Image 
                      source={{ uri: track.cover_art_url }} 
                      style={styles.trackRowImage}
                      onError={(error) => {
                        console.log(`❌ Image failed to load for "${track.title}": ${track.cover_art_url}`, error);
                      }}
                      onLoad={() => {
                        console.log(`✅ Image loaded successfully for "${track.title}": ${track.cover_art_url}`);
                      }}
                    />
                  </View>
                  <View style={styles.trackRowInfo}>
                    <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {track.creator?.display_name || 'Unknown Artist'}
                    </Text>
                  </View>
                  <View style={styles.trackRowActions}>
                      <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.colors.primary + '20' }]} onPress={() => handleTrackPlay(track)}>
                        <Ionicons name="play" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    <Text style={[styles.trackRowDuration, { color: theme.colors.textSecondary }]}>
                      {formatDuration(track.duration)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Hot Creators */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={navigateToHotCreators}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hot Creators</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToHotCreators}>
            <Ionicons name="chevron-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
        
        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading creators...</Text>
          </View>
        ) : hotCreators.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {hotCreators.map((creator, index) => (
              <TouchableOpacity
                key={creator.id}
                style={[styles.creatorCard, { marginLeft: index === 0 ? 0 : 12 }]}
                onPress={() => handleCreatorPress(creator)}
              >
                <View style={[styles.creatorAvatar, { backgroundColor: theme.colors.surface }]}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorImage} />
                  ) : (
                    <View style={[styles.defaultCreatorImage, { backgroundColor: theme.colors.surface }]}>
                      <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
                  {creator?.display_name || creator?.username || 'Unknown Creator'}
                </Text>
                <Text style={[styles.creatorUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  @{creator.username}
                </Text>
                <Text style={[styles.creatorStats, { color: theme.colors.textSecondary }]}>
                  {creator.followers_count?.toLocaleString()} followers
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No creators found</Text>
          </View>
        )}
      </View>

      {/* Events */}
      <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity 
              style={styles.sectionTitleContainer}
              onPress={navigateToEvents}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Events</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToEvents}>
              <Ionicons name="chevron-forward" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
          
          {loadingEvents ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading events...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {/* Events Column 1 */}
              <View style={styles.eventsColumn}>
                {(events.length > 0 ? events.slice(0, 2) : [
                  {
                    id: 'mock-event-1',
                    title: 'Virtual Music Showcase',
                    description: 'Join us for an evening of new music from talented creators',
                    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Online Event',
                    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-1', username: 'event_organizer', display_name: 'Music Events', avatar_url: undefined },
                  },
                  {
                    id: 'mock-event-2',
                    title: 'Jazz Night Live',
                    description: 'An intimate jazz performance featuring local artists',
                    event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Blue Note Cafe',
                    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-2', username: 'jazz_events', display_name: 'Jazz Collective', avatar_url: undefined },
                  }
                ]).map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[styles.eventImageContainer, { backgroundColor: theme.colors.card }]}>
                  {event.image_url ? (
                    <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                  ) : (
                        <View style={[styles.defaultEventImage, { backgroundColor: theme.colors.card }]}>
                          <Ionicons name="calendar" size={24} color={theme.colors.textSecondary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
                        {formatDate(event.event_date)}
                      </Text>
                      {event.location && (
                        <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          📍 {event.location}
                        </Text>
                      )}
                      <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {event.organizer?.display_name || event.organizer?.username || 'Unknown Organizer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Events Column 2 */}
              <View style={styles.eventsColumn}>
                {[
                  {
                    id: 'mock-event-3',
                    title: 'Electronic Music Festival',
                    description: 'A day-long celebration of electronic music and digital art',
                    event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'City Park Amphitheater',
                    cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-3', username: 'electronic_events', display_name: 'EDM Collective', avatar_url: undefined },
                  },
                  {
                    id: 'mock-event-4',
                    title: 'Acoustic Sessions',
                    description: 'Intimate acoustic performances in a cozy setting',
                    event_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'The Coffee House',
                    cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-4', username: 'acoustic_nights', display_name: 'Acoustic Vibes', avatar_url: undefined },
                  }
                ].map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[styles.eventImageContainer, { backgroundColor: theme.colors.card }]}>
                      <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
                        {formatDate(event.event_date)}
                      </Text>
                      {event.location && (
                        <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          📍 {event.location}
                        </Text>
                      )}
                      <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {event.organizer?.display_name || 'Unknown Organizer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Events Column 3 */}
              <View style={styles.eventsColumn}>
                {[
                  {
                    id: 'mock-event-5',
                    title: 'Hip-Hop Cypher Night',
                    description: 'Open mic night for hip-hop artists and freestyle battles',
                    event_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Underground Club',
                    cover_image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-5', username: 'hiphop_events', display_name: 'Hip-Hop Community', avatar_url: undefined },
                  },
                  {
                    id: 'mock-event-6',
                    title: 'Classical Concert Series',
                    description: 'Monthly classical music performances by local orchestra',
                    event_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Symphony Hall',
                    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-6', username: 'classical_music', display_name: 'City Orchestra', avatar_url: undefined },
                  }
                ].map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[styles.eventImageContainer, { backgroundColor: theme.colors.card }]}>
                      <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
                        {formatDate(event.event_date)}
                      </Text>
                      {event.location && (
                        <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          📍 {event.location}
                        </Text>
                      )}
                      <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {event.organizer?.display_name || 'Unknown Organizer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  creatorBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  creatorBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  creatorBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorBannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  heroSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  trackCard: {
    width: 140,
    marginRight: 12,
  },
  trackCover: {
    width: 140,
    height: 140,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  trackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  defaultTrackImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 11,
  },
  tracksList: {
    paddingHorizontal: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  trackRowCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackRowImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultTrackRowImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  trackRowInfo: {
    flex: 1,
  },
  trackRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackRowArtist: {
    fontSize: 12,
  },
  trackRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRowDuration: {
    fontSize: 11,
  },
  creatorCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  creatorImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  defaultCreatorImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  creatorName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  creatorUsername: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 2,
  },
  creatorStats: {
    fontSize: 9,
    textAlign: 'center',
  },
  eventsList: {
    paddingHorizontal: 16,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  eventImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultEventImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 11,
    marginBottom: 2,
  },
  eventOrganizer: {
    fontSize: 11,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
  },
  bottomPadding: {
    height: 100,
  },
  // Apple Music-style horizontal scrolling columns
  musicColumn: {
    width: width * 0.85, // 85% of screen width
    marginRight: 16,
    paddingHorizontal: 16,
  },
  eventsColumn: {
    width: width * 0.85, // 85% of screen width
    marginRight: 16,
    paddingHorizontal: 16,
  },
});