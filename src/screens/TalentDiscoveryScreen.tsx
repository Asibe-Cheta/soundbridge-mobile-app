/**
 * TalentDiscoveryScreen
 * Category-selection entry point for talent discovery — shared by event organisers
 * and industry professionals. Built as horizontal-scrolling rows matching the
 * existing Discover screen's row pattern (section header + horizontal FlatList),
 * reusing FeaturedCreatorCard — the exact card component DiscoverScreen uses for
 * its own "Featured Artists" row — for the live creator previews in each role row.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import FeaturedCreatorCard, { FeaturedCreatorCardData } from '../components/FeaturedCreatorCard';
import genreService, { Genre } from '../services/GenreService';
import { supabase } from '../lib/supabase';
import type { TalentCategory } from '../utils/talentCategoryLabels';

interface RoleRow {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  categories: TalentCategory[];
}

const PREVIEW_LIMIT = 10;
const PROFILE_FIELDS = 'id, username, display_name, avatar_url, followers_count';

// Each row queries user_talent_categories directly — the single consistent data
// source (backend-inferred + self-identified) populated per TALENT_DISCOVERY_ADDITIONS.MD.
// Session Musicians/Instrumentalists is now included: that category didn't exist in the
// data model when TALENT_DISCOVERY_SCREEN.MD was written (it explicitly said to omit the
// row until it did), but this addition creates it.
const ROLE_ROWS: RoleRow[] = [
  {
    key: 'audio-engineers',
    icon: 'mic',
    title: 'Audio Engineers & Producers',
    categories: ['audio_engineer', 'producer'],
  },
  {
    key: 'djs',
    icon: 'disc',
    title: 'DJs',
    categories: ['dj'],
  },
  {
    key: 'podcasters',
    icon: 'radio',
    title: 'Podcasters',
    categories: ['podcaster'],
  },
  {
    key: 'session-musicians',
    icon: 'people',
    title: 'Session Musicians & Instrumentalists',
    categories: ['session_musician', 'instrumentalist'],
  },
];

export default function TalentDiscoveryScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [previewsByRow, setPreviewsByRow] = useState<Record<string, FeaturedCreatorCardData[]>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});

  useEffect(() => {
    genreService.getMusicGenres().then((data) => {
      setGenres(data);
      setLoadingGenres(false);
    });

    ROLE_ROWS.forEach((row) => loadRowPreview(row));
  }, []);

  const loadRowPreview = async (row: RoleRow) => {
    setLoadingPreviews((prev) => ({ ...prev, [row.key]: true }));
    try {
      let results: FeaturedCreatorCardData[] = [];

      const { data: catRows } = await supabase
        .from('user_talent_categories')
        .select('user_id')
        .in('category', row.categories)
        .limit(PREVIEW_LIMIT);

      const userIds = Array.from(new Set((catRows ?? []).map((r: any) => r.user_id)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', userIds);
        results = profiles ?? [];
      }

      setPreviewsByRow((prev) => ({ ...prev, [row.key]: results }));
    } catch (error) {
      console.error(`❌ Error loading talent preview for ${row.key}:`, error);
      setPreviewsByRow((prev) => ({ ...prev, [row.key]: [] }));
    } finally {
      setLoadingPreviews((prev) => ({ ...prev, [row.key]: false }));
    }
  };

  const openResults = (params: { categories: TalentCategory[]; genre?: string; title: string }) => {
    navigation.navigate('TalentDiscoveryResults', params);
  };

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Discover Talent</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Musicians & Singers — horizontal scroll of genre sub-categories */}
          <View style={[styles.section, styles.firstSection]}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="musical-notes" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Musicians & Singers</Text>
              </View>
            </View>

            {loadingGenres ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginLeft: 24 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreScroll}>
                <TouchableOpacity
                  style={[styles.genreChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => openResults({ categories: ['musician'], title: 'Musicians & Singers' })}
                >
                  <Text style={[styles.genreChipText, { color: theme.colors.text }]}>All</Text>
                </TouchableOpacity>
                {genres.map((genre) => (
                  <TouchableOpacity
                    key={genre.id}
                    style={[styles.genreChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => openResults({ categories: ['musician'], genre: genre.name, title: `Musicians & Singers · ${genre.name}` })}
                  >
                    <Text style={[styles.genreChipText, { color: theme.colors.text }]}>{genre.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Audio Engineers & Producers / DJs / Podcasters — each its own horizontal row of live creator previews */}
          {ROLE_ROWS.map((row) => {
            const previews = previewsByRow[row.key] ?? [];
            const loading = loadingPreviews[row.key];
            return (
              <View key={row.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={row.icon} size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{row.title}</Text>
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => openResults({ categories: row.categories, title: row.title })}
                  >
                    <Text style={[Typography.label, { color: theme.colors.primary, fontSize: 14, marginRight: 4 }]}>See all</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator color={theme.colors.primary} style={{ marginLeft: 24 }} />
                ) : previews.length > 0 ? (
                  <FlatList
                    horizontal
                    data={previews}
                    renderItem={({ item, index }) => (
                      <FeaturedCreatorCard
                        creator={item}
                        isFirst={index === 0}
                        badgeLabel={null}
                        onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.id })}
                      />
                    )}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 24 }}
                    ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
                  />
                ) : (
                  <Text style={[styles.quietEmpty, { color: theme.colors.textSecondary }]}>No {row.title.toLowerCase()} yet</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
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
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
  scrollContent: { paddingBottom: 40 },
  // Matches DiscoverScreen's section/firstSection/sectionHeader/sectionTitle exactly.
  section: { marginBottom: 24 },
  firstSection: { marginTop: 0, paddingTop: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
  },
  genreScroll: { paddingHorizontal: 24, gap: 8 },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  genreChipText: {
    ...Typography.label,
    fontSize: 13,
    fontWeight: '600',
  },
  quietEmpty: {
    ...Typography.label,
    fontSize: 13,
    marginLeft: 24,
  },
});
