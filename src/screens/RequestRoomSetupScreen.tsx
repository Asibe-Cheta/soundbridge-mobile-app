import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { SystemTypography as Typography } from '../constants/Typography';
import { MicGlowIcon, WaveformBars, useWaveformAnims } from '../components/RequestRoomBanner';

const PURPLE = '#7C3AED';
const PURPLE_DARK = '#6D28D9';

export default function RequestRoomSetupScreen() {
  const navigation = useNavigation<any>();
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();

  const [sessionName, setSessionName] = useState('');
  const [minimumTip, setMinimumTip] = useState('2');
  const [isStarting, setIsStarting] = useState(false);

  const barAnims = useWaveformAnims();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  const handleStart = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    const minTipNum = parseFloat(minimumTip);
    if (isNaN(minTipNum) || minTipNum < 0.5) {
      Alert.alert('Invalid Amount', 'Minimum tip must be at least $0.50');
      return;
    }

    try {
      setIsStarting(true);

      const { data, error } = await supabase
        .from('request_room_sessions')
        .insert({
          creator_id: user.id,
          session_name: sessionName.trim() || null,
          minimum_tip_amount: minTipNum,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      navigation.replace('RequestRoomDashboard', {
        session: data,
        creatorName: userProfile?.display_name || userProfile?.username || 'Creator',
      });
    } catch (error) {
      console.error('Error starting Request Room:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to start session. Please try again.'
      );
    } finally {
      setIsStarting(false);
    }
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
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <LinearGradient
              colors={[PURPLE_DARK, PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerIcon}
            >
              <Ionicons name="mic" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Request Room</Text>
          </View>
          <View style={styles.headerSide} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={['#4C1D95', '#6D28D9', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <WaveformBars barAnims={barAnims} />
                <View style={styles.heroRow}>
                  <MicGlowIcon size={36} />
                  <View style={styles.livePulseWrapper}>
                    <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
                    <Animated.View style={[styles.liveDotOuter, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={styles.liveDotInner} />
                  </View>
                </View>
                <View style={styles.heroGlass}>
                  <BlurView intensity={18} tint="dark" style={styles.blurFill}>
                    <View style={styles.heroGlassOverlay}>
                      <Text style={styles.heroTitle}>Open a live request session</Text>
                      <Text style={styles.heroSubtitle}>
                        Set a minimum tip, share your link or QR code, and let your audience make song requests and tip you in real time — no app required.
                      </Text>
                    </View>
                  </BlurView>
                </View>
              </LinearGradient>
            </View>

            {/* Session Name */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Session Name{' '}
                <Text style={[styles.optional, { color: theme.colors.textSecondary }]}>
                  (optional)
                </Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="e.g. Saturday Night at Lounge 44"
                placeholderTextColor={theme.colors.textSecondary}
                value={sessionName}
                onChangeText={setSessionName}
                maxLength={100}
              />
            </View>

            {/* Minimum Tip */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Minimum Tip <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.tipInputRow,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
                <TextInput
                  style={[styles.tipInput, { color: theme.colors.text }]}
                  value={minimumTip}
                  onChangeText={setMinimumTip}
                  keyboardType="decimal-pad"
                  placeholder="2.00"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                Audience cannot submit a request below this amount
              </Text>
            </View>

            {/* Quick presets */}
            <View style={styles.presets}>
              {['1', '2', '5', '10'].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.preset,
                    {
                      backgroundColor: minimumTip === amount ? PURPLE + '33' : theme.colors.card,
                      borderColor: minimumTip === amount ? PURPLE : theme.colors.border,
                    },
                  ]}
                  onPress={() => setMinimumTip(amount)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: minimumTip === amount ? PURPLE : theme.colors.text },
                    ]}
                  >
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info box */}
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="information-circle" size={20} color={PURPLE} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                You'll get a shareable link and QR code. Tips go directly to your wallet after Stripe fees and the standard platform commission.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity
              style={[styles.startButton, { opacity: isStarting ? 0.7 : 1 }]}
              onPress={handleStart}
              disabled={isStarting}
            >
              <LinearGradient
                colors={['#DC2626', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                {isStarting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="mic" size={20} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Start Session</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerSide: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Typography.body.fontFamily,
  },
  scrollView: { flex: 1 },
  heroSection: {},
  heroGradient: {
    overflow: 'hidden',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  livePulseWrapper: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  glowRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  liveDotOuter: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(239,68,68,0.35)',
  },
  liveDotInner: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  heroGlass: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blurFill: { overflow: 'hidden' },
  heroGlassOverlay: {
    backgroundColor: 'rgba(153,27,27,0.15)',
    padding: 14,
    gap: 8,
  },
  heroTitle: {
    ...Typography.headerMedium,
    fontSize: 18,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    ...Typography.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: Typography.body.fontFamily,
  },
  optional: {
    fontSize: 13,
    fontWeight: '400',
  },
  required: { color: '#EF4444' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Typography.body.fontFamily,
  },
  tipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 6,
    fontFamily: Typography.body.fontFamily,
  },
  tipInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    fontFamily: Typography.body.fontFamily,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: Typography.body.fontFamily,
  },
  presets: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  preset: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Typography.body.fontFamily,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body.fontFamily,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  startButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Typography.body.fontFamily,
  },
});
