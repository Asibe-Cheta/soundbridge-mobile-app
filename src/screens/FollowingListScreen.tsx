import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { profileService } from '../services/ProfileService';

interface Following {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

export default function FollowingListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  // Get userId from route params or use current user
  const userId = (route.params as any)?.userId || user?.id;
  const isOwnProfile = userId === user?.id;

  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUnfollows, setProcessingUnfollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFollowing();
  }, [userId]);

  const loadFollowing = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('📋 Loading following for user:', userId);

      // Try API endpoint first, fallback to Supabase if it fails
      let transformedFollowing: Following[] = [];

      try {
        const result = await profileService.getFollowing(userId, session || undefined);
        if (result.success && result.following) {
          console.log('✅ Loaded following from API:', result.following.length);
          // Transform API response to screen format
          transformedFollowing = result.following.map(following => ({
            id: following.id,
            user_id: following.id,
            display_name: following.display_name || 'Unknown User',
            username: following.username || 'unknown',
            avatar_url: following.avatar_url || null,
            bio: following.bio || null,
            is_verified: following.is_verified || false,
          }));
        }
      } catch (apiError) {
        console.warn('⚠️ API endpoint failed, falling back to Supabase:', apiError);

        // Fallback to Supabase
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          following_id,
          created_at,
          following:profiles!follows_following_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
              bio
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;

      // Transform data
        transformedFollowing = (followsData || [])
        .filter(f => f.following) // Filter out any null profiles
        .map(f => ({
          id: f.following_id,
          user_id: f.following.id,
          display_name: f.following.display_name || 'Unknown User',
          username: f.following.username || 'unknown',
          avatar_url: f.following.avatar_url,
          bio: f.following.bio,
            is_verified: false, // is_verified doesn't exist in DB
        }));
      }

      setFollowing(transformedFollowing);
    } catch (error) {
      console.error('❌ Error loading following:', error);
      Alert.alert('Error', 'Failed to load following list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowing();
  };

  const handleUnfollow = async (followingId: string) => {
    if (!user?.id || !session) {
      Alert.alert('Error', 'You must be logged in to unfollow users');
      return;
    }

    // Only allow unfollowing if it's the current user's profile
    if (!isOwnProfile) return;

    // Prevent multiple simultaneous unfollow operations
    if (processingUnfollows.has(followingId)) return;

    Alert.alert(
      'Unfollow User',
      'Are you sure you want to unfollow this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingUnfollows(prev => new Set(prev).add(followingId));

              const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', followingId);

              if (error) throw error;

              // Remove from local state
              setFollowing(prev => prev.filter(f => f.user_id !== followingId));

              console.log('✅ Unfollowed user:', followingId);
            } catch (error) {
              console.error('❌ Error unfollowing user:', error);
              Alert.alert('Error', 'Failed to unfollow user');
            } finally {
              setProcessingUnfollows(prev => {
                const newSet = new Set(prev);
                newSet.delete(followingId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const handleUserPress = (userId: string) => {
    navigation.navigate('UserProfile' as never, { userId } as never);
  };

  const renderFollowing = ({ item }: { item: Following }) => {
    const isProcessing = processingUnfollows.has(item.user_id);

    return (
      <TouchableOpacity
        style={[styles.followingItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleUserPress(item.user_id)}
      >
        <View style={styles.followingInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
            </View>
          )}

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: theme.colors.text }]} numberOfLines={1}>
                {item.display_name}
              </Text>
              {item.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
              )}
            </View>
            <Text style={[styles.username, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{item.username}
            </Text>
            {item.bio && (
              <Text style={[styles.bio, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.bio}
              </Text>
            )}
          </View>
        </View>

        {isOwnProfile && (
          <TouchableOpacity
            style={[
              styles.unfollowButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              isProcessing && { opacity: 0.6 },
            ]}
            onPress={() => handleUnfollow(item.user_id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Text style={[styles.unfollowButtonText, { color: theme.colors.text }]}>
                Following
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isOwnProfile ? 'Following' : 'Following'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Following List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading following...
          </Text>
        </View>
      ) : following.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Not Following Anyone
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {isOwnProfile
              ? 'Discover creators and start following them to see their content'
              : 'This user is not following anyone yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={item => item.user_id}
          renderItem={renderFollowing}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  followingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    lineHeight: 16,
  },
  unfollowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
