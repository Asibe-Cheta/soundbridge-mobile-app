import React, { useState, useEffect, useRef } from 'react';
import BackButton from '../components/BackButton';
import OnboardingBackButton from '../components/OnboardingBackButton';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Image,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useNetwork } from '../hooks/useNetwork';
import CountrySelector from '../components/CountrySelector';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Types
interface Genre {
  id: string;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

interface CreatorProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  location?: string;
  country?: string;
  bio?: string;
  role?: string;
  followers_count?: number;
  tracks_count?: number;
  events_count?: number;
}

type UserType = 'music_creator' | 'podcast_creator' | 'industry_professional' | 'music_lover' | 'event_organiser' | null;

// Path-specific step types
type OnboardingStep =
  // Universal steps
  | 'welcome'
  | 'userType'
  | 'welcomeConfirmation'
  // Music Creator Path steps
  | 'musicCreator_profileSetup'
  | 'musicCreator_genres'
  | 'musicCreator_role'
  | 'musicCreator_events'
  | 'musicCreator_valueDemo'
  // Podcast Creator Path steps
  | 'podcastCreator_profileSetup'
  | 'podcastCreator_categories'
  | 'podcastCreator_role'
  | 'podcastCreator_events'
  | 'podcastCreator_valueDemo'
  // Industry Professional Path steps
  | 'industryProfessional_profileSetup'
  | 'industryProfessional_role'
  | 'industryProfessional_genres'
  | 'industryProfessional_goals'
  | 'industryProfessional_valueDemo'
  // Music Lover Path steps
  | 'musicLover_profileSetup'
  | 'musicLover_genres'
  | 'musicLover_events'
  | 'musicLover_valueDemo'
  // Event Organiser Path steps
  | 'eventOrganiser_profileSetup'
  | 'eventOrganiser_eventTypes'
  | 'eventOrganiser_location'
  | 'eventOrganiser_valueDemo'
  // Shared steps (after path-specific steps)
  | 'followSuggestions'
  | 'notificationPermission'
  | 'tierSelection'
  | 'payment'
  | 'firstPost';

// Event Type interface
interface EventType {
  id: string;
  name: string;
  category: string;
  description: string;
  icon_emoji: string;
  is_active: boolean;
  sort_order: number;
}

export default function OnboardingScreen() {
  const { user, userProfile, updateUserProfile, completeOnboarding, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { sendRequest } = useNetwork();

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);
  const [selectedTier, setSelectedTier] = useState<'free' | 'pro' | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back'>('forward');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  // Path routing helpers
  const getPathFirstStep = (type: UserType): OnboardingStep | null => {
    switch (type) {
      case 'music_creator':
        return 'musicCreator_profileSetup';
      case 'podcast_creator':
        return 'podcastCreator_profileSetup';
      case 'industry_professional':
        return 'industryProfessional_profileSetup';
      case 'music_lover':
        return 'musicLover_profileSetup';
      case 'event_organiser':
        return 'eventOrganiser_profileSetup';
      default:
        return null;
    }
  };

  const getPathTotalSteps = (type: UserType): number => {
    switch (type) {
      case 'music_creator':
      case 'podcast_creator':
      case 'industry_professional':
        return 7; // User Type + 6 path steps
      case 'music_lover':
        return 6; // User Type + 5 path steps
      case 'event_organiser':
        return 6; // User Type + 5 path steps
      default:
        return 0;
    }
  };

  const getCurrentStepNumber = (step: OnboardingStep, type: UserType): number => {
    // Universal steps
    if (step === 'welcome') return 0;
    if (step === 'userType') return 1;
    if (step === 'welcomeConfirmation') return getPathTotalSteps(type) + 1;
    
    // Path-specific steps
    const pathSteps: Record<string, number> = {
      // Music Creator
      'musicCreator_profileSetup': 2,
      'musicCreator_genres': 3,
      'musicCreator_role': 4,
      'musicCreator_events': 5,
      'musicCreator_valueDemo': 6,
      // Podcast Creator
      'podcastCreator_profileSetup': 2,
      'podcastCreator_categories': 3,
      'podcastCreator_role': 4,
      'podcastCreator_events': 5,
      'podcastCreator_valueDemo': 6,
      // Industry Professional
      'industryProfessional_profileSetup': 2,
      'industryProfessional_role': 3,
      'industryProfessional_genres': 4,
      'industryProfessional_goals': 5,
      'industryProfessional_valueDemo': 6,
      // Music Lover
      'musicLover_profileSetup': 2,
      'musicLover_genres': 3,
      'musicLover_events': 4,
      'musicLover_valueDemo': 5,
      // Event Organiser
      'eventOrganiser_profileSetup': 2,
      'eventOrganiser_eventTypes': 3,
      'eventOrganiser_location': 4,
      'eventOrganiser_valueDemo': 5,
      // Shared (followSuggestions uses same number as the step it follows)
      'followSuggestions': 3,
      'notificationPermission': getPathTotalSteps(type),
      'tierSelection': getPathTotalSteps(type),
      'payment': getPathTotalSteps(type),
      'firstPost': getPathTotalSteps(type) + 1,
    };
    
    return pathSteps[step] || 0;
  };

  const getStepIndicatorText = (step: OnboardingStep, type: UserType): string => {
    if (step === 'welcome' || step === 'welcomeConfirmation' || step === 'firstPost') return '';
    
    const totalSteps = getPathTotalSteps(type);
    const currentStepNum = getCurrentStepNumber(step, type);
    
    // User Type is always step 1
    if (step === 'userType') {
      return `Step 1 of ${totalSteps}`;
    }
    
    // Tier selection and payment are the final step
    if (step === 'tierSelection' || step === 'payment') {
      return `Step ${totalSteps} of ${totalSteps}`;
    }
    
    // All other steps use their calculated step number
    return `Step ${currentStepNum} of ${totalSteps}`;
  };

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Profile data
  const [displayName, setDisplayName] = useState(userProfile?.display_name || user?.user_metadata?.display_name || '');
  const [username, setUsername] = useState(userProfile?.username || user?.user_metadata?.username || '');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [location, setLocation] = useState(userProfile?.location || '');
  const [country, setCountry] = useState(userProfile?.country || 'United Kingdom');
  const [company, setCompany] = useState(''); // For Industry Professional path
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Genres data
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);

  // Event preferences data
  const [availableEventTypes, setAvailableEventTypes] = useState<EventType[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

  // Creator roles data (for Music Creator path)
  const [selectedCreatorRoles, setSelectedCreatorRoles] = useState<string[]>([]);
  
  // Creator role options
  const creatorRoles = [
    { id: 'artist', name: 'Artist/Vocalist', emoji: '🎤' },
    { id: 'producer', name: 'Producer/Beatmaker', emoji: '🎹' },
    { id: 'songwriter', name: 'Songwriter/Composer', emoji: '✍️' },
    { id: 'instrumentalist', name: 'Instrumentalist', emoji: '🎸' },
    { id: 'mixing_engineer', name: 'Mixing Engineer', emoji: '🎚️' },
    { id: 'mastering_engineer', name: 'Mastering Engineer', emoji: '🎛️' },
    { id: 'recording_engineer', name: 'Recording Engineer', emoji: '🎙️' },
    { id: 'music_director', name: 'Music Director/Arranger', emoji: '🎼' },
    { id: 'music_teacher', name: 'Music Teacher/Coach', emoji: '👨‍🏫' },
    { id: 'performer', name: 'Performer/Session Musician', emoji: '🎭' },
    { id: 'dj', name: 'DJ', emoji: '📀' },
  ];

  // Podcast categories data (for Podcast Creator path)
  const [availablePodcastCategories, setAvailablePodcastCategories] = useState<Genre[]>([]);
  const [selectedPodcastCategories, setSelectedPodcastCategories] = useState<string[]>([]);
  const [loadingPodcastCategories, setLoadingPodcastCategories] = useState(false);

  // Podcast roles data (for Podcast Creator path)
  const [selectedPodcastRoles, setSelectedPodcastRoles] = useState<string[]>([]);
  
  // Podcast role options
  const podcastRoles = [
    { id: 'solo_host', name: 'Solo Host', emoji: '🎙️' },
    { id: 'co_host', name: 'Co-Host', emoji: '👥' },
    { id: 'producer', name: 'Producer', emoji: '🎬' },
    { id: 'audio_editor', name: 'Audio Editor', emoji: '✂️' },
    { id: 'scriptwriter', name: 'Scriptwriter/Researcher', emoji: '📝' },
    { id: 'sound_designer', name: 'Sound Designer', emoji: '🎵' },
    { id: 'guest_coordinator', name: 'Guest Coordinator/Booker', emoji: '🎤' },
    { id: 'marketing_manager', name: 'Marketing Manager', emoji: '📢' },
    { id: 'cover_art_designer', name: 'Cover Art Designer', emoji: '🎨' },
    { id: 'guest_contributor', name: 'Guest/Regular Contributor', emoji: '🎧' },
  ];

  // Industry Professional data
  const [selectedProfessionalRole, setSelectedProfessionalRole] = useState<string | null>(null); // Single selection
  const [selectedProfessionalGoals, setSelectedProfessionalGoals] = useState<string[]>([]); // Multiple selection
  
  // Professional role options (single selection)
  const professionalRoles = [
    { id: 'audio_engineer', name: 'Audio Engineer (Mixing/Mastering/Recording)', emoji: '🎚️' },
    { id: 'music_producer', name: 'Music Producer', emoji: '🎹' },
    { id: 'studio_owner', name: 'Studio Owner/Manager', emoji: '🏢' },
    { id: 'ar_talent_scout', name: 'A&R / Talent Scout', emoji: '👂' },
    { id: 'event_organizer', name: 'Event Organizer/Promoter', emoji: '🎪' },
    { id: 'record_label_exec', name: 'Record Label Executive', emoji: '📀' },
    { id: 'artist_manager', name: 'Artist Manager/Agent', emoji: '💼' },
    { id: 'session_musician', name: 'Session Musician for Hire', emoji: '🎸' },
    { id: 'music_teacher', name: 'Music Teacher/Coach', emoji: '👨‍🏫' },
    { id: 'music_video_director', name: 'Music Video Director', emoji: '🎬' },
    { id: 'music_journalist', name: 'Music Journalist/Blogger', emoji: '📝' },
    { id: 'radio_dj', name: 'Radio DJ/Presenter', emoji: '📻' },
    { id: 'vocal_coach', name: 'Vocal Coach', emoji: '🎤' },
    { id: 'music_publisher', name: 'Music Publisher', emoji: '🎼' },
    { id: 'distribution_rep', name: 'Distribution Representative', emoji: '💿' },
  ];

  // Professional goals options (multiple selection)
  const professionalGoals = [
    { id: 'discover_talent', name: 'Discover new talent to sign/work with', emoji: '🔍' },
    { id: 'book_musicians', name: 'Book session musicians/vocalists', emoji: '🎤' },
    { id: 'find_collaborators', name: 'Find collaborators for projects', emoji: '🤝' },
    { id: 'scout_artists', name: 'Scout artists for events/showcases', emoji: '📊' },
    { id: 'offer_services', name: 'Offer services (coaching, mixing, etc.)', emoji: '🎓' },
    { id: 'network_professionals', name: 'Network with other industry professionals', emoji: '💼' },
    { id: 'promote_services', name: 'Promote my services/studio/label', emoji: '📈' },
    { id: 'find_music', name: 'Find music for projects (sync licensing)', emoji: '🎵' },
    { id: 'build_network', name: 'Build my professional network', emoji: '👥' },
    { id: 'stay_updated', name: 'Stay updated on industry trends', emoji: '💡' },
  ];

  // Value demo creators
  const [demoCreators, setDemoCreators] = useState<CreatorProfile[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Event Organiser path data
  const eventOrganiserEventTypes = [
    { id: 'concerts', name: 'Concerts & Live Music', emoji: '🎸' },
    { id: 'club_nights', name: 'Club Nights & DJ Sets', emoji: '🎧' },
    { id: 'workshops', name: 'Workshops & Masterclasses', emoji: '📚' },
    { id: 'conferences', name: 'Conferences & Talks', emoji: '🎤' },
    { id: 'comedy', name: 'Comedy Shows', emoji: '😂' },
    { id: 'open_mic', name: 'Open Mic Nights', emoji: '🎙️' },
    { id: 'film', name: 'Film Screenings', emoji: '🎬' },
    { id: 'fitness', name: 'Fitness & Wellness', emoji: '🧘' },
    { id: 'art_culture', name: 'Art & Culture', emoji: '🎨' },
    { id: 'networking', name: 'Networking Events', emoji: '🤝' },
  ];
  const [selectedOrgEventTypes, setSelectedOrgEventTypes] = useState<string[]>([]);
  const eventOrganiserReachOptions = [
    { id: 'local', label: 'Mostly local (my city/area)' },
    { id: 'regional', label: 'Regional (multiple cities)' },
    { id: 'national', label: 'National' },
    { id: 'international', label: 'International / Online' },
  ];
  const [selectedOrgReach, setSelectedOrgReach] = useState<string | null>(null);

  // Follow suggestions step
  const [suggestedCreators, setSuggestedCreators] = useState<CreatorProfile[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionFollowedIds, setSuggestionFollowedIds] = useState<Set<string>>(new Set());
  const suggestionsChecked = useRef(false);

  // First post step
  const [firstPostText, setFirstPostText] = useState('');
  const [firstPostImage, setFirstPostImage] = useState<string | null>(null);
  const [publishingPost, setPublishingPost] = useState(false);

  // Payment data
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Animate welcome screen content on mount
  useEffect(() => {
    if (currentStep === 'welcome') {
      // Reset animation values
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.8);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Shimmer animation for logo
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [currentStep]);

  // Load genres when genre selection screens are reached
  useEffect(() => {
    const genreSteps = [
      'musicCreator_genres',
      'musicLover_genres',
      'industryProfessional_genres'
    ];
    if (genreSteps.includes(currentStep) && availableGenres.length === 0) {
      loadGenres();
    }
  }, [currentStep]);

  // Load podcast categories when podcast categories screen is reached
  useEffect(() => {
    if (currentStep === 'podcastCreator_categories' && availablePodcastCategories.length === 0) {
      loadPodcastCategories();
    }
  }, [currentStep]);

  // Load event types when event preferences screens are reached
  useEffect(() => {
    const eventSteps = [
      'musicCreator_events',
      'podcastCreator_events',
      'musicLover_events'
    ];
    if (eventSteps.includes(currentStep) && availableEventTypes.length === 0 && userType) {
      loadEventTypes();
    }
  }, [currentStep, userType]);

  // Load creators for value demo
  useEffect(() => {
    const valueDemoSteps = [
      'valueDemo',
      'musicCreator_valueDemo',
      'podcastCreator_valueDemo',
      'industryProfessional_valueDemo',
      'musicLover_valueDemo',
      'eventOrganiser_valueDemo',
    ];
    if (valueDemoSteps.includes(currentStep) && demoCreators.length === 0) {
      loadDemoCreators();
    }
  }, [currentStep]);

  // Load follow suggestions when that step is reached (only once)
  useEffect(() => {
    if (currentStep === 'followSuggestions' && !suggestionsChecked.current) {
      suggestionsChecked.current = true;
      loadFollowSuggestions();
    }
  }, [currentStep]);


  // Pre-fill first post text when that step is reached
  useEffect(() => {
    if (currentStep === 'firstPost' && !firstPostText) {
      setFirstPostText(getFirstPostTemplate());
    }
  }, [currentStep]);

  // Check username availability (debounced)
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const debounceTimer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [username]);

  // Entrance animation effect
  useEffect(() => {
    if (currentStep === 'welcome') return; // Welcome has its own animation
    
    fadeAnim.setValue(0);
    // Slide in from the opposite direction of the exit animation
    if (transitionDirection === 'forward') {
      slideAnim.setValue(50); // Slide from right (forward navigation)
    } else {
      slideAnim.setValue(-50); // Slide from left (backward navigation)
    }
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // Load genres from API
  const loadGenres = async () => {
    setLoadingGenres(true);
    try {
      const url = `${config.apiUrl}/api/genres?category=music`;
      console.log('🎵 Loading genres from:', url);
      const response = await fetch(url);

      console.log('📡 Genres API response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: response.url,
      });

      // Check if response is OK and content-type is JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.error('❌ Genres API returned non-JSON or error:', response.status, contentType);
        // Gracefully handle error - don't block user
        return;
      }

      const data = await response.json();
      console.log('📦 Genres API data:', data);

      if (data.success && data.genres && data.genres.length > 0) {
        console.log('✅ Loaded', data.genres.length, 'music genres');
        setAvailableGenres(data.genres);
      } else {
        console.error('❌ API returned success=false or empty genres:', data);
      }
    } catch (error) {
      console.error('❌ Error loading genres:', error);
    } finally {
      setLoadingGenres(false);
    }
  };

  // Check username availability
  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${config.apiUrl}/api/onboarding/check-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ username: usernameToCheck }),
      });

      // Check if response is OK and content-type is JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Username check API returned non-JSON or error:', response.status);
        setUsernameAvailable(null);
        return;
      }

      const data = await response.json();
      setUsernameAvailable(data.available ?? false);
    } catch (error) {
      console.error('❌ Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Load genre-matched creators for follow suggestions
  const loadFollowSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // Use the selected genres/categories to find matching creators
      const genreIds = selectedGenres.length > 0
        ? selectedGenres
        : selectedPodcastCategories;

      let query = supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, location, bio, followers_count, tracks_count')
        .neq('id', user?.id)
        .order('followers_count', { ascending: false })
        .limit(10);

      if (genreIds.length > 0) {
        // Filter to creators who have at least one matching genre
        // Using RPC or a join — fall back to top creators if query fails
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, location, bio, followers_count, tracks_count')
          .neq('id', user?.id)
          .in('id',
            (await supabase
              .from('user_genres')
              .select('user_id')
              .in('genre_id', genreIds)
              .then(r => (r.data || []).map((x: any) => x.user_id))
            )
          )
          .order('followers_count', { ascending: false })
          .limit(10);
        if (data && data.length >= 3) {
          setSuggestedCreators(data as CreatorProfile[]);
          return;
        }
      }

      // If genre match returns < 3, skip the step
      setSuggestedCreators([]);
      const nextStep =
        userType === 'music_creator' ? 'musicCreator_role' :
        userType === 'podcast_creator' ? 'podcastCreator_role' :
        userType === 'industry_professional' ? 'industryProfessional_goals' :
        userType === 'music_lover' ? 'musicLover_events' :
        'eventOrganiser_location';
      setLoadingSuggestions(false);
      animateStepTransition(nextStep);
      return;
    } catch (error) {
      console.error('❌ Error loading follow suggestions:', error);
      setSuggestedCreators([]);
      const nextStep =
        userType === 'music_creator' ? 'musicCreator_role' :
        userType === 'podcast_creator' ? 'podcastCreator_role' :
        userType === 'industry_professional' ? 'industryProfessional_goals' :
        userType === 'music_lover' ? 'musicLover_events' :
        'eventOrganiser_location';
      setLoadingSuggestions(false);
      animateStepTransition(nextStep);
      return;
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Generate per-user-type first post template
  const getFirstPostTemplate = (): string => {
    const genreNames = selectedGenres
      .map(id => availableGenres.find(g => g.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(' & ');

    const categoryNames = selectedPodcastCategories
      .map(id => availablePodcastCategories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(' & ');

    const orgEventNames = selectedOrgEventTypes
      .map(id => eventOrganiserEventTypes.find(e => e.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(' & ');

    const roleName = selectedProfessionalRole
      ? professionalRoles.find(r => r.id === selectedProfessionalRole)?.name || 'music professional'
      : 'music professional';

    switch (userType) {
      case 'music_creator':
        return genreNames
          ? `Just joined SoundBridge! I make ${genreNames} music and I'm here to share my sound with the world. Follow along 🎵`
          : `Just joined SoundBridge! I'm a music creator here to share my sound with the world. Follow along 🎵`;
      case 'podcast_creator':
        return categoryNames
          ? `Just joined SoundBridge! I create ${categoryNames} podcasts and I'm excited to build my audience here. Follow along 🎙`
          : `Just joined SoundBridge! I'm a podcast creator excited to build my audience here. Follow along 🎙`;
      case 'industry_professional':
        return `Just joined SoundBridge! I'm a ${roleName} looking to connect with talented creators. Let's collaborate. 🤝`;
      case 'music_lover':
        return `Just joined SoundBridge! Here to discover great music and support the artists behind it. 🎧`;
      case 'event_organiser':
        return orgEventNames
          ? `Just joined SoundBridge! I organise ${orgEventNames} and I'm here to reach new audiences. Follow me for upcoming events. 🎟`
          : `Just joined SoundBridge! I organise events and I'm here to reach new audiences. Follow me for upcoming events. 🎟`;
      default:
        return `Just joined SoundBridge! Excited to be part of this community. 🎵`;
    }
  };

  // Pick profile photo
  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to add a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Pick photo for first post
  const handleFirstPostImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setFirstPostImage(result.assets[0].uri);
    }
  };

  // Publish first post + complete onboarding
  const handlePublishFirstPost = async () => {
    if (publishingPost) return;
    if (!firstPostText.trim()) {
      Alert.alert('Required', 'Please write something for your first post.');
      return;
    }
    setPublishingPost(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      // Upload avatar if selected (best effort — don't block onboarding on failure)
      let uploadedAvatarUrl: string | undefined;
      if (avatarUri) {
        try {
          const avatarFormData = new FormData();
          avatarFormData.append('file', { uri: avatarUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
          avatarFormData.append('userId', user?.id || '');
          const avatarResponse = await fetch(`${config.apiUrl}/api/upload/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: avatarFormData,
          });
          if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json();
            uploadedAvatarUrl = avatarData.url;
          }
        } catch (avatarError) {
          console.warn('⚠️ Avatar upload failed, continuing onboarding:', avatarError);
        }
      }

      // Complete profile first
      await fetch(`${config.apiUrl}/api/user/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          role: userType === 'music_lover' ? 'listener' : 'creator',
          display_name: displayName,
          username: username,
          country: country,
          location: location,
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          onboarding_user_type: userType,
          ...(uploadedAvatarUrl && { avatar_url: uploadedAvatarUrl }),
        }),
      });

      // Publish the post (best effort — don't block onboarding on failure)
      try {
        const formData = new FormData();
        formData.append('content', firstPostText.trim());
        formData.append('post_type', 'text');
        if (firstPostImage) {
          const filename = firstPostImage.split('/').pop() || 'photo.jpg';
          formData.append('image', { uri: firstPostImage, name: filename, type: 'image/jpeg' } as any);
        }
        const postResponse = await fetch(`${config.apiUrl}/api/posts`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: formData,
        });
        // If API is down/returning HTML, fall back to direct Supabase insert
        if (!postResponse.ok) {
          throw new Error('API post failed');
        }
      } catch (postError) {
        console.warn('⚠️ API post failed, falling back to direct Supabase insert:', postError);
        try {
          await supabase.from('posts').insert({
            user_id: user?.id,
            content: firstPostText.trim(),
            post_type: 'text',
            is_published: true,
            created_at: new Date().toISOString(),
          });
          console.log('✅ First post published via Supabase fallback');
        } catch (supabaseError) {
          console.warn('⚠️ Supabase post fallback also failed:', supabaseError);
        }
      }

      // Complete onboarding
      await fetch(`${config.apiUrl}/api/user/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user?.id }),
      });

      await refreshUser();

      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('❌ Error publishing first post:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPublishingPost(false);
    }
  };

  // Load demo creators
  const loadDemoCreators = async () => {
    setLoadingCreators(true);
    try {
      // Try to fetch from API endpoint if available
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${config.apiUrl}/api/onboarding/value-demo`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.creators && data.creators.length > 0) {
          setDemoCreators(data.creators);
          setLoadingCreators(false);
          return;
        }
      }
    } catch (error) {
      console.log('⚠️ Value demo API not available, using fallback');
    }

    // Fallback: Use dbHelpers to get creators
    try {
      const { dbHelpers } = await import('../lib/supabase');
      const { data } = await dbHelpers.getCreatorsWithStats(3);
      if (data && data.length > 0) {
        setDemoCreators(data as CreatorProfile[]);
      } else {
        // Use mock data if no creators available
        setDemoCreators([
          {
            id: '1',
            display_name: 'Sarah Mitchell',
            username: 'sarahmitchell',
            location: 'London',
            bio: 'Gospel Producer',
          },
          {
            id: '2',
            display_name: 'James Okonkwo',
            username: 'jamesokonkwo',
            location: 'Manchester',
            bio: 'Session Drummer',
          },
          {
            id: '3',
            display_name: 'Amara Singh',
            username: 'amarasingh',
            location: 'Birmingham',
            bio: 'Audio Engineer',
          },
        ]);
      }
    } catch (error) {
      console.error('❌ Error loading demo creators:', error);
      // Use mock data as final fallback
      setDemoCreators([
        {
          id: '1',
          display_name: 'Sarah Mitchell',
          username: 'sarahmitchell',
          location: 'London',
          bio: 'Gospel Producer',
        },
        {
          id: '2',
          display_name: 'James Okonkwo',
          username: 'jamesokonkwo',
          location: 'Manchester',
          bio: 'Session Drummer',
        },
        {
          id: '3',
          display_name: 'Amara Singh',
          username: 'amarasingh',
          location: 'Birmingham',
          bio: 'Audio Engineer',
        },
      ]);
    } finally {
      setLoadingCreators(false);
    }
  };

  // Track which creators have been followed (persistent across the session)
  const [followedCreators, setFollowedCreators] = useState<Set<string>>(new Set());

  // Handle follow/unfollow creator using the follow endpoint
  const handleFollowCreator = async (creatorId: string) => {
    const isCurrentlyFollowing = followedCreators.has(creatorId);
    console.log('👆 Tapped creator:', creatorId, 'Currently following:', isCurrentlyFollowing);

    setFollowingIds(prev => new Set(prev).add(creatorId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${config.apiUrl}/api/user/${creatorId}/follow`;
      const method = isCurrentlyFollowing ? 'DELETE' : 'POST';
      console.log('🌐 API Call:', method, url);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
        },
      });

      const data = await response.json();
      console.log('📡 API Response:', {
        status: response.status,
        success: data.success,
        data: JSON.stringify(data, null, 2)
      });

      if (data.success) {
        if (isCurrentlyFollowing) {
          console.log('✅ Successfully unfollowed creator:', creatorId);
          setFollowedCreators(prev => {
            const newSet = new Set(prev);
            newSet.delete(creatorId);
            console.log('🔄 Updated followedCreators:', Array.from(newSet));
            return newSet;
          });
        } else {
          console.log('✅ Successfully followed creator:', creatorId);
          setFollowedCreators(prev => {
            const newSet = new Set(prev).add(creatorId);
            console.log('🔄 Updated followedCreators:', Array.from(newSet));
            return newSet;
          });
        }
      } else {
        console.error('❌ API failed:', data.error);
        Alert.alert('Error', data.error || `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} (${response.status})`);
      }
    } catch (error) {
      console.error('❌ Exception:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(creatorId);
        return newSet;
      });
    }
  };

  // Save genre preferences
  const saveGenrePreferences = async () => {
    if (!user?.id || selectedGenres.length < 3 || selectedGenres.length > 5) return false;

    try {
      console.log('💾 Saving genre preferences:', selectedGenres);
      
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${config.apiUrl}/api/users/${user.id}/genres`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          genre_ids: selectedGenres
        })
      });

      // Always try to parse JSON response even on error
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { raw: responseText };
      }

      if (!response.ok) {
        console.error('❌ Save genres API error:');
        console.error('  Status:', response.status, response.statusText);
        console.error('  Content-Type:', contentType);
        console.error('  Response:', JSON.stringify(data, null, 2));
        return false;
      }

      if (data.success) {
        console.log('✅ Genre preferences saved successfully');
        return true;
      } else {
        console.error('❌ Failed to save genre preferences:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving genre preferences:', error);
      return false;
    }
  };

  // Load event types from API
  const loadEventTypes = async () => {
    if (!userType) return;

    setLoadingEventTypes(true);
    try {
      console.log('🎪 Loading event types for user type:', userType);
      const url = `${config.apiUrl}/api/event-types?user_type=${userType}`;
      console.log('🔗 Event types URL:', url);
      
      const response = await fetch(url);
      
      // Check if response is OK and content-type is JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.error('❌ Event types API returned non-JSON or error:', response.status, contentType);
        // Gracefully handle error - don't block user
        return;
      }
      
      const data = await response.json();

      if (data.success && data.event_types) {
        console.log('✅ Loaded', data.event_types.length, 'event types');
        setAvailableEventTypes(data.event_types);
      } else {
        console.error('❌ Failed to load event types:', data);
      }
    } catch (error) {
      console.error('❌ Error loading event types:', error);
    } finally {
      setLoadingEventTypes(false);
    }
  };

  // Save event preferences
  const saveEventPreferences = async () => {
    if (!user?.id || selectedEventTypes.length < 2) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No session available');
        return false;
      }

      console.log('💾 Saving event preferences:', selectedEventTypes);
      const response = await fetch(
        `${config.apiUrl}/api/users/${user.id}/event-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            event_type_ids: selectedEventTypes
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Event preferences saved successfully');
        return true;
        } else {
        console.error('❌ Failed to save event preferences:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving event preferences:', error);
      return false;
    }
  };

  // Handle user type selection - routes to path-specific first step
  const handleUserTypeSelection = async (type: UserType) => {
    setUserType(type);
    console.log('👤 User selected type:', type);
    
    // Save user type via API
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const firstStep = getPathFirstStep(type);
        await fetch(`${config.apiUrl}/api/user/onboarding-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user?.id,
            userType: type,
            currentStep: firstStep || 'profileSetup',
          }),
        });
      }
    } catch (error) {
      console.warn('⚠️ Error saving user type:', error);
    }
    
    // Route to path-specific first step
    const firstStep = getPathFirstStep(type);
    if (firstStep) {
      animateStepTransition(firstStep);
    }
  };

  // Handle tier selection
  const handleTierSelection = (tier: 'free' | 'premium' | 'unlimited') => {
    setSelectedTier(tier);

    if (tier === 'free') {
      animateStepTransition('firstPost');
    } else {
      // Navigate to UpgradeScreen for premium and unlimited tiers
      navigation.navigate('Upgrade' as never);
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      // Call API to create Stripe subscription (immediate payment, no trial)
      const response = await fetch(`${config.apiUrl}/api/onboarding/upgrade-pro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          cardNumber,
          cardExpiry,
          cardCvv,
          cardholderName,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        Alert.alert('Payment Error', data.error || 'Failed to process payment. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ Pro subscription activated successfully');
      animateStepTransition('welcomeConfirmation');
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please check your card details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to animate step transitions (forward navigation)
  const animateStepTransition = (nextStep: OnboardingStep) => {
    setTransitionDirection('forward');
    // Animate slide-left and fade-out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50, // Slide left
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((_result) => {
      // Always navigate — even if animation was interrupted (prevents blank screen)
      setCurrentStep(nextStep);
    });
  };

  // Helper function to animate step transitions (backward navigation)
  const animateStepTransitionBack = (previousStep: OnboardingStep) => {
    setTransitionDirection('back');
    // Animate slide-right and fade-out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50, // Slide right
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After animation completes, navigate to previous screen
      setCurrentStep(previousStep);
    });
  };

  // Navigate to next step - path-aware routing
  const handleNext = async () => {
    setLoading(true);

    try {
      switch (currentStep) {
        // ============================================
        // MUSIC CREATOR PATH
        // ============================================
        case 'musicCreator_profileSetup':
          // Validate profile data
          if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter your display name');
            setLoading(false);
            return;
          }
          if (!username.trim() || username.length < 3) {
            Alert.alert('Required', 'Please enter a valid username (minimum 3 characters)');
            setLoading(false);
            return;
          }
          if (usernameAvailable === false) {
            Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
            setLoading(false);
            return;
          }
          animateStepTransition('musicCreator_genres');
          break;

        case 'musicCreator_genres':
          if (selectedGenres.length < 3) {
            Alert.alert('Select Genres', 'Please select at least 3 genres (maximum 5) to continue');
            setLoading(false);
            return;
          }
          if (selectedGenres.length > 5) {
            Alert.alert('Too Many Genres', 'Please select no more than 5 genres');
            setLoading(false);
            return;
          }
          await saveGenrePreferences();
          if (suggestionsChecked.current && suggestedCreators.length < 3) {
            animateStepTransition('musicCreator_role');
          } else {
            animateStepTransition('followSuggestions');
          }
          break;

        case 'musicCreator_role':
          // Validate at least 1 role selected
          if (selectedCreatorRoles.length < 1) {
            Alert.alert('Select Role', 'Please select at least 1 role to continue');
            setLoading(false);
            return;
          }
          // TODO: Save role selection to API in future
          animateStepTransition('musicCreator_events');
          break;

        case 'musicCreator_events':
          if (selectedEventTypes.length < 2) {
            Alert.alert('Select Events', 'Please select at least 2 event types to continue');
            setLoading(false);
            return;
          }
          const musicCreatorEventsSaved = await saveEventPreferences();
          if (!musicCreatorEventsSaved) {
            Alert.alert('Error', 'Failed to save event preferences. Please try again.');
            setLoading(false);
            return;
          }
          animateStepTransition('musicCreator_valueDemo');
          break;

        case 'musicCreator_valueDemo':
          animateStepTransition('notificationPermission');
          break;

        // ============================================
        // PODCAST CREATOR PATH
        // ============================================
        case 'podcastCreator_profileSetup':
          if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter your display name');
            setLoading(false);
            return;
          }
          if (!username.trim() || username.length < 3) {
            Alert.alert('Required', 'Please enter a valid username (minimum 3 characters)');
            setLoading(false);
            return;
          }
          if (usernameAvailable === false) {
            Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
            setLoading(false);
            return;
          }
          animateStepTransition('podcastCreator_categories');
          break;

        case 'podcastCreator_categories':
          // Validate minimum 2 categories
          if (selectedPodcastCategories.length < 2) {
            Alert.alert('Select Categories', 'Please select at least 2 podcast categories to continue');
            setLoading(false);
            return;
          }
          // TODO: Save podcast categories to API in future
          if (suggestionsChecked.current && suggestedCreators.length < 3) {
            animateStepTransition('podcastCreator_role');
          } else {
            animateStepTransition('followSuggestions');
          }
          break;

        case 'podcastCreator_role':
          // Validate at least 1 role selected
          if (selectedPodcastRoles.length < 1) {
            Alert.alert('Select Role', 'Please select at least 1 role to continue');
            setLoading(false);
            return;
          }
          // TODO: Save podcast role to API in future
          animateStepTransition('podcastCreator_events');
          break;

        case 'podcastCreator_events':
          if (selectedEventTypes.length < 2) {
            Alert.alert('Select Events', 'Please select at least 2 event types to continue');
            setLoading(false);
            return;
          }
          const podcastEventsSaved = await saveEventPreferences();
          if (!podcastEventsSaved) {
            Alert.alert('Error', 'Failed to save event preferences. Please try again.');
            setLoading(false);
            return;
          }
          animateStepTransition('podcastCreator_valueDemo');
          break;

        case 'podcastCreator_valueDemo':
          animateStepTransition('notificationPermission');
          break;

        // ============================================
        // INDUSTRY PROFESSIONAL PATH
        // ============================================
        case 'industryProfessional_profileSetup':
          if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter your display name');
            setLoading(false);
            return;
          }
          if (!username.trim() || username.length < 3) {
            Alert.alert('Required', 'Please enter a valid username (minimum 3 characters)');
            setLoading(false);
            return;
          }
          if (usernameAvailable === false) {
            Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
            setLoading(false);
            return;
          }
          // Company is optional, location recommended but not required
          animateStepTransition('industryProfessional_role');
          break;

        case 'industryProfessional_role':
          // Validate professional role selected (single selection)
          if (!selectedProfessionalRole) {
            Alert.alert('Select Role', 'Please select your professional role to continue');
            setLoading(false);
            return;
          }
          // TODO: Save professional role to API in future
          animateStepTransition('industryProfessional_genres');
          break;

        case 'industryProfessional_genres':
          if (selectedGenres.length < 2) {
            Alert.alert('Select Genres', 'Please select at least 2 genres (maximum 5) to continue');
            setLoading(false);
            return;
          }
          if (selectedGenres.length > 5) {
            Alert.alert('Too Many Genres', 'Please select no more than 5 genres');
            setLoading(false);
            return;
          }
          await saveGenrePreferences();
          if (suggestionsChecked.current && suggestedCreators.length < 3) {
            animateStepTransition('industryProfessional_goals');
          } else {
            animateStepTransition('followSuggestions');
          }
          break;

        case 'industryProfessional_goals':
          // Validate minimum 2 goals selected
          if (selectedProfessionalGoals.length < 2) {
            Alert.alert('Select Goals', 'Please select at least 2 goals to continue');
            setLoading(false);
            return;
          }
          // TODO: Save professional goals to API in future
          animateStepTransition('industryProfessional_valueDemo');
          break;

        case 'industryProfessional_valueDemo':
          animateStepTransition('notificationPermission');
          break;

        // ============================================
        // MUSIC LOVER PATH
        // ============================================
        case 'musicLover_profileSetup':
          if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter your display name');
            setLoading(false);
            return;
          }
          if (!username.trim() || username.length < 3) {
            Alert.alert('Required', 'Please enter a valid username (minimum 3 characters)');
            setLoading(false);
            return;
          }
          if (usernameAvailable === false) {
            Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
            setLoading(false);
            return;
          }
          animateStepTransition('musicLover_genres');
          break;

        case 'musicLover_genres':
          if (selectedGenres.length < 3) {
            Alert.alert('Select Genres', 'Please select at least 3 genres (maximum 5) to continue');
            setLoading(false);
            return;
          }
          if (selectedGenres.length > 5) {
            Alert.alert('Too Many Genres', 'Please select no more than 5 genres');
            setLoading(false);
            return;
          }
          await saveGenrePreferences();
          if (suggestionsChecked.current && suggestedCreators.length < 3) {
            animateStepTransition('musicLover_events');
          } else {
            animateStepTransition('followSuggestions');
          }
          break;

        case 'musicLover_events':
          if (selectedEventTypes.length < 2) {
            Alert.alert('Select Events', 'Please select at least 2 event types to continue');
            setLoading(false);
            return;
          }
          const musicLoverEventsSaved = await saveEventPreferences();
          if (!musicLoverEventsSaved) {
            Alert.alert('Error', 'Failed to save event preferences. Please try again.');
            setLoading(false);
            return;
          }
          animateStepTransition('musicLover_valueDemo');
          break;

        case 'musicLover_valueDemo':
          animateStepTransition('notificationPermission');
          break;

        // ============================================
        // EVENT ORGANISER PATH
        // ============================================
        case 'eventOrganiser_profileSetup':
          if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter your display name');
            setLoading(false);
            return;
          }
          if (!username.trim() || username.length < 3) {
            Alert.alert('Required', 'Please enter a valid username (minimum 3 characters)');
            setLoading(false);
            return;
          }
          if (usernameAvailable === false) {
            Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
            setLoading(false);
            return;
          }
          animateStepTransition('eventOrganiser_eventTypes');
          break;

        case 'eventOrganiser_eventTypes':
          if (selectedOrgEventTypes.length < 1) {
            Alert.alert('Select Event Types', 'Please select at least 1 event type to continue');
            setLoading(false);
            return;
          }
          if (suggestionsChecked.current && suggestedCreators.length < 3) {
            animateStepTransition('eventOrganiser_location');
          } else {
            animateStepTransition('followSuggestions');
          }
          break;

        case 'eventOrganiser_location':
          if (!selectedOrgReach) {
            Alert.alert('Select Reach', 'Please select your event reach to continue');
            setLoading(false);
            return;
          }
          animateStepTransition('eventOrganiser_valueDemo');
          break;

        case 'eventOrganiser_valueDemo':
          animateStepTransition('notificationPermission');
          break;

        // ============================================
        // SHARED STEPS
        // ============================================

        case 'followSuggestions':
          // Route back to the correct next step for each path
          if (userType === 'music_creator') animateStepTransition('musicCreator_role');
          else if (userType === 'podcast_creator') animateStepTransition('podcastCreator_role');
          else if (userType === 'industry_professional') animateStepTransition('industryProfessional_goals');
          else if (userType === 'music_lover') animateStepTransition('musicLover_events');
          else if (userType === 'event_organiser') animateStepTransition('eventOrganiser_location');
          break;

        case 'notificationPermission':
          // handleNext here just means "skip" — actual permission request is in the dedicated handler
          animateStepTransition('tierSelection');
          break;

        case 'welcomeConfirmation':
          // Complete onboarding
          console.log('🎉 Completing onboarding...');
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              Alert.alert('Error', 'Session expired. Please sign in again.');
              setLoading(false);
              return;
            }

            // Complete profile
            const profileResponse = await fetch(`${config.apiUrl}/api/user/complete-profile`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                role: userType === 'music_lover' ? 'listener' : 'creator',
                display_name: displayName,
                username: username,
                country: country,
                location: location,
                genres: selectedGenres.length > 0 ? selectedGenres : undefined,
                onboarding_user_type: userType,
              }),
            });

            if (!profileResponse.ok) {
              const errorData = await profileResponse.json().catch(() => ({}));
              Alert.alert('Error', errorData.error || 'Failed to save your profile.');
              setLoading(false);
              return;
            }

            // Complete onboarding
            const onboardingResponse = await fetch(`${config.apiUrl}/api/user/complete-onboarding`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                userId: user?.id,
              }),
            });

            if (!onboardingResponse.ok) {
              const errorData = await onboardingResponse.json().catch(() => ({}));
              Alert.alert('Error', errorData.error || 'Failed to complete onboarding.');
              setLoading(false);
              return;
            }

            await refreshUser();
            
            // Navigate to main app
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          } catch (error) {
            console.error('❌ Error completing onboarding:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
            setLoading(false);
            return;
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error in onboarding step:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation - path-aware
  const handleBack = () => {
    switch (currentStep) {
      case 'userType':
        animateStepTransitionBack('welcome');
        break;
      
      // Music Creator Path
      case 'musicCreator_profileSetup':
        animateStepTransitionBack('userType');
        break;
      case 'musicCreator_genres':
        animateStepTransitionBack('musicCreator_profileSetup');
        break;
      case 'musicCreator_role':
        suggestedCreators.length >= 3
          ? animateStepTransitionBack('followSuggestions')
          : animateStepTransitionBack('musicCreator_genres');
        break;
      case 'musicCreator_events':
        animateStepTransitionBack('musicCreator_role');
        break;
      case 'musicCreator_valueDemo':
        animateStepTransitionBack('musicCreator_events');
        break;

      // Podcast Creator Path
      case 'podcastCreator_profileSetup':
        animateStepTransitionBack('userType');
        break;
      case 'podcastCreator_categories':
        animateStepTransitionBack('podcastCreator_profileSetup');
        break;
      case 'podcastCreator_role':
        suggestedCreators.length >= 3
          ? animateStepTransitionBack('followSuggestions')
          : animateStepTransitionBack('podcastCreator_categories');
        break;
      case 'podcastCreator_events':
        animateStepTransitionBack('podcastCreator_role');
        break;
      case 'podcastCreator_valueDemo':
        animateStepTransitionBack('podcastCreator_events');
        break;

      // Industry Professional Path
      case 'industryProfessional_profileSetup':
        animateStepTransitionBack('userType');
        break;
      case 'industryProfessional_role':
        animateStepTransitionBack('industryProfessional_profileSetup');
        break;
      case 'industryProfessional_genres':
        animateStepTransitionBack('industryProfessional_role');
        break;
      case 'industryProfessional_goals':
        suggestedCreators.length >= 3
          ? animateStepTransitionBack('followSuggestions')
          : animateStepTransitionBack('industryProfessional_genres');
        break;
      case 'industryProfessional_valueDemo':
        animateStepTransitionBack('industryProfessional_goals');
        break;

      // Music Lover Path
      case 'musicLover_profileSetup':
        animateStepTransitionBack('userType');
        break;
      case 'musicLover_genres':
        animateStepTransitionBack('musicLover_profileSetup');
        break;
      case 'musicLover_events':
        suggestedCreators.length >= 3
          ? animateStepTransitionBack('followSuggestions')
          : animateStepTransitionBack('musicLover_genres');
        break;
      case 'musicLover_valueDemo':
        animateStepTransitionBack('musicLover_events');
        break;

      // Event Organiser Path
      case 'eventOrganiser_profileSetup':
        animateStepTransitionBack('userType');
        break;
      case 'eventOrganiser_eventTypes':
        animateStepTransitionBack('eventOrganiser_profileSetup');
        break;
      case 'eventOrganiser_location':
        suggestedCreators.length >= 3
          ? animateStepTransitionBack('followSuggestions')
          : animateStepTransitionBack('eventOrganiser_eventTypes');
        break;
      case 'eventOrganiser_valueDemo':
        animateStepTransitionBack('eventOrganiser_location');
        break;

      // Shared — followSuggestions goes back to the genre/category step
      case 'followSuggestions':
        if (userType === 'music_creator') animateStepTransitionBack('musicCreator_genres');
        else if (userType === 'podcast_creator') animateStepTransitionBack('podcastCreator_categories');
        else if (userType === 'industry_professional') animateStepTransitionBack('industryProfessional_genres');
        else if (userType === 'music_lover') animateStepTransitionBack('musicLover_genres');
        else if (userType === 'event_organiser') animateStepTransitionBack('eventOrganiser_eventTypes');
        break;

      // Shared steps
      case 'notificationPermission':
        // Go back to path-specific value demo
        if (userType === 'music_creator') animateStepTransitionBack('musicCreator_valueDemo');
        else if (userType === 'podcast_creator') animateStepTransitionBack('podcastCreator_valueDemo');
        else if (userType === 'industry_professional') animateStepTransitionBack('industryProfessional_valueDemo');
        else if (userType === 'music_lover') animateStepTransitionBack('musicLover_valueDemo');
        else if (userType === 'event_organiser') animateStepTransitionBack('eventOrganiser_valueDemo');
        break;
      case 'tierSelection':
        animateStepTransitionBack('notificationPermission');
        break;

      case 'firstPost':
        animateStepTransitionBack('tierSelection');
        break;
      case 'payment':
        animateStepTransitionBack('tierSelection');
        break;
      case 'welcomeConfirmation':
        if (selectedTier === 'pro') {
          animateStepTransitionBack('payment');
        } else {
          animateStepTransitionBack('tierSelection');
        }
        break;
      default:
        navigation.goBack();
        break;
    }
  };

  // Toggle genre selection
  const toggleGenre = (genreId: string) => {
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(selectedGenres.filter(id => id !== genreId));
    } else {
      // Prevent selecting more than 5 genres
      if (selectedGenres.length >= 5) {
        Alert.alert('Maximum 5 Genres', 'You can only select up to 5 genres. Please deselect one to add another.');
        return;
      }
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  // Toggle event type selection
  const toggleEventType = (eventTypeId: string) => {
    if (selectedEventTypes.includes(eventTypeId)) {
      setSelectedEventTypes(selectedEventTypes.filter(id => id !== eventTypeId));
    } else {
      setSelectedEventTypes([...selectedEventTypes, eventTypeId]);
    }
  };

  // Toggle creator role selection
  const toggleCreatorRole = (roleId: string) => {
    if (selectedCreatorRoles.includes(roleId)) {
      setSelectedCreatorRoles(selectedCreatorRoles.filter(id => id !== roleId));
    } else {
      setSelectedCreatorRoles([...selectedCreatorRoles, roleId]);
    }
  };

  // Load podcast categories from API
  const loadPodcastCategories = async () => {
    setLoadingPodcastCategories(true);
    try {
      console.log('🎙️ Loading podcast categories for onboarding...');
      const response = await fetch(`${config.apiUrl}/api/genres?category=podcast`);

      // Check if response is OK and content-type is JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.error('❌ Podcast categories API returned non-JSON or error:', response.status, contentType);
        // Gracefully handle error - don't block user
        return;
      }

      const data = await response.json();

      if (data.success && data.genres && data.genres.length > 0) {
        console.log('✅ Loaded', data.genres.length, 'podcast categories');
        setAvailablePodcastCategories(data.genres);
      } else {
        console.error('❌ API returned success=false or empty categories:', data);
      }
    } catch (error) {
      console.error('❌ Error loading podcast categories:', error);
    } finally {
      setLoadingPodcastCategories(false);
    }
  };

  // Toggle podcast category selection
  const togglePodcastCategory = (categoryId: string) => {
    if (selectedPodcastCategories.includes(categoryId)) {
      setSelectedPodcastCategories(selectedPodcastCategories.filter(id => id !== categoryId));
    } else {
      setSelectedPodcastCategories([...selectedPodcastCategories, categoryId]);
    }
  };

  // Toggle podcast role selection
  const togglePodcastRole = (roleId: string) => {
    if (selectedPodcastRoles.includes(roleId)) {
      setSelectedPodcastRoles(selectedPodcastRoles.filter(id => id !== roleId));
    } else {
      setSelectedPodcastRoles([...selectedPodcastRoles, roleId]);
    }
  };

  // Set professional role (single selection)
  const setProfessionalRole = (roleId: string) => {
    setSelectedProfessionalRole(roleId);
  };

  // Toggle professional goal selection
  const toggleProfessionalGoal = (goalId: string) => {
    if (selectedProfessionalGoals.includes(goalId)) {
      setSelectedProfessionalGoals(selectedProfessionalGoals.filter(id => id !== goalId));
    } else {
      setSelectedProfessionalGoals([...selectedProfessionalGoals, goalId]);
    }
  };

  // Calculate money-back guarantee end date
  const getMoneyBackGuaranteeEndDate = () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    return endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Render Welcome Screen
  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      {/* Background Image */}
      <ImageBackground
        source={require('../../assets/images/logos/bg03.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Dark Overlay for Text Readability */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]} />
      </ImageBackground>

      {/* Main Content Wrapper */}
      <View style={styles.newWelcomeContainer} pointerEvents="box-none">
        {/* Logo at Top - Centered */}
        <Animated.View
          style={[
            styles.newLogoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Image 
            source={require('../../assets/images/logos/logo-trans-lockup.png')} 
            style={styles.newWelcomeLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text Content Group */}
        <Animated.View
          style={[
            styles.newTextContent,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
          pointerEvents="none"
        >
          {/* Main Headline */}
          <Text style={styles.newWelcomeHeadline}>
            LinkedIn for{'\n'}audio creators
          </Text>
          
          {/* Sub-headline */}
          <Text style={styles.newWelcomeSubheadline}>
            Network with creators and event promoters. Upload your audio for free, earn from fans, and collaborate, all in one platform.
          </Text>
        </Animated.View>

        {/* CTA Section */}
        <Animated.View
          style={[
            styles.newCtaSection,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.newGetStartedButton}
            onPress={() => {
              console.log('🎯 Get Started button pressed - animating exit');
              // Animate slide-left and fade-out
              Animated.parallel([
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 400,
                  useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                  toValue: -50, // Slide left
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // After animation completes, navigate to next screen
                console.log('✅ Exit animation complete - navigating to userType');
                setCurrentStep('userType');
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.newGetStartedText}>Get Started</Text>
            
            {/* Arrow Circle Button */}
            <View style={styles.newArrowButtonContainer}>
              {/* Glow effect */}
              <View style={styles.newArrowGlow} />
              
              {/* Button Body */}
              <View style={styles.newArrowButton}>
                <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.newFooter} pointerEvents="none">
            <View style={styles.newFooterDivider} />
            <View style={styles.newFooterContent}>
              {/* Avatar Circles */}
              <View style={styles.newAvatarGroup}>
                <View style={[styles.newAvatar, { backgroundColor: '#4FD1C7', zIndex: 3 }]} />
                <View style={[styles.newAvatar, { backgroundColor: '#FF6B6B', marginLeft: -8, zIndex: 2 }]} />
                <View style={[styles.newAvatarPlus, { marginLeft: -8, zIndex: 1 }]}>
                  <Text style={styles.newAvatarPlusText}>+</Text>
                </View>
              </View>
              
              {/* Footer Text */}
              <Text style={styles.newFooterText}>
                Free audio distribution • Join thousands of creators
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
      
  // Render User Type Selection
  const renderUserTypeSelection = () => (
      <View style={styles.stepContainer}>
        <ImageBackground
          source={require('../../assets/images/logos/bg01.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        </ImageBackground>
        <View style={styles.headerWithBack}>
          <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
          <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
            {getStepIndicatorText('userType', userType || 'music_creator')}
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <Animated.View
            style={[
              { marginBottom: 32, marginTop: 16 },
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={styles.newStepTitle}>
              What brings you to SoundBridge?
            </Text>
            <Text style={styles.newStepSubtitle}>
              Tell us what you are or what category you'd love to be:
            </Text>
          </Animated.View>

          {/* Card Stack */}
          <Animated.View
            style={[
              { flex: 1, gap: 12 },
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            {/* Option 1: Music Creator */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'music_creator' && styles.roleCardSelected
              ]}
              onPress={() => {
                setSelectedRole('music_creator');
                handleUserTypeSelection('music_creator');
              }}
            >
              <View style={[styles.roleIconBox, selectedRole === 'music_creator' && { backgroundColor: '#FF6B6B' }]}>
                <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContent}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>Music Creator</Text>
                  <View style={[styles.radioCircle, selectedRole === 'music_creator' && styles.radioCircleChecked]}>
                    {selectedRole === 'music_creator' && <View style={styles.radioCircleInner} />}
                  </View>
                </View>
                <Text style={styles.roleDescription}>
                  Showcase your work and get discovered.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Podcast Creator */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'podcast_creator' && styles.roleCardSelected
              ]}
              onPress={() => {
                setSelectedRole('podcast_creator');
                handleUserTypeSelection('podcast_creator');
              }}
            >
              <View style={[styles.roleIconBox, selectedRole === 'podcast_creator' && { backgroundColor: '#4FD1C7' }]}>
                <Ionicons name="mic" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContent}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>Podcast Creator</Text>
                  <View style={[styles.radioCircle, selectedRole === 'podcast_creator' && styles.radioCircleChecked]}>
                    {selectedRole === 'podcast_creator' && <View style={styles.radioCircleInner} />}
                  </View>
                </View>
                <Text style={styles.roleDescription}>
                  Build your audience and monetise your content.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 3: Industry Professional */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'industry_professional' && styles.roleCardSelected
              ]}
              onPress={() => {
                setSelectedRole('industry_professional');
                handleUserTypeSelection('industry_professional');
              }}
            >
              <View style={[styles.roleIconBox, selectedRole === 'industry_professional' && { backgroundColor: '#A78BFA' }]}>
                <Ionicons name="briefcase" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContent}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>Industry Professional</Text>
                  <View style={[styles.radioCircle, selectedRole === 'industry_professional' && styles.radioCircleChecked]}>
                    {selectedRole === 'industry_professional' && <View style={styles.radioCircleInner} />}
                  </View>
                </View>
                <Text style={styles.roleDescription}>
                  Find talent and book collaborations.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 4: Music Lover */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'music_lover' && styles.roleCardSelected
              ]}
              onPress={() => {
                setSelectedRole('music_lover');
                handleUserTypeSelection('music_lover');
              }}
            >
              <View style={[styles.roleIconBox, selectedRole === 'music_lover' && { backgroundColor: '#F472B6' }]}>
                <Ionicons name="headset" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContent}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>Music Lover</Text>
                  <View style={[styles.radioCircle, selectedRole === 'music_lover' && styles.radioCircleChecked]}>
                    {selectedRole === 'music_lover' && <View style={styles.radioCircleInner} />}
                  </View>
                </View>
                <Text style={styles.roleDescription}>
                  Discover and support independent creators.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 5: Event Organiser */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'event_organiser' && styles.roleCardSelected
              ]}
              onPress={() => {
                setSelectedRole('event_organiser');
                handleUserTypeSelection('event_organiser');
              }}
            >
              <View style={[styles.roleIconBox, selectedRole === 'event_organiser' && { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="ticket" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContent}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>Event Organiser</Text>
                  <View style={[styles.radioCircle, selectedRole === 'event_organiser' && styles.radioCircleChecked]}>
                    {selectedRole === 'event_organiser' && <View style={styles.radioCircleInner} />}
                  </View>
                </View>
                <Text style={styles.roleDescription}>
                  Promote events, sell tickets, grow your audience.
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer / Skip Action */}
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => handleUserTypeSelection(null)}>
              <Text style={styles.skipButtonTextNew}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
  );

  // Render Quick Setup (consolidated profile form) - Legacy function
  const renderQuickSetup = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType || 'music_creator')}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Let's set up your profile
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should people call you?"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.usernamePrefix, { color: theme.colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, styles.usernameInput, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Checking...
                </Text>
              ) : usernameAvailable === true ? (
                <Text style={[styles.usernameStatus, { color: '#10B981' }]}>
                  ✓ Available
                </Text>
              ) : usernameAvailable === false ? (
                <Text style={[styles.usernameStatus, { color: '#EF4444' }]}>
                  ✗ Already taken
                </Text>
              ) : username.length > 0 && username.length < 3 ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Minimum 3 characters
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                What genres do you work with?
              </Text>
              <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
                (Select 3-5 genres)
              </Text>
              {loadingGenres ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.genreLoading} />
              ) : (
                <View style={styles.genresList}>
                  {availableGenres.slice(0, 12).map((item) => {
                    const isSelected = selectedGenres.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.genreChip,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          isSelected && styles.genreChipSelected,
                        ]}
                        onPress={() => toggleGenre(item.id)}
                      >
                        <Text style={[
                          styles.genreText,
                          { color: theme.colors.text },
                          isSelected && styles.genreTextSelected,
                        ]}>
                          {item.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {selectedGenres.length > 0 && (
                <Text style={[styles.selectedGenresText, { color: theme.colors.textSecondary }]}>
                  Selected: {selectedGenres.map(id => availableGenres.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Your Location (Optional)
              </Text>
              <CountrySelector
                value={country}
                onChange={setCountry}
              />
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  marginTop: 12,
                }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City (e.g., London, Manchester)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modernButtonContainer,
                (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || selectedGenres.length < 3 || selectedGenres.length > 5) && styles.buttonDisabled
              ]}
              onPress={handleNext}
              disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || selectedGenres.length < 3 || selectedGenres.length > 5 || loading}
            >
              <LinearGradient
                colors={(!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || selectedGenres.length < 3 || selectedGenres.length > 5)
                  ? ['#9CA3AF', '#9CA3AF']
                  : ['#7C3AED', '#6D28D9', '#5B21B6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modernButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // ============================================
  // MUSIC CREATOR PATH RENDER FUNCTIONS
  // ============================================

  // Render Music Creator Profile Setup
  const renderMusicCreatorProfileSetup = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Let's set up your profile
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Profile Photo */}
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={handleAvatarPick}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPickerImage} />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarPickerBadge}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarPickerLabel, { color: theme.colors.textSecondary }]}>
              Add profile photo (optional)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should people call you?"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.usernamePrefix, { color: theme.colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, styles.usernameInput, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Checking...
                </Text>
              ) : usernameAvailable === true ? (
                <Text style={[styles.usernameStatus, { color: '#10B981' }]}>
                  ✓ Available
                </Text>
              ) : usernameAvailable === false ? (
                <Text style={[styles.usernameStatus, { color: '#EF4444' }]}>
                  ✗ Already taken
                </Text>
              ) : username.length > 0 && username.length < 3 ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Minimum 3 characters
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Your Location (Optional)
              </Text>
              <CountrySelector
                value={country}
                onChange={setCountry}
              />
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  marginTop: 12,
                }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City (e.g., London, Manchester)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modernButtonContainer,
                (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false) && styles.buttonDisabled
              ]}
              onPress={handleNext}
              disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || loading}
            >
              <LinearGradient
                colors={(!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false)
                  ? ['#9CA3AF', '#9CA3AF']
                  : ['#7C3AED', '#6D28D9', '#5B21B6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modernButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // Render Music Creator Genres Selection
  const renderMusicCreatorGenres = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
        <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
          <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What genres do you create?
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Select the genres you work with so we can personalize your experience
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select 3-5 genres)
        </Text>
      </Animated.View>

      <Animated.View 
        style={[
            styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
          {selectedGenres.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedGenres.length} of 5
        </Text>
            </View>
          )}

          {loadingGenres ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading genres...
        </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availableGenres.map((item) => {
                const isSelected = selectedGenres.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => toggleGenre(item.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              (selectedGenres.length < 3 || selectedGenres.length > 5) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 3 || selectedGenres.length > 5 || loading}
          >
            <LinearGradient
              colors={(selectedGenres.length < 3 || selectedGenres.length > 5)
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
            </View>
  );

  // Render Music Creator Role Selection
  const renderMusicCreatorRole = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
          </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What's your role in music?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Help others find you based on what you do
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select all that apply)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedCreatorRoles.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedCreatorRoles.length} role{selectedCreatorRoles.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <View style={styles.genresList}>
            {creatorRoles.map((role) => {
              const isSelected = selectedCreatorRoles.includes(role.id);
              return (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.genreChipSelected,
                  ]}
                  onPress={() => toggleCreatorRole(role.id)}
                >
                  <Text style={[
                    styles.genreText,
                    { color: theme.colors.text },
                    isSelected && styles.genreTextSelected,
                  ]}>
                    {role.emoji} {role.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedCreatorRoles.length < 1 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedCreatorRoles.length < 1 || loading}
          >
            <LinearGradient
              colors={selectedCreatorRoles.length < 1
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
            </View>
  );

  // Render Music Creator Events
  const renderMusicCreatorEvents = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
          </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What events interest you?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            We'll show you concerts, open mics, and workshops you'll love
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select at least 2)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedEventTypes.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedEventTypes.length} events
              </Text>
            </View>
          )}

          {loadingEventTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading event types...
          </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availableEventTypes.map((eventType) => {
                const isSelected = selectedEventTypes.includes(eventType.id);
                return (
                  <TouchableOpacity
                    key={eventType.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => toggleEventType(eventType.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {eventType.icon_emoji} {eventType.name}
          </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
        </View>
          )}

        <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedEventTypes.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedEventTypes.length < 2 || loading}
        >
          <LinearGradient
              colors={selectedEventTypes.length < 2
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
            onPress={() => {
              setSelectedEventTypes([]);
              animateStepTransition('musicCreator_valueDemo');
            }}
        >
          <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              Skip for now
          </Text>
        </TouchableOpacity>
      </Animated.View>
        </ScrollView>
    </View>
  );

  // Render Music Creator Value Demo
  const renderMusicCreatorValueDemo = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            You're joining an amazing community of music creators
          </Text>
        </Animated.View>

        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading creators...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.stackedCreatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => {
              const isFollowing = followedCreators.has(creator.id) || followingIds.has(creator.id);
              return (
                <View
                  key={creator.id || index}
                  style={[
                    styles.stackedCreatorCard,
                    {
                      backgroundColor: theme.colors.surface,
                      marginBottom: 16,
                    }
                  ]}
                >
                  <View style={styles.creatorCardContent}>
                    <View style={styles.creatorAvatar}>
                      {creator.avatar_url ? (
                        <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.stackedCreatorInfo}>
                      <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
                        {creator.display_name || creator.username || 'Creator'}
                      </Text>
                      <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {creator.bio || 'Music Creator'}
                      </Text>
                      <View style={styles.creatorStats}>
                        <View style={styles.creatorStatItem}>
                          <Ionicons name="people" size={14} color="#DC2626" />
                          <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                            {creator.followers_count || 0}
                          </Text>
                        </View>
                        <View style={styles.creatorStatItem}>
                          <Ionicons name="musical-notes" size={14} color="#DC2626" />
                          <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                            {creator.tracks_count || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.followButton, followingIds.has(creator.id) && styles.followButtonLoading]}
                      onPress={() => handleFollowCreator(creator.id)}
                      disabled={followingIds.has(creator.id)}
                    >
                      {followingIds.has(creator.id) ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : followedCreators.has(creator.id) ? (
                        <Text style={styles.followButtonText}>Following</Text>
                      ) : (
                        <Text style={styles.followButtonText}>Follow</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View 
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.text }]}>
            Ready to showcase your music?
          </Text>
          <TouchableOpacity
            style={styles.modernButtonContainer}
            onPress={handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // ============================================
  // PODCAST CREATOR PATH RENDER FUNCTIONS
  // ============================================

  // Render Podcast Creator Profile Setup
  const renderPodcastCreatorProfileSetup = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Let's set up your profile
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Profile Photo */}
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={handleAvatarPick}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPickerImage} />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarPickerBadge}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarPickerLabel, { color: theme.colors.textSecondary }]}>
              Add profile photo (optional)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should people call you?"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.usernamePrefix, { color: theme.colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, styles.usernameInput, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Checking...
                </Text>
              ) : usernameAvailable === true ? (
                <Text style={[styles.usernameStatus, { color: '#10B981' }]}>
                  ✓ Available
                </Text>
              ) : usernameAvailable === false ? (
                <Text style={[styles.usernameStatus, { color: '#EF4444' }]}>
                  ✗ Already taken
                </Text>
              ) : username.length > 0 && username.length < 3 ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Minimum 3 characters
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Your Location (Optional)
              </Text>
              <CountrySelector
                value={country}
                onChange={setCountry}
              />
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  marginTop: 12,
                }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City (e.g., London, Manchester)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modernButtonContainer,
                (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false) && styles.buttonDisabled
              ]}
              onPress={handleNext}
              disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || loading}
            >
              <LinearGradient
                colors={(!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false)
                  ? ['#9CA3AF', '#9CA3AF']
                  : ['#7C3AED', '#6D28D9', '#5B21B6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modernButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // Render Podcast Creator Categories Selection
  const renderPodcastCreatorCategories = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What do you podcast about?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Select your podcast topics so we can connect you with the right audience
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select at least 2)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedPodcastCategories.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedPodcastCategories.length} categories
              </Text>
            </View>
          )}

          {loadingPodcastCategories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading categories...
              </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availablePodcastCategories.map((item) => {
                const isSelected = selectedPodcastCategories.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => togglePodcastCategory(item.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedPodcastCategories.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedPodcastCategories.length < 2 || loading}
          >
            <LinearGradient
              colors={selectedPodcastCategories.length < 2
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Podcast Creator Role Selection
  const renderPodcastCreatorRole = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What's your role in podcasting?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Help others find you based on what you do
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select all that apply)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedPodcastRoles.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedPodcastRoles.length} role{selectedPodcastRoles.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <View style={styles.genresList}>
            {podcastRoles.map((role) => {
              const isSelected = selectedPodcastRoles.includes(role.id);
              return (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.genreChipSelected,
                  ]}
                  onPress={() => togglePodcastRole(role.id)}
                >
                  <Text style={[
                    styles.genreText,
                    { color: theme.colors.text },
                    isSelected && styles.genreTextSelected,
                  ]}>
                    {role.emoji} {role.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedPodcastRoles.length < 1 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedPodcastRoles.length < 1 || loading}
          >
            <LinearGradient
              colors={selectedPodcastRoles.length < 1
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Podcast Creator Events
  const renderPodcastCreatorEvents = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What events interest you?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            We'll show you podcasting events and networking opportunities
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select at least 2)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedEventTypes.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedEventTypes.length} events
              </Text>
            </View>
          )}

          {loadingEventTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading event types...
              </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availableEventTypes.map((eventType) => {
                const isSelected = selectedEventTypes.includes(eventType.id);
                return (
                  <TouchableOpacity
                    key={eventType.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => toggleEventType(eventType.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {eventType.icon_emoji} {eventType.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedEventTypes.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedEventTypes.length < 2 || loading}
          >
            <LinearGradient
              colors={selectedEventTypes.length < 2
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setSelectedEventTypes([]);
              animateStepTransition('podcastCreator_valueDemo');
            }}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Podcast Creator Value Demo
  const renderPodcastCreatorValueDemo = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            You're joining an amazing community of podcast creators
          </Text>
        </Animated.View>

        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading creators...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.stackedCreatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => {
              const isFollowing = followedCreators.has(creator.id) || followingIds.has(creator.id);
              return (
                <View
                  key={creator.id || index}
                  style={[
                    styles.stackedCreatorCard,
                    {
                      backgroundColor: theme.colors.surface,
                      marginTop: index === 0 ? 0 : -140,
                      zIndex: demoCreators.length - index,
                    }
                  ]}
                >
                  <View style={styles.stackedCreatorHeader}>
                    <View style={styles.creatorAvatar}>
                      {creator.avatar_url ? (
                        <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.stackedCreatorInfo}>
                      <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                        {creator.display_name || creator.username || 'Creator'}
                      </Text>
                      <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]}>
                        {creator.bio || 'Podcast Creator'} • {creator.location || 'Location'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.creatorStats}>
                    <View style={styles.creatorStatItem}>
                      <Ionicons name="people" size={16} color="#DC2626" />
                      <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                        {creator.followers_count || 0}
                      </Text>
                    </View>
                    <View style={styles.creatorStatItem}>
                      <Ionicons name="mic" size={16} color="#DC2626" />
                      <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                        {creator.tracks_count || Math.floor(Math.random() * 200) + 50} episodes
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      followingIds.has(creator.id) && styles.followButtonLoading
                    ]}
                    onPress={() => handleFollowCreator(creator.id)}
                    disabled={followingIds.has(creator.id)}
                  >
                    {followingIds.has(creator.id) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : followedCreators.has(creator.id) ? (
                      <Text style={styles.followButtonText}>Following</Text>
                    ) : (
                      <Text style={styles.followButtonText}>Follow</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View 
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.text }]}>
            Ready to grow your podcast?
          </Text>
          <TouchableOpacity
            style={styles.modernButtonContainer}
            onPress={handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // ============================================
  // INDUSTRY PROFESSIONAL PATH RENDER FUNCTIONS
  // ============================================

  // Render Industry Professional Profile Setup
  const renderIndustryProfessionalProfileSetup = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Let's set up your professional profile
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Profile Photo */}
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={handleAvatarPick}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPickerImage} />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarPickerBadge}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarPickerLabel, { color: theme.colors.textSecondary }]}>
              Add profile photo (optional)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should people call you?"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.usernamePrefix, { color: theme.colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, styles.usernameInput, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Checking...
                </Text>
              ) : usernameAvailable === true ? (
                <Text style={[styles.usernameStatus, { color: '#10B981' }]}>
                  ✓ Available
                </Text>
              ) : usernameAvailable === false ? (
                <Text style={[styles.usernameStatus, { color: '#EF4444' }]}>
                  ✗ Already taken
                </Text>
              ) : username.length > 0 && username.length < 3 ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Minimum 3 characters
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Company/Organization (Optional)
              </Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={company}
                onChangeText={setCompany}
                placeholder="e.g., Premier Studios, Record Label Name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Your Location
              </Text>
              <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
                (Recommended - helps with local talent search)
              </Text>
              <CountrySelector
                value={country}
                onChange={setCountry}
              />
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  marginTop: 12,
                }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City (e.g., London, Manchester)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modernButtonContainer,
                (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false) && styles.buttonDisabled
              ]}
              onPress={handleNext}
              disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || loading}
            >
              <LinearGradient
                colors={(!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false)
                  ? ['#9CA3AF', '#9CA3AF']
                  : ['#7C3AED', '#6D28D9', '#5B21B6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modernButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // Render Industry Professional Role Selection
  const renderIndustryProfessionalRole = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What's your role in the industry?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Help creators understand how you can work together
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select your primary role)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.genresList}>
            {professionalRoles.map((role) => {
              const isSelected = selectedProfessionalRole === role.id;
              return (
        <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.genreChipSelected,
                  ]}
                  onPress={() => setProfessionalRole(role.id)}
                >
                  <Text style={[
                    styles.genreText,
                    { color: theme.colors.text },
                    isSelected && styles.genreTextSelected,
                  ]}>
                    {role.emoji} {role.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              !selectedProfessionalRole && styles.buttonDisabled
            ]}
          onPress={handleNext}
            disabled={!selectedProfessionalRole || loading}
          >
            <LinearGradient
              colors={!selectedProfessionalRole
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Industry Professional Genres
  const renderIndustryProfessionalGenres = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
          </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What genres do you work with?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            We'll match you with relevant creators and opportunities
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select 2-5 genres)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedGenres.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedGenres.length} of 5
              </Text>
            </View>
          )}

          {loadingGenres ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading genres...
              </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availableGenres.map((item) => {
                const isSelected = selectedGenres.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => toggleGenre(item.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
        </TouchableOpacity>
                );
              })}
      </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              (selectedGenres.length < 2 || selectedGenres.length > 5) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 2 || selectedGenres.length > 5 || loading}
          >
            <LinearGradient
              colors={(selectedGenres.length < 2 || selectedGenres.length > 5)
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        </ScrollView>
    </View>
  );

  // Render Industry Professional Goals
  const renderIndustryProfessionalGoals = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What brings you to SoundBridge?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Help us personalize your experience
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select all that apply)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedProfessionalGoals.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedProfessionalGoals.length} goal{selectedProfessionalGoals.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <View style={styles.genresList}>
            {professionalGoals.map((goal) => {
              const isSelected = selectedProfessionalGoals.includes(goal.id);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.genreChipSelected,
                  ]}
                  onPress={() => toggleProfessionalGoal(goal.id)}
                >
                  <Text style={[
                    styles.genreText,
                    { color: theme.colors.text },
                    isSelected && styles.genreTextSelected,
                  ]}>
                    {goal.emoji} {goal.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedProfessionalGoals.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedProfessionalGoals.length < 2 || loading}
          >
        <LinearGradient
              colors={selectedProfessionalGoals.length < 2
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
          }
          start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Industry Professional Value Demo
  const renderIndustryProfessionalValueDemo = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Connect with talented creators and industry peers
          </Text>
        </Animated.View>

        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading creators...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.stackedCreatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => {
              const isFollowing = followedCreators.has(creator.id) || followingIds.has(creator.id);
              return (
                <View
                  key={creator.id || index}
                  style={[
                    styles.stackedCreatorCard,
                    {
                      backgroundColor: theme.colors.surface,
                      marginTop: index === 0 ? 0 : -140,
                      zIndex: demoCreators.length - index,
                    }
                  ]}
                >
                  <View style={styles.stackedCreatorHeader}>
                    <View style={styles.creatorAvatar}>
                      {creator.avatar_url ? (
                        <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.stackedCreatorInfo}>
                      <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
                        {creator.display_name || creator.username || 'Professional'}
                      </Text>
                      <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {creator.bio || 'Industry Professional'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.creatorStats}>
                    <View style={styles.creatorStatItem}>
                      <Ionicons name="people" size={16} color="#DC2626" />
                      <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                        {creator.connections_count || 0}
                      </Text>
                    </View>
                    <View style={styles.creatorStatItem}>
                      <Ionicons name="briefcase" size={16} color="#DC2626" />
                      <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                        {creator.tracks_count || 0}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.followButton, followingIds.has(creator.id) && styles.followButtonLoading]}
                    onPress={() => handleFollowCreator(creator.id)}
                    disabled={followingIds.has(creator.id)}
                  >
                    {followingIds.has(creator.id) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : followedCreators.has(creator.id) ? (
                      <Text style={styles.followButtonText}>Following</Text>
                    ) : (
                      <Text style={styles.followButtonText}>Follow</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View 
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.text }]}>
            Ready to find your next collaboration?
          </Text>
          <TouchableOpacity
            style={styles.modernButtonContainer}
            onPress={handleNext}
            disabled={loading}
          >
        <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // ============================================
  // MUSIC LOVER PATH RENDER FUNCTIONS
  // ============================================

  // Render Music Lover Profile Setup
  const renderMusicLoverProfileSetup = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Let's set up your profile
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Profile Photo */}
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={handleAvatarPick}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPickerImage} />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarPickerBadge}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarPickerLabel, { color: theme.colors.textSecondary }]}>
              Add profile photo (optional)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="How should people call you?"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.usernamePrefix, { color: theme.colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, styles.usernameInput, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Checking...
                </Text>
              ) : usernameAvailable === true ? (
                <Text style={[styles.usernameStatus, { color: '#10B981' }]}>
                  ✓ Available
                </Text>
              ) : usernameAvailable === false ? (
                <Text style={[styles.usernameStatus, { color: '#EF4444' }]}>
                  ✗ Already taken
                </Text>
              ) : username.length > 0 && username.length < 3 ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>
                  Minimum 3 characters
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Your Location (Optional)
              </Text>
              <CountrySelector
                value={country}
                onChange={setCountry}
              />
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  marginTop: 12,
                }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City (e.g., London, Manchester)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modernButtonContainer,
                (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false) && styles.buttonDisabled
              ]}
              onPress={handleNext}
              disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || loading}
            >
              <LinearGradient
                colors={(!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false)
                  ? ['#9CA3AF', '#9CA3AF']
                  : ['#7C3AED', '#6D28D9', '#5B21B6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modernButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // Render Music Lover Favorite Genres
  const renderMusicLoverGenres = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What genres do you love?
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            We'll recommend creators and music you'll enjoy
        </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select 3-5 genres)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedGenres.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedGenres.length} of 5
        </Text>
      </View>
          )}

      {loadingGenres ? (
        <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading genres...
          </Text>
        </View>
      ) : (
          <View style={styles.genresList}>
            {availableGenres.map((item) => {
              const isSelected = selectedGenres.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.genreChipSelected,
                  ]}
                  onPress={() => toggleGenre(item.id)}
                >
                  <Text style={[
                    styles.genreText,
                    { color: theme.colors.text },
                    isSelected && styles.genreTextSelected,
                  ]}>
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              (selectedGenres.length < 3 || selectedGenres.length > 5) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 3 || selectedGenres.length > 5 || loading}
          >
            <LinearGradient
              colors={(selectedGenres.length < 3 || selectedGenres.length > 5)
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
                {loading ? (
                <ActivityIndicator color="#FFFFFF" />
                ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
                )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
              </View>
  );

  // Render Music Lover Events
  const renderMusicLoverEvents = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
                </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What events would you attend?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            We'll show you concerts and events in your area
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select at least 2)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedEventTypes.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedEventTypes.length} events
                </Text>
              </View>
          )}

          {loadingEventTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading event types...
              </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availableEventTypes.map((eventType) => {
                const isSelected = selectedEventTypes.includes(eventType.id);
                return (
                  <TouchableOpacity
                    key={eventType.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => toggleEventType(eventType.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {eventType.icon_emoji} {eventType.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedEventTypes.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedEventTypes.length < 2 || loading}
          >
            <LinearGradient
              colors={selectedEventTypes.length < 2
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setSelectedEventTypes([]);
              animateStepTransition('musicLover_valueDemo');
            }}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
        </View>
  );

  // Render Music Lover Value Demo
  const renderMusicLoverValueDemo = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Discover and support independent creators
          </Text>
        </Animated.View>

        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading creators...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.stackedCreatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => {
              const isFollowing = followedCreators.has(creator.id) || followingIds.has(creator.id);
              return (
                <View
                  key={creator.id || index}
                  style={[
                    styles.stackedCreatorCard,
                    {
                      backgroundColor: theme.colors.surface,
                      marginBottom: 16,
                    }
                  ]}
                >
                  <View style={styles.creatorCardContent}>
                    <View style={styles.creatorAvatar}>
                      {creator.avatar_url ? (
                        <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.stackedCreatorInfo}>
                      <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
                        {creator.display_name || creator.username || 'Creator'}
                      </Text>
                      <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {creator.bio || 'Music Creator'}
                      </Text>
                      <View style={styles.creatorStats}>
                        <View style={styles.creatorStatItem}>
                          <Ionicons name="people" size={14} color="#DC2626" />
                          <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                            {creator.followers_count || 0}
                          </Text>
                        </View>
                        <View style={styles.creatorStatItem}>
                          <Ionicons name="musical-notes" size={14} color="#DC2626" />
                          <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                            {creator.tracks_count || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.followButton, followingIds.has(creator.id) && styles.followButtonLoading]}
                      onPress={() => handleFollowCreator(creator.id)}
                      disabled={followingIds.has(creator.id)}
                    >
                      {followingIds.has(creator.id) ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : followedCreators.has(creator.id) ? (
                        <Text style={styles.followButtonText}>Following</Text>
                      ) : (
                        <Text style={styles.followButtonText}>Follow</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View 
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.text }]}>
            Ready to discover new music?
          </Text>
          <TouchableOpacity
            style={styles.modernButtonContainer}
            onPress={handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Event Preferences - Legacy function
  const renderEventPreferences = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType || 'music_creator')}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What events interest you?
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            We'll show you concerts, open mics, and workshops you'll love
          </Text>
          <Text style={[styles.inputHint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            (Select at least 2)
          </Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {selectedEventTypes.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedEventTypes.length} events
              </Text>
            </View>
          )}

          {loadingEventTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading event types...
              </Text>
            </View>
          ) : (
            <View style={styles.genresList}>
              {availableEventTypes.map((eventType) => {
                const isSelected = selectedEventTypes.includes(eventType.id);
                return (
                  <TouchableOpacity
                    key={eventType.id}
                    style={[
                      styles.genreChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      isSelected && styles.genreChipSelected,
                    ]}
                    onPress={() => toggleEventType(eventType.id)}
                  >
                    <Text style={[
                      styles.genreText,
                      { color: theme.colors.text },
                      isSelected && styles.genreTextSelected,
                    ]}>
                      {eventType.icon_emoji} {eventType.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              selectedEventTypes.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedEventTypes.length < 2 || loading}
          >
        <LinearGradient
              colors={selectedEventTypes.length < 2
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
          }
          start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setSelectedEventTypes([]);
              animateStepTransition('valueDemo');
            }}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Value Demonstration - Legacy function
  const renderValueDemo = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType || 'music_creator')}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            You're joining an amazing community
          </Text>
        </Animated.View>

        {loadingCreators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading creators...
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.stackedCreatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => {
              const isFollowing = followedCreators.has(creator.id) || followingIds.has(creator.id);
              return (
                <View
                  key={creator.id || index}
                  style={[
                    styles.stackedCreatorCard,
                    {
                      backgroundColor: theme.colors.surface,
                      marginBottom: 16,
                    }
                  ]}
                >
                  <View style={styles.creatorCardContent}>
                    <View style={styles.creatorAvatar}>
                      {creator.avatar_url ? (
                        <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.stackedCreatorInfo}>
                      <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
                        {creator.display_name || creator.username || 'Creator'}
                      </Text>
                      <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {creator.bio || 'Music Creator'}
                      </Text>
                      <View style={styles.creatorStats}>
                        <View style={styles.creatorStatItem}>
                          <Ionicons name="people" size={14} color="#DC2626" />
                          <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                            {creator.followers_count || 0}
                          </Text>
                        </View>
                        <View style={styles.creatorStatItem}>
                          <Ionicons name="musical-notes" size={14} color="#DC2626" />
                          <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                            {creator.tracks_count || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.followButton, followingIds.has(creator.id) && styles.followButtonLoading]}
                      onPress={() => handleFollowCreator(creator.id)}
                      disabled={followingIds.has(creator.id)}
                    >
                      {followingIds.has(creator.id) ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : followedCreators.has(creator.id) ? (
                        <Text style={styles.followButtonText}>Following</Text>
                      ) : (
                        <Text style={styles.followButtonText}>Follow</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View 
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.text }]}>
            Ready to get discovered?
          </Text>
          <TouchableOpacity
            style={styles.modernButtonContainer}
            onPress={handleNext}
            disabled={loading}
          >
        <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // ============================================================
  // EVENT ORGANISER PATH RENDERERS
  // ============================================================

  const renderEventOrganiserProfileSetup = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Set up your organiser profile</Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>How should the community find you?</Text>
          </Animated.View>
          <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Profile Photo */}
            <TouchableOpacity style={styles.avatarPickerContainer} onPress={handleAvatarPick}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPickerImage} />
              ) : (
                <View style={styles.avatarPickerPlaceholder}>
                  <Ionicons name="camera" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarPickerBadge}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarPickerLabel, { color: theme.colors.textSecondary }]}>
              Add profile photo (optional)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name or organisation name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={[styles.usernamePrefix, { color: theme.colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, styles.usernameInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourhandle"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              {checkingUsername ? (
                <Text style={[styles.usernameStatus, { color: theme.colors.textSecondary }]}>Checking...</Text>
              ) : usernameAvailable === true ? (
                <Text style={[styles.usernameStatus, { color: '#10B981' }]}>✓ Available</Text>
              ) : usernameAvailable === false ? (
                <Text style={[styles.usernameStatus, { color: '#EF4444' }]}>✗ Already taken</Text>
              ) : null}
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Location (Optional)</Text>
              <CountrySelector value={country} onChange={setCountry} />
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, marginTop: 12 }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City (e.g., London, Lagos)"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <TouchableOpacity style={styles.modernButtonContainer} onPress={handleNext} disabled={loading}>
              <LinearGradient colors={['#F59E0B', '#D97706', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modernButtonGradient}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modernButtonText}>Continue</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  const renderEventOrganiserEventTypes = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>What kinds of events do you organise?</Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>Select all that apply</Text>
        </Animated.View>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.genresList}>
            {eventOrganiserEventTypes.map((item) => {
              const isSelected = selectedOrgEventTypes.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.genreChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, isSelected && styles.genreChipSelected]}
                  onPress={() => {
                    setSelectedOrgEventTypes(prev =>
                      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                    );
                  }}
                >
                  <Text style={{ marginRight: 4 }}>{item.emoji}</Text>
                  <Text style={[styles.genreText, { color: theme.colors.text }, isSelected && styles.genreTextSelected]}>{item.name}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.genreCheckmark} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.modernButtonContainer, { marginTop: 24 }]} onPress={handleNext} disabled={loading}>
            <LinearGradient colors={['#F59E0B', '#D97706', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modernButtonGradient}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modernButtonText}>Continue</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  const renderEventOrganiserLocation = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>What's your event reach?</Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>This helps us surface your events to the right audience</Text>
        </Animated.View>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {eventOrganiserReachOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.roleCard,
                { marginBottom: 12 },
                selectedOrgReach === option.id && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedOrgReach(option.id)}
            >
              <View style={styles.roleTextContent}>
                <View style={styles.roleHeader}>
                  <Text style={[styles.roleTitle, { color: theme.colors.text }]}>{option.label}</Text>
                  <View style={[styles.radioCircle, selectedOrgReach === option.id && styles.radioCircleChecked]}>
                    {selectedOrgReach === option.id && <View style={styles.radioCircleInner} />}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.modernButtonContainer, { marginTop: 12 }]} onPress={handleNext} disabled={loading}>
            <LinearGradient colors={['#F59E0B', '#D97706', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modernButtonGradient}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modernButtonText}>Continue</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  const renderEventOrganiserValueDemo = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText(currentStep, userType)}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Organisers like you are thriving here</Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            SoundBridge gives you tools to sell tickets, reach local audiences, and grow your event brand.
          </Text>
        </Animated.View>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.valuePropContainer, { backgroundColor: theme.colors.surface + 'CC', borderRadius: 16, padding: 20, marginBottom: 20 }]}>
            {[
              { icon: 'ticket', text: 'Sell tickets directly — no middlemen' },
              { icon: 'location', text: 'Reach audiences in your city and beyond' },
              { icon: 'analytics', text: 'Track RSVPs, sales, and reach in one dashboard' },
              { icon: 'megaphone', text: 'Promote to genre-matched music lovers' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={item.icon as any} size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.tierFeatureText, { color: theme.colors.text, flex: 1 }]}>{item.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.modernButtonContainer} onPress={handleNext} disabled={loading}>
            <LinearGradient colors={['#F59E0B', '#D97706', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modernButtonGradient}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modernButtonText}>Let's go →</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // ============================================================
  // FOLLOW SUGGESTIONS STEP
  // ============================================================

  const renderFollowSuggestions = () => {
    const followedCount = suggestedCreators.filter(c => followedCreators.has(c.id)).length;
    return (
      <View style={styles.stepContainer}>
        <ImageBackground
          source={require('../../assets/images/logos/bg01.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]} />
        </ImageBackground>
        <View style={styles.headerWithBack}>
          <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
          <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
            {getStepIndicatorText(currentStep, userType)}
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Text style={[styles.stepTitle, { color: '#FFFFFF', fontSize: 28, textAlign: 'center' }]}>
              You're joining an amazing community
            </Text>
            <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.65)', textAlign: 'center' }]}>
              Follow creators who match your taste — they'll fill your feed with great music.
            </Text>
          </Animated.View>
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {loadingSuggestions ? (
              <ActivityIndicator size="large" color="#EC4899" style={{ marginVertical: 48 }} />
            ) : (
              <>
                {/* Follow All pill */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    marginBottom: 20,
                  }}
                  onPress={() => {
                    const allIds = new Set(suggestedCreators.map(c => c.id));
                    setSuggestionFollowedIds(allIds);
                    suggestedCreators.forEach(c => {
                      if (!suggestionFollowedIds.has(c.id)) handleFollowCreator(c.id);
                    });
                  }}
                >
                  <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13, marginLeft: 6 }}>Follow All</Text>
                </TouchableOpacity>

                {/* Creator cards — vertical list */}
                <View style={{ gap: 12 }}>
                  {suggestedCreators.map((creator) => {
                    const isFollowed = followedCreators.has(creator.id);
                    const isLoadingFollow = followingIds.has(creator.id);
                    return (
                      <BlurView
                        key={creator.id}
                        intensity={18}
                        tint="dark"
                        style={{
                          borderRadius: 18,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: isFollowed ? 'rgba(236,72,153,0.6)' : 'rgba(255,255,255,0.12)',
                        }}
                      >
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 16,
                          backgroundColor: isFollowed ? 'rgba(236,72,153,0.08)' : 'rgba(255,255,255,0.04)',
                        }}>
                          {/* Avatar */}
                          {creator.avatar_url ? (
                            <Image
                              source={{ uri: creator.avatar_url }}
                              style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: isFollowed ? '#EC4899' : 'rgba(255,255,255,0.2)' }}
                            />
                          ) : (
                            <LinearGradient
                              colors={['#EC4899', '#9333EA']}
                              style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>
                                {(creator.display_name || creator.username || '?')[0].toUpperCase()}
                              </Text>
                            </LinearGradient>
                          )}

                          {/* Info */}
                          <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                              {creator.display_name || creator.username}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                              {creator.location || 'Music Creator'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.4)" />
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                                  {creator.followers_count ?? 0}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="musical-notes-outline" size={12} color="rgba(255,255,255,0.4)" />
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                                  {creator.tracks_count ?? 0}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Follow button */}
                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 18,
                              paddingVertical: 9,
                              borderRadius: 999,
                              backgroundColor: isFollowed ? '#EC4899' : 'rgba(255,255,255,0.12)',
                              borderWidth: 1,
                              borderColor: isFollowed ? '#EC4899' : 'rgba(255,255,255,0.25)',
                              minWidth: 90,
                              alignItems: 'center',
                            }}
                            onPress={() => handleFollowCreator(creator.id)}
                            disabled={isLoadingFollow}
                          >
                            {isLoadingFollow ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                                {isFollowed ? '✓ Following' : 'Follow'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </BlurView>
                    );
                  })}
                </View>

                {/* Progress hint */}
                {followedCount > 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
                    Following {followedCount} creator{followedCount !== 1 ? 's' : ''}
                  </Text>
                )}
              </>
            )}

            {/* Wide pill Continue button */}
            <TouchableOpacity
              style={{ marginTop: 28, borderRadius: 999, overflow: 'hidden' }}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#EC4899', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 17, alignItems: 'center', borderRadius: 999 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
                    Continue
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  };

  // ============================================================
  // FIRST POST STEP
  // ============================================================

  const renderFirstPost = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]} />
      </ImageBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Introduce yourself 👋</Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Your first post is how the community meets you. Make it yours.
            </Text>
          </Animated.View>

          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Post preview card */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + '40', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Text style={{ fontSize: 18 }}>{(displayName || username || '?')[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }]}>{displayName || username}</Text>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: 12 }]}>@{username}</Text>
                </View>
              </View>
              <TextInput
                style={[{
                  color: theme.colors.text,
                  fontSize: 15,
                  lineHeight: 22,
                  minHeight: 90,
                  textAlignVertical: 'top',
                }]}
                value={firstPostText}
                onChangeText={(text) => {
                  if (text.length <= 280) setFirstPostText(text);
                }}
                multiline
                placeholder="Write your intro..."
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={[{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'right', marginTop: 6 }]}>
                {firstPostText.length}/280
              </Text>

              {/* Photo preview */}
              {firstPostImage ? (
                <View style={{ marginTop: 10, position: 'relative' }}>
                  <Image source={{ uri: firstPostImage }} style={{ width: '100%', height: 160, borderRadius: 10 }} resizeMode="cover" />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}
                    onPress={() => setFirstPostImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 8 }}
                  onPress={handleFirstPostImagePick}
                >
                  <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
                  <Text style={[{ color: theme.colors.primary, fontSize: 14, marginLeft: 8 }]}>Add a photo (optional)</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.modernButtonContainer}
              onPress={handlePublishFirstPost}
              disabled={publishingPost}
            >
              <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modernButtonGradient}
              >
                {publishingPost ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modernButtonText}>Publish & Enter SoundBridge 🎉</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // ============================================================
  // NOTIFICATION PERMISSION STEP
  // ============================================================

  const handleRequestNotifications = async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch (_) {
      // permission errors are non-fatal
    }
    animateStepTransition('tierSelection');
  };

  const handleSkipNotifications = async () => {
    await AsyncStorage.setItem('notif_permission_dismissed', '1').catch(() => {});
    animateStepTransition('tierSelection');
  };

  const isCreatorType = userType === 'music_creator' || userType === 'podcast_creator' || userType === 'industry_professional' || userType === 'event_organiser';

  const renderNotificationPermission = () => {
    const bullets = isCreatorType
      ? [
          { icon: 'calendar-outline' as const, text: 'Fans find your events — direct to the right audience, no ad spend.' },
          { icon: 'cash-outline' as const, text: 'Sales moments — someone else sees the nudge first if you don\'t.' },
          { icon: 'trending-up-outline' as const, text: 'AI career nudges — personalised next steps, delivered at the right time.' },
          { icon: 'flash-outline' as const, text: 'Urgent gigs — time-sensitive. Miss the push, miss the gig.' },
        ]
      : [
          { icon: 'location-outline' as const, text: 'Local shows that match you — not random spam, precision matched.' },
          { icon: 'pricetag-outline' as const, text: 'Audio deals you opted into — someone else gets there first.' },
          { icon: 'flash-outline' as const, text: 'Urgent gigs nearby — miss the push, miss the moment.' },
          { icon: 'notifications-outline' as const, text: 'Smart reminders for events you care about.' },
        ];

    return (
      <View style={styles.stepContainer}>
        <ImageBackground
          source={require('../../assets/images/logos/bg01.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)' }]} />
        </ImageBackground>

        <View style={styles.headerWithBack}>
          <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
          <Text style={[styles.headerStepText, { color: 'rgba(255,255,255,0.5)' }]}>
            {getStepIndicatorText(currentStep, userType)}
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            {/* Bell icon */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <LinearGradient
                colors={['#EC4899', '#9333EA']}
                style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="notifications" size={38} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Headline */}
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 }}>
              Don't miss a thing
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, textAlign: 'center', marginBottom: 30, lineHeight: 22 }}>
              {isCreatorType
                ? 'With alerts off, fans miss your events and you miss sales and growth nudges.'
                : 'With alerts off, you miss events matched to you, deals, and gigs that others will see first.'}
            </Text>

            {/* FOMO bullets */}
            <BlurView intensity={14} tint="dark" style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 28 }}>
              <View style={{ padding: 20, gap: 18 }}>
                {bullets.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(236,72,153,0.18)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      <Ionicons name={item.icon} size={17} color="#EC4899" />
                    </View>
                    <Text style={{ flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21 }}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </BlurView>

            {/* Platform truth line */}
            <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, textAlign: 'center', marginBottom: 28, lineHeight: 18 }}>
              SoundBridge isn't noise. It's the right alert at the right time.{'\n'}Off = you fall behind on events, sales, and growth others are getting.
            </Text>

            {/* Primary CTA */}
            <TouchableOpacity
              style={{ borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}
              onPress={handleRequestNotifications}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#EC4899', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 17, alignItems: 'center', borderRadius: 999 }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>
                  Turn on Notifications
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary — Not now */}
            <TouchableOpacity onPress={handleSkipNotifications} activeOpacity={0.6} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14 }}>Not now</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  };

  // Render Tier Selection (Free vs Pro) - Path-aware
  const renderTierSelection = () => {
    const isMusicLover = userType === 'music_lover';

    return (
      <View style={styles.stepContainer}>
        <ImageBackground
          source={require('../../assets/images/logos/bg01.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        </ImageBackground>
        <View style={styles.headerWithBack}>
          <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
          <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
            {getStepIndicatorText(currentStep, userType)}
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              One last thing 🎉
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              Start free — upgrade anytime from your profile
            </Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.tierComparisonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Free Tier */}
            <TouchableOpacity
              style={[
                styles.tierCard,
                styles.tierCardFree,
                { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }
              ]}
              onPress={() => handleTierSelection('free')}
            >
              <View style={styles.tierHeaderSimple}>
                <Text style={[styles.tierCardTitle, { color: theme.colors.text }]}>FREE</Text>
              </View>
              <Text style={[styles.tierDescription, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                Perfect for getting started
              </Text>
              <View style={styles.tierFeatures}>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>250MB storage (~30-40 tracks)</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Unlimited event promotion</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Create & sell event tickets</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Basic analytics</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Professional networking</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Transaction fees apply (you still make money)</Text>
                </View>
              </View>
              <View style={styles.tierPricing}>
                <Text style={[styles.tierPricingText, { color: theme.colors.text, fontSize: 32, fontWeight: '700' }]}>£0</Text>
                <Text style={[styles.tierPricingSubtext, { color: theme.colors.textSecondary }]}>Forever free</Text>
              </View>
              <View style={[styles.tierButton, styles.tierButtonFree]}>
                <Text style={[styles.tierButtonText, { color: theme.colors.text }]}>
                  Start for Free →
                </Text>
              </View>
              <Text style={[{ color: theme.colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 8 }]}>
                No card required • Upgrade anytime
              </Text>
            </TouchableOpacity>

            {/* Premium Tier */}
            <TouchableOpacity
              style={[
                styles.tierCard,
                styles.tierCardPro,
                { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }
              ]}
              onPress={() => handleTierSelection('premium')}
            >
              <View style={styles.tierHeaderSimple}>
                <Text style={[styles.tierCardTitle, { color: theme.colors.text }]}>PREMIUM</Text>
              </View>
              <Text style={[styles.tierDescription, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                Everything you need to grow your career
              </Text>
              <View style={styles.tierFeatures}>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>2GB storage (~200 tracks)</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Unlimited uploads*</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Receive tips from fans (keep 95%)</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Pro badge on profile</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Custom profile URL</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Boosted visibility (48hrs monthly)</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>AI-optimized feed, audio & live</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Advanced analytics dashboard</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>AI collaboration matching</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#8B5CF6" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Priority support</Text>
                </View>
              </View>
              <View style={styles.tierPricing}>
                <Text style={[styles.tierPricingText, { color: theme.colors.text, fontSize: 32, fontWeight: '700' }]}>£6.99</Text>
                <Text style={[styles.tierPricingSubtext, { color: theme.colors.textSecondary }]}>per month</Text>
                <View style={[styles.moneyBackBadge, { marginTop: 8 }]}>
                  <Ionicons name="gift-outline" size={14} color="#10B981" />
                  <Text style={styles.moneyBackText}>3-day free trial</Text>
                </View>
              </View>
              <View style={[styles.tierButton, styles.tierButtonPro]}>
                <Text style={styles.tierButtonTextPro}>
                  Start Creating
                </Text>
              </View>
            </TouchableOpacity>

            {/* Unlimited Tier */}
            <TouchableOpacity
              style={[
                styles.tierCard,
                styles.tierCardPro,
                { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }
              ]}
              onPress={() => handleTierSelection('unlimited')}
            >
              <View style={styles.tierHeaderSimple}>
                <Text style={[styles.tierCardTitle, { color: theme.colors.text }]}>UNLIMITED</Text>
              </View>
              <Text style={[styles.tierDescription, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
                For serious creators and professionals
              </Text>
              <View style={styles.tierFeatures}>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>UNLIMITED track uploads</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Unlimited badge on profile</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Featured on Discover 2x/month</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Top priority in feed</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Fan subscriptions (earn monthly)</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Custom promo codes</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Email list export</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Lower fees (3% vs 5%)</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#F59E0B" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Highest priority support</Text>
                </View>
              </View>
              <View style={styles.tierPricing}>
                <Text style={[styles.tierPricingText, { color: theme.colors.text, fontSize: 32, fontWeight: '700' }]}>£12.99</Text>
                <Text style={[styles.tierPricingSubtext, { color: theme.colors.textSecondary }]}>per month</Text>
                <View style={[styles.moneyBackBadge, { marginTop: 8 }]}>
                  <Ionicons name="gift-outline" size={14} color="#10B981" />
                  <Text style={styles.moneyBackText}>3-day free trial</Text>
                </View>
              </View>
              <View style={[styles.tierButton, styles.tierButtonUnlimited]}>
                <Text style={styles.tierButtonTextPro}>
                  Full Access
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={[styles.socialProofText, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
              Start with basics, upgrade anytime
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render Payment Collection
  const renderPayment = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <View style={styles.headerWithBack}>
        <OnboardingBackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          Finalizing...
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
          }
        ]}
      >
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Upgrade to Pro - Risk Free
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            You'll be charged £9.99 today to start your Pro subscription. If you're not satisfied within 7 days, simply request a refund from your billing settings for a full refund - no questions asked.
        </Text>
      </Animated.View>

      <Animated.View 
        style={[
            styles.paymentFormContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
          <View style={[styles.paymentForm, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Card Number</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.colors.border,
                  color: theme.colors.text 
                }]}
                value={cardNumber}
                onChangeText={(text) => setCardNumber(text.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={19}
          />
        </View>

            <View style={styles.paymentRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Expiry</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={cardExpiry}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '').slice(0, 4);
                    if (cleaned.length >= 2) {
                      setCardExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2));
                    } else {
                      setCardExpiry(cleaned);
                    }
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>CVV</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={cardCvv}
                  onChangeText={(text) => setCardCvv(text.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
        </View>

        <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Cardholder Name</Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: theme.colors.border,
              color: theme.colors.text 
            }]}
                value={cardholderName}
                onChangeText={setCardholderName}
                placeholder="Full Name"
            placeholderTextColor={theme.colors.textSecondary}
          />
            </View>
        </View>

          <View style={styles.trustBadges}>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={[styles.trustBadgeText, { color: theme.colors.text }]}>7-day money-back guarantee</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.trustBadgeText, { color: theme.colors.text }]}>Cancel anytime</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.trustBadgeText, { color: theme.colors.text }]}>Full refund if not satisfied</Text>
            </View>
            <View style={styles.trustBadgeItem}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
              <Text style={[styles.trustBadgeText, { color: theme.colors.text }]}>Secure payment via Stripe</Text>
          </View>
        </View>

        <TouchableOpacity
            style={[
              styles.modernButtonContainer,
              (!cardNumber || !cardExpiry || !cardCvv || !cardholderName) && styles.buttonDisabled
            ]}
            onPress={handlePaymentSubmit}
            disabled={!cardNumber || !cardExpiry || !cardCvv || !cardholderName || loading}
        >
          <LinearGradient
              colors={(!cardNumber || !cardExpiry || !cardCvv || !cardholderName)
                ? ['#9CA3AF', '#9CA3AF']
                : ['#7C3AED', '#6D28D9', '#5B21B6']
            }
            start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modernButtonGradient}
          >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modernButtonText}>Upgrade to Pro</Text>
              )}
          </LinearGradient>
        </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToFreeButton}
            onPress={() => handleTierSelection('free')}
          >
            <Text style={[styles.backToFreeText, { color: theme.colors.textSecondary }]}>
              ← Back to Free plan
            </Text>
        </TouchableOpacity>
      </Animated.View>
      </ScrollView>
    </View>
  );

  // Render Welcome Confirmation
  const renderWelcomeConfirmation = () => (
    <View style={styles.stepContainer}>
      <ImageBackground
        source={require('../../assets/images/logos/bg01.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
      </ImageBackground>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.completionContainer}>
          <Animated.View
            style={[
              styles.successIcon,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </Animated.View>
          
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
        <Text style={[styles.completionTitle, { color: theme.colors.text }]}>
          Welcome to SoundBridge!
        </Text>
        
        <Text style={[styles.completionSubtitle, { color: theme.colors.textSecondary }]}>
          Your account is ready. Let's start discovering amazing music!
        </Text>

            {selectedTier === 'pro' ? (
          <View style={styles.trialActiveContainer}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={[styles.trialActiveText, { color: theme.colors.text }]}>
                  Pro Active
                </Text>
                <View style={styles.moneyBackGuaranteeBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={[styles.moneyBackGuaranteeText, { color: theme.colors.textSecondary }]}>
                    7-day money-back guarantee (ends {getMoneyBackGuaranteeEndDate()})
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.freePlanContainer}>
                <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                <Text style={[styles.freePlanText, { color: theme.colors.text }]}>
                  You're on the Free plan
                </Text>
                <Text style={[styles.freePlanSubtext, { color: theme.colors.textSecondary }]}>
                  Upgrade anytime to unlock Pro features
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.modernButtonContainer}
          onPress={handleNext}
              disabled={loading}
        >
          <LinearGradient
            colors={['#10B981', '#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modernButtonGradient}
          >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
            <Text style={styles.modernButtonText}>Start Exploring</Text>
                )}
          </LinearGradient>
        </TouchableOpacity>
          </Animated.View>
      </View>
      </ScrollView>
    </View>
  );

  // Main render
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Progress indicator - Circular Dots */}
      {currentStep !== 'welcome' && currentStep !== 'welcomeConfirmation' && currentStep !== 'firstPost' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressDotsContainer}>
            {Array.from({ length: getPathTotalSteps(userType) }).map((_, index) => {
              const stepNum = index + 1;
              const currentStepNum = getCurrentStepNumber(currentStep, userType);
              const isActive = stepNum === currentStepNum;
              const isPassed = stepNum < currentStepNum;

              return (
                <View key={index} style={styles.dotWrapper}>
                  {isActive && <View style={styles.dotGlow} />}
                  <View
                    style={[
                      styles.progressDot,
                      isActive && styles.progressDotActive,
                      isPassed && styles.progressDotPassed,
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Step content */}
      {currentStep === 'welcome' && renderWelcome()}
      {currentStep === 'userType' && renderUserTypeSelection()}
      
      {/* Music Creator Path */}
      {currentStep === 'musicCreator_profileSetup' && renderMusicCreatorProfileSetup()}
      {currentStep === 'musicCreator_genres' && renderMusicCreatorGenres()}
      {currentStep === 'musicCreator_role' && renderMusicCreatorRole()}
      {currentStep === 'musicCreator_events' && renderMusicCreatorEvents()}
      {currentStep === 'musicCreator_valueDemo' && renderMusicCreatorValueDemo()}
      
      {/* Podcast Creator Path */}
      {currentStep === 'podcastCreator_profileSetup' && renderPodcastCreatorProfileSetup()}
      {currentStep === 'podcastCreator_categories' && renderPodcastCreatorCategories()}
      {currentStep === 'podcastCreator_role' && renderPodcastCreatorRole()}
      {currentStep === 'podcastCreator_events' && renderPodcastCreatorEvents()}
      {currentStep === 'podcastCreator_valueDemo' && renderPodcastCreatorValueDemo()}
      
      {/* Industry Professional Path */}
      {currentStep === 'industryProfessional_profileSetup' && renderIndustryProfessionalProfileSetup()}
      {currentStep === 'industryProfessional_role' && renderIndustryProfessionalRole()}
      {currentStep === 'industryProfessional_genres' && renderIndustryProfessionalGenres()}
      {currentStep === 'industryProfessional_goals' && renderIndustryProfessionalGoals()}
      {currentStep === 'industryProfessional_valueDemo' && renderIndustryProfessionalValueDemo()}
      
      {/* Music Lover Path */}
      {currentStep === 'musicLover_profileSetup' && renderMusicLoverProfileSetup()}
      {currentStep === 'musicLover_genres' && renderMusicLoverGenres()}
      {currentStep === 'musicLover_events' && renderMusicLoverEvents()}
      {currentStep === 'musicLover_valueDemo' && renderMusicLoverValueDemo()}

      {/* Event Organiser Path */}
      {currentStep === 'eventOrganiser_profileSetup' && renderEventOrganiserProfileSetup()}
      {currentStep === 'eventOrganiser_eventTypes' && renderEventOrganiserEventTypes()}
      {currentStep === 'eventOrganiser_location' && renderEventOrganiserLocation()}
      {currentStep === 'eventOrganiser_valueDemo' && renderEventOrganiserValueDemo()}

      {/* Legacy screens (for backward compatibility) */}
      {currentStep === 'quickSetup' && renderQuickSetup()}
      {currentStep === 'eventPreferences' && renderEventPreferences()}
      {currentStep === 'valueDemo' && renderValueDemo()}

      {/* Shared screens */}
      {currentStep === 'followSuggestions' && renderFollowSuggestions()}
      {currentStep === 'notificationPermission' && renderNotificationPermission()}
      {currentStep === 'tierSelection' && renderTierSelection()}
      {currentStep === 'payment' && renderPayment()}
      {currentStep === 'firstPost' && renderFirstPost()}
      {currentStep === 'welcomeConfirmation' && renderWelcomeConfirmation()}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  fullScreenGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  fullScreenTouchable: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  welcomeLogo: {
    width: 120,
    height: 120,
    tintColor: '#FFFFFF',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
    marginBottom: 24,
  },
  welcomeHint: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 24,
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 10,
  },
  backButton: {
    // Empty - using OnboardingBackButton component's own styles
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerStepText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dotWrapper: {
    position: 'relative',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    opacity: 0.4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
  },
  progressDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  progressDotPassed: {
    backgroundColor: 'rgba(220, 38, 38, 0.6)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  rolesContainer: {
    flex: 1,
  },
  heroRoleButton: {
    marginBottom: 12,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroRoleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroRoleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  heroRoleContent: {
    flex: 1,
  },
  heroRoleTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  heroRoleDescription: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    opacity: 0.8,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  inputHint: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernamePrefix: {
    fontSize: 16,
    marginRight: 8,
    paddingTop: 14,
  },
  usernameInput: {
    flex: 1,
  },
  usernameStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  avatarPickerContainer: {
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  avatarPickerImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPickerPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPickerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPickerLabel: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 24,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  genreLoading: {
    marginTop: 12,
  },
  genreChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreChipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  genreTextSelected: {
    color: '#FFFFFF',
  },
  genreCheckmark: {
    marginLeft: 6,
  },
  selectedGenresText: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectedCountBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modernButtonContainer: {
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modernButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  buttonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  creatorsContainer: {
    marginBottom: 24,
  },
  creatorCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  creatorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  creatorName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  creatorRole: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 6,
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  creatorStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 2,
  },
  creatorStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorStatText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  stackedCreatorsContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  stackedCreatorCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  creatorCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedCreatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stackedCreatorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginLeft: 8,
  },
  followButtonLoading: {
    opacity: 0.7,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  ctaContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  tierComparisonContainer: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  tierCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    marginHorizontal: 6,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tierCardFree: {
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  tierCardPro: {
    borderColor: '#7C3AED',
    borderWidth: 3,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 6,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  tierHeaderSimple: {
    alignItems: 'center',
    marginBottom: 8,
  },
  tierEmoji: {
    fontSize: 24,
  },
  tierCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  tierDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tierFeatures: {
    marginBottom: 20,
    minHeight: 200,
  },
  tierFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierFeatureText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  tierPricing: {
    marginBottom: 16,
  },
  tierPricingText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  tierPricingSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  tierButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  tierButtonFree: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tierButtonPro: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tierButtonUnlimited: {
    backgroundColor: '#7C3AED',
  },
  tierButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  tierButtonTextPro: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  socialProofText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  paymentFormContainer: {
    marginTop: 24,
  },
  paymentForm: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentRow: {
    flexDirection: 'row',
  },
  trustBadges: {
    marginBottom: 24,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustBadgeText: {
    fontSize: 14,
    marginLeft: 8,
  },
  backToFreeButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  backToFreeText: {
    fontSize: 14,
  },
  // New role selection card styles
  newStepTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  newStepSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    lineHeight: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleCardSelected: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
  },
  roleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextContent: {
    flex: 1,
    paddingTop: 2,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  roleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    lineHeight: 20,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleChecked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  radioCircleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B46C1',
  },
  skipButtonTextNew: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  completionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    letterSpacing: -0.3,
  },
  trialActiveContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 32,
  },
  trialActiveText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  moneyBackGuaranteeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  moneyBackGuaranteeText: {
    fontSize: 12,
    marginLeft: 6,
  },
  moneyBackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  moneyBackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 6,
  },
  freePlanContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  freePlanText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  freePlanSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // New Welcome Screen Styles
  ambientOrb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  newWelcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 70,
    paddingBottom: 40,
    position: 'relative',
    zIndex: 10,
  },
  newLogoContainer: {
    alignItems: 'center',
    marginBottom: -10,
    width: '100%',
    marginTop: 60,
  },
  newWelcomeLogo: {
    width: 800,
    height: 240,
  },
  newTextContent: {
    justifyContent: 'flex-start',
    marginBottom: 0,
    paddingTop: 0,
  },
  newWelcomeHeadline: {
    fontSize: 48,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 50,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  newWelcomeSubheadline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    lineHeight: 28,
    maxWidth: 340,
  },
  newCtaSection: {
    gap: 24,
    marginTop: 0,
  },
  newGetStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  newGetStartedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  newArrowButtonContainer: {
    position: 'relative',
  },
  newArrowGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 9999,
    opacity: 0.4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  newArrowButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newFooter: {
    gap: 24,
  },
  newFooterDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  newFooterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newAvatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B46C1',
  },
  newAvatarPlus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B46C1',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newAvatarPlusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newFooterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
});
