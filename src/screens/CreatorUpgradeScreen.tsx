/**
 * CreatorUpgradeScreen
 *
 * Part B of the additive creator role upgrade (ADDITIVE_CREATOR_ROLE.MD).
 * Reached from BecomeCreatorModal after the user accepts the creator
 * agreement. Collects the creator-specific fields not already present on
 * an Audio Lover's profile — reusing the same genre field/API/validation
 * as OnboardingScreen's music creator path, plus a creator type selector
 * backed by the existing user_creator_types system.
 *
 * On save this is purely additive: it sets profiles.is_creator = true and
 * never touches profiles.role, so the user's existing Audio Lover status
 * (tipping history, referral link, engagement stats) stays exactly as-is.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { config } from '../config/environment';
import { updateCreatorTypes } from '../services/creatorExpansionService';
import { CREATOR_AGREEMENT_VERSION } from '../services/CreatorAgreementService';
import { CREATOR_TYPE_LABELS, CREATOR_TYPE_ICONS } from '../utils/creatorTypeLabels';
import type { CreatorType } from '../types';

// service_provider has its own dedicated onboarding (ServiceProviderOnboardingScreen)
// with additional required fields (rates, categories) — kept out of this short flow.
const UPGRADE_CREATOR_TYPES: CreatorType[] = ['musician', 'podcaster', 'dj', 'event_organizer', 'venue_owner'];

const MIN_GENRES = 3;
const MAX_GENRES = 5;

interface Genre {
  id: string;
  name: string;
  category: string;
}

export default function CreatorUpgradeScreen() {
  const { user, session, userProfile, updateUserProfile, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState(userProfile?.display_name || '');
  const [selectedCreatorTypes, setSelectedCreatorTypes] = useState<CreatorType[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(userProfile?.genres || []);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    setLoadingGenres(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/genres?category=music`, {
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
      });
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType?.includes('application/json')) return;

      const data = await response.json();
      if (data.success && data.genres?.length > 0) {
        setAvailableGenres(data.genres);
      }
    } catch (error) {
      console.error('❌ Error loading genres:', error);
    } finally {
      setLoadingGenres(false);
    }
  };

  const toggleCreatorType = (type: CreatorType) => {
    setSelectedCreatorTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genreId)) return prev.filter((g) => g !== genreId);
      if (prev.length >= MAX_GENRES) return prev;
      return [...prev, genreId];
    });
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter an artist/creator name.');
      return;
    }
    if (selectedCreatorTypes.length < 1) {
      Alert.alert('Select at least one role', 'Choose what kind of creator you are.');
      return;
    }
    if (selectedGenres.length < MIN_GENRES) {
      Alert.alert('Select Genres', `Please select at least ${MIN_GENRES} genres (maximum ${MAX_GENRES}) to continue`);
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to continue');
      return;
    }

    setSaving(true);
    try {
      // Additive write — is_creator only, profiles.role is never touched here.
      const result = await updateUserProfile({
        is_creator: true,
        display_name: displayName.trim(),
        genres: selectedGenres,
        creator_agreement_accepted: true,
        creator_agreement_version: CREATOR_AGREEMENT_VERSION,
        creator_upgraded_at: new Date().toISOString(),
      });

      if (!result.success) {
        throw result.error || new Error('Failed to update profile');
      }

      // Separate, existing additive system for creator sub-types — doesn't touch role either.
      await updateCreatorTypes(user.id, selectedCreatorTypes, { session });

      await refreshUser();

      Alert.alert('Welcome, Creator! 🎉', 'Your Audio Lover history, tips, and referral link are all still here — you now also have full creator access.', [
        { text: 'Continue', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('❌ Error upgrading to creator:', error);
      Alert.alert('Error', 'Failed to complete your creator upgrade. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canSave = displayName.trim().length > 0 && selectedCreatorTypes.length >= 1 && selectedGenres.length >= MIN_GENRES;

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
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Creator Setup</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Set up your creator profile</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Just a few details — your existing profile, tips, and referral link carry over as-is.
            </Text>
          </View>

          {/* Artist / creator name */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Artist / Creator Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="How fans will see you"
              placeholderTextColor={theme.colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          {/* Creator type */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>What kind of creator are you? *</Text>
            <Text style={[styles.hint, { color: theme.colors.textMuted, marginBottom: 12 }]}>Select all that apply</Text>
            <View style={styles.chipsContainer}>
              {UPGRADE_CREATOR_TYPES.map((type) => {
                const isSelected = selectedCreatorTypes.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => toggleCreatorType(type)}
                  >
                    <Ionicons
                      name={CREATOR_TYPE_ICONS[type] as any}
                      size={16}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.chipText, { color: isSelected ? theme.colors.primary : theme.colors.text }]}>
                      {CREATOR_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Genres */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Genres *</Text>
            <Text style={[styles.hint, { color: theme.colors.textMuted, marginBottom: 12 }]}>
              Select {MIN_GENRES}-{MAX_GENRES} genres ({selectedGenres.length} selected)
            </Text>
            {loadingGenres ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <View style={styles.chipsContainer}>
                {availableGenres.map((genre) => {
                  const isSelected = selectedGenres.includes(genre.id);
                  return (
                    <TouchableOpacity
                      key={genre.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => toggleGenre(genre.id)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.colors.primary : theme.colors.text }]}>
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving || !canSave}>
            <LinearGradient
              colors={[theme.colors.gradientPrimary.start, theme.colors.gradientPrimary.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveButtonGradient, (!canSave || saving) && { opacity: 0.5 }]}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Complete Creator Setup</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: theme.colors.textMuted, marginTop: 16 }]}>
            * Required. Your Audio Lover status, tips given, and referral link stay active — this only adds creator access.
          </Text>
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
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  hint: { fontSize: 12 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  saveButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  saveButtonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
