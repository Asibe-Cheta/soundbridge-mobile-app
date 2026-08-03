/**
 * TalentDiscoveryResultsScreen
 * Part B of Talent Discovery — 2-column creator grid for a category selected in
 * TalentDiscoveryScreen, with a sort/filter bar (Most Followed, Recently Active, Nearest).
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import CreatorGridCard from '../components/CreatorGridCard';
import { supabase } from '../lib/supabase';
import { serviceDiscoveryService } from '../services/ServiceDiscoveryService';
import type { TalentCategory } from '../utils/talentCategoryLabels';

interface TalentResult {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  genre?: string | null;
  followers_count?: number | null;
  tracks_count?: number | null;
  last_active?: string | null;
  institution_badge?: string | null;
  _lat?: number | null;
  _lng?: number | null;
}

type SortOption = 'followers' | 'active' | 'nearest';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'followers', label: 'Most Followed' },
  { key: 'active', label: 'Recently Active' },
  { key: 'nearest', label: 'Nearest' },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// NOTE: tracks_count is NOT a column on profiles (it's always computed —
// see dbHelpers.getCreatorsWithStats in src/lib/supabase.ts). Selecting it
// directly errors the whole query silently (no `error` check here), which is
// why results were always empty. Fetched separately below instead.
const PROFILE_FIELDS = 'id, username, display_name, bio, avatar_url, location, genre, followers_count, last_active, institution_badge';

// Large categories (musician: 500+, session_musician: 490+) blow past URL length
// limits when every matching id is stuffed into a single `.in(...)` filter —
// that request fails outright, which is why big categories returned nothing
// while the underlying data/RLS were both fine. Batch every `.in()` call that
// can receive a large id list instead of sending them all in one request.
const BATCH_SIZE = 100;
async function fetchInBatches<T>(
  ids: string[],
  fetcher: (batch: string[]) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { data, error } = await fetcher(batch);
    if (error) throw error;
    if (data) out.push(...data);
  }
  return out;
}

export default function TalentDiscoveryResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const { categories, genre, title } = (route.params ?? {}) as {
    categories?: TalentCategory[];
    genre?: string;
    title?: string;
  };

  const [results, setResults] = useState<TalentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('followers');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!categories || categories.length === 0) { setResults([]); return; }

      let userIds: string[];

      if (genre) {
        // profiles.genre is a dead column (never written) and profiles.genres stores
        // genre IDs, not names — the only reliable, populated, name-string genre
        // signal is per-track (audio_tracks.genre, set directly from the upload
        // picker). A genre-tagged music track is itself sufficient evidence of
        // being a musician, so this queries audio_tracks directly rather than
        // first pulling every musician id from user_talent_categories (which,
        // for a category with hundreds of members, would otherwise need to be
        // passed into a follow-up `.in()` filter — exactly the large-array
        // problem this rewrite avoids).
        const { data, error } = await supabase
          .from('audio_tracks')
          .select('creator_id')
          .eq('content_type', 'music')
          .ilike('genre', genre);
        if (error) throw error;
        userIds = Array.from(new Set((data ?? []).map((r: any) => r.creator_id)));
      } else {
        const { data, error } = await supabase
          .from('user_talent_categories')
          .select('user_id')
          .in('category', categories);
        if (error) throw error;
        userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      }

      if (userIds.length === 0) { setResults([]); return; }

      const profiles = await fetchInBatches(userIds, (batch) =>
        supabase.from('profiles').select(PROFILE_FIELDS).in('id', batch)
      );

      // Service-provider categories (e.g. Audio Engineers) carry lat/lng, which plain
      // profiles don't — pull it in for whichever of these users also has that row,
      // so "Nearest" sort still works for them.
      const providers = await fetchInBatches(userIds, (batch) =>
        supabase.from('service_provider_profiles').select('user_id, latitude, longitude').in('user_id', batch)
      );
      const coordsByUser = new Map(providers.map((p: any) => [p.user_id, { lat: p.latitude, lng: p.longitude }]));

      // tracks_count isn't a real column — tally it from audio_tracks in one round trip.
      const trackRows = await fetchInBatches(userIds, (batch) =>
        supabase.from('audio_tracks').select('creator_id').in('creator_id', batch)
      );
      const tracksCountByUser = new Map<string, number>();
      trackRows.forEach((t: any) => {
        tracksCountByUser.set(t.creator_id, (tracksCountByUser.get(t.creator_id) ?? 0) + 1);
      });

      setResults(profiles.map((p: any) => ({
        ...p,
        tracks_count: tracksCountByUser.get(p.id) ?? 0,
        _lat: coordsByUser.get(p.id)?.lat ?? null,
        _lng: coordsByUser.get(p.id)?.lng ?? null,
      })));
    } catch (error: any) {
      console.error('❌ Error loading talent discovery results:', error);
      setLoadError(error?.message || 'Something went wrong loading results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [categories, genre]);

  useEffect(() => { load(); }, [load]);

  const handleSortPress = async (option: SortOption) => {
    setSortBy(option);
    if (option === 'nearest' && !userCoords && !locatingUser) {
      setLocatingUser(true);
      const coords = await serviceDiscoveryService.requestLocation();
      setUserCoords(coords);
      setLocatingUser(false);
    }
  };

  const sortedResults = useMemo(() => {
    const list = [...results];
    if (sortBy === 'followers') {
      return list.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
    }
    if (sortBy === 'active') {
      return list.sort((a, b) => {
        const aTime = a.last_active ? new Date(a.last_active).getTime() : 0;
        const bTime = b.last_active ? new Date(b.last_active).getTime() : 0;
        return bTime - aTime;
      });
    }
    if (sortBy === 'nearest' && userCoords) {
      const withCoords = list.filter((r) => r._lat != null && r._lng != null);
      if (withCoords.length > 0) {
        return withCoords.sort(
          (a, b) =>
            haversineKm(userCoords.lat, userCoords.lng, a._lat!, a._lng!) -
            haversineKm(userCoords.lat, userCoords.lng, b._lat!, b._lng!)
        );
      }
      // No results carry coordinates yet — leave order unchanged rather than show nothing.
      return list;
    }
    return list;
  }, [results, sortBy, userCoords]);

  const renderCard = ({ item }: { item: TalentResult }) => (
    <CreatorGridCard
      creator={item}
      onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.id })}
    />
  );

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
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {title || 'Talent'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.sortBar}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortPill,
                {
                  backgroundColor: sortBy === option.key ? theme.colors.primary + '20' : theme.colors.card,
                  borderColor: sortBy === option.key ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => handleSortPress(option.key)}
            >
              {option.key === 'nearest' && locatingUser ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.sortPillText, { color: sortBy === option.key ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {option.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={sortedResults}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={loadError ? 'warning-outline' : 'people-outline'}
                  size={56}
                  color={loadError ? '#EF4444' : theme.colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {loadError ? `Couldn't load results: ${loadError}` : 'No creators found in this category yet'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
    marginHorizontal: 8,
  },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  sortPillText: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { justifyContent: 'space-between' },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
