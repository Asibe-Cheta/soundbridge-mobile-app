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

interface Follower {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_following_back: boolean;
}

export default function FollowersListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, session } = useAuth();
  const { theme } = useTheme();

  // Get userId from route params or use current user
  const userId = (route.params as any)?.userId || user?.id;
  const isOwnProfile = userId === user?.id;

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingFollows, setProcessingFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFollowers();
  }, [userId]);

  const loadFollowers = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('📋 Loading followers for user:', userId);

      // Get all followers with their profile info
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          created_at,
          follower:profiles!follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            is_verified
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;

      console.log('✅ Loaded followers:', followsData?.length || 0);

      // Get current user's following list to check if they follow back
      let followingIds: string[] = [];
      if (user?.id) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        followingIds = followingData?.map(f => f.following_id) || [];
      }

      // Transform data
      const transformedFollowers: Follower[] = (followsData || [])
        .filter(f => f.follower) // Filter out any null profiles
        .map(f => ({
          id: f.follower_id,
          user_id: f.follower.id,
          display_name: f.follower.display_name || 'Unknown User',
          username: f.follower.username || 'unknown',
          avatar_url: f.follower.avatar_url,
          bio: f.follower.bio,
          is_verified: f.follower.is_verified || false,
          is_following_back: followingIds.includes(f.follower.id),
        }));

      setFollowers(transformedFollowers);
    } catch (error) {
      console.error('❌ Error loading followers:', error);
      Alert.alert('Error', 'Failed to load followers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFollowers();
  };

  const handleFollowToggle = async (followerId: string, isCurrentlyFollowing: boolean) => {
    if (!user?.id || !session) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }

    // Prevent multiple simultaneous follow/unfollow operations
    if (processingFollows.has(followerId)) return;

    try {
      setProcessingFollows(prev => new Set(prev).add(followerId));

      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', followerId);

        if (error) throw error;

        // Update local state
        setFollowers(prev =>
          prev.map(f =>
            f.user_id === followerId ? { ...f, is_following_back: false } : f
          )
        );
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: followerId,
          });

        if (error) throw error;

        // Update local state
        setFollowers(prev =>
          prev.map(f =>
            f.user_id === followerId ? { ...f, is_following_back: true } : f
          )
        );
      }
    } catch (error) {
      console.error('❌ Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setProcessingFollows(prev => {
        const newSet = new Set(prev);
        newSet.delete(followerId);
        return newSet;
      });
    }
  };

  const handleUserPress = (userId: string) => {
    navigation.navigate('UserProfile' as never, { userId } as never);
  };

  const renderFollower = ({ item }: { item: Follower }) => {
    const isProcessing = processingFollows.has(item.user_id);
    const isOwnUser = item.user_id === user?.id;

    return (
      <TouchableOpacity
        style={[styles.followerItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleUserPress(item.user_id)}
      >
        <View style={styles.followerInfo}>
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

        {!isOwnUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              item.is_following_back
                ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                : { backgroundColor: theme.colors.primary },
              isProcessing && { opacity: 0.6 },
            ]}
            onPress={() => handleFollowToggle(item.user_id, item.is_following_back)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={item.is_following_back ? theme.colors.text : '#FFFFFF'} />
            ) : (
              <Text
                style={[
                  styles.followButtonText,
                  item.is_following_back
                    ? { color: theme.colors.text }
                    : { color: '#FFFFFF' },
                ]}
              >
                {item.is_following_back ? 'Following' : 'Follow'}
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
          {isOwnProfile ? 'My Followers' : 'Followers'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Followers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading followers...
          </Text>
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Followers Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {isOwnProfile
              ? 'When people follow you, they\'ll appear here'
              : 'This user has no followers yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={item => item.user_id}
          renderItem={renderFollower}
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
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  followerInfo: {
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
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
