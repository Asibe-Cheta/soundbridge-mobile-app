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
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { venueService, VenueDisplayItem } from '../services/VenueService';
import PostAvailabilityModal from '../components/PostAvailabilityModal';
import { SystemTypography as Typography } from '../constants/Typography';

export default function MyVenuesScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [venues, setVenues] = useState<VenueDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueDisplayItem | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const result = await venueService.getMyVenues(user.id);
    setVenues(result);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleDelete = useCallback((item: VenueDisplayItem) => {
    Alert.alert(
      'Delete Venue',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            const ok = await venueService.deleteVenue(item.id, user.id);
            if (ok) {
              setVenues(prev => prev.filter(v => v.id !== item.id));
            } else {
              Alert.alert('Error', 'Failed to delete venue. Please try again.');
            }
          },
        },
      ]
    );
  }, [user]);

  const renderVenue = useCallback(({ item }: { item: VenueDisplayItem }) => {
    const rate = venueService.formatRate(item.daily_rate, item.hourly_rate, item.currency);
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {/* Hero image */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('VenueDetail', { venue: item })}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[theme.colors.primary + '44', theme.colors.primary + '18']}
              style={[styles.heroImage, { justifyContent: 'center', alignItems: 'center' }]}
            >
              <Ionicons name="business-outline" size={52} color={theme.colors.primary} />
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Info section */}
        <View style={[styles.cardInfo, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.address ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
            </View>
          ) : null}
          {rate ? (
            <View style={styles.metaRow}>
              <Ionicons name="cash-outline" size={13} color={theme.colors.primary} />
              <Text style={[styles.rateText, { color: theme.colors.primary }]}>{rate}</Text>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={[styles.cardActions, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}
            onPress={() => setSelectedVenue(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Post Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}
            onPress={() => navigation.navigate('VenueDetail', { venue: item })}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>View Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [theme, navigation, handleDelete]);

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Venues</Text>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('ListVenue')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="business-outline" size={56} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No venues listed yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              List your venue and announce availability to reach users looking for a space like yours.
            </Text>
            <TouchableOpacity
              style={[styles.listBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('ListVenue')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.listBtnText}>List a Venue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={venues}
            keyExtractor={(item, i) => item.id || `venue-${i}`}
            renderItem={renderVenue}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            ListFooterComponent={
              <TouchableOpacity
                style={[styles.addMoreBtn, { borderColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('ListVenue')}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.addMoreText, { color: theme.colors.primary }]}>List Another Venue</Text>
              </TouchableOpacity>
            }
          />
        )}
      </SafeAreaView>

      {selectedVenue && (
        <PostAvailabilityModal
          visible={!!selectedVenue}
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onPosted={() => setSelectedVenue(null)}
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
  headerTitle: { ...Typography.button, flex: 1, fontSize: 18, textAlign: 'center', marginHorizontal: 8 },
  headerBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { ...Typography.button, fontSize: 17, marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptySub: { ...Typography.body, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  listBtnText: { ...Typography.button, color: '#FFFFFF', fontSize: 15 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  cardInfo: {
    padding: 14,
    gap: 6,
    borderBottomWidth: 1,
  },
  cardName: { ...Typography.button, fontSize: 17, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...Typography.label, fontSize: 13, flex: 1 },
  rateText: { ...Typography.button, fontSize: 13 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 0,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  actionLabel: { ...Typography.button, fontSize: 12 },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addMoreText: { ...Typography.button, fontSize: 15 },
});
