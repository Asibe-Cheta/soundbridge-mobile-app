/**
 * TalentDiscoveryGenresScreen
 * Genre sub-screen for "Musicians & Singers" (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD). Genres are pulled from the existing
 * genre taxonomy (genreService) rather than a new hardcoded list. Displayed
 * as a 2-column grid — DiscoverScreen's compact grid card design (artistGridCard,
 * see CreatorGridCard) is what it uses for grid layouts specifically, as
 * opposed to the poster card used for horizontal-scrolling rows.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SystemTypography as Typography } from '../constants/Typography';
import BackButton from '../components/BackButton';
import genreService, { Genre } from '../services/GenreService';

export default function TalentDiscoveryGenresScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    genreService.getMusicGenres().then((data) => {
      setGenres(data);
      setLoading(false);
    });
  }, []);

  const openResults = (genre?: string, title = 'Musicians & Singers') => {
    navigation.navigate('TalentDiscoveryResults', { categories: ['musician'], genre, title });
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Musicians & Singers</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.gridCard} onPress={() => openResults(undefined, 'Musicians & Singers')}>
                <Text style={[styles.gridCardText, { color: theme.colors.text }]}>All Genres</Text>
              </TouchableOpacity>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre.id}
                  style={styles.gridCard}
                  onPress={() => openResults(genre.name, `Musicians & Singers · ${genre.name}`)}
                >
                  <Text style={[styles.gridCardText, { color: theme.colors.text }]} numberOfLines={2}>
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
  scrollContent: { paddingVertical: 16, paddingBottom: 40 },
  // Matches DiscoverScreen's artistsGridContainer/artistGridCard exactly (see CreatorGridCard).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardText: {
    ...Typography.label,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
