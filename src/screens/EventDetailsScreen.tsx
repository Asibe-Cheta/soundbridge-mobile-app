import React, { useState, useEffect } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  venue?: string;
  category: string;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees?: number;
  image_url?: string;
  cover_image_url?: string;
  organizer_id: string;
  created_at: string;
  organizer?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export default function EventDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { eventId, event: initialEvent } = route.params as { eventId: string; event?: Event };

  const [event, setEvent] = useState<Event | null>(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent);
  const [refreshing, setRefreshing] = useState(false);
  const [isAttending, setIsAttending] = useState(false);

  useEffect(() => {
    loadEventDetails();
    checkAttendanceStatus();
  }, [eventId]);

  const loadEventDetails = async () => {
    if (initialEvent) return; // Skip if we already have event data

    try {
      console.log('🔧 Loading event details:', eventId);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!organizer_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;

      setEvent(data);
      console.log('✅ Event details loaded:', data.title);
    } catch (error) {
      console.error('❌ Error loading event details:', error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const checkAttendanceStatus = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setIsAttending(!!data);
    } catch (error) {
      console.error('❌ Error checking attendance status:', error);
    }
  };

  const handleAttendance = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in to attend events');
      return;
    }

    try {
      if (isAttending) {
        // Remove attendance
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);

        if (error) throw error;

        setIsAttending(false);
        setEvent(prev => prev ? { 
          ...prev, 
          current_attendees: Math.max(0, (prev.current_attendees || 0) - 1) 
        } : null);
      } else {
        // Add attendance
        const { error } = await supabase
          .from('event_attendees')
          .insert({
            user_id: user.id,
            event_id: eventId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setIsAttending(true);
        setEvent(prev => prev ? { 
          ...prev, 
          current_attendees: (prev.current_attendees || 0) + 1 
        } : null);
      }
    } catch (error) {
      console.error('❌ Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance status');
    }
  };

  const handleShare = () => {
    Alert.alert('Share Event', 'Share this event with your friends!');
  };

  const handleGetDirections = () => {
    if (event?.location) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(event.location)}`;
      Linking.openURL(url);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadEventDetails(), checkAttendanceStatus()]);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatPrice = (priceGbp?: number, priceNgn?: number) => {
    if (priceGbp === 0 || priceNgn === 0) return 'Free';
    if (priceGbp) return `£${priceGbp}`;
    if (priceNgn) return `₦${priceNgn.toLocaleString()}`;
    return 'Price TBA';
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
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading event...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!event) {
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
          <View style={styles.errorContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>Event not found</Text>
            <BackButton
              label="Go Back"
              style={{ marginTop: 24 }}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Return to previous screen"
            />
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
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton style={styles.headerButton} onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image */}
        {(event.image_url || event.cover_image_url) && (
          <Image 
            source={{ uri: event.image_url || event.cover_image_url }} 
            style={styles.eventImage} 
          />
        )}

        <View style={styles.contentContainer}>
          {/* Event Title & Category */}
          <View style={styles.titleSection}>
            <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
            <View style={[styles.categoryTag, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.categoryText, { color: theme.colors.primary }]}>{event.category}</Text>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Date & Time</Text>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {formatDate(event.event_date)}
                </Text>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {formatTime(event.event_date)}
                </Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Location</Text>
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {event.venue || event.location}
                </Text>
                {event.venue && event.venue !== event.location && (
                  <Text style={[styles.infoSubtext, { color: theme.colors.textSecondary }]}>
                    {event.location}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
                <Ionicons name="navigate-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={20} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Price</Text>
                <Text style={[styles.priceText, { color: theme.colors.text }]}>
                  {formatPrice(event.price_gbp, event.price_ngn)}
                </Text>
              </View>
            </View>
          </View>

          {/* Attendees */}
          {event.max_attendees && (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Attendees</Text>
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    {event.current_attendees || 0} / {event.max_attendees} attending
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Organizer */}
          {event.organizer && (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Organized by</Text>
                  <View style={styles.organizerRow}>
                    {event.organizer.avatar_url ? (
                      <Image source={{ uri: event.organizer.avatar_url }} style={styles.organizerAvatar} />
                    ) : (
                      <View style={[styles.defaultOrganizerAvatar, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.organizerName, { color: theme.colors.text }]}>
                      {event.organizer.display_name}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                {event.description}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.attendButton,
                {
                  backgroundColor: isAttending ? theme.colors.surface : theme.colors.primary,
                  borderColor: theme.colors.primary,
                }
              ]}
              onPress={handleAttendance}
            >
              <Ionicons 
                name={isAttending ? "checkmark-circle" : "add-circle-outline"} 
                size={20} 
                color={isAttending ? theme.colors.primary : '#FFFFFF'} 
              />
              <Text
                style={[
                  styles.attendButtonText,
                  { color: isAttending ? theme.colors.primary : '#FFFFFF' }
                ]}
              >
                {isAttending ? 'Attending' : 'Attend Event'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color={theme.colors.text} />
              <Text style={[styles.shareButtonText, { color: theme.colors.text }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 32,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  directionsButton: {
    padding: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  organizerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  defaultOrganizerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  attendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  attendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
