import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { supabase, dbHelpers } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  audio_url?: string;
  file_url?: string;
  cover_image_url?: string;
  artwork_url?: string;
  duration?: number;
  plays_count?: number;
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
  cover_image_url?: string;
  organizer: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  tracks_count?: number;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type TabType = 'Music' | 'Artists' | 'Events' | 'Playlists';

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { play, addToQueue } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('Music');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Content states
  const [trendingTracks, setTrendingTracks] = useState<AudioTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Search states
  const [searchResults, setSearchResults] = useState<{
    tracks: AudioTrack[];
    artists: Creator[];
  }>({ tracks: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  // Loading states
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  const tabs: TabType[] = ['Music', 'Artists', 'Events', 'Playlists'];

  useEffect(() => {
    loadDiscoverContent();
  }, [activeTab]);

  const loadDiscoverContent = async () => {
    try {
      switch (activeTab) {
        case 'Music':
          await Promise.all([loadTrendingTracks(), loadRecentTracks()]);
          break;
        case 'Artists':
          await loadFeaturedArtists();
          break;
        case 'Events':
          await loadEvents();
          break;
        case 'Playlists':
          await loadPlaylists();
          break;
      }
    } catch (error) {
      console.error('Error loading discover content:', error);
    }
  };

  const loadTrendingTracks = async () => {
    try {
      console.log('🔧 DiscoverScreen: Loading trending tracks...');
      // Enhanced mock trending tracks with artwork (since we don't have a trending endpoint)
      const mockTrending: AudioTrack[] = [
        {
          id: 'discover-trending-1',
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
          id: 'discover-trending-2',
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
          id: 'discover-trending-3',
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
      console.log('✅ DiscoverScreen: Trending tracks loaded (mock data):', mockTrending.length);
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading trending tracks:', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const loadRecentTracks = async () => {
    try {
      console.log('🔧 DiscoverScreen: Loading recent tracks...');
      // Try to load real tracks from Supabase - get all columns to find artwork
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ DiscoverScreen: Supabase error loading recent tracks:', error);
        // Fallback to mock data
        const mockTracks: AudioTrack[] = [
          {
            id: 'discover-recent-1',
            title: 'Untitled Audio File',
            cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
            artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
            creator: {
              id: 'discover-creator-1',
              username: 'asibe_cheta',
              display_name: 'Asibe Cheta',
            },
            duration: 180,
            plays_count: 45,
            likes_count: 12,
            created_at: new Date().toISOString(),
          },
          {
            id: 'discover-recent-2',
            title: 'My Song Hits',
            cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            creator: {
              id: 'discover-creator-2',
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
        console.log('✅ DiscoverScreen: Recent tracks loaded (fallback mock data):', mockTracks.length);
      } else if (data && data.length > 0) {
        const fallbackImages = [
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center',
        ];
        
        const transformedTracks: AudioTrack[] = data.map((track, index) => {
          // Try multiple possible column names for artwork
          const imageUrl = track.cover_image_url || 
                           track.cover_url || 
                           track.artwork_url || 
                           track.image_url ||
                           track.thumbnail_url ||
                           track.cover ||
                           track.artwork ||
                           track.image ||
                           fallbackImages[index % fallbackImages.length];
          
          console.log(`🖼️ DiscoverScreen Track "${track.title}" artwork check:`, {
            cover_image_url: track.cover_image_url,
            cover_url: track.cover_url,
            artwork_url: track.artwork_url,
            image_url: track.image_url,
            thumbnail_url: track.thumbnail_url,
            cover: track.cover,
            artwork: track.artwork,
            image: track.image,
            final: imageUrl
          });
          
          return {
            id: track.id,
            title: track.title || 'Untitled Track',
            description: track.description,
            audio_url: track.audio_url || track.file_url,
            file_url: track.file_url,
            cover_image_url: imageUrl,
            artwork_url: imageUrl,
            duration: track.duration || 180,
            plays_count: track.plays_count || track.play_count || 0,
            likes_count: track.likes_count || track.like_count || 0,
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
        console.log('✅ DiscoverScreen: Recent tracks loaded from Supabase:', transformedTracks.length);
      } else {
        console.log('ℹ️ DiscoverScreen: No recent tracks found, using mock data');
        // Mock data fallback
        const mockTracks: AudioTrack[] = [
          {
            id: 'discover-empty-1',
            title: 'Demo Track',
            cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
            artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
            creator: {
              id: 'demo-creator',
              username: 'demo_artist',
              display_name: 'Demo Artist',
            },
            duration: 180,
            plays_count: 0,
            likes_count: 0,
            created_at: new Date().toISOString(),
          },
        ];
        setRecentTracks(mockTracks);
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading recent tracks:', error);
      setRecentTracks([]);
    }
  };

  const loadFeaturedArtists = async () => {
    try {
      console.log('🔧 DiscoverScreen: Loading featured artists...');
      
      // Try to load real creators from the database
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          followers_count,
          tracks_count,
          is_creator,
          is_verified
        `)
        .eq('role', 'creator')
        .eq('is_creator', true)
        .order('followers_count', { ascending: false })
        .limit(10);
      
      console.log('🔍 DiscoverScreen: Raw featured artists data:', data);
      console.log('🔍 DiscoverScreen: Featured artists error:', error);
      
      if (data && data.length > 0 && !error) {
        console.log('✅ DiscoverScreen: Featured artists loaded from Supabase:', data.length);
        
        // Transform the data to match our Creator interface
        const transformedArtists: Creator[] = data.map(artist => ({
          id: artist.id,
          username: artist.username,
          display_name: artist.display_name || artist.username,
          bio: artist.bio || 'Music creator',
          avatar_url: artist.avatar_url,
          followers_count: artist.followers_count || 0,
          tracks_count: artist.tracks_count || 0,
          is_creator: artist.is_creator,
          is_verified: artist.is_verified || false,
        }));
        
        setFeaturedArtists(transformedArtists);
        console.log('✅ DiscoverScreen: Transformed featured artists:', transformedArtists.length);
        transformedArtists.forEach(artist => {
          console.log(`🎵 Artist: "${artist.display_name}" (@${artist.username}) - ${artist.followers_count} followers`);
        });
      } else {
        console.log('ℹ️ DiscoverScreen: No featured artists found in database, trying alternative query...');
        
        // Try alternative query without role filter
        const { data: altData, error: altError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            display_name,
            bio,
            avatar_url,
            followers_count,
            tracks_count,
            is_creator,
            is_verified
          `)
          .eq('is_creator', true)
          .order('followers_count', { ascending: false })
          .limit(10);
        
        console.log('🔍 DiscoverScreen: Alternative query data:', altData);
        console.log('🔍 DiscoverScreen: Alternative query error:', altError);
        
        if (altData && altData.length > 0 && !altError) {
          const transformedArtists: Creator[] = altData.map(artist => ({
            id: artist.id,
            username: artist.username,
            display_name: artist.display_name || artist.username,
            bio: artist.bio || 'Music creator',
            avatar_url: artist.avatar_url,
            followers_count: artist.followers_count || 0,
            tracks_count: artist.tracks_count || 0,
            is_creator: artist.is_creator,
            is_verified: artist.is_verified || false,
          }));
          
          setFeaturedArtists(transformedArtists);
          console.log('✅ DiscoverScreen: Using alternative query results:', transformedArtists.length);
        } else {
          console.log('ℹ️ DiscoverScreen: No creators found, using enhanced mock data');
          // Enhanced mock data with better variety
          const mockArtists: Creator[] = [
            {
              id: 'discover-artist-1',
              username: 'asibe_cheta',
              display_name: 'Asibe Cheta',
              bio: 'Music creator and producer',
              avatar_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face',
              followers_count: 1250,
              tracks_count: 25,
              is_creator: true,
              is_verified: true,
            },
            {
              id: 'discover-artist-2',
              username: 'beat_maker_pro',
              display_name: 'Beat Maker Pro',
              bio: 'Electronic music producer',
              avatar_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&h=150&fit=crop&crop=face',
              followers_count: 890,
              tracks_count: 18,
              is_creator: true,
              is_verified: false,
            },
            {
              id: 'discover-artist-3',
              username: 'indie_sound',
              display_name: 'Indie Sound',
              bio: 'Indie rock and alternative music',
              avatar_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&h=150&fit=crop&crop=face',
              followers_count: 2100,
              tracks_count: 32,
              is_creator: true,
              is_verified: true,
            },
          ];
          setFeaturedArtists(mockArtists);
        }
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading featured artists:', error);
      setFeaturedArtists([]);
    } finally {
      setLoadingArtists(false);
    }
  };

  const loadEvents = async () => {
    try {
      console.log('🔧 DiscoverScreen: Loading events...');
      const { data, error } = await dbHelpers.getUpcomingEvents(10);
      
      if (error) {
        console.error('❌ DiscoverScreen: Supabase error loading events:', error);
        // Fallback to mock data
        const mockEvents: Event[] = [
          {
            id: 'discover-event-1',
            title: 'Virtual Music Showcase',
            description: 'Join us for an evening of new music from talented creators',
            event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Online Event',
            cover_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
            organizer: {
              id: 'discover-organizer-1',
              username: 'event_organizer',
              display_name: 'Music Events',
              avatar_url: undefined,
            },
          },
          {
            id: 'discover-event-2',
            title: 'Beat Making Workshop',
            description: 'Learn the fundamentals of music production',
            event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Community Center',
            cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
            organizer: {
              id: 'discover-organizer-2',
              username: 'workshop_host',
              display_name: 'Production Academy',
              avatar_url: undefined,
            },
          },
        ];
        setEvents(mockEvents);
        console.log('✅ DiscoverScreen: Events loaded (fallback mock data):', mockEvents.length);
      } else if (data && data.length > 0) {
        const transformedEvents: Event[] = data.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          cover_image_url: event.image_url,
          organizer: {
            id: 'organizer-' + event.id,
            username: 'event_organizer',
            display_name: 'Event Organizer',
            avatar_url: undefined,
          },
        }));
        
        setEvents(transformedEvents);
        console.log('✅ DiscoverScreen: Events loaded from Supabase:', transformedEvents.length);
      } else {
        console.log('ℹ️ DiscoverScreen: No events found, using mock data');
        const mockEvents: Event[] = [
          {
            id: 'discover-empty-event',
            title: 'Music Meetup',
            description: 'Connect with local musicians and creators',
            event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Local Venue',
            cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            organizer: {
              id: 'discover-organizer-empty',
              username: 'music_community',
              display_name: 'Music Community',
              avatar_url: undefined,
            },
          },
        ];
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      console.log('🔧 Loading playlists...');
      // Note: Playlists functionality would need to be implemented in the database
      // For now, we'll just set empty playlists since this table doesn't exist yet
      console.log('ℹ️ Playlists feature not implemented yet');
      setPlaylists([]);
    } catch (error) {
      console.error('Error loading playlists:', error);
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiscoverContent();
    setRefreshing(false);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [] });
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 Searching for:', query);

      const [tracksResult, artistsResult] = await Promise.all([
        db.searchTracks(query.trim(), 20),
        db.searchProfiles(query.trim(), 10)
      ]);

      const tracks = tracksResult.success ? tracksResult.data || [] : [];
      const artists = artistsResult.success ? artistsResult.data || [] : [];

      setSearchResults({ tracks, artists });
      console.log('✅ Search results:', tracks.length, 'tracks,', artists.length, 'artists');
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ tracks: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleTrackPress = async (track: AudioTrack) => {
    navigation.navigate('TrackDetails' as never, { trackId: track.id, track: track } as never);
  };

  const handleTrackPlay = async (track: AudioTrack) => {
    try {
      console.log('🎵 Playing track from Discover:', track.title);
      await play(track);
      
      // Optionally add other tracks from current view to queue
      if (trendingTracks.length > 0) {
        const otherTracks = trendingTracks.filter(t => t.id !== track.id);
        otherTracks.forEach(t => addToQueue(t));
      }
      
      // Mini player will now handle showing the currently playing track
      // Navigation to full player is handled by mini player expand button
    } catch (error) {
      console.error('Failed to play track:', error);
      Alert.alert('Playback Error', 'Failed to play track');
    }
  };

  const handleArtistPress = (artist: Creator) => {
    navigation.navigate('CreatorProfile' as never, { creatorId: artist.id, creator: artist } as never);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails' as never, { eventId: event.id, event: event } as never);
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    console.log('Viewing playlist:', playlist.name);
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

  const renderMusicTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Trending Now */}
      <Section title="Trending Now">
        {loadingTracks ? (
          <LoadingState text="Loading trending tracks..." />
        ) : trendingTracks.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalScroll}>
              {trendingTracks.map((track) => (
                <TouchableOpacity key={track.id} style={styles.trendingCard} onPress={() => handleTrackPress(track)}>
                  <View style={styles.trackCover}>
                    {track.cover_image_url ? (
                      <Image source={{ uri: track.cover_image_url }} style={styles.trendingImage} />
                    ) : (
                      <View style={styles.defaultTrackImage}>
                        <Ionicons name="musical-notes" size={32} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.playOverlay}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={[styles.trendingTitle, { color: theme.colors.text }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={[styles.trendingArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>by {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}</Text>
                  <Text style={[styles.trackDuration, { color: theme.colors.textSecondary }]}>{formatDuration(track.duration)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState icon="musical-notes" text="No trending tracks yet" />
        )}
      </Section>

      {/* Featured Artists */}
      <Section title="Featured Artists">
        {loadingArtists ? (
          <LoadingState text="Loading artists..." />
        ) : featuredArtists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalScroll}>
              {featuredArtists.map((artist) => (
                <TouchableOpacity key={artist.id} style={styles.artistCard} onPress={() => handleArtistPress(artist)}>
                  <View style={styles.artistAvatarContainer}>
                    {artist.avatar_url ? (
                      <Image source={{ uri: artist.avatar_url }} style={styles.artistAvatar} />
                    ) : (
                      <View style={styles.defaultArtistAvatar}>
                        <Ionicons name="person" size={24} color="#666" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.artistName} numberOfLines={1}>{artist?.display_name || artist?.username || 'Unknown Artist'}</Text>
                  <Text style={styles.artistHandle} numberOfLines={1}>@{artist.username}</Text>
                  <Text style={styles.artistStats}>{artist.followers_count?.toLocaleString()} followers</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState icon="people" text="No featured artists" />
        )}
      </Section>

      {/* Recent Uploads */}
      <Section title="Recent Music">
        {loadingTracks ? (
          <LoadingState text="Loading recent tracks..." />
        ) : recentTracks.length > 0 ? (
          <View style={[styles.tracksList, { backgroundColor: theme.colors.background }]}>
            {recentTracks.map((track) => (
              <TouchableOpacity key={track.id} style={[styles.trackRow, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]} onPress={() => handleTrackPress(track)}>
                <View style={[styles.trackRowCover, { backgroundColor: theme.colors.surface }]}>
                  {(track.cover_image_url || track.artwork_url) ? (
                    <Image 
                      source={{ uri: track.cover_image_url || track.artwork_url }} 
                      style={styles.trackRowImage}
                      onError={(error) => {
                        console.log(`❌ DiscoverScreen Image failed to load for "${track.title}": ${track.cover_image_url || track.artwork_url}`, error);
                      }}
                      onLoad={() => {
                        console.log(`✅ DiscoverScreen Image loaded successfully for "${track.title}": ${track.cover_image_url || track.artwork_url}`);
                      }}
                    />
                  ) : (
                    <View style={[styles.defaultTrackRowImage, { backgroundColor: theme.colors.surface }]}>
                      <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.trackRowInfo}>
                  <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>by {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}</Text>
                </View>
                <View style={styles.trackRowActions}>
                  <TouchableOpacity style={[styles.playButton, { backgroundColor: theme.colors.primary + '20' }]} onPress={() => handleTrackPlay(track)}>
                    <Ionicons name="play" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.trackRowDuration, { color: theme.colors.textSecondary }]}>{formatDuration(track.duration)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="musical-notes" text="No recent uploads" />
        )}
      </Section>
    </ScrollView>
  );

  const renderArtistsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Section title="All Artists">
        {loadingArtists ? (
          <LoadingState text="Loading artists..." />
        ) : featuredArtists.length > 0 ? (
          <View style={styles.artistsGrid}>
            {featuredArtists.map((artist) => (
              <TouchableOpacity key={artist.id} style={[styles.artistGridCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => handleArtistPress(artist)}>
                <View style={styles.artistAvatarContainer}>
                  {artist.avatar_url ? (
                    <Image source={{ uri: artist.avatar_url }} style={styles.artistAvatar} />
                  ) : (
                    <View style={styles.defaultArtistAvatar}>
                      <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <Text style={[styles.artistName, { color: theme.colors.text }]} numberOfLines={1}>{artist?.display_name || artist?.username || 'Unknown Artist'}</Text>
                <Text style={[styles.artistHandle, { color: theme.colors.textSecondary }]} numberOfLines={1}>@{artist.username}</Text>
                <Text style={[styles.artistBio, { color: theme.colors.textSecondary }]} numberOfLines={2}>{artist.bio}</Text>
                <Text style={[styles.artistStats, { color: theme.colors.textSecondary }]}>{artist.followers_count?.toLocaleString()} followers • {artist.tracks_count} tracks</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="people" text="No artists found" />
        )}
      </Section>
    </ScrollView>
  );

  const renderEventsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Section title="Upcoming Events">
        {loadingEvents ? (
          <LoadingState text="Loading events..." />
        ) : events.length > 0 ? (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => handleEventPress(event)}>
                <View style={styles.eventImageContainer}>
                  {event.cover_image_url ? (
                    <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} />
                  ) : (
                    <View style={styles.defaultEventImage}>
                      <Ionicons name="calendar" size={24} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
                  {event.location && (
                    <Text style={styles.eventLocation} numberOfLines={1}>📍 {event.location}</Text>
                  )}
                  <Text style={styles.eventOrganizer} numberOfLines={1}>by {event.organizer?.display_name || event.organizer?.username || 'Unknown Organizer'}</Text>
                  {event.description && (
                    <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="calendar" text="No upcoming events" />
        )}
      </Section>
    </ScrollView>
  );

  const renderPlaylistsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Section title="Featured Playlists">
        {loadingPlaylists ? (
          <LoadingState text="Loading playlists..." />
        ) : playlists.length > 0 ? (
          <View style={styles.playlistsList}>
            {playlists.map((playlist) => (
              <TouchableOpacity key={playlist.id} style={styles.playlistCard} onPress={() => handlePlaylistPress(playlist)}>
                <View style={styles.playlistCover}>
                  {playlist.cover_image_url ? (
                    <Image source={{ uri: playlist.cover_image_url }} style={styles.playlistImage} />
                  ) : (
                    <View style={styles.defaultPlaylistImage}>
                      <Ionicons name="musical-notes" size={32} color="#666" />
                    </View>
                  )}
                  <View style={styles.playlistOverlay}>
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistTitle} numberOfLines={1}>{playlist.name}</Text>
                  <Text style={styles.playlistCreator} numberOfLines={1}>by {playlist.creator?.display_name || playlist.creator?.username || 'Unknown Creator'}</Text>
                  <Text style={styles.playlistDescription} numberOfLines={2}>{playlist.description}</Text>
                  <Text style={styles.playlistStats}>{playlist.tracks_count} tracks</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="musical-notes" text="No playlists found" />
        )}
      </Section>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Music':
        return renderMusicTab();
      case 'Artists':
        return renderArtistsTab();
      case 'Events':
        return renderEventsTab();
      case 'Playlists':
        return renderPlaylistsTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Discover</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="filter-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            placeholder="Search for creators, music, events..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab, 
                  activeTab === tab && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.tabText, 
                  { color: theme.colors.textSecondary },
                  activeTab === tab && { color: theme.colors.primary, fontWeight: 'bold' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

// Section Component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

// Loading State Component
function LoadingState({ text }: { text: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.loadingContainer}>
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

// Empty State Component
function EmptyState({ icon, text }: { icon: string; text: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={48} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
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
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  horizontalScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: 160,
    gap: 8,
  },
  trackCover: {
    width: 160,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultTrackImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendingArtist: {
    fontSize: 12,
  },
  trackDuration: {
    fontSize: 11,
  },
  artistCard: {
    width: 120,
    alignItems: 'center',
    gap: 8,
  },
  artistAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#DC2626',
    padding: 2,
  },
  artistAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  defaultArtistAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 36,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistHandle: {
    fontSize: 12,
    textAlign: 'center',
  },
  artistStats: {
    fontSize: 11,
    textAlign: 'center',
  },
  artistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  artistGridCard: {
    width: (width - 64) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  artistBio: {
    fontSize: 12,
    textAlign: 'center',
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
    backgroundColor: '#1A1A1A',
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
  eventsList: {
    gap: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
  },
  eventImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  eventOrganizer: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  playlistsList: {
    gap: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  playlistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultPlaylistImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  playlistOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  playlistCreator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  playlistStats: {
    fontSize: 11,
    color: '#999999',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
  },
});