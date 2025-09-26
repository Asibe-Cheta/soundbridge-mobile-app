import React, { useState } from 'react';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#000000', '#0D0D0D', '#1A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Creator Setup</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome to SoundBridge!</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's set up your profile to help you connect with fans and other creators.
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Role</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  preferences.role === 'listener' && styles.roleOptionActive
                ]}
                onPress={() => updatePreference('role', 'listener')}
              >
                <Ionicons 
                  name="headset" 
                  size={24} 
                  color={preferences.role === 'listener' ? '#DC2626' : '#666'} 
                />
                <Text style={[
                  styles.roleText,
                  preferences.role === 'listener' && styles.roleTextActive
                ]}>
                  Listener
                </Text>
                <Text style={styles.roleDescription}>
                  Discover music and support creators
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  preferences.role === 'creator' && styles.roleOptionActive
                ]}
                onPress={() => updatePreference('role', 'creator')}
              >
                <Ionicons 
                  name="musical-notes" 
                  size={24} 
                  color={preferences.role === 'creator' ? '#DC2626' : '#666'} 
                />
                <Text style={[
                  styles.roleText,
                  preferences.role === 'creator' && styles.roleTextActive
                ]}>
                  Creator
                </Text>
                <Text style={styles.roleDescription}>
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
                <Text style={styles.sectionTitle}>Creator Features</Text>
                
                <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <Ionicons name="heart" size={20} color="#DC2626" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Accept Tips</Text>
                      <Text style={styles.optionDescription}>
                        Let fans support you with tips
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.acceptsTips}
                    onValueChange={() => togglePreference('acceptsTips')}
                    trackColor={{ false: '#333', true: '#DC2626' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <Ionicons name="people" size={20} color="#DC2626" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Collaborations</Text>
                      <Text style={styles.optionDescription}>
                        Open to working with other artists
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.acceptsCollaborations}
                    onValueChange={() => togglePreference('acceptsCollaborations')}
                    trackColor={{ false: '#333', true: '#DC2626' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.optionRow}>
                  <View style={styles.optionInfo}>
                    <Ionicons name="radio" size={20} color="#DC2626" />
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Live Performances</Text>
                      <Text style={styles.optionDescription}>
                        Available for live events
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences.availableForLive}
                    onValueChange={() => togglePreference('availableForLive')}
                    trackColor={{ false: '#333', true: '#DC2626' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Event Categories */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Music Genres</Text>
                <Text style={styles.sectionDescription}>
                  Select genres you're interested in
                </Text>
                
                <View style={styles.categoriesGrid}>
                  {['christian', 'gospel', 'afrobeats', 'hip-hop', 'jazz', 'classical', 'rock', 'pop'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        preferences.eventCategories.includes(category) && styles.categoryChipActive
                      ]}
                      onPress={() => toggleEventCategory(category)}
                    >
                      <Text style={[
                        styles.categoryText,
                        preferences.eventCategories.includes(category) && styles.categoryTextActive
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
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="mail" size={20} color="#DC2626" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Email Notifications</Text>
                  <Text style={styles.optionDescription}>
                    Get updates via email
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.emailNotifications}
                onValueChange={() => togglePreference('emailNotifications')}
                trackColor={{ false: '#333', true: '#DC2626' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="notifications" size={20} color="#DC2626" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Push Notifications</Text>
                  <Text style={styles.optionDescription}>
                    Get notifications on your device
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.pushNotifications}
                onValueChange={() => togglePreference('pushNotifications')}
                trackColor={{ false: '#333', true: '#DC2626' }}
                thumbColor="#FFFFFF"
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
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
  },
  roleContainer: {
    gap: 12,
  },
  roleOption: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionActive: {
    borderColor: '#DC2626',
    backgroundColor: '#2A1A1A',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  roleTextActive: {
    color: '#DC2626',
  },
  roleDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  categoryText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
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
