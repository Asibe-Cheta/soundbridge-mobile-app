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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
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
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'earnings'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile>>({});

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
    Alert.alert('Privacy & Security', 'Privacy settings will be available soon!');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Please use the Forgot Password option on the login screen for now.');
  };

  const handleNotificationSettings = () => {
    Alert.alert('Notifications', 'Notification settings updated locally. Full sync will be available soon!');
  };

  // Support & About handlers
  const handleHelpSupport = () => {
    Alert.alert('Help & Support', 'Visit soundbridge.com/support for help, or email support@soundbridge.com');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'Visit soundbridge.com/terms to read our Terms of Service');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Visit soundbridge.com/privacy to read our Privacy Policy');
  };

  const handleAbout = () => {
    Alert.alert('About SoundBridge', 'SoundBridge v1.0.0\nThe social platform for music creators and listeners.\n\nBuilt with ❤️ by the SoundBridge team.');
  };

  // Payout Settings handlers
  const handlePaymentMethods = () => {
    Alert.alert('Payment Methods', 'Connect your bank account or PayPal for payouts. Feature coming soon!');
  };

  const handlePayoutSchedule = () => {
    Alert.alert('Payout Schedule', 'Set up automatic weekly or monthly payouts. Feature coming soon!');
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
    </ScrollView>
  );

  const renderEarningsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon" size={20} color="#666" />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#767577', true: '#DC2626' }}
            thumbColor={darkModeEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="play-circle" size={20} color="#666" />
            <Text style={styles.settingText}>Auto-play</Text>
          </View>
          <Switch
            value={autoPlayEnabled}
            onValueChange={setAutoPlayEnabled}
            trackColor={{ false: '#767577', true: '#DC2626' }}
            thumbColor={autoPlayEnabled ? '#FFFFFF' : '#f4f3f4'}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
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
            <View style={styles.avatarContainer}>
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
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </View>
            
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
});