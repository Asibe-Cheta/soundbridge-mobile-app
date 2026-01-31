import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from '../components/VerifiedBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { config } from '../config/environment';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import TipModal from '../components/TipModal';
import CollaborationRequestForm from '../components/CollaborationRequestForm';
import { collaborationUtils } from '../utils/collaborationUtils';
import type { BookingStatus, CreatorAvailability } from '../types/collaboration';
import FirstTimeTooltip from '../components/FirstTimeTooltip';
import BackButton from '../components/BackButton';
import { Modal, Switch } from 'react-native';
import PostCard from '../components/PostCard';
import { feedService } from '../services/api/feedService';
import type { Post } from '../types/feed.types';
import { useServiceProviderPrompt } from '../hooks/useServiceProviderPrompt';
import ServiceProviderPromptModal from '../components/ServiceProviderPromptModal';
import { payoutService } from '../services/PayoutService';
import { ExternalLinksDisplay } from '../components/ExternalLinks/ExternalLinksDisplay';
import { externalLinksService } from '../services/ExternalLinksService';
import type { ExternalLink } from '../types/external-links';
import { SystemTypography as Typography } from '../constants/Typography';
import { ratingsService, type RatingSummary } from '../services/RatingsService';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  genre?: string;
  professional_headline?: string;
  subscription_tier?: 'free' | 'premium' | 'unlimited' | null;
  role?: 'user' | 'creator' | 'admin';  // User role - tips only allowed for 'creator'
  followers_count?: number;     // COMPUTED from follows table
  tracks_count?: number;        // COMPUTED from audio_tracks table
  events_count?: number;        // COMPUTED from events table
  total_tips_received?: number; // COMPUTED from creator_tips table
  total_tip_count?: number;     // COMPUTED from creator_tips table
  total_earnings?: number;      // COMPUTED from creator_revenue table
  tips_this_month_amount?: number;
  tips_this_month_count?: number;
  is_verified?: boolean;
  created_at: string;
  isFollowing?: boolean;
}

interface Track {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  play_count?: number;        // Correct field name from schema
  likes_count?: number;       // Correct field name from schema
  file_url?: string;          // Correct field name from schema
  cover_art_url?: string;     // Correct field name from schema
  genre?: string;
  created_at: string;
}

export default function CreatorProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user, session } = useAuth();
  const { play, addToQueue } = useAudioPlayer();
  const { getBookingStatus } = useCollaboration();

  // Service Provider Prompt Modal
  const {
    shouldShow: showServiceProviderPrompt,
    handleSetupProfile,
    handleRemindLater,
    handleDontShowAgain,
    triggerAfterViewingServiceProvider,
  } = useServiceProviderPrompt();

  // Debug route params
  console.log('🔍 Route params:', route.params);
  
  const params = route.params as { creatorId?: string; creator?: Creator } || {};
  const { creatorId, creator: initialCreator } = params;
  
  console.log('🔍 Extracted creatorId:', creatorId);
  console.log('🔍 Extracted initialCreator:', initialCreator);
  
  // Handle missing creatorId
  if (!creatorId) {
    console.error('❌ No creatorId provided in route params');
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={[styles.errorContainer, { justifyContent: 'center', alignItems: 'center' }]}> 
            <Text style={{ color: theme.colors.text }}>Error: Creator ID not provided</Text>
            <BackButton
              label="Go Back"
              style={{ marginTop: 16 }}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Return to previous screen"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const [creator, setCreator] = useState<Creator | null>(initialCreator || null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(!initialCreator);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [availability, setAvailability] = useState<CreatorAvailability[]>([]);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [selectedAvailabilitySlot, setSelectedAvailabilitySlot] = useState<CreatorAvailability | null>(null);
  const [showTipTooltip, setShowTipTooltip] = useState(false);
  const [showCollabTooltip, setShowCollabTooltip] = useState(false);
  
  // Notification preferences state
  const [showNotifPrefsModal, setShowNotifPrefsModal] = useState(false);
  const [notifyOnMusicUpload, setNotifyOnMusicUpload] = useState(false);
  const [notifyOnEventPost, setNotifyOnEventPost] = useState(true); // Default true for events
  const [notifyOnPodcastUpload, setNotifyOnPodcastUpload] = useState(false);
  const [notifyOnCollabAvailability, setNotifyOnCollabAvailability] = useState(false);
  const [showFullScreenAvatar, setShowFullScreenAvatar] = useState(false);

  // External links state
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);

  // Tab and posts state
  const [activeTab, setActiveTab] = useState<'drops' | 'tracks' | 'about'>('drops');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Ratings state
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const canRequestCollaboration = useMemo(() => {
    if (bookingStatus) {
      return collaborationUtils.isCreatorAvailable(bookingStatus);
    }
    return availability.length > 0;
  }, [bookingStatus, availability.length]);

  useEffect(() => {
    loadCreatorProfile();
    loadCreatorTracks();
    checkFollowStatus();
    loadBookingStatus();
    loadCreatorAvailability();
    loadUserPosts(1);
    loadExternalLinks();
  }, [creatorId]);

  useEffect(() => {
    if (!loading) {
      (async () => {
        try {
          const seen = await AsyncStorage.getItem('tooltip_tips_seen');
          if (!seen) {
            setShowTipTooltip(true);
          }
        } catch (error) {
          console.warn('CreatorProfileScreen: Failed to read tooltip_tips_seen', error);
          setShowTipTooltip(true);
        }
      })();
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && availability.length > 0 && !showTipTooltip) {
      (async () => {
        try {
          const seen = await AsyncStorage.getItem('tooltip_collaboration_seen');
          if (!seen) {
            setShowCollabTooltip(true);
          }
        } catch (error) {
          console.warn('CreatorProfileScreen: Failed to read tooltip_collaboration_seen', error);
          setShowCollabTooltip(true);
        }
      })();
    }
  }, [availability, loading, showTipTooltip]);

  // Trigger service provider prompt when viewing a service provider profile
  useEffect(() => {
    if (!loading && (!user || user.id === creatorId)) {
      // Don't trigger if viewing own profile or not logged in
      return;
    }

    // Check if this creator is a service provider (has availability or booking status)
    const isServiceProvider = availability.length > 0 || bookingStatus !== null;

    if (isServiceProvider) {
      // Trigger after short delay to let UI load
      const timer = setTimeout(() => {
        triggerAfterViewingServiceProvider();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loading, availability, bookingStatus, creatorId, user]);

  const markTooltipSeen = async (key: string) => {
    try {
      await AsyncStorage.setItem(key, 'true');
    } catch (error) {
      console.warn(`CreatorProfileScreen: Failed to persist ${key}`, error);
    }
  };

  const handleTipTooltipShow = async () => {
    await markTooltipSeen('tooltip_tips_seen');
    setShowTipTooltip(false);
    setShowTipModal(true);
  };

  const handleTipTooltipDismiss = async () => {
    await markTooltipSeen('tooltip_tips_seen');
    setShowTipTooltip(false);
  };

  const handleCollabTooltipDismiss = async () => {
    await markTooltipSeen('tooltip_collaboration_seen');
    setShowCollabTooltip(false);
  };

  const loadCreatorProfile = async () => {
    if (initialCreator) return; // Skip if we already have creator data

    try {
      console.log('🔧 Loading creator profile:', creatorId);
      
      // Get basic profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          professional_headline,
          subscription_tier,
          is_verified,
          rating_avg,
          rating_count,
          role,
          created_at
        `)
        .eq('id', creatorId)
        .single();

      if (profileError) throw profileError;

      // Get session for creator revenue fetch
      const { data: { session: freshSession } } = await supabase.auth.getSession();

      // Get computed stats with better error handling - matching ProfileScreen approach
      const [followersResult, followingResult, tracksResult, eventsResult, tipsResult, revenueResult] = await Promise.all([
        // Get followers count
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', creatorId),

        // Get following count
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', creatorId),

        // Get tracks count
        supabase
          .from('audio_tracks')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorId),

        // Get events count
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creatorId),

        // Get creator revenue stats (total_earned includes all tips)
        (async () => {
          try {
            console.log(`💰 Fetching creator revenue for: ${creatorId}`);
            const result = await supabase
              .from('creator_revenue')
              .select('total_earned, pending_balance, tips_received')
              .eq('creator_id', creatorId)
              .single();

            if (result.error && result.error.code !== 'PGRST116') {
              console.log(`ℹ️ Creator revenue error:`, result.error.message);
            }

            console.log(`💰 Creator revenue result:`, {
              found: !!result.data,
              total_earned: result.data?.total_earned || 0,
              pending_balance: result.data?.pending_balance || 0,
            });

            return result;
          } catch (error: any) {
            console.log('ℹ️ Creator revenue table may not exist yet:', error.message);
            return { data: null, error: null };
          }
        })(),

        // Get creator revenue (only when viewing own profile)
        (async () => {
          try {
            // Only fetch revenue for the logged-in user's own profile
            if (!freshSession || !user?.id || creatorId !== user.id) {
              console.log('ℹ️ Skipping revenue fetch - not viewing own profile');
              return { data: null, error: null };
            }
            const revenue = await payoutService.getCreatorRevenue(freshSession);
            console.log(`💰 Creator revenue for ${creatorId}: $${revenue?.total_earned?.toFixed(2) || '0.00'}`);
            return { data: revenue, error: null };
          } catch (error) {
            console.log('ℹ️ Creator revenue may not exist yet:', error);
            return { data: null, error: null };
          }
        })()
      ]);

      // Extract counts from the results (matching ProfileScreen approach)
      const followersCount = followersResult.count ?? 0;
      const followingCount = followingResult.count ?? 0;
      const tracksCount = tracksResult.count ?? 0;
      const eventsCount = eventsResult.count ?? 0;

      console.log('📊 Creator stats - Followers:', followersCount, 'Following:', followingCount, 'Tracks:', tracksCount, 'Events:', eventsCount);

      // Get creator revenue data (includes tips_received aggregated value)
      const creatorRevenueData = tipsResult.data;
      const totalTipsReceived = creatorRevenueData?.tips_received ?? 0;
      const totalEarnings = creatorRevenueData?.total_earned ?? 0;

      // Get API revenue for own profile (matching ProfileScreen approach)
      const creatorRevenue = revenueResult.data;

      console.log('💰 CreatorProfileScreen Earnings Data:', {
        totalTipsReceived,
        creatorRevenueTotal: creatorRevenue?.total_earned,
        totalEarningsCalculated: totalEarnings,
        pendingBalance: creatorRevenue?.pending_balance,
      });

      const creatorWithStats = {
        ...profileData,
        followers_count: followersCount,
        following_count: followingCount,
        tracks_count: tracksCount,
        events_count: eventsCount,
        total_tips_received: totalTipsReceived,
        total_earnings: totalEarnings,
      };

      setCreator(creatorWithStats);
      setRatingSummary({
        average: profileData?.rating_avg ?? 0,
        count: profileData?.rating_count ?? 0,
      });
      console.log('✅ Creator profile loaded:', creatorWithStats.display_name);
      console.log('🏷️ Professional headline:', creatorWithStats.professional_headline);
      console.log('💎 Subscription tier:', creatorWithStats.subscription_tier);
    } catch (error) {
      console.error('❌ Error loading creator profile:', error);
      Alert.alert('Error', 'Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  };

  const loadCreatorTracks = async () => {
    try {
      console.log('🔧 Loading creator tracks:', creatorId);

      const { data, error } = await supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          duration,
          play_count,
          likes_count,
          file_url,
          cover_art_url,
          genre,
          created_at
        `)
        .eq('creator_id', creatorId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTracks(data || []);
      console.log('✅ Creator tracks loaded:', data?.length || 0);
      console.log('🎵 Track details:', data?.map(t => ({ id: t.id, title: t.title, creator_id: creatorId })) || []);
    } catch (error) {
      console.error('❌ Error loading creator tracks:', error);
    }
  };

  const loadExternalLinks = async () => {
    try {
      console.log('🔗 Loading external links for creator:', creatorId);
      const links = await externalLinksService.getExternalLinks(creatorId);
      setExternalLinks(links);
      console.log('✅ External links loaded:', links.length);
    } catch (error) {
      console.error('❌ Error loading external links:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', creatorId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setIsFollowing(!!data);
    } catch (error) {
      console.error('❌ Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to follow creators');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId);

        if (error) throw error;

        setIsFollowing(false);
        setCreator(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
        
        // Also remove notification preferences
        await removeCreatorNotificationPreferences();
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: creatorId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsFollowing(true);
        setCreator(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
        
        // Show notification preferences modal
        setShowNotifPrefsModal(true);
      }
    } catch (error) {
      console.error('❌ Error following/unfollowing:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const saveCreatorNotificationPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Error', 'You must be logged in to save preferences');
        return;
      }

      const response = await fetch(`${config.apiUrl}/user/follow/${creatorId}/notifications`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifyOnMusicUpload,
          notifyOnEventPost,
          notifyOnPodcastUpload,
          notifyOnCollaborationAvailability: notifyOnCollabAvailability, // FIX: Use correct state variable name
        }),
      });

      if (response.ok) {
        console.log('✅ Notification preferences saved');
        setShowNotifPrefsModal(false);
        Alert.alert('Success', 'Your notification preferences have been saved!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save notification preferences:', errorData);
        Alert.alert('Error', errorData.error || 'Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving notification preferences:', error);
      Alert.alert('Error', 'An error occurred while saving preferences. Please try again.');
    }
  };

  const removeCreatorNotificationPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch(`${config.apiUrl}/user/follow/${creatorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('✅ Notification preferences removed');
    } catch (error) {
      console.error('❌ Error removing notification preferences:', error);
    }
  };

  const handleTrackPress = async (track: Track) => {
    try {
      console.log('🎵 Playing track:', track.title);
      await play({
        id: track.id,
        title: track.title,
        creator: { id: creatorId, username: creator?.username || '', display_name: creator?.display_name || '' },
        duration: track.duration,
        file_url: track.file_url,
        cover_image_url: track.cover_art_url,
        artwork_url: track.cover_art_url,
        plays_count: track.play_count,
        likes_count: track.likes_count,
        created_at: track.created_at,
      });

      // Add other tracks to queue
      const otherTracks = tracks.filter(t => t.id !== track.id);
      otherTracks.forEach(t => addToQueue({
        id: t.id,
        title: t.title,
        creator: { id: creatorId, username: creator?.username || '', display_name: creator?.display_name || '' },
        duration: t.duration,
        file_url: t.file_url,
        cover_image_url: t.cover_art_url,
        artwork_url: t.cover_art_url,
        plays_count: t.play_count,
        likes_count: t.likes_count,
        created_at: t.created_at,
      }));
    } catch (error) {
      console.error('❌ Error playing track:', error);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const handleTipSuccess = async (amountInCents: number, message?: string) => {
    // Convert cents to dollars for display
    const amountInDollars = amountInCents / 100;
    console.log('🎉 Tip sent successfully:', { amountInCents, amountInDollars, message });

    // Update creator stats locally (store in dollars, not cents)
    setCreator(prev => prev ? {
      ...prev,
      total_tips_received: (prev.total_tips_received || 0) + amountInDollars,
      total_tip_count: (prev.total_tip_count || 0) + 1,
      tips_this_month_amount: (prev.tips_this_month_amount || 0) + amountInDollars,
      tips_this_month_count: (prev.tips_this_month_count || 0) + 1,
    } : null);

    // Optionally refresh the profile to get updated data
    // await loadCreatorProfile();
  };

  const handleSubmitRating = async () => {
    if (!session) {
      Alert.alert('Login Required', 'Please log in to submit a rating.');
      return;
    }
    if (!selectedRating) {
      Alert.alert('Select a Rating', 'Please choose a star rating before submitting.');
      return;
    }

    try {
      setSubmittingRating(true);
      await ratingsService.submitRating(session, {
        ratedUserId: creatorId,
        rating: selectedRating,
        comment: ratingComment.trim() || undefined,
      });
      const updatedSummary = await ratingsService.getSummary(creatorId);
      setRatingSummary(updatedSummary);
      setShowRatingModal(false);
      setSelectedRating(0);
      setRatingComment('');
      Alert.alert('Thanks!', 'Your rating has been submitted.');
    } catch (error: any) {
      console.error('❌ Failed to submit rating:', error);
      const errorCode = error?.body?.code || error?.body?.error?.code;
      if (error?.status === 403 && errorCode === 'NOT_ELIGIBLE') {
        Alert.alert('Not Eligible Yet', 'Ratings unlock after a completed paid interaction.');
      } else {
        Alert.alert('Rating Failed', error?.message || 'Please try again.');
      }
    } finally {
      setSubmittingRating(false);
    }
  };

  const loadUserPosts = async (page: number = 1) => {
    if (!creatorId) return;

    try {
      setLoadingPosts(true);
      console.log(`📡 CreatorProfileScreen: Loading posts for creator ${creatorId}, page ${page}`);
      const { posts: newPosts, hasMore } = await feedService.getUserPosts(creatorId, page, 10);

      console.log(`✅ CreatorProfileScreen: Loaded ${newPosts.length} posts`);
      if (newPosts.length > 0) {
        newPosts.forEach((post, index) => {
          console.log(`📝 Post ${index + 1}:`, {
            id: post.id,
            content: post.content || '(empty)',
            contentLength: post.content?.length || 0,
            author: post.author.display_name,
            hasRepostedFrom: !!newPosts[0].reposted_from,
            reposted_from_id: post.reposted_from_id,
            reposted_from_content: post.reposted_from?.content?.substring(0, 30),
          });
        });
      }

      if (page === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMorePosts(hasMore);
      setPostsPage(page);
    } catch (error) {
      console.error('❌ Error loading user posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLoadMorePosts = () => {
    if (!loadingPosts && hasMorePosts) {
      loadUserPosts(postsPage + 1);
    }
  };

  const handleTipFromPost = (authorId: string, authorName: string) => {
    // If tipping the profile owner, use their info, otherwise use the post author
    setShowTipModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadCreatorProfile(),
      loadCreatorTracks(),
      checkFollowStatus(),
      loadBookingStatus(),
      loadCreatorAvailability(),
      loadUserPosts(1)
    ]);
    setRefreshing(false);
  };

  const loadBookingStatus = async () => {
    try {
      console.log('📊 Loading booking status for creator:', creatorId);
      const status = await getBookingStatus(creatorId);
      setBookingStatus(status);
      console.log('✅ Booking status loaded:', status);
    } catch (error) {
      console.error('❌ Error loading booking status:', error);
    }
  };

  const loadCreatorAvailability = async () => {
    try {
      console.log('📅 Loading creator availability:', creatorId);
      const { data, error } = await supabase
        .from('creator_availability')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_available', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) {
        console.log('⚠️ Error loading availability (table may not exist):', error.message);
        setAvailability([]);
        return;
      }

      setAvailability(data || []);
      console.log('✅ Creator availability loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error loading creator availability:', error);
      setAvailability([]);
    }
  };

  const handleCollaborationRequest = (availabilitySlot?: CreatorAvailability) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to send collaboration requests');
      return;
    }

    if (user.id === creatorId) {
      Alert.alert('Invalid Action', 'You cannot send a collaboration request to yourself');
      return;
    }

    setSelectedAvailabilitySlot(availabilitySlot || null);
    handleCollabTooltipDismiss();
    setShowCollabModal(true);
  };

  const formatNumber = (num?: number | null) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount || amount === 0) {
      return '£0.00';
    }
    const normalized = amount / 100;
    return `£${normalized.toFixed(2)}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.mainGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
          <View style={styles.errorContainer}> 
            <Ionicons name="person-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>Creator not found</Text>
            <BackButton
              label="Go Back"
              style={{ marginTop: 16 }}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Return to previous screen"
            />
          </View>
        </SafeAreaView>
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
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton style={styles.headerButton} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{creator.display_name}</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          {creator.banner_url && (
            <Image source={{ uri: creator.banner_url }} style={styles.bannerImage} />
          )}
          
        <View style={styles.profileInfo}>
            <TouchableOpacity 
              onPress={() => creator.avatar_url && setShowFullScreenAvatar(true)}
              activeOpacity={creator.avatar_url ? 0.8 : 1}
            >
              {creator.avatar_url ? (
                <Image source={{ uri: creator.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: theme.colors.text }]}>{creator.display_name}</Text>

                {creator.is_verified && <VerifiedBadge size={16} />}

                {/* Pro Badge (Premium tier) */}
                {creator.subscription_tier === 'premium' && (
                  <View style={styles.proBadge}>
                    <Ionicons name="diamond" size={12} color="#FFFFFF" />
                  </View>
                )}

                {/* Pro+ Badge (Unlimited tier) */}
                {creator.subscription_tier === 'unlimited' && (
                  <View style={styles.proPlusBadge}>
                    <Ionicons name="diamond" size={12} color="#FFFFFF" />
                    <Text style={styles.proPlusText}>+</Text>
                  </View>
                )}
              </View>

              {creator.professional_headline && (
                <Text style={[styles.professionalHeadline, { color: theme.colors.textSecondary }]}>
                  {creator.professional_headline}
                </Text>
              )}

              <Text style={[styles.username, { color: theme.colors.textSecondary }]}>@{creator.username}</Text>
          </View>
        </View>

          {creator.bio && (
            <Text style={[styles.bio, { color: theme.colors.text }]}>{creator.bio}</Text>
          )}

          {creator.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.location, { color: theme.colors.textSecondary }]}>{creator.location}</Text>
          </View>
          )}

          {creator.genre && (
            <View style={[styles.genreTag, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.genreText, { color: theme.colors.primary }]}>{creator.genre}</Text>
          </View>
          )}

          {/* External Links */}
          {externalLinks.length > 0 && (
            <View style={styles.portfolioSection}>
              <Text style={[styles.portfolioLabel, { color: theme.colors.textSecondary }]}>
                Portfolio
              </Text>
              <ExternalLinksDisplay links={externalLinks} />
            </View>
          )}

          {/* Collaboration Status */}
          {bookingStatus && (
            <TouchableOpacity
              style={[
                styles.collaborationStatus,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: canRequestCollaboration ? 1 : 0.75,
                },
              ]}
              onPress={() => canRequestCollaboration && handleCollaborationRequest()}
              activeOpacity={canRequestCollaboration ? 0.8 : 1}
            >
              <View style={styles.statusHeader}>
                <Ionicons
                  name="calendar"
                  size={16}
                  color={collaborationUtils.getBookingStatusColor(bookingStatus)}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: collaborationUtils.getBookingStatusColor(bookingStatus) },
                  ]}
                >
                  {collaborationUtils.getBookingStatusText(bookingStatus)}
                </Text>
              </View>
              {bookingStatus.next_available_slot && (
                <Text style={[styles.nextSlotText, { color: theme.colors.textSecondary }]}>
                  Next available: {collaborationUtils.formatDate(bookingStatus.next_available_slot)}
                </Text>
              )}
              <Text
                style={[
                  styles.statusActionText,
                  { color: canRequestCollaboration ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {canRequestCollaboration ? 'Tap to request collaboration' : 'Not accepting collaboration requests'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Available Time Slots */}
          {availability.length > 0 && (
            <View style={styles.availabilitySection}>
              <Text style={[styles.availabilityTitle, { color: theme.colors.text }]}>Available Time Slots</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.availabilityScroll}>
                {availability.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.availabilitySlot, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleCollaborationRequest(slot)}
                  >
                    <Text style={[styles.slotDate, { color: theme.colors.text }]}>
                      {collaborationUtils.formatDate(slot.start_date)}
                    </Text>
                    <Text style={[styles.slotTime, { color: theme.colors.textSecondary }]}>
                      {collaborationUtils.formatTime(slot.start_date)} - {collaborationUtils.formatTime(slot.end_date)}
                    </Text>
                    {slot.notes && (
                      <Text style={[styles.slotNotes, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                        {slot.notes}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
        </View>
          )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Follow Button - Only show if NOT viewing own profile */}
          {user?.id !== creatorId && (
            <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor: isFollowing ? theme.colors.surface : theme.colors.primary,
                    borderColor: theme.colors.primary,
                  }
                ]}
              onPress={handleFollow}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    { color: isFollowing ? theme.colors.primary : '#FFFFFF' }
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
          )}

            {/* Message Button - Show for all users except own profile */}
            {user?.id !== creatorId && (
              <TouchableOpacity
                style={[
                  styles.messageButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                  }
                ]}
                onPress={() => {
                  if (!user?.id) {
                    Alert.alert('Login Required', 'Please log in to send messages');
                    return;
                  }
                  // ChatScreen expects conversationId in format "userId1_userId2" (sorted alphabetically)
                  // and otherUser object with user details
                  const sortedIds = [user.id, creatorId].sort();
                  const conversationId = `${sortedIds[0]}_${sortedIds[1]}`;

                  navigation.navigate('Chat' as never, {
                    conversationId,
                    otherUser: {
                      id: creatorId,
                      username: creator?.username || 'user',
                      display_name: creator?.display_name || creator?.username || 'User',
                      avatar_url: creator?.avatar_url || null,
                      role: creator?.role || 'creator',
                    },
                  } as never);
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.messageButtonText,
                    { color: theme.colors.primary }
                  ]}
                >
                  Message
                </Text>
              </TouchableOpacity>
            )}

            {/* Rate Button */}
            {user?.id !== creatorId && (
              <TouchableOpacity
                style={[
                  styles.rateButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                  }
                ]}
                onPress={() => setShowRatingModal(true)}
              >
                <Ionicons name="star-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.rateButtonText, { color: theme.colors.primary }]}>Rate</Text>
              </TouchableOpacity>
            )}

            {/* Collaboration Button */}
            {user?.id !== creatorId && (
              <TouchableOpacity
                style={[
                  styles.collabButton,
                  {
                    backgroundColor: canRequestCollaboration ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.primary,
                    opacity: canRequestCollaboration ? 1 : 0.6,
                  }
                ]}
                onPress={() => handleCollaborationRequest()}
                disabled={!canRequestCollaboration}
          >
            <Ionicons
                  name="people"
                  size={16}
                  color={canRequestCollaboration ? '#FFFFFF' : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.collabButtonText,
                    { color: canRequestCollaboration ? '#FFFFFF' : theme.colors.primary }
                  ]}
                >
                  Collaborate
            </Text>
          </TouchableOpacity>
            )}

            {/* Tip Button - Only show on creator profiles (role === 'creator'), not your own profile */}
            {user?.id !== creatorId && creator?.role === 'creator' && (
              <TouchableOpacity
                style={[
                  styles.tipButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                  }
                ]}
                onPress={() => setShowTipModal(true)}
              >
                <Ionicons name="heart" size={16} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.tipButtonText,
                    { color: theme.colors.primary }
                  ]}
                >
                  Tip
                </Text>
              </TouchableOpacity>
            )}
        </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(creator.followers_count || 0)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(creator.tracks_count || 0)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tracks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{formatNumber(creator.events_count || 0)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Events</Text>
            </View>
          </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color={theme.colors.primary} />
          <Text style={[styles.ratingText, { color: theme.colors.text }]}>
            {ratingSummary?.average ? ratingSummary.average.toFixed(1) : 'No ratings yet'}
          </Text>
          <Text style={[styles.ratingCount, { color: theme.colors.textSecondary }]}>
            {ratingSummary?.count || 0}
          </Text>
        </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'drops' && styles.activeTab,
              activeTab === 'drops' && { borderBottomColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab('drops')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'drops' ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              Drops
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'tracks' && styles.activeTab,
              activeTab === 'tracks' && { borderBottomColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab('tracks')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'tracks' ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              Tracks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'about' && styles.activeTab,
              activeTab === 'about' && { borderBottomColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'about' ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Drops Tab - Posts */}
        {activeTab === 'drops' && (
          <View style={styles.tabContent}>
            {loadingPosts && posts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading posts...</Text>
              </View>
            ) : posts.length > 0 ? (
              <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onPress={() => {}}
                    onReactionPress={() => {}}
                    onCommentPress={() => {}}
                    onShare={() => {}}
                    onTip={handleTipFromPost}
                  />
                )}
                onEndReached={handleLoadMorePosts}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingPosts && posts.length > 0 ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={{ padding: 20 }} />
                  ) : null
                }
                scrollEnabled={false}
                nestedScrollEnabled
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  No posts yet
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tracks Tab */}
        {activeTab === 'tracks' && (
        <View style={styles.tracksSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tracks</Text>
          
          {tracks.length > 0 ? (
            tracks.map((track) => (
              <TouchableOpacity
                key={track.id}
                style={[styles.trackItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
                onPress={() => handleTrackPress(track)}
              >
                <View style={[styles.trackCover, { backgroundColor: theme.colors.card }]}>
                  {track.cover_art_url ? (
                    <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
                  ) : (
                    <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                  )}
                </View>

              <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {track.title}
                  </Text>
                <View style={styles.trackStats}>
                    <Ionicons name="play" size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                      {formatNumber(track.play_count || 0)}
                  </Text>
                    <Ionicons name="heart" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                    <Text style={[styles.trackStatText, { color: theme.colors.textSecondary }]}>
                      {formatNumber(track.likes_count || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.trackActions}>
                  <Text style={[styles.trackDuration, { color: theme.colors.textSecondary }]}>
                    {formatDuration(track.duration)}
                  </Text>
                <TouchableOpacity 
                    style={[styles.playButton, { backgroundColor: theme.colors.primary + '20' }]}
                    onPress={() => handleTrackPress(track)}
                  >
                    <Ionicons name="play" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyTracks}>
              <Ionicons name="musical-notes-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No tracks yet</Text>
            </View>
          )}
        </View>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <View style={styles.aboutSection}>
            {creator.bio && (
              <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.aboutTitle, { color: theme.colors.text }]}>Bio</Text>
                <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>{creator.bio}</Text>
              </View>
            )}

            <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.aboutTitle, { color: theme.colors.text }]}>Information</Text>
              {creator.location && (
                <View style={styles.aboutRow}>
                  <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>{creator.location}</Text>
                </View>
              )}
              {creator.genre && (
                <View style={styles.aboutRow}>
                  <Ionicons name="musical-note-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>{creator.genre}</Text>
                </View>
              )}
              <View style={styles.aboutRow}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>
                  Joined {new Date(creator.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} animationType="fade" transparent>
        <View style={styles.ratingOverlay}>
          <View style={[styles.ratingModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.ratingTitle, { color: theme.colors.text }]}>Rate this creator</Text>
            <Text style={[styles.ratingSubtitle, { color: theme.colors.textSecondary }]}>
              Share your experience to help others
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Ionicons
                    name={selectedRating >= star ? 'star' : 'star-outline'}
                    size={28}
                    color={selectedRating >= star ? theme.colors.primary : theme.colors.textSecondary}
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[
                styles.ratingInput,
                { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholder="Optional comment"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              value={ratingComment}
              onChangeText={setRatingComment}
            />

            <View style={styles.ratingActions}>
              <TouchableOpacity style={styles.ratingCancel} onPress={() => setShowRatingModal(false)}>
                <Text style={[styles.ratingCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratingSubmit,
                  { backgroundColor: selectedRating ? theme.colors.primary : theme.colors.primary + '60' },
                ]}
                onPress={handleSubmitRating}
                disabled={!selectedRating || submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.ratingSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tip Modal */}
      <TipModal
        visible={showTipModal}
        creatorId={creatorId}
        creatorName={creator?.display_name || 'Creator'}
        onClose={() => setShowTipModal(false)}
        onTipSuccess={handleTipSuccess}
      />

      <CollaborationRequestForm
        visible={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        creatorId={creatorId}
        creatorName={creator?.display_name || 'Creator'}
        availabilitySlot={selectedAvailabilitySlot || undefined}
      />

      <FirstTimeTooltip
        visible={showTipTooltip}
        title="Support artists directly"
        description="Tip artists directly. 100% goes to the creator."
        actions={[
          {
            label: 'Show me',
            onPress: handleTipTooltipShow,
            variant: 'primary',
          },
          {
            label: 'Maybe later',
            onPress: handleTipTooltipDismiss,
          },
        ]}
        style={{ alignSelf: 'stretch', marginHorizontal: 16 }}
      />

      <FirstTimeTooltip
        visible={showCollabTooltip}
        title="Collaborate without the guesswork"
        description="Connect with artists professionally. No more lost DMs — guaranteed visibility."
        actions={[
          {
            label: 'Got it',
            onPress: handleCollabTooltipDismiss,
            variant: 'primary',
          },
        ]}
        style={{ alignSelf: 'stretch', marginHorizontal: 16 }}
      />

      {/* Notification Preferences Modal */}
      <Modal
        visible={showNotifPrefsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifPrefsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Notification Preferences
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowNotifPrefsModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                Choose what notifications you'd like to receive from {creator?.display_name || 'this creator'}:
              </Text>

              <View style={[styles.notifPrefItem, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.notifPrefLeft}>
                  <Ionicons name="musical-notes" size={24} color="#4ECDC4" />
                  <View style={styles.notifPrefText}>
                    <Text style={[styles.notifPrefTitle, { color: theme.colors.text }]}>
                      Music Uploads
                    </Text>
                    <Text style={[styles.notifPrefSubtitle, { color: theme.colors.textSecondary }]}>
                      New tracks and albums
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyOnMusicUpload}
                  onValueChange={setNotifyOnMusicUpload}
                  trackColor={{ false: '#767577', true: '#4ECDC4' }}
                  thumbColor={notifyOnMusicUpload ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.notifPrefItem, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.notifPrefLeft}>
                  <Ionicons name="calendar" size={24} color="#FFD700" />
                  <View style={styles.notifPrefText}>
                    <Text style={[styles.notifPrefTitle, { color: theme.colors.text }]}>
                      Event Posts
                    </Text>
                    <Text style={[styles.notifPrefSubtitle, { color: theme.colors.textSecondary }]}>
                      New events and concerts (Recommended)
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyOnEventPost}
                  onValueChange={setNotifyOnEventPost}
                  trackColor={{ false: '#767577', true: '#4ECDC4' }}
                  thumbColor={notifyOnEventPost ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.notifPrefItem, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.notifPrefLeft}>
                  <Ionicons name="mic" size={24} color="#FF6B6B" />
                  <View style={styles.notifPrefText}>
                    <Text style={[styles.notifPrefTitle, { color: theme.colors.text }]}>
                      Podcast Uploads
                    </Text>
                    <Text style={[styles.notifPrefSubtitle, { color: theme.colors.textSecondary }]}>
                      New podcast episodes
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyOnPodcastUpload}
                  onValueChange={setNotifyOnPodcastUpload}
                  trackColor={{ false: '#767577', true: '#4ECDC4' }}
                  thumbColor={notifyOnPodcastUpload ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.notifPrefItem, { borderBottomWidth: 0 }]}>
                <View style={styles.notifPrefLeft}>
                  <Ionicons name="people" size={24} color="#9B59B6" />
                  <View style={styles.notifPrefText}>
                    <Text style={[styles.notifPrefTitle, { color: theme.colors.text }]}>
                      Collaboration Availability
                    </Text>
                    <Text style={[styles.notifPrefSubtitle, { color: theme.colors.textSecondary }]}>
                      When they open collaboration slots
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifyOnCollabAvailability}
                  onValueChange={setNotifyOnCollabAvailability}
                  trackColor={{ false: '#767577', true: '#4ECDC4' }}
                  thumbColor={notifyOnCollabAvailability ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.notifNote, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                <Text style={[styles.notifNoteText, { color: theme.colors.textSecondary }]}>
                  You can change these preferences anytime from your notification settings.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={saveCreatorNotificationPreferences}
              >
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Avatar Modal */}
      <Modal
        visible={showFullScreenAvatar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullScreenAvatar(false)}
      >
        <View style={styles.fullScreenAvatarContainer}>
          <TouchableOpacity
            style={styles.fullScreenAvatarOverlay}
            activeOpacity={1}
            onPress={() => setShowFullScreenAvatar(false)}
          >
            <View style={styles.fullScreenAvatarHeader}>
              <TouchableOpacity
                style={[styles.fullScreenAvatarCloseButton, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                onPress={() => setShowFullScreenAvatar(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.fullScreenAvatarContent}>
              {creator?.avatar_url && (
                <Image
                  source={{ uri: creator.avatar_url }}
                  style={styles.fullScreenAvatarImage}
                  resizeMode="contain"
                />
              )}
            </View>
            
            <View style={styles.fullScreenAvatarFooter}>
              <Text style={styles.fullScreenAvatarName}>{creator?.display_name}</Text>
              <Text style={styles.fullScreenAvatarUsername}>@{creator?.username}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Service Provider Prompt Modal */}
      <ServiceProviderPromptModal
        visible={showServiceProviderPrompt}
        onSetupProfile={handleSetupProfile}
        onRemindLater={handleRemindLater}
        onDontShowAgain={handleDontShowAgain}
      />

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
    ...Typography.body,
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  errorText: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  profileSection: {
    padding: 16,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  displayName: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  proBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proPlusBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  proPlusText: {
    color: '#FFFFFF',
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    marginTop: -1,
  },
  professionalHeadline: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  username: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  followButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 60,
  },
  tipButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  collaborationStatus: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  nextSlotText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 24,
  },
  statusActionText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  availabilitySection: {
    marginBottom: 16,
  },
  availabilityTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  availabilityScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  availabilitySlot: {
    width: 160,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  slotDate: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  slotTime: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  slotNotes: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 70,
  },
  messageButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: 70,
  },
  rateButtonText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  collabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    minWidth: 90,
  },
  collabButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  bio: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 4,
  },
  genreTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  genreText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  portfolioSection: {
    marginBottom: 16,
  },
  portfolioLabel: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    gap: 8,
  },
  ratingText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  ratingCount: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  tipsSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  tipsSummaryIcon: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  tipsSummaryContent: {
    flex: 1,
  },
  tipsSummaryTitle: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsSummarySubtitle: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  tracksSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    marginBottom: 8,
    borderRadius: 8,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStatText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 4,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackDuration: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTracks: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 16,
  },
  // Notification preferences modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  ratingModal: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  ratingTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  ratingSubtitle: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starIcon: {
    marginHorizontal: 4,
  },
  ratingInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  ratingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  ratingCancel: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ratingCancelText: {
    ...Typography.label,
  },
  ratingSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  ratingSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  notifPrefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  notifPrefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  notifPrefText: {
    marginLeft: 12,
    flex: 1,
  },
  notifPrefTitle: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  notifPrefSubtitle: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
  },
  notifNote: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  notifNoteText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    ...Typography.button,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  // Full-Screen Avatar Modal Styles
  fullScreenAvatarContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullScreenAvatarOverlay: {
    flex: 1,
  },
  fullScreenAvatarHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullScreenAvatarCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenAvatarContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullScreenAvatarImage: {
    width: '100%',
    height: '100%',
    maxWidth: 500,
    maxHeight: 500,
  },
  fullScreenAvatarFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullScreenAvatarName: {
    color: '#FFFFFF',
    ...Typography.headerMedium,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 4,
  },
  fullScreenAvatarUsername: {
    color: 'rgba(255, 255, 255, 0.7)',
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.label,
    marginTop: 12,
    fontSize: 14,
    lineHeight: 18,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...Typography.body,
    marginTop: 16,
    fontSize: 16,
    lineHeight: 22,
  },
  aboutSection: {
    padding: 16,
  },
  aboutCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  aboutTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  aboutText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
});