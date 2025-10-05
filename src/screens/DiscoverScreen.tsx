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
  ActivityIndicator,
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
  cover_art_url?: string;
  artwork_url?: string;
  duration?: number;
  play_count?: number;
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
  image_url?: string;
  cover_art_url?: string;
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
  cover_art_url?: string;
  tracks_count?: number;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type TabType = 'Music' | 'Artists' | 'Events' | 'Playlists';

function DiscoverScreen() {
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
  
  // Loading states - start as true, will be set to false when loading completes
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false); // Playlists not implemented

  const tabs: TabType[] = ['Music', 'Artists', 'Events', 'Playlists'];

  useEffect(() => {
    loadDiscoverContent();
  }, [activeTab]);

  // Load main content on component mount
  useEffect(() => {
    const loadInitialContent = async () => {
      console.log('🚀 DiscoverScreen: Loading initial content...');
      await Promise.all([
        loadFeaturedArtists(),
        loadEvents(),
        loadTrendingTracks(),
        loadRecentTracks(),
        loadPlaylists()
      ]);
      console.log('✅ DiscoverScreen: Initial content loading completed');
    };
    
    loadInitialContent();
  }, []); // Only run once on mount

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
        default:
          // Load all content for main discover page
          await Promise.all([
            loadTrendingTracks(),
            loadRecentTracks(),
            loadFeaturedArtists(),
            loadEvents(),
            loadPlaylists()
          ]);
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
          cover_art_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
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
          cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
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
          cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
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
            cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
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
            cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
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
          const imageUrl = track.cover_art_url || 
                           track.cover_url || 
                           track.artwork_url || 
                           track.image_url ||
                           track.thumbnail_url ||
                           track.cover ||
                           track.artwork ||
                           track.image ||
                           fallbackImages[index % fallbackImages.length];
          
          // Debug artwork sources (removed to prevent render errors)
          if (__DEV__) {
            console.log('DiscoverScreen Track artwork check:', track.title, imageUrl);
          }
          
          return {
            id: track.id,
            title: track.title || 'Untitled Track',
            description: track.description,
            audio_url: track.audio_url || track.file_url,
            file_url: track.file_url,
            cover_art_url: imageUrl,
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
            cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
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
      
      // Use a simpler query that's more likely to work
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          role
        `)
        .eq('role', 'creator')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('🔍 DiscoverScreen: Featured artists data:', data?.length || 0, 'artists');
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
          followers_count: Math.floor(Math.random() * 1000) + 100, // Mock data for now
          tracks_count: Math.floor(Math.random() * 50) + 5, // Mock data for now
        }));
        
        setFeaturedArtists(transformedArtists);
        console.log('✅ DiscoverScreen: Successfully set featured artists:', transformedArtists.length);
      } else if (error) {
        console.log('❌ DiscoverScreen: Database error, using mock data:', error.message);
        // Use mock data on error
      const mockArtists: Creator[] = [
        {
            id: 'discover-artist-1',
            username: 'asibe_cheta',
            display_name: 'Asibe Cheta',
            bio: 'Music creator and producer',
            avatar_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face',
          followers_count: 1250,
            tracks_count: 25,
          },
          {
            id: 'discover-artist-2',
            username: 'beat_maker_pro',
            display_name: 'Beat Maker Pro',
            bio: 'Electronic music producer',
            avatar_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&h=150&fit=crop&crop=face',
          followers_count: 890,
            tracks_count: 18,
          },
          {
            id: 'discover-artist-3',
            username: 'indie_sound',
            display_name: 'Indie Sound',
            bio: 'Indie rock and alternative music',
            avatar_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&h=150&fit=crop&crop=face',
            followers_count: 2100,
            tracks_count: 32,
          },
          {
            id: 'discover-artist-4',
            username: 'vocal_vibes',
            display_name: 'Vocal Vibes',
            bio: 'R&B and soul vocalist',
            avatar_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&h=150&fit=crop&crop=face',
            followers_count: 756,
            tracks_count: 14,
          },
        ];
        setFeaturedArtists(mockArtists);
        console.log('✅ DiscoverScreen: Using mock artists data');
      } else {
        console.log('ℹ️ DiscoverScreen: No creators found, using mock data');
        // Use mock data if no creators found
        const mockArtists: Creator[] = [
          {
            id: 'discover-artist-1',
            username: 'demo_artist',
            display_name: 'Demo Artist',
            bio: 'Featured music creator',
            avatar_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face',
            followers_count: 500,
            tracks_count: 12,
        },
      ];
      setFeaturedArtists(mockArtists);
        console.log('✅ DiscoverScreen: Using fallback mock data');
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading featured artists:', error);
      // Always provide fallback data
      const fallbackArtists: Creator[] = [
        {
          id: 'fallback-artist-1',
          username: 'soundbridge_artist',
          display_name: 'SoundBridge Artist',
          bio: 'Featured creator on SoundBridge',
          avatar_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face',
          followers_count: 1000,
          tracks_count: 20,
        },
      ];
      setFeaturedArtists(fallbackArtists);
      console.log('✅ DiscoverScreen: Using fallback data due to error');
    } finally {
      setLoadingArtists(false);
      console.log('🏁 DiscoverScreen: Featured artists loading completed');
    }
  };

  const loadEvents = async () => {
    try {
      console.log('🔧 DiscoverScreen: Loading events...');
      
      // Try a simpler events query first
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          image_url
        `)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      console.log('🔍 DiscoverScreen: Events data:', data?.length || 0, 'events');
      console.log('🔍 DiscoverScreen: Events error:', error);

      if (data && data.length > 0 && !error) {
        console.log('✅ DiscoverScreen: Events loaded from Supabase:', data.length);
        
        // Transform the data to match our Event interface
        const transformedEvents: Event[] = data.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          image_url: event.image_url,
          organizer: {
            id: 'event-organizer',
            username: 'event_organizer',
            display_name: 'Event Organizer',
            avatar_url: undefined,
          }
        }));
        
        setEvents(transformedEvents);
        console.log('✅ DiscoverScreen: Successfully set events:', transformedEvents.length);
      } else if (error) {
        console.log('❌ DiscoverScreen: Database error, using mock events:', error.message);
        // Use mock data on error
        const mockEvents: Event[] = [
          {
            id: 'discover-event-1',
            title: 'Virtual Music Showcase',
            description: 'Join us for an evening of new music from talented creators',
            event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Online Event',
            image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
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
            image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
            organizer: {
              id: 'discover-organizer-2',
              username: 'workshop_host',
              display_name: 'Production Academy',
            avatar_url: undefined,
          },
        },
        {
            id: 'discover-event-3',
            title: 'Live Music Night',
            description: 'Experience live performances from local artists',
            event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Music Venue Downtown',
            image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            organizer: {
              id: 'discover-organizer-3',
              username: 'live_music_co',
              display_name: 'Live Music Co',
            avatar_url: undefined,
          },
        },
      ];
        setEvents(mockEvents);
        console.log('✅ DiscoverScreen: Using mock events data');
      } else {
        console.log('ℹ️ DiscoverScreen: No events found, using mock data');
        // Use mock data if no events found
        const mockEvents: Event[] = [
          {
            id: 'discover-event-1',
            title: 'SoundBridge Showcase',
            description: 'Discover new music from emerging artists',
            event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Virtual Event',
            image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
            organizer: {
              id: 'soundbridge-team',
              username: 'soundbridge',
              display_name: 'SoundBridge Team',
              avatar_url: undefined,
            },
          },
        ];
        setEvents(mockEvents);
        console.log('✅ DiscoverScreen: Using fallback mock events');
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading events:', error);
      // Always provide fallback data
      const fallbackEvents: Event[] = [
        {
          id: 'fallback-event-1',
          title: 'Music Discovery Event',
          description: 'Explore new sounds and connect with artists',
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'SoundBridge Platform',
          image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
          organizer: {
            id: 'fallback-organizer',
            username: 'soundbridge_events',
            display_name: 'SoundBridge Events',
            avatar_url: undefined,
          },
        },
      ];
      setEvents(fallbackEvents);
      console.log('✅ DiscoverScreen: Using fallback events due to error');
    } finally {
      setLoadingEvents(false);
      console.log('🏁 DiscoverScreen: Events loading completed');
    }
  };

  const loadPlaylists = async () => {
    try {
      console.log('🔧 DiscoverScreen: Loading playlists...');
      // Note: Playlists functionality would need to be implemented in the database
      // For now, we'll just set empty playlists since this table doesn't exist yet
      console.log('ℹ️ Playlists feature not implemented yet');
      setPlaylists([]);
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading playlists:', error);
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Load all main content on refresh, regardless of active tab
    await Promise.all([
      loadFeaturedArtists(),
      loadEvents(),
      loadTrendingTracks(),
      loadRecentTracks(),
      loadPlaylists()
    ]);
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
        dbHelpers.searchTracks(query.trim(), 20),
        dbHelpers.searchProfiles(query.trim(), 10)
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
    (navigation as any).navigate('TrackDetails', { trackId: track.id, track: track });
  };

  const handleCreatorPress = (creator: Creator) => {
    (navigation as any).navigate('CreatorProfile', { creatorId: creator.id, creator: creator });
  };

  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id, event: event });
  };

  const formatNumber = (num?: number | null) => {
    if (!num && num !== 0) return '0';
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Discover</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for creators, music, events..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content based on active tab */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Tabs - Now inside main ScrollView */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.inlineTabsScrollView}
          contentContainerStyle={styles.inlineTabsContainer}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.inlineTabButton,
                activeTab === tab && styles.activeInlineTabButton
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.inlineTabText,
                  { color: activeTab === tab ? '#DC2626' : theme.colors.textSecondary },
                  activeTab === tab && styles.activeInlineTabText
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {activeTab === 'Music' && (
          <>
            {/* Trending Now */}
            <View style={[styles.section, styles.firstSection]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Trending Now</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
              
        {loadingTracks ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
        ) : trendingTracks.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {trendingTracks.map((track, index) => (
                    <TouchableOpacity
                      key={track.id}
                      style={[styles.trendingCard, { marginLeft: index === 0 ? 16 : 12 }]}
                      onPress={() => handleTrackPress(track)}
                    >
                      <View style={styles.trendingCover}>
                        {track.cover_art_url ? (
                          <Image source={{ uri: track.cover_art_url }} style={styles.trendingImage} />
                        ) : (
                          <View style={styles.defaultTrendingImage}>
                            <Ionicons name="musical-notes" size={40} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.playOverlay}>
                          <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                      <Text style={[styles.trendingTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={[styles.trendingArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
                      </Text>
                      <Text style={[styles.trendingDuration, { color: theme.colors.textSecondary }]}>
                        {formatDuration(track.duration)}
                      </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="trending-up" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No trending tracks yet</Text>
                </View>
        )}
            </View>

      {/* Featured Artists */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Featured Artists</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
              
        {loadingArtists ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading artists...</Text>
                </View>
        ) : featuredArtists.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {featuredArtists.map((artist, index) => (
                    <TouchableOpacity
                      key={artist.id}
                      style={[styles.artistCard, { marginLeft: index === 0 ? 16 : 12 }]}
                      onPress={() => handleCreatorPress(artist)}
                    >
                      <View style={styles.artistCardAvatar}>
                    {artist.avatar_url ? (
                          <Image source={{ uri: artist.avatar_url }} style={styles.artistCardImage} />
                    ) : (
                          <View style={styles.defaultArtistCardImage}>
                            <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
                      </View>
                    )}
                  </View>
                      <Text style={[styles.artistCardName, { color: theme.colors.text }]} numberOfLines={1}>
                        {artist.display_name || artist.username}
                      </Text>
                      <Text style={[styles.artistCardStats, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {formatNumber(artist.followers_count)} followers
                      </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No featured artists yet</Text>
                </View>
              )}
            </View>

            {/* Recent Music */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Music</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
              
        {loadingTracks ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
        ) : recentTracks.length > 0 ? (
                <View style={styles.recentMusicContainer}>
            {recentTracks.slice(0, 5).map((track) => (
                    <TouchableOpacity
                      key={track.id}
                      style={styles.recentTrackItem}
                      onPress={() => handleTrackPress(track)}
                    >
                      <View style={styles.recentTrackCover}>
                        {track.cover_art_url ? (
                          <Image source={{ uri: track.cover_art_url }} style={styles.recentTrackImage} />
                        ) : (
                          <View style={styles.defaultRecentTrackImage}>
                            <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                      <View style={styles.recentTrackInfo}>
                        <Text style={[styles.recentTrackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                          {track.title}
                        </Text>
                        <Text style={[styles.recentTrackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          by {track.creator?.display_name || track.creator?.username || 'Music Creator'}
                        </Text>
                </View>
                      <View style={styles.recentTrackActions}>
                  <TouchableOpacity style={styles.playButton}>
                    <Ionicons name="play" size={16} color="#DC2626" />
                  </TouchableOpacity>
                        <Text style={[styles.recentTrackDuration, { color: theme.colors.textSecondary }]}>
                          {formatDuration(track.duration)}
                        </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No recent music yet</Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'Artists' && (
          <>
            {/* Featured Artists */}
            <View style={[styles.section, styles.firstSection]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>All Artists</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
              
        {loadingArtists ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading artists...</Text>
                </View>
        ) : featuredArtists.length > 0 ? (
                <View style={styles.artistsGridContainer}>
            {featuredArtists.map((artist) => (
                    <TouchableOpacity
                      key={artist.id}
                      style={styles.artistGridCard}
                      onPress={() => handleCreatorPress(artist)}
                    >
                      <View style={styles.artistGridAvatar}>
                  {artist.avatar_url ? (
                          <Image source={{ uri: artist.avatar_url }} style={styles.artistGridImage} />
                  ) : (
                          <View style={styles.defaultArtistGridImage}>
                            <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                      <Text style={[styles.artistGridName, { color: theme.colors.text }]} numberOfLines={1}>
                        {artist.display_name || artist.username}
                      </Text>
                      <Text style={[styles.artistGridUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        @{artist.username}
                      </Text>
                      <Text style={[styles.artistGridStats, { color: theme.colors.textSecondary }]}>
                        {formatNumber(artist.followers_count)} followers
                      </Text>
                      <Text style={[styles.artistGridTracks, { color: theme.colors.textSecondary }]}>
                        {formatNumber(artist.tracks_count)} tracks
                      </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No artists found</Text>
                    </View>
                  )}
                </View>

            {/* Top Artists by Followers */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Artists</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
              </TouchableOpacity>
          </View>
              
              {loadingArtists ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : featuredArtists.length > 0 ? (
                <View style={styles.topArtistsContainer}>
                  {featuredArtists
                    .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
                    .slice(0, 5)
                    .map((artist, index) => (
                    <TouchableOpacity
                      key={artist.id}
                      style={styles.topArtistItem}
                      onPress={() => handleCreatorPress(artist)}
                    >
                      <View style={styles.topArtistRank}>
                        <Text style={[styles.topArtistRankText, { color: theme.colors.primary }]}>
                          #{index + 1}
                        </Text>
                      </View>
                      <View style={styles.topArtistAvatar}>
                        {artist.avatar_url ? (
                          <Image source={{ uri: artist.avatar_url }} style={styles.topArtistImage} />
                        ) : (
                          <View style={styles.defaultTopArtistImage}>
                            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  </View>
                      <View style={styles.topArtistInfo}>
                        <Text style={[styles.topArtistName, { color: theme.colors.text }]} numberOfLines={1}>
                          {artist.display_name || artist.username}
                        </Text>
                        <Text style={[styles.topArtistUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          @{artist.username}
                        </Text>
                </View>
                      <View style={styles.topArtistStats}>
                        <Text style={[styles.topArtistFollowers, { color: theme.colors.text }]}>
                          {formatNumber(artist.followers_count)}
                        </Text>
                        <Text style={[styles.topArtistFollowersLabel, { color: theme.colors.textSecondary }]}>
                          followers
                        </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="trending-up" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No top artists yet</Text>
                </View>
              )}
      </View>
          </>
        )}

        {activeTab === 'Events' && (
          <View style={[styles.tabContent, styles.firstSection]}>
            <Text style={[styles.tabContentText, { color: theme.colors.text }]}>Events content coming soon...</Text>
          </View>
        )}

        {activeTab === 'Playlists' && (
          <View style={[styles.tabContent, styles.firstSection]}>
            <Text style={[styles.tabContentText, { color: theme.colors.text }]}>Playlists content coming soon...</Text>
          </View>
        )}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    marginLeft: 8,
  },
  tabsScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: -10,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 24,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  // Inline Tabs (inside main ScrollView)
  inlineTabsScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 0,
  },
  inlineTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inlineTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 24,
  },
  activeInlineTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
  },
  inlineTabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeInlineTabText: {
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  firstSection: {
    marginTop: 8,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  trendingCard: {
    width: 200,
    marginRight: 12,
  },
  trendingCover: {
    width: 200,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  defaultTrendingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trendingArtist: {
    fontSize: 14,
    marginBottom: 2,
  },
  trendingDuration: {
    fontSize: 12,
  },
  recentMusicContainer: {
    paddingHorizontal: 16,
  },
  recentTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentTrackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  recentTrackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultRecentTrackImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTrackInfo: {
    flex: 1,
  },
  recentTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentTrackArtist: {
    fontSize: 14,
  },
  recentTrackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTrackDuration: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  tabContentText: {
    fontSize: 18,
    fontWeight: '500',
  },
  artistCard: {
    width: 120,
    alignItems: 'center',
    marginRight: 12,
  },
  artistCardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  artistCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  defaultArtistCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistCardName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  artistCardStats: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Artists Tab Styles
  artistsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  artistGridCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  artistGridAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  artistGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  defaultArtistGridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistGridName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  artistGridUsername: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  artistGridStats: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  artistGridTracks: {
    fontSize: 11,
    textAlign: 'center',
  },
  // Top Artists Styles
  topArtistsContainer: {
    paddingHorizontal: 16,
  },
  topArtistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topArtistRank: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  topArtistRankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  topArtistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  topArtistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  defaultTopArtistImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topArtistInfo: {
    flex: 1,
  },
  topArtistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  topArtistUsername: {
    fontSize: 14,
  },
  topArtistStats: {
    alignItems: 'flex-end',
  },
  topArtistFollowers: {
    fontSize: 16,
    fontWeight: '600',
  },
  topArtistFollowersLabel: {
    fontSize: 12,
  },
});

export default DiscoverScreen;
