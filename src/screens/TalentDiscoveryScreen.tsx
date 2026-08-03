/**
 * TalentDiscoveryScreen
 * Category-selection entry point for talent discovery (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD) — shared by event organisers and
 * industry professionals. A single horizontal-scrolling row of 5 category
 * cards; each card represents the CATEGORY itself, not a live creator
 * preview. Tapping "Musicians & Singers" pushes a genre sub-screen; every
 * other category goes straight to the results grid.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import TalentCategoryCard from '../components/TalentCategoryCard';
import FeaturedCreatorCard, { FeaturedCreatorCardData } from '../components/FeaturedCreatorCard';
import { supabase } from '../lib/supabase';
import type { TalentCategory } from '../utils/talentCategoryLabels';

interface TopLevelCategory {
  key: string;
  icon: React.ComponentProps<typeof TalentCategoryCard>['icon'];
  title: string;
  categories?: TalentCategory[];
  hasSubScreen?: boolean;
}

const TOP_LEVEL_CATEGORIES: TopLevelCategory[] = [
  { key: 'musicians', icon: 'musical-notes', title: 'Musicians & Singers', hasSubScreen: true },
  { key: 'djs', icon: 'disc', title: 'DJs', categories: ['dj'] },
  { key: 'podcasters', icon: 'radio', title: 'Podcasters', categories: ['podcaster'] },
  { key: 'audio-engineers', icon: 'mic', title: 'Audio Engineers & Producers', categories: ['audio_engineer', 'producer'] },
  { key: 'session-musicians', icon: 'people', title: 'Session Musicians & Instrumentalists', categories: ['session_musician', 'instrumentalist'] },
];

const PERFORMER_LIMIT = 10;
const PROFILE_FIELDS = 'id, username, display_name, avatar_url, followers_count';

export default function TalentDiscoveryScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const [topTipped, setTopTipped] = useState<FeaturedCreatorCardData[]>([]);
  const [loadingTopTipped, setLoadingTopTipped] = useState(true);
  const [mostPlayed, setMostPlayed] = useState<FeaturedCreatorCardData[]>([]);
  const [loadingMostPlayed, setLoadingMostPlayed] = useState(true);

  useEffect(() => {
    loadTopTipped();
    loadMostPlayed();
  }, []);

  const rankedProfiles = async (idsInRankOrder: string[]): Promise<FeaturedCreatorCardData[]> => {
    if (idsInRankOrder.length === 0) return [];
    const { data: profiles } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', idsInRankOrder);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return idsInRankOrder.map((id) => byId.get(id)).filter(Boolean) as FeaturedCreatorCardData[];
  };

  const loadTopTipped = async () => {
    setLoadingTopTipped(true);
    try {
      const { data: tipRows } = await supabase
        .from('tips')
        .select('recipient_id, amount')
        .eq('status', 'completed')
        .order('amount', { ascending: false })
        .limit(500);

      const totals = new Map<string, number>();
      (tipRows ?? []).forEach((t: any) => totals.set(t.recipient_id, (totals.get(t.recipient_id) ?? 0) + (t.amount || 0)));
      const topIds = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, PERFORMER_LIMIT)
        .map(([id]) => id);

      setTopTipped(await rankedProfiles(topIds));
    } catch (error) {
      console.error('❌ Error loading top tipped creators:', error);
      setTopTipped([]);
    } finally {
      setLoadingTopTipped(false);
    }
  };

  const loadMostPlayed = async () => {
    setLoadingMostPlayed(true);
    try {
      const { data: trackRows } = await supabase
        .from('audio_tracks')
        .select('creator_id, play_count')
        .order('play_count', { ascending: false })
        .limit(500);

      const totals = new Map<string, number>();
      (trackRows ?? []).forEach((t: any) => totals.set(t.creator_id, (totals.get(t.creator_id) ?? 0) + (t.play_count || 0)));
      const topIds = Array.from(totals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, PERFORMER_LIMIT)
        .map(([id]) => id);

      setMostPlayed(await rankedProfiles(topIds));
    } catch (error) {
      console.error('❌ Error loading most played creators:', error);
      setMostPlayed([]);
    } finally {
      setLoadingMostPlayed(false);
    }
  };

  const handlePress = (category: TopLevelCategory) => {
    if (category.hasSubScreen) {
      navigation.navigate('TalentDiscoveryGenres');
      return;
    }
    navigation.navigate('TalentDiscoveryResults', { categories: category.categories, title: category.title });
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
          <View style={[styles.section, styles.firstSection]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>What are you looking for?</Text>
            </View>

            <FlatList
              horizontal
              data={TOP_LEVEL_CATEGORIES}
              keyExtractor={(item) => item.key}
              renderItem={({ item, index }) => (
                <TalentCategoryCard icon={item.icon} label={item.title} isFirst={index === 0} onPress={() => handlePress(item)} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Tipped Creators</Text>
            </View>
            {loadingTopTipped ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginLeft: 24 }} />
            ) : topTipped.length > 0 ? (
              <FlatList
                horizontal
                data={topTipped}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <FeaturedCreatorCard
                    creator={item}
                    isFirst={index === 0}
                    badgeLabel="TOP TIPPED"
                    onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.id })}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 24 }}
              />
            ) : (
              <Text style={[styles.quietEmpty, { color: theme.colors.textSecondary }]}>No tipped creators yet</Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Most Played</Text>
            </View>
            {loadingMostPlayed ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginLeft: 24 }} />
            ) : mostPlayed.length > 0 ? (
              <FlatList
                horizontal
                data={mostPlayed}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <FeaturedCreatorCard
                    creator={item}
                    isFirst={index === 0}
                    badgeLabel="MOST PLAYED"
                    onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.id })}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 24 }}
              />
            ) : (
              <Text style={[styles.quietEmpty, { color: theme.colors.textSecondary }]}>No plays recorded yet</Text>
            )}
          </View>
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
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '700',
  },
  categoryRow: { paddingRight: 24 },
  quietEmpty: {
    ...Typography.label,
    fontSize: 13,
    marginLeft: 24,
  },
});
