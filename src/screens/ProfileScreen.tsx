import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
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
}

export default function ProfileScreen() {
  const { user, signOut, updatePassword, refreshUser } = useAuth();
  const { autoPlay, toggleAutoPlay } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'earnings'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      console.log('🔧 Loading profile data for user:', user.id);
      
      // Load real profile data
      const { success, data, error } = await db.getProfile(user.id);
      
      if (success && data) {
        console.log('✅ Profile loaded:', data.username);
        setProfile({
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
          banner_url: data.banner_url,
          followers_count: data.followers_count || 0,
          following_count: data.following_count || 0,
          tracks_count: data.tracks_count || 0,
          is_creator: data.is_creator || false,
          is_verified: data.is_verified || false,
          created_at: data.created_at,
        });
      } else {
        console.error('Failed to load profile:', error);
        // Fallback to basic user data
        setProfile({
          id: user.id,
          username: user.email?.split('@')[0] || 'user123',
          display_name: user.email?.split('@')[0] || 'SoundBridge User',
          bio: null,
          avatar_url: null,
          banner_url: null,
          followers_count: 0,
          following_count: 0,
          tracks_count: 0,
          is_creator: false,
          is_verified: false,
          created_at: new Date().toISOString(),
        });
      }

      // Load user tracks
      const { success: tracksSuccess, data: tracksData } = await db.getUserTracks(user.id, 10);
      if (tracksSuccess && tracksData) {
        console.log('✅ User tracks loaded:', tracksData.length);
        setUserTracks(tracksData);
        
        // Generate recent activity based on user tracks
        const activities: RecentActivity[] = [];
        
        tracksData.forEach((track, index) => {
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
        
        // Add upload activity for recent tracks
        if (tracksData.length > 0) {
          activities.push({
            id: `upload-${tracksData[0].id}`,
            type: 'upload',
            message: `Uploaded "${tracksData[0].title}"`,
            time: '3d ago',
            icon: 'cloud-upload',
            color: '#2196F3'
          });
        }
        
        setRecentActivity(activities.slice(0, 5)); // Show max 5 activities
        
        // Calculate real stats from user tracks
        const totalPlays = tracksData.reduce((sum, track) => sum + (track.play_count || 0), 0);
        const totalLikes = tracksData.reduce((sum, track) => sum + (track.likes_count || 0), 0);
        
        const estimatedEarnings = totalPlays * 0.001; // $0.001 per play
        const realStats: UserStats = {
          total_plays: totalPlays,
          total_likes: totalLikes,
          total_tips_received: 0, // TODO: Implement tips system
          total_earnings: estimatedEarnings,
          monthly_plays: Math.floor(totalPlays * 0.3), // Estimate 30% as monthly
          monthly_earnings: Math.floor(estimatedEarnings * 0.3),
        };
        
        setStats(realStats);
      } else {
        console.log('ℹ️ No user tracks found');
        setUserTracks([]);
        setRecentActivity([]);
        
        // Default stats when no tracks
        const defaultStats: UserStats = {
          total_plays: 0,
          total_likes: 0,
          total_tips_received: 0,
          total_earnings: 0,
          monthly_plays: 0,
          monthly_earnings: 0,
        };
        
        setStats(defaultStats);
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setEditingProfile({
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      username: profile?.username || '',
    });
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !editingProfile) return;
    
    try {
      console.log('🔧 Saving profile changes...');
      const { success, error } = await db.updateProfile(user.id, editingProfile);
      
      if (success) {
        console.log('✅ Profile updated successfully');
        // Update local state
        setProfile(prev => prev ? { ...prev, ...editingProfile } : null);
        // Refresh user data across the app
        await refreshUser();
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        console.error('Failed to update profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
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

        // Upload to Supabase
        const uploadResult = await db.uploadImage(user.id, file, 'avatars');
        
        if (!uploadResult.success) {
          Alert.alert('Upload Failed', 'Failed to upload profile picture');
          return;
        }

        // Update profile with new avatar URL
        const updateResult = await db.updateProfileAvatar(user.id, uploadResult.data!.url);
        
        if (updateResult.success && updateResult.data) {
          setProfile(updateResult.data);
          // Refresh user data across the app
          await refreshUser();
          Alert.alert('Success', 'Profile picture updated successfully');
        } else {
          Alert.alert('Error', 'Failed to update profile picture');
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
    Alert.alert('Create Event', 'Event creation will be available soon!');
  };

  const handleCreatePlaylist = () => {
    Alert.alert('Create Playlist', 'Playlist creation will be available soon!');
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
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: 300 }} // Extra space for mini player
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#DC2626"
          colors={['#DC2626']}
        />
      }
    >
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatNumber(stats?.total_plays || 0)}</Text>
          <Text style={styles.statLabel}>Total Plays</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatNumber(stats?.total_likes || 0)}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatNumber(stats?.total_tips_received || 0)}</Text>
          <Text style={styles.statLabel}>Tips</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <Ionicons name={activity.icon as any} size={20} color={activity.color} />
              <Text style={styles.activityText}>{activity.message}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No recent activity</Text>
            <Text style={styles.emptyStateSubtext}>Start uploading tracks to see your activity here!</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleUploadTrack}>
          <Ionicons name="add-circle" size={24} color="#DC2626" />
          <Text style={styles.actionText}>Upload New Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateEvent}>
          <Ionicons name="calendar" size={24} color="#DC2626" />
          <Text style={styles.actionText}>Create Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreatePlaylist}>
          <Ionicons name="musical-notes" size={24} color="#DC2626" />
          <Text style={styles.actionText}>Create Playlist</Text>
        </TouchableOpacity>
      </View>

      {/* My Tracks (matching web app) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Tracks</Text>
        {userTracks.length > 0 ? (
          userTracks.slice(0, 5).map((track) => (
            <View key={track.id} style={styles.trackItem}>
              <View style={styles.trackImageContainer}>
                {track.artwork_url ? (
                  <Image source={{ uri: track.artwork_url }} style={styles.trackImage} />
                ) : (
                  <View style={[styles.trackImage, styles.trackImagePlaceholder]}>
                    <Ionicons name="musical-notes" size={20} color="#666" />
                  </View>
                )}
              </View>
              
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <View style={styles.trackStats}>
                  <Ionicons name="play" size={12} color="#666" />
                  <Text style={styles.trackStatText}>{formatNumber(track.play_count || 0)}</Text>
                  <Ionicons name="heart" size={12} color="#666" style={{ marginLeft: 8 }} />
                  <Text style={styles.trackStatText}>{formatNumber(track.likes_count || 0)}</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.trackMenu}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tracks yet</Text>
            <Text style={styles.emptyStateSubtext}>Upload your first track to get started!</Text>
          </View>
        )}
        
        {userTracks.length > 5 && (
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Tracks</Text>
            <Ionicons name="arrow-forward" size={16} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderEarningsTab = () => (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={{ paddingBottom: 300 }} // Extra space for mini player
      showsVerticalScrollIndicator={false}
    >
      {/* Earnings Overview */}
      <View style={styles.earningsOverview}>
        <Text style={styles.earningsTotal}>${stats?.total_earnings?.toFixed(2) || '0.00'}</Text>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
        <Text style={styles.earningsMonthly}>
          ${stats?.monthly_earnings?.toFixed(2) || '0.00'} this month
        </Text>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.section}>
        <View style={styles.earningsHeader}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Upgrade' as never)}
          >
            <Ionicons name="rocket" size={16} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.earningsItem}>
          <Ionicons name="heart" size={20} color="#DC2626" />
          <View style={styles.earningsItemContent}>
            <Text style={styles.earningsItemTitle}>Tips Received</Text>
            <Text style={styles.earningsItemAmount}>${stats?.total_tips_received || 0}</Text>
          </View>
        </View>
        <View style={styles.earningsItem}>
          <Ionicons name="play" size={20} color="#4CAF50" />
          <View style={styles.earningsItemContent}>
            <Text style={styles.earningsItemTitle}>Play Rewards</Text>
            <Text style={styles.earningsItemAmount}>${((stats?.total_plays || 0) * 0.001).toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.earningsItem}>
          <Ionicons name="people" size={20} color="#FF9800" />
          <View style={styles.earningsItemContent}>
            <Text style={styles.earningsItemTitle}>Collaborations</Text>
            <Text style={styles.earningsItemAmount}>$0.00</Text>
          </View>
        </View>
      </View>

      {/* Payout Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payout Settings</Text>
        <TouchableOpacity style={styles.settingButton} onPress={handlePaymentMethods}>
          <Ionicons name="card" size={20} color="#666" />
          <Text style={styles.settingText}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handlePayoutSchedule}>
          <Ionicons name="calendar" size={20} color="#666" />
          <Text style={styles.settingText}>Payout Schedule</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handleTaxInfo}>
          <Ionicons name="document-text" size={20} color="#666" />
          <Text style={styles.settingText}>Tax Information</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView 
      style={styles.tabContent} 
      contentContainerStyle={{ paddingBottom: 300 }} // Extra space for mini player
      showsVerticalScrollIndicator={false}
    >
      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.settingButton} onPress={handleEditProfile}>
          <Ionicons name="person" size={20} color="#666" />
          <Text style={styles.settingText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handlePrivacySecurity}>
          <Ionicons name="shield-checkmark" size={20} color="#666" />
          <Text style={styles.settingText}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handleChangePassword}>
          <Ionicons name="key" size={20} color="#666" />
          <Text style={styles.settingText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color="#666" />
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: '#DC2626' }}
            thumbColor={notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
        <TouchableOpacity style={styles.settingButton} onPress={() => navigation.navigate('ThemeSettings' as never)}>
          <Ionicons name="moon" size={20} color="#666" />
          <Text style={styles.settingText}>Theme Settings</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="play-circle" size={20} color="#666" />
            <Text style={styles.settingText}>Auto-play</Text>
          </View>
          <Switch
            value={autoPlay}
            onValueChange={toggleAutoPlay}
            trackColor={{ false: '#767577', true: '#DC2626' }}
            thumbColor={autoPlay ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Support & About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support & About</Text>
        <TouchableOpacity style={styles.settingButton} onPress={handleHelpSupport}>
          <Ionicons name="help-circle" size={20} color="#666" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handleTermsOfService}>
          <Ionicons name="document-text" size={20} color="#666" />
          <Text style={styles.settingText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handlePrivacyPolicy}>
          <Ionicons name="shield" size={20} color="#666" />
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingButton} onPress={handleAbout}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.settingText}>About SoundBridge</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerButtons}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleSaveProfile}>
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleEditProfile}>
                <Ionicons name="create" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleShareProfile}>
                <Ionicons name="share" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileBanner}
        >
          <View style={styles.profileContent}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleChangeAvatar} disabled={avatarUploading}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Ionicons name="person" size={40} color="#666" />
                </View>
              )}
              
              {avatarUploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
              
              <View style={styles.avatarEditButton}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
              
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={editingProfile.display_name}
                    onChangeText={(text) => setEditingProfile(prev => ({ ...prev, display_name: text }))}
                    placeholder="Display Name"
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={[styles.editInput, styles.bioInput]}
                    value={editingProfile.bio}
                    onChangeText={(text) => setEditingProfile(prev => ({ ...prev, bio: text }))}
                    placeholder="Bio"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.displayName}>{profile?.display_name}</Text>
                  <Text style={styles.username}>@{profile?.username}</Text>
                  {profile?.bio && (
                    <Text style={styles.bio}>{profile.bio}</Text>
                  )}
                </>
              )}
              <Text style={styles.joinDate}>
                Joined {formatDate(profile?.created_at || new Date().toISOString())}
              </Text>
            </View>

            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile?.followers_count}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile?.following_count}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile?.tracks_count}</Text>
                <Text style={styles.statLabel}>Tracks</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earnings' && styles.activeTab]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.activeTabText]}>
            Earnings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButton: {
    padding: 8,
  },
  profileHeader: {
    marginBottom: 16,
  },
  profileBanner: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  profileContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  joinDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  activityText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  activityTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  earningsOverview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  earningsItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  earningsItemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 2,
  },
  earningsItemAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  signOutButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
});