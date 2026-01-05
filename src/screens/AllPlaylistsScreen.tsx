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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  tracks_count?: number;
  total_duration?: number;
  followers_count?: number;
  is_public: boolean;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type SortOption = 'recent' | 'popular' | 'alphabetical';

export default function AllPlaylistsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();

  const params = route.params as { title?: string } | undefined;
  const screenTitle = params?.title || 'All Playlists';

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const sortOptions = [
    { key: 'recent', label: 'Most Recent' },
    { key: 'popular', label: 'Most Followed' },
    { key: 'alphabetical', label: 'A-Z' },
  ];

  useEffect(() => {
    loadPlaylists(false);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [playlists, searchQuery, sortBy]);

  const loadPlaylists = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      console.log('🔄 Loading playlists from Supabase...');

      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          tracks_count,
          total_duration,
          followers_count,
          is_public,
          created_at,
          creator:profiles!playlists_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error loading playlists:', error);
        throw error;
      }

      console.log('✅ Playlists loaded:', data?.length || 0);
      setPlaylists((data || []) as Playlist[]);

    } catch (error: any) {
      console.error('❌ Error loading playlists:', error);
      setError(error.message || 'Failed to load playlists');
      Alert.alert('Error', 'Failed to load playlists. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...playlists];

    if (searchQuery.trim()) {
      filtered = filtered.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (playlist.description && playlist.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (playlist.creator?.display_name && playlist.creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.followers_count || 0) - (a.followers_count || 0);
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredPlaylists(filtered);
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    console.log('Navigate to playlist details:', playlist.name);
    navigation.navigate('PlaylistDetails' as never, { playlistId: playlist.id } as never);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} min`;
  };

  const onRefresh = () => {
    loadPlaylists(true);
  };

  const renderPlaylistCard = (playlist: Playlist) => (
    <TouchableOpacity
      key={playlist.id}
      style={[styles.playlistCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handlePlaylistPress(playlist)}
    >
      {playlist.cover_image_url ? (
        <Image source={{ uri: playlist.cover_image_url }} style={styles.playlistCover} />
      ) : (
        <View style={[styles.defaultCover, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="musical-notes" size={32} color={theme.colors.textSecondary} />
        </View>
      )}

      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: theme.colors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={[styles.playlistCreator, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          by {playlist.creator?.display_name || playlist.creator?.username || 'Unknown Creator'}
        </Text>
        <View style={styles.playlistStats}>
          <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
            {playlist.tracks_count || 0} tracks
          </Text>
          <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>•</Text>
          <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
            {formatDuration(playlist.total_duration || 0)}
          </Text>
          {playlist.followers_count !== undefined && (
            <>
              <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>•</Text>
              <Text style={[styles.stat, { color: theme.colors.textSecondary }]}>
                {playlist.followers_count} followers
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading playlists...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {screenTitle} ({filteredPlaylists.length})
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search playlists..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

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

        <FlatList
          data={filteredPlaylists}
          renderItem={({ item }) => renderPlaylistCard(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No playlists found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : 'Check back later for new playlists'}
              </Text>
            </View>
          }
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
  playlistCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playlistCover: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  defaultCover: {
    width: 70,
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playlistCreator: {
    fontSize: 14,
    marginBottom: 6,
  },
  playlistStats: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  stat: {
    fontSize: 12,
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
