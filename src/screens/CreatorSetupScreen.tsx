import React, { useState } from 'react';
import BackButton from '../components/BackButton';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

interface CreatorPreferences {
  role: 'creator' | 'listener';
  acceptsTips: boolean;
  acceptsCollaborations: boolean;
  availableForLive: boolean;
  notificationRadius: number;
  eventCategories: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
  quietHoursEnabled: boolean;
}

export default function CreatorSetupScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<CreatorPreferences>({
    role: 'listener',
    acceptsTips: false,
    acceptsCollaborations: false,
    availableForLive: false,
    notificationRadius: 50,
    eventCategories: ['christian', 'gospel', 'afrobeats'],
    emailNotifications: true,
    pushNotifications: true,
    quietHoursEnabled: true,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Save preferences to database
      console.log('Saving creator preferences:', preferences);
      
      Alert.alert(
        'Setup Complete!',
        'Your creator preferences have been saved. You can now start sharing your music and connecting with fans.',
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (key: keyof CreatorPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updatePreference = (key: keyof CreatorPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleEventCategory = (category: string) => {
    setPreferences(prev => ({
      ...preferences,
      eventCategories: prev.eventCategories.includes(category)
        ? prev.eventCategories.filter(c => c !== category)
        : [...prev.eventCategories, category]
    }));
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
        
        <View style={styles.gradient}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <BackButton style={styles.backButton} onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Creator Setup</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>Welcome to SoundBridge!</Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
              Let's set up your profile to help you connect with fans and other creators.
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Role</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  { backgroundColor: theme.colors.card, borderColor: preferences.role === 'listener' ? theme.colors.primary : theme.colors.border },
                  preferences.role === 'listener' && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => updatePreference('role', 'listener')}
              >
                <Ionicons 
                  name="headset" 
                  size={24} 
                  color={preferences.role === 'listener' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.roleText,
                  { color: preferences.role === 'listener' ? theme.colors.primary : theme.colors.text }
                ]}>
                  Listener
                </Text>
                <Text style={[styles.roleDescription, { color: theme.colors.textSecondary }]}>
                  Discover music and support creators
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  { backgroundColor: theme.colors.card, borderColor: preferences.role === 'creator' ? theme.colors.primary : theme.colors.border },
                  preferences.role === 'creator' && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => updatePreference('role', 'creator')}
              >
                <Ionicons 
                  name="musical-notes" 
                  size={24} 
                  color={preferences.role === 'creator' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.roleText,
                  { color: preferences.role === 'creator' ? theme.colors.primary : theme.colors.text }
                ]}>
                  Creator
                </Text>
                <Text style={[styles.roleDescription, { color: theme.colors.textSecondary }]}>
                  Share music and build your fanbase
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Creator Options (only show if role is creator) */}
          {preferences.role === 'creator' && (
            <>
              {/* Creator Features */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Creator Features</Text>
                
                <View style={[styles.optionRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.optionInfo}>
                    <Ionicons name="heart" size={20} color={theme.colors.primary} />
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Accept Tips</Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                        Let fans support you with tips
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.acceptsTips}
                    onValueChange={() => togglePreference('acceptsTips')}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                    thumbColor={preferences.acceptsTips ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.optionRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.optionInfo}>
                    <Ionicons name="people" size={20} color={theme.colors.primary} />
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Collaborations</Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                        Open to working with other artists
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.acceptsCollaborations}
                    onValueChange={() => togglePreference('acceptsCollaborations')}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                    thumbColor={preferences.acceptsCollaborations ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>

                <View style={[styles.optionRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.optionInfo}>
                    <Ionicons name="radio" size={20} color={theme.colors.primary} />
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Live Performances</Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                        Available for live events
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.availableForLive}
                    onValueChange={() => togglePreference('availableForLive')}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                    thumbColor={preferences.availableForLive ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
              </View>

              {/* Event Categories */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Music Genres</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                  Select genres you're interested in
                </Text>
                
                <View style={styles.categoriesGrid}>
                  {['christian', 'gospel', 'afrobeats', 'hip-hop', 'jazz', 'classical', 'rock', 'pop'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        { 
                          backgroundColor: preferences.eventCategories.includes(category) ? theme.colors.primary : theme.colors.card,
                          borderColor: preferences.eventCategories.includes(category) ? theme.colors.primary : theme.colors.border
                        }
                      ]}
                      onPress={() => toggleEventCategory(category)}
                    >
                      <Text style={[
                        styles.categoryText,
                        { color: preferences.eventCategories.includes(category) ? '#FFFFFF' : theme.colors.text }
                      ]}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notifications</Text>
            
            <View style={[styles.optionRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.optionInfo}>
                <Ionicons name="mail" size={20} color={theme.colors.primary} />
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Email Notifications</Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    Get updates via email
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.emailNotifications}
                onValueChange={() => togglePreference('emailNotifications')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                thumbColor={preferences.emailNotifications ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>

            <View style={[styles.optionRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.optionInfo}>
                <Ionicons name="notifications" size={20} color={theme.colors.primary} />
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    Get notifications on your device
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.pushNotifications}
                onValueChange={() => togglePreference('pushNotifications')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                thumbColor={preferences.pushNotifications ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <LinearGradient
              colors={['#DC2626', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
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
  gradient: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  roleContainer: {
    gap: 12,
  },
  roleOption: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleOptionActive: {
    // Applied dynamically in JSX
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  roleTextActive: {
    // Applied dynamically in JSX
  },
  roleDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipActive: {
    // Applied dynamically in JSX
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    // Applied dynamically in JSX
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 100,
  },
});
