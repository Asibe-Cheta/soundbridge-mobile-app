import BackButton from '../components/BackButton';
// src/screens/AudioEnhancementScreen.tsx
// User interface for audio enhancement controls

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { audioEnhancementService } from '../services/AudioEnhancementService';
import { realAudioProcessor } from '../services/RealAudioProcessor';
import { showTestResults } from '../utils/audioEnhancementTest';
import type { AudioEnhancementProfile } from '../services/AudioEnhancementService';

export default function AudioEnhancementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  // State
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [profiles, setProfiles] = useState<AudioEnhancementProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<AudioEnhancementProfile | null>(null);
  const [isEnhancementActive, setIsEnhancementActive] = useState(false);

  // EQ State (10-band for Pro)
  const [eqBands, setEqBands] = useState<number[]>(new Array(10).fill(0));
  const [eqFrequencies] = useState([60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]);

  // Enhancement Controls
  const [aiEnhancementEnabled, setAiEnhancementEnabled] = useState(false);
  const [aiEnhancementStrength, setAiEnhancementStrength] = useState(0.5);
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(false);
  const [spatialWidth, setSpatialWidth] = useState(1.0);

  useEffect(() => {
    loadUserData();
    initializeAudioProcessor();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Get user's subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user?.id)
        .single();

      const tier = profile?.subscription_tier || 'free';
      setUserTier(tier);

      // Load user's enhancement profiles
      const userProfiles = await audioEnhancementService.getUserProfiles('all', tier);
      setProfiles(userProfiles);

      // Find default profile
      const defaultProfile = userProfiles.find(p => p.is_default) || userProfiles[0];
      if (defaultProfile) {
        await loadProfile(defaultProfile);
      }

      console.log('✅ User data loaded, tier:', tier);
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      Alert.alert('Error', 'Failed to load audio enhancement settings');
    } finally {
      setLoading(false);
    }
  };

  const initializeAudioProcessor = async () => {
    try {
      const initialized = await realAudioProcessor.initialize();
      if (!initialized) {
        Alert.alert('Error', 'Failed to initialize audio processor');
      }
    } catch (error) {
      console.error('❌ Error initializing audio processor:', error);
    }
  };

  const loadProfile = async (profile: AudioEnhancementProfile) => {
    try {
      setCurrentProfile(profile);

      // Load EQ settings
      if (profile.enhancement_settings.eq) {
        const bands = profile.enhancement_settings.eq.gains || profile.enhancement_settings.eq.bands || [];
        setEqBands([...bands, ...new Array(Math.max(0, 10 - bands.length)).fill(0)]);
      }

      // Load AI enhancement settings
      if (profile.enhancement_settings.enhancement) {
        setAiEnhancementEnabled(profile.enhancement_settings.enhancement.enabled);
        setAiEnhancementStrength(profile.enhancement_settings.enhancement.strength);
      }

      // Load spatial audio settings
      if (profile.enhancement_settings.spatial) {
        setSpatialAudioEnabled(profile.enhancement_settings.spatial.enabled);
        setSpatialWidth(profile.enhancement_settings.spatial.width);
      }

      // Apply profile to audio processor
      const applied = await realAudioProcessor.applyEnhancementProfile(profile.id);
      setIsEnhancementActive(applied);

      console.log('✅ Profile loaded:', profile.name);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      Alert.alert('Error', 'Failed to load enhancement profile');
    }
  };

  const handleEQBandChange = async (bandIndex: number, value: number) => {
    try {
      const newBands = [...eqBands];
      newBands[bandIndex] = value;
      setEqBands(newBands);

      // Apply real-time EQ adjustment
      const frequency = eqFrequencies[bandIndex];
      await realAudioProcessor.adjustEQBand(frequency, value);

      console.log(`🎚️ EQ band ${frequency}Hz adjusted to ${value}dB`);
    } catch (error) {
      console.error('❌ Error adjusting EQ band:', error);
    }
  };

  const handlePresetSelect = async (presetName: string) => {
    try {
      const preset = profiles.find(p => p.name.toLowerCase() === presetName.toLowerCase());
      if (preset) {
        await loadProfile(preset);
        Alert.alert('Preset Applied', `${preset.name} preset has been applied`);
      }
    } catch (error) {
      console.error('❌ Error applying preset:', error);
      Alert.alert('Error', 'Failed to apply preset');
    }
  };

  const handleAIEnhancementToggle = async (enabled: boolean) => {
    try {
      setAiEnhancementEnabled(enabled);
      await realAudioProcessor.toggleEffect('ai_enhancement', enabled);
      console.log(`🤖 AI Enhancement ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ Error toggling AI enhancement:', error);
    }
  };

  const handleSpatialAudioToggle = async (enabled: boolean) => {
    try {
      setSpatialAudioEnabled(enabled);
      await realAudioProcessor.toggleEffect('spatial_audio', enabled);
      console.log(`🔊 Spatial Audio ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ Error toggling spatial audio:', error);
    }
  };

  const saveCurrentSettings = async () => {
    try {
      if (!currentProfile) return;

      const updatedSettings = {
        ...currentProfile.enhancement_settings,
        eq: {
          bands: eqBands,
          frequencies: eqFrequencies,
          gains: eqBands,
          preset: 'custom',
        },
        enhancement: {
          enabled: aiEnhancementEnabled,
          strength: aiEnhancementStrength,
          type: 'ai' as const,
        },
        spatial: {
          enabled: spatialAudioEnabled,
          width: spatialWidth,
          type: 'virtual_surround' as const,
        },
      };

      const success = await audioEnhancementService.updateProfile(currentProfile.id, {
        enhancement_settings: updatedSettings,
      });

      if (success) {
        Alert.alert('Settings Saved', 'Your audio enhancement settings have been saved');
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const renderTierUpgrade = () => (
    <View style={[styles.upgradeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name="star" size={24} color="#FFD700" />
      <Text style={[styles.upgradeTitle, { color: theme.colors.text }]}>
        Upgrade for Audio Enhancement
      </Text>
      <Text style={[styles.upgradeText, { color: theme.colors.textSecondary }]}>
        {userTier === 'free' 
          ? 'Upgrade to Pro for AI enhancement, EQ controls, and spatial audio'
          : 'Upgrade to Pro for professional-grade audio processing'
        }
      </Text>
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => (navigation as any).navigate('Upgrade')}
      >
        <Text style={styles.upgradeButtonText}>
          Upgrade to Pro
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEqualizer = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Equalizer (10-Band)
      </Text>
      <View style={styles.eqContainer}>
        {eqFrequencies.slice(0, 10).map((freq, index) => (
          <View style={styles.eqBand} key={freq}>
            <Text style={[styles.eqGain, { color: theme.colors.textSecondary }]}>
              {eqBands[index] > 0 ? '+' : ''}{eqBands[index].toFixed(1)}
            </Text>
            <Slider
              style={styles.eqSlider}
              minimumValue={-12}
              maximumValue={12}
              value={eqBands[index]}
              onValueChange={(value) => handleEQBandChange(index, value)}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
              vertical={true}
            />
            <Text style={[styles.eqFreq, { color: theme.colors.textSecondary }]}>
              {freq < 1000 ? `${freq}` : `${(freq / 1000).toFixed(1)}k`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPresets = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
        {profiles.filter(p => p.is_public || p.user_id === user?.id).map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetButton,
              { 
                backgroundColor: currentProfile?.id === preset.id ? theme.colors.primary : theme.colors.card,
                borderColor: theme.colors.border 
              }
            ]}
            onPress={() => handlePresetSelect(preset.name)}
          >
            <Text style={[
              styles.presetText,
              { color: currentProfile?.id === preset.id ? '#FFFFFF' : theme.colors.text }
            ]}>
              {preset.name}
            </Text>
            {preset.is_public && (
              <Ionicons 
                name="people" 
                size={12} 
                color={currentProfile?.id === preset.id ? '#FFFFFF' : theme.colors.textSecondary} 
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEnhancementControls = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Enhancement</Text>
      
      {/* AI Enhancement */}
      <View style={styles.controlRow}>
        <View style={styles.controlInfo}>
          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>AI Enhancement</Text>
          <Text style={[styles.controlDescription, { color: theme.colors.textSecondary }]}>
            Automatically improve audio quality
          </Text>
        </View>
        <Switch
          value={aiEnhancementEnabled}
          onValueChange={handleAIEnhancementToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={aiEnhancementEnabled ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>

      {aiEnhancementEnabled && (
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
            Strength: {Math.round(aiEnhancementStrength * 100)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={aiEnhancementStrength}
            onValueChange={setAiEnhancementStrength}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />
        </View>
      )}

      {/* Spatial Audio */}
      <View style={styles.controlRow}>
        <View style={styles.controlInfo}>
          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>Spatial Audio</Text>
          <Text style={[styles.controlDescription, { color: theme.colors.textSecondary }]}>
            Virtual surround sound
          </Text>
        </View>
        <Switch
          value={spatialAudioEnabled}
          onValueChange={handleSpatialAudioToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={spatialAudioEnabled ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>

      {spatialAudioEnabled && (
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>
            Width: {Math.round(spatialWidth * 100)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            value={spatialWidth}
            onValueChange={setSpatialWidth}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />
        </View>
      )}
    </View>
  );

  if (loading) {
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading audio enhancement...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Audio Enhancement</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={showTestResults} style={styles.testButton}>
              <Ionicons name="flask" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={saveCurrentSettings}>
              <Ionicons name="save" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Indicator */}
        <View style={[styles.statusBar, { backgroundColor: isEnhancementActive ? theme.colors.primary + '20' : theme.colors.surface }]}>
          <Ionicons 
            name={isEnhancementActive ? "checkmark-circle" : "radio-button-off"} 
            size={16} 
            color={isEnhancementActive ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.statusText, { color: isEnhancementActive ? theme.colors.primary : theme.colors.textSecondary }]}>
            Enhancement {isEnhancementActive ? 'Active' : 'Inactive'}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upgrade prompt for free users */}
        {userTier === 'free' && renderTierUpgrade()}

        {/* Enhancement controls for paid users */}
        {userTier !== 'free' && (
          <>
            {renderPresets()}
            {renderEqualizer()}
            {renderEnhancementControls()}
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testButton: {
    padding: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  upgradeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eqContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 200,
  },
  eqBand: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  eqGain: {
    fontSize: 10,
    marginBottom: 8,
  },
  eqSlider: {
    flex: 1,
    width: 20,
  },
  eqFreq: {
    fontSize: 10,
    marginTop: 8,
  },
  presetsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlInfo: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  controlDescription: {
    fontSize: 12,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    height: 40,
  },
});


            Automatically improve audio quality

          </Text>

        </View>

        <Switch

          value={aiEnhancementEnabled}

          onValueChange={handleAIEnhancementToggle}

          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}

          thumbColor={aiEnhancementEnabled ? theme.colors.primary : theme.colors.textSecondary}

        />

      </View>



      {aiEnhancementEnabled && (

        <View style={styles.sliderContainer}>

          <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>

            Strength: {Math.round(aiEnhancementStrength * 100)}%

          </Text>

          <Slider

            style={styles.slider}

            minimumValue={0}

            maximumValue={1}

            value={aiEnhancementStrength}

            onValueChange={setAiEnhancementStrength}

            minimumTrackTintColor={theme.colors.primary}

            maximumTrackTintColor={theme.colors.border}

            thumbTintColor={theme.colors.primary}

          />

        </View>

      )}



      {/* Spatial Audio */}

      <View style={styles.controlRow}>

        <View style={styles.controlInfo}>

          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>Spatial Audio</Text>

          <Text style={[styles.controlDescription, { color: theme.colors.textSecondary }]}>

            Virtual surround sound

          </Text>

        </View>

        <Switch

          value={spatialAudioEnabled}

          onValueChange={handleSpatialAudioToggle}

          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}

          thumbColor={spatialAudioEnabled ? theme.colors.primary : theme.colors.textSecondary}

        />

      </View>



      {spatialAudioEnabled && (

        <View style={styles.sliderContainer}>

          <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>

            Width: {Math.round(spatialWidth * 100)}%

          </Text>

          <Slider

            style={styles.slider}

            minimumValue={0.5}

            maximumValue={2.0}

            value={spatialWidth}

            onValueChange={setSpatialWidth}

            minimumTrackTintColor={theme.colors.primary}

            maximumTrackTintColor={theme.colors.border}

            thumbTintColor={theme.colors.primary}

          />

        </View>

      )}

    </View>

  );



  if (loading) {

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

          <View style={styles.loadingContainer}>

            <ActivityIndicator size="large" color={theme.colors.primary} />

            <Text style={[styles.loadingText, { color: theme.colors.text }]}>

              Loading audio enhancement...

            </Text>

          </View>

        </SafeAreaView>

      </View>

    );

  }



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

        <View style={styles.header}>

          <BackButton onPress={() => navigation.goBack()} />

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Audio Enhancement</Text>

          <View style={styles.headerActions}>

            <TouchableOpacity onPress={showTestResults} style={styles.testButton}>

              <Ionicons name="flask" size={20} color={theme.colors.primary} />

            </TouchableOpacity>

            <TouchableOpacity onPress={saveCurrentSettings}>

              <Ionicons name="save" size={24} color={theme.colors.primary} />

            </TouchableOpacity>

          </View>

        </View>



        {/* Status Indicator */}

        <View style={[styles.statusBar, { backgroundColor: isEnhancementActive ? theme.colors.primary + '20' : theme.colors.surface }]}>

          <Ionicons 

            name={isEnhancementActive ? "checkmark-circle" : "radio-button-off"} 

            size={16} 

            color={isEnhancementActive ? theme.colors.primary : theme.colors.textSecondary} 

          />

          <Text style={[styles.statusText, { color: isEnhancementActive ? theme.colors.primary : theme.colors.textSecondary }]}>

            Enhancement {isEnhancementActive ? 'Active' : 'Inactive'}

          </Text>

        </View>



        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Upgrade prompt for free users */}

        {userTier === 'free' && renderTierUpgrade()}



        {/* Enhancement controls for paid users */}

        {userTier !== 'free' && (

          <>

            {renderPresets()}

            {renderEqualizer()}

            {renderEnhancementControls()}

          </>

        )}

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

  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: 'transparent',

  },

  loadingText: {

    marginTop: 16,

    fontSize: 16,

  },

  header: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

  },

  headerTitle: {

    fontSize: 18,

    fontWeight: '600',

  },

  headerActions: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

  },

  testButton: {

    padding: 4,

  },

  statusBar: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 8,

    gap: 8,

  },

  statusText: {

    fontSize: 14,

    fontWeight: '500',

  },

  content: {

    flex: 1,

    paddingHorizontal: 16,

    backgroundColor: 'transparent',

  },

  section: {

    borderRadius: 12,

    padding: 16,

    marginVertical: 8,

  },

  sectionTitle: {

    fontSize: 18,

    fontWeight: '600',

    marginBottom: 16,

  },

  upgradeCard: {

    borderRadius: 12,

    borderWidth: 1,

    padding: 24,

    alignItems: 'center',

    marginVertical: 16,

  },

  upgradeTitle: {

    fontSize: 20,

    fontWeight: '600',

    marginTop: 12,

    marginBottom: 8,

  },

  upgradeText: {

    fontSize: 14,

    textAlign: 'center',

    marginBottom: 16,

    lineHeight: 20,

  },

  upgradeButton: {

    paddingHorizontal: 24,

    paddingVertical: 12,

    borderRadius: 8,

  },

  upgradeButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '600',

  },

  eqContainer: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    height: 200,

  },

  eqBand: {

    flex: 1,

    alignItems: 'center',

    height: '100%',

  },

  eqGain: {

    fontSize: 10,

    marginBottom: 8,

  },

  eqSlider: {

    flex: 1,

    width: 20,

  },

  eqFreq: {

    fontSize: 10,

    marginTop: 8,

  },

  presetsScroll: {

    marginHorizontal: -16,

    paddingHorizontal: 16,

  },

  presetButton: {

    paddingHorizontal: 16,

    paddingVertical: 8,

    borderRadius: 20,

    borderWidth: 1,

    marginRight: 8,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

  },

  presetText: {

    fontSize: 14,

    fontWeight: '500',

  },

  controlRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 16,

  },

  controlInfo: {

    flex: 1,

  },

  controlLabel: {

    fontSize: 16,

    fontWeight: '500',

    marginBottom: 4,

  },

  controlDescription: {

    fontSize: 12,

  },

  sliderContainer: {

    marginBottom: 16,

  },

  sliderLabel: {

    fontSize: 14,

    marginBottom: 8,

  },

  slider: {

    height: 40,

  },

});




            Automatically improve audio quality

          </Text>

        </View>

        <Switch

          value={aiEnhancementEnabled}

          onValueChange={handleAIEnhancementToggle}

          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}

          thumbColor={aiEnhancementEnabled ? theme.colors.primary : theme.colors.textSecondary}

        />

      </View>



      {aiEnhancementEnabled && (

        <View style={styles.sliderContainer}>

          <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>

            Strength: {Math.round(aiEnhancementStrength * 100)}%

          </Text>

          <Slider

            style={styles.slider}

            minimumValue={0}

            maximumValue={1}

            value={aiEnhancementStrength}

            onValueChange={setAiEnhancementStrength}

            minimumTrackTintColor={theme.colors.primary}

            maximumTrackTintColor={theme.colors.border}

            thumbTintColor={theme.colors.primary}

          />

        </View>

      )}



      {/* Spatial Audio */}

      <View style={styles.controlRow}>

        <View style={styles.controlInfo}>

          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>Spatial Audio</Text>

          <Text style={[styles.controlDescription, { color: theme.colors.textSecondary }]}>

            Virtual surround sound

          </Text>

        </View>

        <Switch

          value={spatialAudioEnabled}

          onValueChange={handleSpatialAudioToggle}

          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}

          thumbColor={spatialAudioEnabled ? theme.colors.primary : theme.colors.textSecondary}

        />

      </View>



      {spatialAudioEnabled && (

        <View style={styles.sliderContainer}>

          <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>

            Width: {Math.round(spatialWidth * 100)}%

          </Text>

          <Slider

            style={styles.slider}

            minimumValue={0.5}

            maximumValue={2.0}

            value={spatialWidth}

            onValueChange={setSpatialWidth}

            minimumTrackTintColor={theme.colors.primary}

            maximumTrackTintColor={theme.colors.border}

            thumbTintColor={theme.colors.primary}

          />

        </View>

      )}

    </View>

  );



  if (loading) {

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

          <View style={styles.loadingContainer}>

            <ActivityIndicator size="large" color={theme.colors.primary} />

            <Text style={[styles.loadingText, { color: theme.colors.text }]}>

              Loading audio enhancement...

            </Text>

          </View>

        </SafeAreaView>

      </View>

    );

  }



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

        <View style={styles.header}>

          <BackButton onPress={() => navigation.goBack()} />

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Audio Enhancement</Text>

          <View style={styles.headerActions}>

            <TouchableOpacity onPress={showTestResults} style={styles.testButton}>

              <Ionicons name="flask" size={20} color={theme.colors.primary} />

            </TouchableOpacity>

            <TouchableOpacity onPress={saveCurrentSettings}>

              <Ionicons name="save" size={24} color={theme.colors.primary} />

            </TouchableOpacity>

          </View>

        </View>



        {/* Status Indicator */}

        <View style={[styles.statusBar, { backgroundColor: isEnhancementActive ? theme.colors.primary + '20' : theme.colors.surface }]}>

          <Ionicons 

            name={isEnhancementActive ? "checkmark-circle" : "radio-button-off"} 

            size={16} 

            color={isEnhancementActive ? theme.colors.primary : theme.colors.textSecondary} 

          />

          <Text style={[styles.statusText, { color: isEnhancementActive ? theme.colors.primary : theme.colors.textSecondary }]}>

            Enhancement {isEnhancementActive ? 'Active' : 'Inactive'}

          </Text>

        </View>



        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Upgrade prompt for free users */}

        {userTier === 'free' && renderTierUpgrade()}



        {/* Enhancement controls for paid users */}

        {userTier !== 'free' && (

          <>

            {renderPresets()}

            {renderEqualizer()}

            {renderEnhancementControls()}

          </>

        )}

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

  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: 'transparent',

  },

  loadingText: {

    marginTop: 16,

    fontSize: 16,

  },

  header: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

  },

  headerTitle: {

    fontSize: 18,

    fontWeight: '600',

  },

  headerActions: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

  },

  testButton: {

    padding: 4,

  },

  statusBar: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 16,

    paddingVertical: 8,

    gap: 8,

  },

  statusText: {

    fontSize: 14,

    fontWeight: '500',

  },

  content: {

    flex: 1,

    paddingHorizontal: 16,

    backgroundColor: 'transparent',

  },

  section: {

    borderRadius: 12,

    padding: 16,

    marginVertical: 8,

  },

  sectionTitle: {

    fontSize: 18,

    fontWeight: '600',

    marginBottom: 16,

  },

  upgradeCard: {

    borderRadius: 12,

    borderWidth: 1,

    padding: 24,

    alignItems: 'center',

    marginVertical: 16,

  },

  upgradeTitle: {

    fontSize: 20,

    fontWeight: '600',

    marginTop: 12,

    marginBottom: 8,

  },

  upgradeText: {

    fontSize: 14,

    textAlign: 'center',

    marginBottom: 16,

    lineHeight: 20,

  },

  upgradeButton: {

    paddingHorizontal: 24,

    paddingVertical: 12,

    borderRadius: 8,

  },

  upgradeButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '600',

  },

  eqContainer: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    height: 200,

  },

  eqBand: {

    flex: 1,

    alignItems: 'center',

    height: '100%',

  },

  eqGain: {

    fontSize: 10,

    marginBottom: 8,

  },

  eqSlider: {

    flex: 1,

    width: 20,

  },

  eqFreq: {

    fontSize: 10,

    marginTop: 8,

  },

  presetsScroll: {

    marginHorizontal: -16,

    paddingHorizontal: 16,

  },

  presetButton: {

    paddingHorizontal: 16,

    paddingVertical: 8,

    borderRadius: 20,

    borderWidth: 1,

    marginRight: 8,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

  },

  presetText: {

    fontSize: 14,

    fontWeight: '500',

  },

  controlRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 16,

  },

  controlInfo: {

    flex: 1,

  },

  controlLabel: {

    fontSize: 16,

    fontWeight: '500',

    marginBottom: 4,

  },

  controlDescription: {

    fontSize: 12,

  },

  sliderContainer: {

    marginBottom: 16,

  },

  sliderLabel: {

    fontSize: 14,

    marginBottom: 8,

  },

  slider: {

    height: 40,

  },

});


