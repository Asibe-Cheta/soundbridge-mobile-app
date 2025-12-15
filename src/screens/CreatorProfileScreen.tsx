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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useCollaboration } from '../contexts/CollaborationContext';
import TipModal from '../components/TipModal';
import CollaborationRequestForm from '../components/CollaborationRequestForm';
import { collaborationUtils } from '../utils/collaborationUtils';
import type { BookingStatus, CreatorAvailability } from '../types/collaboration';
import FirstTimeTooltip from '../components/FirstTimeTooltip';
import BackButton from '../components/BackButton';
import { Modal, Switch } from 'react-native';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  genre?: string;
  followers_count?: number;     // COMPUTED from follows table
  tracks_count?: number;        // COMPUTED from audio_tracks table
  events_count?: number;        // COMPUTED from events table
  total_tips_received?: number; // COMPUTED from creator_tips table
  total_tip_count?: number;     // COMPUTED from creator_tips table
  tips_this_month_amount?: number;
  tips_this_month_count?: number;
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
  const { user } = useAuth();
  const { play, addToQueue } = useAudioPlayer();
  const { getBookingStatus } = useCollaboration();

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
          created_at
        `)
        .eq('id', creatorId)
        .single();

      if (profileError) throw profileError;

      // Get computed stats with better error handling - matching ProfileScreen approach
      const [followersResult, followingResult, tracksResult, eventsResult, tipsResult] = await Promise.all([
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
        
        // Get tip statistics (may not exist yet)
        supabase
          .from('creator_tips')
          .select('amount, created_at')
          .eq('creator_id', creatorId)
          .eq('status', 'completed')
          .then(result => result)
          .catch(error => {
            console.log('ℹ️ Tips table may not exist yet:', error.message);
            return { data: [], error: null };
          })
      ]);

      // Extract counts from the results (matching ProfileScreen approach)
      const followersCount = followersResult.count ?? 0;
      const followingCount = followingResult.count ?? 0;
      const tracksCount = tracksResult.count ?? 0;
      const eventsCount = eventsResult.count ?? 0;

      console.log('📊 Creator stats - Followers:', followersCount, 'Following:', followingCount, 'Tracks:', tracksCount, 'Events:', eventsCount);

      // Calculate tip statistics
      const tipAmounts = tipsResult.data || [];
      const totalTipsReceived = tipAmounts.reduce((sum, tip) => sum + (tip.amount || 0), 0);
      const totalTipCount = tipAmounts.length;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const tipsThisMonth = tipAmounts.filter(tip => tip.created_at && new Date(tip.created_at) >= startOfMonth);
      const tipsThisMonthAmount = tipsThisMonth.reduce((sum, tip) => sum + (tip.amount || 0), 0);
      const tipsThisMonthCount = tipsThisMonth.length;

      const creatorWithStats = {
        ...profileData,
        followers_count: followersCount,
        following_count: followingCount,
        tracks_count: tracksCount,
        events_count: eventsCount,
        total_tips_received: totalTipsReceived,
        total_tip_count: totalTipCount,
        tips_this_month_amount: tipsThisMonthAmount,
        tips_this_month_count: tipsThisMonthCount,
      };

      setCreator(creatorWithStats);
      console.log('✅ Creator profile loaded:', creatorWithStats.display_name);
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

      const response = await fetch(`https://www.soundbridge.live/api/user/follow/${creatorId}/notifications`, {
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

      await fetch(`https://www.soundbridge.live/api/user/follow/${creatorId}`, {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadCreatorProfile(), 
      loadCreatorTracks(), 
      checkFollowStatus(),
      loadBookingStatus(),
      loadCreatorAvailability()
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
            {creator.avatar_url ? (
              <Image source={{ uri: creator.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
              </View>
            )}

            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: theme.colors.text }]}>{creator.display_name}</Text>
              </View>
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
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                ${formatNumber(creator.total_tips_received || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Tips ({creator.total_tip_count || 0})
              </Text>
            </View>
          </View>

        <View style={[styles.tipsSummaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="gift-outline" size={18} color={theme.colors.primary} style={styles.tipsSummaryIcon} />
          <View style={styles.tipsSummaryContent}>
            <Text style={[styles.tipsSummaryTitle, { color: theme.colors.text }]}>
              💰 Received {creator.tips_this_month_count || 0} tips this month
            </Text>
            {typeof creator.tips_this_month_amount === 'number' && creator.tips_this_month_amount > 0 ? (
              <Text style={[styles.tipsSummarySubtitle, { color: theme.colors.textSecondary }]}>
                Total {formatCurrency(creator.tips_this_month_amount)}
              </Text>
            ) : null}
          </View>
        </View>
        </View>

        {/* Tracks Section */}
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
      </ScrollView>

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
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '600',
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
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  username: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  followButton: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 100,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
    minWidth: 80,
  },
  tipButtonText: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
  nextSlotText: {
    fontSize: 12,
    marginLeft: 24,
  },
  statusActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  availabilitySection: {
    marginBottom: 16,
  },
  availabilityTitle: {
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 12,
    marginBottom: 6,
  },
  slotNotes: {
    fontSize: 11,
    lineHeight: 14,
  },
  collabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
    minWidth: 120,
  },
  collabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bio: {
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
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsSummarySubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  tracksSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStatText: {
    fontSize: 12,
    marginLeft: 4,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackDuration: {
    fontSize: 12,
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
    fontSize: 16,
    marginTop: 16,
  },
  // Notification preferences modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notifPrefSubtitle: {
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
    fontSize: 16,
    fontWeight: '600',
  },
});