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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SystemTypography as Typography } from '../constants/Typography';
import { dbHelpers, supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventCategoryPromptModal from '../components/EventCategoryPromptModal';
import { config } from '../config/environment';
import { apiFetch } from '../lib/apiClient';

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
  price_usd?: number;
  price_eur?: number;
  price_cad?: number;
  price_aud?: number;
  price_inr?: number;
  price_jpy?: number;
  price_brl?: number;
  price_mxn?: number;
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
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();

  const params = route.params as { mode?: 'created' | 'booked'; title?: string; userId?: string } | undefined;
  const mode = params?.mode;
  const screenTitle = params?.title || 'All Events';
  const filterUserId = params?.userId;

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
    if (!mode) {
      checkUserPreferences();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, sortBy]);

  const loadEvents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      let data: Event[] | null = null;
      let fetchError: any = null;

      if (mode === 'created' && filterUserId) {
        console.log('🔄 Loading created events for user:', filterUserId);
        const result = await supabase
          .from('events')
          .select('*')
          .eq('creator_id', filterUserId)
          .order('event_date', { ascending: false });
        data = result.data;
        fetchError = result.error;
      } else if (mode === 'booked' && filterUserId) {
        console.log('🔄 Loading booked events for user:', filterUserId);
        const { data: { session } } = await supabase.auth.getSession();
        const [bookedResult, attendeesResult] = await Promise.all([
          session
            ? apiFetch<{ items: any[]; total: number }>('/api/users/me/booked-events', { session })
            : Promise.resolve({ items: [], total: 0 }),
          supabase.from('event_attendees').select('event_id').eq('user_id', filterUserId),
        ]);
        const bookedEventIds = (bookedResult.items || []).map((e: any) => e.id ?? e.event_id);
        const attendeeEventIds = (attendeesResult.data || []).map((a: any) => a.event_id);
        const uniqueEventIds = [...new Set([...bookedEventIds, ...attendeeEventIds])];

        if (uniqueEventIds.length > 0) {
          const result = await supabase
            .from('events')
            .select('*')
            .in('id', uniqueEventIds)
            .order('event_date', { ascending: true });
          data = result.data;
          fetchError = result.error;
        } else {
          data = [];
        }
      } else {
        console.log('🔄 Loading personalized events from Supabase...');
        if (user?.id) {
          const result = await dbHelpers.getPersonalizedEvents(user.id, 50);
          data = result.data;
          fetchError = result.error;
        } else {
          const result = await dbHelpers.getUpcomingEvents(50);
          data = result.data;
          fetchError = result.error;
        }
      }

      if (fetchError) {
        console.error('❌ Error loading events:', fetchError);
        throw fetchError;
      }

      console.log('✅ Events loaded:', data?.length || 0);
      setEvents(data || []);

      // Only run diagnostics in default mode
      if (!mode && (!data || data.length === 0) && user?.id) {
        checkEventDiscoveryHealth();
      }

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
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
        const title = (event.title || '').toLowerCase();
        const location = (event.location || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        return title.includes(query) || location.includes(query) || description.includes(query);
      });
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

  // Diagnostic function to check why events aren't showing
  const checkEventDiscoveryHealth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('⚠️ No session for event discovery health check');
        return;
      }

      console.log('🔍 Running event discovery health check...');
      const response = await fetch(`${config.apiUrl}/user/event-discovery/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const health = await response.json();
        console.log('📊 EVENT DISCOVERY HEALTH CHECK:');
        console.log('   📍 Latitude:', health.latitude ?? 'NOT SET');
        console.log('   📍 Longitude:', health.longitude ?? 'NOT SET');
        console.log('   📏 Preferred Distance:', health.preferredEventDistance ?? 'NOT SET');
        console.log('   🎵 Preferred Genres:', health.preferredEventGenres?.length > 0 ? health.preferredEventGenres.join(', ') : 'NOT SET');
        console.log('   🌍 Location State:', health.locationState ?? 'NOT SET');
        console.log('   🌍 Location Country:', health.locationCountry ?? 'NOT SET');
        console.log('   🔔 Event Notifications:', health.eventNotificationsEnabled ? 'ENABLED' : 'DISABLED');

        // Alert user about missing data
        const issues = [];
        if (!health.latitude || !health.longitude) {
          issues.push('Location coordinates not set - enable location permission');
        }
        if (!health.preferredEventGenres || health.preferredEventGenres.length === 0) {
          issues.push('No event preferences selected');
        }

        if (issues.length > 0) {
          console.warn('⚠️ ISSUES FOUND:', issues.join('; '));
        }
      } else {
        console.warn('⚠️ Event discovery health check failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Error checking event discovery health:', error);
    }
  };

  const checkUserPreferences = async () => {
    if (!user?.id || hasCheckedPreferences) return;

    try {
      // First check if user has set event category preferences in the database
      // Note: The API may use either preferred_event_categories or preferred_event_genres
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('preferred_event_categories, preferred_event_genres')
        .eq('user_id', user.id)
        .single();

      // If user has preferences set (check both possible column names), don't show modal
      const categories = preferences?.preferred_event_categories || preferences?.preferred_event_genres;
      if (categories && categories.length > 0) {
        console.log('✅ User has event preferences set:', categories);
        setHasCheckedPreferences(true);
        return;
      }

      // Check if user has dismissed the modal before
      const dismissed = await AsyncStorage.getItem('event_preference_modal_dismissed');
      if (dismissed === 'true') {
        setHasCheckedPreferences(true);
        return;
      }

      // Show modal if no preferences set AND user hasn't dismissed it
      console.log('📢 Showing event preference modal - no preferences set');
      setTimeout(() => {
        setShowPreferenceModal(true);
      }, 1500);

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

  const handleSelectPreferences = async () => {
    setShowPreferenceModal(false);
    // Mark modal as dismissed since user is going to set preferences
    await AsyncStorage.setItem('event_preference_modal_dismissed', 'true');
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

  const getEventPrice = (eventData: Event): { currency: string; amount: number } | null => {
    const currencyOrder = [
      'GBP',
      'NGN',
      'USD',
      'EUR',
      'CAD',
      'AUD',
      'INR',
      'JPY',
      'BRL',
      'MXN',
    ];

    for (const currency of currencyOrder) {
      const fieldName = `price_${currency.toLowerCase()}` as keyof Event;
      const value = eventData[fieldName];
      if (typeof value === 'number' && value >= 0) {
        return { currency, amount: value };
      }
    }

    return null;
  };

  const formatEventPrice = (eventData: Event) => {
    const priceInfo = getEventPrice(eventData);
    if (!priceInfo) return null;
    if (priceInfo.amount === 0) return 'FREE';

    const symbols: Record<string, string> = {
      GBP: '£',
      NGN: '₦',
      USD: '$',
      EUR: '€',
      CAD: '$',
      AUD: '$',
      INR: '₹',
      JPY: '¥',
      BRL: 'R$',
      MXN: '$',
    };

    const symbol = symbols[priceInfo.currency] || `${priceInfo.currency} `;
    const formattedAmount = priceInfo.currency === 'NGN'
      ? priceInfo.amount.toLocaleString()
      : priceInfo.amount.toString();

    return `${symbol}${formattedAmount}`;
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
          {formatEventPrice(event) && (
            <View style={[styles.priceTag, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.priceText, { color: theme.colors.primary }]}>
                {formatEventPrice(event)}
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
          {screenTitle} ({filteredEvents.length})
        </Text>
        <View style={{ width: 40 }} />
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
        ListHeaderComponent={
          !mode ? (
            <View style={[styles.infoNote, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={[styles.infoNoteText, { color: theme.colors.textSecondary }]}>
                Showing events created by SoundBridge artists. External events are on the Discover tab.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {searchQuery ? 'No events found' : mode === 'created' ? 'No events created yet' : mode === 'booked' ? 'No booked events' : 'No SoundBridge events yet'}
            </Text>
            {searchQuery ? (
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Try adjusting your search
              </Text>
            ) : mode === 'created' ? (
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                You haven't created any events yet
              </Text>
            ) : mode === 'booked' ? (
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                You haven't booked any events yet
              </Text>
            ) : (
              <>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  This screen shows events created directly by artists on SoundBridge.
                </Text>

                <View style={[styles.whyCreateBox, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: theme.colors.primary + '40' }]}>
                  <Text style={[styles.whyCreateTitle, { color: theme.colors.text }]}>
                    Are you an artist? Create your event here
                  </Text>
                  <View style={styles.whyCreateItem}>
                    <Ionicons name="megaphone-outline" size={15} color={theme.colors.primary} style={styles.whyCreateIcon} />
                    <Text style={[styles.whyCreateText, { color: theme.colors.textSecondary }]}>
                      Free promotion — your event is automatically shown to nearby fans who follow your genre. No ad spend needed.
                    </Text>
                  </View>
                  <View style={styles.whyCreateItem}>
                    <Ionicons name="people-outline" size={15} color={theme.colors.primary} style={styles.whyCreateIcon} />
                    <Text style={[styles.whyCreateText, { color: theme.colors.textSecondary }]}>
                      Right audience only — fans who opted in for your event category (Gospel Concert, Jazz Room, etc.) get notified, not random people.
                    </Text>
                  </View>
                  <View style={styles.whyCreateItem}>
                    <Ionicons name="cash-outline" size={15} color={theme.colors.primary} style={styles.whyCreateIcon} />
                    <Text style={[styles.whyCreateText, { color: theme.colors.textSecondary }]}>
                      Keep 85% of ticket revenue — just a 15% platform fee, with no advertising costs eating into your earnings.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.goBackTip} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                  <Ionicons name="arrow-back-outline" size={14} color={theme.colors.primary} />
                  <Text style={[styles.goBackTipText, { color: theme.colors.primary }]}>
                    Looking for concerts to attend? Go back and tap "Get Tickets" on any external event.
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    color: '#c62828',
    textAlign: 'center',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    lineHeight: 40,
    fontSize: 34,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 16,
    marginRight: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 14,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 18,
    marginBottom: 8,
  },
  eventDate: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 14,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventLocation: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 14,
    flex: 1,
  },
  distanceText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 12,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 12,
  },
  eventDescription: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
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
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infoNoteText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  whyCreateBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginHorizontal: 4,
    width: '100%',
  },
  whyCreateTitle: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '600',
    letterSpacing: -0.4,
    fontSize: 15,
    marginBottom: 14,
  },
  whyCreateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  whyCreateIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  whyCreateText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '300',
    letterSpacing: -0.4,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  goBackTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 4,
    gap: 6,
  },
  goBackTipText: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '400',
    letterSpacing: -0.4,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});