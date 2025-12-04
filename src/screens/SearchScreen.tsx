import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSearch } from '../hooks/useSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostCard from '../components/PostCard';
import { Post } from '../types/feed.types';
import BackButton from '../components/BackButton';
import { formatServiceCategories } from '../utils/serviceCategoryLabels';

type SearchTab = 'all' | 'posts' | 'people' | 'opportunities';

const RECENT_SEARCHES_KEY = '@soundbridge_recent_searches';

export default function SearchScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Get initial query from route params if provided
  useEffect(() => {
    const params = route.params as any;
    if (params?.initialQuery) {
      setSearchQuery(params.initialQuery);
    }
  }, []);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 10);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      saveSearch(searchQuery.trim());
    }
  }, [searchQuery]);

  const handleResultPress = (type: 'track' | 'artist' | 'event' | 'service' | 'venue' | 'post' | 'opportunity', item: any) => {
    if (type === 'track') {
      navigation.navigate('TrackDetails' as never, { trackId: item.id, track: item } as never);
    } else if (type === 'artist') {
      navigation.navigate('CreatorProfile' as never, { creatorId: item.id, creator: item } as never);
    } else if (type === 'event') {
      navigation.navigate('EventDetails' as never, { eventId: item.id, event: item } as never);
    } else if (type === 'service') {
      // Deep link to service provider profile
      navigation.navigate('CreatorProfile' as never, { creatorId: item.user_id || item.provider_id, creator: item } as never);
    } else if (type === 'venue') {
      // Deep link to venue details - navigate to event details or create venue screen
      navigation.navigate('EventDetails' as never, { venueId: item.id, venue: item } as never);
    } else if (type === 'post') {
      navigation.navigate('Feed' as never);
    } else if (type === 'opportunity') {
      navigation.navigate('Network' as never, { tab: 'opportunities' } as never);
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    if (item.type === 'post') {
      // Convert SearchResult to Post format for PostCard
      const post: Post = {
        id: item.id,
        content: item.content || '',
        post_type: 'update',
        visibility: 'public',
        author: {
          id: item.id,
          username: item.username || 'user',
          display_name: item.display_name || 'User',
          avatar_url: item.avatar_url,
        },
        reactions_count: {
          support: 0,
          love: 0,
          fire: 0,
          congrats: 0,
        },
        comments_count: 0,
        user_reaction: null,
        created_at: item.created_at || new Date().toISOString(),
      };

      return (
        <PostCard
          post={post}
          onPress={() => handleResultPress(item)}
          onReactionPress={() => {}}
          onCommentPress={() => {}}
        />
      );
    }

    // Render other result types
    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleResultPress(item)}
      >
        <View style={styles.resultContent}>
          {item.avatar_url && (
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={40} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.resultText}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              {item.display_name || item.title || item.username}
            </Text>
            {item.content && (
              <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.content}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[
        theme.colors.backgroundGradient.start,
        theme.colors.backgroundGradient.middle,
        theme.colors.backgroundGradient.end,
      ]}
      style={styles.container}
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Search Header */}
        <View
          style={[
            styles.searchHeader,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search posts, people, opportunities..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchQuery.length >= 2) {
                  saveSearch(searchQuery);
                }
              }}
              allowFontScaling={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Tabs */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'posts', 'people', 'opportunities'] as SearchTab[]).map((tab) => {
              // Map opportunities tab to show services and venues
              const tabLabel = tab === 'opportunities' ? 'Services & Venues' : tab.charAt(0).toUpperCase() + tab.slice(1);
              return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                  activeTab !== tab && {
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === tab ? '#FFFFFF' : theme.colors.text,
                    },
                  ]}
                >
                  {tabLabel}
                </Text>
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search Results */}
        {searchQuery.length < 2 ? (
          // Recent searches
          <ScrollView style={styles.resultsContainer}>
            <View style={styles.recentSearches}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Searches</Text>
              {recentSearches.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No recent searches
                </Text>
              ) : (
                recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.recentSearchItem,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                    onPress={() => setSearchQuery(search)}
                  >
                    <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.recentSearchText, { color: theme.colors.text }]}>{search}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const updated = recentSearches.filter((s) => s !== search);
                        setRecentSearches(updated);
                        AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
                      }}
                    >
                      <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        ) : isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (() => {
          // Filter results by active tab
          let filteredResults = { ...searchResults };
          
          if (activeTab === 'people') {
            filteredResults = {
              tracks: [],
              artists: searchResults.artists,
              events: [],
              services: [],
              venues: [],
              posts: [],
              opportunities: [],
            };
          } else if (activeTab === 'posts') {
            filteredResults = {
              tracks: [],
              artists: [],
              events: [],
              services: [],
              venues: [],
              posts: searchResults.posts || [],
              opportunities: [],
            };
          } else if (activeTab === 'opportunities') {
            // Opportunities tab shows services and venues
            filteredResults = {
              tracks: [],
              artists: [],
              events: [],
              services: searchResults.services || [],
              venues: searchResults.venues || [],
              posts: [],
              opportunities: searchResults.opportunities || [],
            };
          }
          // 'all' tab shows everything (no filtering)

          const hasAnyResults = 
            filteredResults.tracks.length > 0 ||
            filteredResults.artists.length > 0 ||
            (filteredResults.events?.length || 0) > 0 ||
            (filteredResults.services?.length || 0) > 0 ||
            (filteredResults.venues?.length || 0) > 0 ||
            (filteredResults.posts?.length || 0) > 0 ||
            (filteredResults.opportunities?.length || 0) > 0;

          if (!hasAnyResults) {
            return (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  {activeTab === 'all' ? 'No results found' : `No ${activeTab} found`}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  {activeTab === 'all' 
                    ? 'Try different keywords or filters'
                    : `No results for this category. Try searching in "All" or use different keywords.`
                  }
                </Text>
              </View>
            );
          }

          return (
            <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
              {/* Artists */}
              {filteredResults.artists.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Artists</Text>
                {searchResults.artists.map((artist) => (
                  <TouchableOpacity
                    key={artist.id}
                    style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleResultPress('artist', artist)}
                  >
                    <View style={styles.resultAvatar}>
                      {artist.avatar_url ? (
                        <Image source={{ uri: artist.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name="person" size={24} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {artist.display_name || artist.username}
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        @{artist.username}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Events */}
            {filteredResults.events && filteredResults.events.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Events</Text>
                {filteredResults.events.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleResultPress('event', event)}
                  >
                    <View style={styles.resultImage}>
                      {event.image_url ? (
                        <Image source={{ uri: event.image_url }} style={styles.trackImage} />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name="calendar" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {event.location || event.venue || 'Event'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Services */}
            {filteredResults.services && filteredResults.services.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Services</Text>
                {filteredResults.services.map((service) => (
                  <TouchableOpacity
                    key={service.provider_id || service.id}
                    style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleResultPress('service', service)}
                  >
                    <View style={styles.resultImage}>
                      {service.avatar_url || service.image_url ? (
                        <Image source={{ uri: service.avatar_url || service.image_url }} style={styles.trackImage} />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name="briefcase" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {service.display_name || service.headline || 'Service Provider'}
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {formatServiceCategories(service.categories)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Venues */}
            {filteredResults.venues && filteredResults.venues.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Venues</Text>
                {filteredResults.venues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleResultPress('venue', venue)}
                  >
                    <View style={styles.resultImage}>
                      <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="location" size={20} color="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {venue.name || 'Venue'}
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {(() => {
                          // Extract location from address JSONB if available
                          if (venue.address && typeof venue.address === 'object') {
                            const addr = venue.address as any;
                            return addr.city || addr.state || addr.country || addr.address_line1 || venue.description || 'Venue';
                          }
                          return venue.description || 'Venue';
                        })()}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tracks (only show in All tab) */}
            {activeTab === 'all' && filteredResults.tracks.length > 0 && (
              <View style={styles.resultsSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tracks</Text>
                {filteredResults.tracks.map((track) => (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleResultPress('track', track)}
                  >
                    <View style={styles.resultImage}>
                      {track.cover_art_url ? (
                        <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {track.creator?.display_name || track.creator?.username || 'Unknown Artist'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          );
        })()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  searchHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
    margin: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 15,
    includeFontPadding: false,
    textAlignVertical: 'center',
    transform: [{ translateY: Platform.OS === 'ios' ? -3 : -2 }], // Shift text up to sit on baseline
  },
  tabsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsList: {
    padding: 16,
    gap: 12,
  },
  recentSearches: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  trackImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
});

