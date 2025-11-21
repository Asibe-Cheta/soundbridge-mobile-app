import React, { useState, useEffect, useMemo } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { supabase, dbHelpers } from '../lib/supabase';
import AdBanner from '../components/AdBanner';
import ValuePropCard from '../components/ValuePropCard';
import FirstTimeTooltip from '../components/FirstTimeTooltip';
import { useUserPreferences } from '../hooks/useUserPreferences';
import EventMatchIndicator from '../components/EventMatchIndicator';
import { getRelativeTime } from '../utils/collaborationUtils';
import TipModal from '../components/TipModal';
import CollaborationRequestForm from '../components/CollaborationRequestForm';

const { width, height } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  file_url?: string;          // Correct field name from schema
  cover_art_url?: string;     // Correct field name from schema
  artwork_url?: string;       // Alternative field name
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
  genre?: string | null;
  location?: string | null;
  country?: string | null;
  is_collaboration_available?: boolean;
  next_available_slot?: string | null;
  followers_count?: number;
  tracks_count?: number;
  events_count?: number;
  total_tips_received?: number;
  total_tip_count?: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  category?: string | null;
  genres?: string[] | null;
  tags?: string[] | null;
  distance_miles?: number | null;
  image_url?: string;         // Correct field name from schema
  organizer: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type CreatorRecord = {
  id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
} | null;

export default function HomeScreen() {
  const { user, userProfile } = useAuth();
  const { play, addToQueue, currentTrack } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const { preferences } = useUserPreferences();
  
  // Content states
  const [featuredCreator, setFeaturedCreator] = useState<Creator | null>(null);
  const [trendingTracks, setTrendingTracks] = useState<AudioTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [hotCreators, setHotCreators] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  // UI states
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(false);
  const [showEventsTooltip, setShowEventsTooltip] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipTargetCreator, setTipTargetCreator] = useState<Creator | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabTargetCreator, setCollabTargetCreator] = useState<Creator | null>(null);

  // Loading states
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const userGenres = useMemo(() => {
    const genres = preferences?.preferred_genres ?? [];
    return genres.filter((genre): genre is string => !!genre && genre.trim().length > 0);
  }, [preferences?.preferred_genres]);

  const primaryGenreLabel = formatLabel(userGenres[0]);
  const secondaryGenreLabel = formatLabel(userGenres[1]);
  const userCityLabel = formatLabel(preferences?.preferred_city || userProfile?.location);
  const eventDistanceLabel =
    typeof preferences?.preferred_event_distance === 'number' && !Number.isNaN(preferences?.preferred_event_distance)
      ? `${preferences?.preferred_event_distance} miles`
      : undefined;

  const trendingSectionTitle = useMemo(() => {
    if (primaryGenreLabel || userCityLabel) {
      const genrePart = primaryGenreLabel ?? 'Your Genres';
      const cityPart = userCityLabel ?? 'Your Area';
      return `Trending in ${genrePart} · ${cityPart} 🔥`;
    }
    return 'Trending Now';
  }, [primaryGenreLabel, userCityLabel]);

  const featuredGenreLabel = formatLabel(featuredCreator?.genre ?? userGenres[0]);
  const featuredLocationLabel = formatLabel(
    featuredCreator?.location ?? preferences?.preferred_city ?? userProfile?.location
  );

  const featuredSectionTitle = useMemo(() => {
    if (featuredGenreLabel || featuredLocationLabel) {
      const segments = [featuredGenreLabel, featuredLocationLabel].filter(Boolean);
      return `Featured Creator - ${segments.join(' · ')}`;
    }
    return 'Featured Creator';
  }, [featuredGenreLabel, featuredLocationLabel]);

  const featuredSectionSubtitle = loadingFeatured ? 'Loading...' : 'Matches your taste';

  const eventsSubtitleParts = [
    primaryGenreLabel,
    secondaryGenreLabel,
    eventDistanceLabel,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  const eventsSectionTitle = 'Events Near You - Based on Your Preferences';
  const eventsSectionSubtitle = eventsSubtitleParts.length > 0 ? eventsSubtitleParts.join(' · ') : null;

  // Navigation functions
  const navigateToTrending = () => {
    navigation.navigate('Discover');
  };

  const navigateToRecentMusic = () => {
    navigation.navigate('Discover');
  };

  const navigateToHotCreators = () => {
    navigation.navigate('AllCreators');
  };

  const navigateToEvents = () => {
    navigation.navigate('AllEvents');
  };

  const navigateToUpload = () => {
    navigation.navigate('Upload');
  };
  const openTipModalForCreator = (creator: Creator) => {
    setTipTargetCreator(creator);
    setShowTipModal(true);
  };

  const handleTipModalClose = () => {
    setShowTipModal(false);
    setTipTargetCreator(null);
  };

  const handleCreatorTipSuccess = (amount: number) => {
    if (!tipTargetCreator) {
      return;
    }
    setHotCreators((prev) =>
      prev.map((creator) =>
        creator.id === tipTargetCreator.id
          ? {
              ...creator,
              total_tips_received: (creator.total_tips_received || 0) + amount,
              total_tip_count: (creator.total_tip_count || 0) + 1,
            }
          : creator,
      ),
    );
    handleTipModalClose();
  };

  const openCollaborationModalForCreator = (creator: Creator) => {
    setCollabTargetCreator(creator);
    setShowCollabModal(true);
  };

  const handleCollabModalClose = () => {
    setShowCollabModal(false);
    setCollabTargetCreator(null);
  };
  
  useEffect(() => {
    loadHomeContent();
  }, []);

  useEffect(() => {
    if (!loadingEvents) {
      (async () => {
        try {
          const hasSeen = await AsyncStorage.getItem('tooltip_events_seen');
          if (!hasSeen) {
            setShowEventsTooltip(true);
          }
        } catch (error) {
          console.warn('HomeScreen: Unable to read tooltip state', error);
          setShowEventsTooltip(true);
        }
      })();
    }
  }, [loadingEvents]);

  const dismissEventsTooltip = async () => {
    try {
      await AsyncStorage.setItem('tooltip_events_seen', 'true');
    } catch (error) {
      console.warn('HomeScreen: Unable to persist tooltip state', error);
    } finally {
      setShowEventsTooltip(false);
    }
  };

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
        genre: 'afrobeats',
        location: 'Lagos',
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
      console.log('🔧 HomeScreen: Loading trending tracks...');
      
      // Use personalized tracks if user is logged in, otherwise use general trending
      const { data, error } = user?.id 
        ? await dbHelpers.getPersonalizedTracks(user.id, 10)
        : await dbHelpers.getTrendingTracks(10);
      
      if (error || !data || data.length === 0) {
        console.log('⚠️ HomeScreen: Using fallback mock data. Error:', error?.message);
        // Enhanced mock trending tracks with artwork (fallback)
        const mockTrending: AudioTrack[] = [
          {
            id: 'trending-1',
            title: 'Electric Dreams',
            cover_art_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
            artwork_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
            creator: {
              id: '1',
              username: 'artist1',
              display_name: 'Artist One',
            },
            duration: 180,
            play_count: 5500,
            likes_count: 234,
            created_at: new Date().toISOString(),
          },
          {
            id: 'trending-2',
            title: 'Midnight City',
            cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
            artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
            creator: {
              id: '2',
              username: 'artist2',
              display_name: 'City Sounds',
            },
            duration: 210,
            play_count: 4200,
            likes_count: 189,
            created_at: new Date().toISOString(),
          },
          {
            id: 'trending-3',
            title: 'Ocean Waves',
            cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            creator: {
              id: '3',
              username: 'artist3',
              display_name: 'Wave Sounds',
            },
            duration: 195,
            play_count: 3800,
            likes_count: 156,
            created_at: new Date().toISOString(),
          },
        ];
        setTrendingTracks(mockTrending);
        console.log('✅ HomeScreen: Trending tracks loaded (mock data):', mockTrending.length);
      } else {
        console.log('✅ HomeScreen: Loaded trending tracks:', data.length, user?.id ? '(personalized)' : '(general)');
        setTrendingTracks(data);
      }
    } catch (error) {
      console.error('❌ HomeScreen: Error loading trending tracks:', error);
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
        console.error('❌ Supabase error loading recent tracks:', error);
        console.log('🔄 Trying alternative query...');
        
        // Try even simpler query with just basic fields
        const { data: simpleData, error: simpleError } = await supabase
          .from('audio_tracks')
          .select(`
            id, 
            title, 
            created_at, 
            creator_id,
            creator:profiles!creator_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
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
            const rawCreator = Array.isArray(track.creator)
              ? (track.creator[0] as CreatorRecord)
              : (track.creator as CreatorRecord);
            return {
              id: track.id,
              title: track.title || 'Untitled Track',
              description: undefined,
              audio_url: undefined,
              file_url: undefined,
              cover_art_url: imageUrl,
              artwork_url: imageUrl,
              duration: 180, // Default duration
              play_count: 0,
              likes_count: 0,
              created_at: track.created_at,
              creator: {
                id: rawCreator?.id || track.creator_id || 'unknown',
                username: rawCreator?.username || 'unknown',
                display_name: rawCreator?.display_name || 'Unknown Artist',
                avatar_url: rawCreator?.avatar_url,
              },
            };
          });
          
          setRecentTracks(transformedTracks);
          console.log('✅ Recent tracks loaded (simple query):', transformedTracks.length);
          console.log('🔍 Fallback track creator data:', transformedTracks[0]?.creator);
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
          const rawCreator = Array.isArray(track.creator)
            ? (track.creator[0] as CreatorRecord)
            : (track.creator as CreatorRecord);
          
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
              id: rawCreator?.id || track.creator_id || 'unknown',
              username: rawCreator?.username || 'unknown',
              display_name: rawCreator?.display_name || 'Unknown Artist',
              avatar_url: rawCreator?.avatar_url,
            },
          };
        });
        
        setRecentTracks(transformedTracks);
        console.log('✅ Recent tracks loaded from Supabase:', transformedTracks.length);
        console.log('🔍 Sample track creator data:', transformedTracks[0]?.creator);
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
            play_count: 45,
            likes_count: 12,
            created_at: new Date().toISOString(),
          },
          {
            id: 'mock-2',
            title: 'My Song Hits',
            cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
            creator: {
              id: 'mock-creator-2',
              username: 'asibe_cheta',
              display_name: 'Asibe Cheta',
            },
            duration: 210,
            play_count: 89,
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
          cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
          artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=face',
          creator: {
            id: 'fallback-creator-1',
            username: 'asibe_cheta',
            display_name: 'Asibe Cheta',
          },
          duration: 180,
          play_count: 0,
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
      console.log('🔧 Loading hot creators with real stats...');
      const { data, error } = await dbHelpers.getCreatorsWithStats(5);
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        const creatorIds = data.map(creator => creator.id).filter(Boolean);
        const availabilityMap = new Map<string, string | null>();

        if (creatorIds.length > 0) {
          const { data: availabilityRows, error: availabilityError } = await supabase
            .from('creator_availability')
            .select('creator_id,start_date,end_date')
            .eq('is_available', true)
            .gte('end_date', new Date().toISOString())
            .in('creator_id', creatorIds);

          if (!availabilityError && availabilityRows) {
            availabilityRows.forEach((slot: any) => {
              const existing = availabilityMap.get(slot.creator_id);
              if (!existing || new Date(slot.start_date) < new Date(existing)) {
                availabilityMap.set(slot.creator_id, slot.start_date);
              }
            });
          } else if (availabilityError) {
            console.log('ℹ️ Could not load availability for creators:', availabilityError.message);
          }
        }

        const transformedCreators: Creator[] = data.map(creator => ({
          id: creator.id,
          username: creator.username || '',
          display_name: creator.display_name || creator.username || 'Unknown Creator',
          bio: creator.bio || undefined,
          avatar_url: creator.avatar_url || undefined,
          genre: creator.genre || undefined,
          location: creator.location || creator.country || undefined,
          is_collaboration_available: availabilityMap.has(creator.id),
          next_available_slot: availabilityMap.get(creator.id) || null,
          followers_count: creator.followers_count || 0, // Real data from database
          tracks_count: creator.tracks_count || 0, // Real data from database
          events_count: creator.events_count || 0, // Real data from database
        }));
        
        setHotCreators(transformedCreators);
        console.log('✅ Hot creators loaded:', transformedCreators.length);
      } else {
        console.log('ℹ️ No hot creators found, using fallback');
        // Fallback mock data
        const mockCreators: Creator[] = [
          {
            id: 'mock-creator-1',
            username: 'beat_master',
            display_name: 'Beat Master',
            bio: 'Producer and beat maker',
            avatar_url: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?w=300&h=300&fit=crop',
            genre: 'hip hop',
            location: 'New York',
            is_collaboration_available: true,
            next_available_slot: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            followers_count: 2400,
            tracks_count: 120,
            events_count: 12,
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
        username: 'melody_queen',
        display_name: 'Melody Queen',
        bio: 'Singer-songwriter',
        avatar_url: 'https://images.unsplash.com/photo-1511288591490-9c89d9a86e43?w=300&h=300&fit=crop',
        genre: 'pop',
        location: 'London',
        is_collaboration_available: false,
        next_available_slot: null,
        followers_count: 4600,
        tracks_count: 85,
        events_count: 18,
        },
      ];
      setHotCreators(mockCreators);
    } finally {
      setLoadingCreators(false);
    }
  };

  const loadEvents = async () => {
    try {
      console.log('🔧 HomeScreen: Loading events...');
      
      // Use personalized events if user is logged in, otherwise use general events
      const { data, error } = user?.id 
        ? await dbHelpers.getPersonalizedEvents(user.id, 3)
        : await dbHelpers.getEvents(3);
      
      if (error || !data || data.length === 0) {
        console.log('⚠️ HomeScreen: Using fallback mock data. Error:', error?.message);
        // Enhanced mock events data
        const mockEvents: Event[] = [
          {
            id: 'mock-event-1',
            title: 'Virtual Music Showcase',
            description: 'Join us for an evening of new music from talented creators',
            event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Online Event',
            category: 'indie',
            genres: ['indie', 'alternative'],
            distance_miles: 0,
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
            category: 'hip hop',
            genres: ['hip hop', 'producer'],
            distance_miles: 12,
            image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
            organizer: {
              id: 'organizer-2',
              username: 'workshop_host',
              display_name: 'Production Academy',
              avatar_url: undefined,
            },
          },
        ];
        setEvents(mockEvents);
        console.log('✅ HomeScreen: Events loaded (mock data):', mockEvents.length);
      } else {
        const transformedEvents: Event[] = data.map(event => {
          const rawTags = Array.isArray((event as any).genres)
            ? (event as any).genres
            : Array.isArray((event as any).tags)
              ? (event as any).tags
              : undefined;
          return {
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          location: event.location,
          category: event.category ?? null,
          genres: rawTags ?? (event.category ? [event.category] : null),
          tags: rawTags ?? null,
          distance_miles: typeof (event as any).distance_miles === 'number' ? (event as any).distance_miles : null,
          image_url: event.image_url,
          organizer: {
            id: event.organizer?.id || 'organizer-1',
            username: event.organizer?.username || 'event_organizer',
            display_name: event.organizer?.display_name || 'Event Organizer',
            avatar_url: event.organizer?.avatar_url,
          },
          };
        });
        
        setEvents(transformedEvents);
        console.log('✅ HomeScreen: Events loaded:', transformedEvents.length, user?.id ? '(personalized)' : '(general)');
      }
    } catch (error) {
      console.error('❌ HomeScreen: Error loading events:', error);
      // Enhanced mock events fallback
      const mockEvents: Event[] = [
        {
          id: 'fallback-event-1',
          title: 'Music Meetup',
          description: 'Connect with local musicians and creators',
          event_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Local Venue',
          category: 'live',
          genres: ['live', 'networking'],
          distance_miles: 8,
          image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
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

  const formatDistanceMiles = (distance?: number | null) => {
    if (distance == null || Number.isNaN(distance)) {
      return '';
    }
    if (distance < 1) {
      return `${(Math.round(distance * 10) / 10).toFixed(1)} mi`;
    }
    return `${Math.round(distance)} mi`;
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
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
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

      {/* Creator Earnings Banner */}
      <View
        style={[
          styles.creatorBanner,
          {
            backgroundColor: theme.isDark ? '#111827' : '#FFF6E6',
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.creatorBannerContent}>
          <View style={styles.creatorBannerLeft}>
            <View style={styles.creatorBannerIcon}>
              <Ionicons name="cash-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.creatorBannerText}>
              <Text style={[styles.creatorBannerTitle, { color: theme.colors.text }]}>Creators Earn Here</Text>
              <Text style={[styles.creatorBannerSubtitle, { color: theme.colors.textSecondary }]}>
                Upload free · Get discovered · Receive tips
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={navigateToUpload}
            style={styles.creatorBannerCta}
            accessibilityRole="button"
          >
            <Text style={styles.creatorBannerCtaText}>Start Earning</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Creator Hero */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{featuredSectionTitle}</Text>
            <Text style={styles.heroSubtitle}>
              {featuredSectionSubtitle}
            </Text>
            <TouchableOpacity style={styles.heroButton}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.heroButtonText}>Explore</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <ValuePropCard />

      {/* Live Sessions Card */}
      <TouchableOpacity 
        style={styles.liveSessionsCard}
        onPress={() => navigation.navigate('LiveSessions')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.liveSessionsGradient}
        >
          <View style={styles.liveSessionsContent}>
            <View style={styles.liveSessionsHeader}>
              <View style={styles.liveSessionsIconContainer}>
                <Ionicons name="radio" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.livePulse}>
                <View style={[styles.liveDot, styles.liveDotOuter]} />
                <View style={styles.liveDot} />
              </View>
            </View>
            <Text style={styles.liveSessionsTitle}>Live Audio Sessions</Text>
            <Text style={styles.liveSessionsSubtitle}>
              Join live rooms • Host your own • Connect in real-time
            </Text>
            <View style={styles.liveSessionsButton}>
              <Text style={styles.liveSessionsButtonText}>Explore Live Rooms</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Trending Tracks - Collapsible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity 
            style={styles.sectionTitleContainer}
            onPress={() => setIsTrendingExpanded(!isTrendingExpanded)}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{trendingSectionTitle}</Text>
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

      {/* Ad Banner - Only show for free users */}
      <AdBanner />

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
                  play_count: 1250,
                  likes_count: 89,
                  created_at: new Date().toISOString(),
                  cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                },
                {
                  id: 'mock-recent-2',
                  title: 'Night Drive',
                  creator: { id: '2', username: 'artist2', display_name: 'Artist Two' },
                  duration: 210,
                  play_count: 890,
                  likes_count: 67,
                  created_at: new Date().toISOString(),
                  cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                }
              ]).map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.trackRowContainer}
                    onPress={() => handleTrackPress(track)}
                    activeOpacity={0.7}
                  >
                    <BlurView
                      intensity={isActive ? 20 : 10}
                      tint="dark"
                      style={[
                        styles.trackRowBlur,
                        isActive && styles.trackRowBlurActive
                      ]}
                    >
                      <View style={styles.trackRow}>
                        <View style={[styles.trackRowCover, { backgroundColor: 'rgba(30, 41, 59, 0.2)' }]}>
                          {(() => {
                            const imageUrl = track.cover_art_url;
                            return imageUrl ? (
                              <Image 
                                source={{ uri: imageUrl }} 
                                style={styles.trackRowImageCircular}
                                onError={(error) => {
                                  console.log(`❌ Image failed to load for "${track.title}": ${imageUrl}`, error);
                                }}
                                onLoad={() => {
                                  console.log(`✅ Image loaded successfully for "${track.title}": ${imageUrl}`);
                                }}
                              />
                            ) : (
                              <View style={[styles.defaultTrackRowImageCircular, { backgroundColor: 'rgba(30, 41, 59, 0.3)' }]}>
                                <Ionicons name="musical-notes" size={16} color={theme.colors.textSecondary} />
                              </View>
                            );
                          })()}
                        </View>
                        <View style={styles.trackRowInfo}>
                          <Text style={styles.trackRowArtist} numberOfLines={1}>
                            {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
                          </Text>
                          <Text style={styles.trackRowTitle} numberOfLines={1}>
                            {track.title}
                          </Text>
                        </View>
                        <View style={styles.trackRowActions}>
                          <TouchableOpacity 
                            style={styles.playTextButton} 
                            onPress={() => handleTrackPlay(track)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.playTextButtonLabel}>PLAY</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Column 2 */}
            <View style={styles.musicColumn}>
              {[
                {
                  id: 'mock-recent-3',
                  title: 'Ocean Waves',
                  creator: { id: '3', username: 'artist3', display_name: 'Wave Sounds' },
                  duration: 195,
                  play_count: 1100,
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
                  play_count: 950,
                  likes_count: 92,
                  created_at: new Date().toISOString(),
                  cover_art_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                }
              ].map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.trackRowContainer}
                    onPress={() => handleTrackPress(track)}
                    activeOpacity={0.7}
                  >
                    <BlurView
                      intensity={isActive ? 20 : 10}
                      tint="dark"
                      style={[
                        styles.trackRowBlur,
                        isActive && styles.trackRowBlurActive
                      ]}
                    >
                      <View style={styles.trackRow}>
                        <View style={[styles.trackRowCover, { backgroundColor: 'rgba(30, 41, 59, 0.2)' }]}>
                          <Image 
                            source={{ uri: track.cover_art_url }} 
                            style={styles.trackRowImageCircular}
                            onError={(error) => {
                              console.log(`❌ Image failed to load for "${track.title}": ${track.cover_art_url}`, error);
                            }}
                            onLoad={() => {
                              console.log(`✅ Image loaded successfully for "${track.title}": ${track.cover_art_url}`);
                            }}
                          />
                        </View>
                        <View style={styles.trackRowInfo}>
                          <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {track.creator?.display_name || 'Unknown Artist'}
                          </Text>
                          <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {track.title}
                          </Text>
                        </View>
                        <View style={styles.trackRowActions}>
                          <TouchableOpacity 
                            style={styles.playTextButton} 
                            onPress={() => handleTrackPlay(track)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.playTextButtonLabel}>PLAY</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Column 3 */}
            <View style={styles.musicColumn}>
              {[
                {
                  id: 'mock-recent-5',
                  title: 'Midnight Jazz',
                  creator: { id: '5', username: 'artist5', display_name: 'Jazz Collective' },
                  duration: 240,
                  play_count: 1350,
                  likes_count: 105,
                  created_at: new Date().toISOString(),
                  cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                },
                {
                  id: 'mock-recent-6',
                  title: 'Electric Dreams',
                  creator: { id: '6', username: 'artist6', display_name: 'Synth Wave' },
                  duration: 200,
                  play_count: 875,
                  likes_count: 64,
                  created_at: new Date().toISOString(),
                  cover_art_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                  artwork_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                }
              ].map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.trackRowContainer}
                    onPress={() => handleTrackPress(track)}
                    activeOpacity={0.7}
                  >
                    <BlurView
                      intensity={isActive ? 20 : 10}
                      tint="dark"
                      style={[
                        styles.trackRowBlur,
                        isActive && styles.trackRowBlurActive
                      ]}
                    >
                      <View style={styles.trackRow}>
                        <View style={[styles.trackRowCover, { backgroundColor: 'rgba(30, 41, 59, 0.2)' }]}>
                          <Image 
                            source={{ uri: track.cover_art_url }} 
                            style={styles.trackRowImageCircular}
                            onError={(error) => {
                              console.log(`❌ Image failed to load for "${track.title}": ${track.cover_art_url}`, error);
                            }}
                            onLoad={() => {
                              console.log(`✅ Image loaded successfully for "${track.title}": ${track.cover_art_url}`);
                            }}
                          />
                        </View>
                        <View style={styles.trackRowInfo}>
                          <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {track.creator?.display_name || 'Unknown Artist'}
                          </Text>
                          <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {track.title}
                          </Text>
                        </View>
                        <View style={styles.trackRowActions}>
                          <TouchableOpacity 
                            style={styles.playTextButton} 
                            onPress={() => handleTrackPlay(track)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.playTextButtonLabel}>PLAY</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
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
                {(creator.genre || creator.location) && (
                  <Text style={[styles.creatorMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {[formatLabel(creator.genre), formatLabel(creator.location)].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {creator.is_collaboration_available ? (
                  <TouchableOpacity
                    style={[
                      styles.collabBadge,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.primary + '40',
                      },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      openCollaborationModalForCreator(creator);
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={theme.colors.primary}
                      style={styles.collabBadgeIcon}
                    />
                    <Text style={[styles.collabBadgeText, { color: theme.colors.primary }]}>
                      Available to Collaborate
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {creator.next_available_slot ? (
                  <Text style={[styles.collabSubtext, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    Next slot {getRelativeTime(creator.next_available_slot)}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.creatorTipButton,
                    {
                      backgroundColor: theme.isDark ? 'rgba(253, 224, 71, 0.12)' : 'rgba(250, 204, 21, 0.18)',
                      borderColor: 'rgba(250, 204, 21, 0.35)',
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    openTipModalForCreator(creator);
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="gift" size={14} color="#FACC15" style={styles.creatorTipIcon} />
                  <Text style={styles.creatorTipText}>Tip</Text>
                </TouchableOpacity>
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
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{eventsSectionTitle}</Text>
                {eventsSectionSubtitle ? (
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    {eventsSectionSubtitle}
                  </Text>
                ) : null}
              </View>
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
                    category: 'indie',
                    genres: ['indie', 'showcase'],
                    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-1', username: 'event_organizer', display_name: 'Music Events', avatar_url: undefined },
                  },
                  {
                    id: 'mock-event-2',
                    title: 'Jazz Night Live',
                    description: 'An intimate jazz performance featuring local artists',
                    event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Blue Note Cafe',
                    category: 'jazz',
                    genres: ['jazz'],
                    distance_miles: 5,
                    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                    cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-2', username: 'jazz_events', display_name: 'Jazz Collective', avatar_url: undefined },
                  }
                ]).map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: 'transparent', borderBottomColor: theme.colors.border }]}
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
                          {event.distance_miles != null
                            ? ` · ${formatDistanceMiles(event.distance_miles)}`
                            : ''}
                        </Text>
                      )}
                      <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {event.organizer?.display_name || event.organizer?.username || 'Unknown Organizer'}
                      </Text>
                      <EventMatchIndicator
                        eventGenres={event.genres || (event.category ? [event.category] : undefined)}
                        userGenres={userGenres}
                      />
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
                    category: 'electronic',
                    genres: ['electronic', 'festival'],
                    distance_miles: 18,
                    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                    cover_art_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-3', username: 'electronic_events', display_name: 'EDM Collective', avatar_url: undefined },
                  },
                  {
                    id: 'mock-event-4',
                    title: 'Acoustic Sessions',
                    description: 'Intimate acoustic performances in a cozy setting',
                    event_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'The Coffee House',
                    category: 'acoustic',
                    genres: ['acoustic'],
                    distance_miles: 3,
                    image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                    cover_art_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-4', username: 'acoustic_nights', display_name: 'Acoustic Vibes', avatar_url: undefined },
                  }
                ].map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: 'transparent', borderBottomColor: theme.colors.border }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[styles.eventImageContainer, { backgroundColor: theme.colors.card }]}>
                      <Image source={{ uri: event.cover_art_url }} style={styles.eventImage} />
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
                          {event.distance_miles != null
                            ? ` · ${formatDistanceMiles(event.distance_miles)}`
                            : ''}
                        </Text>
                      )}
                      <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {event.organizer?.display_name || 'Unknown Organizer'}
                      </Text>
                      <EventMatchIndicator
                        eventGenres={event.genres || (event.category ? [event.category] : undefined)}
                        userGenres={userGenres}
                      />
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
                    category: 'hip hop',
                    genres: ['hip hop', 'open mic'],
                    distance_miles: 9,
                    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                    cover_art_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-5', username: 'hiphop_events', display_name: 'Hip-Hop Community', avatar_url: undefined },
                  },
                  {
                    id: 'mock-event-6',
                    title: 'Classical Concert Series',
                    description: 'Monthly classical music performances by local orchestra',
                    event_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
                    location: 'Symphony Hall',
                    category: 'classical',
                    genres: ['classical'],
                    distance_miles: 2,
                    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                    cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                    organizer: { id: 'organizer-6', username: 'classical_music', display_name: 'City Orchestra', avatar_url: undefined },
                  }
                ].map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: 'transparent', borderBottomColor: theme.colors.border }]}
                    onPress={() => handleEventPress(event)}
                  >
                    <View style={[styles.eventImageContainer, { backgroundColor: theme.colors.card }]}>
                      <Image source={{ uri: event.cover_art_url }} style={styles.eventImage} />
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
                          {event.distance_miles != null
                            ? ` · ${formatDistanceMiles(event.distance_miles)}`
                            : ''}
                        </Text>
                      )}
                      <Text style={[styles.eventOrganizer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        by {event.organizer?.display_name || 'Unknown Organizer'}
                      </Text>
                      <EventMatchIndicator
                        eventGenres={event.genres || (event.category ? [event.category] : undefined)}
                        userGenres={userGenres}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

      {/* Bottom padding for tab bar */}
      <View style={styles.bottomPadding} />
        </ScrollView>

      <FirstTimeTooltip
        visible={showEventsTooltip}
        title="Events Tailored to You"
        description="These events match YOUR preferences (Genre · Location). You'll never see irrelevant events."
        actions={[
          {
            label: 'Got it',
            onPress: dismissEventsTooltip,
            variant: 'primary',
          },
        ]}
      />
      {tipTargetCreator && (
        <TipModal
          visible={showTipModal}
          creatorId={tipTargetCreator.id}
          creatorName={tipTargetCreator.display_name || tipTargetCreator.username}
          onClose={handleTipModalClose}
          onTipSuccess={(amount) => handleCreatorTipSuccess(amount)}
        />
      )}
      {collabTargetCreator && (
        <CollaborationRequestForm
          visible={showCollabModal}
          onClose={handleCollabModalClose}
          creatorId={collabTargetCreator.id}
          creatorName={collabTargetCreator.display_name || collabTargetCreator.username}
        />
      )}
      </SafeAreaView>
    </View>
  );
}

function formatLabel(value?: string | null, fallbackCase?: 'upper' | 'lower'): string | undefined {
  if (!value) return undefined;
  const base = value.toString().trim();
  if (!base) return undefined;
  if (fallbackCase === 'upper') {
    return base.toUpperCase();
  }
  return base
    .split(/[\s_-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
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
    flex: 1,
  },
  creatorBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creatorBannerText: {
    flex: 1,
  },
  creatorBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  creatorBannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  creatorBannerCta: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  creatorBannerCtaText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
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
  liveSessionsCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  liveSessionsGradient: {
    padding: 20,
  },
  liveSessionsContent: {
    gap: 12,
  },
  liveSessionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveSessionsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePulse: {
    position: 'relative',
    width: 16,
    height: 16,
  },
  liveDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    top: 4,
    left: 4,
  },
  liveDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.4)',
    top: 0,
    left: 0,
  },
  liveSessionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  liveSessionsSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  liveSessionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 4,
  },
  liveSessionsButtonText: {
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
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
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
  trackRowContainer: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  trackRowBlur: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0,
  },
  trackRowBlurActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  trackRowCover: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  trackRowImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  trackRowImageCircular: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  defaultTrackRowImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  defaultTrackRowImageCircular: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  trackRowInfo: {
    flex: 1,
  },
  trackRowTitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  trackRowArtist: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: 'rgba(255, 255, 255, 0.95)',
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
  playTextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playTextButtonLabel: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
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
  creatorMeta: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
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
  collabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  collabBadgeIcon: {
    marginRight: 6,
  },
  collabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  collabSubtext: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  creatorTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'center',
    gap: 4,
  },
  creatorTipIcon: {
    marginRight: 2,
  },
  creatorTipText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '700',
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
  // Apple Music-style horizontal scrolling columns - wider for ElevenLabs style
  musicColumn: {
    width: width * 0.92, // 92% of screen width - wider
    marginRight: 12,
  },
  eventsColumn: {
    width: width * 0.85, // 85% of screen width
    marginRight: 16,
    paddingHorizontal: 16,
  },
});