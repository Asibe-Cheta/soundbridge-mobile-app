import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, dbHelpers } from '../lib/supabase';
import BackButton from '../components/BackButton';
import TipModal from '../components/TipModal';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  genre?: string;
  role: string;
  created_at: string;
  isFollowing?: boolean;
}

type SortOption = 'recent' | 'alphabetical';
type FilterGenre = 'all' | 'hip-hop' | 'pop' | 'rock' | 'electronic' | 'jazz' | 'classical' | 'country' | 'r&b' | 'indie';

export default function AllCreatorsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedGenre, setSelectedGenre] = useState<FilterGenre>('all');
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipTarget, setTipTarget] = useState<Creator | null>(null);

  const sortOptions = [
    { key: 'recent', label: 'Most Recent' },
    { key: 'alphabetical', label: 'A-Z' },
  ];

  const genreOptions = [
    { key: 'all', label: 'All Genres' },
    { key: 'hip-hop', label: 'Hip-Hop' },
    { key: 'pop', label: 'Pop' },
    { key: 'rock', label: 'Rock' },
    { key: 'electronic', label: 'Electronic' },
    { key: 'jazz', label: 'Jazz' },
    { key: 'classical', label: 'Classical' },
    { key: 'country', label: 'Country' },
    { key: 'r&b', label: 'R&B' },
    { key: 'indie', label: 'Indie' },
  ];

  useEffect(() => {
    loadCreators(false);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [creators, searchQuery, sortBy, selectedGenre]);

  const loadCreators = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      console.log('🔄 Loading all creators from Supabase...');
      
      const { data, error } = await dbHelpers.getCreators(50);
      
      if (error) {
        console.error('❌ Error loading creators:', error);
        throw error;
      }
      
      console.log('✅ Creators loaded:', data?.length || 0);
      setCreators(data || []);
      
    } catch (error: any) {
      console.error('❌ Error loading creators:', error);
      setError(error.message || 'Failed to load creators');
      Alert.alert('Error', 'Failed to load creators. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...creators];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(creator =>
        creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (creator.bio && creator.bio.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(creator => 
        creator.genre && creator.genre.toLowerCase() === selectedGenre.toLowerCase()
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'alphabetical':
          return a.display_name.localeCompare(b.display_name);
        default:
          return 0;
      }
    });

    setFilteredCreators(filtered);
  };

  const handleCreatorPress = (creator: Creator) => {
    console.log('Navigate to creator profile:', creator.username);
    navigation.navigate('CreatorProfile' as never, { creatorId: creator.id, creator: creator } as never);
  };

  const handleFollowCreator = async (creator: Creator) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to follow creators');
      return;
    }

    try {
      console.log('🔄 Following creator:', creator.display_name);
      
      // Check if already following
      const { data: existingFollow, error: checkError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', creator.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingFollow) {
        // Unfollow
        const { error: unfollowError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creator.id);

        if (unfollowError) throw unfollowError;

        // Update local state
        setCreators(prev => prev.map(c => 
          c.id === creator.id 
            ? { ...c, isFollowing: false }
            : c
        ));

        console.log('✅ Unfollowed creator:', creator.display_name);
      } else {
        // Follow
        const { error: followError } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: creator.id,
            created_at: new Date().toISOString()
          });

        if (followError) throw followError;

        // Update local state
        setCreators(prev => prev.map(c => 
          c.id === creator.id 
            ? { ...c, isFollowing: true }
            : c
        ));

        console.log('✅ Followed creator:', creator.display_name);
      }
    } catch (error) {
      console.error('❌ Error following/unfollowing creator:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    }
  };

  const openTipModal = (creator: Creator) => {
    setTipTarget(creator);
    setShowTipModal(true);
  };

  const handleTipModalClose = () => {
    setShowTipModal(false);
    setTipTarget(null);
  };

  const onRefresh = () => {
    loadCreators(true);
  };

  const renderCreatorCard = (creator: Creator) => (
    <TouchableOpacity
      key={creator.id}
      style={[styles.creatorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleCreatorPress(creator)}
    >
      <View style={styles.creatorHeader}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.creatorAvatar} />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
          </View>
        )}
        
        <View style={styles.creatorInfo}>
          <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
            {creator.display_name}
          </Text>
          <Text style={[styles.creatorUsername, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            @{creator.username}
          </Text>
          {creator.location && (
            <Text style={[styles.creatorLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              📍 {creator.location}
            </Text>
          )}
        </View>
        <View style={styles.creatorHeaderActions}>
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: creator.isFollowing ? theme.colors.surface : theme.colors.primary,
                borderColor: theme.colors.primary,
              }
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleFollowCreator(creator);
            }}
          >
            <Text
              style={[
                styles.followButtonText,
                {
                  color: creator.isFollowing ? theme.colors.primary : '#FFFFFF',
                }
              ]}
            >
              {creator.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tipButton,
              {
                backgroundColor: theme.isDark ? 'rgba(253, 224, 71, 0.12)' : 'rgba(250, 204, 21, 0.18)',
                borderColor: 'rgba(250, 204, 21, 0.35)',
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              openTipModal(creator);
            }}
          >
            <Ionicons name="gift" size={16} color="#FACC15" style={styles.tipButtonIcon} />
            <Text style={styles.tipButtonText}>Tip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {creator.bio && (
        <Text style={[styles.creatorBio, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {creator.bio}
        </Text>
      )}

      <View style={styles.creatorFooter}>
        {creator.genre && (
          <View style={[styles.genreTag, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.genreText, { color: theme.colors.primary }]}>
              {creator.genre}
            </Text>
          </View>
        )}
        <Text style={[styles.joinDate, { color: theme.colors.textSecondary }]}>
          Joined {new Date(creator.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading creators...
            </Text>
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
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          All Creators ({filteredCreators.length})
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search creators..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Sort:</Text>
        <View style={styles.filterOptions}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                { 
                  backgroundColor: sortBy === option.key ? theme.colors.primary + '20' : theme.colors.card,
                  borderColor: sortBy === option.key ? theme.colors.primary : theme.colors.border
                }
              ]}
              onPress={() => setSortBy(option.key as SortOption)}
            >
              <Text style={[
                styles.filterButtonText,
                { color: sortBy === option.key ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={filteredCreators}
        renderItem={({ item }) => renderCreatorCard(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No creators found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Check back later for new creators'}
            </Text>
          </View>
        }
      />
      {tipTarget && (
        <TipModal
          visible={showTipModal}
          creatorId={tipTarget.id}
          creatorName={tipTarget.display_name || tipTarget.username}
          onClose={handleTipModalClose}
          onTipSuccess={() => handleTipModalClose()}
        />
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
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  creatorCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 8,
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  creatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  creatorUsername: {
    fontSize: 14,
    marginBottom: 2,
  },
  creatorLocation: {
    fontSize: 12,
  },
  creatorBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  creatorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinDate: {
    fontSize: 12,
  },
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    gap: 4,
  },
  tipButtonIcon: {
    marginRight: 2,
  },
  tipButtonText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});