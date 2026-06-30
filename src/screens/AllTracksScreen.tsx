import React, { useState, useEffect, useRef } from 'react';
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
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import { Typography } from '../constants/Typography';
import { useSearchHistory } from '../hooks/useSearchHistory';
import SearchHistoryPanel from '../components/SearchHistoryPanel';

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  audio_url?: string;
  file_url?: string;
  cover_art_url?: string;
  duration?: number;
  play_count?: number;
  likes_count?: number;
  genre?: string;
  created_at: string;
  creator_id?: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type SortOption = 'recent' | 'popular' | 'alphabetical';

export default function AllTracksScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { play, currentTrack, isPlaying } = useAudioPlayer();

  const params = route.params as { category?: string; title?: string } | undefined;
  const category = params?.category || 'all';
  const screenTitle = params?.title || 'All Tracks';

  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchFocused, setSearchFocused] = useState(false);
  const blurRef = useRef<ReturnType<typeof setTimeout>>();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory('tracks');

  const handleSearchFocus = () => { clearTimeout(blurRef.current); setSearchFocused(true); };
  const handleSearchBlur = () => {
    blurRef.current = setTimeout(() => setSearchFocused(false), 200);
    if (searchQuery.trim().length >= 2) addToHistory(searchQuery.trim());
  };

  const sortOptions = [
    { key: 'recent', label: 'Most Recent' },
    { key: 'popular', label: 'Most Played' },
    { key: 'alphabetical', label: 'A-Z' },
  ];

  useEffect(() => {
    loadTracks(false);
  }, [category]);

  useEffect(() => {
    applyFilters();
  }, [tracks, searchQuery, sortBy]);

  const loadTracks = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      console.log(`🔄 Loading ${category} tracks from Supabase...`);

      let query = supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          description,
          audio_url,
          file_url,
          cover_art_url,
          duration,
          play_count,
          likes_count,
          genre,
          created_at,
          live_interest_enabled,
          creator:profiles!creator_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply category filtering
      if (category === 'trending') {
        query = query.order('play_count', { ascending: false });
      } else if (category === 'popular') {
        query = query.order('play_count', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading tracks:', error);
        throw error;
      }

      console.log('✅ Tracks loaded:', data?.length || 0);
      setTracks((data || []) as AudioTrack[]);

    } catch (error: any) {
      console.error('❌ Error loading tracks:', error);
      setError(error.message || 'Failed to load tracks');
      Alert.alert('Error', 'Failed to load tracks. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tracks];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.description && track.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (track.creator?.display_name && track.creator.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (track.genre && track.genre.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.play_count || 0) - (a.play_count || 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTracks(filtered);
  };

  const handlePlayTrack = async (track: AudioTrack) => {
    try {
      const audioUrl = track.file_url || track.audio_url || '';
      if (!audioUrl) {
        Alert.alert('Unavailable', 'This track has no audio file.');
        return;
      }
      await play({
        id: track.id,
        title: track.title,
        created_at: track.created_at,
        file_url: audioUrl,
        audio_url: audioUrl,
        cover_image_url: track.cover_art_url || '',
        duration: track.duration || 0,
        creator_id: track.creator_id,
        artist_name: track.creator?.display_name || track.creator?.username || '',
      });
      // Increment play count in background
      supabase.from('audio_tracks').update({ play_count: (track.play_count || 0) + 1 }).eq('id', track.id).then(() => {});
    } catch (err) {
      console.error('Failed to play track:', err);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const handleTrackPress = (track: AudioTrack) => {
    navigation.navigate('TrackDetails' as never, { trackId: track.id } as never);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const onRefresh = () => {
    loadTracks(true);
  };

  const renderTrackCard = (track: AudioTrack) => {
    const isActiveTrack = currentTrack?.id === track.id;
    const isCurrentlyPlaying = isActiveTrack && isPlaying;

    return (
      <TouchableOpacity
        key={track.id}
        style={[
          styles.trackCard,
          { backgroundColor: theme.colors.surface, borderColor: isActiveTrack ? theme.colors.primary + '60' : theme.colors.border },
        ]}
        onPress={() => handleTrackPress(track)}
        activeOpacity={0.8}
      >
        <View style={styles.trackHeader}>
          {/* Cover art with active overlay */}
          <View style={styles.coverWrapper}>
            {track.cover_art_url ? (
              <Image source={{ uri: track.cover_art_url }} style={styles.trackCover} />
            ) : (
              <View style={[styles.defaultCover, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="musical-notes" size={22} color={theme.colors.textSecondary} />
              </View>
            )}
            {isActiveTrack && (
              <View style={styles.coverActiveOverlay}>
                <Ionicons
                  name={isCurrentlyPlaying ? 'pause-circle' : 'play-circle'}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
            )}
          </View>

          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={[styles.trackArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
            </Text>
            {track.genre && (
              <View style={[styles.genreTag, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.genreText, { color: theme.colors.primary }]}>
                  {track.genre}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.trackActions}>
            <TouchableOpacity
              style={[
                styles.playButton,
                { backgroundColor: isActiveTrack ? theme.colors.primary : theme.colors.primary + '20' },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handlePlayTrack(track);
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isCurrentlyPlaying ? 'pause' : 'play'}
                size={18}
                color={isActiveTrack ? '#FFFFFF' : theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.trackFooter}>
          <View style={styles.trackStats}>
            {!!track.duration && (
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={11} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatDuration(track.duration)}
                </Text>
              </View>
            )}
            <View style={styles.stat}>
              <Ionicons name="headset-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {formatNumber(track.play_count || 0)}
              </Text>
            </View>
            {track.likes_count !== undefined && (
              <View style={styles.stat}>
                <Ionicons name="heart-outline" size={11} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {formatNumber(track.likes_count)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
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
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading tracks...
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

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {screenTitle} ({filteredTracks.length})
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search tracks..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onSubmitEditing={() => { if (searchQuery.trim().length >= 2) addToHistory(searchQuery.trim()); }}
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
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredTracks}
            renderItem={({ item }) => renderTrackCard(item)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  No tracks found
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  {searchQuery ? 'Try adjusting your search' : 'Check back later for new music'}
                </Text>
              </View>
            }
          />
          {searchFocused && !searchQuery && history.length > 0 && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 10, backgroundColor: theme.colors.background }]}>
              <SearchHistoryPanel
                history={history}
                onSelect={(term) => { clearTimeout(blurRef.current); setSearchQuery(term); addToHistory(term); setSearchFocused(false); }}
                onRemove={removeFromHistory}
                onClearAll={clearHistory}
              />
            </View>
          )}
        </View>
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
    ...Typography.body,
    fontSize: 15,
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
    ...Typography.headerMedium,
    fontSize: 18,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    ...Typography.body,
    fontSize: 15,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterLabel: {
    ...Typography.label,
    fontWeight: '600',
    fontSize: 14,
    marginRight: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    ...Typography.label,
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  trackCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coverWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  trackCover: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  defaultCover: {
    width: 58,
    height: 58,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverActiveOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  trackArtist: {
    ...Typography.label,
    fontSize: 13,
    marginBottom: 5,
    letterSpacing: -0.1,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  genreText: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  trackActions: {
    marginLeft: 10,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackStats: {
    flexDirection: 'row',
    gap: 14,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...Typography.label,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    ...Typography.headerMedium,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.body,
    fontSize: 15,
    textAlign: 'center',
  },
});
