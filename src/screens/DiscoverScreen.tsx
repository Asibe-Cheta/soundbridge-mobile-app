import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { db } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  audio_url?: string;
  file_url?: string;
  cover_image_url?: string;
  artwork_url?: string;
  duration?: number;
  plays_count?: number;
  likes_count?: number;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  followers_count?: number;
  tracks_count?: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  cover_image_url?: string;
  organizer: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  tracks_count?: number;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

type TabType = 'Music' | 'Artists' | 'Events' | 'Playlists';

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { play, addToQueue } = useAudioPlayer();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('Music');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Content states
  const [trendingTracks, setTrendingTracks] = useState<AudioTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<Creator[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Search states
  const [searchResults, setSearchResults] = useState<{
    tracks: AudioTrack[];
    artists: Creator[];
  }>({ tracks: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  // Loading states
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  const tabs: TabType[] = ['Music', 'Artists', 'Events', 'Playlists'];

  useEffect(() => {
    loadDiscoverContent();
  }, [activeTab]);

  const loadDiscoverContent = async () => {
    try {
      switch (activeTab) {
        case 'Music':
          await Promise.all([loadTrendingTracks(), loadRecentTracks()]);
          break;
        case 'Artists':
          await loadFeaturedArtists();
          break;
        case 'Events':
          await loadEvents();
          break;
        case 'Playlists':
          await loadPlaylists();
          break;
      }
    } catch (error) {
      console.error('Error loading discover content:', error);
    }
  };

  const loadTrendingTracks = async () => {
    try {
      const { success, data } = await db.getTrendingTracks(10);
      if (success && data) {
        setTrendingTracks(data);
      }
    } catch (error) {
      console.error('Error loading trending tracks:', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const loadRecentTracks = async () => {
    try {
      const { success, data } = await db.getAudioTracks(10);
      if (success && data) {
        setRecentTracks(data);
      }
    } catch (error) {
      console.error('Error loading recent tracks:', error);
    }
  };

  const loadFeaturedArtists = async () => {
    try {
      console.log('🔧 Loading featured artists...');
      const { success, data } = await db.getFeaturedCreators(10);
      if (success && data && data.length > 0) {
        console.log('✅ Featured artists loaded:', data.length, 'artists');
        setFeaturedArtists(data);
      } else {
        console.log('ℹ️ No featured artists found in database');
        setFeaturedArtists([]);
      }
    } catch (error) {
      console.error('Error loading featured artists:', error);
      setFeaturedArtists([]);
    } finally {
      setLoadingArtists(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { success, data } = await db.getEvents(10);
      if (success && data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      console.log('🔧 Loading playlists...');
      // Note: Playlists functionality would need to be implemented in the database
      // For now, we'll just set empty playlists since this table doesn't exist yet
      console.log('ℹ️ Playlists feature not implemented yet');
      setPlaylists([]);
    } catch (error) {
      console.error('Error loading playlists:', error);
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiscoverContent();
    setRefreshing(false);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ tracks: [], artists: [] });
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 Searching for:', query);

      const [tracksResult, artistsResult] = await Promise.all([
        db.searchTracks(query.trim(), 20),
        db.searchProfiles(query.trim(), 10)
      ]);

      const tracks = tracksResult.success ? tracksResult.data || [] : [];
      const artists = artistsResult.success ? artistsResult.data || [] : [];

      setSearchResults({ tracks, artists });
      console.log('✅ Search results:', tracks.length, 'tracks,', artists.length, 'artists');
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ tracks: [], artists: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleTrackPress = async (track: AudioTrack) => {
    try {
      console.log('🎵 Playing track from Discover:', track.title);
      await play(track);
      
      // Optionally add other tracks from current view to queue
      if (trendingTracks.length > 0) {
        const otherTracks = trendingTracks.filter(t => t.id !== track.id);
        otherTracks.forEach(t => addToQueue(t));
      }
      
      // Mini player will now handle showing the currently playing track
      // Navigation to full player is handled by mini player expand button
    } catch (error) {
      console.error('Failed to play track:', error);
      Alert.alert('Playback Error', 'Failed to play track');
    }
  };

  const handleArtistPress = (artist: Creator) => {
    console.log('Viewing artist:', artist.username);
  };

  const handleEventPress = (event: Event) => {
    console.log('Viewing event:', event.title);
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    console.log('Viewing playlist:', playlist.name);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderMusicTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Trending Now */}
      <Section title="Trending Now">
        {loadingTracks ? (
          <LoadingState text="Loading trending tracks..." />
        ) : trendingTracks.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalScroll}>
              {trendingTracks.map((track) => (
                <TouchableOpacity key={track.id} style={styles.trendingCard} onPress={() => handleTrackPress(track)}>
                  <View style={styles.trackCover}>
                    {track.cover_image_url ? (
                      <Image source={{ uri: track.cover_image_url }} style={styles.trendingImage} />
                    ) : (
                      <View style={styles.defaultTrackImage}>
                        <Ionicons name="musical-notes" size={32} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.playOverlay}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={[styles.trendingTitle, { color: theme.colors.text }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={[styles.trendingArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>by {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}</Text>
                  <Text style={[styles.trackDuration, { color: theme.colors.textSecondary }]}>{formatDuration(track.duration)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState icon="musical-notes" text="No trending tracks yet" />
        )}
      </Section>

      {/* Featured Artists */}
      <Section title="Featured Artists">
        {loadingArtists ? (
          <LoadingState text="Loading artists..." />
        ) : featuredArtists.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalScroll}>
              {featuredArtists.map((artist) => (
                <TouchableOpacity key={artist.id} style={styles.artistCard} onPress={() => handleArtistPress(artist)}>
                  <View style={styles.artistAvatarContainer}>
                    {artist.avatar_url ? (
                      <Image source={{ uri: artist.avatar_url }} style={styles.artistAvatar} />
                    ) : (
                      <View style={styles.defaultArtistAvatar}>
                        <Ionicons name="person" size={24} color="#666" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.artistName} numberOfLines={1}>{artist?.display_name || artist?.username || 'Unknown Artist'}</Text>
                  <Text style={styles.artistHandle} numberOfLines={1}>@{artist.username}</Text>
                  <Text style={styles.artistStats}>{artist.followers_count?.toLocaleString()} followers</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <EmptyState icon="people" text="No featured artists" />
        )}
      </Section>

      {/* Recent Uploads */}
      <Section title="Recent Music">
        {loadingTracks ? (
          <LoadingState text="Loading recent tracks..." />
        ) : recentTracks.length > 0 ? (
          <View style={[styles.tracksList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
            {recentTracks.map((track) => (
              <TouchableOpacity key={track.id} style={styles.trackRow} onPress={() => handleTrackPress(track)}>
                <View style={styles.trackRowCover}>
                  {(track.cover_image_url || track.artwork_url) ? (
                    <Image source={{ uri: track.cover_image_url || track.artwork_url }} style={styles.trackRowImage} />
                  ) : (
                    <View style={styles.defaultTrackRowImage}>
                      <Ionicons name="musical-notes" size={20} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.trackRowInfo}>
                  <Text style={[styles.trackRowTitle, { color: theme.colors.text }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={[styles.trackRowArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>by {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}</Text>
                </View>
                <View style={styles.trackRowActions}>
                  <TouchableOpacity style={styles.playButton} onPress={() => handleTrackPress(track)}>
                    <Ionicons name="play" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.trackRowDuration, { color: theme.colors.textSecondary }]}>{formatDuration(track.duration)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="musical-notes" text="No recent uploads" />
        )}
      </Section>
    </ScrollView>
  );

  const renderArtistsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Section title="All Artists">
        {loadingArtists ? (
          <LoadingState text="Loading artists..." />
        ) : featuredArtists.length > 0 ? (
          <View style={styles.artistsGrid}>
            {featuredArtists.map((artist) => (
              <TouchableOpacity key={artist.id} style={[styles.artistGridCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => handleArtistPress(artist)}>
                <View style={styles.artistAvatarContainer}>
                  {artist.avatar_url ? (
                    <Image source={{ uri: artist.avatar_url }} style={styles.artistAvatar} />
                  ) : (
                    <View style={styles.defaultArtistAvatar}>
                      <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <Text style={[styles.artistName, { color: theme.colors.text }]} numberOfLines={1}>{artist?.display_name || artist?.username || 'Unknown Artist'}</Text>
                <Text style={[styles.artistHandle, { color: theme.colors.textSecondary }]} numberOfLines={1}>@{artist.username}</Text>
                <Text style={[styles.artistBio, { color: theme.colors.textSecondary }]} numberOfLines={2}>{artist.bio}</Text>
                <Text style={[styles.artistStats, { color: theme.colors.textSecondary }]}>{artist.followers_count?.toLocaleString()} followers • {artist.tracks_count} tracks</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="people" text="No artists found" />
        )}
      </Section>
    </ScrollView>
  );

  const renderEventsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Section title="Upcoming Events">
        {loadingEvents ? (
          <LoadingState text="Loading events..." />
        ) : events.length > 0 ? (
          <View style={styles.eventsList}>
            {events.map((event) => (
              <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => handleEventPress(event)}>
                <View style={styles.eventImageContainer}>
                  {event.cover_image_url ? (
                    <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} />
                  ) : (
                    <View style={styles.defaultEventImage}>
                      <Ionicons name="calendar" size={24} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
                  {event.location && (
                    <Text style={styles.eventLocation} numberOfLines={1}>📍 {event.location}</Text>
                  )}
                  <Text style={styles.eventOrganizer} numberOfLines={1}>by {event.organizer?.display_name || event.organizer?.username || 'Unknown Organizer'}</Text>
                  {event.description && (
                    <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="calendar" text="No upcoming events" />
        )}
      </Section>
    </ScrollView>
  );

  const renderPlaylistsTab = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Section title="Featured Playlists">
        {loadingPlaylists ? (
          <LoadingState text="Loading playlists..." />
        ) : playlists.length > 0 ? (
          <View style={styles.playlistsList}>
            {playlists.map((playlist) => (
              <TouchableOpacity key={playlist.id} style={styles.playlistCard} onPress={() => handlePlaylistPress(playlist)}>
                <View style={styles.playlistCover}>
                  {playlist.cover_image_url ? (
                    <Image source={{ uri: playlist.cover_image_url }} style={styles.playlistImage} />
                  ) : (
                    <View style={styles.defaultPlaylistImage}>
                      <Ionicons name="musical-notes" size={32} color="#666" />
                    </View>
                  )}
                  <View style={styles.playlistOverlay}>
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistTitle} numberOfLines={1}>{playlist.name}</Text>
                  <Text style={styles.playlistCreator} numberOfLines={1}>by {playlist.creator?.display_name || playlist.creator?.username || 'Unknown Creator'}</Text>
                  <Text style={styles.playlistDescription} numberOfLines={2}>{playlist.description}</Text>
                  <Text style={styles.playlistStats}>{playlist.tracks_count} tracks</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState icon="musical-notes" text="No playlists found" />
        )}
      </Section>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Music':
        return renderMusicTab();
      case 'Artists':
        return renderArtistsTab();
      case 'Events':
        return renderEventsTab();
      case 'Playlists':
        return renderPlaylistsTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Discover</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="filter-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            placeholder="Search for creators, music, events..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab, 
                  activeTab === tab && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.tabText, 
                  { color: theme.colors.textSecondary },
                  activeTab === tab && { color: theme.colors.primary, fontWeight: 'bold' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

// Section Component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

// Loading State Component
function LoadingState({ text }: { text: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.loadingContainer}>
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

// Empty State Component
function EmptyState({ icon, text }: { icon: string; text: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={48} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
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
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  horizontalScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
  },
  trendingCard: {
    width: 160,
    gap: 8,
  },
  trackCover: {
    width: 160,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultTrackImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendingArtist: {
    fontSize: 12,
  },
  trackDuration: {
    fontSize: 11,
  },
  artistCard: {
    width: 120,
    alignItems: 'center',
    gap: 8,
  },
  artistAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#DC2626',
    padding: 2,
  },
  artistAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  defaultArtistAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 36,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistHandle: {
    fontSize: 12,
    textAlign: 'center',
  },
  artistStats: {
    fontSize: 11,
    textAlign: 'center',
  },
  artistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  artistGridCard: {
    width: (width - 64) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  artistBio: {
    fontSize: 12,
    textAlign: 'center',
  },
  tracksList: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trackRowCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRowImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultTrackRowImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  trackRowInfo: {
    flex: 1,
  },
  trackRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackRowArtist: {
    fontSize: 12,
  },
  trackRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRowDuration: {
    fontSize: 11,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
  },
  eventImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultEventImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  eventOrganizer: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  playlistsList: {
    gap: 12,
  },
  playlistCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  playlistImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  defaultPlaylistImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  playlistOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  playlistCreator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  playlistStats: {
    fontSize: 11,
    color: '#999999',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
  },
});