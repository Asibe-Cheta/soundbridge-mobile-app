/**
 * TalentDiscoveryGenresScreen
 * Genre sub-screen for "Musicians & Singers" (Part A of
 * CORECTED_TALENT_DISCOVERY_SCREEN.MD). Genres are pulled from the existing
 * genre taxonomy (genreService) rather than a new hardcoded list.
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
            <TouchableOpacity
              style={[styles.genreRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => openResults(undefined, 'Musicians & Singers')}
            >
              <Text style={[styles.genreRowText, { color: theme.colors.text }]}>All Genres</Text>
            </TouchableOpacity>
            {genres.map((genre) => (
              <TouchableOpacity
                key={genre.id}
                style={[styles.genreRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => openResults(genre.name, `Musicians & Singers · ${genre.name}`)}
              >
                <Text style={[styles.genreRowText, { color: theme.colors.text }]}>{genre.name}</Text>
              </TouchableOpacity>
            ))}
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  genreRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  genreRowText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
});
