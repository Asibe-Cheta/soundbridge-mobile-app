/**
 * TalentDiscoveryScreen
 * Category-selection entry point for talent discovery (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD) — shared by event organisers and
 * industry professionals. A single horizontal-scrolling row of 5 category
 * cards; each card represents the CATEGORY itself, not a live creator
 * preview. Tapping "Musicians & Singers" pushes a genre sub-screen; every
 * other category goes straight to the results grid.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import TalentCategoryCard from '../components/TalentCategoryCard';
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

export default function TalentDiscoveryScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;

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
              renderItem={({ item }) => (
                <TalentCategoryCard icon={item.icon} label={item.title} onPress={() => handlePress(item)} />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            />
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
  categoryRow: { paddingHorizontal: 24 },
});
