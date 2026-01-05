import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
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
import { dbHelpers, supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventCategoryPromptModal from '../components/EventCategoryPromptModal';

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  venue?: string;
  city?: string;
  category: string;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees?: number;
  image_url?: string;
  created_at: string;
  distance_km?: number;
  has_coordinates?: boolean;
}

type SortOption = 'date' | 'alphabetical';

export default function AllEventsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState(false);

  const sortOptions = [
    { key: 'date', label: 'By Date' },
    { key: 'alphabetical', label: 'A-Z' },
  ];

  useEffect(() => {
    loadEvents(false);
    checkUserPreferences();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, sortBy]);

  const loadEvents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError(null);
      console.log('🔄 Loading personalized events from Supabase...');

      // Use personalized events function if user is logged in
      let data, error;
      if (user?.id) {
        const result = await dbHelpers.getPersonalizedEvents(user.id, 50);
        data = result.data;
        error = result.error;
      } else {
        // Fallback to regular events for non-logged-in users
        const result = await dbHelpers.getUpcomingEvents(50);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Error loading events:', error);
        throw error;
      }

      console.log('✅ Events loaded:', data?.length || 0);
      setEvents(data || []);

    } catch (error: any) {
      console.error('❌ Error loading events:', error);
      setError(error.message || 'Failed to load events');
      Alert.alert('Error', 'Failed to load events. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredEvents(filtered);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails' as never, { eventId: event.id, event: event } as never);
  };

  const checkUserPreferences = async () => {
    if (!user?.id || hasCheckedPreferences) return;

    try {
      // Check if user has dismissed the modal before
      const dismissed = await AsyncStorage.getItem('event_preference_modal_dismissed');
      if (dismissed === 'true') {
        setHasCheckedPreferences(true);
        return;
      }

      // Check if user has set event category preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('preferred_event_categories')
        .eq('user_id', user.id)
        .single();

      // Show modal if no preferences set
      if (!preferences || !preferences.preferred_event_categories || preferences.preferred_event_categories.length === 0) {
        // Delay modal to avoid showing immediately on screen load
        setTimeout(() => {
          setShowPreferenceModal(true);
        }, 1500);
      }

      setHasCheckedPreferences(true);
    } catch (error) {
      console.error('Error checking user preferences:', error);
      setHasCheckedPreferences(true);
    }
  };

  const handleDismissModal = async () => {
    setShowPreferenceModal(false);
    // Remember that user dismissed the modal
    await AsyncStorage.setItem('event_preference_modal_dismissed', 'true');
  };

  const handleSelectPreferences = () => {
    setShowPreferenceModal(false);
    // Navigate to notification preferences screen
    navigation.navigate('NotificationPreferences' as never);
  };

  const onRefresh = () => {
    loadEvents(true);
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString();
  };

  const renderEventCard = (event: Event) => (
    <TouchableOpacity
      key={event.id}
      style={[styles.eventCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleEventPress(event)}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventMainInfo}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={[styles.eventDate, { color: theme.colors.primary }]}>
            📅 {formatEventDate(event.event_date)}
          </Text>
          <View style={styles.locationRow}>
            <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              📍 {event.location}
              {event.venue && ` • ${event.venue}`}
            </Text>
            {event.distance_km !== null && event.distance_km !== undefined && (
              <Text style={[styles.distanceText, { color: theme.colors.accentBlue }]}>
                {event.distance_km < 1
                  ? `${Math.round(event.distance_km * 1000)}m away`
                  : `${Math.round(event.distance_km)}km away`
                }
              </Text>
            )}
          </View>
        </View>

        <View style={styles.eventActions}>
          {(event.price_gbp !== undefined || event.price_ngn !== undefined) && (
            <View style={[styles.priceTag, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.priceText, { color: theme.colors.primary }]}>
                {(!event.price_gbp || event.price_gbp === 0) && (!event.price_ngn || event.price_ngn === 0) 
                  ? 'FREE' 
                  : event.price_gbp 
                    ? `£${event.price_gbp}` 
                    : `₦${event.price_ngn}`
                }
              </Text>
            </View>
          )}
        </View>
      </View>

      {event.description && (
        <Text style={[styles.eventDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {event.description}
        </Text>
      )}

      <View style={styles.eventFooter}>
        <View style={styles.eventStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {event.current_attendees || 0}
              {event.max_attendees && ` / ${event.max_attendees}`}
            </Text>
          </View>
          <View style={[styles.categoryTag, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.categoryText, { color: theme.colors.textSecondary }]}>
              {event.category}
            </Text>
          </View>
        </View>
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
              Loading events...
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
          All Events ({filteredEvents.length})
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search events..."
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
        data={filteredEvents}
        renderItem={({ item }) => renderEventCard(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No events found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search' : 'Check back later for new events'}
            </Text>
          </View>
        }
      />
      </SafeAreaView>

      {/* Event Category Preference Modal */}
      <EventCategoryPromptModal
        visible={showPreferenceModal}
        onDismiss={handleDismissModal}
        onSelectPreferences={handleSelectPreferences}
      />
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
  eventCard: {
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
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  eventActions: {
    alignItems: 'flex-end',
  },
  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
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