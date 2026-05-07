import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { venueService, VenueDisplayItem } from '../services/VenueService';
import { SystemTypography as Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

type RouteParams = {
  VenueDetail: { venue: VenueDisplayItem };
};

function StarRating({ rating }: { rating: number }) {
  const { theme } = useTheme();
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array(full).fill(null).map((_, i) => (
        <Ionicons key={`f${i}`} name="star" size={14} color="#FBBF24" />
      ))}
      {half && <Ionicons name="star-half" size={14} color="#FBBF24" />}
      {Array(empty).fill(null).map((_, i) => (
        <Ionicons key={`e${i}`} name="star-outline" size={14} color={theme.colors.textSecondary} />
      ))}
    </View>
  );
}

export default function VenueDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'VenueDetail'>>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [venue, setVenue] = useState<VenueDisplayItem>(route.params.venue);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // If it's a SoundBridge venue, refresh from DB to get latest data
  useEffect(() => {
    if (venue.source === 'soundbridge') {
      setLoading(true);
      venueService.getSoundbridgeVenueById(venue.id).then((fresh) => {
        if (fresh) setVenue(fresh);
        setLoading(false);
      });
    }
  }, [venue.id, venue.source]);

  const allPhotos = [
    ...(venue.photo_url ? [venue.photo_url] : []),
    ...(venue.photos?.filter((p) => p !== venue.photo_url) ?? []),
  ];

  const rateLabel = venueService.formatRate(venue.daily_rate, venue.hourly_rate, venue.currency);

  const handlePrimaryAction = useCallback(() => {
    if (venue.external_booking_link) {
      venueService.openVenueExternally(venue);
    } else if (venue.contact_email || venue.contact_phone) {
      const lines: string[] = [];
      if (venue.contact_email) lines.push(`Email: ${venue.contact_email}`);
      if (venue.contact_phone) lines.push(`Phone: ${venue.contact_phone}`);
      Alert.alert('Contact Venue', lines.join('\n'), [{ text: 'OK' }]);
    } else {
      venueService.openVenueExternally(venue);
    }
  }, [venue]);

  const handleViewOnMap = useCallback(() => {
    venueService.openVenueExternally({ ...venue, website: undefined, external_booking_link: undefined });
  }, [venue]);

  const primaryLabel = venue.external_booking_link
    ? 'Book Now'
    : venue.contact_email || venue.contact_phone
    ? 'Contact Venue'
    : 'View on Google Maps';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <TouchableOpacity onPress={handleViewOnMap} style={styles.mapHeaderBtn}>
            <Ionicons name="map-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}

          {/* Photo carousel */}
          {allPhotos.length > 0 ? (
            <View style={styles.photoSection}>
              <Image
                source={{ uri: allPhotos[photoIndex] }}
                style={styles.mainPhoto}
                resizeMode="cover"
              />
              {/* Source badge */}
              <View style={[styles.sourceBadge, {
                backgroundColor: venue.source === 'soundbridge' ? '#059669' : '#2563EB',
              }]}>
                <Text style={styles.sourceBadgeText}>
                  {venue.source === 'soundbridge' ? 'ON SOUNDBRIDGE' : 'GOOGLE PLACES'}
                </Text>
              </View>
              {/* Thumbnail strip */}
              {allPhotos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbStrip}
                  contentContainerStyle={styles.thumbContent}
                >
                  {allPhotos.map((uri, i) => (
                    <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)}>
                      <Image
                        source={{ uri }}
                        style={[
                          styles.thumb,
                          i === photoIndex && { borderColor: theme.colors.primary, borderWidth: 2 },
                        ]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="business-outline" size={64} color={theme.colors.textSecondary} />
              <View style={[styles.sourceBadge, {
                backgroundColor: venue.source === 'soundbridge' ? '#059669' : '#2563EB',
                position: 'absolute', top: 16, left: 16,
              }]}>
                <Text style={styles.sourceBadgeText}>
                  {venue.source === 'soundbridge' ? 'ON SOUNDBRIDGE' : 'GOOGLE PLACES'}
                </Text>
              </View>
            </View>
          )}

          {/* Main info card */}
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.venueName, { color: theme.colors.text }]}>{venue.name}</Text>

            {/* Type + Rating row */}
            <View style={styles.metaRow}>
              {venue.venue_type && (
                <View style={[styles.typePill, { backgroundColor: theme.colors.primary + '22' }]}>
                  <Text style={[styles.typePillText, { color: theme.colors.primary }]}>{venue.venue_type}</Text>
                </View>
              )}
              {venue.rating != null && (
                <View style={styles.ratingRow}>
                  <StarRating rating={venue.rating} />
                  <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                    {venue.rating.toFixed(1)}
                    {venue.rating_count ? ` (${venue.rating_count.toLocaleString()})` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Address */}
            {venue.address ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>{venue.address}</Text>
              </View>
            ) : null}

            {/* Distance */}
            {venue.distance_km != null && (
              <View style={styles.infoRow}>
                <Ionicons name="navigate-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {venue.distance_km < 1
                    ? `${Math.round(venue.distance_km * 1000)}m away`
                    : `${venue.distance_km.toFixed(1)}km away`}
                </Text>
              </View>
            )}

            {/* Capacity */}
            {venue.capacity != null && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  Capacity: {venue.capacity.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Pricing card — SoundBridge venues only */}
          {(venue.daily_rate != null || venue.hourly_rate != null) && (
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Rental Pricing</Text>
              {venue.daily_rate != null && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Daily rate</Text>
                  <Text style={[styles.priceValue, { color: theme.colors.primary }]}>
                    {venueService.formatRate(venue.daily_rate, null, venue.currency) ?? '—'}
                  </Text>
                </View>
              )}
              {venue.hourly_rate != null && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Hourly rate</Text>
                  <Text style={[styles.priceValue, { color: theme.colors.primary }]}>
                    {venueService.formatRate(null, venue.hourly_rate, venue.currency) ?? '—'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {venue.description ? (
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>About</Text>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{venue.description}</Text>
            </View>
          ) : null}

          {/* Available dates */}
          {venue.available_dates && venue.available_dates.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Available Dates</Text>
              <View style={styles.datesWrap}>
                {venue.available_dates.map((d, i) => (
                  <View key={i} style={[styles.datePill, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
                    <Text style={[styles.datePillText, { color: theme.colors.text }]}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handlePrimaryAction}
              activeOpacity={0.85}
            >
              <Ionicons
                name={venue.external_booking_link ? 'open-outline' : venue.contact_email ? 'mail-outline' : 'map-outline'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              onPress={handleViewOnMap}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.secondaryBtnText, { color: theme.colors.text }]}>View on Map</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.button,
    flex: 1,
    fontSize: 18,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  mapHeaderBtn: { padding: 4 },
  content: { paddingBottom: 40 },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  photoSection: { position: 'relative' },
  mainPhoto: { width, height: 240 },
  photoPlaceholder: {
    width,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sourceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sourceBadgeText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  thumbStrip: { marginTop: 8 },
  thumbContent: { paddingHorizontal: 16, gap: 8 },
  thumb: { width: 60, height: 60, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  venueName: {
    ...Typography.headerMedium,
    fontSize: 22,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typePillText: { ...Typography.label, fontSize: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { ...Typography.label, fontSize: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  infoText: { ...Typography.body, fontSize: 14, flex: 1, lineHeight: 20 },
  cardTitle: { ...Typography.headerMedium, fontSize: 18, marginBottom: 12 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: { ...Typography.body, fontSize: 14 },
  priceValue: { ...Typography.button, fontSize: 18 },
  description: { ...Typography.body, fontSize: 14, lineHeight: 22 },
  datesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  datePillText: { ...Typography.label, fontSize: 12 },
  actions: { paddingHorizontal: 16, paddingTop: 24, gap: 12 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: { ...Typography.button, fontSize: 15 },
});
