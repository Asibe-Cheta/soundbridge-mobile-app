import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  Platform,
  Share,
  Clipboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from '../components/VerifiedBadge';
import { walkthroughable, useCopilot } from 'react-native-copilot';
import { useAuth } from '../contexts/AuthContext';

// Create walkthroughable component for tour
const WalkthroughableTouchable = walkthroughable(TouchableOpacity);
import { supabase, dbHelpers } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';
import { resetTour } from '../services/tourService';
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
import { uploadImage } from '../services/UploadService';
import { profileService } from '../services/ProfileService';
import { ModerationBadge } from '../components/ModerationBadge';
import { ExternalLinksDisplay } from '../components/ExternalLinks/ExternalLinksDisplay';
import PromptModal from '../components/PromptModal';
import { externalLinksService } from '../services/ExternalLinksService';
import { ExternalLink } from '../types/external-links';
import { SystemTypography as Typography } from '../constants/Typography';
import { getRelativeTime } from '../utils/collaborationUtils';
import { Connection } from '../types/network.types';
import { ratingsService, type RatingSummary } from '../services/RatingsService';
import { useBranding } from '../hooks/useBranding';
import VenuePreferencesModal from '../components/VenuePreferencesModal';
import QRCodeModal from '../components/QRCodeModal';
import ShareDiagonalIcon from '../components/ShareDiagonalIcon';
import ShareMyCardModal from '../components/ShareMyCardModal';
import CreatorNudgeModal from '../components/CreatorNudgeModal';
import { useToast } from '../contexts/ToastContext';

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
  early_adopter?: boolean;
  rating_avg?: number | null;
  rating_count?: number | null;
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
  type: 'like' | 'play' | 'tip' | 'upload' | 'reaction' | 'connection' | 'opportunity' | 'achievement' | 'collaboration' | 'event' | 'post';
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
  const { user, userProfile, signOut, updatePassword, refreshUser, updateUserProfile, session, loading: authLoading } = useAuth();
  const { autoPlay, toggleAutoPlay } = useAudioPlayer();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const { start: startTour } = useCopilot();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { branding } = useBranding(user?.id);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [connectionsPreview, setConnectionsPreview] = useState<Connection[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [userAlbums, setUserAlbums] = useState<any[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [createdEventsCount, setCreatedEventsCount] = useState<number>(0);
  const [bookedEventsCount, setBookedEventsCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'earnings'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false); // Start as false for instant cache display
  const initialCacheLoadRef = useRef(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showVenuePrefsModal, setShowVenuePrefsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showShareCardModal, setShowShareCardModal] = useState(false);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [nudgeDismissedThisSession, setNudgeDismissedThisSession] = useState(false);
  const [followerAvatars, setFollowerAvatars] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [becomingServiceProvider, setBecomingServiceProvider] = useState(false);
  const [hasSpProfile, setHasSpProfile] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [showBiometricPasswordPrompt, setShowBiometricPasswordPrompt] = useState(false);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);

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
      loadExternalLinks();
      checkSpProfileExists();
    }
    checkBiometricAvailability();

    return () => {
      cancellableQuery.cancel();
      loadingManager.reset();
    };
  }, [user?.id]);

  // Show nudge when creator navigates to their own profile, once per session
  useFocusEffect(
    useCallback(() => {
      if (profile?.is_creator && !userProfile?.fan_link_shared && !nudgeDismissedThisSession) {
        const timer = setTimeout(() => setShowNudgeModal(true), 700);
        return () => clearTimeout(timer);
      }
    }, [profile?.is_creator, userProfile?.fan_link_shared, nudgeDismissedThisSession]),
  );

  const handleMarkFanLinkShared = async (method: 'link' | 'card') => {
    if (!user?.id) return;
    await supabase.from('profiles').update({
      fan_link_shared: true,
      fan_link_shared_at: new Date().toISOString(),
      fan_link_share_method: method,
    }).eq('id', user.id);
    updateUserProfile({
      fan_link_shared: true,
      fan_link_share_method: method,
    });
    setShowNudgeModal(false);
    setShowShareCardModal(false);
  };

  const handleShareLink = async () => {
    if (!profile) return;
    const fanUrl = `https://soundbridge.live/${profile.username}/home`;
    setShowNudgeModal(false);
    try {
      const result = await Share.share({
        message: `Discover my content and support me directly on SoundBridge\n${fanUrl}`,
        url: fanUrl,
      });
      if (result.action === Share.sharedAction) {
        await handleMarkFanLinkShared('link');
        showToast('Link shared. Your audience can now find you on SoundBridge 🙏🏾', 'success', 4500);
      }
    } catch {}
  };

  const handleNudgeShareCard = () => {
    setShowNudgeModal(false);
    setTimeout(() => setShowShareCardModal(true), 200);
  };

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
        setCreatedEventsCount(cached.createdEventsCount || 0);
        setBookedEventsCount(cached.bookedEventsCount || 0);
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
        albums: {
          name: 'albums',
          query: () => dbHelpers.getAlbumsByCreator(user.id),
          timeout: 5000,
          fallback: [],
        },
        playlists: {
          name: 'playlists',
          query: () => dbHelpers.getUserPlaylists(user.id),
          timeout: 5000,
          fallback: [],
        },
        recentPosts: {
          name: 'recentPosts',
          query: () => withQueryTimeout(
            supabase
              .from('posts')
              .select('id, post_type, created_at')
              .eq('user_id', user.id)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(5),
            { timeout: 5000, fallback: [] }
          ),
          timeout: 5000,
          fallback: [],
        },
        recentReactions: {
          name: 'recentReactions',
          query: () => withQueryTimeout(
            supabase
              .from('post_reactions')
              .select('post_id, reaction_type, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5),
            { timeout: 5000, fallback: [] }
          ),
          timeout: 5000,
          fallback: [],
        },
        recentConnections: {
          name: 'recentConnections',
          query: () => withQueryTimeout(
            supabase
              .from('follows')
              .select('following_id, created_at')
              .eq('follower_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5),
            { timeout: 5000, fallback: [] }
          ),
          timeout: 5000,
          fallback: [],
        },
        tips: {
          name: 'tips',
          query: async () => {
            const { data, error } = await supabase
              .from('wallet_transactions')
              .select('amount')
              .eq('user_id', user.id)
              .eq('transaction_type', 'tip_received')
              .in('status', ['completed', 'pending']);
            if (error) return { data: 0, error };
            const total = (data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            return { data: total, error: null };
          },
          timeout: 8000,
          fallback: 0,
        },
        creatorRevenue: {
          name: 'creatorRevenue',
          query: async () => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const { data, error } = await supabase
              .from('wallet_transactions')
              .select('amount, transaction_type, created_at')
              .eq('user_id', user.id)
              .in('transaction_type', ['tip_received', 'gig_payment'])
              .in('status', ['completed', 'pending']);
            if (error) return { data: null, error };
            const rows = data || [];
            const totalEarned = rows.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            const thisMonthEarned = rows
              .filter((t: any) => t.created_at >= monthStart)
              .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            return {
              data: { total_earned: totalEarned, this_month_earnings: thisMonthEarned, pending_balance: 0 },
              error: null,
            };
          },
          timeout: 8000,
          fallback: null,
        },
        ratingSummary: {
          name: 'ratingSummary',
          query: async () => {
            try {
              return await ratingsService.getSummary(user.id);
            } catch (error) {
              console.warn('⚠️ Failed to load rating summary:', error);
              return { average: 0, count: 0 };
            }
          },
          timeout: 5000,
          fallback: { average: 0, count: 0 },
        },
        createdEventsCount: {
          name: 'createdEventsCount',
          query: async () => {
            const response = await supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', user.id);
            return { data: response.count ?? 0, error: response.error };
          },
          timeout: 3000,
          fallback: 0,
        },
        bookedEventsCount: {
          name: 'bookedEventsCount',
          query: async () => {
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            if (!freshSession) return { data: 0, error: null };
            const result = await apiFetch<{ count: number }>(
              '/api/users/me/booked-events-count',
              { session: freshSession }
            );
            return { data: result.count ?? 0, error: null };
          },
          timeout: 3000,
          fallback: 0,
        },
      });

      // Process profile data
      const profileData = results.profile?.data || results.profile;
      
      // Extract counts - now they're directly in the data property
      const followersCount = results.followers ?? 0;
      const followingCount = results.following ?? 0;
      const tracksCount = results.tracksCount ?? 0;
      const tracksData = results.tracks?.data || results.tracks || [];
      const albumsData = results.albums?.data || results.albums || [];
      const playlistsData = results.playlists?.data || results.playlists || [];
      const recentPostsData = results.recentPosts?.data || results.recentPosts || [];
      const recentReactionsData = results.recentReactions?.data || results.recentReactions || [];
      const recentConnectionsData = results.recentConnections?.data || results.recentConnections || [];
      const totalTipsReceived = results.tips?.data ?? results.tips ?? 0;
      const creatorRevenue = results.creatorRevenue?.data ?? results.creatorRevenue ?? null;
      const ratingData = results.ratingSummary?.data ?? results.ratingSummary ?? null;
      const createdEventsCountResult = results.createdEventsCount?.data ?? results.createdEventsCount ?? 0;
      const bookedEventsCountResult = results.bookedEventsCount?.data ?? results.bookedEventsCount ?? 0;

      // Use creator revenue for total earnings (same as WalletScreen)
      // Falls back to tips if creator revenue not available
      const totalEarnings = creatorRevenue?.total_earned ?? totalTipsReceived ?? 0;

      console.log('💰 ProfileScreen Earnings Data:', {
        totalTipsReceived,
        creatorRevenueTotal: creatorRevenue?.total_earned,
        totalEarningsCalculated: totalEarnings,
        pendingBalance: creatorRevenue?.pending_balance,
      });
      console.log('📊 Profile counts - Followers:', followersCount, 'Following:', followingCount, 'Tracks:', tracksCount);

      let profileObj: UserProfile | null = null;
      const normalizedAlbums = Array.isArray(albumsData) ? albumsData : [];
      const normalizedPlaylists = Array.isArray(playlistsData) ? playlistsData : [];
      let cacheTracks: UserTrack[] = [];
      let cacheStats: UserStats = {
        total_plays: 0,
        total_likes: 0,
        total_tips_received: totalTipsReceived,
        total_earnings: totalEarnings,
        monthly_plays: 0,
        monthly_earnings: creatorRevenue?.this_month_earnings ?? 0,
      };

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
          early_adopter: profileData.early_adopter || false,
          rating_avg: profileData.rating_avg ?? null,
          rating_count: profileData.rating_count ?? null,
          created_at: profileData.created_at,
        };
        setProfile(profileObj);

        // Fetch follower avatars for the identity card (fire-and-forget, non-blocking)
        if (profileData.is_creator) {
          supabase
            .from('follows')
            .select('follower:profiles!follower_id(avatar_url)')
            .eq('following_id', user.id)
            .limit(8)
            .then(({ data }) => {
              if (data) {
                setFollowerAvatars(
                  (data as any[])
                    .map((r) => r.follower?.avatar_url)
                    .filter(Boolean)
                );
              }
            });
        }
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

      if (normalizedAlbums.length > 0) {
        console.log('✅ User albums loaded:', normalizedAlbums.length);
        setUserAlbums(normalizedAlbums);
      } else {
        console.log('ℹ️ No user albums found');
        setUserAlbums([]);
      }

      if (normalizedPlaylists.length > 0) {
        console.log('✅ User playlists loaded:', normalizedPlaylists.length);
        setUserPlaylists(normalizedPlaylists);
      } else {
        console.log('ℹ️ No user playlists found');
        setUserPlaylists([]);
      }

      const activityItems: Array<RecentActivity & { created_at: string }> = [];

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
        cacheTracks = transformedTracks;

        transformedTracks.slice(0, 5).forEach((track) => {
          if (track.created_at) {
            activityItems.push({
              id: `upload-${track.id}`,
              type: 'upload',
              message: `Uploaded "${track.title}"`,
              time: getRelativeTime(track.created_at),
              icon: 'cloud-upload',
              color: '#2196F3',
              created_at: track.created_at,
            });
          }
        });
        
        // Calculate stats
        const totalPlays = transformedTracks.reduce((sum, track) => sum + (track.play_count || 0), 0);
        const totalLikes = transformedTracks.reduce((sum, track) => sum + (track.likes_count || 0), 0);

        cacheStats = {
          total_plays: totalPlays,
          total_likes: totalLikes,
          total_tips_received: totalTipsReceived,
          total_earnings: totalEarnings, // Use creator revenue total_earned (includes tips + other earnings)
          monthly_plays: Math.floor(totalPlays * 0.3),
          monthly_earnings: creatorRevenue?.this_month_earnings ?? 0,
        };
        console.log('📊 Setting ProfileScreen stats:', {
          tips: totalTipsReceived,
          earnings: totalEarnings,
          statsObject: cacheStats
        });
        setStats(cacheStats);
        setRatingSummary({
          average: profileData?.rating_avg ?? ratingData?.average ?? 0,
          count: profileData?.rating_count ?? ratingData?.count ?? 0,
        });
      } else {
        console.log('ℹ️ No user tracks found');
        setUserTracks([]);
        console.log('📊 Setting ProfileScreen stats (no tracks):', {
          tips: totalTipsReceived,
          earnings: totalEarnings,
          statsObject: cacheStats
        });
        setStats(cacheStats);
        setRatingSummary({
          average: profileData?.rating_avg ?? ratingData?.average ?? 0,
          count: profileData?.rating_count ?? ratingData?.count ?? 0,
        });
      }

      setCreatedEventsCount(typeof createdEventsCountResult === 'number' ? createdEventsCountResult : 0);
      setBookedEventsCount(typeof bookedEventsCountResult === 'number' ? bookedEventsCountResult : 0);

      let connectionsMap = new Map<string, any>();
      if (recentConnectionsData.length > 0) {
        const connectionIds = Array.from(new Set(recentConnectionsData.map((c: any) => c.following_id).filter(Boolean)));
        if (connectionIds.length > 0) {
          const { data: connections } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url, professional_headline')
            .in('id', connectionIds);

          connections?.forEach((connection) => {
            connectionsMap.set(connection.id, connection);
          });
        }

        const previewConnections = recentConnectionsData
          .map((connection: any) => {
            const profile = connectionsMap.get(connection.following_id);
            return {
              id: connection.following_id,
              user_id: user.id,
              connected_user_id: connection.following_id,
              connected_at: connection.created_at,
              user: {
                id: connection.following_id,
                username: profile?.username || 'unknown',
                display_name: profile?.display_name || profile?.username || 'SoundBridge User',
                avatar_url: profile?.avatar_url || undefined,
                headline: profile?.professional_headline || undefined,
              },
            } as Connection;
          })
          .filter(Boolean);

        setConnectionsPreview(previewConnections);
      } else {
        setConnectionsPreview([]);
      }

      if (recentPostsData.length > 0) {
        recentPostsData.forEach((post: any) => {
          const postType = post.post_type || 'update';
          let message = 'Shared a new update';
          let icon = 'chatbubble';
          let color = '#6366F1';

          if (postType === 'opportunity') {
            message = 'Shared a new opportunity';
            icon = 'briefcase';
            color = '#F59E0B';
          } else if (postType === 'achievement') {
            message = 'Shared a new achievement';
            icon = 'trophy';
            color = '#10B981';
          } else if (postType === 'collaboration') {
            message = 'Shared a collaboration post';
            icon = 'people';
            color = '#3B82F6';
          } else if (postType === 'event') {
            message = 'Shared a new event';
            icon = 'calendar';
            color = '#8B5CF6';
          }

          if (post.created_at) {
            activityItems.push({
              id: `post-${post.id}`,
              type: postType,
              message,
              time: getRelativeTime(post.created_at),
              icon,
              color,
              created_at: post.created_at,
            });
          }
        });
      }

      if (recentReactionsData.length > 0) {
        const reactionPostIds = Array.from(new Set(recentReactionsData.map((r: any) => r.post_id).filter(Boolean)));
        let postsMap = new Map<string, any>();
        let authorsMap = new Map<string, any>();

        if (reactionPostIds.length > 0) {
          const { data: reactionPosts } = await supabase
            .from('posts')
            .select('id, user_id')
            .in('id', reactionPostIds);

          reactionPosts?.forEach((post) => {
            postsMap.set(post.id, post);
          });

          const authorIds = Array.from(new Set((reactionPosts || []).map((post) => post.user_id).filter(Boolean)));
          if (authorIds.length > 0) {
            const { data: authors } = await supabase
              .from('profiles')
              .select('id, display_name, username')
              .in('id', authorIds);

            authors?.forEach((author) => {
              authorsMap.set(author.id, author);
            });
          }
        }

        recentReactionsData.forEach((reaction: any) => {
          const post = postsMap.get(reaction.post_id);
          const author = post ? authorsMap.get(post.user_id) : null;
          const authorName = author?.display_name || author?.username || 'a creator';
          const reactionType = reaction.reaction_type || 'reaction';
          const icon = reactionType === 'love' ? 'heart' : reactionType === 'fire' ? 'flame' : reactionType === 'congrats' ? 'trophy' : 'thumbs-up';
          const color = reactionType === 'love' ? '#DC2626' : reactionType === 'fire' ? '#F97316' : reactionType === 'congrats' ? '#10B981' : '#3B82F6';

          if (reaction.created_at) {
            activityItems.push({
              id: `reaction-${reaction.post_id}-${reaction.created_at}`,
              type: 'reaction',
              message: `Reacted to ${authorName}'s post`,
              time: getRelativeTime(reaction.created_at),
              icon,
              color,
              created_at: reaction.created_at,
            });
          }
        });
      }

      if (recentConnectionsData.length > 0) {
        recentConnectionsData.forEach((connection: any) => {
          const profile = connectionsMap.get(connection.following_id);
          const name = profile?.display_name || profile?.username || 'a creator';

          if (connection.created_at) {
            activityItems.push({
              id: `connection-${connection.following_id}-${connection.created_at}`,
              type: 'connection',
              message: `Connected with ${name}`,
              time: getRelativeTime(connection.created_at),
              icon: 'people',
              color: '#8B5CF6',
              created_at: connection.created_at,
            });
          }
        });
      }

      if (activityItems.length > 0) {
        const sorted = activityItems
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(({ created_at, ...activity }) => activity);
        setRecentActivity(sorted);
      } else {
        setRecentActivity([]);
      }

      // Save to cache
      if (profileObj) {
        await contentCacheService.saveCache('PROFILE', cacheKey, {
          profile: profileObj,
          stats: cacheStats,
          tracks: cacheTracks,
          createdEventsCount: createdEventsCountResult,
          bookedEventsCount: bookedEventsCountResult,
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
      setRatingSummary({ average: 0, count: 0 });
      setCreatedEventsCount(0);
      setBookedEventsCount(0);

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

  // Load external portfolio links
  const loadExternalLinks = async () => {
    if (!user?.id) return;

    try {
      console.log('🔗 Loading external links...');
      const links = await externalLinksService.getExternalLinks(user.id);
      setExternalLinks(links);
      console.log(`✅ Loaded ${links.length} external links`);
    } catch (error) {
      console.error('❌ Error loading external links:', error);
      // Don't show alert - external links are optional
      setExternalLinks([]);
    }
  };

  // Fallback SP check: query the DB directly so the button reflects reality even
  // when the /api/users/:id/creator-types endpoint returns stale or empty data.
  const checkSpProfileExists = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('service_provider_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasSpProfile(!!data && !error);
    } catch {
      // Non-critical — fall through to creator_types check
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData(true); // Force refresh
    loadExternalLinks(); // Reload external links
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
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

          // Immediately update AuthContext userProfile for instant UI updates
          await updateUserProfile({ avatar_url: uploadResult.avatarUrl });

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
    navigation.navigate('ShareProfile' as never);
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

    // If a service provider profile already exists in the DB, go straight to the dashboard.
    // This handles the case where the web app created the profile but creator_types hasn't synced.
    if (hasSpProfile) {
      navigation.navigate('ServiceProviderDashboard' as never, { userId: user.id } as never);
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
      const result = await BiometricAuth.disableBiometricLogin();
      if (result.success) {
        setBiometricEnabled(false);
        Alert.alert('Success', `${biometricType} login disabled`);
      } else {
        Alert.alert('Error', result.error || 'Failed to disable biometric login');
      }
      return;
    }

    // Detect OAuth-only accounts (Google Sign-In, no password)
    const isOAuthUser = user?.app_metadata?.provider !== 'email' ||
      (user?.identities ?? []).every((id: any) => id.provider !== 'email');

    if (isOAuthUser) {
      // OAuth users don't have a password — just verify biometrics and store OAuth marker
      Alert.alert(
        `Enable ${biometricType} Login`,
        `Use ${biometricType} to quickly sign in. Your Google account session handles authentication.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const result = await BiometricAuth.enableBiometricLoginOAuth();
              if (result.success) {
                setBiometricEnabled(true);
                Alert.alert('Success', `${biometricType} login enabled!`);
              } else {
                Alert.alert('Error', result.error || 'Failed to enable biometric login');
              }
            },
          },
        ]
      );
    } else {
      // Email/password users — prompt for password to store in SecureStore
      Alert.alert(
        `Enable ${biometricType} Login`,
        'Please enter your password to enable biometric login',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => setShowBiometricPasswordPrompt(true),
          },
        ]
      );
    }
  };

  const handleBiometricPasswordConfirm = async (password: string) => {
    if (!password || !user?.email) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    setShowBiometricPasswordPrompt(false);
    const result = await BiometricAuth.enableBiometricLogin(user.email, password);
    if (result.success) {
      setBiometricEnabled(true);
      Alert.alert('Success', `${biometricType} login enabled!`);
    } else {
      Alert.alert('Error', result.error || 'Failed to enable biometric login');
    }
  };

  const handleOfflineDownloads = () => {
    navigation.navigate('OfflineDownloads' as never);
  };

  // Support & About handlers
  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport' as never);
  };

  const handleTermsOfService = () => {
    navigation.navigate('TermsOfService' as never);
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy' as never);
  };

  const handleAbout = () => {
    navigation.navigate('About' as never);
  };

  const handleRestartTour = async () => {
    Alert.alert(
      'Restart App Tour',
      'This will restart the app tour from the beginning. The tour will start when you navigate to the Feed screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: async () => {
            await resetTour();
            Alert.alert(
              'Tour Reset!',
              'Navigate to the Feed screen to start the tour again.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
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
    navigation.navigate('TaxInformation' as never);
  };

  const handleRecentActivity = () => {
    navigation.navigate('RecentActivity' as never, {
      activities: recentActivity,
    } as never);
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
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginLeft: 0 }]}>
          <Ionicons name="play-circle" size={18} color={theme.colors.primary} style={{ marginBottom: 6 }} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(stats?.total_plays || 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Plays</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="heart" size={18} color="#EC4899" style={{ marginBottom: 6 }} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(stats?.total_likes || 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Likes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginRight: 0 }]}>
          <Ionicons name="cash" size={18} color="#10B981" style={{ marginBottom: 6 }} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>${(stats?.total_tips_received || 0).toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tips</Text>
        </View>
      </View>

      {/* Ratings Summary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Ratings</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.groupedRow}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
              <Ionicons name="star" size={18} color="#FBBF24" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>
              {ratingSummary?.average ? ratingSummary.average.toFixed(1) : 'No ratings yet'}
            </Text>
            {!!ratingSummary?.count && (
              <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
                {ratingSummary.count} reviews
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Connections Preview */}
      <ConnectionsPreview
        connections={connectionsPreview}
        totalCount={profile?.following_count || 0}
      />

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Recent Activity</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.groupedRow} onPress={handleRecentActivity}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Ionicons name="time" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>View Recent Activity</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{recentActivity.length}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Quick Actions</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleUploadTrack}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Upload New Track</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {/* Step 5: Create Events - Targeted Audience */}
          <WalkthroughableTouchable
            order={5}
            name="create_events_targeted"
            text="Create events and sell tickets directly to YOUR followers. Your events appear in their feeds FIRST - targeted audience, not random. Keep 95% of ticket sales (97% for Unlimited). Build your network through live events."
          >
            <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleCreateEvent}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <Ionicons name="calendar" size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Create Event</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </WalkthroughableTouchable>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleManageAvailability}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="time" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Manage Availability</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleCreatePlaylist}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="musical-notes" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Create Playlist</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.groupedRow} onPress={() => navigation.navigate('SavedPosts' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="bookmark" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Saved Posts</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* My Content */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>My Content</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate('TracksList' as never, { userId: profile?.id } as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="musical-notes" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Tracks</Text>
              <Text style={[{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }]}>Tap any track to set or edit pricing</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate('AllAlbums' as never, { title: 'My Albums', userId: profile?.id } as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="albums" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Albums</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => navigation.navigate('AllPlaylists' as never, { title: 'My Playlists', userId: profile?.id } as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="list" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Playlists</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* My Events */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>My Events</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate('AllEvents' as never, { mode: 'created', title: 'Created Events', userId: profile?.id } as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
              <Ionicons name="calendar" size={18} color="#8B5CF6" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Created Events</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{createdEventsCount}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => navigation.navigate('AllEvents' as never, { mode: 'booked', title: 'Booked Events', userId: profile?.id } as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="ticket" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Booked Events</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{bookedEventsCount}</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEarningsTab = () => (
    <View style={styles.tabContent}>
      {/* Earnings Overview */}
      <View style={[styles.earningsOverview, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.15)', width: 48, height: 48, borderRadius: 14, marginBottom: 12 }]}>
          <Ionicons name="trending-up" size={24} color="#10B981" />
        </View>
        <Text style={[styles.earningsTotal, { color: theme.colors.text }]}>${stats?.total_earnings?.toFixed(2) || '0.00'}</Text>
        <Text style={[styles.earningsLabel, { color: theme.colors.textSecondary }]}>Total Earnings</Text>
        <Text style={[styles.earningsMonthly, { color: theme.colors.textSecondary }]}>
          ${stats?.monthly_earnings?.toFixed(2) || '0.00'} this month
        </Text>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.section}>
        <View style={styles.earningsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Earnings Breakdown</Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Upgrade' as never)}
          >
            <Ionicons name="rocket" size={16} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="heart" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Tips Received</Text>
            <Text style={[styles.rowValue, { color: theme.colors.text }]}>${(stats?.total_tips_received || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.groupedRow}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="people" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Collaborations</Text>
            <Text style={[styles.rowValue, { color: theme.colors.text }]}>$0.00</Text>
          </View>
        </View>
      </View>

      {/* Content & Purchases */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Content & Purchases</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate('PurchasedContent' as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="musical-notes" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Purchased Content</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate('CreatorSalesAnalytics' as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
              <Ionicons name="bar-chart" size={18} color="#8B5CF6" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Sales Dashboard</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => navigation.navigate('TicketWallet' as never)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="ticket" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Tickets</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Payout Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Payout Settings</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          {/* Step 4: Digital Wallet - Get Paid */}
          <WalkthroughableTouchable
            order={4}
            name="wallet_setup"
            text="Set up your digital wallet HERE to receive tips and event ticket payments. Withdraw earnings anytime (minimum £20 for Premium, £10 for Unlimited). This is how money reaches YOU and funds your professional growth."
          >
            <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleWallet}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <Ionicons name="wallet" size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Digital Wallet</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </WalkthroughableTouchable>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handlePaymentMethods}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="card" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Payment Methods</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handlePayoutSchedule}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="calendar" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Payout Schedule</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.groupedRow} onPress={handleTaxInfo}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="document-text" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Tax Information</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      {/* Professional Profile */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Professional Profile</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('ExperienceManagement' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="briefcase-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Experience</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('SkillsManagement' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="star-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Skills</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('InstrumentsManagement' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="musical-notes-outline" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Instruments</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {/* Step 6: Analytics - Track Your Growth */}
          <WalkthroughableTouchable
            order={6}
            name="analytics_insights"
            text="See who's engaging with your drops, where your audience is, top-performing content, and earnings over time. Use this data to grow your network strategically and book more paid work."
          >
            <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('AnalyticsDashboard' as never)}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name="bar-chart-outline" size={18} color="#10B981" />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Analytics</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </WalkthroughableTouchable>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('CreatorInsightsDashboard' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
              <Ionicons name="stats-chart-outline" size={18} color="#8B5CF6" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Creator Insights</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('CreatorEarningsDashboard' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="cash-outline" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Earnings Dashboard</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {(user?.subscription_tier === 'premium' || user?.subscription_tier === 'unlimited') && (
            <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('CreatorSalesAnalytics' as never)}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
                <Ionicons name="trending-up" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Sales Analytics</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.groupedRow} onPress={() => navigation.navigate('BrandingCustomization' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(236,72,153,0.12)' }]}>
              <Ionicons name="color-palette-outline" size={18} color="#EC4899" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Branding</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Portfolio Links */}
      {session && user?.id && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Portfolio</Text>
          <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity style={styles.groupedRow} onPress={() => navigation.navigate('ExternalLinks' as never)}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <Ionicons name="link" size={18} color="#6366F1" />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>External Links</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Account */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Account</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleEditProfile}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="person" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handlePrivacySecurity}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => (navigation as any).navigate('TwoFactorSettings')}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(78,205,196,0.12)' }]}>
              <Ionicons name="lock-closed" size={18} color="#4ECDC4" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Two-Factor Authentication</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleChangePassword}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="key" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {biometricAvailable && (
            <View style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
              <View style={[styles.rowIconWrap, { backgroundColor: biometricEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.12)' }]}>
                <Ionicons
                  name={Platform.OS === 'ios' ? 'finger-print' : 'fingerprint'}
                  size={18}
                  color={biometricEnabled ? '#10B981' : theme.colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{biometricType} Login</Text>
                <Text style={[styles.rowValue, { color: theme.colors.textSecondary, fontSize: 12 }]}>Quick login with biometrics</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: theme.colors.border, true: '#10B981' + '40' }}
                thumbColor={biometricEnabled ? '#10B981' : theme.colors.textSecondary}
              />
            </View>
          )}
          <TouchableOpacity style={styles.groupedRow} onPress={handleOfflineDownloads}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="download" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Offline Downloads</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Creator Tools */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Creator Tools</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('AICareerAdvisor' as never)}>
            <LinearGradient
              colors={['#ef4444', '#a855f7', '#60a5fa']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.rowIconWrap, { borderRadius: 8 }]}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>AI Career Advisor</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleManageAvailability}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Collaboration Availability</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('ProviderAvailability' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="flash-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Urgent Gig Availability</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('CollaborationRequests' as never)}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="people-outline" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Collaboration Requests</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {(userProfile?.creator_types?.includes('service_provider') || hasSpProfile) ? (
            <TouchableOpacity style={styles.groupedRow} onPress={() => navigation.navigate('ServiceProviderDashboard' as never, { userId: user?.id } as never)}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <Ionicons name="briefcase" size={18} color={theme.colors.accentPurple} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Service Provider Dashboard</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.groupedRow} onPress={handleBecomeServiceProvider}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <Ionicons name="briefcase-outline" size={18} color={theme.colors.accentPurple} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Become a Service Provider</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>App Settings</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="notifications" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text, flex: 1 }]}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
              thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleNotificationSettings}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="options-outline" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {/* Step 7: Settings - Wallet, Privacy, Themes */}
          <WalkthroughableTouchable
            order={7}
            name="profile_settings_control"
            text="Control everything: Manage privacy (who sees your drops), customize theme colors, notification preferences, and wallet settings. Your platform, your rules, your professional brand."
          >
            <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => navigation.navigate('ThemeSettings' as never)}>
              <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <Ionicons name="moon" size={18} color="#8B5CF6" />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Theme Settings</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </WalkthroughableTouchable>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={() => (navigation as any).navigate('AudioEnhancementExpo')}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="musical-notes" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Audio Enhancement</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.groupedRow}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="play-circle" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text, flex: 1 }]}>Auto-play</Text>
            <Switch
              value={autoPlay}
              onValueChange={toggleAutoPlay}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
              thumbColor={autoPlay ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Venues */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Venues</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => (navigation as any).navigate('MyVenues')}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(5,150,105,0.12)' }]}>
              <Ionicons name="business-outline" size={18} color="#059669" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>My Venues</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={() => (navigation as any).navigate('ListVenue')}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(5,150,105,0.12)' }]}>
              <Ionicons name="add-circle-outline" size={18} color="#059669" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>List a Venue</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => setShowVenuePrefsModal(true)}
          >
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(37,99,235,0.12)' }]}>
              <Ionicons name="options-outline" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Venue Preferences</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* TEST BUTTON - Temporary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Testing</Text>
        <View style={[styles.groupedCard, { backgroundColor: 'rgba(124,58,237,0.08)' }]}>
          <TouchableOpacity style={styles.groupedRow} onPress={() => (navigation as any).navigate('OnboardingTest')}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(124,58,237,0.18)' }]}>
              <Ionicons name="flask" size={18} color="#7C3AED" />
            </View>
            <Text style={[styles.rowLabel, { color: '#7C3AED' }]}>Test Onboarding Flow</Text>
            <Ionicons name="chevron-forward" size={15} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Support & About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Support & About</Text>
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleRestartTour}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="footsteps" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Restart App Tour</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleHelpSupport}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Ionicons name="help-circle" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handleTermsOfService}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(107,114,128,0.12)' }]}>
              <Ionicons name="document-text" size={18} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.groupedRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]} onPress={handlePrivacyPolicy}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(107,114,128,0.12)' }]}>
              <Ionicons name="shield" size={18} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.groupedRow} onPress={handleAbout}>
            <View style={[styles.rowIconWrap, { backgroundColor: 'rgba(220,38,38,0.12)' }]}>
              <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>About SoundBridge</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
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
          <View style={styles.headerRow}>
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
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => profile?.is_creator ? setShowShareCardModal(true) : setShowQRModal(true)}
                  >
                    <Ionicons
                      name={profile?.is_creator ? 'card-outline' : 'qr-code-outline'}
                      size={24}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerButton} onPress={handleShareProfile}>
                    <ShareDiagonalIcon size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Manage your profile
          </Text>
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
                colors={[branding.primary_color || '#DC2626', branding.accent_color || '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileBannerImage}
              />
            )}
            {/* Custom logo — glassmorphic pill container */}
            {branding.custom_logo_url ? (
              <View
                style={[
                  styles.profileBrandingLogoContainer,
                  branding.custom_logo_position === 'top-right' && { right: 12, left: undefined },
                  branding.custom_logo_position === 'bottom-left' && { bottom: 80, top: undefined },
                  branding.custom_logo_position === 'bottom-right' && { bottom: 80, right: 12, top: undefined, left: undefined },
                ]}
              >
                <Image
                  source={{ uri: branding.custom_logo_url }}
                  style={styles.profileBrandingLogoImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
            
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
                      {profile?.is_verified && <VerifiedBadge size={16} />}
                      {profile?.early_adopter && (
                        <View style={styles.earlyAdopterBadge}>
                          <Ionicons name="rocket" size={10} color="#FFFFFF" />
                          <Text style={styles.earlyAdopterBadgeText}>Early</Text>
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
                    {/* External Portfolio Links */}
                    {!isEditing && externalLinks.length > 0 && (
                      <ExternalLinksDisplay links={externalLinks} showClickCounts={false} />
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
                {branding.show_powered_by === true && (
                  <View style={styles.poweredByBadge}>
                    <Text style={styles.poweredByBadgeText}>♪ SoundBridge</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Tabs - Scroll up with content */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.tabsInner, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && [styles.activeTab, { backgroundColor: theme.colors.primary }]]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'overview' ? '#fff' : theme.colors.textSecondary }, activeTab === 'overview' && styles.activeTabText]}>
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'earnings' && [styles.activeTab, { backgroundColor: theme.colors.primary }]]}
              onPress={() => setActiveTab('earnings')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'earnings' ? '#fff' : theme.colors.textSecondary }, activeTab === 'earnings' && styles.activeTabText]}>
                Earnings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'settings' && [styles.activeTab, { backgroundColor: theme.colors.primary }]]}
              onPress={() => setActiveTab('settings')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'settings' ? '#fff' : theme.colors.textSecondary }, activeTab === 'settings' && styles.activeTabText]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
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
      <PromptModal
        visible={showBiometricPasswordPrompt}
        title="Enter Password"
        message={`Please enter your current password to enable ${biometricType} login.`}
        placeholder="Password"
        secureTextEntry
        confirmLabel="Enable"
        onCancel={() => setShowBiometricPasswordPrompt(false)}
        onConfirm={handleBiometricPasswordConfirm}
      />

      {user?.id && (
        <VenuePreferencesModal
          visible={showVenuePrefsModal}
          userId={user.id}
          onClose={() => setShowVenuePrefsModal(false)}
        />
      )}

      {profile && (
        <QRCodeModal
          visible={showQRModal}
          onClose={() => setShowQRModal(false)}
          creatorUsername={profile.username}
          creatorName={profile.display_name}
          avatarUrl={profile.avatar_url}
        />
      )}

      {profile?.is_creator && (
        <>
          <CreatorNudgeModal
            visible={showNudgeModal}
            username={profile.username}
            onShareLink={handleShareLink}
            onShareCard={handleNudgeShareCard}
            onMaybeLater={() => {
              setShowNudgeModal(false);
              setNudgeDismissedThisSession(true);
            }}
          />
          <ShareMyCardModal
            visible={showShareCardModal}
            onClose={() => setShowShareCardModal(false)}
            creatorName={profile.display_name}
            username={profile.username}
            avatarUrl={profile.avatar_url}
            genres={profile.genres}
            followerAvatars={followerAvatars}
            onShared={() => handleMarkFanLinkShared('card')}
          />
        </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    // color applied dynamically in JSX
    ...Typography.body,
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.headerLarge,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    ...Typography.label,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for mini player
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
  profileBrandingLogoContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  profileBrandingLogoImage: {
    width: 88,
    height: 32,
  },
  poweredByBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  poweredByBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  earlyAdopterBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginLeft: 6,
  },
  earlyAdopterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  displayNameOverlay: {
    ...Typography.headerLarge,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  usernameOverlay: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headlineOverlay: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bioOverlay: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
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
    ...Typography.headerMedium,
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statLabelOverlay: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  joinDateOverlay: {
    ...Typography.label,
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
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bioInputOverlay: {
    height: 80,
    textAlignVertical: 'top',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabsInner: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 11,
  },
  activeTab: {
    // backgroundColor applied dynamically
  },
  tabText: {
    ...Typography.label,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '700',
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
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    // backgroundColor applied dynamically in JSX
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  statNumber: {
    ...Typography.headerMedium,
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupedCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 15,
    flex: 1,
  },
  rowValue: {
    ...Typography.label,
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  activityText: {
    flex: 1,
    // color applied dynamically in JSX
    ...Typography.body,
    marginLeft: 12,
  },
  activityTime: {
    // color applied dynamically in JSX
    ...Typography.label,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityMetaText: {
    ...Typography.label,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  actionText: {
    // color applied dynamically in JSX
    ...Typography.body,
    marginLeft: 12,
    flex: 1,
  },
  earningsOverview: {
    // backgroundColor applied dynamically in JSX
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  earningsTotal: {
    ...Typography.headerLarge,
    color: '#4CAF50',
    marginBottom: 8,
  },
  earningsLabel: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  earningsMonthly: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  earningsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  earningsItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  earningsItemTitle: {
    // color applied dynamically in JSX
    ...Typography.label,
    marginBottom: 2,
  },
  earningsItemAmount: {
    // color applied dynamically in JSX
    ...Typography.body,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingLeft: 18,
    paddingRight: 18,
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
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
    ...Typography.body,
    marginLeft: 12,
    flex: 1,
  },
  settingSubtext: {
    ...Typography.label,
    marginLeft: 12,
    marginTop: 2,
  },
  signOutButton: {
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  signOutText: {
    // color applied dynamically in JSX
    ...Typography.button,
  },
  // Test button styles
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginBottom: 12,
    borderStyle: 'dashed',
  },
  testButtonText: {
    flex: 1,
    ...Typography.button,
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
    ...Typography.body,
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
    ...Typography.body,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    ...Typography.label,
    textAlign: 'center',
  },
  // Track-related styles (matching web app)
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    // backgroundColor applied dynamically in JSX
    borderRadius: 999,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  rowEnd: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
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
    ...Typography.body,
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStatText: {
    color: '#666',
    ...Typography.label,
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
    ...Typography.button,
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
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
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
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});