import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSearch } from '../hooks/useSearch';
import { formatServiceCategories } from '../utils/serviceCategoryLabels';

export default function GlobalSearchBar() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleResultPress = (type: 'track' | 'artist' | 'event' | 'post' | 'opportunity', item: any) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsFocused(false);

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

  const handleSearchPress = () => {
    if (searchQuery.trim()) {
      // Navigate to full search screen with query
      navigation.navigate('Search' as never, { initialQuery: searchQuery } as never);
    } else {
      // Just navigate to search screen
      navigation.navigate('Search' as never);
    }
    Keyboard.dismiss();
    setIsFocused(false);
  };

  const renderResultItem = ({ item, type }: { item: any; type: 'track' | 'artist' | 'event' | 'service' | 'venue' }) => {
    if (type === 'artist') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
          onPress={() => handleResultPress('artist', item)}
        >
          <View style={styles.resultAvatar}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.display_name || item.username}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      );
    } else if (type === 'track') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
          onPress={() => handleResultPress('track', item)}
        >
          <View style={styles.resultImage}>
            {item.cover_art_url ? (
              <Image source={{ uri: item.cover_art_url }} style={styles.trackImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.creator?.display_name || item.creator?.username || 'Unknown Artist'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      );
    } else if (type === 'event') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
          onPress={() => handleResultPress('event', item)}
        >
          <View style={styles.resultImage}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.trackImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="calendar" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.location || item.venue || 'Event'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      );
    } else if (type === 'service') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
          onPress={() => handleResultPress('service', item)}
        >
          <View style={styles.resultImage}>
            {item.avatar_url || item.image_url ? (
              <Image source={{ uri: item.avatar_url || item.image_url }} style={styles.trackImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="briefcase" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.display_name || item.headline || 'Service Provider'}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {formatServiceCategories(item.categories)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      );
    } else if (type === 'venue') {
      return (
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
          onPress={() => handleResultPress('venue', item)}
        >
          <View style={styles.resultImage}>
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="location" size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name || 'Venue'}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {(() => {
                // Extract location from address JSONB if available
                if (item.address && typeof item.address === 'object') {
                  const addr = item.address as any;
                  return addr.city || addr.state || addr.country || addr.address_line1 || item.description || 'Venue';
                }
                return item.description || 'Venue';
              })()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  const allResults = [
    ...searchResults.artists.map(item => ({ ...item, _type: 'artist' as const })),
    ...searchResults.tracks.map(item => ({ ...item, _type: 'track' as const })),
    ...(searchResults.events || []).map(item => ({ ...item, _type: 'event' as const })),
    ...(searchResults.services || []).map(item => ({ ...item, _type: 'service' as const })),
    ...(searchResults.venues || []).map(item => ({ ...item, _type: 'venue' as const })),
  ].slice(0, 5); // Limit to 5 results in dropdown

  const showDropdown = isFocused && (searchQuery.length > 0 || allResults.length > 0);

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow result press
            setTimeout(() => setIsFocused(false), 200);
          }}
          onSubmitEditing={handleSearchPress}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')} 
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        {isSearching && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadingIndicator} />
        )}
      </View>

      {/* Dropdown Results */}
      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {isSearching && allResults.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
            </View>
          ) : allResults.length > 0 ? (
            <>
              <FlatList
                data={allResults}
                keyExtractor={(item, index) => `${item._type}-${item.id}-${index}`}
                renderItem={({ item }) => renderResultItem({ item, type: item._type })}
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
              />
              {allResults.length >= 5 && (
                <TouchableOpacity
                  style={[styles.viewAllButton, { borderTopColor: theme.colors.border }]}
                  onPress={handleSearchPress}
                >
                  <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All Results</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : searchQuery.length >= 2 ? (
            <View style={styles.noResultsContainer}>
              <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>No results found</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 36, // Ensure minimum height for icons
    overflow: 'visible', // Allow icons to show fully
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 17, // Slightly larger than fontSize for proper baseline
    includeFontPadding: false,
    textAlignVertical: 'top', // Use 'top' instead of 'center' for better baseline alignment
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 26, // Ensure enough space for the icon
    minHeight: 26, // Ensure enough space for the icon
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
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
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});

