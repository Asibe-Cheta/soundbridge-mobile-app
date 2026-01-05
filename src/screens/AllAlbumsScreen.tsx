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

interface Album {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  tracks_count?: number;
  total_plays?: number;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type SortOption = 'recent' | 'popular' | 'alphabetical';

export default function AllAlbumsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();

  const params = route.params as { category?: string; title?: string } | undefined;
  const category = params?.category || 'all';
  const screenTitle = params?.title || 'All Albums';

  const [albums, setAlbums] = useState<Album[]>([]);
  const [filteredAlbums, setFilteredAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const sortOptions = [
    { key: 'recent', label: 'Most Recent' },
    { key: 'popular', label: 'Most Played' },
    { key: 'alphabetical', label: 'A-Z' },
  ];

  useEffect(() => {
    loadAlbums(false);
  }, [category]);

  useEffect(() => {
    applyFilters();
  }, [albums, searchQuery, sortBy]);

  const loadAlbums = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      console.log(`🔄 Loading ${category} albums from Supabase...`);

      let query = supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          tracks_count,
          total_plays,
          created_at,
          creator:profiles!albums_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (category === 'featured' || category === 'popular') {
        query = query.order('total_plays', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading albums:', error);
        throw error;
      }

      console.log('✅ Albums loaded:', data?.length || 0);
      setAlbums((data || []) as Album[]);

    } catch (error: any) {
      console.error('❌ Error loading albums:', error);
      setError(error.message || 'Failed to load albums');
      Alert.alert('Error', 'Failed to load albums. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...albums];

    if (searchQuery.trim()) {
      filtered = filtered.filter(album =>
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (album.description && album.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (album.creator?.display_name && album.creator.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.total_plays || 0) - (a.total_plays || 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredAlbums(filtered);
  };

  const handleAlbumPress = (album: Album) => {
    console.log('Navigate to album details:', album.title);
    navigation.navigate('AlbumDetails' as never, { albumId: album.id } as never);
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const onRefresh = () => {
    loadAlbums(true);
  };

  const renderAlbumCard = (album: Album) => (
    <TouchableOpacity
      key={album.id}
      style={[styles.albumCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleAlbumPress(album)}
    >
      {album.cover_image_url ? (
        <Image source={{ uri: album.cover_image_url }} style={styles.albumCover} />
      ) : (
        <View style={[styles.defaultCover, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="albums" size={40} color={theme.colors.textSecondary} />
        </View>
      )}

      <View style={styles.albumInfo}>
        <Text style={[styles.albumTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {album.title}
        </Text>
        <Text style={[styles.albumArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {album.creator?.display_name || album.creator?.username || 'Unknown Artist'}
        </Text>
        <View style={styles.albumStats}>
          <View style={styles.stat}>
            <Ionicons name="musical-notes-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {album.tracks_count || 0} tracks
            </Text>
          </View>
          {album.total_plays !== undefined && (
            <View style={styles.stat}>
              <Ionicons name="play-circle-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatNumber(album.total_plays)}
              </Text>
            </View>
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
              Loading albums...
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
            {screenTitle} ({filteredAlbums.length})
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search albums..."
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
          data={filteredAlbums}
          renderItem={({ item }) => renderAlbumCard(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="albums-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No albums found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : 'Check back later for new albums'}
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
  albumCard: {
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
  albumCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  defaultCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    marginBottom: 8,
  },
  albumStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
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
