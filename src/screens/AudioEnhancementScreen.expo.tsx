import BackButton from '../components/BackButton';
// src/screens/AudioEnhancementScreen.expo.tsx
// Expo-compatible version of Audio Enhancement Screen

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
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AudioEnhancementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  // State
  const [loading, setLoading] = useState(false);
  // Updated per TIER_CORRECTIONS.md - Enterprise not available Year 1
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [eqBands, setEqBands] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [aiEnhancementEnabled, setAIEnhancementEnabled] = useState(false);
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(false);

  // Load user tier on mount
  useEffect(() => {
    const loadUserTier = async () => {
      if (!user) return;
      
      try {
        // Get user's subscription tier from API (subscription data in user_subscriptions table, not profiles)
        let tier: 'free' | 'pro' = 'free';
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch('https://www.soundbridge.live/api/subscription/status', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const responseData = await response.json();
            // Defensive: Use optional chaining - subscription might be null for free users
            const rawTier = responseData?.data?.subscription?.tier || 'free';
            // Defensive: if tier is 'enterprise', treat as 'pro'
            tier = rawTier === 'enterprise' ? 'pro' : (rawTier === 'pro' ? 'pro' : 'free');
          }
        }
        setUserTier(tier);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    loadUserTier();
  }, [user]);

  const handleEQBandChange = async (index: number, value: number) => {
    const newBands = [...eqBands];
    newBands[index] = value;
    setEqBands(newBands);

    // In Expo mode, show alert instead of actual processing
    try {
      const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const frequency = frequencies[index];
      Alert.alert(
        'EQ Adjustment (Expo Mode)',
        `Adjusting ${frequency}Hz band to ${value > 0 ? '+' : ''}${value}dB\n\n` +
        'Note: Real audio processing will be active when deployed to device with native modules.',
        [{ text: 'Got it!', style: 'default' }]
      );
    } catch (error) {
      console.error('❌ Error adjusting EQ band:', error);
    }
  };

  const handleAIEnhancementToggle = async (value: boolean) => {
    setAIEnhancementEnabled(value);
    try {
      Alert.alert(
        'AI Enhancement (Expo Mode)',
        value
          ? 'AI Enhancement enabled! Audio quality will be improved with dynamic compression and intelligent EQ.'
          : 'AI Enhancement disabled.',
        [{ text: 'Excellent!', style: 'default' }]
      );
    } catch (error) {
      console.error('❌ Error toggling AI enhancement:', error);
    }
  };

  const handleSpatialAudioToggle = async (value: boolean) => {
    setSpatialAudioEnabled(value);
    try {
      Alert.alert(
        'Spatial Audio (Expo Mode)',
        value
          ? 'Spatial Audio enabled! Experience immersive 3D surround sound.'
          : 'Spatial Audio disabled.',
        [{ text: 'Amazing!', style: 'default' }]
      );
    } catch (error) {
      console.error('❌ Error toggling spatial audio:', error);
    }
  };

  const showImplementationStatus = () => {
    Alert.alert(
      'Implementation Status',
      'Status: Ready for native deployment!\n\n' +
      'Currently running in Expo mode with UI simulation. Real audio processing will be active when deployed to device.',
      [{ text: 'Fantastic!', style: 'default' }]
    );
  };

  const renderTierUpgrade = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.upgradeCard, { borderColor: theme.colors.border }]}>
        <Ionicons name="star" size={48} color={theme.colors.primary} />
        <Text style={[styles.upgradeTitle, { color: theme.colors.text }]}>
          Unlock Professional Audio Enhancement
        </Text>
        <Text style={[styles.upgradeText, { color: theme.colors.textSecondary }]}>
          Upgrade to Pro to access real-time EQ, AI enhancement, spatial audio, and advanced audio processing features.
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('Upgrade' as never)}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEqualizer = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>10-Band Equalizer</Text>
      <View style={styles.eqContainer}>
        {eqBands.map((value, index) => {
          const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
          const frequency = frequencies[index];
          const height = Math.abs(value) * 2 + 20;
          return (
            <View key={index} style={styles.eqBand}>
              <Text style={[styles.eqGain, { color: theme.colors.textSecondary }]}>
                {value > 0 ? '+' : ''}{value}dB
              </Text>
              <View style={styles.eqControls}>
                <TouchableOpacity
                  style={styles.eqButton}
                  onPress={() => handleEQBandChange(index, Math.min(value + 1, 12))}
                >
                  <Text style={styles.eqButtonText}>+</Text>
                </TouchableOpacity>
                <View
                  style={[
                    styles.eqBar,
                    {
                      height: `${height}%`,
                      backgroundColor: value > 0 ? '#10B981' : value < 0 ? '#EF4444' : theme.colors.border,
                    },
                  ]}
                />
                <TouchableOpacity
                  style={styles.eqButton}
                  onPress={() => handleEQBandChange(index, Math.max(value - 1, -12))}
                >
                  <Text style={styles.eqButtonText}>-</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.eqFreq, { color: theme.colors.textSecondary }]}>
                {frequency}Hz
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderPresets = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>EQ Presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
        {['Flat', 'Bass Boost', 'Vocal', 'Treble', 'Rock', 'Jazz', 'Classical'].map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.presetButton, { borderColor: theme.colors.border }]}
          >
            <Text style={[styles.presetText, { color: theme.colors.text }]}>{preset}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEnhancementControls = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Enhancement Controls</Text>
      
      {/* AI Enhancement */}
      <View style={styles.controlRow}>
        <View style={styles.controlInfo}>
          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>AI Enhancement</Text>
          <Text style={[styles.controlDescription, { color: theme.colors.textSecondary }]}>
            Intelligent audio processing for optimal quality
          </Text>
        </View>
        <Switch
          value={aiEnhancementEnabled}
          onValueChange={handleAIEnhancementToggle}
          trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}40` }}
          thumbColor={aiEnhancementEnabled ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>

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
          trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}40` }}
          thumbColor={spatialAudioEnabled ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
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
          <TouchableOpacity onPress={showImplementationStatus}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Status Indicator */}
        <View style={[styles.statusBar, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
          <Text style={[styles.statusText, { color: theme.colors.primary }]}>
            Enhancement Ready (Expo Mode)
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

        {/* Demo for all users */}
        {userTier === 'free' && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preview</Text>
            <Text style={[styles.demoText, { color: theme.colors.textSecondary }]}>
              This is a preview of the professional audio enhancement system. 
              Upgrade to Pro to unlock real-time EQ, AI enhancement, and spatial audio.
            </Text>
            <TouchableOpacity 
              style={[styles.demoButton, { backgroundColor: theme.colors.primary }]}
              onPress={showImplementationStatus}
            >
              <Text style={styles.demoButtonText}>View Implementation Status</Text>
            </TouchableOpacity>
          </View>
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
  eqControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eqButton: {
    width: 20,
    height: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
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
  demoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  demoButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
