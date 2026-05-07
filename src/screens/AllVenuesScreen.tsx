import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { venueService, VenueDisplayItem } from '../services/VenueService';
import VenuePreferencesModal from '../components/VenuePreferencesModal';
import { SystemTypography as Typography } from '../constants/Typography';

type RouteParams = {
  AllVenues: { source?: 'soundbridge' | 'google_places' };
};

function VenueRow({ venue, onPress }: { venue: VenueDisplayItem; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {venue.photo_url ? (
        <Image source={{ uri: venue.photo_url }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="business-outline" size={32} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>{venue.name}</Text>
          <View style={[styles.sourceDot, {
            backgroundColor: venue.source === 'soundbridge' ? '#059669' : '#2563EB',
          }]} />
        </View>
        {venue.venue_type ? (
          <View style={[styles.typePill, { backgroundColor: theme.colors.primary + '22' }]}>
            <Text style={[styles.typePillText, { color: theme.colors.primary }]}>{venue.venue_type}</Text>
          </View>
        ) : null}
        {venue.address ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{venue.address}</Text>
          </View>
        ) : null}
        <View style={styles.bottomRow}>
          {venue.rating != null && (
            <View style={styles.metaRow}>
              <Ionicons name="star" size={13} color="#FBBF24" />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {venue.rating.toFixed(1)}{venue.rating_count ? ` (${venue.rating_count.toLocaleString()})` : ''}
              </Text>
            </View>
          )}
          {(venue.daily_rate != null || venue.hourly_rate != null) && (
            <Text style={[styles.rateText, { color: theme.colors.primary }]}>
              {venueService.formatRate(venue.daily_rate, venue.hourly_rate, venue.currency)}
            </Text>
          )}
          {venue.distance_km != null && (
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {venue.distance_km < 1
                ? `${Math.round(venue.distance_km * 1000)}m`
                : `${venue.distance_km.toFixed(1)}km`}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AllVenuesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AllVenues'>>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const sourceFilter = route.params?.source;

  const [sbVenues, setSbVenues] = useState<VenueDisplayItem[]>([]);
  const [gpVenues, setGpVenues] = useState<VenueDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const loc = await venueService.requestLocation();
    if (!loc) {
      setLocationDenied(true);
      setLoading(false);
      return;
    }
    setLocationDenied(false);
    if (!sourceFilter || sourceFilter === 'soundbridge') {
      const v = await venueService.getSoundbridgeVenues(loc.lat, loc.lng, 50);
      setSbVenues(v);
    }
    if (!sourceFilter || sourceFilter === 'google_places') {
      const v = await venueService.getNearbyPlacesVenues(loc.lat, loc.lng, 20);
      setGpVenues(v);
    }
    setLoading(false);
  }, [sourceFilter]);

  useEffect(() => { load(); }, [load]);

  const title = sourceFilter === 'soundbridge'
    ? 'SoundBridge Venues'
    : sourceFilter === 'google_places'
    ? 'Nearby Venues'
    : 'All Venues';

  type ListItem =
    | { type: 'header'; label: string; color: string }
    | { type: 'venue'; venue: VenueDisplayItem };

  const listData: ListItem[] = [];
  if (!sourceFilter || sourceFilter === 'soundbridge') {
    if (sbVenues.length > 0) {
      listData.push({ type: 'header', label: 'On SoundBridge', color: '#059669' });
      sbVenues.forEach((v) => listData.push({ type: 'venue', venue: v }));
    }
  }
  if (!sourceFilter || sourceFilter === 'google_places') {
    if (gpVenues.length > 0) {
      listData.push({ type: 'header', label: 'Nearby Venues', color: '#2563EB' });
      gpVenues.forEach((v) => listData.push({ type: 'venue', venue: v }));
    }
  }

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
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={() => setShowPrefs(true)} style={styles.headerBtn}>
            <Ionicons name="options-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : locationDenied ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="location-outline" size={56} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Location access needed</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              Enable location permissions to discover nearby venues
            </Text>
          </View>
        ) : listData.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="business-outline" size={56} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No venues found</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              No venues found in your area yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, i) => item.type === 'header' ? `header-${i}` : item.venue.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{item.label}</Text>
                  </View>
                );
              }
              return (
                <VenueRow
                  venue={item.venue}
                  onPress={() => navigation.navigate('VenueDetail', { venue: item.venue })}
                />
              );
            }}
          />
        )}
      </SafeAreaView>

      {user && (
        <VenuePreferencesModal
          visible={showPrefs}
          userId={user.id}
          onClose={() => setShowPrefs(false)}
        />
      )}
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
  headerBtn: { padding: 4 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { ...Typography.button, fontSize: 16, marginTop: 16, marginBottom: 8 },
  emptySub: { ...Typography.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  listContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionLabel: { ...Typography.headerMedium, fontSize: 18 },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: { width: 100, height: 100 },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, padding: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardName: { ...Typography.button, flex: 1, fontSize: 16 },
  sourceDot: { width: 8, height: 8, borderRadius: 4 },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  typePillText: { ...Typography.label, fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaText: { ...Typography.label, fontSize: 12, flex: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  rateText: { ...Typography.button, fontSize: 14 },
});
