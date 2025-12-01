import React, { useState, useEffect, useRef } from 'react';
import BackButton from '../components/BackButton';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import CountrySelector from '../components/CountrySelector';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

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
}

type UserType = 'music_creator' | 'podcast_creator' | 'industry_professional' | 'music_lover' | null;

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
  // Shared steps (after path-specific steps)
  | 'tierSelection'
  | 'payment';

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

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>(null);
  const [selectedTier, setSelectedTier] = useState<'free' | 'pro' | null>(null);
  
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
      // Shared
      'tierSelection': getPathTotalSteps(type),
      'payment': getPathTotalSteps(type),
    };
    
    return pathSteps[step] || 0;
  };

  const getStepIndicatorText = (step: OnboardingStep, type: UserType): string => {
    if (step === 'welcome' || step === 'welcomeConfirmation') return '';
    
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

  // Payment data
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Auto-advance welcome screen
  useEffect(() => {
    if (currentStep === 'welcome') {
      const timer = setTimeout(() => {
        setCurrentStep('userType');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Shimmer animation for logo
  useEffect(() => {
    if (currentStep === 'welcome') {
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
      'musicLover_valueDemo'
    ];
    if (valueDemoSteps.includes(currentStep) && demoCreators.length === 0) {
      loadDemoCreators();
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
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // Load genres from API
  const loadGenres = async () => {
    setLoadingGenres(true);
    try {
      console.log('🎵 Loading genres for onboarding...');
      const response = await fetch('https://www.soundbridge.live/api/genres?category=music');
      const data = await response.json();
      
      if (data.success && data.genres) {
        console.log('✅ Loaded', data.genres.length, 'music genres');
        setAvailableGenres(data.genres);
      } else {
        console.error('❌ Failed to load genres:', data);
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
      const response = await fetch('https://www.soundbridge.live/api/onboarding/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ username: usernameToCheck }),
      });

      const data = await response.json();
      setUsernameAvailable(data.available ?? false);
    } catch (error) {
      console.error('❌ Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Load demo creators
  const loadDemoCreators = async () => {
    setLoadingCreators(true);
    try {
      // Try to fetch from API endpoint if available
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://www.soundbridge.live/api/onboarding/value-demo', {
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

  // Save genre preferences
  const saveGenrePreferences = async () => {
    if (!user?.id || selectedGenres.length < 3) return false;

    try {
      console.log('💾 Saving genre preferences:', selectedGenres);
      const response = await fetch(`https://www.soundbridge.live/api/users/${user.id}/genres`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre_ids: selectedGenres
        })
      });

      const data = await response.json();
      
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
      const response = await fetch(
        `https://www.soundbridge.live/api/event-types?user_type=${userType}`
      );
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
        `https://www.soundbridge.live/api/users/${user.id}/event-preferences`,
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
        await fetch('https://www.soundbridge.live/api/user/onboarding-progress', {
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
      setCurrentStep(firstStep);
    }
  };

  // Handle tier selection
  const handleTierSelection = (tier: 'free' | 'pro') => {
    setSelectedTier(tier);
    
    if (tier === 'free') {
      // Skip payment, go directly to welcome confirmation
      setCurrentStep('welcomeConfirmation');
    } else {
      // Go to payment collection (immediate payment with money-back guarantee)
      setCurrentStep('payment');
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
      const response = await fetch('https://www.soundbridge.live/api/onboarding/upgrade-pro', {
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
      setCurrentStep('welcomeConfirmation');
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please check your card details and try again.');
    } finally {
      setLoading(false);
    }
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
          setCurrentStep('musicCreator_genres');
          break;

        case 'musicCreator_genres':
          if (selectedGenres.length < 3) {
            Alert.alert('Select Genres', 'Please select at least 3 genres to continue');
            setLoading(false);
            return;
          }
          await saveGenrePreferences();
          setCurrentStep('musicCreator_role');
          break;

        case 'musicCreator_role':
          // Validate at least 1 role selected
          if (selectedCreatorRoles.length < 1) {
            Alert.alert('Select Role', 'Please select at least 1 role to continue');
            setLoading(false);
            return;
          }
          // TODO: Save role selection to API in future
          setCurrentStep('musicCreator_events');
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
          setCurrentStep('musicCreator_valueDemo');
          break;

        case 'musicCreator_valueDemo':
          setCurrentStep('tierSelection');
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
          setCurrentStep('podcastCreator_categories');
          break;

        case 'podcastCreator_categories':
          // Validate minimum 2 categories
          if (selectedPodcastCategories.length < 2) {
            Alert.alert('Select Categories', 'Please select at least 2 podcast categories to continue');
            setLoading(false);
            return;
          }
          // TODO: Save podcast categories to API in future
          setCurrentStep('podcastCreator_role');
          break;

        case 'podcastCreator_role':
          // Validate at least 1 role selected
          if (selectedPodcastRoles.length < 1) {
            Alert.alert('Select Role', 'Please select at least 1 role to continue');
            setLoading(false);
            return;
          }
          // TODO: Save podcast role to API in future
          setCurrentStep('podcastCreator_events');
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
          setCurrentStep('podcastCreator_valueDemo');
          break;

        case 'podcastCreator_valueDemo':
          setCurrentStep('tierSelection');
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
          setCurrentStep('industryProfessional_role');
          break;

        case 'industryProfessional_role':
          // Validate professional role selected (single selection)
          if (!selectedProfessionalRole) {
            Alert.alert('Select Role', 'Please select your professional role to continue');
            setLoading(false);
            return;
          }
          // TODO: Save professional role to API in future
          setCurrentStep('industryProfessional_genres');
          break;

        case 'industryProfessional_genres':
          if (selectedGenres.length < 2) {
            Alert.alert('Select Genres', 'Please select at least 2 genres to continue');
            setLoading(false);
            return;
          }
          await saveGenrePreferences();
          setCurrentStep('industryProfessional_goals');
          break;

        case 'industryProfessional_goals':
          // Validate minimum 2 goals selected
          if (selectedProfessionalGoals.length < 2) {
            Alert.alert('Select Goals', 'Please select at least 2 goals to continue');
            setLoading(false);
            return;
          }
          // TODO: Save professional goals to API in future
          setCurrentStep('industryProfessional_valueDemo');
          break;

        case 'industryProfessional_valueDemo':
          setCurrentStep('tierSelection');
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
          setCurrentStep('musicLover_genres');
          break;

        case 'musicLover_genres':
          if (selectedGenres.length < 3) {
            Alert.alert('Select Genres', 'Please select at least 3 genres to continue');
            setLoading(false);
            return;
          }
          await saveGenrePreferences();
          setCurrentStep('musicLover_events');
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
          setCurrentStep('musicLover_valueDemo');
          break;

        case 'musicLover_valueDemo':
          setCurrentStep('tierSelection');
          break;

        // ============================================
        // SHARED STEPS
        // ============================================

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
            const profileResponse = await fetch('https://www.soundbridge.live/api/user/complete-profile', {
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
            const onboardingResponse = await fetch('https://www.soundbridge.live/api/user/complete-onboarding', {
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
        setCurrentStep('welcome');
        break;
      
      // Music Creator Path
      case 'musicCreator_profileSetup':
        setCurrentStep('userType');
        break;
      case 'musicCreator_genres':
        setCurrentStep('musicCreator_profileSetup');
        break;
      case 'musicCreator_role':
        setCurrentStep('musicCreator_genres');
        break;
      case 'musicCreator_events':
        setCurrentStep('musicCreator_role');
        break;
      case 'musicCreator_valueDemo':
        setCurrentStep('musicCreator_events');
        break;
      
      // Podcast Creator Path
      case 'podcastCreator_profileSetup':
        setCurrentStep('userType');
        break;
      case 'podcastCreator_categories':
        setCurrentStep('podcastCreator_profileSetup');
        break;
      case 'podcastCreator_role':
        setCurrentStep('podcastCreator_categories');
        break;
      case 'podcastCreator_events':
        setCurrentStep('podcastCreator_role');
        break;
      case 'podcastCreator_valueDemo':
        setCurrentStep('podcastCreator_events');
        break;
      
      // Industry Professional Path
      case 'industryProfessional_profileSetup':
        setCurrentStep('userType');
        break;
      case 'industryProfessional_role':
        setCurrentStep('industryProfessional_profileSetup');
        break;
      case 'industryProfessional_genres':
        setCurrentStep('industryProfessional_role');
        break;
      case 'industryProfessional_goals':
        setCurrentStep('industryProfessional_genres');
        break;
      case 'industryProfessional_valueDemo':
        setCurrentStep('industryProfessional_goals');
        break;
      
      // Music Lover Path
      case 'musicLover_profileSetup':
        setCurrentStep('userType');
        break;
      case 'musicLover_genres':
        setCurrentStep('musicLover_profileSetup');
        break;
      case 'musicLover_events':
        setCurrentStep('musicLover_genres');
        break;
      case 'musicLover_valueDemo':
        setCurrentStep('musicLover_events');
        break;
      
      // Shared steps
      case 'tierSelection':
        // Go back to path-specific value demo
        if (userType === 'music_creator') setCurrentStep('musicCreator_valueDemo');
        else if (userType === 'podcast_creator') setCurrentStep('podcastCreator_valueDemo');
        else if (userType === 'industry_professional') setCurrentStep('industryProfessional_valueDemo');
        else if (userType === 'music_lover') setCurrentStep('musicLover_valueDemo');
        break;
      case 'payment':
        setCurrentStep('tierSelection');
        break;
      case 'welcomeConfirmation':
        if (selectedTier === 'pro') {
          setCurrentStep('payment');
        } else {
          setCurrentStep('tierSelection');
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
      const response = await fetch('https://www.soundbridge.live/api/genres?category=podcast');
      const data = await response.json();
      
      if (data.success && data.genres) {
        console.log('✅ Loaded', data.genres.length, 'podcast categories');
        setAvailablePodcastCategories(data.genres);
      } else {
        console.error('❌ Failed to load podcast categories:', data);
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={theme.isDark 
          ? ['#1a1a2e', '#16213e', '#0f3460', '#533483']
          : ['#667eea', '#764ba2', '#f093fb', '#4facfe']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        style={styles.fullScreenGradient}
      />
      
      <TouchableOpacity 
        style={styles.fullScreenTouchable}
        onPress={() => setCurrentStep('userType')}
        activeOpacity={1}
      >
        <View style={styles.welcomeContainer}>
          <Animated.View
            style={[
              styles.welcomeContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/logos/logo-white.png')} 
                style={styles.welcomeLogo}
                resizeMode="contain"
              />
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.8, 0.3],
                    }),
                    transform: [
                      {
                        translateX: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-200, 200],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            </View>
            <Text style={styles.welcomeTitle}>Welcome to SoundBridge</Text>
            <Text style={styles.welcomeSubtitle}>
              Where 50,000+ audio creators connect, collaborate, and build sustainable careers
            </Text>
            <Text style={styles.welcomeHint}>Tap anywhere to continue</Text>
          </Animated.View>
      </View>
      </TouchableOpacity>
    </View>
  );
      
  // Render User Type Selection
  const renderUserTypeSelection = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          {getStepIndicatorText('userType', userType || 'music_creator')}
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
        </Animated.View>

        <Animated.View 
          style={[
            styles.rolesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleUserTypeSelection('music_creator')}
          >
            <LinearGradient
              colors={['rgba(220, 38, 38, 0.2)', 'rgba(185, 28, 28, 0.15)', 'rgba(153, 27, 27, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroRoleGradient}
            >
              <View style={styles.heroRoleIcon}>
                <Ionicons name="mic" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.heroRoleContent}>
                <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>Music Creator</Text>
                <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                  Showcase your work and get discovered
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleUserTypeSelection('podcast_creator')}
          >
            <LinearGradient
              colors={['rgba(124, 58, 237, 0.2)', 'rgba(109, 40, 217, 0.15)', 'rgba(91, 33, 182, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroRoleGradient}
            >
              <View style={styles.heroRoleIcon}>
                <Ionicons name="radio" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.heroRoleContent}>
                <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>Podcast Creator</Text>
                <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                  Build your audience and monetize your content
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleUserTypeSelection('industry_professional')}
          >
            <LinearGradient
              colors={['rgba(5, 150, 105, 0.2)', 'rgba(4, 120, 87, 0.15)', 'rgba(6, 95, 70, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroRoleGradient}
            >
              <View style={styles.heroRoleIcon}>
                <Ionicons name="settings" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.heroRoleContent}>
                <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>Industry Professional</Text>
                <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                  Find talent and book collaborations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleUserTypeSelection('music_lover')}
          >
            <LinearGradient
              colors={['rgba(234, 88, 12, 0.2)', 'rgba(220, 38, 38, 0.15)', 'rgba(185, 28, 28, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroRoleGradient}
            >
              <View style={styles.heroRoleIcon}>
                <Ionicons name="headset" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.heroRoleContent}>
                <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>Music Lover</Text>
                <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                  Discover and support independent creators
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => handleUserTypeSelection(null)}
        >
          <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Render Quick Setup (consolidated profile form) - Legacy function
  const renderQuickSetup = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              (Select at least 3)
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
              (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || selectedGenres.length < 3) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || selectedGenres.length < 3 || loading}
          >
        <LinearGradient
              colors={(!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false || selectedGenres.length < 3)
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

  // ============================================
  // MUSIC CREATOR PATH RENDER FUNCTIONS
  // ============================================

  // Render Music Creator Profile Setup
  const renderMusicCreatorProfileSetup = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
      </View>
  );
        
  // Render Music Creator Genres Selection
  const renderMusicCreatorGenres = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
            (Select at least 3)
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
                Selected: {selectedGenres.length} genres
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
              selectedGenres.length < 3 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 3 || loading}
          >
            <LinearGradient
              colors={selectedGenres.length < 3
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              setCurrentStep('musicCreator_valueDemo');
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              styles.creatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => (
              <View key={creator.id || index} style={[styles.creatorCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.creatorAvatar}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                  )}
      </View>
                <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                  {creator.display_name || creator.username || 'Creator'}
                </Text>
                <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]}>
                  {creator.bio || 'Music Creator'} • {creator.location || 'Location'}
                </Text>
                <View style={styles.creatorStats}>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="people" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 500) + 100}+ connections
                    </Text>
                  </View>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="musical-notes" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 50) + 10} tracks
                    </Text>
                  </View>
                </View>
              </View>
            ))}
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    </View>
  );

  // Render Podcast Creator Categories Selection
  const renderPodcastCreatorCategories = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              setCurrentStep('podcastCreator_valueDemo');
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              styles.creatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => (
              <View key={creator.id || index} style={[styles.creatorCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.creatorAvatar}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                  )}
                </View>
                <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                  {creator.display_name || creator.username || 'Podcaster'}
                </Text>
                <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]}>
                  {creator.bio || 'Podcast Creator'} • {creator.location || 'Location'}
                </Text>
                <View style={styles.creatorStats}>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="people" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 3000) + 1000}+ connections
                    </Text>
                  </View>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="mic" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 200) + 50} episodes
                    </Text>
                  </View>
                </View>
              </View>
            ))}
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    </View>
  );

  // Render Industry Professional Role Selection
  const renderIndustryProfessionalRole = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
          {selectedGenres.length > 0 && (
            <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.selectedCountText, { color: theme.colors.primary }]}>
                Selected: {selectedGenres.length} genres
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
              selectedGenres.length < 2 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 2 || loading}
          >
            <LinearGradient
              colors={selectedGenres.length < 2
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              styles.creatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => (
              <View key={creator.id || index} style={[styles.creatorCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.creatorAvatar}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                  )}
                </View>
                <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                  {creator.display_name || creator.username || 'Professional'}
                </Text>
                <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]}>
                  {creator.bio || 'Industry Professional'} • {creator.location || 'Location'}
                </Text>
                <View style={styles.creatorStats}>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="people" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 1000) + 500}+ connections
                    </Text>
                  </View>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="briefcase" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 100) + 20} collaborations
                    </Text>
                  </View>
                </View>
              </View>
            ))}
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    </View>
  );

  // Render Music Lover Favorite Genres
  const renderMusicLoverGenres = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
            (Select at least 3)
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
                Selected: {selectedGenres.length} genres
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
              selectedGenres.length < 3 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 3 || loading}
          >
            <LinearGradient
              colors={selectedGenres.length < 3
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              setCurrentStep('musicLover_valueDemo');
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              styles.creatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => (
              <View key={creator.id || index} style={[styles.creatorCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.creatorAvatar}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                  )}
                </View>
                <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                  {creator.display_name || creator.username || 'Creator'}
                </Text>
                <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]}>
                  {creator.bio || 'Music Creator'} • {creator.location || 'Location'}
                </Text>
                <View style={styles.creatorStats}>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="play-circle" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 10000) + 1000}+ streams
                    </Text>
                  </View>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="musical-notes" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 50) + 10} tracks
                    </Text>
                  </View>
                </View>
              </View>
            ))}
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              setCurrentStep('valueDemo');
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
              styles.creatorsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {demoCreators.map((creator, index) => (
              <View key={creator.id || index} style={[styles.creatorCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.creatorAvatar}>
                  {creator.avatar_url ? (
                    <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                  )}
                </View>
                <Text style={[styles.creatorName, { color: theme.colors.text }]}>
                  {creator.display_name || creator.username || 'Creator'}
                </Text>
                <Text style={[styles.creatorRole, { color: theme.colors.textSecondary }]}>
                  {creator.bio || 'Music Creator'} • {creator.location || 'Location'}
                </Text>
                <View style={styles.creatorStats}>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="people" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 500) + 100}+ connections
                    </Text>
                  </View>
                  <View style={styles.creatorStatItem}>
                    <Ionicons name="musical-notes" size={16} color={theme.colors.primary} />
                    <Text style={[styles.creatorStatText, { color: theme.colors.text }]}>
                      {Math.floor(Math.random() * 50) + 10} tracks
                    </Text>
                  </View>
                </View>
              </View>
            ))}
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

  // Render Tier Selection (Free vs Pro) - Path-aware
  const renderTierSelection = () => {
    const isMusicLover = userType === 'music_lover';
    
    return (
      <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerWithBack}>
          <BackButton style={styles.backButton} onPress={handleBack} />
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
              Choose Your Experience
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
            {/* Free Tier - Show first and more prominent for Music Lovers */}
            <TouchableOpacity
              style={[
                styles.tierCard, 
                styles.tierCardFree, 
                { backgroundColor: theme.colors.surface },
                isMusicLover && { borderWidth: 2, borderColor: theme.colors.primary }
              ]}
              onPress={() => handleTierSelection('free')}
            >
              {isMusicLover && (
                <View style={[styles.proBadge, { backgroundColor: theme.colors.primary + '20', marginBottom: 12 }]}>
                  <Ionicons name="star" size={16} color={theme.colors.primary} />
                  <Text style={[styles.proBadgeText, { color: theme.colors.primary }]}>RECOMMENDED</Text>
      </View>
              )}
              <Text style={[styles.tierCardTitle, { color: theme.colors.text }]}>FREE</Text>
              <View style={styles.tierFeatures}>
                {isMusicLover ? (
                  <>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Unlimited streaming</Text>
                    </View>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Discover new artists</Text>
                    </View>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Support creators</Text>
                    </View>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Event discovery</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>3 track uploads (lifetime)</Text>
                    </View>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>5 searches per month</Text>
                    </View>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>3 messages per month</Text>
                    </View>
                    <View style={styles.tierFeatureItem}>
                      <Ionicons name="checkmark" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Basic features</Text>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.tierPricing}>
                <Text style={[styles.tierPricingText, { color: theme.colors.text }]}>Forever FREE</Text>
              </View>
              <View style={[styles.tierButton, styles.tierButtonFree, isMusicLover && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.tierButtonText, { color: isMusicLover ? '#FFFFFF' : theme.colors.text }]}>
                  {isMusicLover ? 'Start Exploring' : 'Start Free'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Pro Tier */}
            <TouchableOpacity
              style={[styles.tierCard, styles.tierCardPro, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleTierSelection('pro')}
            >
              <View style={styles.proBadge}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
              <View style={styles.tierFeatures}>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>10 uploads per month</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Unlimited searches</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Unlimited messages</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Advanced analytics</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Payment protection</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Verified badge</Text>
                </View>
                <View style={styles.tierFeatureItem}>
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                  <Text style={[styles.tierFeatureText, { color: theme.colors.text }]}>Priority placement</Text>
                </View>
              </View>
              <View style={styles.tierPricing}>
                <Text style={[styles.tierPricingText, { color: theme.colors.text }]}>£9.99/month</Text>
                <View style={styles.moneyBackBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <Text style={styles.moneyBackText}>7-day money-back guarantee</Text>
                </View>
              </View>
              <View style={[styles.tierButton, styles.tierButtonPro]}>
                <Text style={styles.tierButtonTextPro}>
                  {isMusicLover ? 'Support Creators More →' : 'Upgrade to Pro →'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.socialProofText, { color: theme.colors.textSecondary }]}>
            {isMusicLover 
              ? '💡 Start free and upgrade anytime to support creators more'
              : '💡 90% of professionals choose Pro'
            }
          </Text>
        </ScrollView>
      </View>
    );
  };

  // Render Payment Collection
  const renderPayment = () => (
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWithBack}>
        <BackButton style={styles.backButton} onPress={handleBack} />
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
    <View style={[styles.stepContainer, { backgroundColor: theme.colors.background }]}>
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
      
      {/* Progress indicator */}
      {currentStep !== 'welcome' && currentStep !== 'welcomeConfirmation' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(() => {
                    const totalSteps = getPathTotalSteps(userType);
                    const currentStepNum = getCurrentStepNumber(currentStep, userType);
                    if (totalSteps === 0) return 0;
                    return Math.round((currentStepNum / totalSteps) * 100);
                  })()}%` 
                }
              ]} 
            />
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
      
      {/* Legacy screens (for backward compatibility) */}
      {currentStep === 'quickSetup' && renderQuickSetup()}
      {currentStep === 'eventPreferences' && renderEventPreferences()}
      {currentStep === 'valueDemo' && renderValueDemo()}
      
      {/* Shared screens */}
      {currentStep === 'tierSelection' && renderTierSelection()}
      {currentStep === 'payment' && renderPayment()}
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
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  rolesContainer: {
    flex: 1,
  },
  heroRoleButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
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
    borderRadius: 12,
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
  },
  inputHint: {
    fontSize: 14,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
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
    borderRadius: 16,
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
    fontWeight: '700',
    letterSpacing: 0.5,
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
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  creatorAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  creatorName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  creatorRole: {
    fontSize: 14,
    marginBottom: 12,
  },
  creatorStats: {
    marginTop: 8,
  },
  creatorStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  creatorStatText: {
    fontSize: 14,
    marginLeft: 8,
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
    borderRadius: 16,
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
  tierCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
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
    borderRadius: 12,
    alignItems: 'center',
  },
  tierButtonFree: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  tierButtonPro: {
    backgroundColor: '#7C3AED',
  },
  tierButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tierButtonTextPro: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderRadius: 16,
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
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  completionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
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
});
