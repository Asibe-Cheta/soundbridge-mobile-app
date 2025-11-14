import React, { useState, useEffect, useRef } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import CountrySelector from '../components/CountrySelector';

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

type UserRole = 'creator' | 'listener';
type OnboardingStep = 'role' | 'trial' | 'profile' | 'genres' | 'location' | 'complete';

export default function OnboardingScreen() {
  const { user, userProfile, updateUserProfile, completeOnboarding } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('role');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [trialActivated, setTrialActivated] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Profile data
  const [displayName, setDisplayName] = useState(userProfile?.display_name || user?.user_metadata?.display_name || '');
  const [username, setUsername] = useState(userProfile?.username || user?.user_metadata?.username || '');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [country, setCountry] = useState(userProfile?.country || 'Nigeria');

  // Genres data
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);

  useEffect(() => {
    if (currentStep === 'genres') {
      loadGenres();
    }
  }, [currentStep]);

  // Entrance animation effect
  useEffect(() => {
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    // Start entrance animation
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
        Alert.alert('Error', 'Failed to load music genres. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error loading genres:', error);
      Alert.alert('Error', 'Failed to load music genres. Please check your connection.');
    } finally {
      setLoadingGenres(false);
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

  // Handle role selection
  const handleRoleSelection = (role: UserRole) => {
    setUserRole(role);
    console.log('👤 User selected role:', role);
    
    if (role === 'creator') {
      setCurrentStep('trial');
    } else {
      setCurrentStep('profile');
    }
  };

  // Handle trial activation
  const handleTrialActivation = () => {
    setTrialActivated(true);
    console.log('🎁 Pro trial activated for creator');
    setCurrentStep('profile');
  };

  // Handle skip trial
  const handleSkipTrial = () => {
    console.log('⏭️ User skipped trial');
    setCurrentStep('profile');
  };

  // Toggle genre selection
  const toggleGenre = (genreId: string) => {
    if (selectedGenres.includes(genreId)) {
      setSelectedGenres(selectedGenres.filter(id => id !== genreId));
    } else {
      if (selectedGenres.length < 5) {
        setSelectedGenres([...selectedGenres, genreId]);
      } else {
        Alert.alert('Maximum Reached', 'You can select up to 5 genres only.');
      }
    }
  };

  // Navigate to next step
  const handleNext = async () => {
    setLoading(true);

    try {
      switch (currentStep) {
        case 'profile':
          // Validate profile data
          if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter your display name');
            setLoading(false);
            return;
          }
          setCurrentStep('genres');
          break;

        case 'genres':
          // Validate genre selection
          if (selectedGenres.length < 3) {
            Alert.alert('Select Genres', 'Please select at least 3 genres to continue');
            setLoading(false);
            return;
          }
          
          // Save genre preferences
          const genresSaved = await saveGenrePreferences();
          if (!genresSaved) {
            Alert.alert('Error', 'Failed to save your preferences. Please try again.');
            setLoading(false);
            return;
          }
          
          setCurrentStep('location');
          break;

        case 'location':
          // Validate country and location
          if (!country) {
            Alert.alert('Required', 'Please select your country');
            setLoading(false);
            return;
          }
          if (!location.trim()) {
            Alert.alert('Required', 'Please enter your location');
            setLoading(false);
            return;
          }
          
          // Save country and location to profile
          await updateUserProfile({
            country: country,
            location: location.trim(),
          });
          
          setCurrentStep('complete');
          break;

        case 'complete':
          // Complete onboarding and update profile
          console.log('🎉 Completing onboarding...');
          
          // Update final profile data
          const profileUpdates = {
            display_name: displayName,
            username: username,
            location: location,
            country: country,
            role: userRole || 'listener',
            onboarding_completed: true
          };
          
          const profileResult = await updateUserProfile(profileUpdates);
          if (!profileResult.success) {
            Alert.alert('Error', 'Failed to save your profile. Please try again.');
            setLoading(false);
            return;
          }
          
          // Mark onboarding as completed
          const onboardingResult = await completeOnboarding();
          if (!onboardingResult.success) {
            Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
            setLoading(false);
            return;
          }
          
          console.log('✅ Onboarding completed successfully!');
          
          // Navigate to main app
          (navigation as any).reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
          break;
      }
    } catch (error) {
      console.error('❌ Error in onboarding step:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    switch (currentStep) {
      case 'trial':
        setCurrentStep('role');
        break;
      case 'profile':
        if (userRole === 'creator') {
          setCurrentStep('trial');
        } else {
          setCurrentStep('role');
        }
        break;
      case 'genres':
        setCurrentStep('profile');
        break;
      case 'location':
        setCurrentStep('genres');
        break;
      case 'complete':
        setCurrentStep('location');
        break;
      default:
        // On role selection, allow going back to close onboarding
        navigation.goBack();
        break;
    }
  };

  // Render role selection step
  const renderRoleSelection = () => (
    <View style={styles.stepContainer}>
      {/* Apple Music-style animated background */}
      <View style={styles.animatedBackground}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(220, 38, 38, 0.1)', 'rgba(124, 58, 237, 0.08)', 'rgba(5, 150, 105, 0.06)', 'rgba(234, 88, 12, 0.04)']
            : ['rgba(220, 38, 38, 0.05)', 'rgba(124, 58, 237, 0.04)', 'rgba(5, 150, 105, 0.03)', 'rgba(234, 88, 12, 0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(234, 88, 12, 0.08)', 'rgba(220, 38, 38, 0.06)', 'rgba(5, 150, 105, 0.04)', 'rgba(124, 58, 237, 0.02)']
            : ['rgba(234, 88, 12, 0.04)', 'rgba(220, 38, 38, 0.03)', 'rgba(5, 150, 105, 0.02)', 'rgba(124, 58, 237, 0.01)']
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.gradientOverlay, { opacity: 0.7 }]}
        />
      </View>
      
      {/* Header with back button */}
      <View style={styles.headerWithBack}>
        <BackButton 
          style={styles.backButton}
          onPress={handleBack}
         />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          Step 1 of 4
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
            Welcome to SoundBridge
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
            Join 50,000+ creators building their music careers worldwide
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
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Do you want to be?
          </Text>

          {/* Music Creator - Hero Button Style */}
          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleRoleSelection('creator')}
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
                  Share your tracks and build your fanbase
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Podcast Creator - Hero Button Style */}
          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleRoleSelection('creator')}
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
                  Build your audience with engaging content
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Event Planner - Hero Button Style */}
          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleRoleSelection('creator')}
          >
            <LinearGradient
              colors={['rgba(5, 150, 105, 0.2)', 'rgba(4, 120, 87, 0.15)', 'rgba(6, 95, 70, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroRoleGradient}
            >
              <View style={styles.heroRoleIcon}>
                <Ionicons name="calendar" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.heroRoleContent}>
                <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>Event Planner</Text>
                <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                  Promote your events and sell tickets
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Music Lover - Hero Button Style */}
          <TouchableOpacity
            style={styles.heroRoleButton}
            onPress={() => handleRoleSelection('listener')}
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
                  Discover new music and connect with artists
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );

  // Render trial activation step
  const renderTrialActivation = () => (
    <View style={styles.stepContainer}>
      {/* Apple Music-style animated background */}
      <View style={styles.animatedBackground}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(245, 158, 11, 0.1)', 'rgba(217, 119, 6, 0.08)', 'rgba(180, 83, 9, 0.06)', 'rgba(220, 38, 38, 0.04)']
            : ['rgba(245, 158, 11, 0.05)', 'rgba(217, 119, 6, 0.04)', 'rgba(180, 83, 9, 0.03)', 'rgba(220, 38, 38, 0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(180, 83, 9, 0.08)', 'rgba(245, 158, 11, 0.06)', 'rgba(220, 38, 38, 0.04)', 'rgba(217, 119, 6, 0.02)']
            : ['rgba(180, 83, 9, 0.04)', 'rgba(245, 158, 11, 0.03)', 'rgba(220, 38, 38, 0.02)', 'rgba(217, 119, 6, 0.01)']
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.gradientOverlay, { opacity: 0.7 }]}
        />
      </View>
        
        {/* Header with back button */}
        <View style={styles.headerWithBack}>
          <BackButton 
            style={styles.backButton}
            onPress={handleBack}
           />
          <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
            Step 2 of 4
          </Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
          Start your growth by us
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Take the opportunity to get the best experience from the get go
        </Text>
      </Animated.View>

      <Animated.View 
        style={[
          styles.trialContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={[styles.trialTitle, { color: theme.colors.text }]}>
          Proceed free or Try this FREE for 7 days
        </Text>

        <Text style={[styles.trialSubtitle, { color: theme.colors.textSecondary }]}>
          Starting now, you get full access to:
        </Text>

        {/* Modern Benefits Card */}
        <View style={[styles.benefitsCard, { 
          backgroundColor: theme.isDark 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.02)',
          borderColor: theme.isDark 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.05)'
        }]}>
          <View style={styles.benefitItem}>
            <View style={styles.benefitIconContainer}>
              <Ionicons name="cloud-upload" size={18} color="#10B981" />
            </View>
            <Text style={[styles.benefitText, { color: theme.colors.text }]}>10 uploads this month</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={styles.benefitIconContainer}>
              <Ionicons name="musical-notes" size={18} color="#10B981" />
            </View>
            <Text style={[styles.benefitText, { color: theme.colors.text }]}>HD audio quality</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={styles.benefitIconContainer}>
              <Ionicons name="analytics" size={18} color="#10B981" />
            </View>
            <Text style={[styles.benefitText, { color: theme.colors.text }]}>Advanced analytics</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={styles.benefitIconContainer}>
              <Ionicons name="cash" size={18} color="#10B981" />
            </View>
            <Text style={[styles.benefitText, { color: theme.colors.text }]}>Revenue sharing</Text>
          </View>
          <View style={styles.benefitItem}>
            <View style={styles.benefitIconContainer}>
              <Ionicons name="flash" size={18} color="#10B981" />
            </View>
            <Text style={[styles.benefitText, { color: theme.colors.text }]}>Priority processing</Text>
          </View>
        </View>

        <View style={styles.trialInfo}>
          <Text style={[styles.trialEndDate, { color: theme.colors.text }]}>
            Trial ends: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </Text>
          <Text style={[styles.trialNote, { color: theme.colors.textSecondary }]}>
            No payment required now
          </Text>
        </View>

        {/* Modern Gradient Button */}
        <TouchableOpacity
          style={styles.activateButtonContainer}
          onPress={handleTrialActivation}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9', '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activateButtonGradient}
          >
            <Text style={styles.activateButtonText}>Activate Trial</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipTrial}
        >
          <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
            Continue with Free
          </Text>
        </TouchableOpacity>

        <Text style={[styles.cancelNote, { color: theme.colors.textSecondary }]}>
          Cancel anytime in Settings
        </Text>
      </Animated.View>
        </ScrollView>
    </View>
  );

  // Render profile setup step
  const renderProfileSetup = () => (
    <View style={styles.stepContainer}>
      {/* Apple Music-style animated background */}
      <View style={styles.animatedBackground}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.08)', 'rgba(29, 78, 216, 0.06)', 'rgba(220, 38, 38, 0.04)']
            : ['rgba(59, 130, 246, 0.05)', 'rgba(37, 99, 235, 0.04)', 'rgba(29, 78, 216, 0.03)', 'rgba(220, 38, 38, 0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(29, 78, 216, 0.08)', 'rgba(59, 130, 246, 0.06)', 'rgba(220, 38, 38, 0.04)', 'rgba(37, 99, 235, 0.02)']
            : ['rgba(29, 78, 216, 0.04)', 'rgba(59, 130, 246, 0.03)', 'rgba(220, 38, 38, 0.02)', 'rgba(37, 99, 235, 0.01)']
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.gradientOverlay, { opacity: 0.7 }]}
        />
      </View>
      
      {/* Header with back button */}
      <View style={styles.headerWithBack}>
        <BackButton 
          style={styles.backButton}
          onPress={handleBack}
         />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          Step 3 of 4
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.headerContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Step 1 of 3 - Quick Setup
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Let's get you started
        </Text>
      </View>

      <View style={styles.formContainer}>
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
            placeholder="John Smith"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Username</Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border,
              color: theme.colors.text 
            }]}
            value={username}
            onChangeText={setUsername}
            placeholder="@johnsmith"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.modernButtonContainer, !displayName.trim() && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!displayName.trim() || loading}
        >
          <LinearGradient
            colors={!displayName.trim() ? ['#9CA3AF', '#9CA3AF'] : ['#7C3AED', '#6D28D9', '#5B21B6']}
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
          onPress={handleNext}
        >
          <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
        </ScrollView>
    </View>
  );

  // Render genre selection step
  const renderGenreSelection = () => (
    <View style={styles.stepContainer}>
      {/* Apple Music-style animated background */}
      <View style={styles.animatedBackground}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(168, 85, 247, 0.1)', 'rgba(147, 51, 234, 0.08)', 'rgba(126, 34, 206, 0.06)', 'rgba(220, 38, 38, 0.04)']
            : ['rgba(168, 85, 247, 0.05)', 'rgba(147, 51, 234, 0.04)', 'rgba(126, 34, 206, 0.03)', 'rgba(220, 38, 38, 0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(126, 34, 206, 0.08)', 'rgba(168, 85, 247, 0.06)', 'rgba(220, 38, 38, 0.04)', 'rgba(147, 51, 234, 0.02)']
            : ['rgba(126, 34, 206, 0.04)', 'rgba(168, 85, 247, 0.03)', 'rgba(220, 38, 38, 0.02)', 'rgba(147, 51, 234, 0.01)']
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.gradientOverlay, { opacity: 0.7 }]}
        />
      </View>
      
      {/* Header with back button */}
      <View style={styles.headerWithBack}>
        <BackButton 
          style={styles.backButton}
          onPress={handleBack}
         />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          Step 3 of 4
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Step 2 of 3 - Almost Done
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          What music do you love?
        </Text>
        <Text style={[styles.genreCounter, { color: theme.colors.primary }]}>
          Selected {selectedGenres.length} of 5 genres (minimum 3)
        </Text>
      </View>

      {loadingGenres ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading music genres...
          </Text>
        </View>
      ) : (
        <View style={styles.genresContainer}>
          <View style={styles.genresList}>
            {availableGenres.map((item) => {
              const isSelected = selectedGenres.includes(item.id);
              const isDisabled = !isSelected && selectedGenres.length >= 5;
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.genreChipSelected,
                    isDisabled && styles.genreChipDisabled
                  ]}
                  onPress={() => toggleGenre(item.id)}
                  disabled={isDisabled}
                >
                  <Text style={[
                    styles.genreText,
                    { color: theme.colors.text },
                    isSelected && styles.genreTextSelected,
                    isDisabled && { color: theme.colors.textSecondary }
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

          <TouchableOpacity
            style={[
              styles.heroRoleButton,
              selectedGenres.length < 3 && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={selectedGenres.length < 3 || loading}
          >
            <LinearGradient
              colors={selectedGenres.length >= 3 
                ? ['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.15)', 'rgba(126, 34, 206, 0.1)']
                : ['rgba(107, 114, 128, 0.2)', 'rgba(75, 85, 99, 0.15)', 'rgba(55, 65, 81, 0.1)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroRoleGradient}
            >
              <View style={styles.heroRoleIcon}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.heroRoleContent}>
                <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>
                  {loading ? 'Saving...' : 'Continue'}
                </Text>
                <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                  {selectedGenres.length >= 3 ? 'Perfect selection!' : `Select ${3 - selectedGenres.length} more genres`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setCurrentStep('location')}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
    </View>
  );

  // Render location setup step
  const renderLocationSetup = () => (
    <View style={styles.stepContainer}>
      {/* Apple Music-style animated background */}
      <View style={styles.animatedBackground}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.08)', 'rgba(4, 120, 87, 0.06)', 'rgba(220, 38, 38, 0.04)']
            : ['rgba(16, 185, 129, 0.05)', 'rgba(5, 150, 105, 0.04)', 'rgba(4, 120, 87, 0.03)', 'rgba(220, 38, 38, 0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(4, 120, 87, 0.08)', 'rgba(16, 185, 129, 0.06)', 'rgba(220, 38, 38, 0.04)', 'rgba(5, 150, 105, 0.02)']
            : ['rgba(4, 120, 87, 0.04)', 'rgba(16, 185, 129, 0.03)', 'rgba(220, 38, 38, 0.02)', 'rgba(5, 150, 105, 0.01)']
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.gradientOverlay, { opacity: 0.7 }]}
        />
      </View>
      
      {/* Header with back button */}
      <View style={styles.headerWithBack}>
        <BackButton 
          style={styles.backButton}
          onPress={handleBack}
         />
        <Text style={[styles.headerStepText, { color: theme.colors.textSecondary }]}>
          Step 4 of 4
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          Step 3 of 3 - Final Step
        </Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
          Help us personalize your experience
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
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Your Country</Text>
          <CountrySelector
            value={country}
            onChange={setCountry}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>City/Location (Optional)</Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: theme.colors.text 
            }]}
            value={location}
            onChangeText={setLocation}
            placeholder="Lagos, New York, London..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.notificationContainer}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          SoundBridge tailors your preferences for the best social experience:
        </Text>
          <View style={styles.notificationOptions}>
            <View style={styles.notificationItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.notificationText, { color: theme.colors.text }]}>
                Your desired music genre(s)
              </Text>
            </View>
            <View style={styles.notificationItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.notificationText, { color: theme.colors.text }]}>
                Your preferred events
              </Text>
            </View>
            <View style={styles.notificationItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={[styles.notificationText, { color: theme.colors.text }]}>
                Like-minded creators to collaborate with
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.heroRoleButton, (!country || !location.trim()) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading || !country || !location.trim()}
        >
          <LinearGradient
            colors={(!country || !location.trim()) 
              ? ['rgba(156, 163, 175, 0.2)', 'rgba(156, 163, 175, 0.15)', 'rgba(156, 163, 175, 0.1)']
              : ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.15)', 'rgba(4, 120, 87, 0.1)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroRoleGradient}
          >
            <View style={styles.heroRoleIcon}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.heroRoleContent}>
              <Text style={[styles.heroRoleTitle, { color: theme.colors.text }]}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Text>
              <Text style={[styles.heroRoleDescription, { color: theme.colors.textSecondary }]}>
                Finish your SoundBridge journey
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      </ScrollView>
    </View>
  );

  // Render completion step
  const renderCompletion = () => (
    <View style={styles.stepContainer}>
      {/* Apple Music-style animated background */}
      <View style={styles.animatedBackground}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(16, 185, 129, 0.1)', 'rgba(220, 38, 38, 0.08)', 'rgba(168, 85, 247, 0.06)', 'rgba(245, 158, 11, 0.04)']
            : ['rgba(16, 185, 129, 0.05)', 'rgba(220, 38, 38, 0.04)', 'rgba(168, 85, 247, 0.03)', 'rgba(245, 158, 11, 0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(245, 158, 11, 0.08)', 'rgba(16, 185, 129, 0.06)', 'rgba(220, 38, 38, 0.04)', 'rgba(168, 85, 247, 0.02)']
            : ['rgba(245, 158, 11, 0.04)', 'rgba(16, 185, 129, 0.03)', 'rgba(220, 38, 38, 0.02)', 'rgba(168, 85, 247, 0.01)']
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.gradientOverlay, { opacity: 0.7 }]}
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.completionContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </View>
        
        <Text style={[styles.completionTitle, { color: theme.colors.text }]}>
          Welcome to SoundBridge!
        </Text>
        
        <Text style={[styles.completionSubtitle, { color: theme.colors.textSecondary }]}>
          Your account is ready. Let's start discovering amazing music!
        </Text>

        {trialActivated && (
          <View style={styles.trialActiveContainer}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={[styles.trialActiveText, { color: theme.colors.text }]}>
              Pro Trial Active - 7 days remaining
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.modernButtonContainer}
          onPress={handleNext}
        >
          <LinearGradient
            colors={['#10B981', '#059669', '#047857']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modernButtonGradient}
          >
            <Text style={styles.modernButtonText}>Start Exploring</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );

  // Main render
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
      
      {/* Progress indicator */}
      {currentStep !== 'role' && currentStep !== 'complete' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${
                    currentStep === 'trial' ? 20 :
                    currentStep === 'profile' ? 40 :
                    currentStep === 'genres' ? 60 :
                    currentStep === 'location' ? 80 : 100
                  }%` 
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Step content */}
      {currentStep === 'role' && renderRoleSelection()}
      {currentStep === 'trial' && renderTrialActivation()}
      {currentStep === 'profile' && renderProfileSetup()}
      {currentStep === 'genres' && renderGenreSelection()}
      {currentStep === 'location' && renderLocationSetup()}
      {currentStep === 'complete' && renderCompletion()}
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
  stepContainer: {
    flex: 1,
    backgroundColor: 'transparent',
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
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
  genreCounter: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  rolesContainer: {
    flex: 1,
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  trialContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  giftBadgeModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  giftTextModern: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  trialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  trialSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitsCard: {
    alignSelf: 'stretch',
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  trialInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trialEndDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trialNote: {
    fontSize: 14,
  },
  activateButtonContainer: {
    marginBottom: 16,
    minWidth: 240,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  activateButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  skipButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  cancelNote: {
    fontSize: 12,
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
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  genresContainer: {
    flex: 1,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  genreChip: {
    width: '47%',
    marginVertical: 6,
    marginHorizontal: '1.5%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexDirection: 'row',
  },
  genreChipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  genreChipDisabled: {
    opacity: 0.5,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  genreTextSelected: {
    color: '#FFFFFF',
  },
  genreCheckmark: {
    marginLeft: 4,
  },
  modernButtonContainer: {
    marginBottom: 12,
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
  notificationContainer: {
    marginBottom: 24,
  },
  notificationOptions: {
    marginTop: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationText: {
    fontSize: 16,
    marginLeft: 12,
  },
  completeButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
  },
  trialActiveText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
