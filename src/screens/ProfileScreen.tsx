import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  loadQueriesInParallel, 
  waitForValidSession,
  LoadingStateManager,
  CancellableQuery,
  withQueryTimeout
} from '../utils/dataLoading';
import { contentCacheService } from '../services/contentCacheService';
import * as ImagePicker from 'expo-image-picker';
// Removed FileSystem import - using FormData for Cloudinary upload
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { becomeServiceProvider } from '../services/creatorExpansionService';
import * as BiometricAuth from '../services/biometricAuth';
import ConnectionsPreview from '../components/ConnectionsPreview';
import RecentActivity from '../components/RecentActivity';
import { mockConnections } from '../utils/mockNetworkData';
import { uploadImage } from '../services/UploadService';
import { profileService } from '../services/ProfileService';
import { walletService } from '../services/WalletService';
import { payoutService } from '../services/PayoutService';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  professional_headline?: string;
  location?: string;
  website?: string;
  phone?: string;
  genres?: string[];
  experience_level?: string;
  followers_count: number;
  following_count: number;
  tracks_count: number;
  is_creator: boolean;
  is_verified: boolean;
  created_at: string;
}

interface UserStats {
  total_plays: number;
  total_likes: number;
  total_tips_received: number;
  total_earnings: number;
  monthly_plays: number;
  monthly_earnings: number;
}

interface RecentActivity {
  id: string;
  type: 'like' | 'play' | 'tip' | 'upload';
  message: string;
  time: string;
  icon: string;
  color: string;
}

interface UserTrack {
  id: string;
  title: string;
  play_count: number;
  likes_count: number;
  created_at: string;
  cover_url?: string;
}

export default function ProfileScreen() {
  const { user, userProfile, signOut, updatePassword, refreshUser, session, loading: authLoading } = useAuth();
  const { autoPlay, toggleAutoPlay } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'earnings'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false); // Start as false for instant cache display
  const initialCacheLoadRef = useRef(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [becomingServiceProvider, setBecomingServiceProvider] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  // Loading state management
  const loadingManager = useRef(new LoadingStateManager()).current;
  const cancellableQuery = useRef(new CancellableQuery()).current;

  // Subscribe to loading state changes
  useEffect(() => {
    const unsubscribe = loadingManager.onChange(() => {
      setLoading(loadingManager.isAnyLoading());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Start loading data as soon as user is available
    // Don't wait for authLoading to finish
    if (user?.id) {
      loadProfileData();
    }
    checkBiometricAvailability();

    return () => {
      cancellableQuery.cancel();
      loadingManager.reset();
    };
  }, [user?.id]);

  const checkBiometricAvailability = async () => {
    const capability = await BiometricAuth.checkBiometricAvailability();
    setBiometricAvailable(capability.available && capability.enrolled);
    
    if (capability.available && capability.enrolled) {
      const typeName = BiometricAuth.getBiometricTypeName(capability.types);
      setBiometricType(typeName);
      
      const enabled = await BiometricAuth.isBiometricLoginEnabled();
      setBiometricEnabled(enabled);
      console.log(`✅ ${typeName} available and ${enabled ? 'enabled' : 'not enabled'}`);
    }
  };

  const loadProfileData = async (forceRefresh = false) => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    const cacheKey = `profile_${user.id}`;
    
    // Try cache first (unless force refresh)
    if (!forceRefresh && !initialCacheLoadRef.current) {
      const cached = await contentCacheService.getCached('PROFILE', cacheKey);
      if (cached) {
        console.log('⚡ Instant load: Showing cached profile data');
        setProfile(cached.profile);
        setStats(cached.stats);
        setUserTracks(cached.tracks || []);
        initialCacheLoadRef.current = true;
        
        // Fetch fresh data in background
        setTimeout(() => loadProfileData(true), 100);
        return;
      }
    }
    
    // Only show loading if we don't have cached data
    if (!profile || forceRefresh) {
      console.log('👤 ProfileScreen: Loading profile data...');
      loadingManager.setLoading('profile', true, 10000);
      setLoading(true);
    }

    try {
      // Wait for valid session
      await waitForValidSession(supabase, 3000);

      // Load all profile data in parallel with timeouts
      const results = await loadQueriesInParallel({
        profile: {
          name: 'profile',
          query: () => withQueryTimeout(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single(),
            { timeout: 5000, fallback: null }
          ),
          timeout: 5000,
          fallback: null,
        },
        followers: {
          name: 'followers',
          query: async () => {
            const response = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', user.id);
            // Return the full response including count
            return { data: response.count ?? 0, error: response.error };
          },
          timeout: 3000,
          fallback: 0,
        },
        following: {
          name: 'following',
          query: async () => {
            const response = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('follower_id', user.id);
            // Return the full response including count
            return { data: response.count ?? 0, error: response.error };
          },
          timeout: 3000,
          fallback: 0,
        },
        tracksCount: {
          name: 'tracksCount',
          query: async () => {
            const response = await supabase
              .from('audio_tracks')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', user.id);
            // Return the full response including count
            return { data: response.count ?? 0, error: response.error };
          },
          timeout: 3000,
          fallback: 0,
        },
        tracks: {
          name: 'tracks',
          query: () => withQueryTimeout(
            supabase
              .from('audio_tracks')
              .select('*')
              .eq('creator_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10),
            { timeout: 5000, fallback: [] }
          ),
          timeout: 5000,
          fallback: [],
        },
        tips: {
          name: 'tips',
          query: async () => {
            // Use wallet service to get tip transactions (same source as WalletScreen)
            // Get fresh session to avoid 401 errors
            const { data: { session: freshSession } } = await supabase.auth.getSession();

            if (!freshSession) {
              console.warn('⚠️ No session available for tips query');
              return { data: 0, error: null };
            }

            try {
              console.log('💰 Fetching tips with fresh session...');
              // Get all transactions and filter for tip_received
              const transactionsResult = await walletService.getWalletTransactionsSafe(freshSession, 100, 0);
              const tipTransactions = transactionsResult.transactions.filter(
                (t) => t.transaction_type === 'tip_received' && t.status === 'completed'
              );

              // Sum up all tip amounts
              const totalTips = tipTransactions.reduce((sum: number, transaction) => {
                return sum + (transaction.amount || 0);
              }, 0);

              console.log(`💰 Total tips from wallet: $${totalTips.toFixed(2)} (${tipTransactions.length} transactions)`);
              return { data: totalTips, error: null };
            } catch (error) {
              console.warn('Error fetching tips from wallet:', error);
              return { data: 0, error: error instanceof Error ? error : new Error(String(error)) };
            }
          },
          timeout: 5000,
          fallback: 0,
        },
        creatorRevenue: {
          name: 'creatorRevenue',
          query: async () => {
            // Use payout service to get creator revenue (same source as WalletScreen)
            // Get fresh session to avoid 401 errors
            const { data: { session: freshSession } } = await supabase.auth.getSession();

            if (!freshSession) {
              console.warn('⚠️ No session available for creator revenue query');
              return { data: null, error: null };
            }

            try {
              const revenue = await payoutService.getCreatorRevenue(freshSession);
              console.log(`💰 Creator revenue: $${revenue?.total_earned?.toFixed(2) || '0.00'}`);
              return { data: revenue, error: null };
            } catch (error) {
              // Graceful fallback - revenue might not exist yet
              console.warn('Error fetching creator revenue (may not exist yet):', error);
              return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
            }
          },
          timeout: 5000,
          fallback: null,
        },
      });

      // Process profile data
      const profileData = results.profile?.data || results.profile;
      
      // Extract counts - now they're directly in the data property
      const followersCount = results.followers ?? 0;
      const followingCount = results.following ?? 0;
      const tracksCount = results.tracksCount ?? 0;
      const tracksData = results.tracks?.data || results.tracks || [];
      const totalTipsReceived = results.tips?.data ?? results.tips ?? 0;
      const creatorRevenue = results.creatorRevenue?.data ?? null;
      
      // Use creator revenue for total earnings (same as WalletScreen)
      // Falls back to tips if creator revenue not available
      const totalEarnings = creatorRevenue?.total_earned ?? totalTipsReceived ?? 0;

      console.log('📊 Profile counts - Followers:', followersCount, 'Following:', followingCount, 'Tracks:', tracksCount);

      let profileObj: UserProfile | null = null;

      if (profileData && !results.profile?.error) {
        console.log('✅ Profile loaded:', profileData.username);
        profileObj = {
          id: profileData.id,
          username: profileData.username,
          display_name: profileData.display_name,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
          banner_url: profileData.banner_url,
          professional_headline: profileData.professional_headline,
          location: profileData.location,
          website: profileData.website,
          phone: profileData.phone,
          genres: profileData.genres,
          experience_level: profileData.experience_level,
          followers_count: followersCount,
          following_count: followingCount,
          tracks_count: tracksCount,
          is_creator: profileData.is_creator || false,
          is_verified: profileData.is_verified || false,
          created_at: profileData.created_at,
        };
        setProfile(profileObj);
      } else {
        console.error('Failed to load profile:', results.profile?.error);
        // Fallback to basic user data
        profileObj = {
          id: user.id,
          username: user.email?.split('@')[0] || 'user123',
          display_name: user.email?.split('@')[0] || 'SoundBridge User',
          bio: null,
          avatar_url: null,
          banner_url: null,
          followers_count: followersCount,
          following_count: followingCount,
          tracks_count: tracksCount,
          is_creator: false,
          is_verified: false,
          created_at: new Date().toISOString(),
        };
        setProfile(profileObj);
      }

      // Process tracks data
      if (tracksData && tracksData.length > 0) {
        console.log('✅ User tracks loaded:', tracksData.length);
        
        const transformedTracks: UserTrack[] = tracksData.map((track: any) => ({
          id: track.id,
          title: track.title || 'Untitled Track',
          play_count: track.play_count || track.plays_count || 0,
          likes_count: track.likes_count || track.like_count || 0,
          created_at: track.created_at,
          cover_url: track.cover_image_url || track.cover_url || track.artwork_url || track.image_url,
        }));
        
        setUserTracks(transformedTracks);
        
        // Generate recent activity
        const activities: RecentActivity[] = [];
        transformedTracks.forEach((track, index) => {
          if (track.play_count > 100) {
            activities.push({
              id: `play-${track.id}`,
              type: 'play',
              message: `"${track.title}" reached ${track.play_count} plays`,
              time: `${index + 1}d ago`,
              icon: 'play',
              color: '#4CAF50'
            });
          }
          if (track.likes_count > 10) {
            activities.push({
              id: `like-${track.id}`,
              type: 'like',
              message: `"${track.title}" got ${track.likes_count} likes`,
              time: `${index + 2}d ago`,
              icon: 'heart',
              color: '#DC2626'
            });
          }
        });
        
        if (transformedTracks.length > 0) {
          activities.push({
            id: `upload-${transformedTracks[0].id}`,
            type: 'upload',
            message: `Uploaded "${transformedTracks[0].title}"`,
            time: '3d ago',
            icon: 'cloud-upload',
            color: '#2196F3'
          });
        }
        
        setRecentActivity(activities.slice(0, 5));
        
        // Calculate stats
        const totalPlays = transformedTracks.reduce((sum, track) => sum + (track.play_count || 0), 0);
        const totalLikes = transformedTracks.reduce((sum, track) => sum + (track.likes_count || 0), 0);

        const newStats = {
          total_plays: totalPlays,
          total_likes: totalLikes,
          total_tips_received: totalTipsReceived,
          total_earnings: totalEarnings, // Use creator revenue total_earned (includes tips + other earnings)
          monthly_plays: Math.floor(totalPlays * 0.3),
          monthly_earnings: Math.floor(totalEarnings * 0.3),
        };
        console.log('📊 Setting ProfileScreen stats:', {
          tips: totalTipsReceived,
          earnings: totalEarnings,
          statsObject: newStats
        });
        setStats(newStats);
      } else {
        console.log('ℹ️ No user tracks found');
        setUserTracks([]);
        setRecentActivity([]);
        const newStats = {
          total_plays: 0,
          total_likes: 0,
          total_tips_received: totalTipsReceived,
          total_earnings: totalEarnings, // Use creator revenue total_earned (includes tips + other earnings)
          monthly_plays: 0,
          monthly_earnings: Math.floor(totalEarnings * 0.3),
        };
        console.log('📊 Setting ProfileScreen stats (no tracks):', {
          tips: totalTipsReceived,
          earnings: totalEarnings,
          statsObject: newStats
        });
        setStats(newStats);
      }

      // Save to cache
      if (profileObj) {
        await contentCacheService.saveCache('PROFILE', cacheKey, {
          profile: profileObj,
          stats: stats || {
            total_plays: 0,
            total_likes: 0,
            total_tips_received: totalTipsReceived,
            total_earnings: totalEarnings, // Use creator revenue total_earned (includes tips + other earnings)
            monthly_plays: 0,
            monthly_earnings: Math.floor(totalEarnings * 0.3),
          },
          tracks: userTracks,
        });
      }

      console.log('✅ ProfileScreen: Profile loaded successfully');
      initialCacheLoadRef.current = true;
    } catch (error) {
      console.error('❌ ProfileScreen: Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
      // Set fallback data
      const fallbackProfile = {
        id: user?.id || 'unknown',
        username: user?.email?.split('@')[0] || 'user123',
        display_name: user?.email?.split('@')[0] || 'SoundBridge User',
        bio: null,
        avatar_url: null,
        banner_url: null,
        followers_count: 0,
        following_count: 0,
        tracks_count: 0,
        is_creator: false,
        is_verified: false,
        created_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      const fallbackStats = {
        total_plays: 0,
        total_likes: 0,
        total_tips_received: 0,
        total_earnings: 0,
        monthly_plays: 0,
        monthly_earnings: 0,
      };
      setStats(fallbackStats);
      
      // Save fallback to cache if we don't have cached data
      if (!profile) {
        await contentCacheService.saveCache('PROFILE', cacheKey, {
          profile: fallbackProfile,
          stats: fallbackStats,
          tracks: [],
        });
      }
    } finally {
      loadingManager.setLoading('profile', false, 0);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData(true); // Force refresh
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setEditingProfile({
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      username: profile?.username || '',
      professional_headline: profile?.professional_headline || '',
      location: profile?.location || '',
      website: profile?.website || '',
      phone: profile?.phone || '',
    });
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !editingProfile || !session) return;
    
    try {
      console.log('🔧 Saving profile changes...');
      
      // Use ProfileService to update profile via API
      const result = await profileService.updateProfile(user.id, editingProfile, session);
      
      if (result.success) {
        console.log('✅ Profile updated successfully');
        // Update local state
        setProfile(prev => prev ? { ...prev, ...editingProfile } : null);
        // Refresh user data across the app
        await refreshUser();
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        console.error('Failed to update profile:', result.error);
        Alert.alert('Error', result.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingProfile({});
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose how you want to update your profile picture',
      [
        { text: 'Camera', onPress: () => updateAvatar('camera') },
        { text: 'Gallery', onPress: () => updateAvatar('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateAvatar = async (source: 'camera' | 'gallery') => {
    if (!user?.id) return;

    try {
      setAvatarUploading(true);

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select a profile picture.');
        return;
      }

      let result;
      if (source === 'camera') {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
          Alert.alert('Permission Required', 'We need camera permissions to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // Keep deprecated API for now - works in v17.0.8
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // Keep deprecated API for now - works in v17.0.8
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Profile pictures must be under 5MB');
          return;
        }

        // Prepare file for upload
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp'
        }[fileExt] || 'image/jpeg';

        const file = {
          uri: asset.uri,
          name: `avatar_${Date.now()}.${fileExt}`,
          type: mimeType
        };

        // Upload to /api/upload/avatar endpoint using ProfileService
        console.log('📤 Uploading profile picture...');
        
        if (!session) {
          Alert.alert('Error', 'Not authenticated');
          setAvatarUploading(false);
          return;
        }

        // Verify user ID is available
        const userId = user?.id;
        if (!userId) {
          console.error('❌ User ID not available');
          Alert.alert('Error', 'User information not available. Please try again.');
          return;
        }

        // Use ProfileService to upload avatar
        const uploadResult = await profileService.uploadAvatar(userId, asset.uri, session);
        
        if (uploadResult.success && uploadResult.avatarUrl) {
          console.log('✅ Avatar uploaded successfully:', uploadResult.avatarUrl);
          
          // Update local profile state
          setProfile(prev => prev ? { ...prev, avatar_url: uploadResult.avatarUrl } : null);
          
          // Refresh user data across the app
          await refreshUser();
          
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          console.error('❌ Avatar upload failed:', uploadResult.error);
          Alert.alert('Error', uploadResult.error || 'Failed to upload profile picture');
        }
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };


  const handleShareProfile = () => {
    Alert.alert('Share Profile', 'Share your SoundBridge profile with others!');
  };

  // Quick Actions handlers
  const handleUploadTrack = () => {
    navigation.navigate('Upload' as never);
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent' as never);
  };

  const handleCreatePlaylist = () => {
    navigation.navigate('CreatePlaylist' as never);
  };

  const handleManageAvailability = () => {
    navigation.navigate('AvailabilityCalendar' as never);
  };

  const handleBecomeServiceProvider = async () => {
    if (!user?.id || !session) {
      Alert.alert('Error', 'Please sign in to become a service provider');
      return;
    }

    Alert.alert(
      'Become a Service Provider',
      'Join SoundBridge as a service provider to offer your professional services (mixing, mastering, sound engineering, etc.) to creators. You\'ll be able to set your rates, showcase your portfolio, and manage bookings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setBecomingServiceProvider(true);
            try {
              console.log('🚀 Starting becomeServiceProvider flow...');
              console.log('User ID:', user.id);
              console.log('Session exists:', !!session);
              
              const result = await becomeServiceProvider(user.id, { session });
              
              console.log('✅ becomeServiceProvider result:', result);
              
              if (result.success) {
                console.log('✅ Success! Refreshing user profile...');
                // Refresh user profile to get updated creator types
                await refreshUser();
                
                Alert.alert(
                  'Success!',
                  'You are now a service provider! Let\'s set up your profile.',
                  [
                    {
                      text: 'Set Up Profile',
                      onPress: () => {
                        setBecomingServiceProvider(false);
                        navigation.navigate('ServiceProviderOnboarding' as never);
                      },
                    },
                    {
                      text: 'Later',
                      style: 'cancel',
                      onPress: () => setBecomingServiceProvider(false),
                    },
                  ]
                );
              } else {
                console.error('❌ becomeServiceProvider returned success: false');
                Alert.alert(
                  'Error',
                  'Failed to become a service provider. Please try again.',
                  [{ text: 'OK', onPress: () => setBecomingServiceProvider(false) }]
                );
              }
            } catch (error: any) {
              console.error('❌ Error becoming service provider:', error);
              console.error('Error details:', {
                message: error?.message,
                status: error?.status,
                body: error?.body,
                isNetworkError: error?.isNetworkError,
                stack: error?.stack,
              });
              
              // Extract error message from various possible sources
              let errorMessage = 'Something went wrong. Please try again.';
              
              // Handle network errors specifically
              if (error?.isNetworkError || error?.message === 'Network request failed') {
                errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
              } else if (error?.body) {
                if (typeof error.body === 'string') {
                  errorMessage = error.body;
                } else if (error.body?.message) {
                  errorMessage = error.body.message;
                } else if (error.body?.error) {
                  errorMessage = error.body.error;
                }
              } else if (error?.message) {
                errorMessage = error.message;
              }
              
              // Add status code info if available (but not for network errors)
              if (error?.status && error.status !== 0) {
                errorMessage += ` (Status: ${error.status})`;
              }
              
              Alert.alert(
                'Error',
                errorMessage,
                [{ text: 'OK', onPress: () => setBecomingServiceProvider(false) }]
              );
            }
          },
        },
      ]
    );
  };

  // Settings handlers
  const handlePrivacySecurity = () => {
    navigation.navigate('PrivacySecurity' as never);
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword' as never);
  };

  const handleNotificationSettings = () => {
    navigation.navigate('NotificationSettings' as never);
  };

  const handleBiometricToggle = async () => {
    if (!biometricAvailable) {
      await BiometricAuth.showBiometricSetupPrompt();
      return;
    }

    if (biometricEnabled) {
      // Disable biometric login
      const result = await BiometricAuth.disableBiometricLogin();
      if (result.success) {
        setBiometricEnabled(false);
        Alert.alert('Success', `${biometricType} login disabled`);
      } else {
        Alert.alert('Error', result.error || 'Failed to disable biometric login');
      }
    } else {
      // Enable biometric login - need to get current credentials
      Alert.alert(
        `Enable ${biometricType} Login`,
        'Please enter your password to enable biometric login',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to a password confirmation screen or show a modal
              Alert.prompt(
                'Enter Password',
                'Please enter your current password to enable biometric login',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Enable',
                    onPress: async (password) => {
                      if (!password || !user?.email) {
                        Alert.alert('Error', 'Password is required');
                        return;
                      }
                      
                      const result = await BiometricAuth.enableBiometricLogin(user.email, password);
                      if (result.success) {
                        setBiometricEnabled(true);
                        Alert.alert('Success', `${biometricType} login enabled!`);
                      } else {
                        Alert.alert('Error', result.error || 'Failed to enable biometric login');
                      }
                    },
                  },
                ],
                'secure-text'
              );
            },
          },
        ]
      );
    }
  };

  const handleOfflineDownloads = () => {
    navigation.navigate('OfflineDownloads' as never);
  };

  // Support & About handlers
  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Choose how you\'d like to get help',
      [
        { text: 'In-App Help', onPress: () => navigation.navigate('HelpSupport' as never) },
        { text: 'Visit Website', onPress: () => Linking.openURL('https://soundbridge.live/support') },
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@soundbridge.live') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'Choose how you\'d like to view our terms',
      [
        { text: 'In-App View', onPress: () => navigation.navigate('TermsOfService' as never) },
        { text: 'Open Website', onPress: () => Linking.openURL('https://soundbridge.live/legal/terms') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Choose how you\'d like to view our privacy policy',
      [
        { text: 'In-App View', onPress: () => navigation.navigate('PrivacyPolicy' as never) },
        { text: 'Open Website', onPress: () => Linking.openURL('https://soundbridge.live/legal/privacy') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAbout = () => {
    navigation.navigate('About' as never);
  };

  // Payout Settings handlers
  const handlePaymentMethods = () => {
    navigation.navigate('PaymentMethods' as never);
  };

  const handlePayoutSchedule = () => {
    navigation.navigate('Billing' as never);
  };

  const handleWallet = () => {
    navigation.navigate('Wallet' as never);
  };

  const handleTaxInfo = () => {
    Alert.alert('Tax Information', 'Upload tax documents for compliance. Feature coming soon!');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(stats?.total_plays || 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Plays</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(stats?.total_likes || 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Likes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(stats?.total_tips_received || 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tips</Text>
        </View>
      </View>

      {/* Connections Preview */}
      <ConnectionsPreview
        connections={mockConnections}
        totalCount={142}
      />

      {/* Recent Activity Component */}
      <RecentActivity />

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <View key={activity.id} style={[styles.activityItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name={activity.icon as any} size={20} color={activity.color} />
              <Text style={[styles.activityText, { color: theme.colors.text }]}>{activity.message}</Text>
              <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>{activity.time}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No recent activity</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>Start uploading tracks to see your activity here!</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleUploadTrack}>
          <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Upload New Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleCreateEvent}>
          <Ionicons name="calendar" size={24} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Create Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleManageAvailability}>
          <Ionicons name="time" size={24} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Manage Availability</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleCreatePlaylist}>
          <Ionicons name="musical-notes" size={24} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Create Playlist</Text>
        </TouchableOpacity>
      </View>

      {/* My Tracks (matching web app) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Tracks</Text>
        {userTracks.length > 0 ? (
          userTracks.slice(0, 5).map((track) => (
            <View key={track.id} style={[styles.trackItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.trackImageContainer}>
                {track.cover_url ? (
                  <Image 
                    source={{ uri: track.cover_url }} 
                    style={styles.trackImage}
                    onError={() => console.log(`❌ Failed to load track image: ${track.cover_url}`)}
                    onLoad={() => console.log(`✅ Track image loaded: ${track.cover_url}`)}
                  />
                ) : (
                  <View style={[styles.trackImage, styles.trackImagePlaceholder, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
              </View>
              
              <View style={styles.trackInfo}>
                <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {track.title}
                </Text>
                <View style={styles.trackStats}>
                  <Ionicons name="play" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>{formatNumber(track.play_count || 0)}</Text>
                  <Ionicons name="heart" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                  <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>{formatNumber(track.likes_count || 0)}</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.trackMenu}>
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No tracks yet</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>Upload your first track to get started!</Text>
          </View>
        )}
        
        {userTracks.length > 5 && (
          <TouchableOpacity
            style={[styles.viewAllButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('TracksList' as never, { userId: profile?.id } as never)}
          >
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All Tracks</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEarningsTab = () => (
    <View style={styles.tabContent}>
      {/* Earnings Overview */}
      <View style={[styles.earningsOverview, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.earningsTotal, { color: theme.colors.text }]}>${stats?.total_earnings?.toFixed(2) || '0.00'}</Text>
        <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>Total Earnings</Text>
        <Text style={[styles.earningsMonthly, { color: theme.colors.textSecondary }]}>
          ${stats?.monthly_earnings?.toFixed(2) || '0.00'} this month
        </Text>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.section}>
        <View style={styles.earningsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Earnings Breakdown</Text>
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Upgrade' as never)}
          >
            <Ionicons name="rocket" size={16} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.earningsItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="heart" size={20} color={theme.colors.primary} />
          <View style={styles.earningsItemContent}>
            <Text style={[styles.earningsItemTitle, { color: theme.colors.text }]}>Tips Received</Text>
            <Text style={[styles.earningsItemAmount, { color: theme.colors.text }]}>${(stats?.total_tips_received || 0).toFixed(2)}</Text>
          </View>
        </View>
        <View style={[styles.earningsItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="people" size={20} color={theme.colors.warning} />
          <View style={styles.earningsItemContent}>
            <Text style={[styles.earningsItemTitle, { color: theme.colors.text }]}>Collaborations</Text>
            <Text style={[styles.earningsItemAmount, { color: theme.colors.text }]}>$0.00</Text>
          </View>
        </View>
      </View>

      {/* Payout Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payout Settings</Text>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleWallet}>
          <Ionicons name="wallet" size={20} color="#8B5CF6" />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Digital Wallet</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handlePaymentMethods}>
          <Ionicons name="card" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handlePayoutSchedule}>
          <Ionicons name="calendar" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Payout Schedule</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleTaxInfo}>
          <Ionicons name="document-text" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Tax Information</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      {/* Professional Sections */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Professional Profile</Text>
        <TouchableOpacity 
          style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={() => navigation.navigate('ExperienceManagement' as never)}
        >
          <Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Experience</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={() => navigation.navigate('SkillsManagement' as never)}
        >
          <Ionicons name="star-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Skills</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={() => navigation.navigate('InstrumentsManagement' as never)}
        >
          <Ionicons name="musical-notes-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Instruments</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={() => navigation.navigate('AnalyticsDashboard' as never)}
        >
          <Ionicons name="bar-chart-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Analytics</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={() => navigation.navigate('BrandingCustomization' as never)}
        >
          <Ionicons name="color-palette-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Branding</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleEditProfile}>
          <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handlePrivacySecurity}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} 
          onPress={() => (navigation as any).navigate('TwoFactorSettings')}
        >
          <Ionicons name="lock-closed" size={20} color="#4ECDC4" />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Two-Factor Authentication</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleChangePassword}>
          <Ionicons name="key" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {/* Biometric Login Toggle */}
        {biometricAvailable && (
          <View style={[styles.settingRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={Platform.OS === 'ios' ? 'finger-print' : 'fingerprint'} 
                size={20} 
                color={biometricEnabled ? '#10B981' : theme.colors.textSecondary} 
              />
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[styles.settingText, { color: theme.colors.text }]}>
                  {biometricType} Login
                </Text>
                <Text style={[styles.settingSubtext, { color: theme.colors.textSecondary }]}>
                  Quick login with biometrics
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: theme.colors.border, true: '#10B981' + '40' }}
              thumbColor={biometricEnabled ? '#10B981' : theme.colors.textSecondary}
              style={{ marginLeft: 8 }}
            />
          </View>
        )}
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleOfflineDownloads}>
          <Ionicons name="download" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Offline Downloads</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Creator Tools */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Creator Tools</Text>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleManageAvailability}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Collaboration Availability</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => navigation.navigate('CollaborationRequests' as never)}>
          <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Collaboration Requests</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {userProfile?.creator_types?.includes('service_provider') ? (
          <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => navigation.navigate('ServiceProviderDashboard' as never, { userId: user?.id } as never)}>
            <Ionicons name="briefcase" size={20} color={theme.colors.accentPurple} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Service Provider Dashboard</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleBecomeServiceProvider}>
            <Ionicons name="briefcase-outline" size={20} color={theme.colors.accentPurple} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Become a Service Provider</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>App Settings</Text>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
            thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        </View>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => navigation.navigate('ThemeSettings' as never)}>
          <Ionicons name="moon" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Theme Settings</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => (navigation as any).navigate('AudioEnhancementExpo')}>
          <Ionicons name="musical-notes" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Audio Enhancement</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="play-circle" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Auto-play</Text>
          </View>
          <Switch
            value={autoPlay}
            onValueChange={toggleAutoPlay}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
            thumbColor={autoPlay ? theme.colors.primary : theme.colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>

      {/* TEST BUTTON - Temporary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Testing</Text>
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]} 
          onPress={() => (navigation as any).navigate('OnboardingTest')}
        >
          <Ionicons name="flask" size={20} color="#FFFFFF" />
          <Text style={[styles.testButtonText, { color: '#FFFFFF' }]}>Test Onboarding Flow</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Support & About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Support & About</Text>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleHelpSupport}>
          <Ionicons name="help-circle" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleTermsOfService}>
          <Ionicons name="document-text" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handlePrivacyPolicy}>
          <Ionicons name="shield" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={handleAbout}>
          <Ionicons name="information-circle" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>About SoundBridge</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={[styles.signOutButton, { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error }]} onPress={handleSignOut}>
        <Text style={[styles.signOutText, { color: theme.colors.error }]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading profile...</Text>
      </View>
    );
  }

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
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={styles.headerButtons}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleSaveProfile}>
                <Ionicons name="checkmark" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleEditProfile}>
                <Ionicons name="pencil-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleShareProfile}>
                <Ionicons name="share-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Scrollable Content - Profile Banner, Tabs, and Content all scroll together */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'overview' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#DC2626"
              colors={['#DC2626']}
            />
          ) : undefined
        }
      >
        {/* Profile Header - Scrolls up and out of view */}
        <View style={styles.profileHeader}>
          <View style={styles.profileBannerContainer}>
            {/* Large Profile Picture Background */}
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.profileBannerImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#DC2626', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileBannerImage}
              />
            )}
            
            {/* Dark Overlay for Text Readability */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.profileOverlay}
            />
            
            {/* Profile Content Overlay */}
            <View style={styles.profileContentOverlay}>
              {/* Avatar Edit Button */}
              <TouchableOpacity 
                style={styles.avatarEditButtonOverlay} 
                onPress={handleChangeAvatar} 
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              
              {/* User Info Overlay */}
              <View style={styles.profileInfoOverlay}>
                {isEditing ? (
                  <>
                    <TextInput
                      style={[styles.editInputOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)', color: '#FFFFFF' }]}
                      value={editingProfile.display_name}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, display_name: text }))}
                      placeholder="Display Name"
                      placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    />
                    <TextInput
                      style={[styles.editInputOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)', color: '#FFFFFF' }]}
                      value={editingProfile.professional_headline}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, professional_headline: text }))}
                      placeholder="Professional Headline (e.g., Music Producer)"
                      placeholderTextColor="rgba(255, 255, 255, 0.7)"
                      maxLength={120}
                    />
                    <TextInput
                      style={[styles.editInputOverlay, styles.bioInputOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)', color: '#FFFFFF' }]}
                      value={editingProfile.bio}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, bio: text }))}
                      placeholder="Bio"
                      placeholderTextColor="rgba(255, 255, 255, 0.7)"
                      multiline
                      numberOfLines={3}
                    />
                  </>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.displayNameOverlay}>{profile?.display_name}</Text>
                      {profile?.is_verified && (
                        <View style={styles.verifiedBadgeOverlay}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.usernameOverlay}>@{profile?.username}</Text>
                    {profile?.professional_headline && (
                      <Text style={styles.headlineOverlay}>{profile.professional_headline}</Text>
                    )}
                    {profile?.bio && (
                      <Text style={styles.bioOverlay}>{profile.bio}</Text>
                    )}
                  </>
                )}
                
                {/* Stats Overlay - Clickable */}
                <View style={styles.profileStatsOverlay}>
                  <TouchableOpacity
                    style={styles.statItemOverlay}
                    onPress={() => navigation.navigate('FollowersList' as never, { userId: profile?.id } as never)}
                  >
                    <Text style={styles.statNumberOverlay}>{profile?.followers_count || 0}</Text>
                    <Text style={styles.statLabelOverlay}>Followers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.statItemOverlay}
                    onPress={() => navigation.navigate('FollowingList' as never, { userId: profile?.id } as never)}
                  >
                    <Text style={styles.statNumberOverlay}>{profile?.following_count || 0}</Text>
                    <Text style={styles.statLabelOverlay}>Following</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.statItemOverlay}
                    onPress={() => navigation.navigate('TracksList' as never, { userId: profile?.id } as never)}
                  >
                    <Text style={styles.statNumberOverlay}>{profile?.tracks_count || 0}</Text>
                    <Text style={styles.statLabelOverlay}>Tracks</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.joinDateOverlay}>
                  Joined {formatDate(profile?.created_at || new Date().toISOString())}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs - Scroll up with content */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && { backgroundColor: theme.colors.primary + '20' }]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'overview' ? theme.colors.primary : theme.colors.textSecondary }, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'earnings' && { backgroundColor: theme.colors.primary + '20' }]}
            onPress={() => setActiveTab('earnings')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'earnings' ? theme.colors.primary : theme.colors.textSecondary }, activeTab === 'earnings' && styles.activeTabText]}>
              Earnings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && { backgroundColor: theme.colors.primary + '20' }]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'settings' ? theme.colors.primary : theme.colors.textSecondary }, activeTab === 'settings' && styles.activeTabText]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content - Scrolls with the rest */}
        <View style={[styles.content, { backgroundColor: 'transparent' }]}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'earnings' && renderEarningsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </View>
      </ScrollView>

      {/* Loading Modal for Becoming Service Provider */}
      <Modal
        visible={becomingServiceProvider}
        transparent
        animationType="fade"
        onRequestClose={() => setBecomingServiceProvider(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Loading</Text>
            <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
              Setting up your service provider account...
            </Text>
          </View>
        </View>
      </Modal>
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
    // color applied dynamically in JSX
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 300, // Extra space for mini player
  },
  profileHeader: {
    marginBottom: 0,
  },
  profileBannerContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  profileBannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  profileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  profileContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
  },
  avatarEditButtonOverlay: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInfoOverlay: {
    alignItems: 'flex-start',
  },
  displayNameOverlay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  usernameOverlay: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headlineOverlay: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bioOverlay: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileStatsOverlay: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 12,
    gap: 24,
  },
  statItemOverlay: {
    alignItems: 'flex-start',
  },
  statNumberOverlay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statLabelOverlay: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  joinDateOverlay: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  editInputOverlay: {
    width: '100%',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bioInputOverlay: {
    height: 80,
    textAlignVertical: 'top',
  },
  verifiedBadgeOverlay: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  activeTab: {
    // backgroundColor applied dynamically in JSX
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  content: {
    backgroundColor: 'transparent',
  },
  tabContent: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    // backgroundColor applied dynamically in JSX
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // color applied dynamically in JSX
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  activityText: {
    flex: 1,
    // color applied dynamically in JSX
    fontSize: 14,
    marginLeft: 12,
  },
  activityTime: {
    // color applied dynamically in JSX
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  actionText: {
    // color applied dynamically in JSX
    fontSize: 16,
    marginLeft: 12,
  },
  earningsOverview: {
    // backgroundColor applied dynamically in JSX
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsTotal: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  earningsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  earningsMonthly: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  earningsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    marginBottom: 8,
  },
  earningsItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  earningsItemTitle: {
    // color applied dynamically in JSX
    fontSize: 14,
    marginBottom: 2,
  },
  earningsItemAmount: {
    // color applied dynamically in JSX
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 16,
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  settingText: {
    // color applied dynamically in JSX
    fontSize: 16,
    marginLeft: 12,
  },
  settingSubtext: {
    fontSize: 13,
    marginLeft: 12,
    marginTop: 2,
  },
  signOutButton: {
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
  },
  signOutText: {
    // color applied dynamically in JSX
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Test button styles
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  testButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  editInput: {
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    // color applied dynamically in JSX
    fontSize: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    // color applied dynamically in JSX
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  // Track-related styles (matching web app)
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    // backgroundColor applied dynamically in JSX
    borderRadius: 8,
    marginBottom: 8,
  },
  trackImageContainer: {
    marginRight: 12,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    // backgroundColor applied dynamically in JSX
  },
  trackImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    // color applied dynamically in JSX
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStatText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  trackMenu: {
    padding: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  upgradeButtonText: {
    // color applied dynamically in JSX
    fontSize: 12,
    fontWeight: '600',
  },
  // Avatar upload styles
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor applied dynamically in JSX
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Loading Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});