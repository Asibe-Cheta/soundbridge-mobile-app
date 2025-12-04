import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase, dbHelpers } from '../lib/supabase';
import { 
  loadQueriesInParallel, 
  waitForValidSession,
  LoadingStateManager,
  CancellableQuery,
  withQueryTimeout
} from '../utils/dataLoading';
import AdvancedSearchFilters, { SearchFilters } from '../components/AdvancedSearchFilters';
import { useSearch } from '../hooks/useSearch';
import { fetchDiscoverServiceProviders } from '../services/creatorExpansionService';
import { contentCacheService } from '../services/contentCacheService';
import { getServiceCategoryLabel } from '../utils/serviceCategoryLabels';
import type { PublicProfile } from '../types/database';

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
  events_count?: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  venue?: string;
  category?: string;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees?: number;
  likes_count?: number;
  image_url?: string;
  cover_art_url?: string;
  creator_id?: string;
  created_at?: string;
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
  total_duration?: number;
  followers_count?: number;
  created_at?: string;
  updated_at?: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type TabType = 'Music' | 'Artists' | 'Events' | 'Playlists' | 'Services' | 'Venues';

const DISCOVER_MOCK_TRACKS: AudioTrack[] = [
  {
    id: 'discover-mock-track-1',
    title: 'Electric Dreams',
    cover_art_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    artwork_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    creator: { id: 'discover-artist-a', username: 'artist1', display_name: 'Artist One' },
    duration: 188,
    plays_count: 4400,
    likes_count: 200,
    created_at: new Date().toISOString(),
  },
  {
    id: 'discover-mock-track-2',
    title: 'Midnight City',
    cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    creator: { id: 'discover-artist-b', username: 'artist2', display_name: 'City Sounds' },
    duration: 206,
    plays_count: 3800,
    likes_count: 160,
    created_at: new Date().toISOString(),
  },
];

const DISCOVER_MOCK_ARTISTS: Creator[] = [
  {
    id: 'discover-mock-creator-1',
    username: 'beat_master',
    display_name: 'Beat Master',
    bio: 'Producer and beat maker',
    avatar_url: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?w=300&h=300&fit=crop',
    followers_count: 2500,
    tracks_count: 120,
    events_count: 12,
  },
  {
    id: 'discover-mock-creator-2',
    username: 'melody_queen',
    display_name: 'Melody Queen',
    bio: 'Singer-songwriter',
    avatar_url: 'https://images.unsplash.com/photo-1511288591490-9c89d9a86e43?w=300&h=300&fit=crop',
    followers_count: 4700,
    tracks_count: 86,
    events_count: 18,
  },
];

const DISCOVER_MOCK_EVENTS: Event[] = [
  {
    id: 'discover-mock-event-1',
    title: 'Virtual Music Showcase',
    description: 'Discover fresh sounds from upcoming creators.',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Online',
    category: 'indie',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    organizer: { id: 'discover-organizer-1', username: 'event_team', display_name: 'SoundBridge Events', avatar_url: undefined },
    genres: ['indie', 'alternative'],
    distance_miles: 0,
  },
];

const DISCOVER_MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'discover-mock-playlist-1',
    name: 'Weekend Vibes',
    description: 'Curated tunes to soundtrack your weekend.',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    tracks_count: 24,
    followers_count: 1200,
    created_at: new Date().toISOString(),
    creator: { id: 'playlist-creator-1', username: 'soundbridge', display_name: 'SoundBridge' },
  },
];

function DiscoverScreen() {
  const { user, loading: authLoading } = useAuth();
  const { play, addToQueue } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('Music');
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    contentType: 'all',
    genre: [],
    duration: { min: 0, max: 3600 },
    dateRange: { start: null, end: null },
    sortBy: 'relevance',
    sortOrder: 'desc',
    isExplicit: null,
    language: [],
    location: '',
  });
  
  // Content states
  const [trendingTracks, setTrendingTracks] = useState<AudioTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [serviceProviders, setServiceProviders] = useState<PublicProfile[]>([]);
  
  // Loading state management
  const loadingManager = useRef(new LoadingStateManager()).current;
  const cancellableQuery = useRef(new CancellableQuery()).current;
  const [isLoadingAny, setIsLoadingAny] = useState(true);
  
  // Individual loading states for UI - start as false for instant cache display
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  
  // Track if initial cache load has happened
  const initialCacheLoadRef = useRef(false);

  const tabs: TabType[] = ['Music', 'Artists', 'Events', 'Playlists', 'Services', 'Venues'];

  // Subscribe to loading state changes
  useEffect(() => {
    const unsubscribe = loadingManager.onChange(() => {
      const anyLoading = loadingManager.isAnyLoading();
      setIsLoadingAny(anyLoading);
      // Update individual loading states
      setLoadingTracks(loadingManager.isLoading('tracks'));
      setLoadingArtists(loadingManager.isLoading('artists'));
      setLoadingEvents(loadingManager.isLoading('events'));
      setLoadingPlaylists(loadingManager.isLoading('playlists'));
    });
    return unsubscribe;
  }, []);

  // Initial cache load - show cached data immediately
  useEffect(() => {
    if (authLoading) {
      return;
    }

    // Load cached data immediately for instant display
    const loadCachedData = async () => {
      if (!initialCacheLoadRef.current) {
        const cacheKey = user?.id ? `trending_${user.id}` : 'trending_anonymous';
        const cachedTracks = await contentCacheService.getCached('TRACKS', cacheKey);
        if (cachedTracks && Array.isArray(cachedTracks) && cachedTracks.length > 0) {
          console.log('⚡ Instant load: Showing cached tracks');
          setTrendingTracks(cachedTracks);
        }

        const cachedArtists = await contentCacheService.getCached('ARTISTS', 'featured_artists');
        if (cachedArtists && Array.isArray(cachedArtists) && cachedArtists.length > 0) {
          console.log('⚡ Instant load: Showing cached artists');
          setFeaturedArtists(cachedArtists);
        }

        const eventsCacheKey = user?.id ? `events_${user.id}` : 'events_anonymous';
        const cachedEvents = await contentCacheService.getCached('EVENTS', eventsCacheKey);
        if (cachedEvents && Array.isArray(cachedEvents) && cachedEvents.length > 0) {
          console.log('⚡ Instant load: Showing cached events');
          setEvents(cachedEvents);
        }

        const cachedPlaylists = await contentCacheService.getCached('PLAYLISTS', 'public_playlists');
        if (cachedPlaylists && Array.isArray(cachedPlaylists) && cachedPlaylists.length > 0) {
          console.log('⚡ Instant load: Showing cached playlists');
          setPlaylists(cachedPlaylists);
        }

        const cachedServices = await contentCacheService.getCached('SERVICES', 'service_providers');
        if (cachedServices && Array.isArray(cachedServices) && cachedServices.length > 0) {
          console.log('⚡ Instant load: Showing cached services');
          setServiceProviders(cachedServices);
        }
      }
    };

    loadCachedData();

    // Then load fresh data
    loadDiscoverContent();

    return () => {
      cancellableQuery.cancel();
      loadingManager.reset();
    };
  }, [authLoading, activeTab, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) {
        return;
      }

      const missingContent =
        trendingTracks.length === 0 ||
        recentTracks.length === 0 ||
        featuredArtists.length === 0 ||
        events.length === 0 ||
        playlists.length === 0;

      if (missingContent) {
        loadDiscoverContent();
      }
    }, [authLoading, trendingTracks.length, recentTracks.length, featuredArtists.length, events.length, playlists.length, activeTab])
  );

  const loadDiscoverContent = async () => {
    console.log('🔍 DiscoverScreen: Loading discover content...');
    loadingManager.setLoading('discover', true, 12000);

    try {
      // Wait for valid session if user is logged in
      if (user?.id) {
        await waitForValidSession(supabase, 3000);
      }

      switch (activeTab) {
        case 'Music':
          loadingManager.setLoading('tracks', true, 8000);
          const musicResults = await loadQueriesInParallel({
            trending: {
              name: 'trending',
              query: () => user?.id
                ? dbHelpers.getPersonalizedTracks(user.id, 20)
                : dbHelpers.getTrendingTracks(20),
              timeout: 8000,
              fallback: [],
            },
            recent: {
              name: 'recent',
              query: () => withQueryTimeout(
                supabase
                  .from('audio_tracks')
                  .select(`
                    id, title, description, audio_url, file_url,
                    cover_art_url, artwork_url, duration, play_count,
                    likes_count, created_at,
                    creator:profiles!creator_id(id, username, display_name, avatar_url)
                  `)
                  .eq('is_public', true)
                  .order('created_at', { ascending: false })
                  .limit(10),
                { timeout: 5000, fallback: [] }
              ),
              timeout: 5000,
              fallback: [],
            },
          });
          setTrendingTracks(musicResults.trending?.data || musicResults.trending || DISCOVER_MOCK_TRACKS);
          setRecentTracks(musicResults.recent?.data || musicResults.recent || DISCOVER_MOCK_TRACKS);
          loadingManager.setLoading('tracks', false, 0);
          break;

        case 'Artists':
          loadingManager.setLoading('artists', true, 8000);
          const artistsResult = await loadQueriesInParallel({
            artists: {
              name: 'artists',
              query: () => dbHelpers.getCreatorsWithStats(10),
              timeout: 8000,
              fallback: [],
            },
          });
          setFeaturedArtists(artistsResult.artists?.data || artistsResult.artists || DISCOVER_MOCK_ARTISTS);
          loadingManager.setLoading('artists', false, 0);
          break;

        case 'Events':
          loadingManager.setLoading('events', true, 6000);
          const eventsResult = await loadQueriesInParallel({
            events: {
              name: 'events',
              query: () => user?.id
                ? dbHelpers.getPersonalizedEvents(user.id, 10)
                : dbHelpers.getEvents(10),
              timeout: 6000,
              fallback: [],
            },
          });
          setEvents(eventsResult.events?.data || eventsResult.events || DISCOVER_MOCK_EVENTS);
          loadingManager.setLoading('events', false, 0);
          break;

        case 'Playlists':
          loadingManager.setLoading('playlists', true, 5000);
          const playlistsResult = await loadQueriesInParallel({
            playlists: {
              name: 'playlists',
              query: () => dbHelpers.getPublicPlaylists(10),
              timeout: 5000,
              fallback: [],
            },
          });
          setPlaylists(playlistsResult.playlists?.data || playlistsResult.playlists || DISCOVER_MOCK_PLAYLISTS);
          loadingManager.setLoading('playlists', false, 0);
          break;

        case 'Services':
          loadingManager.setLoading('services', true, 5000);
          await loadServiceProviders();
          loadingManager.setLoading('services', false, 0);
          break;

        case 'Venues':
          // Venues coming soon - no loading needed
          break;

        default:
          // Load all content for main discover page
          const allResults = await loadQueriesInParallel({
            trending: {
              name: 'trending',
              query: () => user?.id
                ? dbHelpers.getPersonalizedTracks(user.id, 20)
                : dbHelpers.getTrendingTracks(20),
              timeout: 8000,
              fallback: DISCOVER_MOCK_TRACKS,
            },
            recent: {
              name: 'recent',
              query: () => withQueryTimeout(
                supabase
                  .from('audio_tracks')
                  .select(`
                    id, title, description, audio_url, file_url,
                    cover_art_url, artwork_url, duration, play_count,
                    likes_count, created_at,
                    creator:profiles!creator_id(id, username, display_name, avatar_url)
                  `)
                  .eq('is_public', true)
                  .order('created_at', { ascending: false })
                  .limit(10),
                { timeout: 5000, fallback: [] }
              ),
              timeout: 5000,
              fallback: DISCOVER_MOCK_TRACKS,
            },
            artists: {
              name: 'artists',
              query: () => dbHelpers.getCreatorsWithStats(10),
              timeout: 8000,
              fallback: DISCOVER_MOCK_ARTISTS,
            },
            events: {
              name: 'events',
              query: () => user?.id
                ? dbHelpers.getPersonalizedEvents(user.id, 10)
                : dbHelpers.getEvents(10),
              timeout: 6000,
              fallback: DISCOVER_MOCK_EVENTS,
            },
            playlists: {
              name: 'playlists',
              query: () => dbHelpers.getPublicPlaylists(10),
              timeout: 5000,
              fallback: DISCOVER_MOCK_PLAYLISTS,
            },
          });
          setTrendingTracks(allResults.trending?.data || allResults.trending || DISCOVER_MOCK_TRACKS);
          setRecentTracks(allResults.recent?.data || allResults.recent || DISCOVER_MOCK_TRACKS);
          setFeaturedArtists(allResults.artists?.data || allResults.artists || DISCOVER_MOCK_ARTISTS);
          setEvents(allResults.events?.data || allResults.events || DISCOVER_MOCK_EVENTS);
          setPlaylists(allResults.playlists?.data || allResults.playlists || DISCOVER_MOCK_PLAYLISTS);
          break;
      }

      console.log('✅ DiscoverScreen: Content loaded');
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading content:', error);
      // Set fallback data
      setTrendingTracks(DISCOVER_MOCK_TRACKS);
      setRecentTracks(DISCOVER_MOCK_TRACKS);
      setFeaturedArtists(DISCOVER_MOCK_ARTISTS);
      setEvents(DISCOVER_MOCK_EVENTS);
      setPlaylists(DISCOVER_MOCK_PLAYLISTS);
    } finally {
      loadingManager.setLoading('discover', false, 0);
    }
  };

  const loadTrendingTracks = async (forceRefresh = false) => {
    const cacheKey = user?.id ? `trending_${user.id}` : 'trending_anonymous';
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('TRACKS', cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('⚡ Instant load: Showing cached trending tracks');
        setTrendingTracks(cached);
        initialCacheLoadRef.current = true;
        
        // Fetch fresh data in background
        setTimeout(() => loadTrendingTracks(true), 100);
        return;
      }
    }
    
    // Only show loading if we don't have cached data
    if (trendingTracks.length === 0 || forceRefresh) {
      setLoadingTracks(true);
    }
    
    try {
      console.log('🔥 DiscoverScreen: Loading tracks...');
      
      // Use personalized tracks if user is logged in, otherwise use general trending
      const { data, error } = user?.id 
        ? await dbHelpers.getPersonalizedTracks(user.id, 20)
        : await dbHelpers.getTrendingTracks(20);
      
      if (error || !data || data.length === 0) {
        console.log('⚠️ Using fallback mock data. Error:', error?.message);
        const fallback = DISCOVER_MOCK_TRACKS;
        setTrendingTracks(fallback);
        await contentCacheService.saveCache('TRACKS', cacheKey, fallback);
        console.log('✅ DiscoverScreen: Trending tracks loaded (mock data):', fallback.length);
      } else {
        console.log('✅ DiscoverScreen: Loaded tracks:', data.length, user?.id ? '(personalized)' : '(general)');
        console.log('🔍 DiscoverScreen trending track creator data:', data[0]?.creator);
        setTrendingTracks(data);
        await contentCacheService.saveCache('TRACKS', cacheKey, data);
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading trending tracks:', error);
      const fallback = DISCOVER_MOCK_TRACKS;
      setTrendingTracks(fallback);
      // Only update cache if we don't have data
      if (trendingTracks.length === 0) {
        await contentCacheService.saveCache('TRACKS', cacheKey, fallback);
      }
    } finally {
      setLoadingTracks(false);
      initialCacheLoadRef.current = true;
    }
  };

  const loadRecentTracks = async (forceRefresh = false) => {
    const cacheKey = 'recent_tracks';
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('TRACKS', cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('⚡ Instant load: Showing cached recent tracks');
        setRecentTracks(cached);
        // Fetch fresh data in background
        setTimeout(() => loadRecentTracks(true), 100);
        return;
      }
    }
    
    try {
      console.log('🔧 DiscoverScreen: Loading recent tracks...');
      // Try to load real tracks from Supabase - get all columns to find artwork
      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!creator_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ DiscoverScreen: Supabase error loading recent tracks:', error);
        // Fallback to mock data
        setRecentTracks(DISCOVER_MOCK_TRACKS);
        console.log('✅ DiscoverScreen: Recent tracks loaded (fallback mock data):', DISCOVER_MOCK_TRACKS.length);
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
            play_count: track.play_count || 0,
            plays_count: track.plays_count || 0,
            likes_count: track.likes_count || track.like_count || 0,
            created_at: track.created_at,
            creator: {
              id: track.creator?.id || track.creator_id || 'unknown',
              username: track.creator?.username || 'unknown',
              display_name: track.creator?.display_name || 'Unknown Artist',
              avatar_url: track.creator?.avatar_url,
            },
          };
        });
        
        setRecentTracks(transformedTracks);
        await contentCacheService.saveCache('TRACKS', cacheKey, transformedTracks);
        console.log('✅ DiscoverScreen: Recent tracks loaded from Supabase:', transformedTracks.length);
        console.log('🔍 DiscoverScreen sample track creator data:', transformedTracks[0]?.creator);
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
            play_count: 0,
            plays_count: 0,
            likes_count: 0,
            created_at: new Date().toISOString(),
          },
        ];
        setRecentTracks(mockTracks);
        if (recentTracks.length === 0) {
          await contentCacheService.saveCache('TRACKS', cacheKey, mockTracks);
        }
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading recent tracks:', error);
      const fallback = DISCOVER_MOCK_TRACKS;
      setRecentTracks(fallback);
      if (recentTracks.length === 0) {
        await contentCacheService.saveCache('TRACKS', cacheKey, fallback);
      }
    }
  };

  const loadFeaturedArtists = async (forceRefresh = false) => {
    const cacheKey = 'featured_artists';
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('ARTISTS', cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('⚡ Instant load: Showing cached featured artists');
        setFeaturedArtists(cached);
        // Fetch fresh data in background
        setTimeout(() => loadFeaturedArtists(true), 100);
        return;
      }
    }
    
    // Only show loading if we don't have cached data
    if (featuredArtists.length === 0 || forceRefresh) {
      setLoadingArtists(true);
    }
    
    try {
      console.log('🔧 DiscoverScreen: Loading featured artists with real stats...');
      
      // Use the new function that gets real stats
      const { data, error } = await dbHelpers.getCreatorsWithStats(10);
      
      console.log('🔍 DiscoverScreen: Featured artists data:', data?.length || 0, 'artists');
      console.log('🔍 DiscoverScreen: Featured artists error:', error);
      
      if (data && data.length > 0 && !error) {
        console.log('✅ DiscoverScreen: Featured artists loaded with real stats:', data.length);
        
        // Transform the data to match our Creator interface
        const transformedArtists: Creator[] = data.map(artist => ({
          id: artist.id,
          username: artist.username,
          display_name: artist.display_name || artist.username,
          bio: artist.bio || 'Music creator',
          avatar_url: artist.avatar_url,
          followers_count: artist.followers_count || 0, // Real data from database
          tracks_count: artist.tracks_count || 0, // Real data from database
          events_count: artist.events_count || 0, // Real data from database
        }));
        
        setFeaturedArtists(transformedArtists);
        await contentCacheService.saveCache('ARTISTS', cacheKey, transformedArtists);
        console.log('✅ DiscoverScreen: Successfully set featured artists with real stats:', transformedArtists.length);
      } else if (error) {
        console.log('❌ DiscoverScreen: Database error, using mock data:', error.message);
        // Use mock data on error
        const fallback = DISCOVER_MOCK_ARTISTS;
        setFeaturedArtists(fallback);
        if (featuredArtists.length === 0) {
          await contentCacheService.saveCache('ARTISTS', cacheKey, fallback);
        }
        console.log('✅ DiscoverScreen: Using mock artists data');
      } else {
        console.log('ℹ️ DiscoverScreen: No creators found, using mock data');
        // Use mock data if no creators found
        const fallback = DISCOVER_MOCK_ARTISTS;
        setFeaturedArtists(fallback);
        if (featuredArtists.length === 0) {
          await contentCacheService.saveCache('ARTISTS', cacheKey, fallback);
        }
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

  const loadEvents = async (forceRefresh = false) => {
    const cacheKey = user?.id ? `events_${user.id}` : 'events_anonymous';
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('EVENTS', cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('⚡ Instant load: Showing cached events');
        setEvents(cached);
        // Fetch fresh data in background
        setTimeout(() => loadEvents(true), 100);
        return;
      }
    }
    
    // Only show loading if we don't have cached data
    if (events.length === 0 || forceRefresh) {
      setLoadingEvents(true);
    }
    
    try {
      console.log('🎪 DiscoverScreen: Loading events...');
      
      // Use personalized events if user is logged in, otherwise use general events
      const { data, error } = user?.id 
        ? await dbHelpers.getPersonalizedEvents(user.id, 10)
        : await dbHelpers.getEvents(10);

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
        await contentCacheService.saveCache('EVENTS', cacheKey, transformedEvents);
        console.log('✅ DiscoverScreen: Successfully set events:', transformedEvents.length);
      } else if (error) {
        console.log('❌ DiscoverScreen: Database error, using mock events:', error.message);
        // Use mock data on error
        const fallback = DISCOVER_MOCK_EVENTS;
        setEvents(fallback);
        if (events.length === 0) {
          await contentCacheService.saveCache('EVENTS', cacheKey, fallback);
        }
        console.log('✅ DiscoverScreen: Using mock events data');
      } else {
        console.log('ℹ️ DiscoverScreen: No events found, using mock data');
        // Use mock data if no events found
        const fallback = DISCOVER_MOCK_EVENTS;
        setEvents(fallback);
        if (events.length === 0) {
          await contentCacheService.saveCache('EVENTS', cacheKey, fallback);
        }
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
      if (events.length === 0) {
        await contentCacheService.saveCache('EVENTS', cacheKey, fallbackEvents);
      }
      console.log('✅ DiscoverScreen: Using fallback events due to error');
    } finally {
      setLoadingEvents(false);
      console.log('🏁 DiscoverScreen: Events loading completed');
    }
  };

  const loadPlaylists = async (forceRefresh = false) => {
    const cacheKey = 'public_playlists';
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('PLAYLISTS', cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('⚡ Instant load: Showing cached playlists');
        setPlaylists(cached);
        // Fetch fresh data in background
        setTimeout(() => loadPlaylists(true), 100);
        return;
      }
    }
    
    // Only show loading if we don't have cached data
    if (playlists.length === 0 || forceRefresh) {
      setLoadingPlaylists(true);
    }
    
    try {
      console.log('🔧 DiscoverScreen: Loading playlists...');
      
      const { data, error } = await dbHelpers.getPublicPlaylists(20);
      
      if (error) throw error;
      
      console.log('✅ DiscoverScreen: Playlists loaded:', data?.length || 0);
      
      // Transform data to handle creator relationship (might come as array)
      const transformedPlaylists = data?.map(playlist => ({
        ...playlist,
        creator: Array.isArray(playlist.creator) ? playlist.creator[0] : playlist.creator
      })) || [];
      
      setPlaylists(transformedPlaylists);
      await contentCacheService.saveCache('PLAYLISTS', cacheKey, transformedPlaylists);
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading playlists:', error);
      const fallback = DISCOVER_MOCK_PLAYLISTS;
      setPlaylists(fallback);
      if (playlists.length === 0) {
        await contentCacheService.saveCache('PLAYLISTS', cacheKey, fallback);
      }
    } finally {
      setLoadingPlaylists(false);
      console.log('🏁 DiscoverScreen: Playlists loading completed');
    }
  };

  const loadServiceProviders = async (forceRefresh = false) => {
    const cacheKey = 'service_providers';
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('SERVICES', cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log('⚡ Instant load: Showing cached service providers');
        setServiceProviders(cached);
        // Fetch fresh data in background
        setTimeout(() => loadServiceProviders(true), 100);
        return;
      }
    }
    
    // Only show loading if we don't have cached data
    if (serviceProviders.length === 0 || forceRefresh) {
      setLoadingServices(true);
    }
    
    try {
      console.log('💼 DiscoverScreen: Loading service providers...');
      
      const providers = await fetchDiscoverServiceProviders();
      
      if (providers && providers.length > 0) {
        console.log('✅ DiscoverScreen: Service providers loaded:', providers.length);
        setServiceProviders(providers);
        await contentCacheService.saveCache('SERVICES', cacheKey, providers);
      } else {
        console.log('ℹ️ DiscoverScreen: No service providers found');
        setServiceProviders([]);
      }
    } catch (error) {
      console.error('❌ DiscoverScreen: Error loading service providers:', error);
      setServiceProviders([]);
    } finally {
      setLoadingServices(false);
      console.log('🏁 DiscoverScreen: Service providers loading completed');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Load all main content on refresh, regardless of active tab (force refresh)
    await Promise.all([
      loadFeaturedArtists(true),
      loadEvents(true),
      loadTrendingTracks(true),
      loadRecentTracks(true),
      loadPlaylists(true),
      loadServiceProviders(true)
    ]);
    setRefreshing(false);
  };

  // Search is now handled by useSearch hook

  const handleTrackPress = async (track: AudioTrack) => {
    (navigation as any).navigate('TrackDetails', { trackId: track.id, track: track });
  };

  const handleTrackPlay = async (track: AudioTrack) => {
    try {
      console.log('🎵 Playing track from Discover:', track.title);
      await play(track);
      
      // Add other tracks from current view to queue
      if (recentTracks.length > 0) {
        const otherRecentTracks = recentTracks.filter(t => t.id !== track.id);
        otherRecentTracks.forEach(t => addToQueue(t));
      }
      
      // Mini player will now handle showing the currently playing track
      // Navigation to full player is handled by mini player expand button
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Playback Error', 'Failed to play the track. Please try again.');
    }
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
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // ✅ NEW: Test search data availability
  const testSearchData = async () => {
    try {
      console.log('🔍 Testing search data availability...');
      
      // Test 1: Check if public tracks exist
      const { data: tracks, error: tracksError } = await supabase
        .from('audio_tracks')
        .select('id, title, is_public, creator_id')
        .eq('is_public', true)
        .limit(5);
      
      console.log('✅ Public tracks found:', tracks?.length || 0);
      if (tracks && tracks.length > 0) {
        console.log('Sample tracks:', tracks.map(t => t.title));
      }
      
      // Test 2: Check if creators exist
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, username, display_name, role')
        .eq('role', 'creator')
        .limit(5);
      
      console.log('✅ Creators found:', creators?.length || 0);
      if (creators && creators.length > 0) {
        console.log('Sample creators:', creators.map(c => c.display_name));
      }
      
      // Test 3: Check if events exist
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_date')
        .limit(5);
      
      console.log('✅ Events found:', events?.length || 0);
      if (events && events.length > 0) {
        console.log('Sample events:', events.map(e => e.title));
      }
      
      return {
        tracks: tracks?.length || 0,
        creators: creators?.length || 0,
        events: events?.length || 0
      };
    } catch (error) {
      console.error('❌ Error testing search data:', error);
      return null;
    }
  };

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
      
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Discover</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Find music, events, and creators based on YOUR preferences
          </Text>
        </View>
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
          <TouchableOpacity 
            onPress={() => setShowAdvancedFilters(true)} 
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
        {/* Show search results when searching */}
        {searchQuery.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            {/* Search Results Header */}
            <View style={styles.searchResultsHeader}>
              <Text style={[styles.searchResultsTitle, { color: theme.colors.text }]}>
                {isSearching ? 'Searching...' : `Results for "${searchQuery}"`}
              </Text>
              {!isSearching && (
                <Text style={[styles.searchResultsCount, { color: theme.colors.textSecondary }]}>
                  {searchResults.tracks.length + searchResults.artists.length} results
                </Text>
              )}
            </View>

            {isSearching ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.searchLoadingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
              </View>
            ) : (
              <>
                {/* Search Results Content */}
                {searchResults.tracks.length === 0 && searchResults.artists.length === 0 ? (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsTitle, { color: theme.colors.text }]}>No results found</Text>
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                      Try searching for different keywords
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Artists Results */}
                    {searchResults.artists.length > 0 && (
                      <View style={styles.searchSection}>
                        <Text style={[styles.searchSectionTitle, { color: theme.colors.text }]}>Artists</Text>
                        {searchResults.artists.map((artist) => (
                          <TouchableOpacity
                            key={artist.id}
                            style={styles.searchArtistItem}
                            onPress={() => handleCreatorPress(artist)}
                          >
                            <View style={styles.searchArtistAvatar}>
                              {artist.avatar_url ? (
                                <Image source={{ uri: artist.avatar_url }} style={styles.searchArtistImage} />
                              ) : (
                                <View style={styles.defaultSearchArtistImage}>
                                  <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                                </View>
                              )}
                            </View>
                            <View style={styles.searchArtistInfo}>
                              <Text style={[styles.searchArtistName, { color: theme.colors.text }]} numberOfLines={1}>
                                {artist.display_name || artist.username}
                              </Text>
                              <Text style={[styles.searchArtistUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                @{artist.username}
                              </Text>
                              <Text style={[styles.searchArtistStats, { color: theme.colors.textSecondary }]}>
                                {formatNumber(artist.followers_count)} followers • {formatNumber(artist.tracks_count)} tracks
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Tracks Results */}
                    {searchResults.tracks.length > 0 && (
                      <View style={styles.searchSection}>
                        <Text style={[styles.searchSectionTitle, { color: theme.colors.text }]}>Tracks</Text>
                        {searchResults.tracks.map((track) => (
                          <TouchableOpacity
                            key={track.id}
                            style={styles.searchTrackItem}
                            onPress={() => handleTrackPress(track)}
                          >
                            <View style={styles.searchTrackCover}>
                              {track.cover_art_url ? (
                                <Image source={{ uri: track.cover_art_url }} style={styles.searchTrackImage} />
                              ) : (
                                <View style={styles.defaultSearchTrackImage}>
                                  <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                                </View>
                              )}
                            </View>
                            <View style={styles.searchTrackInfo}>
                              <Text style={[styles.searchTrackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                {track.title}
                              </Text>
                              <Text style={[styles.searchTrackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
                              </Text>
                              <Text style={[styles.searchTrackStats, { color: theme.colors.textSecondary }]}>
                                {formatDuration(track.duration)} • {formatNumber(track.play_count)} plays
                              </Text>
                            </View>
                            <TouchableOpacity style={styles.searchTrackPlayButton} onPress={() => handleTrackPlay(track)}>
                              <Ionicons name="play" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        ) : (
          <>
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
                    <TouchableOpacity 
                      style={styles.playOverlay}
                      onPress={() => handleTrackPlay(track)}
                    >
                          <Ionicons name="play" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
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
                  <TouchableOpacity 
                    style={styles.playButton}
                    onPress={() => handleTrackPlay(track)}
                  >
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
          <>
            {/* Upcoming Events */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Events</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
              
              {loadingEvents ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading events...</Text>
                </View>
              ) : events.length > 0 ? (
                <View style={styles.eventsContainer}>
                  {events.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => handleEventPress(event)}
                    >
                      <View style={styles.eventImageContainer}>
                        {event.image_url ? (
                          <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                        ) : (
                          <View style={styles.defaultEventImage}>
                            <Ionicons name="calendar" size={32} color={theme.colors.textSecondary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
                          {event.title}
                        </Text>
                        <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                        {event.location && (
                          <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            📍 {event.location}
                          </Text>
                        )}
                        {event.venue && (
                          <Text style={[styles.eventVenue, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            🏢 {event.venue}
                          </Text>
                        )}
                        <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          by {event.organizer?.display_name || event.organizer?.username || 'Unknown Organizer'}
                        </Text>
                        {(event.price_gbp || event.price_ngn) && (
                          <Text style={[styles.eventPrice, { color: theme.colors.primary }]}>
                            {event.price_gbp ? `£${event.price_gbp}` : event.price_ngn ? `₦${event.price_ngn}` : 'Free'}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>No events found</Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'Playlists' && (
          <>
            {/* Public Playlists */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Public Playlists</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
              
              {loadingPlaylists ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading playlists...</Text>
                </View>
              ) : playlists.length > 0 ? (
                <View style={styles.playlistsContainer}>
                  {playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={styles.playlistCard}
                      onPress={() => (navigation as any).navigate('PlaylistDetails', { playlistId: playlist.id })}
                    >
                      <View style={styles.playlistCover}>
                        {playlist.cover_image_url ? (
                          <Image source={{ uri: playlist.cover_image_url }} style={styles.playlistImage} />
                        ) : (
                          <View style={styles.defaultPlaylistImage}>
                            <Ionicons name="musical-notes" size={32} color={theme.colors.textSecondary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.playlistInfo}>
                        <Text style={[styles.playlistName, { color: theme.colors.text }]} numberOfLines={1}>
                          {playlist.name}
                        </Text>
                        <Text style={[styles.playlistCreator, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          by {playlist.creator?.display_name || playlist.creator?.username || 'Unknown Creator'}
                        </Text>
                        <View style={styles.playlistStats}>
                          <Text style={[styles.playlistStat, { color: theme.colors.textSecondary }]}>
                            {playlist.tracks_count || 0} tracks
                          </Text>
                          <Text style={[styles.playlistStat, { color: theme.colors.textSecondary }]}>•</Text>
                          <Text style={[styles.playlistStat, { color: theme.colors.textSecondary }]}>
                            {formatDuration(playlist.total_duration || 0)}
                          </Text>
                          <Text style={[styles.playlistStat, { color: theme.colors.textSecondary }]}>•</Text>
                          <Text style={[styles.playlistStat, { color: theme.colors.textSecondary }]}>
                            {playlist.followers_count || 0} followers
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="musical-notes" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No playlists available yet</Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                    Playlists will appear here once users start creating them!
                  </Text>
                  <Text style={[styles.emptyStateNote, { color: theme.colors.textSecondary }]}>
                    💡 Users can create playlists by adding tracks to custom collections
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'Services' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Service Providers</Text>
              </View>
              
              {loadingServices ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading services...</Text>
                </View>
              ) : serviceProviders.length > 0 ? (
                <View style={styles.servicesContainer}>
                  {serviceProviders.map((provider) => (
                    <TouchableOpacity
                      key={provider.user_id}
                      style={[styles.serviceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      onPress={() => (navigation as any).navigate('CreatorProfile', { userId: provider.user_id })}
                    >
                      <View style={styles.serviceHeader}>
                        {provider.avatar_url ? (
                          <Image source={{ uri: provider.avatar_url }} style={styles.serviceAvatar} />
                        ) : (
                          <View style={[styles.serviceAvatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                          </View>
                        )}
                        <View style={styles.serviceInfo}>
                          <Text style={[styles.serviceName, { color: theme.colors.text }]} numberOfLines={1}>
                            {provider.display_name || provider.username || 'Service Provider'}
                          </Text>
                          {provider.headline && (
                            <Text style={[styles.serviceHeadline, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                              {provider.headline}
                            </Text>
                          )}
                          {provider.average_rating && (
                            <View style={styles.serviceRating}>
                              <Ionicons name="star" size={14} color="#FCD34D" />
                              <Text style={[styles.serviceRatingText, { color: theme.colors.textSecondary }]}>
                                {provider.average_rating.toFixed(1)} ({provider.review_count || 0} reviews)
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {provider.categories && provider.categories.length > 0 && (
                        <View style={styles.serviceCategories}>
                          {provider.categories.slice(0, 3).map((cat, idx) => (
                            <View key={idx} style={[styles.categoryChip, { backgroundColor: theme.colors.surface }]}>
                              <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
                                {getServiceCategoryLabel(cat)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {provider.price_band && (
                        <Text style={[styles.servicePrice, { color: theme.colors.primary }]}>
                          From {provider.price_band}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No service providers available yet</Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                    Service providers will appear here once they start offering services!
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'Venues' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Venues</Text>
              </View>
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>Coming Soon</Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                  Venue discovery will be available in a future update!
                </Text>
              </View>
            </View>
          </>
        )}
          </>
        )}
      </ScrollView>

      {/* Advanced Search Filters */}
      {showAdvancedFilters && (
        <AdvancedSearchFilters
          visible={showAdvancedFilters}
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onApply={() => {
            // Apply filters logic here
            setShowAdvancedFilters(false);
          }}
          onReset={() => {
            setSearchFilters({
              contentType: 'all',
              genre: [],
              duration: { min: 0, max: 600 },
              dateRange: { start: null, end: null },
              sortBy: 'relevance',
              sortOrder: 'desc',
              isExplicit: null,
              language: [],
              location: ''
            });
          }}
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  menuButton: {
    padding: 8,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
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
  filterButton: {
    padding: 8,
    marginLeft: 8,
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
    backgroundColor: 'transparent',
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
  // Search Results Styles
  searchResultsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultsCount: {
    fontSize: 14,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  searchLoadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  searchTabsScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  searchTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 24,
  },
  activeSearchTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
  },
  searchTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeSearchTabText: {
    fontWeight: '700',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  // Search Artist Item Styles
  searchArtistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchArtistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  searchArtistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  defaultSearchArtistImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchArtistInfo: {
    flex: 1,
  },
  searchArtistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchArtistUsername: {
    fontSize: 14,
    marginBottom: 2,
  },
  searchArtistStats: {
    fontSize: 12,
  },
  // Search Track Item Styles
  searchTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchTrackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  searchTrackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultSearchTrackImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchTrackInfo: {
    flex: 1,
  },
  searchTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchTrackArtist: {
    fontSize: 14,
    marginBottom: 2,
  },
  searchTrackStats: {
    fontSize: 12,
  },
  searchTrackPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Events Tab Styles
  eventsContainer: {
    paddingHorizontal: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  eventImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 12,
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 12,
    marginBottom: 2,
  },
  eventOrganizer: {
    fontSize: 12,
    marginBottom: 4,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Playlists Not Implemented Styles
  playlistsNotImplemented: {
    flex: 1,
    paddingTop: 32,
  },
  notImplementedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  notImplementedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  notImplementedText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  notImplementedFeatures: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
  },
  notImplementedNote: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Playlists Styles
  playlistsContainer: {
    paddingHorizontal: 16,
  },
  playlistCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  playlistCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultPlaylistImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistCreator: {
    fontSize: 14,
    marginBottom: 8,
  },
  playlistStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistStat: {
    fontSize: 12,
    marginRight: 6,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateNote: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Service Provider Styles
  servicesContainer: {
    paddingHorizontal: 16,
  },
  serviceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  serviceAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceHeadline: {
    fontSize: 14,
    marginBottom: 4,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceRatingText: {
    fontSize: 12,
  },
  serviceCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DiscoverScreen;
