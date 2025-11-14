import React, { useState, useEffect } from 'react';
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
import {
  upsertServiceProviderProfile,
  fetchServiceProviderProfile,
  type ServiceProviderProfileInput,
} from '../services/creatorExpansionService';
import type { ServiceCategory } from '../types';

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'sound_engineering',
  'mixing_mastering',
  'music_production',
  'audio_editing',
  'vocal_tuning',
  'sound_design',
  'audio_restoration',
  'podcast_production',
  'live_sound',
  'consulting',
];

export default function ServiceProviderOnboardingScreen() {
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'profile' | 'complete'>('profile');
  const [formData, setFormData] = useState<ServiceProviderProfileInput>({
    displayName: '',
    headline: '',
    bio: '',
    categories: [],
    defaultRate: undefined,
    rateCurrency: 'USD',
  });

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    if (!user?.id || !session) return;

    try {
      const profile = await fetchServiceProviderProfile(user.id, ['offerings'], { session });
      if (profile) {
        setFormData({
          displayName: profile.display_name || '',
          headline: profile.headline || '',
          bio: profile.bio || '',
          categories: profile.categories || [],
          defaultRate: profile.default_rate || undefined,
          rateCurrency: profile.rate_currency || 'USD',
        });
      }
    } catch (error) {
      console.error('Error loading existing profile:', error);
    }
  };

  const toggleCategory = (category: ServiceCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...(prev.categories || []), category],
    }));
  };

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      Alert.alert('Required', 'Please enter a display name for your service business');
      return;
    }

    if (!user?.id || !session) {
      Alert.alert('Error', 'Please sign in to continue');
      return;
    }

    setLoading(true);
    try {
      await upsertServiceProviderProfile(user.id, formData, { session });
      Alert.alert('Success!', 'Your service provider profile has been saved.', [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('ServiceProviderDashboard' as never, { userId: user?.id } as never),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Background Gradient - Uses theme colors */}
      <LinearGradient
        colors={[theme.colors.backgroundGradient.start, theme.colors.backgroundGradient.middle, theme.colors.backgroundGradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={styles.mainGradient}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Service Provider Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Create Your Service Profile</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Set up your professional service provider profile to start offering services to creators.
          </Text>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Business/Service Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="e.g., John's Audio Services"
            placeholderTextColor={theme.colors.textMuted}
            value={formData.displayName}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, displayName: text }))}
          />
        </View>

        {/* Headline */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Headline</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="e.g., Professional Sound Engineer"
            placeholderTextColor={theme.colors.textMuted}
            value={formData.headline}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, headline: text }))}
          />
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Bio</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Tell creators about your experience and services..."
            placeholderTextColor={theme.colors.textMuted}
            value={formData.bio}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, bio: text }))}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Service Categories</Text>
          <View style={styles.categoriesContainer}>
            {SERVICE_CATEGORIES.map((category) => {
              const isSelected = formData.categories?.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={[styles.categoryText, { color: isSelected ? theme.colors.primary : theme.colors.text }]}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Default Rate */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Default Rate (Optional)</Text>
          <View style={styles.rateRow}>
            <TextInput
              style={[styles.rateInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="150"
              placeholderTextColor={theme.colors.textMuted}
              value={formData.defaultRate?.toString() || ''}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, defaultRate: text ? parseFloat(text) : undefined }))}
              keyboardType="numeric"
            />
            <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>USD</Text>
          </View>
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            You can set specific rates for each service offering later
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading || !formData.displayName.trim()}
        >
          <LinearGradient
            colors={[theme.colors.gradientPrimary.start, theme.colors.gradientPrimary.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: theme.colors.textMuted, marginTop: 16 }]}>
          * Required field. You can add service offerings, portfolio items, and availability after saving your profile.
        </Text>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

