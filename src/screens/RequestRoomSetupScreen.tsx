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

        {/* Header — editorial two-tone wordmark */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Request<Text style={styles.headerTitleDim}> Room</Text>
          </Text>
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
              <View style={styles.fieldLabelRow}>
                <View style={styles.fieldLabelAccent} />
                <Text style={styles.label}>
                  Session Name{' '}
                  <Text style={styles.optional}>(optional)</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Saturday Night at Lounge 44"
                placeholderTextColor="rgba(255,255,255,0.22)"
                value={sessionName}
                onChangeText={setSessionName}
                maxLength={100}
                selectionColor="#DC2626"
              />
            </View>

            {/* Minimum Tip */}
            <View style={styles.section}>
              <View style={styles.fieldLabelRow}>
                <View style={styles.fieldLabelAccent} />
                <Text style={styles.label}>Minimum Tip <Text style={styles.required}>*</Text></Text>
              </View>
              <View style={styles.tipInputRow}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.tipInput}
                  value={minimumTip}
                  onChangeText={setMinimumTip}
                  keyboardType="decimal-pad"
                  placeholder="2.00"
                  placeholderTextColor="rgba(255,255,255,0.22)"
                  selectionColor="#DC2626"
                />
              </View>
              <Text style={styles.helperText}>
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
                    minimumTip === amount && { backgroundColor: PURPLE + '33', borderColor: PURPLE },
                  ]}
                  onPress={() => setMinimumTip(amount)}
                >
                  <Text style={[styles.presetText, minimumTip === amount && { color: '#C4B5FD' }]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={PURPLE} />
              <Text style={styles.infoText}>
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
  mainGradient: { position: 'absolute', width: '100%', height: '100%' },
  safeArea: { flex: 1 },

  // Header — transparent, editorial two-tone
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSide: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: 26,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: -0.6,
  },
  headerTitleDim: { color: 'rgba(255,255,255,0.5)', fontWeight: '300' },

  scrollView: { flex: 1 },
  heroSection: {},
  heroGradient: { overflow: 'hidden', paddingTop: 20, paddingHorizontal: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  livePulseWrapper: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  glowRing: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(239,68,68,0.5)' },
  liveDotOuter: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(239,68,68,0.35)' },
  liveDotInner: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' },
  heroGlass: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  blurFill: { overflow: 'hidden' },
  heroGlassOverlay: { backgroundColor: 'rgba(153,27,27,0.15)', padding: 14, gap: 8 },
  heroTitle: { ...Typography.headerMedium, fontSize: 18, color: '#FFFFFF' },
  heroSubtitle: { ...Typography.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },

  // Form sections
  section: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  fieldLabelAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#DC2626' },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.4 },
  optional: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.35)' },
  required: { color: '#EF4444' },

  // Inputs — glass card style
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  tipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: { fontSize: 24, fontWeight: '300', color: 'rgba(255,255,255,0.5)', marginRight: 6 },
  tipInput: { flex: 1, fontSize: 28, fontWeight: '300', color: '#fff' },
  helperText: { fontSize: 12, marginTop: 8, color: 'rgba(255,255,255,0.35)', lineHeight: 17 },

  // Preset chips
  presets: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 20 },
  preset: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  presetText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    gap: 12,
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.55)' },

  // Footer
  footer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 16 },
  startButton: { borderRadius: 999, overflow: 'hidden' },
  startButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  startButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
